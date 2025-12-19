import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../config/app_constants.dart';

class AuthService {
  Future<String?> login(String username, String password) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': username,
          'password': password,
        }),
      ).timeout(const Duration(seconds: 10));

      debugPrint('Login Response: ${response.statusCode} - ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final accessToken = data['accessToken'];
        final refreshToken = data['refreshToken'];
        final user = data['user'];
        
        if (accessToken != null) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('jwt_token', accessToken);
          if (refreshToken != null) await prefs.setString('refresh_token', refreshToken);
          
          if (user != null) {
            await prefs.setInt('userId', user['userId']);
            await prefs.setString('username', user['username']);
            await prefs.setString('role', user['role']);
            if (user['email'] != null) await prefs.setString('email', user['email']);
          }
          return null; // Success
        }
        return 'Invalid response from server';
      } else if (response.statusCode == 401) {
        return 'Sai tên đăng nhập hoặc mật khẩu';
      } else {
        return 'Lỗi server: ${response.statusCode}';
      }
    } catch (e) {
      debugPrint('Login Error: $e');
      return 'Lỗi kết nối: $e';
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }

  Future<String?> getRole() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('role');
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('jwt_token');
  }

  Future<String?> getAccessToken() async {
    return getToken();
  }

  Future<String?> getUserId() async {
    final prefs = await SharedPreferences.getInstance();
    final userId = prefs.getInt('userId');
    return userId?.toString();
  }
}
