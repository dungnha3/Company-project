import 'package:flutter/material.dart';
import '../../data/services/project_service.dart';
import '../../data/models/issue.dart';
import '../../widgets/common_widgets.dart';
import '../../config/app_router.dart';
import '../../config/app_colors.dart';
import '../../utils/app_snackbar.dart';

class MyTasksScreen extends StatefulWidget {
  const MyTasksScreen({super.key});

  @override
  State<MyTasksScreen> createState() => _MyTasksScreenState();
}

class _MyTasksScreenState extends State<MyTasksScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ProjectService _projectService = ProjectService();
  
  bool _isLoading = false;
  List<Issue> _allTasks = [];
  List<Issue> _todoTasks = [];
  List<Issue> _inProgressTasks = [];
  List<Issue> _doneTasks = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _fetchTasks();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchTasks() async {
    setState(() => _isLoading = true);
    try {
      final data = await _projectService.getMyTasks();
      
      setState(() {
        _allTasks = data;
        _filterTasks();
      });
    } catch (e) {
      if (context.mounted) {
        AppSnackbar.error(context, 'Lỗi tải danh sách công việc');
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _filterTasks() {
    // Status from API: "To Do", "In Progress", "Review", "Done"
    _todoTasks = _allTasks.where((t) {
      final status = t.statusName.toUpperCase();
      return status.contains('TODO') || 
             status.contains('TO DO') ||
             status.contains('OPEN') || 
             status.contains('NEW');
    }).toList();
    
    _inProgressTasks = _allTasks.where((t) {
      final status = t.statusName.toUpperCase();
      return status.contains('PROGRESS') || 
             status.contains('REVIEW') ||
             status.contains('TESTING');
    }).toList();
    
    _doneTasks = _allTasks.where((t) {
      final status = t.statusName.toUpperCase();
      return status.contains('DONE') || 
             status.contains('CLOSED') || 
             status.contains('RESOLVED') ||
             status.contains('COMPLETE');
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // Bitrix24 style: Light gray background for contrast
    return Scaffold(
      backgroundColor: AppColors.background, 
      appBar: AppBar(
        title: const Text('Công việc của tôi', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(50),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.grey[200],
              borderRadius: BorderRadius.circular(25),
            ),
            child: TabBar(
              controller: _tabController,
              labelColor: Colors.black87,
              unselectedLabelColor: Colors.grey[600],
              indicator: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(25),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2)),
                ],
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              dividerColor: Colors.transparent,
              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              tabs: [
                Tab(text: 'Cần làm (${_todoTasks.length})'),
                Tab(text: 'Đang làm (${_inProgressTasks.length})'),
                Tab(text: 'Xong (${_doneTasks.length})'),
              ],
            ),
          ),
        ),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: theme.primaryColor))
          : TabBarView(
              controller: _tabController,
              children: [
                _buildTaskList(_todoTasks, Colors.orange, theme),
                _buildTaskList(_inProgressTasks, theme.colorScheme.secondary, theme),
                _buildTaskList(_doneTasks, Colors.green, theme),
              ],
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final result = await Navigator.pushNamed(context, AppRouter.createIssue);
          if (result == true) {
            _fetchTasks();
          }
        },
        backgroundColor: AppColors.primary,
        elevation: 4,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildTaskList(List<Issue> tasks, Color accentColor, ThemeData theme) {
    if (tasks.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.assignment_outlined, size: 80, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text('Không có công việc nào', style: TextStyle(color: Colors.grey[500], fontSize: 16)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchTasks,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        itemCount: tasks.length,
        itemBuilder: (context, index) {
          final task = tasks[index];
          return _buildPremiumTaskCard(task, accentColor, theme);
        },
      ),
    );
  }

  Widget _buildPremiumTaskCard(Issue task, Color accentColor, ThemeData theme) {
    // Determine priority color
    Color priorityColor = Colors.grey;
    if (task.priority == 'HIGH') priorityColor = Colors.orange;
    if (task.priority == 'URGENT') priorityColor = Colors.red;
    if (task.priority == 'MEDIUM') priorityColor = Colors.blue;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: InkWell(
        onTap: () async {
          final result = await Navigator.pushNamed(
            context,
            AppRouter.issueDetail,
            arguments: {'issueId': task.issueId},
          );
          if (result == true) _fetchTasks();
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: Project Name + Priority
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      task.projectName ?? 'Project',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey[600],
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.5,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (priorityColor != Colors.grey)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: priorityColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        task.priority,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: priorityColor,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              
              // Title
              Text(
                task.title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                  height: 1.3,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              
              // Footer: Deadline + Avatar
              Row(
                children: [
                  // Deadline
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.calendar_today, size: 12, color: Colors.grey[600]),
                        const SizedBox(width: 4),
                        Text(
                          task.dueDate ?? 'No deadline',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[700],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  
                  // Comment/Attachment indicators (Mockup)
                  if (task.comments.isNotEmpty) ...[
                     Icon(Icons.chat_bubble_outline, size: 14, color: Colors.grey[400]),
                     const SizedBox(width: 4),
                     Text(
                       '${task.comments.length}',
                       style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                     ),
                     const SizedBox(width: 12),
                  ],

                  // Avatar
                  if (task.assigneeName != null)
                    CircleAvatar(
                      radius: 12,
                      backgroundColor: theme.primaryColor.withOpacity(0.1),
                      backgroundImage: task.assigneeAvatarUrl != null 
                          ? NetworkImage(task.assigneeAvatarUrl!) 
                          : null,
                      child: task.assigneeAvatarUrl == null
                          ? Text(
                              task.assigneeName![0].toUpperCase(),
                              style: TextStyle(fontSize: 10, color: theme.primaryColor, fontWeight: FontWeight.bold),
                            )
                          : null,
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
