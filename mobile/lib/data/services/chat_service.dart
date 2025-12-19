import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mobile/config/app_constants.dart';
import 'package:mobile/data/models/chat_room.dart';
import 'package:mobile/data/models/message.dart';
import 'package:mobile/data/services/auth_service.dart';

class ChatService {
  final AuthService _authService = AuthService();

  Future<Map<String, String>> _getHeaders() async {
    final token = await _authService.getAccessToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  // Get all chat rooms for current user
  // Backend: GET /api/chat/rooms
  Future<List<ChatRoom>> getChatRooms() async {
    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse('${AppConstants.baseUrl}/chat/rooms'),
      headers: headers,
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => ChatRoom.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load chat rooms: ${response.body}');
    }
  }

  // Get or create direct chat with a user
  // Backend: POST /api/chat/rooms/direct/{userId}
  Future<ChatRoom> getOrCreateDirectChat(int userId) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse('${AppConstants.baseUrl}/chat/rooms/direct/$userId'),
      headers: headers,
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return ChatRoom.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to create direct chat: ${response.body}');
    }
  }

  // Get messages for a room (paginated)
  // Backend: GET /api/chat/rooms/{roomId}/messages?page=0&size=50
  Future<List<Message>> getMessages(int roomId, {int page = 0, int size = 50}) async {
    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse('${AppConstants.baseUrl}/chat/rooms/$roomId/messages?page=$page&size=$size'),
      headers: headers,
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      // Handle both paginated response and direct list
      final List<dynamic> content = data is List ? data : (data['content'] ?? []);
      return content.map((json) => Message.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load messages: ${response.body}');
    }
  }

  // Send a text message
  // Backend: POST /api/chat/rooms/{roomId}/messages
  Future<Message> sendMessage(int roomId, String content, {
      String messageType = 'TEXT', 
      int? replyToMessageId,
      int? fileId,
      String? fileName,
      String? fileUrl,
      int? fileSize,
      String? fileType
  }) async {
    final headers = await _getHeaders();
    final Map<String, dynamic> body = { // Explicit Map<String, dynamic>
      'content': content,
      'messageType': messageType,
    };
    if (replyToMessageId != null) {
      body['replyToMessageId'] = replyToMessageId;
    }
    
    // Add linked file info if present
    if (fileId != null) {
        body['fileId'] = fileId;
        body['fileName'] = fileName;
        body['fileUrl'] = fileUrl;
        body['fileSize'] = fileSize;
        body['fileType'] = fileType;
    }

    final response = await http.post(
      Uri.parse('${AppConstants.baseUrl}/chat/rooms/$roomId/messages'),
      headers: headers,
      body: json.encode(body),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return Message.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to send message: ${response.body}');
    }
  }

  // Mark message as seen
  // Backend: POST /api/chat/messages/{messageId}/seen
  Future<void> markMessageAsSeen(int messageId) async {
    final headers = await _getHeaders();
    await http.put(
      Uri.parse('${AppConstants.baseUrl}/chat/messages/$messageId/seen'),
      headers: headers,
    );
  }

  // Get unread count for a room
  // Backend: GET /api/chat/rooms/{roomId}/unread-count
  Future<int> getUnreadCount(int roomId) async {
    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse('${AppConstants.baseUrl}/chat/rooms/$roomId/unread-count'),
      headers: headers,
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['unreadCount'] ?? 0;
    }
    return 0;
  }

  // Start typing indicator
  // Backend: POST /api/chat/rooms/{roomId}/typing/start
  Future<void> startTyping(int roomId) async {
    final headers = await _getHeaders();
    await http.post(
      Uri.parse('${AppConstants.baseUrl}/chat/rooms/$roomId/typing/start'),
      headers: headers,
    );
  }

  // Stop typing indicator
  // Backend: POST /api/chat/rooms/{roomId}/typing/stop
  Future<void> stopTyping(int roomId) async {
    final headers = await _getHeaders();
    await http.post(
      Uri.parse('${AppConstants.baseUrl}/chat/rooms/$roomId/typing/stop'),
      headers: headers,
    );
  }

  // Search messages in a room
  // Backend: GET /api/chat/rooms/{roomId}/search?keyword=xxx
  Future<List<Message>> searchMessages(int roomId, String keyword) async {
    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse('${AppConstants.baseUrl}/chat/rooms/$roomId/search?keyword=$keyword'),
      headers: headers,
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => Message.fromJson(json)).toList();
    }
    return [];
  }
  // Send image message
  // Backend: POST /api/chat/rooms/{roomId}/images
  Future<Message> sendImage(int roomId, String imagePath, {String? caption}) async {
    final token = await _authService.getAccessToken();
    var request = http.MultipartRequest(
      'POST', 
      Uri.parse('${AppConstants.baseUrl}/chat/rooms/$roomId/images')
    );
    
    request.headers['Authorization'] = 'Bearer $token';
    request.files.add(await http.MultipartFile.fromPath('image', imagePath));
    if (caption != null) {
      request.fields['content'] = caption;
    }

    final streamlinedResponse = await request.send();
    final response = await http.Response.fromStream(streamlinedResponse);

    if (response.statusCode == 200 || response.statusCode == 201) {
      return Message.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to send image: ${response.body}');
    }
  }

  // Send file message
  // Backend: POST /api/chat/rooms/{roomId}/files
  Future<Message> sendFile(int roomId, String filePath, {String? caption}) async {
    final token = await _authService.getAccessToken();
    var request = http.MultipartRequest(
      'POST', 
      Uri.parse('${AppConstants.baseUrl}/chat/rooms/$roomId/files')
    );
    
    request.headers['Authorization'] = 'Bearer $token';
    request.files.add(await http.MultipartFile.fromPath('file', filePath));
    if (caption != null) {
      request.fields['content'] = caption;
    }

    final streamlinedResponse = await request.send();
    final response = await http.Response.fromStream(streamlinedResponse);

    if (response.statusCode == 200 || response.statusCode == 201) {
      return Message.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to send file: ${response.body}');
    }
  }

  // Create group chat
  // Backend: POST /api/chat/rooms
  Future<ChatRoom> createGroupChat(String name, List<int> memberIds) async {
    final headers = await _getHeaders();
    final body = {
      'name': name,
      'memberIds': memberIds,
      'isGroup': true,
    };

    final response = await http.post(
      Uri.parse('${AppConstants.baseUrl}/chat/rooms'),
      headers: headers,
      body: json.encode(body),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return ChatRoom.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to create group: ${response.body}');
    }
  }

  // Delete message
  // Backend: DELETE /api/chat/messages/{messageId}
  Future<void> deleteMessage(int messageId) async {
    final headers = await _getHeaders();
    final response = await http.delete(
      Uri.parse('${AppConstants.baseUrl}/chat/messages/$messageId'),
      headers: headers,
    );

    if (response.statusCode != 200 && response.statusCode != 204) {
      throw Exception('Failed to delete message: ${response.body}');
    }
  }

  // Edit message
  // Backend: PUT /api/chat/messages/{messageId}
  Future<Message> editMessage(int messageId, String newContent) async {
    final headers = await _getHeaders();
    final response = await http.put(
      Uri.parse('${AppConstants.baseUrl}/chat/messages/$messageId'),
      headers: headers,
      body: json.encode({'content': newContent}),
    );

    if (response.statusCode == 200) {
      return Message.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to edit message: ${response.body}');
    }
  }

  // Mark message as seen
  // Backend: PUT /api/chat/messages/{messageId}/seen

}
