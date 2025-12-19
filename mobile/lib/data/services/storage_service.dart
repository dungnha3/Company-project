import 'dart:io';
import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:mime/mime.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/config/app_constants.dart';
import 'package:mobile/data/services/api_service.dart';
import 'package:mobile/data/models/storage_models.dart';

class StorageService {
  final ApiService _apiService = ApiService();

  Future<List<StorageFile>> getMyFiles(String filter) async {
    // filter: personal, project, company, trash
    final response = await _apiService.get('/storage/files/my-files?filter=$filter');
    if (response is List) {
      return response.map((json) => StorageFile.fromJson(json)).toList();
    }
    return [];
  }

  Future<List<StorageFolder>> getMyFolders(String filter) async {
    final response = await _apiService.get('/storage/folders/my-folders?filter=$filter');
    if (response is List) {
      return response.map((json) => StorageFolder.fromJson(json)).toList();
    }
    return [];
  }

  Future<List<StorageFile>> getFolderFiles(int folderId) async {
    final response = await _apiService.get('/storage/folders/$folderId/files');
    if (response is List) {
      return response.map((json) => StorageFile.fromJson(json)).toList();
    }
    return [];
  }

  Future<List<StorageFolder>> getSubFolders(int folderId) async {
    final response = await _apiService.get('/storage/folders/$folderId/subfolders');
    if (response is List) {
      return response.map((json) => StorageFolder.fromJson(json)).toList();
    }
    return [];
  }

  Future<StorageFolder> createFolder(String name, int? parentFolderId, String folderType, int? projectId) async {
    final body = {
      'name': name,
      'parentFolderId': parentFolderId,
      'folderType': folderType, // PERSONAL or PROJECT
      'projectId': projectId,
    };
    final response = await _apiService.post('/storage/folders', body);
    return StorageFolder.fromJson(response);
  }

  Future<void> deleteFile(int fileId) async {
    await _apiService.delete('/storage/files/$fileId');
  }

  Future<void> deleteFolder(int folderId) async {
    await _apiService.delete('/storage/folders/$folderId');
  }

  Future<File> downloadFile(int fileId, String filename) async {
    if (kIsWeb) {
      throw Exception('Tính năng tải xuống chưa hỗ trợ trên trình duyệt. Vui lòng thử trên Mobile App hoặc giả lập.');
    }

    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token');
    
    final uri = Uri.parse('${AppConstants.baseUrl}/storage/files/$fileId/download');
    final response = await http.get(
      uri,
      headers: {
        if (token != null) 'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode == 200) {
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/$filename');
      await file.writeAsBytes(response.bodyBytes);
      return file;
    } else {
      throw Exception('Failed to download file (Status: ${response.statusCode})');
    }
  }

  Future<List<StorageFile>> getProjectFiles(int projectId) async {
    final allProjectFiles = await getMyFiles('project');
    return allProjectFiles.where((f) => f.projectId == projectId).toList();
  }

  Future<String?> uploadFile(PlatformFile file, int? folderId) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token');
    
    final uri = Uri.parse('${AppConstants.baseUrl}/storage/files/upload');
    final request = http.MultipartRequest('POST', uri);

    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }

    if (folderId != null) {
      request.fields['folderId'] = folderId.toString();
    }

    http.MultipartFile multipartFile;
    MediaType? mediaType;
    
    // Attempt to determine mime type
    final mime = lookupMimeType(file.name);
    if (mime != null) {
      final split = mime.split('/');
      mediaType = MediaType(split[0], split[1]);
    }

    if (file.bytes != null) {
      // Web or bytes populated
      multipartFile = http.MultipartFile.fromBytes(
        'file',
        file.bytes!,
        filename: file.name,
        contentType: mediaType,
      );
    } else if (file.path != null) {
       // Mobile/Desktop with path
       multipartFile = await http.MultipartFile.fromPath(
        'file',
        file.path!,
        filename: file.name,
        contentType: mediaType,
      );
    } else {
      throw Exception('File content missing (no bytes or path)');
    }

    request.files.add(multipartFile);

    final response = await request.send();
    if (response.statusCode == 201 || response.statusCode == 200) {
       final respStr = await response.stream.bytesToString();
       try {
           final json = jsonDecode(respStr) as Map<String, dynamic>;
           return json['fileDownloadUri'] ?? json['fileUrl'];
       } catch(e) {
           return null;
       }
    } else {
       throw Exception('Failed to upload file');
    }
  }
}
