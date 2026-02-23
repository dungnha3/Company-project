package DoAn.BE.hrm.repository;

import DoAn.BE.hrm.entity.OnboardingInstance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OnboardingInstanceRepository extends JpaRepository<OnboardingInstance, Long> {

    @Query("SELECT oi FROM OnboardingInstance oi WHERE oi.status = 'IN_PROGRESS'")
    List<OnboardingInstance> findActiveInstances();

    List<OnboardingInstance> findByEmployeeEmployeeId(Long employeeId);
}
