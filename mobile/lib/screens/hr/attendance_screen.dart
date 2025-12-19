import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:intl/intl.dart';
import 'dart:async';
import '../../data/services/hr_service.dart';
import '../../data/services/auth_service.dart';
import '../../data/models/attendance.dart';
import 'attendance_history_screen.dart';
import 'attendance_statistics_screen.dart';
import '../../config/app_colors.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  final HRService _hrService = HRService();
  final AuthService _authService = AuthService();
  
  // Config giờ làm việc chuẩn
  static const int _workStartHour = 8;
  static const int _workStartMinute = 0;
  static const int _workEndHour = 17;
  static const int _workEndMinute = 0;
  
  // Company Location (HUTECH Khu E - Khu Công nghệ Cao)
  static const double _companyLat = 10.855059;
  static const double _companyLng = 106.779390;
  static const double _allowedRadius = 50000.0; // 50km để test, production nên đổi về 500
  
  String _currentTime = '';
  String _currentDate = '';
  String _currentAddress = 'Đang lấy địa chỉ...';
  bool _isLoading = false;
  bool _isCheckedIn = false;
  bool _hasCompletedWork = false;
  int? _currentAttendanceId;
  int? _nhanvienId;
  Attendance? _todayAttendance;
  Timer? _timer;
  Position? _currentPosition;
  double? _distanceToCompany;

  @override
  void initState() {
    super.initState();
    _updateTime();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) => _updateTime());
    _initializeData();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _updateTime() {
    if (!mounted) return;
    final now = DateTime.now();
    setState(() {
      _currentTime = DateFormat('HH:mm').format(now);
      _currentDate = DateFormat('EEEE, dd/MM/yyyy', 'vi').format(now);
    });
  }

  Future<void> _initializeData() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    await _getEmployeeId();
    await _getCurrentLocation();
    await _checkTodayAttendance();
    if (!mounted) return;
    setState(() => _isLoading = false);
  }

  Future<void> _getEmployeeId() async {
    try {
      final userIdStr = await _authService.getUserId();
      if (userIdStr != null) {
        final userId = int.parse(userIdStr);
        _nhanvienId = await _hrService.getEmployeeIdByUserId(userId);
      }
    } catch (e) {
      debugPrint('Error getting employee ID: $e');
    }
  }

  Future<void> _getCurrentLocation() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (!mounted) return;
      setState(() => _currentAddress = 'Vui lòng bật GPS');
      return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        if (!mounted) return;
        setState(() => _currentAddress = 'Quyền vị trí bị từ chối');
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      if (!mounted) return;
      setState(() => _currentAddress = 'Quyền vị trí bị từ chối vĩnh viễn');
      return;
    }

    try {
      Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      _currentPosition = position;

      double distance = Geolocator.distanceBetween(
        position.latitude, position.longitude,
        _companyLat, _companyLng,
      );
      
      if (!mounted) return;
      setState(() => _distanceToCompany = distance);
      
      // Show position immediately with distance, then try to get address
      if (!mounted) return;
      setState(() => _currentAddress = 'Vị trí đã xác định');
      
      // Try to get address with timeout (don't block check-in)
      try {
        List<Placemark> placemarks = await placemarkFromCoordinates(
          position.latitude, position.longitude,
        ).timeout(const Duration(seconds: 3));

        if (placemarks.isNotEmpty && mounted) {
          Placemark place = placemarks[0];
          final street = place.street ?? '';
          final subAdmin = place.subAdministrativeArea ?? '';
          final admin = place.administrativeArea ?? '';
          
          setState(() {
            final parts = [street, subAdmin, admin].where((s) => s.isNotEmpty);
            _currentAddress = parts.isNotEmpty ? parts.join(', ') : 'Vị trí đã xác định';
          });
        }
      } catch (e) {
        // Timeout or geocoding failed - already showing "Vị trí đã xác định"
        debugPrint('Geocoding error/timeout: $e');
      }
    } catch (e) {
      debugPrint('Location error: $e');
      if (!mounted) return;
      setState(() => _currentAddress = 'Không thể lấy vị trí');
    }
  }

  Future<void> _checkTodayAttendance() async {
    if (_nhanvienId == null) return;
    
    try {
      final response = await _hrService.getTodayAttendance(_nhanvienId!);
      if (!mounted) return;
      
      if (response != null) {
        final hasCheckedIn = response['checkedIn'] == true;
        final hasCheckedOut = response['checkedOut'] == true;
        final chamCongData = response;

        setState(() {
          if (hasCheckedIn && !hasCheckedOut) {
            _isCheckedIn = true;
            _hasCompletedWork = false;
            if (chamCongData != null) {
              _todayAttendance = Attendance.fromJson(chamCongData);
              _currentAttendanceId = _todayAttendance!.chamcongId;
            }
          } else if (hasCheckedIn && hasCheckedOut) {
            _isCheckedIn = false;
            _hasCompletedWork = true;
            if (chamCongData != null) {
              _todayAttendance = Attendance.fromJson(chamCongData);
            }
          } else {
            _isCheckedIn = false;
            _hasCompletedWork = false;
          }
        });
      }
    } catch (e) {
      debugPrint('Error checking attendance: $e');
    }
  }

  void _showMessage(String message, {bool isError = false}) {
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(isError ? Icons.error_outline : Icons.check_circle, color: Colors.white),
            const SizedBox(width: 10),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: isError ? Colors.red.shade600 : Colors.green.shade600,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  Future<void> _handleCheckInOut() async {
    if (_currentPosition == null) {
      _showMessage('Đang lấy vị trí GPS, vui lòng đợi...', isError: true);
      await _getCurrentLocation();
      return;
    }

    if (_hasCompletedWork) {
      _showMessage('Bạn đã hoàn thành công việc hôm nay!', isError: true);
      return;
    }

    setState(() => _isLoading = true);

    if (!_isCheckedIn && _distanceToCompany != null && _distanceToCompany! > _allowedRadius) {
      _showMessage('Bạn đang ở quá xa công ty (${_distanceToCompany!.toStringAsFixed(0)}m)', isError: true);
      setState(() => _isLoading = false);
      return;
    }

    try {
      if (_isCheckedIn) {
        if (_currentAttendanceId != null) {
          await _hrService.checkOut(
            _currentAttendanceId!,
            _currentPosition!.latitude,
            _currentPosition!.longitude,
            _currentAddress,
          );
          _showMessage('Check-out thành công! Hẹn gặp lại.');
        }
      } else {
        if (_nhanvienId == null) {
          _showMessage('Không tìm thấy thông tin nhân viên!', isError: true);
          setState(() => _isLoading = false);
          return;
        }

        await _hrService.checkIn(
          _nhanvienId!,
          _currentPosition!.latitude,
          _currentPosition!.longitude,
          _currentAddress,
        );
        _showMessage('Check-in thành công! Chúc bạn làm việc vui vẻ.');
      }
      await _checkTodayAttendance();
    } catch (e) {
      _showMessage('Có lỗi xảy ra: ${e.toString().replaceAll('Exception: ', '')}', isError: true);
    } finally {
      setState(() => _isLoading = false);
    }
  }

  String _getPunctualityStatus(String? timeStr, bool isCheckIn) {
    if (timeStr == null) return '';
    
    try {
      final parts = timeStr.split(':');
      final hour = int.parse(parts[0]);
      final minute = int.parse(parts[1]);
      
      if (isCheckIn) {
        final standardMinutes = _workStartHour * 60 + _workStartMinute;
        final actualMinutes = hour * 60 + minute;
        final diff = actualMinutes - standardMinutes;
        
        if (diff <= 0) return 'Đúng giờ';
        return 'Trễ ${diff}p';
      } else {
        final standardMinutes = _workEndHour * 60 + _workEndMinute;
        final actualMinutes = hour * 60 + minute;
        final diff = standardMinutes - actualMinutes;
        
        if (diff <= 0) return 'Đúng giờ';
        return 'Sớm ${diff}p';
      }
    } catch (e) {
      return '';
    }
  }

  Color _getPunctualityColor(String status) {
    if (status == 'Đúng giờ') return Colors.green;
    if (status.contains('Trễ') || status.contains('Sớm')) return Colors.orange;
    return Colors.grey;
  }

  String _getStatusText() {
    if (_hasCompletedWork) return 'Đã hoàn thành';
    if (_isCheckedIn) return 'Đang làm việc';
    return 'Chưa vào ca';
  }

  void _openHistory() {
    if (_nhanvienId == null) {
      _showMessage('Vui lòng đợi tải thông tin nhân viên', isError: true);
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AttendanceHistoryScreen(nhanvienId: _nhanvienId!),
      ),
    );
  }

  void _openStatistics() {
    if (_nhanvienId == null) {
      _showMessage('Vui lòng đợi tải thông tin nhân viên', isError: true);
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AttendanceStatisticsScreen(nhanvienId: _nhanvienId!),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      appBar: AppBar(
        title: const Text('Chấm công GPS'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: Colors.white),
            onSelected: (value) {
              switch (value) {
                case 'history':
                  _openHistory();
                  break;
                case 'statistics':
                  _openStatistics();
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'history',
                child: Row(
                  children: [
                    Icon(Icons.history, color: Colors.blue),
                    SizedBox(width: 12),
                    Text('Lịch sử chấm công'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'statistics',
                child: Row(
                  children: [
                    Icon(Icons.bar_chart, color: Colors.green),
                    SizedBox(width: 12),
                    Text('Thống kê tháng'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _initializeData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildTodayCard(theme),
              const SizedBox(height: 20),
              _buildActionButton(theme),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTodayCard(ThemeData theme) {
    final checkInStatus = _getPunctualityStatus(_todayAttendance?.gioVao, true);
    final checkOutStatus = _getPunctualityStatus(_todayAttendance?.gioRa, false);
    
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary, AppColors.primaryLight],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withAlpha(80),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          // Time & Status
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _currentTime,
                    style: const TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  Text(_currentDate, style: const TextStyle(color: Colors.white70, fontSize: 14)),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withAlpha(50),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  _getStatusText(),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 24),
          const Divider(color: Colors.white30),
          const SizedBox(height: 20),
          
          // Giờ vào/ra hôm nay
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildTimeColumn('Giờ vào', _todayAttendance?.gioVao?.substring(0, 5) ?? '--:--', checkInStatus),
              Container(width: 1, height: 60, color: Colors.white30),
              _buildTimeColumn('Giờ ra', _todayAttendance?.gioRa?.substring(0, 5) ?? '--:--', checkOutStatus),
            ],
          ),
          
          const SizedBox(height: 20),
          
          // Location
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white.withAlpha(30),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.location_on, color: Colors.white, size: 22),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _currentAddress,
                        style: const TextStyle(color: Colors.white, fontSize: 14),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (_distanceToCompany != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Cách công ty: ${_distanceToCompany! > 1000 ? '${(_distanceToCompany! / 1000).toStringAsFixed(1)} km' : '${_distanceToCompany!.toStringAsFixed(0)} m'}',
                          style: TextStyle(
                            color: _distanceToCompany! > _allowedRadius ? Colors.orange.shade200 : Colors.green.shade200,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.refresh, color: Colors.white70),
                  onPressed: _getCurrentLocation,
                  tooltip: 'Cập nhật vị trí',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeColumn(String label, String time, String status) {
    final statusColor = _getPunctualityColor(status);
    return Column(
      children: [
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
        const SizedBox(height: 6),
        Text(time, style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
        if (status.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 6),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
            decoration: BoxDecoration(
              color: statusColor.withAlpha(60),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              status,
              style: TextStyle(
                color: statusColor == Colors.green ? Colors.white : Colors.orange.shade100,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildActionButton(ThemeData theme) {
    Color buttonColor;
    String buttonText;
    IconData buttonIcon;
    bool isDisabled = _isLoading || _hasCompletedWork;
    
    if (_hasCompletedWork) {
      buttonColor = Colors.grey;
      buttonText = 'ĐÃ HOÀN THÀNH HÔM NAY';
      buttonIcon = Icons.check_circle;
    } else if (_isCheckedIn) {
      buttonColor = AppColors.error;
      buttonText = 'CHECK-OUT';
      buttonIcon = Icons.logout;
    } else {
      buttonColor = AppColors.accent;
      buttonText = 'CHECK-IN';
      buttonIcon = Icons.login;
    }

    return SizedBox(
      width: double.infinity,
      height: 60,
      child: ElevatedButton(
        onPressed: isDisabled ? null : _handleCheckInOut,
        style: ElevatedButton.styleFrom(
          backgroundColor: buttonColor,
          disabledBackgroundColor: Colors.grey.shade400,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: isDisabled ? 0 : 6,
        ),
        child: _isLoading
            ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(buttonIcon, color: Colors.white, size: 26),
                  const SizedBox(width: 12),
                  Text(buttonText, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                ],
              ),
      ),
    );
  }
}
