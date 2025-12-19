import 'package:flutter/material.dart';
import '../../data/models/project.dart';
import '../../data/services/project_service.dart';
import '../../widgets/common_widgets.dart';

class CreateIssueScreen extends StatefulWidget {
  const CreateIssueScreen({super.key});

  @override
  State<CreateIssueScreen> createState() => _CreateIssueScreenState();
}

class _CreateIssueScreenState extends State<CreateIssueScreen> {
  final ProjectService _projectService = ProjectService();
  final _formKey = GlobalKey<FormState>();

  bool _isLoading = false;
  List<Project> _projects = [];
  Project? _selectedProject;
  
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _hoursController = TextEditingController();
  
  String _selectedPriority = 'MEDIUM';
  DateTime? _selectedDate;

  final List<String> _priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  @override
  void initState() {
    super.initState();
    _fetchProjects();
  }

  Future<void> _fetchProjects() async {
    setState(() => _isLoading = true);
    try {
      final projects = await _projectService.getMyProjects();
      setState(() {
        _projects = projects;
        if (projects.isNotEmpty) {
          _selectedProject = projects.first;
        }
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Lỗi tải danh sách dự án')),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
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
      if (_selectedProject == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Vui lòng chọn dự án')),
        );
        return;
      }

      setState(() => _isLoading = true);
      try {
        double? hours = _hoursController.text.isNotEmpty 
            ? double.tryParse(_hoursController.text) 
            : null;

        final success = await _projectService.createIssue(
          projectId: _selectedProject!.projectId,
          title: _titleController.text,
          description: _descController.text,
          priority: _selectedPriority,
          dueDate: _selectedDate,
          estimatedHours: hours,
        );

        if (success && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Tạo công việc thành công')),
          );
          Navigator.pop(context, true); // Return true to refresh list
        } else if (mounted) {
           ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Tạo công việc thất bại')),
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
        title: const Text('Tạo công việc mới'),
        backgroundColor: theme.primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: _isLoading && _projects.isEmpty
          ? Center(child: CircularProgressIndicator(color: theme.primaryColor))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Project Selection
                    DropdownButtonFormField<Project>(
                      value: _selectedProject,
                      decoration: InputDecoration(
                        labelText: 'Dự án',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        prefixIcon: const Icon(Icons.folder_outlined),
                      ),
                      items: _projects.map((Project p) {
                        return DropdownMenuItem<Project>(
                          value: p,
                          child: Text(p.name, overflow: TextOverflow.ellipsis),
                        );
                      }).toList(),
                      onChanged: (Project? newValue) {
                        setState(() {
                          _selectedProject = newValue;
                        });
                      },
                      validator: (value) => value == null ? 'Vui lòng chọn dự án' : null,
                    ),
                    const SizedBox(height: 16),

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
                        Color color = Colors.green;
                        if (p == 'HIGH') color = Colors.orange;
                        if (p == 'URGENT') color = Colors.red;
                        
                        return DropdownMenuItem<String>(
                          value: p,
                          child: Row(
                            children: [
                              Icon(Icons.flag, color: color, size: 20),
                              const SizedBox(width: 8),
                              Text(p),
                            ],
                          ),
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

                    // Estimated Hours
                    TextFormField(
                      controller: _hoursController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        labelText: 'Ước tính (giờ)',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        prefixIcon: const Icon(Icons.timer_outlined),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Description
                    TextFormField(
                      controller: _descController,
                      maxLines: 4,
                      decoration: InputDecoration(
                        labelText: 'Mô tả chi tiết',
                        alignLabelWithHint: true,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        prefixIcon: const Padding(
                          padding: EdgeInsets.only(bottom: 60),
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
                            : const Text('Tạo công việc', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
