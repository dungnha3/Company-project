package DoAn.BE.hr.service;

import java.util.List;

import org.springframework.stereotype.Service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.DuplicateException;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.util.PermissionUtil;
import lombok.extern.slf4j.Slf4j;
import DoAn.BE.hr.dto.NhanVienRequest;
import DoAn.BE.hr.entity.ChucVu;
import DoAn.BE.hr.entity.NhanVien;
import DoAn.BE.hr.entity.NhanVien.TrangThaiNhanVien;
import DoAn.BE.hr.entity.PhongBan;
import DoAn.BE.hr.repository.ChucVuRepository;
import DoAn.BE.hr.repository.NhanVienRepository;
import DoAn.BE.hr.repository.PhongBanRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

// Service quản lý nhân viên (CRUD, hợp đồng, phòng ban, chức vụ)
@Service
@Transactional
@Slf4j
public class NhanVienService {
    
    private final NhanVienRepository nhanVienRepository;
    private final UserRepository userRepository;
    private final PhongBanRepository phongBanRepository;
    private final ChucVuRepository chucVuRepository;

    public NhanVienService(NhanVienRepository nhanVienRepository, 
                          UserRepository userRepository,
                          PhongBanRepository phongBanRepository,
                          ChucVuRepository chucVuRepository) {
        this.nhanVienRepository = nhanVienRepository;
        this.userRepository = userRepository;
        this.phongBanRepository = phongBanRepository;
        this.chucVuRepository = chucVuRepository;
    }

    // Tạo nhân viên - Chỉ HR Manager
    public NhanVien createNhanVien(NhanVienRequest request, User currentUser) {
        PermissionUtil.checkHRPermission(currentUser);
        log.info("HR Manager {} tạo nhân viên mới", currentUser.getUsername());
        User user = userRepository.findById(request.getUserId())
            .orElseThrow(() -> new EntityNotFoundException("User không tồn tại"));

        if (nhanVienRepository.findByUser_UserId(request.getUserId()).isPresent()) {
            throw new DuplicateException("User đã được gán cho nhân viên khác");
        }

        if (request.getCccd() != null && nhanVienRepository.existsByCccd(request.getCccd())) {
            throw new DuplicateException("CCCD đã tồn tại");
        }

        NhanVien nhanVien = new NhanVien();
        nhanVien.setUser(user);
        nhanVien.setHoTen(request.getHoTen());
        nhanVien.setCccd(request.getCccd());
        nhanVien.setNgaySinh(request.getNgaySinh());
        nhanVien.setGioiTinh(request.getGioiTinh());
        nhanVien.setDiaChi(request.getDiaChi());
        nhanVien.setNgayVaoLam(request.getNgayVaoLam());
        nhanVien.setTrangThai(TrangThaiNhanVien.DANG_LAM_VIEC);
        
        if (request.getPhongbanId() != null) {
            PhongBan phongBan = phongBanRepository.findById(request.getPhongbanId())
                .orElseThrow(() -> new EntityNotFoundException("Phòng ban không tồn tại"));
            nhanVien.setPhongBan(phongBan);
        }
        
        if (request.getChucvuId() != null) {
            ChucVu chucVu = chucVuRepository.findById(request.getChucvuId())
                .orElseThrow(() -> new EntityNotFoundException("Chức vụ không tồn tại"));
            nhanVien.setChucVu(chucVu);
        }
        
        nhanVien.setLuongCoBan(request.getLuongCoBan());
        nhanVien.setPhuCap(request.getPhuCap());

        return nhanVienRepository.save(nhanVien);
    }

    /**
     * Lấy thông tin nhân viên
     * - HR/Accounting: xem tất cả
     * - Employee: chỉ xem của mình
     * - Project Manager: xem nhân viên trong dự án (kiểm tra ở controller)
     */
    public NhanVien getNhanVienById(Long id, User currentUser) {
        NhanVien nhanVien = nhanVienRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Nhân viên không tồn tại"));
        
        // Admin không có quyền xem
        if (currentUser.isAdmin()) {
            throw new ForbiddenException("Admin không có quyền truy cập dữ liệu nhân viên");
        }
        
        // HR và Accounting xem tất cả
        if (currentUser.isManagerHR() || currentUser.isManagerAccounting()) {
            return nhanVien;
        }
        
        // Employee và Project Manager chỉ xem của mình
        if (!nhanVien.getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("Bạn không có quyền xem thông tin nhân viên này");
        }
        
        return nhanVien;
    }
    
    public NhanVien getNhanVienById(Long id) {
        return nhanVienRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Nhân viên không tồn tại"));
    }

    /**
     * Lấy danh sách tất cả nhân viên - Chỉ HR/Accounting
     */
    public List<NhanVien> getAllNhanVien(User currentUser) {
        if (!currentUser.isManagerHR() && !currentUser.isManagerAccounting()) {
            throw new ForbiddenException("Chỉ HR/Accounting Manager mới có quyền xem danh sách nhân viên");
        }
        return nhanVienRepository.findAll();
    }
    
    public List<NhanVien> getAllNhanVien() {
        return nhanVienRepository.findAll();
    }

    /**
     * ⭐ Lấy danh sách nhân viên có phân trang
     */
    public Page<NhanVien> getAllNhanVienPage(Pageable pageable) {
        return nhanVienRepository.findAll(pageable);
    }

    /**
     * Cập nhật nhân viên - Chỉ HR Manager
     */
    public NhanVien updateNhanVien(Long id, NhanVienRequest request, User currentUser) {
        PermissionUtil.checkHRPermission(currentUser);
        log.info("HR Manager {} cập nhật nhân viên ID: {}", currentUser.getUsername(), id);
        
        NhanVien nhanVien = getNhanVienById(id);
        
        // Cập nhật thông tin...
        return updateNhanVienInternal(nhanVien, request);
    }
    
    private NhanVien updateNhanVienInternal(NhanVien nhanVien, NhanVienRequest request) {
        if (request.getHoTen() != null) {
            nhanVien.setHoTen(request.getHoTen());
        }
        
        if (request.getCccd() != null && !request.getCccd().equals(nhanVien.getCccd())) {
            if (nhanVienRepository.existsByCccd(request.getCccd())) {
                throw new DuplicateException("CCCD đã tồn tại");
            }
            nhanVien.setCccd(request.getCccd());
        }
        
        if (request.getNgaySinh() != null) {
            nhanVien.setNgaySinh(request.getNgaySinh());
        }
        if (request.getGioiTinh() != null) {
            nhanVien.setGioiTinh(request.getGioiTinh());
        }
        if (request.getDiaChi() != null) {
            nhanVien.setDiaChi(request.getDiaChi());
        }
        if (request.getNgayVaoLam() != null) {
            nhanVien.setNgayVaoLam(request.getNgayVaoLam());
        }
        
        if (request.getPhongbanId() != null) {
            PhongBan phongBan = phongBanRepository.findById(request.getPhongbanId())
                .orElseThrow(() -> new EntityNotFoundException("Phòng ban không tồn tại"));
            nhanVien.setPhongBan(phongBan);
        }
        
        if (request.getChucvuId() != null) {
            ChucVu chucVu = chucVuRepository.findById(request.getChucvuId())
                .orElseThrow(() -> new EntityNotFoundException("Chức vụ không tồn tại"));
            nhanVien.setChucVu(chucVu);
        }
        
        if (request.getLuongCoBan() != null) {
            nhanVien.setLuongCoBan(request.getLuongCoBan());
        }
        if (request.getPhuCap() != null) {
            nhanVien.setPhuCap(request.getPhuCap());
        }

        return nhanVienRepository.save(nhanVien);
    }

    public void deleteNhanVien(Long id) {
        NhanVien nhanVien = getNhanVienById(id);
        nhanVienRepository.delete(nhanVien);
    }

    public List<NhanVien> getNhanVienByTrangThai(TrangThaiNhanVien trangThai) {
        return nhanVienRepository.findByTrangThai(trangThai);
    }

    public List<NhanVien> getNhanVienByPhongBan(Long phongbanId) {
        return nhanVienRepository.findByPhongBan_PhongbanId(phongbanId);
    }

    public List<NhanVien> getNhanVienByChucVu(Long chucvuId) {
        return nhanVienRepository.findByChucVu_ChucvuId(chucvuId);
    }

    public List<NhanVien> searchNhanVien(String keyword) {
        return nhanVienRepository.searchByKeyword(keyword);
    }

    public NhanVien updateTrangThai(Long id, TrangThaiNhanVien trangThai) {
        NhanVien nhanVien = getNhanVienById(id);
        nhanVien.setTrangThai(trangThai);
        return nhanVienRepository.save(nhanVien);
    }

    /**
     * Lấy nhân viên theo User ID
     */
    public NhanVien getNhanVienByUserId(Long userId) {
        return nhanVienRepository.findByUser_UserId(userId)
            .orElseThrow(() -> new EntityNotFoundException("Nhân viên không tồn tại"));
    }

    /**
     * Kiểm tra User đã có nhân viên chưa
     */
    public boolean hasNhanVien(Long userId) {
        return nhanVienRepository.findByUser_UserId(userId).isPresent();
    }
}
