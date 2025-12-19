import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../config/navigation.dart';
import '../config/app_router.dart';
import '../data/services/api_service.dart';

class FirebaseNotificationService {
  static final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  static final FlutterLocalNotificationsPlugin _flutterLocalNotificationsPlugin =
      FlutterLocalNotificationsPlugin();

  // Callback để refresh badge khi nhận notification foreground
  static VoidCallback? onNotificationReceived;

  static Future<void> initialize() async {
    try {
      if (kIsWeb) {
        debugPrint('Skipping Firebase initialization on Web');
        return;
      }
      await Firebase.initializeApp();
      
      // 1. Request permission
      await _requestPermission();

      // 2. Setup Local Notifications (for foreground display)
      await _setupLocalNotifications();

      // 3. Get FCM token with timeout
      String? token = await _firebaseMessaging.getToken().timeout(
        const Duration(seconds: 5),
        onTimeout: () {
          debugPrint('FCM token fetch timed out');
          return null;
        },
      );

      // 4. Send to backend if logged in
      if (token != null) {
        await _sendTokenToBackend(token);
      }

      // 5. Listen for token refresh
      _firebaseMessaging.onTokenRefresh.listen(_sendTokenToBackend);

      // 6. Setup handlers
      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
      FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpenedApp);
      
      // Check if app was opened from a terminated state
      RemoteMessage? initialMessage = await _firebaseMessaging.getInitialMessage();
      if (initialMessage != null) {
        _handleMessageOpenedApp(initialMessage);
      }
    } catch (e) {
      debugPrint('Error initializing Firebase Notification Service: $e');
    }
  }

  static Future<void> _requestPermission() async {
    await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
  }

  static Future<void> _setupLocalNotifications() async {
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    final InitializationSettings initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
    );

    await _flutterLocalNotificationsPlugin.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        // Handle local notification tap - navigate using payload
        if (response.payload != null && response.payload!.isNotEmpty) {
          _navigateFromPayload(response.payload!);
        }
      },
    );
  }

  static Future<void> _handleForegroundMessage(RemoteMessage message) async {
    debugPrint('📱 Received foreground message: ${message.notification?.title}');
    
    // Gọi callback để refresh badge
    if (onNotificationReceived != null) {
      onNotificationReceived!();
    }

    if (message.notification != null) {
      // Show local notification
      const AndroidNotificationDetails androidPlatformChannelSpecifics =
          AndroidNotificationDetails(
        'high_importance_channel',
        'High Importance Notifications',
        importance: Importance.max,
        priority: Priority.high,
        icon: '@mipmap/ic_launcher',
      );
      const NotificationDetails platformChannelSpecifics =
          NotificationDetails(android: androidPlatformChannelSpecifics);

      // Build payload for navigation
      String payload = _buildPayload(message.data);

      await _flutterLocalNotificationsPlugin.show(
        message.hashCode,
        message.notification?.title,
        message.notification?.body,
        platformChannelSpecifics,
        payload: payload,
      );
    }
  }

  static void _handleMessageOpenedApp(RemoteMessage message) {
    debugPrint('📱 App opened from notification: ${message.data}');
    String? link = message.data['link'];
    String? type = message.data['type'];
    _navigateToRoute(link, type, data: message.data);
  }

  /// Build payload string from message data for local notification
  static String _buildPayload(Map<String, dynamic> data) {
    String? link = data['link'];
    String? type = data['type'];
    
    // Serialize data to JSON-like string for payload
    if (link != null || type != null) {
      return 'link:${link ?? ""}|type:${type ?? ""}|roomId:${data['roomId'] ?? ""}|issueId:${data['issueId'] ?? ""}|projectId:${data['projectId'] ?? ""}';
    }
    return '';
  }

  /// Parse payload string back to navigate
  static void _navigateFromPayload(String payload) {
    Map<String, String> data = {};
    for (String part in payload.split('|')) {
      List<String> kv = part.split(':');
      if (kv.length >= 2) {
        String key = kv[0];
        String value = kv.sublist(1).join(':'); // Handle values with colons
        if (value.isNotEmpty) {
          data[key] = value;
        }
      }
    }
    _navigateToRoute(data['link'], data['type'], data: data);
  }

  /// Navigate to the correct route based on notification type and link
  static void _navigateToRoute(String? link, String? type, {Map<String, dynamic>? data}) {
    if (navigatorKey.currentState == null) {
      debugPrint('Navigator not ready, skipping navigation');
      return;
    }

    // Parse notification type to determine route
    String route = AppRouter.notifications; // Default
    Map<String, dynamic>? arguments;

    if (type != null && type.isNotEmpty) {
      switch (type) {
        // HR Notifications
        case 'LEAVE_APPROVED':
        case 'LEAVE_REJECTED':
        case 'HR_LEAVE_APPROVED':
        case 'HR_LEAVE_REJECTED':
          route = AppRouter.leaveRequest;
          break;
        case 'SALARY_CREATED':
        case 'SALARY_PAID':
        case 'HR_SALARY_PAID':
          route = AppRouter.payroll;
          break;
        case 'ATTENDANCE_CHECKIN_SUCCESS':
        case 'ATTENDANCE_CHECKOUT_SUCCESS':
        case 'ATTENDANCE_CHECKOUT_REMINDER':
        case 'ATTENDANCE_MISSING_CHECKOUT':
          route = AppRouter.attendance;
          break;

        // Issue Notifications
        case 'ISSUE_ASSIGNED':
        case 'ISSUE_STATUS_CHANGED':
        case 'ISSUE_COMMENT':
        case 'ISSUE_OVERDUE':
        case 'ISSUE_DEADLINE_REMINDER':
        case 'PROJECT_ISSUE_ASSIGNED':
          if (data != null && data['issueId'] != null) {
            route = AppRouter.issueDetail;
            arguments = {'issueId': int.tryParse(data['issueId'].toString()) ?? 0};
          } else {
            route = AppRouter.myTasks;
          }
          break;

        // Project Notifications
        case 'PROJECT_MEMBER_ADDED':
        case 'PROJECT_MEMBER_REMOVED':
        case 'PROJECT_STATUS_CHANGED':
        case 'PROJECT_COMPLETED':
          if (data != null && data['projectId'] != null) {
            route = AppRouter.sprintBoard;
            arguments = {
              'projectId': int.tryParse(data['projectId'].toString()) ?? 0,
              'projectName': 'Dự án',
            };
          } else {
            route = AppRouter.projectList;
          }
          break;

        // Sprint Notifications
        case 'SPRINT_STARTED':
        case 'SPRINT_COMPLETED':
        case 'SPRINT_ENDING_SOON':
          if (data != null && data['projectId'] != null) {
            route = AppRouter.sprintBoard;
            arguments = {
              'projectId': int.tryParse(data['projectId'].toString()) ?? 0,
              'projectName': 'Dự án',
            };
          } else {
            route = AppRouter.projectList;
          }
          break;

        // Chat Notifications
        case 'CHAT_NEW_MESSAGE':
        case 'CHAT_MENTION':
          if (data != null && data['roomId'] != null) {
            route = AppRouter.chat;
            arguments = {
              'roomId': int.tryParse(data['roomId'].toString()) ?? 0,
              'roomName': 'Chat',
            };
          } else {
            route = AppRouter.chatList;
          }
          break;

        default:
          // Try to use link directly if type is unknown
          if (link != null && link.isNotEmpty) {
            route = _mapLinkToRoute(link);
          }
          break;
      }
    } else if (link != null && link.isNotEmpty) {
      // Use link if type is not provided
      route = _mapLinkToRoute(link);
    }

    // Navigate
    debugPrint('📱 Navigating to: $route with args: $arguments');
    if (arguments != null) {
      navigatorKey.currentState?.pushNamed(route, arguments: arguments);
    } else {
      navigatorKey.currentState?.pushNamed(route);
    }
  }

  /// Map backend link paths to app routes
  static String _mapLinkToRoute(String link) {
    if (link.contains('/leave-request') || link.contains('/nghi-phep')) {
      return AppRouter.leaveRequest;
    } else if (link.contains('/payroll') || link.contains('/bang-luong')) {
      return AppRouter.payroll;
    } else if (link.contains('/attendance') || link.contains('/cham-cong')) {
      return AppRouter.attendance;
    } else if (link.contains('/issues') || link.contains('/tasks')) {
      return AppRouter.myTasks;
    } else if (link.contains('/projects')) {
      return AppRouter.projectList;
    } else if (link.contains('/chat')) {
      return AppRouter.chatList;
    } else if (link.contains('/notifications')) {
      return AppRouter.notifications;
    }
    return AppRouter.notifications;
  }

  static Future<void> _sendTokenToBackend(String token) async {
    try {
      final apiService = ApiService();
      await apiService.post('/profile/fcm-token', {'fcmToken': token});
      debugPrint('FCM Token sent to backend successfully');
    } catch (e) {
      debugPrint('Error sending FCM token to backend: $e');
    }
  }
}
