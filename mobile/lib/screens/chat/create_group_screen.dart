import 'package:flutter/material.dart';
import 'package:mobile/config/app_colors.dart';
import 'package:mobile/data/models/user.dart';
import 'package:mobile/data/services/chat_service.dart';
import 'package:mobile/data/services/user_service.dart';

class CreateGroupScreen extends StatefulWidget {
  const CreateGroupScreen({super.key});

  @override
  State<CreateGroupScreen> createState() => _CreateGroupScreenState();
}

class _CreateGroupScreenState extends State<CreateGroupScreen> {
  final UserService _userService = UserService();
  final ChatService _chatService = ChatService();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _searchController = TextEditingController();
  
  List<User> _searchResults = [];
  final List<User> _selectedUsers = [];
  bool _isLoading = false;
  bool _isSearching = false;

  void _onSearchChanged(String query) {
    if (query.isEmpty) {
      setState(() {
        _searchResults = [];
        _isSearching = false;
      });
      return;
    }

    // Debounce search could be added here
    _performSearch(query);
  }

  Future<void> _performSearch(String query) async {
    setState(() => _isSearching = true);
    final users = await _userService.searchUsers(query);
    if (!mounted) return;
    
    setState(() {
      // Filter out already selected users
      _searchResults = users.where((u) => !_selectedUsers.any((s) => s.userId == u.userId)).toList();
      _isSearching = false;
    });
  }

  void _toggleUserSelection(User user) {
    setState(() {
      if (_selectedUsers.any((u) => u.userId == user.userId)) {
        _selectedUsers.removeWhere((u) => u.userId == user.userId);
      } else {
        _selectedUsers.add(user);
        _searchResults.removeWhere((u) => u.userId == user.userId);
      }
    });
  }

  Future<void> _createGroup() async {
    if (_nameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập tên nhóm')),
      );
      return;
    }

    if (_selectedUsers.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn ít nhất 1 thành viên')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final memberIds = _selectedUsers.map((u) => u.userId).toList();
      await _chatService.createGroupChat(_nameController.text.trim(), memberIds);
      
      if (!mounted) return;
      Navigator.pop(context, true); // Return true to trigger refresh
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi tạo nhóm: $e')),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tạo nhóm mới', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // Group Name Input
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: TextField(
              controller: _nameController,
              decoration: InputDecoration(
                labelText: 'Tên nhóm',
                prefixIcon: const Icon(Icons.group),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          
          // Selected Users List (Horizontal)
          if (_selectedUsers.isNotEmpty)
            Container(
              height: 90,
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _selectedUsers.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (context, index) {
                  final user = _selectedUsers[index];
                  return Column(
                    children: [
                      Stack(
                        children: [
                          CircleAvatar(
                            radius: 24,
                            backgroundColor: AppColors.primary,
                            backgroundImage: user.avatarUrl != null ? NetworkImage(user.avatarUrl!) : null,
                            child: user.avatarUrl == null
                                ? Text(
                                    user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : '?',
                                    style: const TextStyle(color: Colors.white),
                                  )
                                : null,
                          ),
                          Positioned(
                            right: -4,
                            top: -4,
                            child: GestureDetector(
                              onTap: () => _toggleUserSelection(user),
                              child: Container(
                                padding: const EdgeInsets.all(2),
                                decoration: const BoxDecoration(
                                  color: Colors.white,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.cancel, color: Colors.red, size: 16),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        user.fullName,
                        style: const TextStyle(fontSize: 12),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  );
                },
              ),
            ),
            
          const Divider(height: 1),

          // Search Box
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Tìm kiếm người dùng...',
                prefixIcon: const Icon(Icons.search),
                filled: true,
                fillColor: Colors.grey[100],
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16),
              ),
              onChanged: _onSearchChanged,
            ),
          ),

          // Search Results
          Expanded(
            child: _isSearching
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    itemCount: _searchResults.length,
                    itemBuilder: (context, index) {
                      final user = _searchResults[index];
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: AppColors.primary.withOpacity(0.2),
                          backgroundImage: user.avatarUrl != null ? NetworkImage(user.avatarUrl!) : null,
                          child: user.avatarUrl == null
                              ? Text(
                                  user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : '?',
                                  style: TextStyle(color: AppColors.primary),
                                )
                              : null,
                        ),
                        title: Text(user.fullName, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('${user.username} • ${user.email}'),
                        trailing: IconButton(
                          icon: const Icon(Icons.add_circle_outline, color: AppColors.primary),
                          onPressed: () => _toggleUserSelection(user),
                        ),
                        onTap: () => _toggleUserSelection(user),
                      );
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: _selectedUsers.isNotEmpty
          ? FloatingActionButton.extended(
              onPressed: _isLoading ? null : _createGroup,
              backgroundColor: AppColors.primary,
              label: _isLoading 
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Tạo nhóm', style: TextStyle(color: Colors.white)),
              icon: _isLoading ? null : const Icon(Icons.check, color: Colors.white),
            )
          : null,
    );
  }
}
