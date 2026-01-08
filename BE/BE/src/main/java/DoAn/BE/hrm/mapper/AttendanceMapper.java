package DoAn.BE.hrm.mapper;

import DoAn.BE.hrm.dto.AttendanceDTO;
import DoAn.BE.hrm.entity.Attendance;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class AttendanceMapper {

    // Convert Attendance entity to AttendanceDTO
    public AttendanceDTO toDTO(Attendance attendance) {
        if (attendance == null) {
            return null;
        }

        AttendanceDTO dto = new AttendanceDTO();
        dto.setAttendanceId(attendance.getAttendanceId());

        // Employee Info
        if (attendance.getEmployee() != null) {
            dto.setEmployeeId(attendance.getEmployee().getEmployeeId());
            dto.setEmployeeName(attendance.getEmployee().getFullName());

            if (attendance.getEmployee().getDepartment() != null) {
                dto.setDepartment(attendance.getEmployee().getDepartment().getName());
            }

            if (attendance.getEmployee().getUser() != null) {
                dto.setAvatarUrl(attendance.getEmployee().getUser().getAvatarUrl());
            }
        }

        // Attendance Info
        dto.setAttendanceDate(attendance.getAttendanceDate());
        dto.setCheckInTime(attendance.getCheckInTime());
        dto.setCheckOutTime(attendance.getCheckOutTime());
        dto.setWorkingHours(attendance.getWorkingHours());
        dto.setStatus(attendance.getStatus());
        dto.setNote(attendance.getNote());
        dto.setCreatedAt(attendance.getCreatedAt());

        // Computed fields
        dto.setIsLate(attendance.isLate());
        dto.setIsEarlyLeave(attendance.isEarlyLeave());

        return dto;
    }

    public List<AttendanceDTO> toDTOList(List<Attendance> attendances) {
        if (attendances == null) {
            return null;
        }

        return attendances.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }
}
