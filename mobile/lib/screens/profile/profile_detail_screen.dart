import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../data/models/user.dart';
import '../../data/services/user_service.dart';

class ProfileDetailScreen extends StatefulWidget {
  const ProfileDetailScreen({super.key});

  @override
  State<ProfileDetailScreen> createState() => _ProfileDetailScreenState();
}

class _ProfileDetailScreenState extends State<ProfileDetailScreen> {
  final _userService = UserService();
  User? _user;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final user = await _userService.getProfile();
    if (mounted) {
      setState(() {
        _user = user;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Thông tin cá nhân', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        centerTitle: true,
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _user == null
              ? const Center(child: Text('Không tải được thông tin'))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _buildAvatarHeader(),
                      const SizedBox(height: 24),
                      _buildInfoCard(),
                    ],
                  ),
                ),
    );
  }

  Widget _buildAvatarHeader() {
    return Column(
      children: [
        Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.primary.withOpacity(0.1),
            border: Border.all(color: AppColors.primary, width: 2),
          ),
          child: ClipOval(
            child: _user?.avatarUrl != null
                ? Image.network(
                    _user!.avatarUrl!,
                    fit: BoxFit.cover,
                    width: 100,
                    height: 100,
                    errorBuilder: (_, __, ___) => Icon(Icons.person, size: 50, color: AppColors.primary),
                  )
                : Icon(Icons.person, size: 50, color: AppColors.primary),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          _user?.fullName ?? _user?.username ?? 'N/A',
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        Text(
          _user?.role ?? 'EMPLOYEE',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
        ),
      ],
    );
  }

  Widget _buildInfoCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          _buildInfoTile(Icons.person_outline, 'Họ và tên', _user?.fullName),
          const Divider(height: 1),
          _buildInfoTile(Icons.account_circle_outlined, 'Tên đăng nhập', _user?.username),
          const Divider(height: 1),
          _buildInfoTile(Icons.email_outlined, 'Email', _user?.email),
          const Divider(height: 1),
          _buildInfoTile(Icons.phone_outlined, 'Số điện thoại', _user?.phoneNumber),
          const Divider(height: 1),
          _buildInfoTile(Icons.badge_outlined, 'Vai trò', _user?.role),
           const Divider(height: 1),
          _buildInfoTile(Icons.calendar_today_outlined, 'Ngày tham gia', 
            _user?.createdAt != null ? _user!.createdAt!.toLocal().toString().split(' ')[0] : null),
        ],
      ),
    );
  }

  Widget _buildInfoTile(IconData icon, String label, String? value) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                ),
                const SizedBox(height: 4),
                Text(
                  value != null && value.isNotEmpty ? value : 'Chưa cập nhật',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
