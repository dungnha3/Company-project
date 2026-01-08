package DoAn.BE.hrm.mapper;

import DoAn.BE.hrm.dto.LeaveRequestDTO;
import DoAn.BE.hrm.entity.LeaveRequest;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class LeaveRequestMapper {

    // Convert LeaveRequest entity to LeaveRequestDTO
    public LeaveRequestDTO toDTO(LeaveRequest leaveRequest) {
        if (leaveRequest == null) {
            return null;
        }

        LeaveRequestDTO dto = new LeaveRequestDTO();
        dto.setLeaveRequestId(leaveRequest.getLeaveRequestId());

        // Employee Info
        if (leaveRequest.getEmployee() != null) {
            dto.setEmployeeId(leaveRequest.getEmployee().getEmployeeId());
            dto.setEmployeeName(leaveRequest.getEmployee().getFullName());
            // Get avatar from linked User
            if (leaveRequest.getEmployee().getUser() != null) {
                dto.setAvatarUrl(leaveRequest.getEmployee().getUser().getAvatarUrl());
            }
        }

        // Leave Info
        dto.setLeaveType(leaveRequest.getLeaveType());
        dto.setStartDate(leaveRequest.getStartDate());
        dto.setEndDate(leaveRequest.getEndDate());
        dto.setTotalDays(leaveRequest.getTotalDays());
        dto.setReason(leaveRequest.getReason());
        dto.setStatus(leaveRequest.getStatus());

        // Approval Info
        if (leaveRequest.getApprover() != null) {
            dto.setApproverId(leaveRequest.getApprover().getUserId());
            dto.setApproverName(leaveRequest.getApprover().getUsername());
        }
        dto.setApprovedAt(leaveRequest.getApprovedAt());
        dto.setApprovalNote(leaveRequest.getApprovalNote());

        dto.setCreatedAt(leaveRequest.getCreatedAt());

        return dto;
    }

    public List<LeaveRequestDTO> toDTOList(List<LeaveRequest> leaveRequests) {
        if (leaveRequests == null) {
            return null;
        }

        return leaveRequests.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }
}
