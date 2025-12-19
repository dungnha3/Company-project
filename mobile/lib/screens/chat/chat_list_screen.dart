import 'package:flutter/material.dart';
import 'package:mobile/data/models/chat_room.dart';
import 'package:mobile/data/services/chat_service.dart';
import 'package:mobile/data/services/auth_service.dart';
import 'package:mobile/config/app_router.dart';
import 'package:mobile/config/app_colors.dart';
import 'package:mobile/config/app_colors.dart';
import 'package:intl/intl.dart';
import 'package:mobile/screens/chat/create_group_screen.dart';
import 'package:mobile/screens/chat/user_search_screen.dart';

class ChatListScreen extends StatefulWidget {
  const ChatListScreen({super.key});

  @override
  State<ChatListScreen> createState() => _ChatListScreenState();
}

class _ChatListScreenState extends State<ChatListScreen> with SingleTickerProviderStateMixin {
  final ChatService _chatService = ChatService();
  final AuthService _authService = AuthService();
  late TabController _tabController;
  
  List<ChatRoom> _allRooms = [];
  bool _isLoading = true;
  int? _currentUserId;
  String _searchQuery = '';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    
    try {
      final userId = await _authService.getUserId();
      if (userId != null) {
        _currentUserId = int.parse(userId);
      }
      
      final rooms = await _chatService.getChatRooms();
      
      if (mounted) {
        setState(() {
          _allRooms = rooms;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading chat rooms: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  List<ChatRoom> _getRoomsByType(RoomType type) {
    List<ChatRoom> rooms = [];
    for (var room in _allRooms) {
      if (room.type == type) {
        if (_searchQuery.isEmpty || room.name.toLowerCase().contains(_searchQuery.toLowerCase())) {
          rooms.add(room);
        }
      }
    }
    
    // Sort by last message time
    rooms.sort((a, b) {
      if (a.lastMessageAt == null && b.lastMessageAt == null) return 0;
      if (a.lastMessageAt == null) return 1;
      if (b.lastMessageAt == null) return -1;
      return b.lastMessageAt!.compareTo(a.lastMessageAt!);
    });
    
    return rooms;
  }

  int _countUnread(RoomType type) {
    int count = 0;
    for (var room in _allRooms) {
      if (room.type == type) {
        count += room.unreadCount;
      }
    }
    return count;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Tin nhắn', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.group_add_outlined),
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const CreateGroupScreen()),
              );
              if (result == true) {
                _loadData();
              }
            },
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(100),
          child: Column(
            children: [
              // Search bar
              Container(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: Container(
                  height: 44,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: TextField(
                    controller: _searchController,
                    style: TextStyle(color: AppColors.textPrimary),
                    decoration: InputDecoration(
                      hintText: 'Tìm kiếm cuộc trò chuyện...',
                      hintStyle: TextStyle(color: AppColors.textHint),
                      prefixIcon: Icon(Icons.search, color: AppColors.textSecondary),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: Icon(Icons.clear, color: AppColors.textSecondary, size: 20),
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _searchQuery = '');
                              },
                            )
                          : null,
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    onChanged: (value) {
                      setState(() => _searchQuery = value);
                    },
                  ),
                ),
              ),
              // Tabs
              TabBar(
                controller: _tabController,
                indicatorColor: Colors.white,
                indicatorWeight: 3,
                labelColor: Colors.white,
                unselectedLabelColor: Colors.white54,
                labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                tabs: [
                  _buildTab('Cá nhân', Icons.person, _countUnread(RoomType.DIRECT)),
                  _buildTab('Nhóm', Icons.groups, _countUnread(RoomType.GROUP)),
                  _buildTab('Dự án', Icons.work, _countUnread(RoomType.PROJECT)),
                ],
              ),
            ],
          ),
        ),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: AppColors.primary))
          : TabBarView(
              controller: _tabController,
              children: [
                _buildChatList(RoomType.DIRECT),
                _buildChatList(RoomType.GROUP),
                _buildChatList(RoomType.PROJECT),
              ],
            ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.primary,
        onPressed: () async {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const UserSearchScreen()),
          );
          
          if (result != null && result is ChatRoom && mounted) {
            // Navigate to the newly created/opened chat room
            // First refresh list
            _loadData();
            
            // Then open chat
            Navigator.pushNamed(
              context,
              AppRouter.chat,
              arguments: {
                'roomId': result.roomId,
                'roomName': _currentUserId != null 
                    ? result.getDisplayName(_currentUserId!) 
                    : result.name,
              },
            ).then((_) => _loadData());
          }
        },
        child: const Icon(Icons.edit, color: Colors.white),
      ),
    );
  }

  Widget _buildTab(String label, IconData icon, int unreadCount) {
    return Tab(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18),
          const SizedBox(width: 4),
          Text(label),
          if (unreadCount > 0) ...[
            const SizedBox(width: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                unreadCount > 99 ? '99+' : '$unreadCount',
                style: const TextStyle(fontSize: 10, color: Colors.white),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildChatList(RoomType type) {
    final rooms = _getRoomsByType(type);
    
    if (rooms.isEmpty) {
      return _buildEmptyState(type);
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      color: AppColors.primary,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: rooms.length,
        separatorBuilder: (_, __) => Divider(height: 1, indent: 76, color: Colors.grey.shade200),
        itemBuilder: (context, index) => _buildChatItem(rooms[index]),
      ),
    );
  }

  Widget _buildEmptyState(RoomType type) {
    String message;
    IconData icon;
    
    switch (type) {
      case RoomType.DIRECT:
        message = 'Chưa có tin nhắn cá nhân';
        icon = Icons.person_outline;
        break;
      case RoomType.GROUP:
        message = 'Chưa có nhóm chat nào';
        icon = Icons.groups_outlined;
        break;
      case RoomType.PROJECT:
        message = 'Chưa có chat dự án';
        icon = Icons.work_outline;
        break;
    }
    
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 48, color: AppColors.primary),
          ),
          const SizedBox(height: 16),
          Text(
            message,
            style: TextStyle(color: AppColors.textSecondary, fontSize: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildChatItem(ChatRoom room) {
    final hasUnread = room.unreadCount > 0;
    // Sử dụng getDisplayName để lấy tên người đang chat cho DIRECT chat
    final displayName = _currentUserId != null 
        ? room.getDisplayName(_currentUserId!)
        : room.name;
    
    return InkWell(
      onTap: () {
        Navigator.pushNamed(
          context,
          AppRouter.chat,
          arguments: {'roomId': room.roomId, 'roomName': displayName},
        ).then((_) => _loadData());
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            _buildAvatar(room),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          displayName,
                          style: TextStyle(
                            fontWeight: hasUnread ? FontWeight.bold : FontWeight.w600,
                            fontSize: 16,
                            color: AppColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (room.lastMessageAt != null)
                        Text(
                          _formatTime(room.lastMessageAt!),
                          style: TextStyle(
                            fontSize: 12,
                            color: hasUnread ? AppColors.primary : AppColors.textHint,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          room.lastMessage?.content ?? 'Bắt đầu cuộc trò chuyện',
                          style: TextStyle(
                            fontSize: 14,
                            color: hasUnread ? AppColors.textPrimary : AppColors.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (hasUnread)
                        Container(
                          margin: const EdgeInsets.only(left: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            room.unreadCount > 99 ? '99+' : '${room.unreadCount}',
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAvatar(ChatRoom room) {
    Color avatarColor;
    IconData? avatarIcon;
    
    switch (room.type) {
      case RoomType.DIRECT:
        avatarColor = AppColors.primary;
        break;
      case RoomType.GROUP:
        avatarColor = AppColors.success;
        avatarIcon = Icons.groups;
        break;
      case RoomType.PROJECT:
        avatarColor = AppColors.warning;
        avatarIcon = Icons.work;
        break;
    }

    return Container(
      width: 52,
      height: 52,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: avatarColor,
      ),
      child: room.avatarUrl != null
          ? ClipOval(
              child: Image.network(
                room.avatarUrl!, 
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Center(
                  child: room.type == RoomType.DIRECT
                      ? Text(
                          room.name.isNotEmpty ? room.name[0].toUpperCase() : '?',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20),
                        )
                      : Icon(avatarIcon ?? Icons.chat, color: Colors.white, size: 24),
                ),
              ),
            )
          : Center(
              child: room.type == RoomType.DIRECT
                  ? Text(
                      room.name.isNotEmpty ? room.name[0].toUpperCase() : '?',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20),
                    )
                  : Icon(avatarIcon ?? Icons.chat, color: Colors.white, size: 24),
            ),
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final messageDate = DateTime(time.year, time.month, time.day);
    
    if (messageDate == today) {
      return DateFormat('HH:mm').format(time);
    } else if (messageDate == today.subtract(const Duration(days: 1))) {
      return 'Hôm qua';
    } else if (now.difference(time).inDays < 7) {
      return DateFormat('E', 'vi').format(time);
    } else {
      return DateFormat('dd/MM').format(time);
    }
  }
}
