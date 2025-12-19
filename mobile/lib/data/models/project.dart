class Project {
  final int projectId;
  final String name;
  final String keyProject;
  final String description;
  final String status;         // ACTIVE, ON_HOLD, OVERDUE, COMPLETED, CANCELLED
  final String? startDate;
  final String? endDate;
  final double? budget;
  final String? createdByName;
  final String? phongBanName;
  final bool isActive;
  final String? createdAt;
  final String? updatedAt;
  final int? memberCount;
  final int? issueCount;

  Project({
    required this.projectId,
    required this.name,
    required this.keyProject,
    required this.description,
    required this.status,
    this.startDate,
    this.endDate,
    this.budget,
    this.createdByName,
    this.phongBanName,
    this.isActive = true,
    this.createdAt,
    this.updatedAt,
    this.memberCount,
    this.issueCount,
  });

  factory Project.fromJson(Map<String, dynamic> json) {
    return Project(
      projectId: json['projectId'] ?? 0,
      name: json['name'] ?? '',
      keyProject: json['keyProject'] ?? '',
      description: json['description'] ?? '',
      status: json['status'] ?? 'ACTIVE',
      startDate: json['startDate'],
      endDate: json['endDate'],
      budget: json['budget']?.toDouble(),
      createdByName: json['createdBy']?['fullName'] ?? json['createdBy']?['username'],
      phongBanName: json['phongBan']?['tenPhongBan'],
      isActive: json['isActive'] ?? true,
      createdAt: json['createdAt'],
      updatedAt: json['updatedAt'],
      memberCount: json['members']?.length ?? json['memberCount'],
      issueCount: json['issues']?.length ?? json['issueCount'],
    );
  }

  // Helper getters
  String get statusDisplay {
    switch (status) {
      case 'ACTIVE': return 'Đang hoạt động';
      case 'ON_HOLD': return 'Tạm dừng';
      case 'OVERDUE': return 'Quá hạn';
      case 'COMPLETED': return 'Hoàn thành';
      case 'CANCELLED': return 'Đã hủy';
      default: return status;
    }
  }

  bool get isCompleted => status == 'COMPLETED';
  bool get isOverdue => status == 'OVERDUE';
}
