import 'package:flutter/material.dart';
import 'package:mobile/data/services/auth_service.dart';
import 'package:mobile/data/services/user_service.dart';
import 'package:mobile/data/services/project_service.dart';
import 'package:mobile/data/services/notification_service.dart';
import 'package:mobile/data/services/hr_service.dart';
import 'package:mobile/data/models/user.dart';
import 'package:mobile/config/app_router.dart';
import 'package:mobile/config/app_colors.dart';
import 'package:mobile/services/firebase_notification_service.dart';
import 'package:mobile/utils/app_snackbar.dart';
import 'package:intl/intl.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'dart:async';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  final AuthService _authService = AuthService();
  final UserService _userService = UserService();
  final ProjectService _projectService = ProjectService();
  final NotificationService _notificationService = NotificationService();
  final HRService _hrService = HRService();
  
  int _selectedIndex = 0;
  int _unreadNotifications = 0;
  int _unreadChat = 0;
  User? _user;
  
  // Dashboard data
  int _leaveDaysRemaining = 12;
  int _lateDays = 0;
  double _totalHours = 0;
  int _workingDays = 0;
  int _taskCount = 0;
  
  // Attendance
  bool _hasCheckedIn = false;
  bool _hasCheckedOut = false;
  String? _checkInTime;
  String? _checkOutTime;
  int? _attendanceId;
  int? _employeeId;
  bool _isCheckingIn = false;
  
  // Time
  String _currentTime = '';
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadData();
    _startTimer();
    FirebaseNotificationService.onNotificationReceived = _fetchUnreadCount;
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    FirebaseNotificationService.onNotificationReceived = null;
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    _updateTime();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _updateTime());
  }

  void _updateTime() {
    if (mounted) {
      setState(() {
        _currentTime = DateFormat('HH:mm:ss').format(DateTime.now());
      });
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _loadData();
    }
  }

  Future<void> _loadData() async {
    await Future.wait([
      _loadUserInfo(),
      _fetchUnreadCount(),
      _fetchDashboardData(),
    ]);
  }

  Future<void> _loadUserInfo() async {
    final user = await _userService.getProfile();
    if (mounted && user != null) {
      setState(() => _user = user);
      // Get employee ID
      final empId = await _hrService.getEmployeeIdByUserId(user.userId);
      if (mounted && empId != null) {
        setState(() => _employeeId = empId);
        await _fetchAttendanceStatus();
        await _fetchAttendanceStats();
      }
    }
  }

  Future<void> _fetchUnreadCount() async {
    try {
      final count = await _notificationService.getUnreadCount();
      if (mounted) {
        setState(() => _unreadNotifications = count);
      }
    } catch (e) {}
  }

  Future<void> _fetchDashboardData() async {
    try {
      final tasks = await _projectService.getMyTasks();
      if (mounted) {
        final activeTasks = tasks.where((t) {
          final s = t.statusName.toLowerCase();
          return !s.contains('done') && !s.contains('complete');
        }).toList();
        setState(() => _taskCount = activeTasks.length);
      }
    } catch (e) {}
  }

  Future<void> _fetchAttendanceStatus() async {
    if (_employeeId == null) return;
    try {
      final response = await _hrService.getTodayAttendance(_employeeId!);
      if (mounted && response != null) {
        setState(() {
          _hasCheckedIn = response['checkedIn'] == true;
          _hasCheckedOut = response['checkedOut'] == true;
          if (_hasCheckedIn) {
            final gioVao = response['gioVao']?.toString();
            final gioRa = response['gioRa']?.toString();
            _checkInTime = gioVao != null && gioVao.length >= 5 ? gioVao.substring(0, 5) : null;
            _checkOutTime = gioRa != null && gioRa.length >= 5 ? gioRa.substring(0, 5) : null;
            _attendanceId = response['chamcongId'];
          }
        });
      }
    } catch (e) {}
  }

  Future<void> _fetchAttendanceStats() async {
    if (_employeeId == null) return;
    try {
      final now = DateTime.now();
      // Use getStatistics API
      final stats = await _hrService.getStatistics(_employeeId!, now.month, now.year);
      final hours = await _hrService.getTotalHours(_employeeId!, now.month, now.year);
      if (mounted) {
        setState(() {
          _lateDays = stats['lateDays'] ?? 0;
          _totalHours = hours;
          _workingDays = stats['workingDays'] ?? 0;
        });
      }
    } catch (e) {}
  }

  void _onItemTapped(int index) {
    if (index == _selectedIndex && index == 0) return;
    
    switch (index) {
      case 0:
        setState(() => _selectedIndex = 0);
        break;
      case 1: // Công việc
        Navigator.pushNamed(context, AppRouter.attendance);
        break;
      case 2: // Chat
        Navigator.pushNamed(context, AppRouter.chatList);
        break;
      case 3: // Notifications
        Navigator.pushNamed(context, AppRouter.notifications).then((_) => _fetchUnreadCount());
        break;
      case 4: // Profile
        Navigator.pushNamed(context, AppRouter.profile);
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadData,
          color: AppColors.primary,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
              children: [
                _buildHeader(),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _buildStatsRow(),
                      const SizedBox(height: 16),
                      _buildAttendanceCard(),
                      const SizedBox(height: 16),
                      _buildQuickActions(),
                      const SizedBox(height: 16),
                      _buildTaskSummary(),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildHeader() {
    final displayName = _user?.fullName ?? _user?.username ?? 'Nhân viên';
    
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary, AppColors.primaryLight],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(24),
          bottomRight: Radius.circular(24),
        ),
      ),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white.withOpacity(0.2),
              border: Border.all(color: Colors.white.withOpacity(0.5), width: 2),
            ),
            child: ClipOval(
              child: _user?.avatarUrl != null
                  ? Image.network(
                      _user!.avatarUrl!, 
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return const Icon(Icons.person, color: Colors.white, size: 28);
                      },
                    )
                  : const Icon(Icons.person, color: Colors.white, size: 28),
            ),
          ),
          const SizedBox(width: 14),
          
          // Greeting
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Xin chào,',
                  style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 14),
                ),
                Text(
                  displayName,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          
          // Notification bell
          Stack(
            children: [
              Container(
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: IconButton(
                  icon: const Icon(Icons.notifications_outlined, color: Colors.white),
                  onPressed: () {
                    Navigator.pushNamed(context, AppRouter.notifications).then((_) => _fetchUnreadCount());
                  },
                ),
              ),
              if (_unreadNotifications > 0)
                Positioned(
                  right: 4,
                  top: 4,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      _unreadNotifications > 9 ? '9+' : '$_unreadNotifications',
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatsRow() {
    return Row(
      children: [
        _buildStatCard('$_leaveDaysRemaining', 'Ngày phép', Icons.calendar_today, const Color(0xFF3B82F6)),
        const SizedBox(width: 12),
        _buildStatCard('$_lateDays', 'Đi muộn', Icons.access_time, const Color(0xFFF59E0B)),
        const SizedBox(width: 12),
        _buildStatCard('${_totalHours.toInt()}h', 'Giờ làm', Icons.timer_outlined, const Color(0xFF8B5CF6)),
      ],
    );
  }

  Widget _buildStatCard(String value, String label, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(height: 12),
            Text(
              value,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAttendanceCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Title
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.access_time_filled, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              const Text(
                'Chấm công hôm nay',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const Spacer(),
              Text(
                DateFormat('dd/MM/yyyy').format(DateTime.now()),
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
            ],
          ),
          
          const SizedBox(height: 20),
          
          // Current time
          Text(
            _currentTime,
            style: TextStyle(
              fontSize: 42,
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
              letterSpacing: 2,
            ),
          ),
          
          const SizedBox(height: 20),
          
          // Check in/out times
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildTimeColumn('Giờ vào', _checkInTime ?? '--:--', AppColors.success),
              Container(width: 1, height: 40, color: Colors.grey.shade200),
              _buildTimeColumn('Giờ ra', _checkOutTime ?? '--:--', AppColors.error),
            ],
          ),
          
          const SizedBox(height: 20),
          
          // Check in/out button
          _buildCheckButton(),
        ],
      ),
    );
  }

  Widget _buildTimeColumn(String label, String time, Color color) {
    return Column(
      children: [
        Text(label, style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        const SizedBox(height: 6),
        Text(
          time,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: time == '--:--' ? AppColors.textHint : color,
          ),
        ),
      ],
    );
  }

  Widget _buildCheckButton() {
    String buttonText;
    List<Color> gradientColors;
    bool isDisabled = false;
    
    if (_hasCheckedOut) {
      buttonText = 'ĐÃ HOÀN THÀNH';
      gradientColors = [Colors.grey, Colors.grey.shade600];
      isDisabled = true;
    } else if (_hasCheckedIn) {
      buttonText = 'CHECK-OUT';
      gradientColors = [const Color(0xFFEF4444), const Color(0xFFDC2626)];
    } else {
      buttonText = 'CHECK-IN';
      gradientColors = [const Color(0xFFFF9500), const Color(0xFFFF6B00)];
    }

    return SizedBox(
      width: double.infinity,
      height: 54,
      child: ElevatedButton(
        onPressed: isDisabled || _isCheckingIn ? null : () => _handleCheckInOut(),
        style: ElevatedButton.styleFrom(
          padding: EdgeInsets.zero,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          elevation: isDisabled ? 0 : 4,
        ),
        child: Ink(
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: gradientColors),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Container(
            alignment: Alignment.center,
            child: _isCheckingIn
                ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        _hasCheckedOut ? Icons.check_circle : (_hasCheckedIn ? Icons.logout : Icons.login),
                        color: Colors.white,
                      ),
                      const SizedBox(width: 10),
                      Text(
                        buttonText,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }

  Future<void> _handleCheckInOut() async {
    if (_employeeId == null) {
      AppSnackbar.error(context, 'Không tìm thấy thông tin nhân viên');
      return;
    }
    
    setState(() => _isCheckingIn = true);
    
    try {
      // Get current GPS position
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (mounted) AppSnackbar.error(context, 'Cần quyền truy cập vị trí để chấm công');
          return;
        }
      }
      
      if (permission == LocationPermission.deniedForever) {
        if (mounted) AppSnackbar.error(context, 'Vui lòng cấp quyền vị trí trong cài đặt');
        return;
      }
      
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      
      // Get address from coordinates
      String address = 'Mobile app';
      try {
        final placemarks = await placemarkFromCoordinates(
          position.latitude, 
          position.longitude,
        );
        if (placemarks.isNotEmpty) {
          final p = placemarks.first;
          address = '${p.street ?? ''}, ${p.subAdministrativeArea ?? ''}, ${p.administrativeArea ?? ''}';
        }
      } catch (_) {}
      
      if (_hasCheckedIn && _attendanceId != null) {
        await _hrService.checkOut(_attendanceId!, position.latitude, position.longitude, address);
        if (mounted) AppSnackbar.success(context, 'Check-out thành công!');
      } else {
        await _hrService.checkIn(_employeeId!, position.latitude, position.longitude, address);
        if (mounted) AppSnackbar.success(context, 'Check-in thành công!');
      }
      await _fetchAttendanceStatus();
    } catch (e) {
      if (mounted) AppSnackbar.error(context, e.toString());
    } finally {
      if (mounted) setState(() => _isCheckingIn = false);
    }
  }

  Widget _buildQuickActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '⚡ Truy cập nhanh',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            _buildQuickAction('Chấm công', Icons.access_time, const Color(0xFF3B82F6), () {
              Navigator.pushNamed(context, AppRouter.attendance);
            }),
            const SizedBox(width: 12),
            _buildQuickAction('Nghỉ phép', Icons.event_available, const Color(0xFF10B981), () {
              Navigator.pushNamed(context, AppRouter.leaveRequest);
            }),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            _buildQuickAction('Tài liệu', Icons.folder_copy, const Color(0xFFFF6B00), () {
              Navigator.pushNamed(context, AppRouter.myFiles);
            }),
            const SizedBox(width: 12),
            _buildQuickAction('Dự án', Icons.folder_special, const Color(0xFF8B5CF6), () {
              Navigator.pushNamed(context, AppRouter.projectList);
            }),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            _buildQuickAction('Phiếu lương', Icons.payments, const Color(0xFFF59E0B), () {
              Navigator.pushNamed(context, AppRouter.payroll);
            }),
          ],
        ),
      ],
    );
  }

  Widget _buildQuickAction(String label, IconData icon, Color color, VoidCallback onTap) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                ),
              ),
              Icon(Icons.chevron_right, color: AppColors.textHint, size: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTaskSummary() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: InkWell(
        onTap: () => Navigator.pushNamed(context, AppRouter.myTasks),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.assignment, color: AppColors.primary),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Công việc của tôi', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  const SizedBox(height: 4),
                  Text('$_taskCount việc cần hoàn thành', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: _taskCount > 0 ? AppColors.primary : AppColors.success,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '$_taskCount',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(0, Icons.home_rounded, Icons.home_outlined, 'Trang chủ'),
              _buildNavItem(1, Icons.work_history_rounded, Icons.work_history_outlined, 'Công việc'),
              _buildNavItem(2, Icons.chat_bubble_rounded, Icons.chat_bubble_outline_rounded, 'Chat', badge: _unreadChat),
              _buildNavItem(3, Icons.notifications_rounded, Icons.notifications_outlined, 'Thông báo', badge: _unreadNotifications),
              _buildNavItem(4, Icons.person_rounded, Icons.person_outline_rounded, 'Hồ sơ'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData activeIcon, IconData inactiveIcon, String label, {int badge = 0}) {
    final isActive = _selectedIndex == index;
    
    return InkWell(
      onTap: () => _onItemTapped(index),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(
                  isActive ? activeIcon : inactiveIcon,
                  color: isActive ? AppColors.primary : AppColors.textSecondary,
                  size: 26,
                ),
                if (badge > 0)
                  Positioned(
                    right: -8,
                    top: -4,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        badge > 9 ? '9+' : '$badge',
                        style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                color: isActive ? AppColors.primary : AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
