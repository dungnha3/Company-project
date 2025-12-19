class StorageFile {
  final int fileId;
  final String originalFilename;
  final String? fileUrl;
  final int size;
  final String mimeType;
  final DateTime createdAt;
  final String ownerName;
  final int? projectId;

  StorageFile({
    required this.fileId,
    required this.originalFilename,
    this.fileUrl,
    required this.size,
    required this.mimeType,
    required this.createdAt,
    required this.ownerName,
    this.projectId,
  });

  factory StorageFile.fromJson(Map<String, dynamic> json) {
    return StorageFile(
      fileId: json['fileId'] ?? 0,
      originalFilename: json['originalFilename'] ?? 'Unnamed',
      fileUrl: json['fileUrl'], // Note: Backend might not return this, handled via fileId
      size: json['fileSize'] ?? 0,
      mimeType: json['mimeType'] ?? '',
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
      ownerName: json['ownerName'] ?? '',
      projectId: json['projectId'],
    );
  }
}

class StorageFolder {
  final int folderId;
  final String folderName;
  final int fileCount;
  final DateTime createdAt;
  final String ownerName;

  StorageFolder({
    required this.folderId,
    required this.folderName,
    required this.fileCount,
    required this.createdAt,
    required this.ownerName,
  });

  factory StorageFolder.fromJson(Map<String, dynamic> json) {
    // Backend DTO might use 'name' or 'folderName'. Checking StorageController mapper is implicit, 
    // but based on FE Web it was 'name' and 'folderId'.
    return StorageFolder(
      folderId: json['folderId'] ?? 0,
      folderName: json['name'] ?? json['folderName'] ?? 'Unnamed',
      fileCount: json['fileCount'] ?? 0,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
      ownerName: json['ownerName'] ?? '',
    );
  }
}
