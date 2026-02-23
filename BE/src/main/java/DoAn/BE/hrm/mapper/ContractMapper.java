package DoAn.BE.hrm.mapper;

import DoAn.BE.hrm.dto.ContractDTO;
import DoAn.BE.hrm.entity.Contract;
import DoAn.BE.user.entity.User;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

import DoAn.BE.common.service.AccessControlService;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class ContractMapper {

    private final AccessControlService accessControlService;

    public ContractDTO toDTO(Contract contract, User currentUser) {
        if (contract == null) {
            return null;
        }

        ContractDTO dto = new ContractDTO();
        dto.setContractId(contract.getContractId());

        // Employee Info
        if (contract.getEmployee() != null) {
            dto.setEmployeeId(contract.getEmployee().getEmployeeId());
            dto.setEmployeeName(contract.getEmployee().getFullName());
            if (contract.getEmployee().getPosition() != null) {
                dto.setPositionName(contract.getEmployee().getPosition().getName());
            }
            if (contract.getEmployee().getUser() != null) {
                dto.setAvatarUrl(contract.getEmployee().getUser().getAvatarUrl());
            }
        }

        // Contract Info
        dto.setContractType(contract.getContractType());
        dto.setStartDate(contract.getStartDate());
        dto.setEndDate(contract.getEndDate());

        // Check salary visibility
        boolean canViewSalary = false;
        if (accessControlService.isAccountingManager()) {
            canViewSalary = true;
        } else if (currentUser != null && isOwner(contract, currentUser)) {
            canViewSalary = true;
        }

        if (canViewSalary) {
            dto.setSalary(contract.getSalary());
        } else {
            dto.setSalary(null);
        }

        dto.setContent(contract.getContent());
        dto.setStatus(contract.getStatus());
        dto.setCreatedAt(contract.getCreatedAt());

        // Computed fields
        dto.setIsExpired(contract.isExpired());

        if (contract.getEndDate() != null) {
            long daysRemaining = ChronoUnit.DAYS.between(LocalDate.now(), contract.getEndDate());
            dto.setDaysRemaining(daysRemaining > 0 ? (int) daysRemaining : 0);
        }

        return dto;
    }

    public ContractDTO toDTO(Contract contract) {
        return toDTO(contract, null);
    }

    private boolean isOwner(Contract contract, User currentUser) {
        return contract.getEmployee() != null &&
                contract.getEmployee().getUser() != null &&
                contract.getEmployee().getUser().getUserId().equals(currentUser.getUserId());
    }

    public List<ContractDTO> toDTOList(List<Contract> contracts, User currentUser) {
        if (contracts == null) {
            return null;
        }

        return contracts.stream()
                .map(ct -> toDTO(ct, currentUser))
                .collect(Collectors.toList());
    }

    public List<ContractDTO> toDTOList(List<Contract> contracts) {
        return toDTOList(contracts, null);
    }
}
