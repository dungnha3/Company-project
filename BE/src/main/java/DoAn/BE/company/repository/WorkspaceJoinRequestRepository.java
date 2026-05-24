package DoAn.BE.company.repository;

import DoAn.BE.company.entity.WorkspaceJoinRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkspaceJoinRequestRepository extends JpaRepository<WorkspaceJoinRequest, Long> {

    // Tìm yêu cầu của 1 user vào 1 workspace
    Optional<WorkspaceJoinRequest> findByCompany_CompanyIdAndUser_UserId(Long companyId, Long userId);

    // Lấy danh sách yêu cầu đang chờ duyệt của 1 workspace
    List<WorkspaceJoinRequest> findByCompany_CompanyIdAndStatus(Long companyId, String status);

    // Lấy tất cả yêu cầu của 1 user
    List<WorkspaceJoinRequest> findByUser_UserId(Long userId);

    // Kiểm tra đã có yêu cầu PENDING chưa
    boolean existsByCompany_CompanyIdAndUser_UserIdAndStatus(Long companyId, Long userId, String status);
}
