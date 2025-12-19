import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../config/app_constants.dart';

class ApiService {
  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<dynamic> get(String endpoint, {bool useApiBase = true}) async {
    final headers = await _getHeaders();
    final baseUrl = useApiBase ? AppConstants.baseUrl : AppConstants.rootUrl;
    final response = await http.get(
      Uri.parse('$baseUrl$endpoint'),
      headers: headers,
    );
    return _handleResponse(response);
  }

  Future<dynamic> post(String endpoint, dynamic body, {bool useApiBase = true}) async {
    final headers = await _getHeaders();
    final baseUrl = useApiBase ? AppConstants.baseUrl : AppConstants.rootUrl;
    final response = await http.post(
      Uri.parse('$baseUrl$endpoint'),
      headers: headers,
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  Future<dynamic> put(String endpoint, dynamic body, {bool useApiBase = true}) async {
    final headers = await _getHeaders();
    final baseUrl = useApiBase ? AppConstants.baseUrl : AppConstants.rootUrl;
    final response = await http.put(
      Uri.parse('$baseUrl$endpoint'),
      headers: headers,
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  Future<dynamic> patch(String endpoint, dynamic body, {bool useApiBase = true}) async {
    final headers = await _getHeaders();
    final baseUrl = useApiBase ? AppConstants.baseUrl : AppConstants.rootUrl;
    final response = await http.patch(
      Uri.parse('$baseUrl$endpoint'),
      headers: headers,
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  Future<dynamic> delete(String endpoint, {bool useApiBase = true}) async {
    final headers = await _getHeaders();
    final baseUrl = useApiBase ? AppConstants.baseUrl : AppConstants.rootUrl;
    final response = await http.delete(
      Uri.parse('$baseUrl$endpoint'),
      headers: headers,
    );
    return _handleResponse(response);
  }

  dynamic _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return null;
      try {
        return jsonDecode(response.body);
      } catch (e) {
        return response.body;
      }
    } else {
      throw Exception('API Error: ${response.statusCode} - ${response.body}');
    }
  }
}
