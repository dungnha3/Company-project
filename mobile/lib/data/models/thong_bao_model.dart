class ThongBaoModel {
  final int id;
  final String tieuDe;
  final String noiDung;
  final String loai;
  final String trangThai;
  final String uuTien;
  final String ngayTao;
  final bool guiEmail;

  ThongBaoModel({
    required this.id,
    required this.tieuDe,
    required this.noiDung,
    required this.loai,
    required this.trangThai,
    required this.uuTien,
    required this.ngayTao,
    required this.guiEmail,
  });

  factory ThongBaoModel.fromJson(Map<String, dynamic> json) {
    // Handle date array [yyyy, MM, dd, HH, mm, ss]
    String parseDate(dynamic dateVal) {
      if (dateVal == null) return '';
      if (dateVal is List) {
        if (dateVal.isEmpty) return '';
        final y = dateVal[0];
        final M = dateVal.length > 1 ? dateVal[1].toString().padLeft(2, '0') : '01';
        final d = dateVal.length > 2 ? dateVal[2].toString().padLeft(2, '0') : '01';
        final h = dateVal.length > 3 ? dateVal[3].toString().padLeft(2, '0') : '00';
        final m = dateVal.length > 4 ? dateVal[4].toString().padLeft(2, '0') : '00';
        return '$y-$M-${d}T$h:$m';
      }
      return dateVal.toString();
    }

    return ThongBaoModel(
      id: json['id'] ?? 0,
      tieuDe: json['tieuDe'] ?? '',
      noiDung: json['noiDung'] ?? '',
      loai: json['loai'] ?? 'CHUNG',
      trangThai: json['trangThai'] ?? 'CHUA_DOC',
      uuTien: json['uuTien'] ?? 'TRUNG_BINH',
      ngayTao: parseDate(json['ngayTao']),
      guiEmail: json['guiEmail'] ?? false,
    );
  }
}
