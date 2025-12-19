import 'package:flutter/material.dart';
import '../../data/services/project_service.dart';
import '../../data/models/project.dart';
import '../../widgets/common_widgets.dart';

class ProjectsScreen extends StatefulWidget {
  const ProjectsScreen({super.key});

  @override
  State<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends State<ProjectsScreen> {
  final ProjectService _projectService = ProjectService();
  
  bool _isLoading = false;
  List<Project> _projects = [];

  @override
  void initState() {
    super.initState();
    _fetchProjects();
  }

  Future<void> _fetchProjects() async {
    setState(() => _isLoading = true);
    try {
      final data = await _projectService.getMyProjects();
      setState(() {
        _projects = data;
      });
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Lỗi tải danh sách dự án')),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('Dự án của tôi'),
        centerTitle: true,
        backgroundColor: theme.primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: theme.primaryColor))
          : _projects.isEmpty
              ? const EmptyState(message: 'Bạn chưa tham gia dự án nào', icon: Icons.folder_open)
              : RefreshIndicator(
                  onRefresh: _fetchProjects,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _projects.length,
                    itemBuilder: (context, index) {
                      final project = _projects[index];
                      return _buildProjectCard(project, theme);
                    },
                  ),
                ),
    );
  }

  Widget _buildProjectCard(Project project, ThemeData theme) {
    Color statusColor = Colors.grey;
    String statusText = project.status;
    
    if (statusText == 'ACTIVE' || statusText == 'RUNNING') {
      statusColor = theme.colorScheme.secondary;
      statusText = 'Đang chạy';
    } else if (statusText == 'COMPLETED' || statusText == 'FINISHED') {
      statusColor = theme.colorScheme.primary;
      statusText = 'Hoàn thành';
    } else if (statusText == 'PENDING' || statusText == 'ON_HOLD') {
      statusColor = Colors.orange;
      statusText = 'Tạm dừng';
    } else if (statusText == 'OVERDUE') {
      statusColor = theme.colorScheme.error;
      statusText = 'Quá hạn';
    } else if (statusText == 'CANCELLED') {
      statusColor = Colors.grey;
      statusText = 'Đã hủy';
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 4,
      shadowColor: Colors.black.withOpacity(0.1),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: () {
          // Navigate to project details
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          project.keyProject,
                          style: TextStyle(
                            color: theme.primaryColor,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          project.name,
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: statusColor.withOpacity(0.5)),
                    ),
                    child: Text(
                      statusText,
                      style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                project.description.isNotEmpty ? project.description : 'Không có mô tả',
                style: TextStyle(color: Colors.grey[600]),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 16),

              // Footer: Dates
              Row(
                children: [
                  Icon(Icons.calendar_today, size: 16, color: Colors.grey.shade400),
                  const SizedBox(width: 6),
                  Text(
                    '${project.startDate} - ${project.endDate}',
                    style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

