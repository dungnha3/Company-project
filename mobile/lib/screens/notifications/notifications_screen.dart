import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../data/services/notification_service.dart';
import '../../data/services/thong_bao_service.dart';
import '../../data/models/unified_notification.dart';
import '../../config/app_colors.dart';
import '../../config/app_router.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final NotificationService _notificationService = NotificationService();
  final ThongBaoService _thongBaoService = ThongBaoService();

  bool _isLoading = true;
  List<UnifiedNotification> _allNotifications = [];
  String _filter = 'all'; // 'all', 'unread', 'read'

  @override
  void initState() {
    super.initState();
    _fetchAllNotifications();
  }

  Future<void> _fetchAllNotifications() async {
    setState(() => _isLoading = true);
    try {
      // Fetch from both APIs separately to avoid type casting issues
      final notifications = await _notificationService.getMyNotifications(size: 50);
      final thongBaos = await _thongBaoService.getMyThongBao(size: 50);

      // Convert to unified list
      final List<UnifiedNotification> unified = [];

      for (var n in notifications) {
        // Bỏ qua thông báo đăng nhập spam
        if (n.type == 'AUTH_LOGIN_SUCCESS' || n.type == 'INFO') continue;
        
        unified.add(UnifiedNotification.fromNotification({
          'notificationId': n.notificationId,
          'title': n.title,
          'content': n.content,
          'type': n.type,
          'createdAt': n.createdAt,
          'isRead': n.isRead,
          'link': n.link,
        }));
      }

      for (var tb in thongBaos) {
        unified.add(UnifiedNotification.fromThongBao({
          'id': tb.id,
          'tieuDe': tb.tieuDe,
          'noiDung': tb.noiDung,
          'loai': tb.loai,
          'ngayTao': tb.ngayTao,
          'trangThai': tb.trangThai,
        }));
      }

      // Sort by date descending
      unified.sort((a, b) => b.createdAt.compareTo(a.createdAt));

      setState(() {
        _allNotifications = unified;
      });
    } catch (e) {
      debugPrint('Error fetching notifications: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<UnifiedNotification> get _filteredNotifications {
    switch (_filter) {
      case 'unread':
        return _allNotifications.where((n) => !n.isRead).toList();
      case 'read':
        return _allNotifications.where((n) => n.isRead).toList();
      default:
        return _allNotifications;
    }
  }

  Future<void> _markAsRead(UnifiedNotification notification) async {
    if (notification.isRead) return;
    
    if (notification.source == 'notification') {
      await _notificationService.markAsRead(notification.id);
    } else {
      await _thongBaoService.markAsRead(notification.id);
    }
    _fetchAllNotifications();
  }

  Future<void> _markAllAsRead() async {
    await Future.wait([
      _notificationService.markAllAsRead(),
      _thongBaoService.markAllAsRead(),
    ]);
    _fetchAllNotifications();
  }

  void _handleNotificationTap(UnifiedNotification notification) {
    _markAsRead(notification);
    
    // Navigate based on category
    switch (notification.category) {
      case 'task':
        Navigator.pushNamed(context, AppRouter.myTasks);
        break;
      case 'chat':
        Navigator.pushNamed(context, AppRouter.chatList);
        break;
      case 'leave':
        Navigator.pushNamed(context, AppRouter.leaveRequest);
        break;
      case 'salary':
        Navigator.pushNamed(context, AppRouter.payroll);
        break;
      case 'attendance':
        Navigator.pushNamed(context, AppRouter.attendance);
        break;
      default:
        // Show detail bottom sheet
        _showDetailSheet(notification);
    }
  }

  void _showDetailSheet(UnifiedNotification notification) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 50,
                height: 5,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                _getCategoryIcon(notification.category, size: 32),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    notification.title,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              notification.content,
              style: TextStyle(fontSize: 15, color: Colors.grey[700], height: 1.5),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Icon(Icons.access_time, size: 16, color: Colors.grey[500]),
                const SizedBox(width: 4),
                Text(
                  DateFormat('dd/MM/yyyy HH:mm').format(notification.createdAt),
                  style: TextStyle(color: Colors.grey[500], fontSize: 13),
                ),
              ],
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Thông báo', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.done_all),
            tooltip: 'Đọc tất cả',
            onPressed: _markAllAsRead,
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter chips
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                _buildFilterChip('Tất cả', 'all'),
                const SizedBox(width: 8),
                _buildFilterChip('Chưa đọc', 'unread'),
                const SizedBox(width: 8),
                _buildFilterChip('Đã đọc', 'read'),
              ],
            ),
          ),
          // Notification list
          Expanded(
            child: _isLoading
                ? Center(child: CircularProgressIndicator(color: AppColors.primary))
                : _filteredNotifications.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _fetchAllNotifications,
                        color: AppColors.primary,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _filteredNotifications.length,
                          itemBuilder: (context, index) {
                            final notification = _filteredNotifications[index];
                            final showDateHeader = index == 0 ||
                                !_isSameDay(
                                  _filteredNotifications[index - 1].createdAt,
                                  notification.createdAt,
                                );
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (showDateHeader) _buildDateHeader(notification.createdAt),
                                _buildNotificationCard(notification),
                              ],
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _filter == value;
    return GestureDetector(
      onTap: () => setState(() => _filter = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.grey[200],
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.grey[700],
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  Widget _buildDateHeader(DateTime date) {
    String label;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final notifDate = DateTime(date.year, date.month, date.day);

    if (notifDate == today) {
      label = 'Hôm nay';
    } else if (notifDate == yesterday) {
      label = 'Hôm qua';
    } else if (now.difference(date).inDays < 7) {
      label = 'Tuần này';
    } else {
      label = DateFormat('dd/MM/yyyy').format(date);
    }

    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 12),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.bold,
          color: Colors.grey[600],
        ),
      ),
    );
  }

  Widget _buildNotificationCard(UnifiedNotification notification) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: notification.isRead ? Colors.white : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: notification.isRead
            ? null
            : Border.all(color: AppColors.primary.withOpacity(0.3), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: InkWell(
        onTap: () => _handleNotificationTap(notification),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _getCategoryIcon(notification.category),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            notification.title,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: notification.isRead ? FontWeight.normal : FontWeight.bold,
                              color: Colors.black87,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (!notification.isRead)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      notification.content,
                      style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _formatTime(notification.createdAt),
                      style: TextStyle(fontSize: 12, color: Colors.grey[400]),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _getCategoryIcon(String category, {double size = 40}) {
    IconData icon;
    Color color;

    switch (category) {
      case 'task':
        icon = Icons.assignment;
        color = AppColors.primary;
        break;
      case 'chat':
        icon = Icons.chat_bubble;
        color = Colors.blue;
        break;
      case 'leave':
        icon = Icons.event_available;
        color = Colors.green;
        break;
      case 'salary':
        icon = Icons.payments;
        color = Colors.orange;
        break;
      case 'attendance':
        icon = Icons.access_time;
        color = Colors.red;
        break;
      case 'meeting':
        icon = Icons.groups;
        color = Colors.purple;
        break;
      case 'holiday':
        icon = Icons.celebration;
        color = Colors.pink;
        break;
      case 'hr':
        icon = Icons.work;
        color = Colors.teal;
        break;
      case 'review':
        icon = Icons.star;
        color = Colors.amber;
        break;
      case 'system':
        icon = Icons.security;
        color = Colors.grey;
        break;
      default:
        icon = Icons.notifications;
        color = Colors.blueGrey;
    }

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(size / 4),
      ),
      child: Icon(icon, color: color, size: size * 0.5),
    );
  }

  Widget _buildEmptyState() {
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
            child: Icon(Icons.notifications_off, size: 48, color: AppColors.primary),
          ),
          const SizedBox(height: 16),
          Text(
            _filter == 'unread' ? 'Không có thông báo chưa đọc' : 'Không có thông báo nào',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 16),
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final diff = now.difference(dateTime);

    if (diff.inMinutes < 1) return 'Vừa xong';
    if (diff.inMinutes < 60) return '${diff.inMinutes} phút trước';
    if (diff.inHours < 24) return '${diff.inHours} giờ trước';
    if (diff.inDays < 7) return '${diff.inDays} ngày trước';
    return DateFormat('dd/MM').format(dateTime);
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }
}
