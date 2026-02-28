package DoAn.BE.hrm.service;

import DoAn.BE.hrm.dto.CreateOKRRequest;
import DoAn.BE.hrm.dto.UpdateOKRRequest;
import DoAn.BE.hrm.entity.OKR;
import DoAn.BE.hrm.entity.KeyResult;
import DoAn.BE.hrm.repository.OKRRepository;
import DoAn.BE.hrm.repository.KeyResultRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.common.util.SecurityUtil;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class OKRService {

    private final OKRRepository okrRepository;
    private final KeyResultRepository keyResultRepository;
    private final DoAn.BE.common.service.AccessControlService accessControlService;

    public List<OKR> findAll(String period) {
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (period != null && !period.isEmpty()) {
            if (companyId != null) {
                return okrRepository.findByPeriodAndCompany_CompanyId(period, companyId);
            }
            return okrRepository.findByPeriod(period);
        }
        if (companyId != null) {
            return okrRepository.findByCompany_CompanyId(companyId);
        }
        return java.util.Collections.emptyList();
    }

    public List<OKR> findByCurrentUser() {
        User currentUser = SecurityUtil.getCurrentUser();
        return okrRepository.findByOwnerId(currentUser.getUserId());
    }

    public List<OKR> findByDepartment(Long deptId) {
        return okrRepository.findByDepartmentId(deptId);
    }

    public OKR findById(Long id) {
        return okrRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OKR not found with id: " + id));
    }

    @Transactional
    public OKR create(CreateOKRRequest request) {
        User currentUser = SecurityUtil.getCurrentUser();

        // Validate keyResult targets
        if (request.getKeyResults() != null) {
            for (CreateOKRRequest.KeyResultRequest kr : request.getKeyResults()) {
                if (kr.getTarget() != null && kr.getTarget() < 0) {
                    throw new BadRequestException("Key result target cannot be negative");
                }
            }
        }

        OKR okr = new OKR();
        okr.setTitle(request.getTitle());
        okr.setDescription(request.getDescription());
        okr.setPeriod(request.getPeriod());
        okr.setOwner(currentUser);
        okr.setStatus(OKR.OKRStatus.IN_PROGRESS);
        okr.setProgress(0);

        // Explicitly set company from TenantContext to avoid @PrePersist detached
        // entity issue
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId != null) {
            DoAn.BE.company.entity.Company company = new DoAn.BE.company.entity.Company();
            company.setCompanyId(companyId);
            okr.setCompany(company);
        }

        okr = okrRepository.save(okr);

        if (request.getKeyResults() != null) {
            for (CreateOKRRequest.KeyResultRequest krData : request.getKeyResults()) {
                KeyResult kr = new KeyResult();
                kr.setTitle(krData.getTitle());
                kr.setTarget(krData.getTarget() != null ? krData.getTarget() : 0.0);
                kr.setCurrent(0.0);
                kr.setUnit(krData.getUnit());
                kr.setOkr(okr);
                okr.getKeyResults().add(kr);
            }
            okr = okrRepository.save(okr);
        }

        return okr;
    }

    @Transactional
    public OKR update(Long id, UpdateOKRRequest request) {
        OKR okr = findById(id);
        User currentUser = SecurityUtil.getCurrentUser();
        boolean isOwner = okr.getOwner() != null && okr.getOwner().getUserId().equals(currentUser.getUserId());
        if (!isOwner && !accessControlService.hasPermission("hr.editProfile")) {
            throw new DoAn.BE.common.exception.ForbiddenException(
                    "Bạn không có quyền chỉnh sửa OKR của người khác");
        }
        if (request.getTitle() != null) {
            okr.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            okr.setDescription(request.getDescription());
        }
        if (request.getPeriod() != null) {
            okr.setPeriod(request.getPeriod());
        }
        if (request.getStatus() != null) {
            okr.setStatus(request.getStatus());
        }

        if (request.getKeyResults() != null) {
            for (UpdateOKRRequest.KeyResultUpdateRequest krData : request.getKeyResults()) {
                if (krData.getId() != null) {
                    KeyResult kr = keyResultRepository.findById(krData.getId()).orElse(null);
                    if (kr != null) {
                        if (krData.getCurrent() != null) {
                            kr.setCurrent(krData.getCurrent());
                        }
                        if (krData.getTitle() != null) {
                            kr.setTitle(krData.getTitle());
                        }
                        keyResultRepository.save(kr);
                    }
                }
            }
        }

        okr.calculateProgress();

        if (okr.getProgress() >= 100) {
            okr.setStatus(OKR.OKRStatus.COMPLETED);
        } else if (okr.getProgress() >= 70) {
            okr.setStatus(OKR.OKRStatus.ON_TRACK);
        } else if (okr.getProgress() >= 40) {
            okr.setStatus(OKR.OKRStatus.IN_PROGRESS);
        } else {
            okr.setStatus(OKR.OKRStatus.AT_RISK);
        }

        return okrRepository.save(okr);
    }

    @Transactional
    public void delete(Long id) {
        OKR okr = findById(id);
        User currentUser = DoAn.BE.common.util.SecurityUtil.getCurrentUser();
        boolean isOwner = okr.getOwner() != null && okr.getOwner().getUserId().equals(currentUser.getUserId());
        if (!isOwner && !accessControlService.hasPermission("hr.editProfile")) {
            throw new DoAn.BE.common.exception.ForbiddenException(
                    "Bạn không có quyền xóa OKR của người khác");
        }
        okrRepository.delete(okr);
    }
}
