class Attendance {
  final int chamcongId;
  final int nhanvienId;
  final String ngayCham;
  final String? gioVao;
  final String? gioRa;
  final String trangThai;
  final double? khoangCach;
  final String? diaChiCheckin;
  final String? ghiChu;

  Attendance({
    required this.chamcongId,
    required this.nhanvienId,
    required this.ngayCham,
    this.gioVao,
    this.gioRa,
    required this.trangThai,
    this.khoangCach,
    this.diaChiCheckin,
    this.ghiChu,
  });

  factory Attendance.fromJson(Map<String, dynamic> json) {
    return Attendance(
      chamcongId: json['chamcongId'] ?? 0,
      nhanvienId: json['nhanVien'] != null ? json['nhanVien']['nhanvienId'] : (json['nhanvienId'] ?? 0),
      ngayCham: json['ngayCham'] ?? DateTime.now().toString().substring(0, 10),
      gioVao: json['gioVao']?.toString(),
      gioRa: json['gioRa']?.toString(),
      trangThai: json['trangThai']?.toString() ?? 'UNKNOWN',
      khoangCach: json['khoangCach']?.toDouble(),
      diaChiCheckin: json['diaChiCheckin'],
      ghiChu: json['ghiChu'],
    );
  }
}
