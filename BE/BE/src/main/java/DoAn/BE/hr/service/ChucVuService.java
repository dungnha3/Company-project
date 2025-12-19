package DoAn.BE.hr.service;

import java.util.List;

import org.springframework.stereotype.Service;

import DoAn.BE.common.exception.DuplicateException;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.hr.dto.ChucVuRequest;
import DoAn.BE.hr.entity.ChucVu;
import DoAn.BE.hr.repository.ChucVuRepository;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class ChucVuService {
    
    private final ChucVuRepository chucVuRepository;

    public ChucVuService(ChucVuRepository chucVuRepository) {
        this.chucVuRepository = chucVuRepository;
    }
    
    /**
     * Đếm số lượng nhân viên theo chức vụ
     */
    public long countNhanVienByChucVu(Long chucvuId) {
        return chucVuRepository.countNhanVienByChucVu(chucvuId);
    }

    public ChucVu createChucVu(ChucVuRequest request) {
        if (chucVuRepository.existsByTenChucVu(request.getTenChucVu())) {
            throw new DuplicateException("Chức vụ đã tồn tại");
        }

        ChucVu chucVu = new ChucVu();
        chucVu.setTenChucVu(request.getTenChucVu());
        chucVu.setMoTa(request.getMoTa());
        chucVu.setIcon(request.getIcon());
        chucVu.setHeSoLuong(request.getHeSoLuong());
        chucVu.setLevel(request.getLevel() != null ? request.getLevel() : 1);

        return chucVuRepository.save(chucVu);
    }

    public ChucVu getChucVuById(Long id) {
        return chucVuRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Chức vụ không tồn tại"));
    }

    public List<ChucVu> getAllChucVu() {
        return chucVuRepository.findAll();
    }

    public ChucVu updateChucVu(Long id, ChucVuRequest request) {
        ChucVu chucVu = getChucVuById(id);

        if (request.getTenChucVu() != null && !request.getTenChucVu().equals(chucVu.getTenChucVu())) {
            if (chucVuRepository.existsByTenChucVu(request.getTenChucVu())) {
                throw new DuplicateException("Tên chức vụ đã tồn tại");
            }
            chucVu.setTenChucVu(request.getTenChucVu());
        }

        if (request.getMoTa() != null) {
            chucVu.setMoTa(request.getMoTa());
        }

        if (request.getIcon() != null) {
            chucVu.setIcon(request.getIcon());
        }

        if (request.getHeSoLuong() != null) {
            chucVu.setHeSoLuong(request.getHeSoLuong());
        }

        if (request.getLevel() != null) {
            chucVu.setLevel(request.getLevel());
        }

        return chucVuRepository.save(chucVu);
    }

    public void deleteChucVu(Long id) {
        ChucVu chucVu = getChucVuById(id);
        chucVuRepository.delete(chucVu);
    }
}
