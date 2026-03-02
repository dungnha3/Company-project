package DoAn.BE.project.repository;

import DoAn.BE.project.entity.ResourceAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResourceAllocationRepository extends JpaRepository<ResourceAllocation, Long> {

    @Query("SELECT ra FROM ResourceAllocation ra WHERE ra.company.companyId = :companyId")
    List<ResourceAllocation> findByCompanyId(@Param("companyId") Long companyId);

    @Query("SELECT ra FROM ResourceAllocation ra WHERE ra.company.companyId = :companyId AND ra.employee.employeeId = :employeeId")
    List<ResourceAllocation> findByCompanyIdAndEmployeeId(
            @Param("companyId") Long companyId, @Param("employeeId") Long employeeId);

    @Query("SELECT ra FROM ResourceAllocation ra WHERE ra.company.companyId = :companyId AND ra.project.projectId = :projectId")
    List<ResourceAllocation> findByCompanyIdAndProjectId(
            @Param("companyId") Long companyId, @Param("projectId") Long projectId);
}
