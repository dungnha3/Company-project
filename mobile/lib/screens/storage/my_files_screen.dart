import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:open_file/open_file.dart';
import 'package:mobile/config/app_colors.dart';
import 'package:mobile/data/models/storage_models.dart';
import 'package:mobile/data/services/storage_service.dart';
import 'package:intl/intl.dart';

class MyFilesScreen extends StatefulWidget {
  final bool isPicker;
  const MyFilesScreen({Key? key, this.isPicker = false}) : super(key: key);

  @override
  _MyFilesScreenState createState() => _MyFilesScreenState();
}

class _MyFilesScreenState extends State<MyFilesScreen> with SingleTickerProviderStateMixin {
  final StorageService _storageService = StorageService();
  
  List<StorageFolder> _folders = [];
  List<StorageFile> _files = [];
  bool _isLoading = true;
  String _filter = 'personal'; // personal, project, all
  
  int? _currentFolderId;
  String _currentFolderName = '';
  List<Map<String, dynamic>> _folderPath = [];

  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(_handleTabSelection);
    _loadData();
  }

  void _handleTabSelection() {
    if (_tabController.indexIsChanging) {
      setState(() {
        _currentFolderId = null;
        _folderPath.clear();
        switch (_tabController.index) {
          case 0: _filter = 'all'; break;
          case 1: _filter = 'personal'; break;
          case 2: _filter = 'project'; break;
        }
      });
      _loadData();
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      if (_currentFolderId != null) {
        // Load subfolders and files
        final folders = await _storageService.getSubFolders(_currentFolderId!);
        final files = await _storageService.getFolderFiles(_currentFolderId!);
        setState(() {
          _folders = folders;
          _files = files;
        });
      } else {
        // Load root folders and files based on filter
        final folders = await _storageService.getMyFolders(_filter);
        final files = await _storageService.getMyFiles(_filter);
        setState(() {
          _folders = folders;
          _files = files;
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi tải dữ liệu: $e')));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _navigateToFolder(StorageFolder folder) {
    setState(() {
      _currentFolderId = folder.folderId;
      _currentFolderName = folder.folderName;
      _folderPath.add({'id': folder.folderId, 'name': folder.folderName});
    });
    _loadData();
  }

  void _navigateUp() {
    if (_folderPath.isNotEmpty) {
      setState(() {
        _folderPath.removeLast();
        if (_folderPath.isEmpty) {
          _currentFolderId = null;
          _currentFolderName = '';
        } else {
          final last = _folderPath.last;
          _currentFolderId = last['id'];
          _currentFolderName = last['name'];
        }
      });
      _loadData();
    }
  }

  void _NavigateToPathIndex(int index) {
      setState(() {
          if (index == -1) {
             _currentFolderId = null;
             _currentFolderName = '';
             _folderPath.clear();
          } else {
             final target = _folderPath[index];
             _currentFolderId = target['id'];
             _currentFolderName = target['name'];
             _folderPath = _folderPath.sublist(0, index + 1);
          }
      });
      _loadData();
  }

  Future<void> _createNewFolder() async {
    final nameController = TextEditingController();
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Tạo thư mục mới'),
        content: TextField(
          controller: nameController,
          decoration: const InputDecoration(hintText: 'Tên thư mục'),
          autofocus: true,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Hủy')),
          TextButton(
            onPressed: () async {
              if (nameController.text.trim().isNotEmpty) {
                Navigator.pop(context);
                try {
                  // Type matches current view mode or default PERSONAL
                  String type = _filter == 'project' ? 'PROJECT' : 'PERSONAL';
                  if (_filter == 'all') type = 'PERSONAL'; // Default

                  await _storageService.createFolder(
                    nameController.text.trim(), 
                    _currentFolderId, 
                    type, 
                    null // projectId TODO if in project view
                  );
                  _loadData();
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi tạo thư mục: $e')));
                }
              }
            },
            child: const Text('Tạo'),
          ),
        ],
      ),
    );
  }

  Future<void> _uploadFile() async {
    try {
      final result = await FilePicker.platform.pickFiles();
      if (result != null) {
        setState(() => _isLoading = true);
        try {
          await _storageService.uploadFile(result.files.single, _currentFolderId);
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Upload thành công')));
          _loadData();
        } catch (e) {
             setState(() => _isLoading = false);
             ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Upload thất bại: $e')));
        }
      }
    } catch (e) {
      debugPrint('Pick file error: $e');
    }
  }

  Future<void> _downloadAndOpenFile(StorageFile file) async {
    try {
       ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Đang tải file...')));
       final downloadedFile = await _storageService.downloadFile(file.fileId, file.originalFilename);
       final result = await OpenFile.open(downloadedFile.path);
       if (result.type != ResultType.done) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Không thể mở file: ${result.message}')));
       }
    } catch (e) {
       ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi tải file: $e')));
    }
  }

  Future<void> _deleteFile(StorageFile file) async {
     final confirm = await showDialog<bool>(
       context: context,
       builder: (context) => AlertDialog(
         title: const Text('Xóa file?'),
         content: Text('Bạn có chắc muốn xóa "${file.originalFilename}"?'),
         actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Hủy')),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Xóa', style: TextStyle(color: Colors.red)),
            ),
         ],
       ),
     );

     if (confirm == true) {
       try {
         await _storageService.deleteFile(file.fileId);
         _loadData();
       } catch (e) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi xóa file: $e')));
       }
     }
  }

  Future<void> _deleteFolder(StorageFolder folder) async {
    final confirm = await showDialog<bool>(
       context: context,
       builder: (context) => AlertDialog(
         title: const Text('Xóa thư mục?'),
         content: Text('Bạn có chắc muốn xóa "${folder.folderName}" và toàn bộ nội dung trong đó?'),
         actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Hủy')),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Xóa', style: TextStyle(color: Colors.red)),
            ),
         ],
       ),
     );

     if (confirm == true) {
       try {
         await _storageService.deleteFolder(folder.folderId);
         _loadData();
       } catch (e) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi xóa thư mục: $e')));
       }
     }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        title: const Text('File của tôi'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Tất cả'),
            Tab(text: 'Cá nhân'),
            Tab(text: 'Dự án'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Breadcrumb
          if (_folderPath.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              color: Colors.white,
              width: double.infinity,
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    InkWell(
                      onTap: () => _NavigateToPathIndex(-1),
                      child: const Icon(Icons.home, color: Colors.grey),
                    ),
                    const SizedBox(width: 8),
                    ..._folderPath.asMap().entries.map((entry) {
                      final index = entry.key;
                      final folder = entry.value;
                      return Row(
                        children: [
                           const Icon(Icons.chevron_right, color: Colors.grey, size: 20),
                           const SizedBox(width: 4),
                           InkWell(
                             onTap: () => _NavigateToPathIndex(index),
                             child: Text(
                               folder['name'],
                               style: TextStyle(
                                 color: index == _folderPath.length - 1 ? AppColors.primary : Colors.black87,
                                 fontWeight: index == _folderPath.length - 1 ? FontWeight.bold : FontWeight.normal,
                               ),
                             ),
                           ),
                           const SizedBox(width: 8),
                        ],
                      );
                    }).toList(),
                  ],
                ),
              ),
            ),

          Expanded(
            child: _isLoading
                ? Center(child: CircularProgressIndicator(color: AppColors.primary))
                : (_folders.isEmpty && _files.isEmpty)
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _loadData,
                        child: ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            if (_folders.isNotEmpty) ...[
                              const Text('Thư mục', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 8),
                              GridView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2,
                                  childAspectRatio: 1.5,
                                  crossAxisSpacing: 12,
                                  mainAxisSpacing: 12,
                                ),
                                itemCount: _folders.length,
                                itemBuilder: (context, index) {
                                  final folder = _folders[index];
                                  return _buildFolderCard(folder);
                                },
                              ),
                              const SizedBox(height: 24),
                            ],

                            if (_files.isNotEmpty) ...[
                              const Text('File', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 8),
                              ..._files.map((file) => _buildFileItem(file)).toList(),
                            ],
                          ],
                        ),
                      ),
          ),
        ],
      ),
      floatingActionButton: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          FloatingActionButton(
             heroTag: 'createFolder',
             mini: true,
             backgroundColor: Colors.white,
             foregroundColor: AppColors.primary,
             onPressed: _createNewFolder,
             child: const Icon(Icons.create_new_folder),
          ),
          const SizedBox(height: 12),
          FloatingActionButton(
             heroTag: 'uploadFile',
             backgroundColor: AppColors.primary,
             onPressed: _uploadFile,
             child: const Icon(Icons.upload_file),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
     return Center(
       child: Column(
         mainAxisAlignment: MainAxisAlignment.center,
         children: [
           Icon(Icons.folder_open, size: 64, color: Colors.grey[300]),
           const SizedBox(height: 16),
           Text('Chưa có file hoặc thư mục nào', style: TextStyle(color: Colors.grey[600])),
         ],
       ),
     );
  }

  Widget _buildFolderCard(StorageFolder folder) {
    return InkWell(
      onTap: () => _navigateToFolder(folder),
      onLongPress: () => _deleteFolder(folder),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
             const Icon(Icons.folder, color: Colors.amber, size: 32),
             const SizedBox(height: 8),
             Text(
               folder.folderName,
               maxLines: 1,
               overflow: TextOverflow.ellipsis,
               style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
             ),
             Text(
               '${folder.fileCount} mục',
               style: const TextStyle(fontSize: 12, color: Colors.grey),
             ),
          ],
        ),
      ),
    );
  }

  Widget _buildFileItem(StorageFile file) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
         boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 2, offset: const Offset(0, 1))],
      ),
      child: ListTile(
        leading: _buildFileIcon(file.mimeType),
        title: Text(file.originalFilename, maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: Text(
           '${(file.size / 1024).toStringAsFixed(1)} KB • ${DateFormat('dd/MM/yyyy').format(file.createdAt)}',
           style: const TextStyle(fontSize: 12),
        ),
        trailing: widget.isPicker 
            ? const Icon(Icons.check_circle_outline, color: Colors.blue)
            : PopupMenuButton<String>(
          onSelected: (value) {
            if (value == 'download') _downloadAndOpenFile(file);
            if (value == 'delete') _deleteFile(file);
          },
          itemBuilder: (context) => [
             const PopupMenuItem(value: 'download', child: Row(children: [Icon(Icons.download, size: 18), SizedBox(width: 8), Text('Tải xuống & Mở')])),
             const PopupMenuItem(value: 'delete', child: Row(children: [Icon(Icons.delete, color: Colors.red, size: 18), SizedBox(width: 8), Text('Xóa', style: TextStyle(color: Colors.red))])),
          ],
        ),
        onTap: () {
            if (widget.isPicker) {
                Navigator.pop(context, file);
            } else {
                _downloadAndOpenFile(file);
            }
        },
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
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, color: color),
    );
  }
}
