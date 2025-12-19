import 'package:mobile/data/models/user.dart';

enum MessageType { TEXT, IMAGE, FILE, SYSTEM }

class Message {
  final int messageId;
  final int roomId;
  final User sender;
  final String content;
  final MessageType type;
  final DateTime sentAt;
  final String? fileUrl;
  final String? fileName;
  final List<User> seenBy;

  Message({
    required this.messageId,
    required this.roomId,
    required this.sender,
    required this.content,
    required this.type,
    required this.sentAt,
    this.fileUrl,
    this.fileName,
    this.seenBy = const [],
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      messageId: json['messageId'] ?? 0,
      roomId: json['roomId'] ?? 0,
      sender: User.fromJson(json['sender'] ?? {}),
      content: json['content'] ?? '',
      type: _parseMessageType(json['messageType']),
      sentAt: json['sentAt'] != null ? DateTime.parse(json['sentAt']) : DateTime.now(),
      fileUrl: json['fileUrl'],
      fileName: json['fileName'],
      seenBy: (json['seenBy'] as List<dynamic>?)
              ?.map((e) => User.fromJson(e))
              .toList() ?? [],
    );
  }

  static MessageType _parseMessageType(String? type) {
    switch (type) {
      case 'IMAGE':
        return MessageType.IMAGE;
      case 'FILE':
        return MessageType.FILE;
      case 'SYSTEM':
        return MessageType.SYSTEM;
      default:
        return MessageType.TEXT;
    }
  }
}

