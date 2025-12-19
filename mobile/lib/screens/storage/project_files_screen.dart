import 'package:flutter/material.dart';
import 'package:open_file/open_file.dart';
import 'package:intl/intl.dart';
import '../../data/services/storage_service.dart';
import '../../data/models/storage_models.dart';
import '../../config/app_colors.dart';

class ProjectFilesScreen extends StatefulWidget {
  final int projectId;
  final String projectName;

  const ProjectFilesScreen({super.key, required this.projectId, required this.projectName});

  @override
  State<ProjectFilesScreen> createState() => _ProjectFilesScreenState();
}

class _ProjectFilesScreenState extends State<ProjectFilesScreen> {
  final StorageService _storageService = StorageService();
  bool _isLoading = true;
  List<StorageFile> _files = [];

  @override
  void initState() {
    super.initState();
    _fetchFiles();
  }

  Future<void> _fetchFiles() async {
    setState(() => _isLoading = true);
    try {
      // Backend doesn't support getProjectFiles directly yet? 
      // I implemented getProjectFiles in StorageService to filter getMyFiles('project').
      final files = await _storageService.getProjectFiles(widget.projectId);
      if (mounted) {
        setState(() {
          _files = files;
        });
      }
    } catch (e) {
      if (mounted) {
         ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi tải tài liệu dự án: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _downloadAndOpenFile(StorageFile file) async {
    try {
       ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Đang tải file...')));
       final downloadedFile = await _storageService.downloadFile(file.fileId, file.originalFilename);
       final result = await OpenFile.open(downloadedFile.path);
       if (result.type != ResultType.done) {
          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Không thể mở file: ${result.message}')));
       }
    } catch (e) {
       if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi tải file: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Tài liệu: ${widget.projectName}'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      backgroundColor: const Color(0xFFF5F7FA),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _files.isEmpty
              ? _buildEmptyState()
              : RefreshIndicator(
                  onRefresh: _fetchFiles,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _files.length,
                    itemBuilder: (context, index) {
                      return _buildFileItem(_files[index]);
                    },
                  ),
                ),
    );
  }

  Widget _buildEmptyState() {
     return Center(
       child: Column(
         mainAxisAlignment: MainAxisAlignment.center,
         children: [
           Icon(Icons.folder_open, size: 80, color: Colors.grey[300]),
           const SizedBox(height: 16),
           Text(
             'Chưa có tài liệu nào',
             style: TextStyle(color: Colors.grey[500], fontSize: 16),
           ),
         ],
       ),
     );
  }

  Widget _buildFileItem(StorageFile file) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
         boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 4, offset: const Offset(0, 1))],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(12),
        leading: _buildFileIcon(file.mimeType),
        title: Text(
          file.originalFilename,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
             const SizedBox(height: 4),
             Text(
                'Size: ${(file.size / 1024).toStringAsFixed(1)} KB',
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
             ),
             Text(
                'Ngày: ${DateFormat('dd/MM/yyyy HH:mm').format(file.createdAt)}',
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
             ),
          ],
        ),
        trailing: IconButton(
          icon: const Icon(Icons.download_rounded, color: Colors.blue),
          onPressed: () => _downloadAndOpenFile(file),
        ),
        onTap: () => _downloadAndOpenFile(file),
      ),
    );
  }

  Widget _buildFileIcon(String mimeType) {
    IconData icon = Icons.insert_drive_file;
    Color color = Colors.grey;

    if (mimeType.contains('image')) {
       icon = Icons.image;
       color = Colors.purple;
    } else if (mimeType.contains('pdf')) {
       icon = Icons.picture_as_pdf;
       color = Colors.red;
    } else if (mimeType.contains('word') || mimeType.contains('document')) {
       icon = Icons.description;
       color = Colors.blue;
    } else if (mimeType.contains('excel') || mimeType.contains('sheet')) {
       icon = Icons.table_chart;
       color = Colors.green;
    }

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Icon(icon, color: color),
    );
  }
}
