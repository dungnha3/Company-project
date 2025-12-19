import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../data/services/hr_service.dart';
import '../../data/models/attendance.dart';

class AttendanceHistoryScreen extends StatefulWidget {
  final int nhanvienId;
  
  const AttendanceHistoryScreen({super.key, required this.nhanvienId});

  @override
  State<AttendanceHistoryScreen> createState() => _AttendanceHistoryScreenState();
}

class _AttendanceHistoryScreenState extends State<AttendanceHistoryScreen> {
  final HRService _hrService = HRService();
  
  List<Attendance> _allAttendance = [];
  bool _isLoading = true;
  String _selectedFilter = 'month';
  int _selectedMonth = DateTime.now().month;
  int _selectedYear = DateTime.now().year;

  @override
  void initState() {
    super.initState();
    _fetchAttendance();
  }

  Future<void> _fetchAttendance() async {
    setState(() => _isLoading = true);
    try {
      final list = await _hrService.getMonthlyAttendance(
        widget.nhanvienId, 
        _selectedMonth, 
        _selectedYear,
      );
      setState(() {
        _allAttendance = list.reversed.toList();
      });
    } catch (e) {
      debugPrint('Error fetching attendance: $e');
    }
    setState(() => _isLoading = false);
  }

  String _getPunctualityStatus(String? timeStr, bool isCheckIn) {
    if (timeStr == null) return '';
    try {
      final parts = timeStr.split(':');
      final hour = int.parse(parts[0]);
      final minute = int.parse(parts[1]);
      
      if (isCheckIn) {
        final diff = (hour * 60 + minute) - (8 * 60);
        if (diff <= 0) return 'Đúng giờ';
        return 'Trễ ${diff}p';
      } else {
        final diff = (17 * 60) - (hour * 60 + minute);
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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Lịch sử chấm công'),
        backgroundColor: theme.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // Month/Year selector
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<int>(
                        value: _selectedMonth,
                        isExpanded: true,
                        items: List.generate(12, (i) => DropdownMenuItem(
                          value: i + 1,
                          child: Text('Tháng ${i + 1}'),
                        )),
                        onChanged: (value) {
                          if (value != null) {
                            setState(() => _selectedMonth = value);
                            _fetchAttendance();
                          }
                        },
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<int>(
                        value: _selectedYear,
                        isExpanded: true,
                        items: List.generate(3, (i) => DropdownMenuItem(
                          value: DateTime.now().year - i,
                          child: Text('Năm ${DateTime.now().year - i}'),
                        )),
                        onChanged: (value) {
                          if (value != null) {
                            setState(() => _selectedYear = value);
                            _fetchAttendance();
                          }
                        },
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _allAttendance.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.history, size: 64, color: Colors.grey.shade300),
                            const SizedBox(height: 16),
                            Text(
                              'Không có dữ liệu chấm công',
                              style: TextStyle(color: Colors.grey.shade500, fontSize: 16),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _fetchAttendance,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _allAttendance.length,
                          itemBuilder: (context, index) => _buildHistoryItem(_allAttendance[index]),
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryItem(Attendance attendance) {
    final checkInStatus = _getPunctualityStatus(attendance.gioVao, true);
    final checkOutStatus = _getPunctualityStatus(attendance.gioRa, false);
    final hasCheckOut = attendance.gioRa != null;
    
    // Parse date
    String dayLabel = '';
    String weekdayLabel = '';
    try {
      final date = DateTime.parse(attendance.ngayCham);
      dayLabel = DateFormat('dd/MM').format(date);
      weekdayLabel = DateFormat('EEEE', 'vi').format(date);
      weekdayLabel = weekdayLabel[0].toUpperCase() + weekdayLabel.substring(1);
    } catch (_) {
      dayLabel = attendance.ngayCham;
    }
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            // Date column
            Container(
              width: 70,
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color: hasCheckOut ? Colors.green.shade50 : Colors.orange.shade50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Text(
                    dayLabel,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: hasCheckOut ? Colors.green.shade700 : Colors.orange.shade700,
                    ),
                  ),
                  Text(
                    weekdayLabel,
                    style: TextStyle(
                      fontSize: 10,
                      color: hasCheckOut ? Colors.green.shade600 : Colors.orange.shade600,
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(width: 16),
            
            // Times
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.login, size: 16, color: Colors.green.shade600),
                      const SizedBox(width: 8),
                      Text(
                        'Vào: ${attendance.gioVao?.substring(0, 5) ?? '--:--'}',
                        style: const TextStyle(fontSize: 14),
                      ),
                      if (checkInStatus.isNotEmpty) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: _getPunctualityColor(checkInStatus).withAlpha(30),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            checkInStatus,
                            style: TextStyle(
                              fontSize: 10,
                              color: _getPunctualityColor(checkInStatus),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(Icons.logout, size: 16, color: Colors.red.shade600),
                      const SizedBox(width: 8),
                      Text(
                        'Ra: ${attendance.gioRa?.substring(0, 5) ?? '--:--'}',
                        style: const TextStyle(fontSize: 14),
                      ),
                      if (checkOutStatus.isNotEmpty) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: _getPunctualityColor(checkOutStatus).withAlpha(30),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            checkOutStatus,
                            style: TextStyle(
                              fontSize: 10,
                              color: _getPunctualityColor(checkOutStatus),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
