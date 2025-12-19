import 'package:flutter/material.dart';
import '../../data/models/issue.dart';
import '../../data/services/project_service.dart';

class EditIssueScreen extends StatefulWidget {
  final Issue issue;

  const EditIssueScreen({super.key, required this.issue});

  @override
  State<EditIssueScreen> createState() => _EditIssueScreenState();
}

class _EditIssueScreenState extends State<EditIssueScreen> {
  final ProjectService _projectService = ProjectService();
  final _formKey = GlobalKey<FormState>();

  bool _isLoading = false;
  late TextEditingController _titleController;
  late TextEditingController _descController;
  late TextEditingController _hoursController;
  late TextEditingController _actualHoursController;
  
  late String _selectedPriority;
  DateTime? _selectedDate;

  final List<String> _priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.issue.title);
    _descController = TextEditingController(text: widget.issue.description);
    _hoursController = TextEditingController(text: widget.issue.estimatedHours?.toString() ?? '');
    _actualHoursController = TextEditingController(text: widget.issue.actualHours?.toString() ?? '');
    
    _selectedPriority = widget.issue.priority;
    if (!_priorities.contains(_selectedPriority)) {
      _selectedPriority = 'MEDIUM'; // Fallback
    }
    
    if (widget.issue.dueDate != null) {
      try {
        _selectedDate = DateTime.parse(widget.issue.dueDate!);
      } catch (e) {
        // ignore
      }
    }
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime(2101),
    );
    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  Future<void> _submit() async {
    if (_formKey.currentState!.validate()) {
      setState(() => _isLoading = true);
      try {
        double? estHours = _hoursController.text.isNotEmpty 
            ? double.tryParse(_hoursController.text) 
            : null;
            
        double? actHours = _actualHoursController.text.isNotEmpty 
            ? double.tryParse(_actualHoursController.text) 
            : null;

        final success = await _projectService.updateIssue(
          widget.issue.issueId,
          title: _titleController.text,
          description: _descController.text,
          priority: _selectedPriority,
          dueDate: _selectedDate,
          estimatedHours: estHours,
          actualHours: actHours,
        );

        if (success && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Cập nhật thành công')),
          );
          Navigator.pop(context, true); // Return true to refresh
        } else if (mounted) {
           ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Cập nhật thất bại')),
          );
        }
      } catch (e) {
         if (mounted) {
           ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Lỗi: $e')),
          );
         }
      } finally {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chỉnh sửa công việc'),
        backgroundColor: theme.primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Title
              TextFormField(
                controller: _titleController,
                decoration: InputDecoration(
                  labelText: 'Tên công việc',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  prefixIcon: const Icon(Icons.title),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Vui lòng nhập tên công việc';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Priority
              DropdownButtonFormField<String>(
                value: _selectedPriority,
                decoration: InputDecoration(
                  labelText: 'Độ ưu tiên',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  prefixIcon: const Icon(Icons.flag_outlined),
                ),
                items: _priorities.map((String p) {
                  return DropdownMenuItem<String>(
                    value: p,
                    child: Text(p),
                  );
                }).toList(),
                onChanged: (String? newValue) {
                  setState(() {
                    _selectedPriority = newValue!;
                  });
                },
              ),
              const SizedBox(height: 16),

              // Due Date
              InkWell(
                onTap: () => _selectDate(context),
                child: InputDecorator(
                  decoration: InputDecoration(
                    labelText: 'Hạn chót (Deadline)',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    prefixIcon: const Icon(Icons.calendar_today),
                  ),
                  child: Text(
                    _selectedDate == null 
                        ? 'Chọn ngày' 
                        : '${_selectedDate!.day}/${_selectedDate!.month}/${_selectedDate!.year}',
                    style: TextStyle(color: _selectedDate == null ? Colors.grey : Colors.black87),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              Row(
                children: [
                   Expanded(
                     child: TextFormField(
                      controller: _hoursController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        labelText: 'Dự kiến (h)',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        prefixIcon: const Icon(Icons.timer_outlined),
                      ),
                    ),
                   ),
                   const SizedBox(width: 16),
                   Expanded(
                     child: TextFormField(
                      controller: _actualHoursController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        labelText: 'Thực tế (h)',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        prefixIcon: const Icon(Icons.check_circle_outline),
                      ),
                    ),
                   ),
                ],
              ),
              const SizedBox(height: 16),

              // Description
              TextFormField(
                controller: _descController,
                maxLines: 5,
                decoration: InputDecoration(
                  labelText: 'Mô tả chi tiết',
                  alignLabelWithHint: true,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  prefixIcon: const Padding(
                    padding: EdgeInsets.only(bottom: 80),
                    child: Icon(Icons.description_outlined),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Submit Button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: theme.primaryColor,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 2,
                  ),
                  child: _isLoading 
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('Lưu thay đổi', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
