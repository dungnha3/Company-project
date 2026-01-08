package DoAn.BE.hrm.mapper;

import DoAn.BE.hrm.dto.SalaryDTO;
import DoAn.BE.hrm.entity.Salary;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class SalaryMapper {

    // Convert Salary entity to SalaryDTO
    public SalaryDTO toDTO(Salary salary) {
        if (salary == null) {
            return null;
        }

        SalaryDTO dto = new SalaryDTO();
        dto.setSalaryId(salary.getSalaryId());

        // Employee Info
        if (salary.getEmployee() != null) {
            dto.setEmployeeId(salary.getEmployee().getEmployeeId());
            dto.setEmployeeName(salary.getEmployee().getFullName());
        }

        // Period Info
        dto.setMonth(salary.getMonth());
        dto.setYear(salary.getYear());
        dto.setPeriod(salary.getPeriod());

        // Income
        dto.setBaseSalary(salary.getBaseSalary());
        dto.setWorkingDays(salary.getWorkingDays());
        dto.setStandardWorkingDays(salary.getStandardWorkingDays());
        dto.setProratedSalary(salary.getProratedSalary());
        dto.setAllowance(salary.getAllowance());
        dto.setBonus(salary.getBonus());
        dto.setOvertimeHours(salary.getOvertimeHours());
        dto.setOvertimePay(salary.getOvertimePay());

        // Deductions
        dto.setSocialInsurance(salary.getSocialInsurance());
        dto.setHealthInsurance(salary.getHealthInsurance());
        dto.setUnemploymentInsurance(salary.getUnemploymentInsurance());
        dto.setPersonalIncomeTax(salary.getPersonalIncomeTax());
        dto.setOtherDeductions(salary.getOtherDeductions());

        // Summary
        dto.setGrossSalary(salary.getGrossSalary());
        dto.setTotalDeductions(salary.getTotalDeductions());
        dto.setNetSalary(salary.getNetSalary());

        dto.setPaymentStatus(salary.getPaymentStatus());
        dto.setNote(salary.getNote());
        dto.setCreatedAt(salary.getCreatedAt());

        return dto;
    }

    public List<SalaryDTO> toDTOList(List<Salary> salaries) {
        if (salaries == null) {
            return null;
        }

        return salaries.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }
}
