package DoAn.BE.hrm.repository;

import DoAn.BE.hrm.entity.OKR;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OKRRepository extends JpaRepository<OKR, Long> {

    List<OKR> findByPeriod(String period);

    @Query("SELECT o FROM OKR o WHERE o.owner.id = :userId")
    List<OKR> findByOwnerId(@Param("userId") Long userId);

    @Query("SELECT o FROM OKR o WHERE o.department.departmentId = :deptId")
    List<OKR> findByDepartmentId(@Param("deptId") Long deptId);

    @Query("SELECT o FROM OKR o WHERE (:period IS NULL OR o.period = :period)")
    List<OKR> findAllWithFilter(@Param("period") String period);
    List<OKR> findByCompany_CompanyId(Long companyId);

    List<OKR> findByPeriodAndCompany_CompanyId(String period, Long companyId);
}
