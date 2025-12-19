import 'api_service.dart';
import '../models/attendance.dart';
import '../models/payroll.dart';
import '../models/leave_request.dart';

class HRService {
  final ApiService _apiService = ApiService();

  // Attendance
  Future<Map<String, dynamic>> checkIn(int nhanvienId, double latitude, double longitude, String address) async {
    // Endpoint: /api/cham-cong/gps (Default useApiBase=true)
    final response = await _apiService.post('/cham-cong/gps', {
      'nhanvienId': nhanvienId,
      'latitude': latitude,
      'longitude': longitude,
      'diaChiCheckin': address,
    });
    return response;
  }

  Future<void> checkOut(int attendanceId, double lat, double lng, String address) async {
    // Endpoint: /api/cham-cong/{id}/check-out
    await _apiService.patch('/cham-cong/$attendanceId/check-out', {});
  }

  Future<Map<String, dynamic>?> getTodayAttendance(int nhanvienId) async {
    // Endpoint: /api/cham-cong/status/{nhanvienId}
    try {
      final response = await _apiService.get('/cham-cong/status/$nhanvienId');
      return response;
    } catch (e) {
      return null;
    }
  }

  Future<List<Attendance>> getMonthlyAttendance(int nhanvienId, int month, int year) async {
    // Endpoint: /api/cham-cong/nhan-vien/{id}/month
    final response = await _apiService.get('/cham-cong/nhan-vien/$nhanvienId/month?year=$year&month=$month');
    if (response is List) {
      return response.map((e) => Attendance.fromJson(e)).toList();
    }
    return [];
  }

  // Statistics - số ngày công, đi trễ, về sớm
  Future<Map<String, dynamic>> getStatistics(int nhanvienId, int month, int year) async {
    // Endpoint: /api/cham-cong/nhan-vien/{id}/statistics
    try {
      final response = await _apiService.get('/cham-cong/nhan-vien/$nhanvienId/statistics?year=$year&month=$month');
      return response ?? {'workingDays': 0, 'lateDays': 0, 'earlyLeaveDays': 0};
    } catch (e) {
      return {'workingDays': 0, 'lateDays': 0, 'earlyLeaveDays': 0};
    }
  }

  // Tổng giờ làm việc trong tháng
  Future<double> getTotalHours(int nhanvienId, int month, int year) async {
    // Endpoint: /api/cham-cong/nhan-vien/{id}/total-hours
    try {
      final response = await _apiService.get('/cham-cong/nhan-vien/$nhanvienId/total-hours?year=$year&month=$month');
      if (response is num) {
        return response.toDouble();
      }
      return 0.0;
    } catch (e) {
      return 0.0;
    }
  }

  // Payroll
  Future<Payroll?> getPayroll(int nhanvienId, int month, int year) async {
    // Backend: /api/bang-luong/nhan-vien/{id}/period?thang=X&nam=Y
    try {
      final response = await _apiService.get('/bang-luong/nhan-vien/$nhanvienId/period?thang=$month&nam=$year');
      if (response != null && response is Map<String, dynamic>) {
        return Payroll.fromJson(response);
      }
    } catch (e) {
      // Return null if no payroll data
    }
    return null;
  }

  // Payroll History - get all payroll records for an employee
  Future<List<Payroll>> getPayrollHistory(int nhanvienId) async {
    // Backend: /api/bang-luong/nhan-vien/{id}
    try {
      final response = await _apiService.get('/bang-luong/nhan-vien/$nhanvienId');
      if (response is List) {
        return response.map((e) => Payroll.fromJson(e)).toList();
      }
    } catch (e) {
      // Return empty list if error
    }
    return [];
  }

  // Leave Requests
  Future<void> createLeaveRequest(Map<String, dynamic> data) async {
    // Backend: /api/nghi-phep
    await _apiService.post('/nghi-phep', data);
  }

  Future<List<LeaveRequest>> getMyLeaveRequests(int nhanvienId) async {
    // Backend: /api/nghi-phep/nhan-vien/{id}
    final response = await _apiService.get('/nghi-phep/nhan-vien/$nhanvienId');
    if (response is List) {
      return response.map((e) => LeaveRequest.fromJson(e)).toList();
    }
    return [];
  }

  Future<int?> getEmployeeIdByUserId(int userId) async {
    try {
      final response = await _apiService.get('/nhan-vien/user/$userId');
      if (response != null && response['nhanvienId'] != null) {
        return response['nhanvienId'];
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}
