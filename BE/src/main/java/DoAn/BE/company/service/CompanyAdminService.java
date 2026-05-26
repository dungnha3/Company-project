package DoAn.BE.company.service;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.company.dto.CompanyDto;
import DoAn.BE.company.entity.Company;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanySettings;

import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.company.repository.CompanySettingsRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

// SysAdmin-only operations on companies: plan changes, status toggle,
// settings override, quota/feature God Mode, hard delete.
// /
@Service
@RequiredArgsConstructor
@Slf4j
public class CompanyAdminService {

    private final CompanyRepository companyRepository;
    private final CompanyMemberRepository companyMemberRepository;
    private final CompanySettingsRepository companySettingsRepository;


    @Transactional(readOnly = true)
    public List<CompanyDto.CompanyResponse> getAllCompanies() {
        return companyRepository.findAll()
                .stream()
                .map(this::mapCompanyToResponse)
                .collect(Collectors.toList());
    }
    @Transactional(readOnly = true)
    public Page<CompanyDto.CompanyResponse> getAllCompaniesPaged(Pageable pageable) {
        return companyRepository.findAll(pageable)
                .map(this::mapCompanyToResponse);
    }

    @Transactional(readOnly = true)
    public CompanyDto.CompanyResponse getCompanyById(Long companyId) {
        if (companyId == null) {
            throw new BadRequestException("ID công ty không được để trống");
        }
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công ty với ID: " + companyId));
        return mapCompanyToResponse(company);
    }

    @Transactional(readOnly = true)
    public CompanySettings getCompanySettings(Long companyId) {
        return companySettingsRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cài đặt cho công ty: " + companyId));
    }

    @Transactional
    public Company updateCompanyByAdmin(Long companyId, CompanyDto.CompanyUpdateRequest req) {
        if (companyId == null) {
            throw new BadRequestException("ID công ty không được để trống");
        }

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công ty"));

        updateCompanyFields(company, req);

        log.info("[System Admin] Đã cập nhật thông tin công ty: {}", company.getName());
        return companyRepository.save(company);
    }



    @Transactional
    public boolean toggleCompanyStatus(Long companyId) {
        if (companyId == null) {
            throw new BadRequestException("ID công ty không được để trống");
        }

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công ty"));

        boolean newStatus = !Boolean.TRUE.equals(company.getIsActive());
        company.setIsActive(newStatus);
        companyRepository.save(company);

        log.info("[System Admin] Đã {} công ty: {}",
                newStatus ? "kích hoạt" : "tạm ngưng", company.getName());
        return newStatus;
    }

    @Transactional
    public void deleteCompany(Long companyId) {
        if (companyId == null) {
            throw new BadRequestException("ID công ty không được để trống");
        }

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công ty"));

        String companyName = company.getName();

        List<CompanyMember> members = companyMemberRepository.findByCompany_CompanyId(companyId);
        if (!members.isEmpty()) {
            companyMemberRepository.deleteAll(members);
        }

        companyRepository.delete(company);
        log.info("[System Admin] Đã xóa công ty: {}", companyName);
    }

    private CompanyDto.CompanyResponse mapCompanyToResponse(Company company) {
        CompanyDto.CompanyResponse resp = new CompanyDto.CompanyResponse();
        resp.setCompanyId(company.getCompanyId());
        resp.setName(company.getName());
        resp.setLogoUrl(company.getLogoUrl());
        resp.setAddress(company.getAddress());
        resp.setIsActive(company.getIsActive());
        return resp;
    }

    private void updateCompanyFields(Company company, CompanyDto.CompanyUpdateRequest req) {
        if (req.getName() != null && !req.getName().isBlank()) {
            company.setName(req.getName());
        }
        if (req.getLogoUrl() != null) {
            company.setLogoUrl(req.getLogoUrl());
        }
        if (req.getAddress() != null) {
            company.setAddress(req.getAddress());
        }
    }
}
