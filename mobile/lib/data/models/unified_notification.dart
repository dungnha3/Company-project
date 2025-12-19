/// Unified notification model that combines both Notification and ThongBao
class UnifiedNotification {
  final int id;
  final String title;
  final String content;
  final String type;      // Original type from backend
  final String category;  // Computed category for grouping
  final DateTime createdAt;
  final bool isRead;
  final String? link;
  final String source;    // 'notification' or 'thong_bao'

  UnifiedNotification({
    required this.id,
    required this.title,
    required this.content,
    required this.type,
    required this.category,
    required this.createdAt,
    required this.isRead,
    this.link,
    required this.source,
  });

  /// Get category based on notification type
  static String _getCategory(String type) {
    final t = type.toUpperCase();
    
    // Task/Issue related
    if (t.contains('TASK') || t.contains('ISSUE') || t.contains('ASSIGN') || 
        t.contains('COMMENT') || t.contains('OVERDUE') || t.contains('DEADLINE')) {
      return 'task';
    }
    // Chat related
    if (t.contains('MESSAGE') || t.contains('CHAT') || t.contains('MENTION')) {
      return 'chat';
    }
    // Leave related
    if (t.contains('LEAVE') || t.contains('NGHI') || t.contains('PHEP')) {
      return 'leave';
    }
    // Salary related
    if (t.contains('SALARY') || t.contains('LUONG') || t.contains('PAYROLL')) {
      return 'salary';
    }
    // Attendance related
    if (t.contains('ATTENDANCE') || t.contains('CHAM_CONG') || t.contains('CHECKIN') || t.contains('CHECKOUT')) {
      return 'attendance';
    }
    // Login/Auth related
    if (t.contains('LOGIN') || t.contains('AUTH')) {
      return 'system';
    }
    // ThongBao categories
    if (t.contains('HOP') || t.contains('MEETING')) {
      return 'meeting';
    }
    if (t.contains('NGHI_LE') || t.contains('HOLIDAY')) {
      return 'holiday';
    }
    if (t.contains('TUYEN_DUNG') || t.contains('RECRUIT')) {
      return 'hr';
    }
    if (t.contains('DANH_GIA') || t.contains('REVIEW') || t.contains('PERFORMANCE')) {
      return 'review';
    }
    
    return 'general';
  }

  /// Create from Notification API response
  factory UnifiedNotification.fromNotification(Map<String, dynamic> json) {
    final type = json['type'] ?? 'GENERAL';
    return UnifiedNotification(
      id: json['notificationId'] ?? json['id'] ?? 0,
      title: json['title'] ?? '',
      content: json['content'] ?? '',
      type: type,
      category: _getCategory(type),
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt']) 
          : DateTime.now(),
      isRead: json['isRead'] ?? json['read'] ?? false,
      link: json['link'],
      source: 'notification',
    );
  }

  /// Create from ThongBao API response
  factory UnifiedNotification.fromThongBao(Map<String, dynamic> json) {
    final type = json['loai'] ?? 'GENERAL';
    return UnifiedNotification(
      id: json['id'] ?? 0,
      title: json['tieuDe'] ?? '',
      content: json['noiDung'] ?? '',
      type: type,
      category: _getCategory(type),
      createdAt: json['ngayTao'] != null 
          ? DateTime.parse(json['ngayTao']) 
          : DateTime.now(),
      isRead: (json['trangThai'] ?? 'CHUA_DOC') == 'DA_DOC',
      link: json['link'],
      source: 'thong_bao',
    );
  }
}
