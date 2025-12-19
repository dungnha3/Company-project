class NotificationModel {
  final int notificationId;
  final String title;
  final String content;
  final String type;
  final String? link;
  final bool isRead;
  final String createdAt;

  NotificationModel({
    required this.notificationId,
    required this.title,
    required this.content,
    required this.type,
    this.link,
    required this.isRead,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    String parseDate(dynamic dateVal) {
      if (dateVal == null) return '';
      // Handle List format [2024, 12, 12, 10, 30]
      if (dateVal is List) {
        if (dateVal.isEmpty) return '';
        final y = dateVal[0];
        final M = dateVal.length > 1 ? dateVal[1].toString().padLeft(2, '0') : '01';
        final d = dateVal.length > 2 ? dateVal[2].toString().padLeft(2, '0') : '01';
        final h = dateVal.length > 3 ? dateVal[3].toString().padLeft(2, '0') : '00';
        final m = dateVal.length > 4 ? dateVal[4].toString().padLeft(2, '0') : '00';
        // Optional seconds
        final s = dateVal.length > 5 ? dateVal[5].toString().padLeft(2, '0') : '00';
        return '$y-$M-${d}T$h:$m:$s';
      }
      
      String raw = dateVal.toString();
      // Fix format "yyyy-MM-dd HH:mm:ss" to "yyyy-MM-ddTHH:mm:ss"
      if (raw.contains(' ') && !raw.contains('T')) {
        raw = raw.replaceAll(' ', 'T');
      }
      return raw;
    }

    return NotificationModel(
      notificationId: json['notificationId'] ?? json['id'] ?? 0,
      title: json['title'] ?? '',
      content: json['content'] ?? '',
      type: json['type'] ?? 'GENERAL',
      link: json['link'],
      isRead: json['isRead'] ?? false,
      createdAt: parseDate(json['createdAt']),
    );
  }
}
