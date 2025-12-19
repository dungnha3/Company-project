import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../data/services/hr_service.dart';
import '../../data/services/auth_service.dart';
import '../../data/models/payroll.dart';

class PayrollHistoryScreen extends StatefulWidget {
  const PayrollHistoryScreen({super.key});

  @override
  State<PayrollHistoryScreen> createState() => _PayrollHistoryScreenState();
}

class _PayrollHistoryScreenState extends State<PayrollHistoryScreen> {
  final HRService _hrService = HRService();
  final AuthService _authService = AuthService();
  
  bool _isLoading = true;
  List<Payroll> _payrollHistory = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() => _isLoading = true);
    try {
      final userIdStr = await _authService.getUserId();
      if (userIdStr != null) {
        final userId = int.parse(userIdStr);
        final nhanvienId = await _hrService.getEmployeeIdByUserId(userId);
        if (nhanvienId != null) {
          final history = await _hrService.getPayrollHistory(nhanvienId);
          // Sort by year and month descending
          history.sort((a, b) {
            final yearCmp = b.nam.compareTo(a.nam);
            return yearCmp != 0 ? yearCmp : b.thang.compareTo(a.thang);
          });
          setState(() {
            _payrollHistory = history;
            _isLoading = false;
          });
          return;
        }
      }
      setState(() {
        _error = 'Không tìm thấy thông tin nhân viên';
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Lỗi tải dữ liệu: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Lịch Sử Lương'),
        centerTitle: true,
        backgroundColor: theme.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline, size: 64, color: Colors.grey[400]),
                      const SizedBox(height: 16),
                      Text(_error!, style: TextStyle(color: Colors.grey[600])),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadHistory,
                        child: const Text('Thử lại'),
                      ),
                    ],
                  ),
                )
              : _payrollHistory.isEmpty
                  ? const Center(child: Text('Chưa có lịch sử lương'))
                  : Column(
                      children: [
                        // Simple bar chart
                        Container(
                          height: 180,
                          padding: const EdgeInsets.all(16),
                          child: _buildSimpleChart(theme),
                        ),
                        const Divider(height: 1),
                        // List
                        Expanded(
                          child: ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: _payrollHistory.length,
                            itemBuilder: (context, index) {
                              final payroll = _payrollHistory[index];
                              return _buildPayrollCard(payroll, currencyFormat, theme);
                            },
                          ),
                        ),
                      ],
                    ),
    );
  }

  Widget _buildSimpleChart(ThemeData theme) {
    // Take last 6 months for chart
    final chartData = _payrollHistory.take(6).toList().reversed.toList();
    if (chartData.isEmpty) return const SizedBox();

    final maxSalary = chartData.map((p) => p.luongThucNhan).reduce((a, b) => a > b ? a : b);

    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: maxSalary * 1.2,
        minY: 0,
        barTouchData: BarTouchData(
          enabled: true,
          touchTooltipData: BarTouchTooltipData(
            getTooltipColor: (group) => theme.primaryColor,
            getTooltipItem: (group, groupIndex, rod, rodIndex) {
              final payroll = chartData[groupIndex];
              return BarTooltipItem(
                'Tháng ${payroll.thang}\n',
                const TextStyle(color: Colors.white, fontSize: 12),
                children: [
                  TextSpan(
                    text: '${(payroll.luongThucNhan / 1000000).toStringAsFixed(1)} triệu',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              );
            },
          ),
        ),
        titlesData: FlTitlesData(
          show: true,
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                if (value.toInt() >= 0 && value.toInt() < chartData.length) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      'T${chartData[value.toInt()].thang}',
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  );
                }
                return const Text('');
              },
              reservedSize: 30,
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 45,
              getTitlesWidget: (value, meta) {
                if (value == 0) return const Text('');
                return Text(
                  '${(value / 1000000).toStringAsFixed(0)}tr',
                  style: TextStyle(color: Colors.grey[500], fontSize: 10),
                );
              },
            ),
          ),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: maxSalary / 4,
          getDrawingHorizontalLine: (value) => FlLine(
            color: Colors.grey.withValues(alpha: 0.15),
            strokeWidth: 1,
          ),
        ),
        borderData: FlBorderData(show: false),
        barGroups: chartData.asMap().entries.map((entry) {
          final index = entry.key;
          final payroll = entry.value;
          return BarChartGroupData(
            x: index,
            barRods: [
              BarChartRodData(
                toY: payroll.luongThucNhan,
                width: 28,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(6),
                  topRight: Radius.circular(6),
                ),
                gradient: LinearGradient(
                  colors: [theme.primaryColor, theme.colorScheme.secondary],
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                ),
              ),
            ],
          );
        }).toList(),
      ),
      duration: const Duration(milliseconds: 300),
    );
  }

  Widget _buildPayrollCard(Payroll payroll, NumberFormat format, ThemeData theme) {
    final statusColor = payroll.trangThai == 'DA_THANH_TOAN' 
        ? Colors.green 
        : Colors.orange;
    final statusText = payroll.trangThai == 'DA_THANH_TOAN' 
        ? 'Đã thanh toán' 
        : 'Chưa thanh toán';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            color: theme.primaryColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: Text(
              'T${payroll.thang}',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: theme.primaryColor,
                fontSize: 16,
              ),
            ),
          ),
        ),
        title: Text(
          format.format(payroll.luongThucNhan),
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Tháng ${payroll.thang}/${payroll.nam}'),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                statusText,
                style: TextStyle(color: statusColor, fontSize: 12),
              ),
            ),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '${payroll.ngayCong}/${payroll.ngayCongChuan}',
              style: TextStyle(color: Colors.grey[600], fontSize: 12),
            ),
            const Text('ngày công', style: TextStyle(fontSize: 10)),
          ],
        ),
      ),
    );
  }
}
