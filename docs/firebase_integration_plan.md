
# Firebase Hybrid Integration Plan

> **Architecture:** Spring Boot (Master/Write) + Firebase (Real-time/Read)
> **Multi-tenant:** Phân chia theo `companyId` trong Firestore

---

## 📑 Table of Contents

| # | Section | Description |
|---|---------|-------------|
| 1 | [Tổng Quan Kiến Trúc](#architecture) | Diagram, Golden Rules |
| 2 | [Firestore Schema](#firestore) | Multi-tenant collection structure |
| 3 | [Security Rules](#security) | Firestore + RTDB rules |
| 4 | [RTDB GPS Tracking](#rtdb) | Real-time location structure |
| 5 | [Spring Boot Integration](#spring) | Config, FirebaseSyncService |
| 6 | [Flutter Client](#flutter) | StreamBuilder, LocationService |
| 7 | [Firebase Auth Sync](#auth-sync) | Custom Claims, Offboarding |
| 8 | [Implementation Timeline](#timeline) | 4-5 weeks |
| 9 | [Checklist](#checklist) | Setup, Chat, Noti, GPS, Admin |
| 10 | [Maintenance Guide](#maintenance) | Trade-offs, Pain Points, Debugging |

---

## 🗺️ Tổng Quan Kiến Trúc

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENT APPS                                   │
│                  (Flutter Mobile / React Web / Desktop)                  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐    ┌─────────────────────┐    ┌──────────────────┐
│  Spring Boot  │    │  Cloud Firestore    │    │  Realtime DB     │
│  (API Server) │ ──>│  (Chat, Noti)       │    │  (GPS Tracking)  │
│               │    │                     │    │                  │
│  ┌─────────┐  │    │  Real-time Sync     │    │  Low Latency     │
│  │  MySQL  │  │    │  Offline Support    │    │  High Frequency  │
│  └─────────┘  │    │                     │    │                  │
└───────────────┘    └─────────────────────┘    └──────────────────┘
       │                        ▲
       │                        │
       └────────────────────────┘
         Async Event Sync (FirebaseSyncService)
```

**Quy tắc vàng:**
1. **Spring Boot là "Master"** - Mọi thao tác ghi quan trọng qua API
2. **Firebase là "View/Cache"** - Client đọc real-time từ Firebase
3. **Async Sync** - Spring Boot sync data sang Firebase sau khi lưu SQL

---

## 📦 Firestore Schema (Multi-tenant)

```
companies (collection)
  └── {companyId} (document)
      │
      ├── conversations (sub-collection) ─── CHAT
      │     └── {roomId} (doc)
      │           ├── lastMessage: {...}
      │           ├── members: [userId1, userId2, ...]
      │           │
      │           ├── messages (sub-collection)
      │           │     └── {messageId} (doc)
      │           │           ├── senderId: Long
      │           │           ├── senderName: String
      │           │           ├── avatar: String
      │           │           ├── content: String
      │           │           ├── type: "TEXT" | "IMAGE" | "FILE"
      │           │           ├── fileUrl: String?
      │           │           ├── createdAt: Timestamp
      │           │           └── readBy: [userId1, userId2]
      │           │
      │           └── typing_status (sub-collection)
      │                 └── {userId} (doc)
      │                       ├── isTyping: Boolean
      │                       └── timestamp: Timestamp
      │
      └── notifications (sub-collection) ─── NOTIFICATIONS
            └── {userId} (doc - User Inbox)
                  └── items (sub-collection)
                        └── {notificationId} (doc)
                              ├── title: String
                              ├── body: String
                              ├── type: String
                              ├── data: Map
                              ├── isRead: Boolean
                              └── createdAt: Timestamp
```

---

## 🔒 Firebase Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function
    function belongsToCompany(companyId) {
      return request.auth.token.companyId == companyId;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // Company-scoped data
    match /companies/{companyId}/{document=**} {
      // Only users of this company can read
      allow read: if belongsToCompany(companyId);
      
      // Only Server (Spring Boot with Admin SDK) can write
      allow write: if false;
    }
    
    // Special case: Typing status (client can write own status)
    match /companies/{companyId}/conversations/{roomId}/typing_status/{userId} {
      allow write: if belongsToCompany(companyId) && isOwner(userId);
    }
  }
}
```

---

## 📍 Realtime Database Structure (GPS Tracking)

```json
{
  "tracking": {
    "company_1001": {
      "user_50": {
        "lat": 10.762622,
        "lng": 106.660172,
        "accuracy": 10.5,
        "updatedAt": 1709283999,
        "status": "CHECKING_IN"
      }
    }
  }
}
```

**RTDB Security Rules:**
```json
{
  "rules": {
    "tracking": {
      "$companyId": {
        "$userId": {
          ".read": "auth.token.companyId == $companyId",
          ".write": "auth.uid == $userId && auth.token.companyId == $companyId"
        }
      }
    }
  }
}
```

---

## ⚙️ Spring Boot Integration

### Dependencies (pom.xml)

```xml
<dependency>
    <groupId>com.google.firebase</groupId>
    <artifactId>firebase-admin</artifactId>
    <version>9.2.0</version>
</dependency>
```

### Firebase Configuration

```java
@Configuration
public class FirebaseConfig {
    
    @Value("${firebase.credentials.path}")
    private String credentialsPath;
    
    @PostConstruct
    public void initialize() throws IOException {
        if (FirebaseApp.getApps().isEmpty()) {
            FileInputStream serviceAccount = new FileInputStream(credentialsPath);
            
            FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                .setDatabaseUrl("https://your-project.firebaseio.com")
                .build();
            
            FirebaseApp.initializeApp(options);
        }
    }
}
```

### FirebaseSyncService

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class FirebaseSyncService {
    
    private final Firestore firestore = FirestoreClient.getFirestore();
    private final CompanyService companyService;
    
    @Async
    @EventListener
    @Retryable(maxAttempts = 3, backoff = @Backoff(delay = 1000))
    public void handleMessageCreated(MessageCreatedEvent event) {
        Message msg = event.getMessage();
        Long companyId = msg.getChatRoom().getCompany().getCompanyId();
        
        // ⚠️ GAP FIX: Check feature flag before sync
        CompanySettings settings = companyService.getSettingsCached(companyId);
        if (!settings.isChatModuleEnabled()) {
            log.debug("Chat disabled for company {}, skipping Firebase sync", companyId);
            return; // Don't sync if chat module is disabled
        }
        
        Long roomId = msg.getChatRoom().getRoomId();
        
        Map<String, Object> data = Map.of(
            "senderId", msg.getSender().getUserId(),
            "senderName", msg.getSender().getFullName(),
            "avatar", msg.getSender().getAvatarUrl(),
            "content", msg.getContent(),
            "type", msg.getMessageType().name(),
            "fileUrl", msg.getFile() != null ? msg.getFile().getUrl() : null,
            "createdAt", FieldValue.serverTimestamp(),
            "readBy", List.of(msg.getSender().getUserId())
        );
        
        firestore.collection("companies")
            .document(companyId.toString())
            .collection("conversations")
            .document(roomId.toString())
            .collection("messages")
            .document(msg.getMessageId().toString())
            .set(data);
        
        log.info("Synced message {} to Firestore", msg.getMessageId());
    }
    
    @Async
    @EventListener
    public void handleNotificationCreated(NotificationCreatedEvent event) {
        Notification notif = event.getNotification();
        Long companyId = TenantContext.getCompanyId();
        Long userId = notif.getUser().getUserId();
        
        Map<String, Object> data = Map.of(
            "title", notif.getTitle(),
            "body", notif.getBody(),
            "type", notif.getType().name(),
            "data", notif.getData(),
            "isRead", false,
            "createdAt", FieldValue.serverTimestamp()
        );
        
        firestore.collection("companies")
            .document(companyId.toString())
            .collection("notifications")
            .document(userId.toString())
            .collection("items")
            .document(notif.getNotificationId().toString())
            .set(data);
    }
    
    @Async
    @EventListener
    public void handleNotificationRead(NotificationReadEvent event) {
        Long companyId = TenantContext.getCompanyId();
        Long userId = event.getUserId();
        Long notifId = event.getNotificationId();
        
        firestore.collection("companies")
            .document(companyId.toString())
            .collection("notifications")
            .document(userId.toString())
            .collection("items")
            .document(notifId.toString())
            .update("isRead", true);
    }
}
```

### Force Sync API (Admin)

```java
@RestController
@RequestMapping("/api/admin/sync")
@RequirePermission("ADMIN")
public class SyncController {
    
    @PostMapping("/firebase")
    public ResponseEntity<?> forceSyncFirebase(
            @RequestParam Long companyId,
            @RequestParam(required = false) String module) {
        
        if ("chat".equals(module)) {
            syncService.resyncAllMessages(companyId);
        } else if ("notifications".equals(module)) {
            syncService.resyncAllNotifications(companyId);
        } else {
            syncService.resyncAll(companyId);
        }
        
        return ResponseEntity.ok(Map.of("status", "Sync initiated"));
    }
}
```

---

## 📱 Flutter Client Integration

### Listen to Messages (Real-time)

```dart
class ChatRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  
  Stream<List<Message>> getMessages(String companyId, String roomId) {
    return _firestore
        .collection('companies')
        .doc(companyId)
        .collection('conversations')
        .doc(roomId)
        .collection('messages')
        .orderBy('createdAt', descending: true)
        .limit(50)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => Message.fromFirestore(doc))
            .toList());
  }
  
  // Send message via API (not direct to Firestore!)
  Future<void> sendMessage(String roomId, String content) async {
    await ApiClient.post('/api/chat/rooms/$roomId/messages', {
      'content': content,
      'type': 'TEXT',
    });
    // Firestore will be updated by server's FirebaseSyncService
  }
}
```

### Listen to Notifications

```dart
class NotificationRepository {
  Stream<int> getUnreadCount(String companyId, String userId) {
    return _firestore
        .collection('companies')
        .doc(companyId)
        .collection('notifications')
        .doc(userId)
        .collection('items')
        .where('isRead', isEqualTo: false)
        .snapshots()
        .map((snapshot) => snapshot.docs.length);
  }
}
```

### GPS Tracking (Write directly to RTDB)

```dart
class LocationService {
  final DatabaseReference _rtdb = FirebaseDatabase.instance.ref();
  
  void updateLocation(String companyId, String userId, Position position) {
    _rtdb.child('tracking/$companyId/$userId').set({
      'lat': position.latitude,
      'lng': position.longitude,
      'accuracy': position.accuracy,
      'updatedAt': ServerValue.timestamp,
      'status': 'ACTIVE',
    });
  }
}
```

---

## 🔐 Firebase Auth Sync

Để Custom Claims hoạt động, cần sync user từ SQL → Firebase Auth:

```java
@Service
public class FirebaseAuthSyncService {
    
    public void syncUserToFirebase(User user, Long currentCompanyId) {
        try {
            FirebaseAuth auth = FirebaseAuth.getInstance();
            
            // Create or update Firebase user
            UserRecord.CreateRequest request = new UserRecord.CreateRequest()
                .setUid(user.getUserId().toString())
                .setEmail(user.getEmail())
                .setDisplayName(user.getFullName())
                .setPhotoUrl(user.getAvatarUrl());
            
            try {
                auth.createUser(request);
            } catch (FirebaseAuthException e) {
                // User exists, update instead
                auth.updateUser(new UserRecord.UpdateRequest(user.getUserId().toString())
                    .setDisplayName(user.getFullName())
                    .setPhotoUrl(user.getAvatarUrl()));
            }
            
            // Set Custom Claims for Security Rules
            Map<String, Object> claims = new HashMap<>();
            claims.put("companyId", currentCompanyId.toString());
            claims.put("companies", user.getCompanyMemberships().stream()
                .map(m -> m.getCompany().getCompanyId().toString())
                .collect(Collectors.toList()));
            
            auth.setCustomUserClaims(user.getUserId().toString(), claims);
            
        } catch (Exception e) {
            log.error("Failed to sync user to Firebase: {}", e.getMessage());
        }
    }
    
    /**
     * ⚠️ GAP FIX: Revoke Firebase access when user is removed from company
     */
    @Async
    @EventListener
    public void handleUserRemoved(UserRemovedFromCompanyEvent event) {
        try {
            FirebaseAuth auth = FirebaseAuth.getInstance();
            String uid = event.getUserId().toString();
            Long removedCompanyId = event.getCompanyId();
            
            // Get user's remaining companies
            User user = userRepository.findById(event.getUserId()).orElseThrow();
            List<Long> remainingCompanies = user.getCompanyMemberships().stream()
                .filter(m -> m.isActive())
                .map(m -> m.getCompany().getCompanyId())
                .filter(id -> !id.equals(removedCompanyId))
                .collect(Collectors.toList());
            
            if (remainingCompanies.isEmpty()) {
                // User has no companies left - revoke all tokens
                auth.revokeRefreshTokens(uid);
                log.info("Revoked all Firebase tokens for user {}", uid);
            } else {
                // Update custom claims to remove the company
                Map<String, Object> claims = new HashMap<>();
                claims.put("companyId", remainingCompanies.get(0).toString()); // Switch to first remaining
                claims.put("companies", remainingCompanies.stream()
                    .map(Object::toString)
                    .collect(Collectors.toList()));
                auth.setCustomUserClaims(uid, claims);
                
                // Force token refresh
                auth.revokeRefreshTokens(uid);
                log.info("Updated Firebase claims for user {} after removal from company {}", uid, removedCompanyId);
            }
            
        } catch (Exception e) {
            log.error("Failed to handle user removal in Firebase: {}", e.getMessage());
        }
    }
}
```

---

## 📅 Implementation Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| Phase 1 | 1 tuần | Firebase setup, Security Rules, Schema |
| Phase 2 | 1 tuần | Chat sync (Messages, Typing) |
| Phase 3 | 1 tuần | Notifications sync |
| Phase 4 | 1 tuần | GPS Tracking (RTDB) |
| Phase 5 | 3 ngày | Force Sync API, Error handling |
| **Total** | **~4-5 tuần** | |

---

## ✅ Checklist

### Setup
- [ ] Create Firebase project
- [ ] Download service account JSON
- [ ] Configure Spring Boot FirebaseConfig
- [ ] Deploy Security Rules (Firestore + RTDB)

### Chat Module
- [ ] MessageCreatedEvent listener
- [ ] Typing status (client-write)
- [ ] Flutter StreamBuilder for messages
- [ ] Read receipts sync

### Notifications
- [ ] NotificationCreatedEvent listener
- [ ] NotificationReadEvent listener
- [ ] Unread count badge (Flutter)
- [ ] Cross-device sync

### GPS Tracking
- [ ] RTDB structure + rules
- [ ] Flutter LocationService
- [ ] Manager view for tracking

### Admin
- [ ] Force Sync API
- [ ] Firebase Auth sync
- [ ] Custom Claims for companyId

---

## ⚖️ Architectural Decision: Hybrid System Maintenance

> **Context:** Hệ thống sử dụng kết hợp **Spring Boot (SQL)** cho logic chính và **Firebase (NoSQL)** cho các tính năng Real-time.
> **Status:** ADOPTED

### 1. Bản chất của sự đánh đổi (The Trade-off)

Chúng ta chấp nhận **tăng độ phức tạp khi vận hành** để đổi lấy **trải nghiệm người dùng (UX) vượt trội** trên Mobile.

| Tiêu chí | Hệ thống thuần SQL | Hệ thống Hybrid (SQL + Firebase) |
|----------|-------------------|----------------------------------|
| **Tốc độ Mobile** | Trung bình (phụ thuộc API latency) | 🚀 Cực nhanh (Local cache + Realtime) |
| **Offline Mode** | Khó implement, tốn nhiều code | ✅ Native support từ SDK |
| **Server Load** | Cao (Polling/WebSocket connection) | 🟢 Thấp (Offload sang Google Cloud) |
| **Code Base** | Đồng nhất (1 ngôn ngữ, 1 DB) | ⚠️ Phân mảnh (Cần code sync data) |
| **Debug** | Check 1 nơi | ⚠️ Check 2 nơi (SQL đúng, Firebase sai?) |
| **Chi phí** | Cố định (Server VPS) | 💸 Biến thiên (Pay-as-you-go) |

### 2. Các điểm đau đầu khi bảo trì (Pain Points) & Giải pháp

#### 🔥 Vấn đề 1: Dữ liệu không đồng nhất (Data Inconsistency)

**Mô tả:** User sửa tên dự án trên Web (SQL Update xong), nhưng mạng lỗi nên Firebase không cập nhật. Mobile vẫn hiện tên cũ.

**Quy tắc bất biến:** SQL Server luôn là **SINGLE SOURCE OF TRUTH**.

**Giải pháp:**
1. Không bao giờ sửa tay vào Firebase console.
2. Khi nghi ngờ dữ liệu sai lệch, Admin chạy **"Force Sync"** (`POST /api/admin/sync/firebase`).
3. Trên Mobile UI, chấp nhận độ trễ (eventual consistency).

#### 🔥 Vấn đề 2: "Race Conditions" khi Sync 2 chiều

**Mô tả:** Client A sửa trên Firebase, Client B sửa trên API cùng lúc.

**Quy tắc bất biến:** **ONE-WAY SYNC ONLY** (Chỉ đồng bộ 1 chiều).

**Giải pháp:**
1. Luồng dữ liệu: `Client -> Spring Boot API -> SQL -> Firebase -> Client Read`.
2. Tuyệt đối cấm Client ghi thẳng vào các collection nghiệp vụ (Messages, Notifications).
3. Ngoại lệ duy nhất: Dữ liệu tạm thời (`Typing Status`, `GPS Location`).

#### 🔥 Vấn đề 3: Thay đổi cấu trúc dữ liệu (Schema Migration)

**Mô tả:** Team quyết định thêm trường `priority` vào tin nhắn.

**Nỗi đau:** Phải sửa Entity trong Java (SQL) VÀ sửa code mapping trong `FirebaseSyncService`.

**Giải pháp:**
1. PR nào sửa Entity liên quan đến Chat/Noti **bắt buộc** phải check file `FirebaseSyncService`.
2. Viết Integration Test: Assert Firestore document có field mới.

### 3. Chiến lược gỡ lỗi (Debugging Strategy)

Khi có bug "User không thấy tin nhắn mới":

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Check SQL                                           │
│ Query: SELECT * FROM messages WHERE message_id = ?          │
│ ├── Không có → Lỗi API/Backend logic                        │
│ └── Có rồi → Step 2                                         │
├─────────────────────────────────────────────────────────────┤
│ Step 2: Check Logs                                          │
│ Tìm: FirebaseSyncService.handleMessageCreated()             │
│ ├── Exception → Lỗi mạng/quota/permission                   │
│ └── Success → Step 3                                        │
├─────────────────────────────────────────────────────────────┤
│ Step 3: Check Firestore Console                             │
│ Path: companies/{cid}/conversations/{rid}/messages/{mid}    │
│ ├── Không có document → Sync failed silently                │
│ └── Có document → Step 4                                    │
├─────────────────────────────────────────────────────────────┤
│ Step 4: Check Security Rules                                │
│ Firebase Console → Firestore → Rules Simulator              │
│ Test: Can user X read document Y?                           │
└─────────────────────────────────────────────────────────────┘
```

### 4. Kế hoạch thoát hiểm (Exit Strategy)

Nếu chi phí Firebase tăng quá cao hoặc Google thay đổi chính sách:

1. **Spring Boot hoạt động độc lập** - Hệ thống được thiết kế để SQL là source of truth.
2. **Thay thế module** - Chuyển lại `ChatService` và `NotificationService` để dùng WebSocket thuần.
3. **Mobile thích ứng** - Chuyển từ `StreamBuilder` (Firestore) sang `WebSocket Channel`.
4. **Dữ liệu không mất** - SQL vẫn lưu trữ đầy đủ.

### 5. Known Limitations

> [!WARNING]
> **Custom Claims Size Limit**
> 
> Firebase token có giới hạn ~1000 bytes. Nếu user tham gia **> 20 công ty**, danh sách companies trong Custom Claims có thể gây lỗi.
> 
> **Fix:** Chỉ lưu `currentCompanyId` trong token. Khi switch công ty, gọi API để update claim.

> [!WARNING]
> **Rate Limiting (In-Memory)**
> 
> Bucket4j với `ConcurrentHashMap` chỉ hoạt động đúng trên 1 server. Nếu deploy 2+ servers (Load Balancing), cần chuyển sang Bucket4j + Redis.

---

## 🎯 Final Score

| Aspect | Score | Notes |
|--------|-------|-------|
| **Tính khả thi** | 9.5/10 | Sẵn sàng code |
| **An toàn bảo mật** | 8.5/10 | Đã fix Async context, Native Query |
| **Khả năng mở rộng** | 7/10 | Cần monitoring Index, Rate Limiting |
| **Maintainability** | 8/10 | One-way sync đơn giản hóa debug |

