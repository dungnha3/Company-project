package DoAn.BE.project.repository;

import DoAn.BE.project.entity.ProjectMember;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Repository
public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {

    // [OPTIMIZED: Fetch members with User and Project in single query]
    @EntityGraph(attributePaths = { "user", "project" })
    List<ProjectMember> findByProject_ProjectId(Long projectId);

    @EntityGraph(attributePaths = { "user", "project" })
    List<ProjectMember> findByUser_UserId(Long userId);

    @EntityGraph(attributePaths = { "user", "project" })
    Page<ProjectMember> findByUser_UserId(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = { "user", "project" })
    Optional<ProjectMember> findByProject_ProjectIdAndUser_UserId(Long projectId, Long userId);

    // [Count queries for optimization]
    long countByProject_ProjectId(Long projectId);

    // [Lấy danh sách user ID của team members mà PM quản lý] (Role: System)
    @Query("SELECT DISTINCT pm2.user.userId FROM ProjectMember pm1 " +
            "JOIN ProjectMember pm2 ON pm1.project.projectId = pm2.project.projectId " +
            "WHERE pm1.user.userId = :managerId AND pm1.role = 'MANAGER'")
    List<Long> findTeamMemberUserIdsByManager(@Param("managerId") Long managerId);
}
