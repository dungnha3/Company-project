import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/app_constants.dart';
import '../../data/services/storage_service.dart';
import 'package:flutter/material.dart';
import '../../data/services/project_service.dart';
import '../../data/models/issue.dart';
import '../../data/models/issue_activity.dart';
import '../../screens/projects/edit_issue_screen.dart';

class IssueDetailScreen extends StatefulWidget {
  final int taskId;

  const IssueDetailScreen({super.key, required this.taskId});

  @override
  State<IssueDetailScreen> createState() => _IssueDetailScreenState();
}

class _IssueDetailScreenState extends State<IssueDetailScreen> {
  final ProjectService _projectService = ProjectService();
  final StorageService _storageService = StorageService();
  
  bool _isLoading = true;
  Issue? _task;
  final _commentController = TextEditingController();
  bool _isSendingComment = false;
  bool _isUploading = false;
  
  // Feature 5: Activity Log
  List<IssueActivity> _activities = [];
  int _selectedTabIndex = 0; // 0: Comments, 1: Activities

  @override
  void initState() {
    super.initState();
    _fetchTaskDetail();
  }

  Future<void> _fetchTaskDetail() async {
    setState(() => _isLoading = true);
    try {
      print('[IssueDetail] Fetching issue ${widget.taskId}...');
      final data = await _projectService.getTaskDetail(widget.taskId);
      final activities = await _projectService.getIssueActivities(widget.taskId);
      print('[IssueDetail] Got data: $data');
      setState(() {
        _task = data;
        _activities = activities;
      });
    } catch (e) {
      print('[IssueDetail] ERROR fetching: $e');
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi tải chi tiết: $e')),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _pickAndUploadFile() async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        withData: true, 
      );

        if (result != null && result.files.isNotEmpty) {
        setState(() => _isUploading = true);
        PlatformFile file = result.files.first;
        
        String? url = await _storageService.uploadFile(file, null);
        
        if (url != null) {
          String fileName = result.files.single.name;
          // Append to comment field
          String currentText = _commentController.text;
          String attachmentLink = 'Attached file: [$fileName]($url)';
          _commentController.text = currentText.isEmpty ? attachmentLink : '$currentText\n$attachmentLink';
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error uploading: $e')));
      }
    } finally {
      setState(() => _isUploading = false);
    }
  }

  Future<void> _updateStatus(int statusId) async {
    try {
      print('[IssueDetail] Updating status to $statusId...');
      await _projectService.updateTaskStatus(widget.taskId, statusId);
      print('[IssueDetail] Status updated successfully');
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(Icons.check_circle, color: Colors.white),
              const SizedBox(width: 10),
              Expanded(child: Text('✅ Cập nhật trạng thái thành công')),
            ],
          ),
          backgroundColor: Colors.green.shade600,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          margin: const EdgeInsets.all(16),
        ),
      );
      _fetchTaskDetail(); // Refresh to show updated status/logs
    } catch (e) {
      print('[IssueDetail] ERROR updating status: $e');
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.error_outline, color: Colors.white),
                const SizedBox(width: 10),
                Expanded(child: Text('Lỗi cập nhật: $e')),
              ],
            ),
            backgroundColor: Colors.red.shade600,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            margin: const EdgeInsets.all(16),
          ),
        );
      }
    }
  }

  Future<void> _addComment() async {
    if (_commentController.text.trim().isEmpty) return;

    setState(() => _isSendingComment = true);
    try {
      print('[IssueDetail] Adding comment to issue ${widget.taskId}...');
      await _projectService.addComment(widget.taskId, _commentController.text);
      print('[IssueDetail] Comment added successfully');
      _commentController.clear();
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                const SizedBox(width: 10),
                Expanded(child: Text('Đã thêm comment')),
              ],
            ),
            backgroundColor: Colors.green.shade600,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            margin: const EdgeInsets.all(16),
            duration: const Duration(seconds: 2),
          ),
        );
      }
      _fetchTaskDetail(); // Refresh to show new comment
    } catch (e) {
      print('[IssueDetail] ERROR adding comment: $e');
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.error_outline, color: Colors.white),
                const SizedBox(width: 10),
                Expanded(child: Text('Lỗi gửi comment: $e')),
              ],
            ),
            backgroundColor: Colors.red.shade600,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            margin: const EdgeInsets.all(16),
          ),
        );
      }
    } finally {
      setState(() => _isSendingComment = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (_isLoading) return Scaffold(backgroundColor: theme.scaffoldBackgroundColor, body: Center(child: CircularProgressIndicator(color: theme.primaryColor)));
    if (_task == null) return Scaffold(backgroundColor: theme.scaffoldBackgroundColor, body: const Center(child: Text('Không tìm thấy công việc')));

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('Chi tiết công việc'),
        backgroundColor: theme.primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () async {
              if (_task != null) {
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => EditIssueScreen(issue: _task!)),
                );
                if (result == true) {
                  _fetchTaskDetail();
                }
              }
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Card
            Card(
              elevation: 2,
              shadowColor: Colors.black12,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _task!.title,
                      style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _buildStatusChip(_task!.statusName, theme),
                        const SizedBox(width: 10),
                        _buildPriorityChip(_task!.priority, theme),
                      ],
                    ),
                    const Divider(height: 30),
                    Text(
                      _task!.description.isNotEmpty ? _task!.description : 'Không có mô tả',
                      style: TextStyle(color: Colors.grey[800], height: 1.6, fontSize: 15),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Icon(Icons.person_outline, size: 18, color: Colors.grey[600]),
                        const SizedBox(width: 8),
                        Text('Người giao: ${_task!.reporterName ?? "N/A"}', style: TextStyle(color: Colors.grey[600])),
                      ],
                    ),
                    const SizedBox(height: 5),
                    Row(
                      children: [
                        Icon(Icons.calendar_today, size: 18, color: Colors.grey[600]),
                        const SizedBox(width: 8),
                        Text('Hạn chót: ${_task!.dueDate ?? "N/A"}', style: TextStyle(color: Colors.grey[600])),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 25),

            // Status Action
            Text('Cập nhật trạng thái', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
              Row(
                children: [
                  // Backend: statusId=1: To Do, statusId=2: In Progress, statusId=4: Done
                  Expanded(child: _buildStatusButton('To Do', 1, Colors.grey, theme)),
                  const SizedBox(width: 10),
                  Expanded(child: _buildStatusButton('In Progress', 2, theme.colorScheme.secondary, theme)),
                  const SizedBox(width: 10),
                  Expanded(child: _buildStatusButton('Done', 4, theme.colorScheme.primary, theme)),
                ],
              ),

            const SizedBox(height: 30),

            // Attachments (Placeholder)
            Text('Tài liệu đính kèm', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            InkWell(
              onTap: _isUploading ? null : _pickAndUploadFile,
              child: Container(
                height: 80,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300, style: BorderStyle.solid),
                  borderRadius: BorderRadius.circular(12),
                  color: Colors.grey.shade50,
                ),
                child: Center(
                  child: _isUploading 
                    ? const CircularProgressIndicator()
                    : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.attach_file, color: Colors.grey.shade400),
                        const SizedBox(width: 8),
                        Text('Nhấn để đính kèm tài liệu', style: TextStyle(color: Colors.grey.shade500)),
                      ],
                    ),
                ),
              ),
            ),

            const SizedBox(height: 30),

            // Tabs: Comments | Activities
            Container(
              decoration: BoxDecoration(
                 color: Colors.grey[200],
                 borderRadius: BorderRadius.circular(25),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedTabIndex = 0),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: _selectedTabIndex == 0 ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(25),
                          boxShadow: _selectedTabIndex == 0 ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)] : [],
                        ),
                        child: Text(
                          'Bình luận (${_task!.comments.length})',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _selectedTabIndex == 0 ? theme.primaryColor : Colors.grey[600],
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedTabIndex = 1),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: _selectedTabIndex == 1 ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(25),
                          boxShadow: _selectedTabIndex == 1 ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)] : [],
                        ),
                        child: Text(
                          'Hoạt động',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _selectedTabIndex == 1 ? theme.primaryColor : Colors.grey[600],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 16),
            
            if (_selectedTabIndex == 0)
              // Comments View
              Card(
                elevation: 2,
                shadowColor: Colors.black12,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      // Comment Input
                      Row(
                        children: [
                          IconButton(
                            icon: _isUploading 
                                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) 
                                : const Icon(Icons.attach_file, color: Colors.grey),
                            onPressed: (_isUploading || _isSendingComment) ? null : _pickAndUploadFile,
                          ),
                          Expanded(
                            child: TextField(
                              controller: _commentController,
                              decoration: InputDecoration(
                                hintText: 'Viết bình luận...',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(25), borderSide: BorderSide.none),
                                filled: true,
                                fillColor: Colors.grey[100],
                                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          CircleAvatar(
                            backgroundColor: theme.primaryColor,
                            child: IconButton(
                              icon: _isSendingComment 
                                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                  : const Icon(Icons.send, color: Colors.white, size: 20),
                              onPressed: _isSendingComment ? null : _addComment,
                            ),
                          ),
                        ],
                      ),
                      const Divider(height: 30),
                      
                      // Comments List
                      if (_task!.comments.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 20),
                          child: Text('Chưa có bình luận nào', style: TextStyle(color: Colors.grey)),
                        )
                      else
                        ..._task!.comments.map((comment) => _buildCommentItem(comment, theme)),
                    ],
                  ),
                ),
              )
            else
              // Activities View
              Card(
                elevation: 2,
                shadowColor: Colors.black12,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                       if (_activities.isEmpty)
                         const Padding(
                           padding: EdgeInsets.symmetric(vertical: 20),
                           child: Text('Chưa có hoạt động nào', style: TextStyle(color: Colors.grey)),
                         )
                       else
                         ..._activities.map((activity) => _buildActivityItem(activity, theme)),
                    ],
                  ),
                ),
              ),

          ],
        ),
      ),
    );
  }

  Widget _buildStatusButton(String statusLabel, int statusId, Color color, ThemeData theme) {
    // Normalize comparison: "To Do" vs "to do" or "TO DO"
    final currentStatus = _task!.statusName.toLowerCase().trim();
    final buttonStatus = statusLabel.toLowerCase().trim();
    bool isSelected = currentStatus == buttonStatus || currentStatus.contains(buttonStatus.replaceAll(' ', ''));
    
    return ElevatedButton(
      onPressed: isSelected ? null : () => _updateStatus(statusId),
      style: ElevatedButton.styleFrom(
        backgroundColor: isSelected ? color : Colors.white,
        foregroundColor: isSelected ? Colors.white : color,
        side: BorderSide(color: color),
        elevation: isSelected ? 2 : 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        padding: const EdgeInsets.symmetric(vertical: 12),
      ),
      child: Text(
        statusLabel,
        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildStatusChip(String status, ThemeData theme) {
    Color color = Colors.grey;
    final statusLower = status.toLowerCase();
    if (statusLower.contains('progress') || statusLower.contains('review')) {
      color = theme.colorScheme.secondary;
    } else if (statusLower.contains('done') || statusLower.contains('complete')) {
      color = theme.colorScheme.primary;
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Text(
        status,
        style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildPriorityChip(String priority, ThemeData theme) {
    Color color = theme.colorScheme.primary;
    if (priority == 'HIGH') color = theme.colorScheme.error;
    if (priority == 'MEDIUM') color = Colors.orange;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.5)),
      ),
      child: Text(
        priority,
        style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold),
      ),
    );
  }

  Future<void> _launchAttachment(String url) async {
    final uri = Uri.parse(url.startsWith('http') ? url : '${AppConstants.baseUrl}$url');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Không thể mở liên kết')));
      }
    }
  }

  Widget _buildCommentItem(Comment comment, ThemeData theme) {
    // Parse content for attachment
    String textContent = comment.content;
    String? attachmentName;
    String? attachmentUrl;

    if (comment.content.contains('Attached file: [')) {
      final parts = comment.content.split('Attached file: ');
      if (parts.length > 1) {
        textContent = parts[0].trim();
        final attachmentPart = parts[1];
        final RegExp regex = RegExp(r'\[(.*?)\]\((.*?)\)');
        final match = regex.firstMatch(attachmentPart);
        if (match != null) {
          attachmentName = match.group(1);
          attachmentUrl = match.group(2);
        }
      }
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: theme.primaryColor.withOpacity(0.1),
            child: Text(comment.authorName.isNotEmpty ? comment.authorName[0].toUpperCase() : 'U', 
              style: TextStyle(fontSize: 14, color: theme.primaryColor, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      comment.authorName,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    Text(
                      comment.createdAt,
                      style: TextStyle(color: Colors.grey[500], fontSize: 11),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                if (textContent.isNotEmpty)
                  Text(textContent, style: const TextStyle(fontSize: 14, height: 1.4)),
                
                if (attachmentName != null && attachmentUrl != null) ...[
                  const SizedBox(height: 8),
                  InkWell(
                    onTap: () => _launchAttachment(attachmentUrl!),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.blue.withValues(alpha: 0.05),
                        border: Border.all(color: Colors.blue.withValues(alpha: 0.2)),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.description, color: Colors.blue, size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  attachmentName,
                                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 2),
                                const Text(
                                  'Nhấn để xem',
                                  style: TextStyle(fontSize: 11, color: Colors.blue),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.download_rounded, color: Colors.blue, size: 20),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActivityItem(IssueActivity activity, ThemeData theme) {
    IconData icon = Icons.info_outline;
    Color color = Colors.grey;
    String actionText = activity.activityType;

    // Map Backend Enum to UI
    if (activity.activityType == 'CREATE') {
      icon = Icons.add_circle_outline;
      color = Colors.green;
      actionText = 'đã tạo công việc';
    } else if (activity.activityType == 'UPDATE') {
      icon = Icons.edit;
      color = Colors.blue;
      actionText = 'đã cập nhật';
    } else if (activity.activityType == 'STATUS_CHANGE') {
      icon = Icons.swap_horiz;
      color = Colors.orange;
      actionText = 'đã đổi trạng thái';
    } else if (activity.activityType == 'COMMENT') {
      icon = Icons.comment;
      color = Colors.purple;
      actionText = 'đã bình luận';
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: color.withOpacity(0.1),
            child: Icon(icon, size: 16, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                RichText(
                  text: TextSpan(
                    style: const TextStyle(color: Colors.black87, fontSize: 13),
                    children: [
                      TextSpan(text: activity.userName, style: const TextStyle(fontWeight: FontWeight.bold)),
                      TextSpan(text: ' $actionText'),
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                if (activity.fieldName != null)
                   Container(
                     margin: const EdgeInsets.only(bottom: 4),
                     padding: const EdgeInsets.all(8),
                     decoration: BoxDecoration(
                       color: Colors.grey[50],
                       borderRadius: BorderRadius.circular(8),
                       border: Border.all(color: Colors.grey[200]!),
                     ),
                     child: Text(
                      '${activity.fieldName}: ${activity.oldValue ?? "Trống"} -> ${activity.newValue ?? "Trống"}',
                      style: TextStyle(fontSize: 12, color: Colors.grey[800], fontStyle: FontStyle.italic),
                    ),
                   ),
                if (activity.description != null && activity.description!.isNotEmpty)
                   Text(
                    activity.description!,
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                const SizedBox(height: 2),
                Text(
                  activity.createdAt,
                  style: TextStyle(fontSize: 10, color: Colors.grey[400]),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
