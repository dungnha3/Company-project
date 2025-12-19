class User {
  final int userId;
  final String username;
  final String fullName; // Added
  final String email;
  final String phoneNumber;
  final String? avatarUrl;
  final String role;
  final bool isActive;
  final bool isOnline; // New field from DTO
  final DateTime? lastSeen; // New field from DTO
  final DateTime? createdAt;
  final DateTime? lastLogin;

  User({
    required this.userId,
    required this.username,
    String? fullName,
    required this.email,
    required this.phoneNumber,
    this.avatarUrl,
    required this.role,
    this.isActive = true,
    this.isOnline = false,
    this.lastSeen,
    this.createdAt,
    this.lastLogin,
  }) : fullName = fullName ?? username; // Fallback to username

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      userId: json['userId'],
      username: json['username'],
      fullName: json['fullName'],
      email: json['email'] ?? '',
      phoneNumber: json['phoneNumber'] ?? '',
      avatarUrl: json['avatarUrl'],
      role: json['role'] ?? 'EMPLOYEE',
      isActive: json['isActive'] ?? true,
      isOnline: json['isOnline'] ?? false,
      lastSeen: json['lastSeen'] != null ? DateTime.parse(json['lastSeen']) : null,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : null,
      lastLogin: json['lastLogin'] != null ? DateTime.parse(json['lastLogin']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'username': username,
      'email': email,
      'fullName': fullName,
      'phoneNumber': phoneNumber,
      'avatarUrl': avatarUrl,
      'role': role,
      'isActive': isActive,
      'isOnline': isOnline,
      'lastSeen': lastSeen?.toIso8601String(),
      'createdAt': createdAt?.toIso8601String(),
      'lastLogin': lastLogin?.toIso8601String(),
    };
  }
}
