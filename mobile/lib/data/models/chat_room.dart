import 'package:mobile/data/models/message.dart';
import 'package:mobile/data/models/user.dart';

enum RoomType { DIRECT, GROUP, PROJECT }

class ChatRoom {
  final int roomId;
  final String name;
  final String? avatarUrl;
  final RoomType type;
  final int unreadCount;
  final Message? lastMessage;
  final DateTime? lastMessageAt;
  final List<User> members;
  final int? projectId;

  ChatRoom({
    required this.roomId,
    required this.name,
    this.avatarUrl,
    required this.type,
    this.unreadCount = 0,
    this.lastMessage,
    this.lastMessageAt,
    this.members = const [],
    this.projectId,
  });

  factory ChatRoom.fromJson(Map<String, dynamic> json) {
    final type = _parseRoomType(json['type'] ?? json['roomType']);
    
    // Xử lý tên room
    String roomName = json['name'] ?? '';
    
    if (roomName.isEmpty || roomName == 'null') {
      // Nếu là PROJECT chat, dùng tên project
      if (type == RoomType.PROJECT && json['projectName'] != null) {
        roomName = json['projectName'];
      }
      // Nếu là DIRECT chat, dùng tên thành viên khác
      else if (type == RoomType.DIRECT && json['members'] != null) {
        final members = json['members'] as List<dynamic>?;
        if (members != null && members.isNotEmpty) {
          // Lấy tên thành viên đầu tiên (thường là người kia trong 1-1)
          final member = members.first;
          roomName = member['fullName'] ?? member['username'] ?? 'Chat';
        }
      }
      // Fallback
      if (roomName.isEmpty) roomName = 'Cuộc trò chuyện';
    }
    
    return ChatRoom(
      roomId: json['roomId'] ?? 0,
      name: roomName,
      avatarUrl: json['avatarUrl'],
      type: type,
      unreadCount: json['unreadCount'] ?? 0,
      lastMessage: json['lastMessage'] != null ? Message.fromJson(json['lastMessage']) : null,
      lastMessageAt: json['lastMessageAt'] != null ? DateTime.tryParse(json['lastMessageAt']) : null,
      members: (json['members'] as List<dynamic>?)
              ?.map((e) => User.fromJson(e))
              .toList() ??
          [],
      projectId: json['project']?['projectId'] ?? json['projectId'] ?? json['projectID'],
    );
  }

  static RoomType _parseRoomType(String? type) {
    switch (type?.toUpperCase()) {
      case 'DIRECT':
        return RoomType.DIRECT;
      case 'GROUP':
        return RoomType.GROUP;
      case 'PROJECT':
        return RoomType.PROJECT;
      default:
        return RoomType.DIRECT;
    }
  }

  // Helper to get display name for direct chats
  String getDisplayName(int currentUserId) {
    if (type == RoomType.DIRECT && members.length >= 2) {
      final otherMember = members.firstWhere(
        (m) => m.userId != currentUserId,
        orElse: () => members.first,
      );
      // Ưu tiên hiển thị fullName, nếu không có thì dùng username
      return otherMember.fullName?.isNotEmpty == true 
          ? otherMember.fullName! 
          : otherMember.username;
    }
    return name;
  }
}
