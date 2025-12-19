class IssueStatus {
  final int statusId;
  final String name;

  IssueStatus({required this.statusId, required this.name});

  factory IssueStatus.fromJson(Map<String, dynamic> json) {
    return IssueStatus(
      statusId: json['statusId'] ?? 0,
      name: json['name'] ?? 'Unknown',
    );
  }
}

class Comment {
  final int commentId;
  final String content;
  final String authorName;
  final String? authorAvatarUrl;
  final String createdAt;

  Comment({
    required this.commentId,
    required this.content,
    required this.authorName,
    this.authorAvatarUrl,
    required this.createdAt,
  });

  factory Comment.fromJson(Map<String, dynamic> json) {
    String authorName = 'Unknown';
    String? avatarUrl;
    if (json['user'] != null) {
      authorName = json['user']['username'] ?? 'Unknown';
      avatarUrl = json['user']['avatarUrl'];
    } else if (json['author'] != null) {
      authorName = json['author']['username'] ?? 'Unknown';
      avatarUrl = json['author']['avatarUrl'];
    } else if (json['authorName'] != null) {
      authorName = json['authorName'];
    }

    return Comment(
      commentId: json['commentId'] ?? json['id'] ?? 0,
      content: json['content'] ?? '',
      authorName: authorName,
      authorAvatarUrl: avatarUrl,
      createdAt: json['createdAt'] ?? '',
    );
  }
}

class Issue {
  final int issueId;
  final String title;
  final String issueKey;
  final String description;
  final IssueStatus status;
  final String priority;
  final String? projectName;
  final String? dueDate;
  final String? assigneeName;
  final String? assigneeAvatarUrl;
  final String? reporterName;
  final double? estimatedHours;
  final double? actualHours;
  final bool isOverdue;
  final List<Comment> comments;
  final int? projectId;
  final int? sprintId;

  Issue({
    required this.issueId,
    required this.title,
    required this.issueKey,
    required this.description,
    required this.status,
    required this.priority,
    this.projectName,
    this.dueDate,
    this.assigneeName,
    this.assigneeAvatarUrl,
    this.reporterName,
    this.estimatedHours,
    this.actualHours,
    this.isOverdue = false,
    this.comments = const [],
    this.projectId,
    this.sprintId,
  });

  factory Issue.fromJson(Map<String, dynamic> json) {
    // Parse status - can be object or direct fields (statusName, statusId, statusColor)
    IssueStatus status;
    if (json['status'] != null && json['status'] is Map) {
      status = IssueStatus.fromJson(json['status']);
    } else if (json['issueStatus'] != null && json['issueStatus'] is Map) {
      status = IssueStatus.fromJson(json['issueStatus']);
    } else if (json['statusName'] != null) {
      // API returns direct fields: statusName, statusId, statusColor
      status = IssueStatus(
        statusId: json['statusId'] ?? 0,
        name: json['statusName'] ?? 'Unknown',
      );
    } else {
      // Fallback
      String statusName = json['issueStatus'] ?? json['status'] ?? 'Unknown';
      status = IssueStatus(statusId: 0, name: statusName.toString());
    }

    // Parse comments
    List<Comment> commentsList = [];
    if (json['comments'] != null && json['comments'] is List) {
      commentsList = (json['comments'] as List).map((e) => Comment.fromJson(e)).toList();
    }

    // Parse assignee
    String? assigneeName;
    String? assigneeAvatarUrl;
    if (json['assignee'] != null) {
      assigneeName = json['assignee']['username'];
      assigneeAvatarUrl = json['assignee']['avatarUrl'];
    }

    // Parse reporter
    String? reporterName;
    if (json['reporterName'] != null) {
      reporterName = json['reporterName'];
    } else if (json['reporter'] != null) {
      reporterName = json['reporter']['username'];
    }

    return Issue(
      issueId: json['issueId'] ?? 0,
      title: json['title'] ?? '',
      issueKey: json['issueKey'] ?? '',
      description: json['description'] ?? '',
      status: status,
      priority: json['priority'] ?? 'MEDIUM',
      projectName: json['projectName'] ?? json['project']?['name'],
      dueDate: json['dueDate'],
      assigneeName: assigneeName,
      assigneeAvatarUrl: assigneeAvatarUrl,
      reporterName: reporterName,
      estimatedHours: json['estimatedHours']?.toDouble(),
      actualHours: json['actualHours']?.toDouble(),
      isOverdue: json['isOverdue'] ?? false,
      comments: commentsList,
      projectId: json['project']?['projectId'] ?? json['projectId'],
      sprintId: json['sprint']?['sprintId'] ?? json['sprintId'],
    );
  }

  // Helper to get status name for UI
  String get statusName => status.name;

  Issue copyWith({
    int? issueId,
    String? title,
    String? issueKey,
    String? description,
    IssueStatus? status,
    String? priority,
    String? projectName,
    String? dueDate,
    String? assigneeName,
    String? assigneeAvatarUrl,
    String? reporterName,
    double? estimatedHours,
    double? actualHours,
    bool? isOverdue,
    List<Comment>? comments,
    int? projectId,
    int? sprintId,
  }) {
    return Issue(
      issueId: issueId ?? this.issueId,
      title: title ?? this.title,
      issueKey: issueKey ?? this.issueKey,
      description: description ?? this.description,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      projectName: projectName ?? this.projectName,
      dueDate: dueDate ?? this.dueDate,
      assigneeName: assigneeName ?? this.assigneeName,
      assigneeAvatarUrl: assigneeAvatarUrl ?? this.assigneeAvatarUrl,
      reporterName: reporterName ?? this.reporterName,
      estimatedHours: estimatedHours ?? this.estimatedHours,
      actualHours: actualHours ?? this.actualHours,
      isOverdue: isOverdue ?? this.isOverdue,
      comments: comments ?? this.comments,
      projectId: projectId ?? this.projectId,
      sprintId: sprintId ?? this.sprintId,
    );
  }
}
