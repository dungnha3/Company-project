package DoAn.BE.hr.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.hr.dto.HopDongRequest;
import DoAn.BE.hr.entity.HopDong;
import DoAn.BE.hr.entity.HopDong.TrangThaiHopDong;
import DoAn.BE.hr.entity.NhanVien;
import DoAn.BE.hr.repository.HopDongRepository;
import DoAn.BE.hr.repository.NhanVienRepository;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class HopDongService {

    private final HopDongRepository hopDongRepository;
    private final NhanVienRepository nhanVienRepository;

    public HopDongService(HopDongRepository hopDongRepository, NhanVienRepository nhanVienRepository) {
        this.hopDongRepository = hopDongRepository;
        this.nhanVienRepository = nhanVienRepository;
    }

    // Tạo hợp đồng mới
    public HopDong createHopDong(HopDongRequest request) {
        NhanVien nhanVien = nhanVienRepository.findById(request.getNhanvienId())
                .orElseThrow(() -> new EntityNotFoundException("Nhân viên không tồn tại"));
        if (request.getNgayKetThuc() != null &&
                request.getNgayKetThuc().isBefore(request.getNgayBatDau())) {
            throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu");
        }

        HopDong hopDong = new HopDong();
        hopDong.setNhanVien(nhanVien);
        hopDong.setLoaiHopDong(request.getLoaiHopDong());
        hopDong.setNgayBatDau(request.getNgayBatDau());
        hopDong.setNgayKetThuc(request.getNgayKetThuc());
        hopDong.setLuongCoBan(request.getLuongCoBan());
        hopDong.setNoiDung(request.getNoiDung());
        hopDong.setTrangThai(TrangThaiHopDong.HIEU_LUC);

        return hopDongRepository.save(hopDong);
    }

    // Lấy thông tin hợp đồng theo ID
    public HopDong getHopDongById(Long id) {
        return hopDongRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Hợp đồng không tồn tại"));
    }

    /**
     * Lấy danh sách tất cả hợp đồng
     */
    public List<HopDong> getAllHopDong() {
        return hopDongRepository.findAll();
    }

    /**
     * Cập nhật hợp đồng
     */
    public HopDong updateHopDong(Long id, HopDongRequest request) {
        HopDong hopDong = getHopDongById(id);

        // Không cho đổi nhân viên
        if (request.getNhanvienId() != null &&
                !request.getNhanvienId().equals(hopDong.getNhanVien().getNhanvienId())) {
            throw new BadRequestException("Không thể thay đổi nhân viên");
        }

        // Cập nhật các trường
        if (request.getLoaiHopDong() != null) {
            hopDong.setLoaiHopDong(request.getLoaiHopDong());
        }
        if (request.getNgayBatDau() != null) {
            hopDong.setNgayBatDau(request.getNgayBatDau());
        }
        if (request.getNgayKetThuc() != null) {
            hopDong.setNgayKetThuc(request.getNgayKetThuc());
        }
        if (request.getLuongCoBan() != null) {
            hopDong.setLuongCoBan(request.getLuongCoBan());
        }
        if (request.getNoiDung() != null) {
            hopDong.setNoiDung(request.getNoiDung());
        }

        // Validate lại ngày
        if (hopDong.getNgayKetThuc() != null &&
                hopDong.getNgayKetThuc().isBefore(hopDong.getNgayBatDau())) {
            throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu");
        }

        return hopDongRepository.save(hopDong);
    }

    /**
     * Xóa hợp đồng
     */
    public void deleteHopDong(Long id) {
        HopDong hopDong = getHopDongById(id);
        hopDongRepository.delete(hopDong);
    }

    /**
     * Lấy hợp đồng theo nhân viên
     */
    public List<HopDong> getHopDongByNhanVien(Long nhanvienId) {
        return hopDongRepository.findByNhanVien_NhanvienId(nhanvienId);
    }

    /**
     * Lấy hợp đồng hiệu lực của nhân viên
     */
    public HopDong getActiveHopDong(Long nhanvienId) {
        return hopDongRepository.findFirstByNhanVien_NhanvienIdAndTrangThaiOrderByNgayBatDauDesc(
                nhanvienId, TrangThaiHopDong.HIEU_LUC)
                .orElseThrow(() -> new EntityNotFoundException("Nhân viên không có hợp đồng hiệu lực"));
    }

    /**
     * Lấy hợp đồng theo trạng thái
     */
    public List<HopDong> getHopDongByTrangThai(TrangThaiHopDong trangThai) {
        return hopDongRepository.findByTrangThai(trangThai);
    }

    /**
     * Hủy hợp đồng
     */
    public HopDong cancelHopDong(Long id) {
        HopDong hopDong = getHopDongById(id);
        hopDong.setTrangThai(TrangThaiHopDong.BI_HUY);
        return hopDongRepository.save(hopDong);
    }

    /**
     * Gia hạn hợp đồng
     */
    public HopDong renewHopDong(Long id, LocalDate newEndDate) {
        HopDong hopDong = getHopDongById(id);

        if (hopDong.getTrangThai() != TrangThaiHopDong.HIEU_LUC) {
            throw new BadRequestException("Chỉ có thể gia hạn hợp đồng đang hiệu lực");
        }

        if (newEndDate.isBefore(LocalDate.now())) {
            throw new BadRequestException("Ngày gia hạn phải sau ngày hiện tại");
        }

        hopDong.setNgayKetThuc(newEndDate);
        return hopDongRepository.save(hopDong);
    }

    /**
     * Lấy danh sách hợp đồng sắp hết hạn (trong X ngày tới)
     */
    public List<HopDong> getExpiringContracts(int daysAhead) {
        LocalDate startDate = LocalDate.now();
        LocalDate endDate = startDate.plusDays(daysAhead);
        return hopDongRepository.findExpiringContracts(startDate, endDate);
    }

    /**
     * Cập nhật trạng thái hợp đồng hết hạn
     */
    public int updateExpiredContracts() {
        List<HopDong> expiredContracts = hopDongRepository.findExpiredContracts(LocalDate.now());
        expiredContracts.forEach(hd -> hd.setTrangThai(TrangThaiHopDong.HET_HAN));
        hopDongRepository.saveAll(expiredContracts);
        return expiredContracts.size();
    }

    /**
     * Kiểm tra nhân viên có hợp đồng hiệu lực không
     */
    public boolean hasActiveContract(Long nhanvienId) {
        return hopDongRepository.findFirstByNhanVien_NhanvienIdAndTrangThaiOrderByNgayBatDauDesc(
                nhanvienId, TrangThaiHopDong.HIEU_LUC).isPresent();
    }
}
