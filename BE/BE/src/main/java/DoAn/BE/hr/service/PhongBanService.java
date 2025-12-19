package DoAn.BE.hr.service;

import java.util.List;

import org.springframework.stereotype.Service;

import DoAn.BE.common.exception.DuplicateException;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.hr.dto.PhongBanRequest;
import DoAn.BE.hr.entity.NhanVien;
import DoAn.BE.hr.entity.PhongBan;
import DoAn.BE.hr.repository.NhanVienRepository;
import DoAn.BE.hr.repository.PhongBanRepository;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class PhongBanService {
    
    private final PhongBanRepository phongBanRepository;
    private final NhanVienRepository nhanVienRepository;

    public PhongBanService(PhongBanRepository phongBanRepository, NhanVienRepository nhanVienRepository) {
        this.phongBanRepository = phongBanRepository;
        this.nhanVienRepository = nhanVienRepository;
    }
    
    /**
     * Đếm số lượng nhân viên trong phòng ban
     */
    public long countNhanVienByPhongBan(Long phongbanId) {
        return phongBanRepository.countNhanVienByPhongBan(phongbanId);
    }

    public PhongBan createPhongBan(PhongBanRequest request) {
        if (phongBanRepository.existsByTenPhongBan(request.getTenPhongBan())) {
            throw new DuplicateException("Phòng ban đã tồn tại");
        }

        PhongBan phongBan = new PhongBan();
        phongBan.setTenPhongBan(request.getTenPhongBan());
        phongBan.setMoTa(request.getMoTa());
        
        if (request.getTruongPhongId() != null) {
            NhanVien truongPhong = nhanVienRepository.findById(request.getTruongPhongId())
                .orElseThrow(() -> new EntityNotFoundException("Nhân viên không tồn tại"));
            phongBan.setTruongPhong(truongPhong);
        }

        return phongBanRepository.save(phongBan);
    }

    public PhongBan getPhongBanById(Long id) {
        return phongBanRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Phòng ban không tồn tại"));
    }

    public List<PhongBan> getAllPhongBan() {
        return phongBanRepository.findAll();
    }

    public PhongBan updatePhongBan(Long id, PhongBanRequest request) {
        PhongBan phongBan = getPhongBanById(id);

        if (request.getTenPhongBan() != null && !request.getTenPhongBan().equals(phongBan.getTenPhongBan())) {
            if (phongBanRepository.existsByTenPhongBan(request.getTenPhongBan())) {
                throw new DuplicateException("Tên phòng ban đã tồn tại");
            }
            phongBan.setTenPhongBan(request.getTenPhongBan());
        }

        if (request.getMoTa() != null) {
            phongBan.setMoTa(request.getMoTa());
        }

        if (request.getTruongPhongId() != null) {
            NhanVien truongPhong = nhanVienRepository.findById(request.getTruongPhongId())
                .orElseThrow(() -> new EntityNotFoundException("Nhân viên không tồn tại"));
            phongBan.setTruongPhong(truongPhong);
        }

        return phongBanRepository.save(phongBan);
    }

    public void deletePhongBan(Long id) {
        PhongBan phongBan = getPhongBanById(id);
        phongBanRepository.delete(phongBan);
    }
}
