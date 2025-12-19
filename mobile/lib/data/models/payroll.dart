class Payroll {
  final int bangluongId;
  final int thang;
  final int nam;
  final double luongCoBan;
  final double phuCap;
  final double thuong;
  final int ngayCong;
  final int ngayCongChuan;
  final double luongTheoNgayCong;
  final int gioLamThem;
  final double tienLamThem;
  // Individual insurance fields from backend
  final double bhxh;
  final double bhyt;
  final double bhtn;
  final double thueTNCN;
  final double khauTruKhac;
  final double tongLuong;
  final double tongKhauTru;
  final double luongThucNhan;
  final String trangThai;

  Payroll({
    required this.bangluongId,
    required this.thang,
    required this.nam,
    required this.luongCoBan,
    required this.phuCap,
    required this.thuong,
    required this.ngayCong,
    required this.ngayCongChuan,
    required this.luongTheoNgayCong,
    required this.gioLamThem,
    required this.tienLamThem,
    required this.bhxh,
    required this.bhyt,
    required this.bhtn,
    required this.thueTNCN,
    required this.khauTruKhac,
    required this.tongLuong,
    required this.tongKhauTru,
    required this.luongThucNhan,
    required this.trangThai,
  });

  // Convenience getters for UI
  double get totalInsurance => bhxh + bhyt + bhtn;
  double get thucNhan => luongThucNhan;  // Alias for backward compatibility

  factory Payroll.fromJson(Map<String, dynamic> json) {
    return Payroll(
      bangluongId: json['bangluongId'] ?? 0,
      thang: json['thang'] ?? 0,
      nam: json['nam'] ?? 0,
      luongCoBan: (json['luongCoBan'] ?? 0).toDouble(),
      phuCap: (json['phuCap'] ?? 0).toDouble(),
      thuong: (json['thuong'] ?? 0).toDouble(),
      ngayCong: json['ngayCong'] ?? 0,
      ngayCongChuan: json['ngayCongChuan'] ?? 26,
      luongTheoNgayCong: (json['luongTheoNgayCong'] ?? 0).toDouble(),
      gioLamThem: json['gioLamThem'] ?? 0,
      tienLamThem: (json['tienLamThem'] ?? 0).toDouble(),
      bhxh: (json['bhxh'] ?? 0).toDouble(),
      bhyt: (json['bhyt'] ?? 0).toDouble(),
      bhtn: (json['bhtn'] ?? 0).toDouble(),
      thueTNCN: (json['thueTNCN'] ?? 0).toDouble(),
      khauTruKhac: (json['khauTruKhac'] ?? 0).toDouble(),
      tongLuong: (json['tongLuong'] ?? 0).toDouble(),
      tongKhauTru: (json['tongKhauTru'] ?? 0).toDouble(),
      luongThucNhan: (json['luongThucNhan'] ?? 0).toDouble(),
      trangThai: json['trangThai'] ?? 'UNKNOWN',
    );
  }
}

