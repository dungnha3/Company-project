import 'package:flutter/material.dart';
import '../../data/services/hr_service.dart';

class AttendanceStatisticsScreen extends StatefulWidget {
  final int nhanvienId;
  
  const AttendanceStatisticsScreen({super.key, required this.nhanvienId});

  @override
  State<AttendanceStatisticsScreen> createState() => _AttendanceStatisticsScreenState();
}

class _AttendanceStatisticsScreenState extends State<AttendanceStatisticsScreen> {
  final HRService _hrService = HRService();
  
  bool _isLoading = true;
  int _selectedMonth = DateTime.now().month;
  int _selectedYear = DateTime.now().year;
  
  int _workingDays = 0;
  int _lateDays = 0;
  int _earlyLeaveDays = 0;
  double _totalHours = 0;

  @override
  void initState() {
    super.initState();
    _fetchStatistics();
  }

  Future<void> _fetchStatistics() async {
    setState(() => _isLoading = true);
    try {
      final stats = await _hrService.getStatistics(widget.nhanvienId, _selectedMonth, _selectedYear);
      final hours = await _hrService.getTotalHours(widget.nhanvienId, _selectedMonth, _selectedYear);
      
      setState(() {
        _workingDays = stats['workingDays'] ?? 0;
        _lateDays = stats['lateDays'] ?? 0;
        _earlyLeaveDays = stats['earlyLeaveDays'] ?? 0;
        _totalHours = hours;
      });
    } catch (e) {
      debugPrint('Error fetching statistics: $e');
    }
    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Thống kê chấm công'),
        backgroundColor: theme.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Month/Year selector
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.grey.shade200,
                    blurRadius: 10,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
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
                              _fetchStatistics();
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
                              _fetchStatistics();
                            }
                          },
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 20),
            
            // Statistics cards
            if (_isLoading)
              const Center(child: Padding(
                padding: EdgeInsets.all(40),
                child: CircularProgressIndicator(),
              ))
            else
              Column(
                children: [
                  // Main stats row
                  Row(
                    children: [
                      Expanded(
                        child: _buildStatCard(
                          'Ngày công',
                          _workingDays.toString(),
                          Icons.calendar_today,
                          Colors.blue,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildStatCard(
                          'Tổng giờ',
                          '${_totalHours.toStringAsFixed(1)}h',
                          Icons.access_time,
                          Colors.purple,
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 12),
                  
                  // Late/Early row
                  Row(
                    children: [
                      Expanded(
                        child: _buildStatCard(
                          'Đi trễ',
                          '$_lateDays ngày',
                          Icons.warning_amber,
                          Colors.orange,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildStatCard(
                          'Về sớm',
                          '$_earlyLeaveDays ngày',
                          Icons.exit_to_app,
                          Colors.red,
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Summary card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [theme.primaryColor, theme.colorScheme.secondary],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Đánh giá',
                          style: TextStyle(color: Colors.white70, fontSize: 14),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _getEvaluation(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 12),
                        LinearProgressIndicator(
                          value: _getPerformanceScore(),
                          backgroundColor: Colors.white30,
                          valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '${(_getPerformanceScore() * 100).toInt()}% hiệu suất',
                          style: const TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: color.withAlpha(30),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withAlpha(30),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: 16),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }

  String _getEvaluation() {
    if (_workingDays == 0) return 'Chưa có dữ liệu';
    
    final badDays = _lateDays + _earlyLeaveDays;
    final ratio = badDays / _workingDays;
    
    if (ratio == 0) return 'Xuất sắc! Không vi phạm 🌟';
    if (ratio < 0.1) return 'Tốt! Ít vi phạm 👍';
    if (ratio < 0.3) return 'Trung bình. Cần cải thiện 📊';
    return 'Cần chú ý! Nhiều vi phạm ⚠️';
  }

  double _getPerformanceScore() {
    if (_workingDays == 0) return 0;
    final goodDays = _workingDays - _lateDays - _earlyLeaveDays;
    return (goodDays / _workingDays).clamp(0.0, 1.0);
  }
}
