import 'package:flutter/foundation.dart';
import '../../config/app_constants.dart';
import '../models/thong_bao_model.dart';
import 'api_service.dart';

class ThongBaoService {
  final ApiService _apiService = ApiService();

  // Get my notifications
  // Backend: GET /api/thong-bao?page=0&size=10&sort=ngayTao,desc
  Future<List<ThongBaoModel>> getMyThongBao({int page = 0, int size = 10}) async {
    try {
      final response = await _apiService.get('/thong-bao/page?page=$page&size=$size&sortBy=ngayTao&sortDir=desc');
      
      // Backend returns Page<ThongBaoDTO>
      if (response is Map<String, dynamic> && response.containsKey('content')) {
        final content = response['content'] as List;
        return content.map((e) => ThongBaoModel.fromJson(e)).toList();
      } else if (response is List) {
         return response.map((e) => ThongBaoModel.fromJson(e)).toList();
      }
    } catch (e) {
      debugPrint('Error getting thong bao: $e');
    }
    return [];
  }

  // Get unread count
  Future<int> getUnreadCount() async {
    try {
      final response = await _apiService.get('/thong-bao/unread-count');
      if (response is Map<String, dynamic> && response.containsKey('unreadCount')) {
        return response['unreadCount'] as int;
      }
    } catch (e) {
      debugPrint('Error getting thong bao unread count: $e');
    }
    return 0;
  }

  // Mark as read
  Future<bool> markAsRead(int id) async {
    try {
      await _apiService.put('/thong-bao/$id/read', {});
      return true;
    } catch (e) {
      return false;
    }
  }

  // Mark ALL as read
  Future<bool> markAllAsRead() async {
    try {
      await _apiService.put('/thong-bao/mark-all-read', {});
      return true;
    } catch (e) {
      return false;
    }
  }
}
