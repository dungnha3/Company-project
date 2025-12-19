import 'package:flutter/material.dart';
import 'package:mobile/data/models/message.dart';
import 'package:mobile/data/services/auth_service.dart';
import 'package:mobile/data/services/chat_service.dart';
import 'package:mobile/data/services/websocket_service.dart';
import 'package:mobile/config/app_colors.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'package:mobile/data/models/user.dart';
import 'package:mobile/data/models/storage_models.dart';
import 'package:mobile/screens/storage/my_files_screen.dart';
import 'package:mobile/screens/chat/chat_search_screen.dart';
import 'package:mobile/screens/chat/call_screen.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:async';

class ChatScreen extends StatefulWidget {
  final int roomId;
  final String roomName;

  const ChatScreen({Key? key, required this.roomId, required this.roomName}) : super(key: key);

  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final ChatService _chatService = ChatService();
  final WebSocketService _webSocketService = WebSocketService();
  final AuthService _authService = AuthService();
  
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _focusNode = FocusNode();
  
  List<Message> _messages = [];
  bool _isLoading = true;
  int? _currentUserId;
  final Set<int> _markedAsSeenIds = {};
  
  Timer? _typingTimer;
  Timer? _debounce;
  bool _isTyping = false;
  final List<String> _typingUsers = [];
  final StreamController<Map<String, dynamic>> _callSignalController = StreamController.broadcast();

  @override
  void initState() {
    super.initState();
    _loadCurrentUser();
    _loadMessages();
    _connectWebSocket();
  }

  @override
  @override
  void dispose() {
    _webSocketService.unsubscribe('/topic/room.${widget.roomId}');
    _messageController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    _typingTimer?.cancel();
    _debounce?.cancel();
    _webSocketService.disconnect();
    _callSignalController.close();
    super.dispose();
  }

  Future<void> _loadCurrentUser() async {
    final userId = await _authService.getUserId();
    if (userId != null) {
      setState(() {
        _currentUserId = int.parse(userId);
      });
    }
  }

  Future<void> _loadMessages() async {
    try {
      final messages = await _chatService.getMessages(widget.roomId);
      setState(() {
        _messages = messages.reversed.toList();
        _isLoading = false;
      });
      _scrollToBottom();
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _connectWebSocket() async {
    final token = await _authService.getAccessToken();
    if (token != null) {
      _webSocketService.connect(token, onConnect: (frame) {
        _subscribeToRoom();
      });
    }
  }



  void _subscribeToRoom() {
    _webSocketService.subscribe('/topic/room.${widget.roomId}', (data) {
      if (data['type'] == 'CHAT_MESSAGE') {
        if (data['data'] != null) {
          final newMessage = Message.fromJson(data['data']);
          // Skip messages from current user (already added locally when sent)
          if (newMessage.sender.userId == _currentUserId) {
            return;
          }
          // Remove from typing list if sender was typing
          if (_typingUsers.contains(newMessage.sender.username)) {
             setState(() => _typingUsers.remove(newMessage.sender.username));
          }

          // Check if message already exists (prevent duplicates)
          final exists = _messages.any((m) => m.messageId == newMessage.messageId);
          if (!exists) {
            setState(() {
              _messages.insert(0, newMessage);
            });
          }
        }
      } else if (data['type'] == 'MESSAGE_EDITED') {
        if (data['data'] != null) {
          final updatedMessage = Message.fromJson(data['data']);
          final index = _messages.indexWhere((m) => m.messageId == updatedMessage.messageId);
          if (index != -1) {
            setState(() {
              _messages[index] = updatedMessage;
            });
          }
        }
      } else if (data['type'] == 'MESSAGE_DELETED') {
        final messageId = data['messageId'] ?? (data['data'] != null ? data['data']['messageId'] : null);
        if (messageId != null) {
          setState(() {
            _messages.removeWhere((m) => m.messageId == messageId);
          });
        }
      } else if (data['type'] == 'MESSAGE_SEEN') {
        final messageId = data['messageId'] ?? (data['data'] != null ? data['data']['messageId'] : null);
        final userId = data['userId'] ?? (data['data'] != null ? data['data']['userId'] : null);
        final username = data['username'] ?? (data['data'] != null ? data['data']['username'] : null);
        String? avatarUrl;
        if (data['data'] != null && data['data']['avatarUrl'] != null) {
           avatarUrl = data['data']['avatarUrl'];
        }

        if (messageId != null && userId != null) {
          final index = _messages.indexWhere((m) => m.messageId == messageId);
          if (index != -1) {
             setState(() {
               final oldMsg = _messages[index];
               if (!oldMsg.seenBy.any((u) => u.userId == userId)) {
                  final newSeenBy = List<User>.from(oldMsg.seenBy);
                  newSeenBy.add(User(
                    userId: userId, 
                    username: username ?? 'Unknown', 
                    email: '', 
                    phoneNumber: '', // Added dummy
                    avatarUrl: avatarUrl,
                    role: 'USER',
                    isActive: true,
                  ));
                  
                  _messages[index] = Message(
                     messageId: oldMsg.messageId,
                     roomId: oldMsg.roomId,
                     sender: oldMsg.sender,
                     content: oldMsg.content,
                     type: oldMsg.type,
                     sentAt: oldMsg.sentAt,
                     fileUrl: oldMsg.fileUrl,
                     fileName: oldMsg.fileName,
                     seenBy: newSeenBy
                  );
               }
             });
          }
        }
      } else if (data['type'] == 'CALL_OFFER') {
          _showIncomingCallDialog(data);
      } else if (data['type'] == 'CALL_ANSWER' || 
                 data['type'] == 'ICE_CANDIDATE' || 
                 data['type'] == 'CALL_END') {
          _callSignalController.add(data);
      } else if (data['type'] == 'TYPING_START') {
        final userId = data['userId'];
        final username = data['username'];
        if (userId != _currentUserId && !_typingUsers.contains(username)) {
           setState(() => _typingUsers.add(username));
        }
      } else if (data['type'] == 'TYPING_STOP') {
        final username = data['username'];
         setState(() => _typingUsers.remove(username));
      } else if (data['type'] == 'USER_STATUS_CHANGE') {
        // Optional: Update title online status if needed
        // For now, simpler to not complicate AppBar
      }
    });
  }

  void _onTextChanged(String text) {
    if (!_isTyping && text.isNotEmpty) {
      _isTyping = true;
      _webSocketService.send('/app/chat.typing.start', {'roomId': widget.roomId});
    }

    _debounce?.cancel();
    if (text.isEmpty) {
       _isTyping = false;
       _webSocketService.send('/app/chat.typing.stop', {'roomId': widget.roomId});
    } else {
      _debounce = Timer(const Duration(milliseconds: 1500), () {
        _isTyping = false;
        _webSocketService.send('/app/chat.typing.stop', {'roomId': widget.roomId});
      });
    }
  }

  Future<void> _sendMessage() async {
    if (_messageController.text.trim().isEmpty) return;

    final content = _messageController.text;
    _messageController.clear();

    try {
      final newMessage = await _chatService.sendMessage(widget.roomId, content);
      if (!mounted) return;
      setState(() {
        _messages.insert(0, newMessage);
      });
      _scrollToBottom();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Không thể gửi tin nhắn'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(source: source);
      if (pickedFile != null) {
        setState(() => _isLoading = true);
        try {
          final newMessage = await _chatService.sendImage(widget.roomId, pickedFile.path);
          if (!mounted) return;
          setState(() {
            _messages.insert(0, newMessage);
            _isLoading = false;
          });
          _scrollToBottom();
        } catch (e) {
           if (!mounted) return;
           setState(() => _isLoading = false);
           ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi gửi ảnh: $e')));
        }
      }
    } catch (e) {
      debugPrint('Error picking image: $e');
    }
  }

  Future<void> _pickFile() async {
    try {
      final result = await FilePicker.platform.pickFiles();
      if (result != null && result.files.single.path != null) {
        setState(() => _isLoading = true);
        try {
          final newMessage = await _chatService.sendFile(widget.roomId, result.files.single.path!);
          if (!mounted) return;
          setState(() {
            _messages.insert(0, newMessage);
            _isLoading = false;
          });
          _scrollToBottom();
        } catch (e) {
           if (!mounted) return;
           setState(() => _isLoading = false);
           ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi gửi file: $e')));
        }
      }
    } catch (e) {
      debugPrint('Error picking file: $e');
    }
  }

  Future<void> _pickFromCloud() async {
      try {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => MyFilesScreen(isPicker: true)),
          );

          if (result != null && result is StorageFile) {
              await _sendLinkedFile(result);
          }
      } catch (e) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi chọn file: $e')));
      }
  }

  Future<void> _sendLinkedFile(StorageFile file) async {
       try {
           final messageType = file.mimeType.startsWith('image/') ? 'IMAGE' : 'FILE';
           
           final newMessage = await _chatService.sendMessage(
               widget.roomId, 
               file.originalFilename, // Content is filename or caption
               messageType: messageType,
               fileId: file.fileId,
               fileName: file.originalFilename,
               fileUrl: file.fileUrl,
               fileSize: file.size,
               fileType: file.mimeType
           );
            if (!mounted) return;
            setState(() {
                _messages.insert(0, newMessage);
            });
            _scrollToBottom();
       } catch(e) {
           ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gửi file thất bại: $e')));
       }
  }

  void _showAttachmentOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library, color: Colors.blue),
              title: const Text('Thư viện ảnh'),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.gallery);
              },
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt, color: Colors.green),
              title: const Text('Chụp ảnh'),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.attach_file, color: Colors.purple),
              title: const Text('Tệp đính kèm'),
              onTap: () {
                Navigator.pop(context);
                _pickFile();
              },
            ),
          ],
        ),
      ),
    );
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        0.0,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  void _showMessageOptions(Message message) {
    if (message.sender.userId != _currentUserId) return;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => SafeArea(
        child: Wrap(
          children: [
            if (message.type == 'TEXT')
              ListTile(
                leading: const Icon(Icons.edit, color: Colors.blue),
                title: const Text('Chỉnh sửa tin nhắn'),
                onTap: () {
                  Navigator.pop(context);
                  _showEditDialog(message);
                },
              ),
            ListTile(
              leading: const Icon(Icons.delete, color: Colors.red),
              title: const Text('Xóa tin nhắn'),
              onTap: () {
                Navigator.pop(context);
                _deleteMessage(message);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showEditDialog(Message message) {
    final editController = TextEditingController(text: message.content);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Chỉnh sửa tin nhắn'),
        content: TextField(
          controller: editController,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'Nhập nội dung mới'),
          maxLines: 3,
          minLines: 1,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Hủy'),
          ),
          TextButton(
            onPressed: () async {
              if (editController.text.trim().isNotEmpty) {
                Navigator.pop(context);
                try {
                  await _chatService.editMessage(message.messageId, editController.text.trim());
                  // UI update will happen via WebSocket
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi sửa tin nhắn: $e')));
                }
              }
            },
            child: const Text('Lưu'),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteMessage(Message message) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Xóa tin nhắn?'),
        content: const Text('Tin nhắn này sẽ bị xóa vĩnh viễn.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Hủy')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Xóa', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await _chatService.deleteMessage(message.messageId);
        // UI update via WebSocket
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi xóa tin nhắn: $e')));
      }
    }
  }



  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFE8E8E8), // Zalo gray background
      appBar: _buildAppBar(),
      body: Column(
        children: [
          Expanded(
            child: _isLoading
                ? Center(child: CircularProgressIndicator(color: AppColors.primary))
                : _messages.isEmpty
                    ? _buildEmptyChat()
                    : ListView.builder(
                        controller: _scrollController,
                        reverse: true,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final message = _messages[index];
                          final isMe = message.sender.userId == _currentUserId;
                          
                          // Check if we should show date separator
                          bool showDateSeparator = false;
                          if (index == _messages.length - 1) {
                            showDateSeparator = true;
                          } else {
                            final prevMessage = _messages[index + 1];
                            final currentDate = DateTime(
                              message.sentAt.year, message.sentAt.month, message.sentAt.day
                            );
                            final prevDate = DateTime(
                              prevMessage.sentAt.year, prevMessage.sentAt.month, prevMessage.sentAt.day
                            );
                            showDateSeparator = currentDate != prevDate;
                          }
                          
                          
                          // Mark as seen logic
                          if (!isMe && !message.seenBy.any((u) => u.userId == _currentUserId)) {
                             if (!_markedAsSeenIds.contains(message.messageId)) {
                                _markedAsSeenIds.add(message.messageId);
                                _chatService.markMessageAsSeen(message.messageId);
                             }
                          }

                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              if (showDateSeparator) _buildDateSeparator(message.sentAt),
                              _buildMessageBubble(message, isMe),
                              if (isMe && message.seenBy.isNotEmpty)
                                _buildSeenStatus(message.seenBy),
                            ],
                          );
                        },
                      ),
          ),
          _buildMessageInput(),
        ],
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: AppColors.primary,
      foregroundColor: Colors.white,
      elevation: 0,
      titleSpacing: 0,
      title: Row(
        children: [
          // Avatar
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white.withOpacity(0.2),
            ),
            child: Center(
              child: Text(
                widget.roomName.substring(0, 1).toUpperCase(),
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Name and status
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.roomName,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: AppColors.success,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Đang hoạt động',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.white.withOpacity(0.8),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
      actions: [
        // Temporary disabled Call features
        /*
        IconButton(
          icon: const Icon(Icons.call_outlined),
              onPressed: _startAudioCall,
        ),
        IconButton(
          icon: const Icon(Icons.videocam_outlined),
          onPressed: _startVideoCall,
        ),
        */
        IconButton(
          icon: const Icon(Icons.search),
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => ChatSearchScreen(roomId: widget.roomId),
              ),
            );
          },
        ),
        IconButton(
          icon: const Icon(Icons.menu),
          onPressed: () {
            showModalBottomSheet(
              context: context,
              shape: const RoundedRectangleBorder(
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              builder: (context) => SafeArea(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const SizedBox(height: 16),
                    CircleAvatar(
                      radius: 40,
                      backgroundColor: AppColors.primary,
                      child: Text(
                        widget.roomName.substring(0, 1).toUpperCase(),
                        style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      widget.roomName,
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 24),
                    ListTile(
                      leading: Icon(Icons.notifications, color: AppColors.primary),
                      title: const Text('Tắt thông báo'),
                      onTap: () {
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Tính năng đang phát triển')),
                        );
                      },
                    ),
                    ListTile(
                      leading: Icon(Icons.delete_outline, color: Colors.red),
                      title: const Text('Xóa cuộc trò chuyện', style: TextStyle(color: Colors.red)),
                      onTap: () {
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Tính năng đang phát triển')),
                        );
                      },
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildEmptyChat() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.chat_bubble_outline, size: 40, color: AppColors.primary),
          ),
          const SizedBox(height: 16),
          Text(
            'Bắt đầu cuộc trò chuyện',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildDateSeparator(DateTime date) {
    final now = DateTime.now();
    String text;
    
    if (date.year == now.year && date.month == now.month && date.day == now.day) {
      text = 'Hôm nay';
    } else if (date.year == now.year && date.month == now.month && date.day == now.day - 1) {
      text = 'Hôm qua';
    } else {
      text = DateFormat('dd/MM/yyyy').format(date);
    }
    
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 16),
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            text,
            style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
          ),
        ),
      ),
    );

  }

  Widget _buildSeenStatus(List<User> seenBy) {
    return Padding(
      padding: const EdgeInsets.only(right: 12, top: 2, bottom: 4),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          ...seenBy.take(5).map((user) => Padding(
            padding: const EdgeInsets.only(left: 2),
            child: CircleAvatar(
              radius: 6,
              backgroundImage: user.avatarUrl != null ? NetworkImage(user.avatarUrl!) : null,
              child: user.avatarUrl == null 
                  ? Text(user.username.isNotEmpty ? user.username[0].toUpperCase() : '?', 
                        style: const TextStyle(fontSize: 6)) 
                  : null,
            ),
          )),
          if (seenBy.length > 5)
             Text('+${seenBy.length - 5}', style: TextStyle(fontSize: 10, color: AppColors.textSecondary)),
        ],
      ),
    );
  }



  void _showIncomingCallDialog(Map<String, dynamic> data) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Cuộc gọi đến'),
        content: Text('${data['username'] ?? 'Ai đó'} đang gọi ${data['isVideo'] == false ? 'thoại' : 'video'}...'),
        actions: [
          TextButton(
            onPressed: () {
               Navigator.pop(context);
               // Send Reject signal?
            },
            child: const Text('Từ chối', style: TextStyle(color: Colors.red)),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _acceptCall(data);
            },
            child: const Text('Trả lời', style: TextStyle(color: Colors.green)),
          ),
        ],
      ),
    );
  }

  Future<void> _acceptCall(Map<String, dynamic> data) async {
    final bool isVideo = data['isVideo'] ?? true;
    final String callerName = data['username'] ?? 'Unknown';
    // data['avatarUrl']? If not present, null.
    
    if (await _requestPermissions(video: isVideo)) {
       Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => CallScreen(
            roomId: widget.roomId,
            isCaller: false,
            webSocketService: _webSocketService,
            offer: data['data'] ?? data, // Handle different structures
            signalStream: _callSignalController.stream,
            isVideoCall: isVideo,
            otherUserName: callerName,
            otherUserAvatar: null, // Attempt to get from data if possible
          ),
        ),
      );
    }
  }

  Future<void> _startVideoCall() async {
    if (await _requestPermissions(video: true)) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => CallScreen(
            roomId: widget.roomId,
            isCaller: true,
            webSocketService: _webSocketService,
            signalStream: _callSignalController.stream,
            isVideoCall: true,
            otherUserName: widget.roomName,
            otherUserAvatar: null, // Add logic to pass avatarUrl if available in ChatScreen widget
          ),
        ),
      );
    }
  }

  Future<void> _startAudioCall() async {
    if (await _requestPermissions(video: false)) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => CallScreen(
            roomId: widget.roomId,
            isCaller: true,
            webSocketService: _webSocketService,
            signalStream: _callSignalController.stream,
            isVideoCall: false,
             otherUserName: widget.roomName,
            otherUserAvatar: null,
          ),
        ),
      );
    }
  }

  Future<bool> _requestPermissions({bool video = true}) async {
    List<Permission> permissions = [Permission.microphone];
    if (video) {
      permissions.add(Permission.camera);
    }
    
    Map<Permission, PermissionStatus> statuses = await permissions.request();
    
    bool granted = statuses[Permission.microphone]!.isGranted;
    if (video) {
      granted = granted && statuses[Permission.camera]!.isGranted;
    }
    return granted;
  }

  Widget _buildMessageBubble(Message message, bool isMe) {
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (!isMe) ...[
              // Sender avatar
              Container(
                width: 32,
                height: 32,
                margin: const EdgeInsets.only(right: 8),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.primary.withOpacity(0.1),
                ),
                child: Center(
                  child: Text(
                    message.sender.username.isNotEmpty ? message.sender.username.substring(0, 1).toUpperCase() : '?',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
            ],
            
            // Message bubble
            Container(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.7,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isMe ? AppColors.primary : Colors.white, // Purple for me
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(18),
                  topRight: const Radius.circular(18),
                  bottomLeft: Radius.circular(isMe ? 18 : 4),
                  bottomRight: Radius.circular(isMe ? 4 : 18),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: GestureDetector(
                onLongPress: () => _showMessageOptions(message),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (!isMe)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Text(
                          message.sender.username,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    Text(
                      message.content,
                      style: TextStyle(
                        color: isMe ? Colors.white : AppColors.textPrimary,
                        fontSize: 15,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            // Time
            Padding(
              padding: EdgeInsets.only(left: isMe ? 0 : 6, right: isMe ? 6 : 0),
              child: Text(
                DateFormat('HH:mm').format(message.sentAt),
                style: TextStyle(fontSize: 10, color: AppColors.textHint),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageInput() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            // Text input
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_typingUsers.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 8, bottom: 4),
                        child: Text(
                          '${_typingUsers.join(", ")} đang nhập...',
                          style: TextStyle(color: AppColors.primary, fontSize: 10, fontStyle: FontStyle.italic),
                        ),
                      ),
                    TextField(
                      controller: _messageController,
                      focusNode: _focusNode,
                      decoration: InputDecoration(
                        hintText: 'Tin nhắn',
                        hintStyle: TextStyle(color: AppColors.textHint),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      onSubmitted: (_) => _sendMessage(),
                      onChanged: _onTextChanged,
                      maxLines: 4,
                      minLines: 1,
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(width: 8),
            
            // Attach button
            IconButton(
              icon: Icon(Icons.add_circle_outline, color: AppColors.primary, size: 28),
              onPressed: _showAttachmentOptions,
            ),
            
            // Send button
            Container(
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                onPressed: _sendMessage,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
