import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import '../../data/models/user.dart';
import '../../data/services/user_service.dart';
import '../../data/services/auth_service.dart';
import '../../data/services/storage_service.dart';
import '../../data/services/project_service.dart';
import '../../config/app_router.dart';
import '../../config/app_colors.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _userService = UserService();
  final _authService = AuthService();
  final _storageService = StorageService();
  final _projectService = ProjectService();
  
  User? _user;
  bool _isLoading = true;
  
  // Stats
  int _todoCount = 0;
  int _inProgressCount = 0;
  int _doneCount = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    await Future.wait([
      _loadProfile(),
      _loadStats(),
    ]);
    setState(() => _isLoading = false);
  }

  Future<void> _loadProfile() async {
    final user = await _userService.getProfile();
    if (mounted && user != null) {
      setState(() => _user = user);
    }
  }

  Future<void> _loadStats() async {
    try {
      final tasks = await _projectService.getMyTasks();
      if (mounted) {
        setState(() {
          _todoCount = tasks.where((t) => t.statusName.toUpperCase().contains('TO DO')).length;
          _inProgressCount = tasks.where((t) => 
            t.statusName.toUpperCase().contains('PROGRESS') || 
            t.statusName.toUpperCase().contains('REVIEW')
          ).length;
          _doneCount = tasks.where((t) => t.statusName.toUpperCase().contains('DONE')).length;
        });
      }
    } catch (e) {
      // ignore
    }
  }

  Future<void> _pickAndUploadAvatar() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.image,
        allowMultiple: false,
      );

      if (result != null && result.files.isNotEmpty) {
        setState(() => _isLoading = true);
        
        final avatarUrl = await _storageService.uploadFile(result.files.first, null);
        
        if (avatarUrl != null) {
          final success = await _userService.updateProfile(avatarUrl: avatarUrl);
          if (success) {
            await _loadProfile();
            _showMessage('Cập nhật ảnh đại diện thành công');
          }
        }
      }
    } catch (e) {
      _showMessage('Lỗi tải ảnh: $e', isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showMessage(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(isError ? Icons.error_outline : Icons.check_circle, color: Colors.white),
            const SizedBox(width: 10),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: isError ? AppColors.error : AppColors.success,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Đăng xuất'),
        content: const Text('Bạn có chắc chắn muốn đăng xuất?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Hủy', style: TextStyle(color: AppColors.textSecondary)),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await _authService.logout();
              if (!mounted) return;
              Navigator.of(context).pushNamedAndRemoveUntil(
                AppRouter.login,
                (route) => false,
              );
            },
            child: Text('Đăng xuất', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Hồ sơ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
        centerTitle: true,
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [],
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        color: AppColors.primary,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              // Profile Header
              _buildProfileHeader(),
              
              const SizedBox(height: 24),
              
              // Stats Row
              _buildStatsRow(),
              
              const SizedBox(height: 24),
              
              // Menu Items
              _buildMenuItem('Thông tin cá nhân', Icons.person_outline, () {
                Navigator.pushNamed(context, AppRouter.profileDetail);
              }),
              _buildMenuItem('Đổi mật khẩu', Icons.lock_outline, () {
                Navigator.pushNamed(context, AppRouter.changePassword);
              }),
              _buildMenuItem('Tài liệu của tôi', Icons.folder_outlined, () {
                Navigator.pushNamed(context, AppRouter.myFiles);
              }),
              _buildMenuItem('Thông báo', Icons.notifications_outlined, () {
                Navigator.pushNamed(context, AppRouter.notifications);
              }),
              
              const SizedBox(height: 20),
              
              // Logout Button
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _showLogoutDialog,
                  icon: const Icon(Icons.logout, color: AppColors.error),
                  label: const Text('Đăng xuất'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.error,
                    side: const BorderSide(color: AppColors.error),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
              
              const SizedBox(height: 24),
              
              // Version
              Text(
                'DTV TEAM - Phiên bản 1.0.0',
                style: TextStyle(color: AppColors.textHint, fontSize: 12),
              ),
              
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProfileHeader() {
    final displayName = _user?.fullName ?? _user?.username ?? 'Người dùng';
    final email = _user?.email ?? 'user@example.com';
    final role = _user?.role ?? 'EMPLOYEE';
    
    String roleDisplay = 'Nhân viên';
    Color roleColor = AppColors.success;
    if (role == 'MANAGER_HR' || role == 'MANAGER_PROJECT' || role == 'MANAGER_ACCOUNTING') {
      roleDisplay = 'Quản lý';
      roleColor = AppColors.warning;
    } else if (role == 'ADMIN') {
      roleDisplay = 'Admin';
      roleColor = AppColors.error;
    }

    return Column(
      children: [
        // Avatar with camera button
        Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primary.withOpacity(0.1),
                border: Border.all(color: AppColors.primary.withOpacity(0.3), width: 3),
              ),
              child: ClipOval(
                child: _user?.avatarUrl != null
                    ? Image.network(
                        _user!.avatarUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _buildAvatarPlaceholder(),
                      )
                    : _buildAvatarPlaceholder(),
              ),
            ),
            Positioned(
              bottom: 0,
              right: 0,
              child: GestureDetector(
                onTap: _pickAndUploadAvatar,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 3),
                  ),
                  child: const Icon(Icons.camera_alt, size: 16, color: Colors.white),
                ),
              ),
            ),
          ],
        ),
        
        const SizedBox(height: 16),
        
        // Name
        Text(
          displayName,
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        
        const SizedBox(height: 4),
        
        // Email
        Text(
          email,
          style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
        ),
        
        const SizedBox(height: 8),
        
        // Role badge
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          decoration: BoxDecoration(
            color: roleColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            roleDisplay,
            style: TextStyle(
              color: roleColor,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAvatarPlaceholder() {
    return Center(
      child: Icon(
        Icons.person,
        size: 50,
        color: AppColors.primary,
      ),
    );
  }

  Widget _buildStatsRow() {
    return Row(
      children: [
        _buildStatItem('Cần làm', _todoCount.toString(), AppColors.warning),
        const SizedBox(width: 8),
        _buildStatItem('Đang làm', _inProgressCount.toString(), AppColors.info),
        const SizedBox(width: 8),
        _buildStatItem('Hoàn thành', _doneCount.toString(), AppColors.success),
      ],
    );
  }

  Widget _buildStatItem(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuItem(String title, IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 4),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(color: AppColors.border.withOpacity(0.5)),
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: AppColors.primary, size: 20),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(fontSize: 16, color: AppColors.textPrimary),
              ),
            ),
            Icon(Icons.chevron_right, color: AppColors.textHint, size: 24),
          ],
        ),
      ),
    );
  }
}
