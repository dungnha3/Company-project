class IssueActivity {
  final int activityId;
  final int issueId;
  final String issueTitle;
  final int userId;
  final String userName;
  final String? userAvatarUrl;
  final String activityType; // 'CREATE', 'UPDATE', 'COMMENT', 'status_change', etc.
  final String? fieldName;
  final String? oldValue;
  final String? newValue;
  final String? description;
  final String createdAt;

  IssueActivity({
    required this.activityId,
    required this.issueId,
    required this.issueTitle,
    required this.userId,
    required this.userName,
    this.userAvatarUrl,
    required this.activityType,
    this.fieldName,
    this.oldValue,
    this.newValue,
    this.description,
    required this.createdAt,
  });

  factory IssueActivity.fromJson(Map<String, dynamic> json) {
    return IssueActivity(
      activityId: json['activityId'] ?? 0,
      issueId: json['issueId'] ?? 0,
      issueTitle: json['issueTitle'] ?? '',
      userId: json['userId'] ?? 0,
      userName: json['userName'] ?? 'Unknown',
      userAvatarUrl: json['userAvatarUrl'],
      activityType: json['activityType'] ?? 'UNKNOWN',
      fieldName: json['fieldName'],
      oldValue: json['oldValue'],
      newValue: json['newValue'],
      description: json['description'],
      createdAt: json['createdAt'] ?? '',
    );
  }
}
