class LeaveRequest {
  final int nghiphepId;
  final String loaiPhep;         // PHEP_NAM, OM, KO_LUONG, KHAC
  final String ngayBatDau;       // "2025-01-15"
  final String ngayKetThuc;      // "2025-01-17"
  final int soNgay;
  final String lyDo;
  final String trangThai;        // CHO_DUYET, PM_APPROVED, DA_DUYET, TU_CHOI
  
  // PM Approval (Step 1)
  final String? pmApproverName;
  final String? pmApprovedAt;
  final String? pmNote;
  
  // Accounting Approval (Step 2)
  final String? accountingApproverName;
  final String? accountingApprovedAt;
  final String? accountingNote;
  
  // Legacy/General
  final String? ghiChuDuyet;
  final String? createdAt;

  LeaveRequest({
    required this.nghiphepId,
    required this.loaiPhep,
    required this.ngayBatDau,
    required this.ngayKetThuc,
    required this.soNgay,
    required this.lyDo,
    required this.trangThai,
    this.pmApproverName,
    this.pmApprovedAt,
    this.pmNote,
    this.accountingApproverName,
    this.accountingApprovedAt,
    this.accountingNote,
    this.ghiChuDuyet,
    this.createdAt,
  });

  factory LeaveRequest.fromJson(Map<String, dynamic> json) {
    return LeaveRequest(
      nghiphepId: json['nghiphepId'] ?? 0,
      loaiPhep: json['loaiPhep'] ?? 'KHAC',
      ngayBatDau: json['ngayBatDau'] ?? '',
      ngayKetThuc: json['ngayKetThuc'] ?? '',
      soNgay: json['soNgay'] ?? 0,
      lyDo: json['lyDo'] ?? '',
      trangThai: json['trangThai'] ?? 'CHO_DUYET',
      pmApproverName: json['pmApprover']?['fullName'],
      pmApprovedAt: json['pmApprovedAt'],
      pmNote: json['pmNote'],
      accountingApproverName: json['accountingApprover']?['fullName'],
      accountingApprovedAt: json['accountingApprovedAt'],
      accountingNote: json['accountingNote'],
      ghiChuDuyet: json['ghiChuDuyet'],
      createdAt: json['createdAt'],
    );
  }
  
  // Helper getters
  bool get isPending => trangThai == 'CHO_DUYET';
  bool get isPMApproved => trangThai == 'PM_APPROVED';
  bool get isApproved => trangThai == 'DA_DUYET';
  bool get isRejected => trangThai == 'TU_CHOI';
  
  String get loaiPhepDisplay {
    switch (loaiPhep) {
      case 'PHEP_NAM': return 'Phép năm';
      case 'OM': return 'Nghỉ ốm';
      case 'KO_LUONG': return 'Không lương';
      default: return 'Khác';
    }
  }
  
  String get trangThaiDisplay {
    switch (trangThai) {
      case 'CHO_DUYET': return 'Chờ duyệt';
      case 'PM_APPROVED': return 'PM đã duyệt';
      case 'DA_DUYET': return 'Đã duyệt';
      case 'TU_CHOI': return 'Từ chối';
      default: return trangThai;
    }
  }
}
