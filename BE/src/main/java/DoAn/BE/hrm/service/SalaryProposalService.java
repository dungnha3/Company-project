package DoAn.BE.hrm.service;

import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.hrm.dto.SalaryProposalDTO;
import DoAn.BE.hrm.dto.SalaryProposalRequest;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.SalaryProposal;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.hrm.repository.SalaryProposalRepository;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Transactional
public class SalaryProposalService {

    private final SalaryProposalRepository proposalRepository;
    private final EmployeeRepository employeeRepository;

    public SalaryProposalDTO createProposal(SalaryProposalRequest request, User currentUser) {
        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        SalaryProposal proposal = new SalaryProposal();
        proposal.setEmployee(employee);
        proposal.setCompany(employee.getCompany());
        proposal.setCurrentSalary(employee.getBaseSalary());
        proposal.setProposedSalary(request.getProposedSalary());
        proposal.setReason(request.getReason());
        proposal.setProjectId(request.getProjectId());
        proposal.setStatus(SalaryProposal.ProposalStatus.PENDING);
        
        SalaryProposal saved = proposalRepository.save(proposal);
        return convertToDTO(saved);
    }

    public SalaryProposalDTO approveProposal(Long proposalId, User currentUser) {
        SalaryProposal proposal = proposalRepository.findById(proposalId)
                .orElseThrow(() -> new ResourceNotFoundException("Proposal not found"));
        
        proposal.setStatus(SalaryProposal.ProposalStatus.APPROVED);
        proposal.setReviewedBy(currentUser);
        proposal.setReviewDate(LocalDate.now());
        
        // Cập nhật lương cơ bản của Employee luôn
        Employee employee = proposal.getEmployee();
        employee.setBaseSalary(proposal.getProposedSalary());
        employeeRepository.save(employee);
        
        return convertToDTO(proposalRepository.save(proposal));
    }

    public SalaryProposalDTO rejectProposal(Long proposalId, User currentUser) {
        SalaryProposal proposal = proposalRepository.findById(proposalId)
                .orElseThrow(() -> new ResourceNotFoundException("Proposal not found"));
        
        proposal.setStatus(SalaryProposal.ProposalStatus.REJECTED);
        proposal.setReviewedBy(currentUser);
        proposal.setReviewDate(LocalDate.now());
        
        return convertToDTO(proposalRepository.save(proposal));
    }

    @Transactional(readOnly = true)
    public Page<SalaryProposalDTO> getCompanyProposals(Long companyId, Pageable pageable) {
        return proposalRepository.findByCompany_CompanyIdOrderByCreatedAtDesc(companyId, pageable)
                .map(this::convertToDTO);
    }

    private SalaryProposalDTO convertToDTO(SalaryProposal proposal) {
        SalaryProposalDTO dto = new SalaryProposalDTO();
        dto.setProposalId(proposal.getProposalId());
        dto.setEmployeeId(proposal.getEmployee().getEmployeeId());
        dto.setEmployeeName(proposal.getEmployee().getFullName());
        if (proposal.getEmployee().getUser() != null) {
            dto.setEmployeeAvatar(proposal.getEmployee().getUser().getAvatarUrl());
        }
        dto.setCurrentSalary(proposal.getCurrentSalary());
        dto.setProposedSalary(proposal.getProposedSalary());
        dto.setReason(proposal.getReason());
        dto.setStatus(proposal.getStatus());
        if (proposal.getReviewedBy() != null) {
            dto.setReviewedBy(proposal.getReviewedBy().getUserId());
            dto.setReviewedByName(proposal.getReviewedBy().getUsername());
        }
        dto.setReviewDate(proposal.getReviewDate());
        dto.setProjectId(proposal.getProjectId());
        dto.setCreatedAt(proposal.getCreatedAt());
        dto.setUpdatedAt(proposal.getUpdatedAt());
        return dto;
    }
}
