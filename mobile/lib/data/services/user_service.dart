import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../config/app_constants.dart';
import '../models/user.dart';

class UserService {
  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('jwt_token');
  }

  // Get current user's profile
  // Backend: GET /api/profile
  Future<User?> getProfile() async {
    final token = await _getToken();
    if (token == null) return null;

    try {
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/profile'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        return User.fromJson(jsonDecode(response.body));
      }
    } catch (e) {
      debugPrint('Error getting profile: $e');
    }
    return null;
  }

  // Update user profile
  // Backend: PUT /api/profile
  Future<bool> updateProfile({
    String? email,
    String? phoneNumber,
    String? avatarUrl,
  }) async {
    final token = await _getToken();
    if (token == null) return false;

    try {
      final body = <String, dynamic>{};
      if (email != null) body['email'] = email;
      if (phoneNumber != null) body['phoneNumber'] = phoneNumber;
      if (avatarUrl != null) body['avatarUrl'] = avatarUrl;

      final response = await http.put(
        Uri.parse('${AppConstants.baseUrl}/profile'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(body),
      );

      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Error updating profile: $e');
      return false;
    }
  }

  // Change password
  // Backend: PUT /api/profile/change-password
  Future<bool> changePassword(String currentPassword, String newPassword, String confirmPassword) async {
    final token = await _getToken();
    if (token == null) return false;

    try {
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/profile/change-password'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'currentPassword': currentPassword,
          'newPassword': newPassword,
          'confirmPassword': confirmPassword,
        }),
      );

      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Error changing password: $e');
      return false;
    }
  }

  // Set online status
  // Backend: PATCH /api/profile/online
  Future<void> setOnline() async {
    final token = await _getToken();
    if (token == null) return;

    try {
      await http.patch(
        Uri.parse('${AppConstants.baseUrl}/profile/online'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
    } catch (e) {
      debugPrint('Error setting online: $e');
    }
  }

  // Set offline status
  // Backend: PATCH /api/profile/offline
  Future<void> setOffline() async {
    final token = await _getToken();
    if (token == null) return;

    try {
      await http.patch(
        Uri.parse('${AppConstants.baseUrl}/profile/offline'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
    } catch (e) {
      debugPrint('Error setting offline: $e');
    }
  }

  // Update FCM token for push notifications
  // Backend: POST /api/profile/fcm-token
  Future<void> updateFcmToken(String fcmToken) async {
    final token = await _getToken();
    if (token == null) return;

    try {
      await http.post(
        Uri.parse('${AppConstants.baseUrl}/profile/fcm-token'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'fcmToken': fcmToken}),
      );
    } catch (e) {
      debugPrint('Error updating FCM token: $e');
    }
  }
  // Search users by keyword
  // Backend: GET /api/users/search?keyword=xxx
  Future<List<User>> searchUsers(String keyword) async {
    final token = await _getToken();
    if (token == null) return [];

    try {
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/users/search?keyword=$keyword'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => User.fromJson(json)).toList();
      }
    } catch (e) {
      debugPrint('Error searching users: $e');
    }
    return [];
  }
}
