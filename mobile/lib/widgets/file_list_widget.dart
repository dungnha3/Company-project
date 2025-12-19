import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/app_constants.dart';

class FileListWidget extends StatelessWidget {
  final List<Map<String, dynamic>> files;
  final bool isLoading;
  final VoidCallback onRefresh;

  const FileListWidget({
    super.key,
    required this.files,
    required this.isLoading,
    required this.onRefresh,
  });

  Future<void> _downloadFile(String? url) async {
    if (url == null) return;
    final uri = Uri.parse(url.startsWith('http') ? url : '${AppConstants.baseUrl}$url');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (files.isEmpty) {
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

    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: files.length,
        itemBuilder: (context, index) {
          final file = files[index];
          final fileName = file['fileName'] ?? 'Unknown';
          final uploadDate = file['uploadDate'] ?? '';
          final size = file['size'] ?? 0;
          final downloadUrl = file['downloadUrl'];
          
          // Determine icon based on extension
          IconData icon = Icons.insert_drive_file;
          Color iconColor = Colors.grey;
          
          if (fileName.endsWith('.pdf')) {
            icon = Icons.picture_as_pdf;
            iconColor = Colors.red;
          } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
            icon = Icons.description;
            iconColor = Colors.blue;
          } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
            icon = Icons.table_chart;
            iconColor = Colors.green;
          } else if (fileName.endsWith('.jpg') || fileName.endsWith('.png')) {
            icon = Icons.image;
            iconColor = Colors.purple;
          }

          return Card(
             elevation: 2,
             shadowColor: Colors.black12,
             shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
             margin: const EdgeInsets.only(bottom: 12),
             child: ListTile(
               contentPadding: const EdgeInsets.all(12),
               leading: Container(
                 width: 50, height: 50,
                 decoration: BoxDecoration(
                   color: iconColor.withOpacity(0.1),
                   borderRadius: BorderRadius.circular(10),
                 ),
                 child: Icon(icon, color: iconColor),
               ),
               title: Text(
                 fileName,
                 style: const TextStyle(fontWeight: FontWeight.bold),
                 maxLines: 1,
                 overflow: TextOverflow.ellipsis,
               ),
               subtitle: Column(
                 crossAxisAlignment: CrossAxisAlignment.start,
                 children: [
                   const SizedBox(height: 4),
                   Text('Size: ${(size / 1024).toStringAsFixed(1)} KB'),
                   Text('Date: $uploadDate'),
                 ],
               ),
               trailing: IconButton(
                 icon: const Icon(Icons.download_rounded, color: Colors.blue),
                 onPressed: () => _downloadFile(downloadUrl),
               ),
             ),
          );
        },
      ),
    );
  }
}
