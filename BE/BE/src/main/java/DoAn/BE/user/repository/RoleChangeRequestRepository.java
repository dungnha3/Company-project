package DoAn.BE.user.repository;

import DoAn.BE.user.entity.RoleChangeRequest;
import DoAn.BE.user.entity.RoleChangeRequest.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoleChangeRequestRepository extends JpaRepository<RoleChangeRequest, Long> {
    
    List<RoleChangeRequest> findByStatus(RequestStatus status);
    
    List<RoleChangeRequest> findByTargetUser_UserId(Long userId);
    
    List<RoleChangeRequest> findByRequestedBy_UserId(Long userId);
    
    List<RoleChangeRequest> findByStatusOrderByCreatedAtDesc(RequestStatus status);
}
