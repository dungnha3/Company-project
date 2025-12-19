import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../data/services/hr_service.dart';
import '../../data/services/auth_service.dart';
import '../../data/models/leave_request.dart';
import '../../config/app_colors.dart';
import '../../utils/app_snackbar.dart';

class LeaveRequestScreen extends StatefulWidget {
  const LeaveRequestScreen({super.key});

  @override
  State<LeaveRequestScreen> createState() => _LeaveRequestScreenState();
}

class _LeaveRequestScreenState extends State<LeaveRequestScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final HRService _hrService = HRService();
  final AuthService _authService = AuthService();
  
  // List Data
  bool _isLoadingList = false;
  List<LeaveRequest> _leaveRequests = [];

  // Form Data
  final _formKey = GlobalKey<FormState>();
  bool _isSubmitting = false;
  DateTime? _startDate;
  DateTime? _endDate;
  String _selectedType = 'PHEP_NAM'; // PHEP_NAM, NGHI_OM, KHONG_LUONG
  final _reasonController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetchLeaveRequests();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _fetchLeaveRequests() async {
    setState(() => _isLoadingList = true);
    try {
      final userIdStr = await _authService.getUserId();
      if (userIdStr != null) {
        final userId = int.parse(userIdStr);
        final data = await _hrService.getMyLeaveRequests(userId);
        setState(() {
          _leaveRequests = data;
        });
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi tải danh sách: $e')),
        );
      }
    } finally {
      setState(() => _isLoadingList = false);
    }
  }

  Future<void> _submitRequest() async {
    if (!_formKey.currentState!.validate()) return;
    if (_startDate == null || _endDate == null) {
      AppSnackbar.warning(context, 'Vui lòng chọn ngày bắt đầu và kết thúc');
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final userIdStr = await _authService.getUserId();
      if (userIdStr != null) {
        final userId = int.parse(userIdStr);
        
        final requestData = {
          'nhanvienId': userId,
          'ngayBatDau': DateFormat('yyyy-MM-dd').format(_startDate!),
          'ngayKetThuc': DateFormat('yyyy-MM-dd').format(_endDate!),
          'lyDo': _reasonController.text,
          'loaiPhep': _selectedType,
          'soNgay': _endDate!.difference(_startDate!).inDays + 1,
        };

        await _hrService.createLeaveRequest(requestData);
        
        if (!context.mounted) return;
        AppSnackbar.success(context, 'Gửi đơn xin nghỉ thành công!');
        
        // Reset form and switch to list tab
        _formKey.currentState!.reset();
        _reasonController.clear();
        setState(() {
          _startDate = null;
          _endDate = null;
          _selectedType = 'PHEP_NAM';
        });
        _tabController.animateTo(0);
        _fetchLeaveRequests();
      }
    } catch (e) {
      if (context.mounted) {
        AppSnackbar.error(context, e.toString());
      }
    } finally {
      setState(() => _isSubmitting = false);
    }
  }

  Future<void> _selectDate(BuildContext context, bool isStart) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
          // Auto adjust end date if it's before start date
          if (_endDate != null && _endDate!.isBefore(_startDate!)) {
            _endDate = null;
          }
        } else {
          _endDate = picked;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('Nghỉ Phép'),
        centerTitle: true,
        backgroundColor: theme.primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          tabs: const [
            Tab(text: 'Danh sách đơn'),
            Tab(text: 'Tạo đơn mới'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildListTab(theme),
          _buildCreateTab(theme),
        ],
      ),
    );
  }

  Widget _buildListTab(ThemeData theme) {
    if (_isLoadingList) {
      return Center(child: CircularProgressIndicator(color: theme.primaryColor));
    }

    return Column(
      children: [
        // Leave Balance Card (Mock Data for now)
        Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [theme.colorScheme.secondary, theme.primaryColor],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: theme.primaryColor.withOpacity(0.3),
                blurRadius: 10,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Phép năm còn lại',
                    style: TextStyle(color: Colors.white, fontSize: 16),
                  ),
                  SizedBox(height: 5),
                  Text(
                    '10 / 12 ngày',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.beach_access, color: Colors.white, size: 30),
              ),
            ],
          ),
        ),

        Expanded(
          child: _leaveRequests.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.event_busy, size: 64, color: Colors.grey[300]),
                      const SizedBox(height: 16),
                      Text('Bạn chưa có đơn nghỉ phép nào', style: TextStyle(color: Colors.grey[600])),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _fetchLeaveRequests,
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: _leaveRequests.length,
                    itemBuilder: (context, index) {
                      final request = _leaveRequests[index];
                      return _buildRequestCard(request, theme);
                    },
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildRequestCard(LeaveRequest request, ThemeData theme) {
    // Use helper getters from model
    Color statusColor = Colors.grey;
    String statusText = request.trangThaiDisplay;
    
    if (request.isPending) {
      statusColor = theme.colorScheme.secondary;
    } else if (request.isPMApproved) {
      statusColor = Colors.orange;
    } else if (request.isApproved) {
      statusColor = Colors.green;
    } else if (request.isRejected) {
      statusColor = theme.colorScheme.error;
    }

    String typeText = request.loaiPhepDisplay;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      shadowColor: Colors.black12,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: theme.primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    typeText,
                    style: TextStyle(color: theme.primaryColor, fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: statusColor.withOpacity(0.5)),
                  ),
                  child: Text(
                    statusText,
                    style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 15),
            Row(
              children: [
                Icon(Icons.calendar_today, size: 18, color: Colors.grey.shade600),
                const SizedBox(width: 8),
                Text(
                  '${request.ngayBatDau} - ${request.ngayKetThuc}',
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                ),
                const Spacer(),
                Text(
                  '${request.soNgay} ngày',
                  style: const TextStyle(color: Colors.grey, fontSize: 13),
                ),
              ],
            ),
            if (request.lyDo.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  request.lyDo,
                  style: TextStyle(color: Colors.grey.shade700, fontStyle: FontStyle.italic, fontSize: 13),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCreateTab(ThemeData theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Loại nghỉ phép', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              children: [
                _buildChoiceChip('Phép năm', 'PHEP_NAM', theme),
                _buildChoiceChip('Nghỉ ốm', 'NGHI_OM', theme),
                _buildChoiceChip('Không lương', 'KHONG_LUONG', theme),
              ],
            ),
            
            const SizedBox(height: 25),
            
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Từ ngày', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 10),
                      InkWell(
                        onTap: () => _selectDate(context, true),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 15),
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey.shade400),
                            borderRadius: BorderRadius.circular(10),
                            color: Colors.white,
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.calendar_today, size: 20, color: theme.primaryColor),
                              const SizedBox(width: 10),
                              Text(
                                _startDate == null ? 'Chọn ngày' : DateFormat('dd/MM/yyyy').format(_startDate!),
                                style: TextStyle(
                                  color: _startDate == null ? Colors.grey : Colors.black87,
                                  fontWeight: _startDate == null ? FontWeight.normal : FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Đến ngày', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 10),
                      InkWell(
                        onTap: () => _selectDate(context, false),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 15),
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey.shade400),
                            borderRadius: BorderRadius.circular(10),
                            color: Colors.white,
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.calendar_today, size: 20, color: theme.primaryColor),
                              const SizedBox(width: 10),
                              Text(
                                _endDate == null ? 'Chọn ngày' : DateFormat('dd/MM/yyyy').format(_endDate!),
                                style: TextStyle(
                                  color: _endDate == null ? Colors.grey : Colors.black87,
                                  fontWeight: _endDate == null ? FontWeight.normal : FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 25),

            Text('Lý do', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            TextFormField(
              controller: _reasonController,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'Nhập lý do nghỉ...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                filled: true,
                fillColor: Colors.white,
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Vui lòng nhập lý do';
                }
                return null;
              },
            ),

            const SizedBox(height: 40),

            SizedBox(
              width: double.infinity,
              height: 55,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submitRequest,
                style: ElevatedButton.styleFrom(
                  backgroundColor: theme.primaryColor,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                  elevation: 3,
                ),
                child: _isSubmitting
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('GỬI ĐƠN', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChoiceChip(String label, String value, ThemeData theme) {
    bool isSelected = _selectedType == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        if (selected) {
          setState(() => _selectedType = value);
        }
      },
      selectedColor: theme.primaryColor,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : Colors.black87,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
      backgroundColor: Colors.grey.shade200,
    );
  }
}
