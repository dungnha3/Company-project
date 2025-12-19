package DoAn.BE.project.repository;

import DoAn.BE.project.entity.ProjectMember;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {
    List<ProjectMember> findByProject_ProjectId(Long projectId);
    List<ProjectMember> findByUser_UserId(Long userId);
    Optional<ProjectMember> findByProject_ProjectIdAndUser_UserId(Long projectId, Long userId);
    
    /**
     * Lấy danh sách user ID của team members mà Project Manager quản lý
     * Fixed: Dùng JOIN thay vì subquery để tránh lỗi Hibernate validation
     */
    @Query("SELECT DISTINCT pm2.user.userId FROM ProjectMember pm1 " +
           "JOIN ProjectMember pm2 ON pm1.project.projectId = pm2.project.projectId " +
           "WHERE pm1.user.userId = :managerId AND pm1.role = 'MANAGER'")
    List<Long> findTeamMemberUserIdsByManager(@Param("managerId") Long managerId);
}


