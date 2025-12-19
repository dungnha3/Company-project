import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../data/services/hr_service.dart';
import '../../data/services/auth_service.dart';
import '../../data/models/payroll.dart';
import 'payroll_history_screen.dart';
import '../../config/app_colors.dart';

class PayrollScreen extends StatefulWidget {
  const PayrollScreen({super.key});

  @override
  State<PayrollScreen> createState() => _PayrollScreenState();
}

class _PayrollScreenState extends State<PayrollScreen> {
  final HRService _hrService = HRService();
  final AuthService _authService = AuthService();
  
  bool _isLoading = false;
  Payroll? _payrollData;
  DateTime _selectedDate = DateTime.now();
  String? _error;
  int? _nhanvienId;

  @override
  void initState() {
    super.initState();
    _initializeData();
  }

  Future<void> _initializeData() async {
    setState(() => _isLoading = true);
    await _getEmployeeId();
    await _fetchPayroll();
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

  Future<void> _fetchPayroll() async {
    setState(() {
      _error = null;
      _payrollData = null;
    });

    if (_nhanvienId == null) {
      setState(() => _error = 'Không tìm thấy thông tin nhân viên');
      return;
    }

    try {
      final data = await _hrService.getPayroll(
        _nhanvienId!,
        _selectedDate.month,
        _selectedDate.year,
      );
      
      if (data != null) {
        setState(() => _payrollData = data);
      } else {
        setState(() => _error = 'Chưa có bảng lương cho tháng này.');
      }
    } catch (e) {
      setState(() => _error = 'Lỗi tải dữ liệu: $e');
    }
  }

  Future<void> _changeMonth(int offset) async {
    setState(() {
      _selectedDate = DateTime(_selectedDate.year, _selectedDate.month + offset);
      _isLoading = true;
    });
    await _fetchPayroll();
    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('Bảng Lương'),
        centerTitle: true,
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            tooltip: 'Lịch sử lương',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const PayrollHistoryScreen()),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Month Selector
          Container(
            padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 20),
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(20),
                bottomRight: Radius.circular(20),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back_ios, color: Colors.white),
                  onPressed: () => _changeMonth(-1),
                ),
                Column(
                  children: [
                    Text(
                      'Tháng ${_selectedDate.month}/${_selectedDate.year}',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const Text(
                      'Kỳ lương chính thức',
                      style: TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.arrow_forward_ios, color: Colors.white),
                  onPressed: () => _changeMonth(1),
                ),
              ],
            ),
          ),

          Expanded(
            child: _isLoading
                ? Center(child: CircularProgressIndicator(color: AppColors.primary))
                : _error != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.receipt_long_outlined, size: 64, color: Colors.grey[400]),
                            const SizedBox(height: 16),
                            Text(_error!, style: TextStyle(color: Colors.grey[600])),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: _fetchPayroll,
                              child: const Text('Thử lại'),
                            ),
                          ],
                        ),
                      )
                    : _payrollData == null
                        ? const Center(child: Text('Không có dữ liệu'))
                        : SingleChildScrollView(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              children: [
                                // Net Salary Card
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(24),
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [AppColors.primary, AppColors.primaryLight],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    ),
                                    borderRadius: BorderRadius.circular(24),
                                    boxShadow: [
                                      BoxShadow(
                                        color: AppColors.primary.withOpacity(0.3),
                                        blurRadius: 15,
                                        offset: const Offset(0, 8),
                                      ),
                                    ],
                                  ),
                                  child: Column(
                                    children: [
                                      const Text(
                                        'THỰC LĨNH',
                                        style: TextStyle(
                                          color: Colors.white70,
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          letterSpacing: 1.5,
                                        ),
                                      ),
                                      const SizedBox(height: 10),
                                      Text(
                                        currencyFormat.format(_payrollData!.luongThucNhan),
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 36,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 10),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                        decoration: BoxDecoration(
                                          color: Colors.white.withOpacity(0.2),
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        child: Text(
                                          _payrollData!.trangThai,
                                          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),

                                const SizedBox(height: 25),

                                // Work Info Card
                                _buildSectionTitle('Thông tin công việc', theme),
                                Card(
                                  elevation: 2,
                                  shadowColor: Colors.black12,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                  child: Padding(
                                    padding: const EdgeInsets.all(20),
                                    child: Column(
                                      children: [
                                        _buildInfoRow('Ngày công', '${_payrollData!.ngayCong} / ${_payrollData!.ngayCongChuan} ngày', theme),
                                        const Divider(height: 24),
                                        _buildInfoRow('Giờ làm thêm', '${_payrollData!.gioLamThem} giờ', theme),
                                        const Divider(height: 24),
                                        _buildRow('Tiền làm thêm', _payrollData!.tienLamThem, currencyFormat, isPositive: true, theme: theme),
                                      ],
                                    ),
                                  ),
                                ),

                                const SizedBox(height: 25),

                                // Income Details
                                _buildSectionTitle('Thu nhập', theme),
                                Card(
                                  elevation: 2,
                                  shadowColor: Colors.black12,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                  child: Padding(
                                    padding: const EdgeInsets.all(20),
                                    child: Column(
                                      children: [
                                        _buildRow('Lương cơ bản', _payrollData!.luongCoBan, currencyFormat),
                                        const Divider(height: 24),
                                        _buildRow('Phụ cấp', _payrollData!.phuCap, currencyFormat, isPositive: true, theme: theme),
                                        const Divider(height: 24),
                                        _buildRow('Thưởng', _payrollData!.thuong, currencyFormat, isPositive: true, theme: theme),
                                      ],
                                    ),
                                  ),
                                ),

                                const SizedBox(height: 25),

                                // Deductions
                                _buildSectionTitle('Khấu trừ', theme),
                                Card(
                                  elevation: 2,
                                  shadowColor: Colors.black12,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                  child: Padding(
                                    padding: const EdgeInsets.all(20),
                                    child: Column(
                                      children: [
                                        _buildRow('BHXH (8%)', _payrollData!.bhxh, currencyFormat, isNegative: true, theme: theme),
                                        const Divider(height: 24),
                                        _buildRow('BHYT (1.5%)', _payrollData!.bhyt, currencyFormat, isNegative: true, theme: theme),
                                        const Divider(height: 24),
                                        _buildRow('BHTN (1%)', _payrollData!.bhtn, currencyFormat, isNegative: true, theme: theme),
                                        const Divider(height: 24),
                                        _buildRow('Thuế TNCN', _payrollData!.thueTNCN, currencyFormat, isNegative: true, theme: theme),
                                        const Divider(height: 24),
                                        _buildRow('Khấu trừ khác', _payrollData!.khauTruKhac, currencyFormat, isNegative: true, theme: theme),
                                      ],
                                    ),
                                  ),
                                ),

                                const SizedBox(height: 25),
                                
                                // Summary
                                Card(
                                  color: AppColors.primary.withOpacity(0.05),
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                  child: Padding(
                                    padding: const EdgeInsets.all(20),
                                    child: Column(
                                      children: [
                                        _buildRow('Tổng thu nhập', _payrollData!.tongLuong, currencyFormat, isBold: true),
                                        const SizedBox(height: 12),
                                        _buildRow('Tổng khấu trừ', _payrollData!.tongKhauTru, currencyFormat, isBold: true, isNegative: true, theme: theme),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 30),
                              ],
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title, ThemeData theme) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.only(left: 10, bottom: 10),
      child: Text(
        title,
        style: theme.textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.bold,
          color: Colors.grey.shade700,
        ),
      ),
    );
  }

  Widget _buildRow(String label, double value, NumberFormat format, {bool isPositive = false, bool isNegative = false, bool isBold = false, ThemeData? theme}) {
    Color textColor = Colors.black87;
    if (isPositive) textColor = theme?.colorScheme.secondary ?? Colors.green.shade700;
    if (isNegative) textColor = theme?.colorScheme.error ?? Colors.red.shade700;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 15,
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            color: Colors.black54,
          ),
        ),
        Text(
          '${isPositive ? '+' : ''}${isNegative ? '-' : ''}${format.format(value)}',
          style: TextStyle(
            fontSize: 15,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
            color: textColor,
          ),
        ),
      ],
    );
  }

  Widget _buildInfoRow(String label, String value, ThemeData theme) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 15,
            color: Colors.black54,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w500,
            color: AppColors.primary,
          ),
        ),
      ],
    );
  }
}
