import 'package:flutter/material.dart';
import 'package:mobile/data/models/message.dart';
import 'package:mobile/data/services/chat_service.dart';
import 'package:mobile/config/app_colors.dart';
import 'package:intl/intl.dart';
import 'dart:async';

class ChatSearchScreen extends StatefulWidget {
  final int roomId;

  const ChatSearchScreen({Key? key, required this.roomId}) : super(key: key);

  @override
  _ChatSearchScreenState createState() => _ChatSearchScreenState();
}

class _ChatSearchScreenState extends State<ChatSearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  final ChatService _chatService = ChatService();
  List<Message> _searchResults = [];
  bool _isLoading = false;
  Timer? _debounce;

  @override
  void dispose() {
    _searchController.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      if (query.isNotEmpty) {
        _searchMessages(query);
      } else {
        setState(() {
          _searchResults = [];
        });
      }
    });
  }

  Future<void> _searchMessages(String query) async {
    setState(() {
      _isLoading = true;
    });
    try {
      final results = await _chatService.searchMessages(widget.roomId, query);
      setState(() {
        _searchResults = results;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi tìm kiếm: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: TextField(
          controller: _searchController,
          autofocus: true,
          style: const TextStyle(color: Colors.white),
          decoration: const InputDecoration(
            hintText: 'Tìm tin nhắn...',
            hintStyle: TextStyle(color: Colors.white70),
            border: InputBorder.none,
          ),
          onChanged: _onSearchChanged,
        ),
        backgroundColor: AppColors.primary,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _searchResults.isEmpty
              ? _buildEmptyState()
              : ListView.builder(
                  itemCount: _searchResults.length,
                  itemBuilder: (context, index) {
                    final message = _searchResults[index];
                    return _buildResultItem(message);
                  },
                ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.search, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            _searchController.text.isEmpty
                ? 'Nhập từ khóa để tìm kiếm'
                : 'Không tìm thấy kết quả',
            style: TextStyle(color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }

  Widget _buildResultItem(Message message) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: AppColors.primary.withOpacity(0.1),
        backgroundImage: message.sender.avatarUrl != null
            ? NetworkImage(message.sender.avatarUrl!)
            : null,
        child: message.sender.avatarUrl == null
            ? Text(
                message.sender.username.isNotEmpty
                    ? message.sender.username[0].toUpperCase()
                    : '?',
                style: TextStyle(color: AppColors.primary),
              )
            : null,
      ),
      title: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            message.sender.username,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          ),
          Text(
            DateFormat('dd/MM/yyyy HH:mm').format(message.sentAt),
            style: TextStyle(color: Colors.grey[500], fontSize: 12),
          ),
        ],
      ),
      subtitle: Text(
        message.content,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
      ),
      onTap: () {
        // Optional: Navigate back to chat and scroll to message
        // For now, just close search if desired or do nothing
      },
    );
  }
}
