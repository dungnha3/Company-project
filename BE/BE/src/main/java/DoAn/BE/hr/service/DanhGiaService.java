package DoAn.BE.hr.service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.util.PermissionUtil;
import DoAn.BE.hr.dto.DanhGiaRequest;
import DoAn.BE.hr.entity.DanhGia;
import DoAn.BE.hr.entity.DanhGia.TrangThaiDanhGia;
import DoAn.BE.hr.entity.NhanVien;
import DoAn.BE.hr.repository.DanhGiaRepository;
import DoAn.BE.hr.repository.NhanVienRepository;
import DoAn.BE.user.entity.User;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class DanhGiaService {
    
    private final DanhGiaRepository danhGiaRepository;
    private final NhanVienRepository nhanVienRepository;
    
    // Tạo đánh giá mới - HR Manager và Project Manager
    public DanhGia createDanhGia(DanhGiaRequest request, User currentUser) {
        if (!currentUser.isManagerHR() && !currentUser.isManagerProject()) {
            throw new ForbiddenException("Chỉ HR Manager và Project Manager mới có quyền tạo đánh giá");
        }
        
        log.info("User {} tạo đánh giá cho nhân viên ID: {}", currentUser.getUsername(), request.getNhanvienId());
        NhanVien nhanVien = nhanVienRepository.findById(request.getNhanvienId())
            .orElseThrow(() -> new EntityNotFoundException("Nhân viên không tồn tại"));
        Optional<DanhGia> existingDanhGia = danhGiaRepository.findByNhanVienAndKyAndLoai(
            request.getNhanvienId(), request.getKyDanhGia(), request.getLoaiDanhGia());
        
        if (existingDanhGia.isPresent()) {
            throw new BadRequestException("Nhân viên đã có đánh giá trong kỳ này");
        }
        NhanVien nguoiDanhGia = nhanVienRepository.findByUser_UserId(currentUser.getUserId())
            .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy thông tin nhân viên của người đánh giá"));
        
        // Kiểm tra ngày tháng hợp lệ
        if (request.getNgayKetThuc().isBefore(request.getNgayBatDau())) {
            throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu");
        }
        
        // Tạo đánh giá
        DanhGia danhGia = new DanhGia();
        danhGia.setNhanVien(nhanVien);
        danhGia.setNguoiDanhGia(nguoiDanhGia);
        danhGia.setKyDanhGia(request.getKyDanhGia());
        danhGia.setLoaiDanhGia(request.getLoaiDanhGia());
        
        // Điểm số
        danhGia.setDiemChuyenMon(request.getDiemChuyenMon());
        danhGia.setDiemThaiDo(request.getDiemThaiDo());
        danhGia.setDiemKyNangMem(request.getDiemKyNangMem());
        danhGia.setDiemDongDoi(request.getDiemDongDoi());
        
        // Thông tin đánh giá
        danhGia.setNhanXet(request.getNhanXet());
        danhGia.setMucTieuTiepTheo(request.getMucTieuTiepTheo());
        danhGia.setKeHoachPhatTrien(request.getKeHoachPhatTrien());
        
        // Thời gian
        danhGia.setNgayBatDau(request.getNgayBatDau());
        danhGia.setNgayKetThuc(request.getNgayKetThuc());
        
        return danhGiaRepository.save(danhGia);
    }
    
    /**
     * Lấy đánh giá theo ID
     */
    public DanhGia getDanhGiaById(Long id, User currentUser) {
        DanhGia danhGia = danhGiaRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Đánh giá không tồn tại"));
        
        // Admin không có quyền xem
        if (currentUser.isAdmin()) {
            throw new ForbiddenException("Admin không có quyền truy cập dữ liệu đánh giá");
        }
        
        // HR Manager xem tất cả
        if (currentUser.isManagerHR()) {
            return danhGia;
        }
        
        // Project Manager chỉ xem đánh giá của team (TODO: implement logic kiểm tra team)
        if (currentUser.isManagerProject()) {
            return danhGia;
        }
        
        // Employee chỉ xem đánh giá của mình
        if (!danhGia.getNhanVien().getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("Bạn không có quyền xem đánh giá này");
        }
        
        return danhGia;
    }
    
    /**
     * Lấy danh sách tất cả đánh giá - HR Manager và Project Manager
     */
    public List<DanhGia> getAllDanhGia(User currentUser) {
        if (!currentUser.isManagerHR() && !currentUser.isManagerProject()) {
            throw new ForbiddenException("Bạn không có quyền xem danh sách đánh giá");
        }
        
        // TODO: Project Manager chỉ xem đánh giá của team
        return danhGiaRepository.findAll();
    }
    
    /**
     * Lấy đánh giá có phân trang
     */
    public Page<DanhGia> getAllDanhGiaPage(Pageable pageable, User currentUser) {
        if (!currentUser.isManagerHR() && !currentUser.isManagerProject()) {
            throw new ForbiddenException("Bạn không có quyền xem danh sách đánh giá");
        }
        
        return danhGiaRepository.findAllByOrderByCreatedAtDesc(pageable);
    }
    
    /**
     * Cập nhật đánh giá - Chỉ người tạo hoặc HR Manager
     */
    public DanhGia updateDanhGia(Long id, DanhGiaRequest request, User currentUser) {
        DanhGia danhGia = getDanhGiaById(id, currentUser);
        
        // Kiểm tra quyền sửa: HR Manager hoặc người tạo
        if (!currentUser.isManagerHR() && 
            !danhGia.getNguoiDanhGia().getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("Bạn không có quyền sửa đánh giá này");
        }
        
        // Chỉ cho phép sửa nếu chưa hoàn thành
        if (danhGia.getTrangThai() == TrangThaiDanhGia.DA_DUYET) {
            throw new BadRequestException("Không thể sửa đánh giá đã được duyệt");
        }
        
        log.info("User {} cập nhật đánh giá ID: {}", currentUser.getUsername(), id);
        
        // Cập nhật điểm số
        danhGia.setDiemChuyenMon(request.getDiemChuyenMon());
        danhGia.setDiemThaiDo(request.getDiemThaiDo());
        danhGia.setDiemKyNangMem(request.getDiemKyNangMem());
        danhGia.setDiemDongDoi(request.getDiemDongDoi());
        
        // Cập nhật thông tin đánh giá
        danhGia.setNhanXet(request.getNhanXet());
        danhGia.setMucTieuTiepTheo(request.getMucTieuTiepTheo());
        danhGia.setKeHoachPhatTrien(request.getKeHoachPhatTrien());
        
        return danhGiaRepository.save(danhGia);
    }
    
    /**
     * Duyệt đánh giá - Chỉ HR Manager
     */
    public DanhGia approveDanhGia(Long id, String ghiChu, User currentUser) {
        PermissionUtil.checkHRPermission(currentUser);
        
        DanhGia danhGia = getDanhGiaById(id, currentUser);
        
        if (danhGia.getTrangThai() != TrangThaiDanhGia.CHO_DUYET) {
            throw new BadRequestException("Chỉ có thể duyệt đánh giá đang chờ duyệt");
        }
        
        log.info("HR Manager {} duyệt đánh giá ID: {}", currentUser.getUsername(), id);
        
        danhGia.setTrangThai(TrangThaiDanhGia.DA_DUYET);
        danhGia.setNgayHoanThanh(LocalDate.now());
        
        if (ghiChu != null && !ghiChu.trim().isEmpty()) {
            danhGia.setNhanXet(danhGia.getNhanXet() + "\n\nGhi chú HR: " + ghiChu);
        }
        
        return danhGiaRepository.save(danhGia);
    }
    
    /**
     * Từ chối đánh giá - Chỉ HR Manager
     */
    public DanhGia rejectDanhGia(Long id, String lyDo, User currentUser) {
        PermissionUtil.checkHRPermission(currentUser);
        
        DanhGia danhGia = getDanhGiaById(id, currentUser);
        
        if (danhGia.getTrangThai() != TrangThaiDanhGia.CHO_DUYET) {
            throw new BadRequestException("Chỉ có thể từ chối đánh giá đang chờ duyệt");
        }
        
        log.info("HR Manager {} từ chối đánh giá ID: {}", currentUser.getUsername(), id);
        
        danhGia.setTrangThai(TrangThaiDanhGia.TU_CHOI);
        
        if (lyDo != null && !lyDo.trim().isEmpty()) {
            danhGia.setNhanXet(danhGia.getNhanXet() + "\n\nLý do từ chối: " + lyDo);
        }
        
        return danhGiaRepository.save(danhGia);
    }
    
    /**
     * Gửi đánh giá để duyệt
     */
    public DanhGia submitForApproval(Long id, User currentUser) {
        DanhGia danhGia = getDanhGiaById(id, currentUser);
        
        // Chỉ người tạo mới có thể gửi duyệt
        if (!danhGia.getNguoiDanhGia().getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("Chỉ người tạo đánh giá mới có thể gửi duyệt");
        }
        
        if (danhGia.getTrangThai() != TrangThaiDanhGia.DANG_DANH_GIA) {
            throw new BadRequestException("Chỉ có thể gửi duyệt đánh giá đang soạn thảo");
        }
        
        log.info("User {} gửi đánh giá ID: {} để duyệt", currentUser.getUsername(), id);
        
        danhGia.setTrangThai(TrangThaiDanhGia.CHO_DUYET);
        return danhGiaRepository.save(danhGia);
    }
    
    /**
     * Lấy đánh giá theo nhân viên
     */
    public List<DanhGia> getDanhGiaByNhanVien(Long nhanvienId, User currentUser) {
        // Admin không có quyền
        if (currentUser.isAdmin()) {
            throw new ForbiddenException("Admin không có quyền truy cập dữ liệu đánh giá");
        }
        
        // HR Manager xem tất cả
        if (currentUser.isManagerHR()) {
            return danhGiaRepository.findByNhanVien_NhanvienIdOrderByCreatedAtDesc(nhanvienId);
        }
        
        // Employee chỉ xem của mình
        NhanVien nhanVien = nhanVienRepository.findById(nhanvienId)
            .orElseThrow(() -> new EntityNotFoundException("Nhân viên không tồn tại"));
        
        if (!nhanVien.getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("Bạn chỉ có thể xem đánh giá của chính mình");
        }
        
        return danhGiaRepository.findByNhanVien_NhanvienIdOrderByCreatedAtDesc(nhanvienId);
    }
    
    /**
     * Lấy đánh giá chờ duyệt - HR Manager
     */
    public List<DanhGia> getPendingDanhGia(User currentUser) {
        PermissionUtil.checkHRPermission(currentUser);
        return danhGiaRepository.findPendingApproval();
    }
    
    /**
     * Xóa đánh giá - Chỉ HR Manager
     */
    public void deleteDanhGia(Long id, User currentUser) {
        PermissionUtil.checkHRPermission(currentUser);
        
        DanhGia danhGia = getDanhGiaById(id, currentUser);
        
        if (danhGia.getTrangThai() == TrangThaiDanhGia.DA_DUYET) {
            throw new BadRequestException("Không thể xóa đánh giá đã được duyệt");
        }
        
        log.info("HR Manager {} xóa đánh giá ID: {}", currentUser.getUsername(), id);
        danhGiaRepository.delete(danhGia);
    }
}
