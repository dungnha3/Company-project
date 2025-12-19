import 'package:flutter/material.dart';
import '../../data/models/issue.dart';
import '../../data/services/project_service.dart';
import '../../config/app_router.dart';

class SprintBoardScreen extends StatefulWidget {
  final int projectId;
  final String projectName;

  const SprintBoardScreen({super.key, required this.projectId, required this.projectName});

  @override
  State<SprintBoardScreen> createState() => _SprintBoardScreenState();
}

class _SprintBoardScreenState extends State<SprintBoardScreen> {
  final ProjectService _projectService = ProjectService();
  
  bool _isLoading = true;
  List<Map<String, dynamic>> _sprints = [];
  Map<String, dynamic>? _selectedSprint;
  List<Issue> _issues = [];
  
  // Columns
  List<Issue> _todo = [];
  List<Issue> _inProgress = [];
  List<Issue> _done = [];

  @override
  void initState() {
    super.initState();
    _fetchSprints();
  }

  Future<void> _fetchSprints() async {
    setState(() => _isLoading = true);
    try {
      final sprints = await _projectService.getProjectSprints(widget.projectId);
      if (sprints.isNotEmpty) {
        // Automatically select the active sprint or the first one
        final active = sprints.firstWhere(
          (s) => s['status'] == 'ACTIVE' || s['status'] == 'IN_PROGRESS', 
          orElse: () => sprints.first
        );
        _sprints = sprints;
        _selectedSprint = active;
        await _fetchIssues(active['sprintId']);
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _fetchIssues(int sprintId) async {
    setState(() => _isLoading = true);
    try {
      final issues = await _projectService.getSprintIssues(sprintId);
      _issues = issues;
      _distributeIssues();
    } catch (e) {
      // ignore
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _distributeIssues() {
    _todo = _issues.where((i) => 
      i.statusName.toUpperCase().contains('TO DO') || 
      i.statusName.toUpperCase().contains('TODO') ||
      i.statusName.toUpperCase().contains('OPEN')
    ).toList();
    
    _inProgress = _issues.where((i) => 
      i.statusName.toUpperCase().contains('PROGRESS') || 
      i.statusName.toUpperCase().contains('REVIEW')
    ).toList();
    
    _done = _issues.where((i) => 
      i.statusName.toUpperCase().contains('DONE') || 
      i.statusName.toUpperCase().contains('CLOSED') ||
      i.statusName.toUpperCase().contains('COMPLETE')
    ).toList();
  }

  void _onSprintChanged(Map<String, dynamic>? newValue) {
    if (newValue != null) {
      setState(() {
        _selectedSprint = newValue;
      });
      _fetchIssues(newValue['sprintId']);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA), // Light Gray
      appBar: AppBar(
        title: Text(widget.projectName, style: const TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
      ),
      body: _isLoading 
          ? Center(child: CircularProgressIndicator(color: theme.primaryColor))
          : _sprints.isEmpty 
              ? const Center(child: Text('Dự án chưa có Sprint nào'))
              : Column(
                  children: [
                    // Horizontal Phase Selector (Chips)
                    Container(
                      height: 60,
                      color: Colors.white,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        itemCount: _sprints.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 12),
                        itemBuilder: (context, index) {
                          final sprint = _sprints[index];
                          final isSelected = _selectedSprint != null && _selectedSprint!['sprintId'] == sprint['sprintId'];
                          return _buildPhaseChip(sprint, isSelected, theme);
                        },
                      ),
                    ),
                    
                    // Kanban Board
                    Expanded(
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildColumn('TO DO', _todo, Colors.orange, theme),
                            const SizedBox(width: 16),
                            _buildColumn('IN PROGRESS', _inProgress, Colors.blue, theme),
                            const SizedBox(width: 16),
                            _buildColumn('DONE', _done, Colors.green, theme),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }

  Widget _buildPhaseChip(Map<String, dynamic> sprint, bool isSelected, ThemeData theme) {
    return GestureDetector(
      onTap: () => _onSprintChanged(sprint),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? theme.primaryColor : Colors.grey[100],
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? theme.primaryColor : Colors.grey[300]!,
            width: 1,
          ),
          boxShadow: isSelected 
              ? [BoxShadow(color: theme.primaryColor.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 4))] 
              : null,
        ),
        child: Center(
          child: Text(
            sprint['sprintName'] ?? 'Giai đoạn ${sprint['sprintId']}',
            style: TextStyle(
              color: isSelected ? Colors.white : Colors.grey[700],
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildColumn(String title, List<Issue> tasks, Color color, ThemeData theme) {
    return Container(
      width: 280,
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Container(
                  width: 12, height: 12,
                  decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                ),
                const SizedBox(width: 8),
                Text(
                  '$title (${tasks.length})', 
                  style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey[800])
                ),
              ],
            ),
          ),
          
          // Tasks List
          Flexible(
            child: ListView.builder(
              shrinkWrap: true,
              physics: const ClampingScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              itemCount: tasks.length,
              itemBuilder: (context, index) {
                return _buildKanbanCard(tasks[index], theme);
              },
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildKanbanCard(Issue task, ThemeData theme) {
    return Card(
      elevation: 2,
      shadowColor: Colors.black12,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () async {
          final result = await Navigator.pushNamed(
            context, 
            AppRouter.issueDetail, 
            arguments: {'issueId': task.issueId}
          );
          if (result == true && _selectedSprint != null) {
            _fetchIssues(_selectedSprint!['sprintId']);
          }
        },
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
               Text(
                 task.title,
                 style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, height: 1.3),
                 maxLines: 2,
                 overflow: TextOverflow.ellipsis,
               ),
               const SizedBox(height: 8),
               Row(
                 mainAxisAlignment: MainAxisAlignment.spaceBetween,
                 children: [
                   if (task.assigneeAvatarUrl != null)
                     CircleAvatar(
                       radius: 10,
                       backgroundImage: NetworkImage(task.assigneeAvatarUrl!),
                     )
                   else 
                     CircleAvatar(radius: 10, backgroundColor: Colors.grey[300], child: Text(task.assigneeName?[0] ?? '?', style: const TextStyle(fontSize: 8))),
                     
                   Container(
                     padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                     decoration: BoxDecoration(
                       color: Colors.grey[100],
                       borderRadius: BorderRadius.circular(4),
                     ),
                     child: Text(
                       task.issueKey,
                       style: TextStyle(fontSize: 10, color: Colors.grey[600]),
                     ),
                   ),
                 ],
               )
            ],
          ),
        ),
      ),
    );
  }
}
