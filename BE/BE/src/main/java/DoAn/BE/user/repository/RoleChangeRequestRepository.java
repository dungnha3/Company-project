package DoAn.BE.user.repository;

import DoAn.BE.user.entity.RoleChangeRequest;
import DoAn.BE.user.entity.RoleChangeRequest.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoleChangeRequestRepository extends JpaRepository<RoleChangeRequest, Long> {

    List<RoleChangeRequest> findByCompany_CompanyIdAndStatus(Long companyId, RequestStatus status);

    List<RoleChangeRequest> findByUser_UserIdAndCompany_CompanyId(Long userId, Long companyId);
}
