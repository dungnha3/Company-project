package DoAn.BE.project.entity;

import jakarta.persistence.*;
import lombok.*;
import DoAn.BE.user.entity.User;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "project_members", uniqueConstraints = @UniqueConstraint(columnNames = { "project_id",
        "user_id" }), indexes = {
                @jakarta.persistence.Index(name = "idx_pm_project", columnList = "project_id"),
                @jakarta.persistence.Index(name = "idx_pm_user", columnList = "user_id")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
public class ProjectMember extends DoAn.BE.common.entity.BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ProjectRole role = ProjectRole.MEMBER;

    // ===== Project-centric HR fields (Module 2) =====

    /** Vị trí trong dự án: "Frontend Dev", "BA", "QC" — tự nhập tự do */
    @Column(length = 100)
    private String position;

    /** % thời gian tham gia dự án này (0-100) */
    @Column(name = "allocation_rate")
    private Integer allocationRate;

    /** Trạng thái tham gia dự án */
    @Enumerated(EnumType.STRING)
    @Column(name = "member_status", length = 20)
    private MemberStatus memberStatus = MemberStatus.ACTIVE;

    /** Ngày bắt đầu tham gia dự án */
    @Column(name = "join_date")
    private LocalDate joinDate;

    /** Ngày rời dự án (null = đang active) */
    @Column(name = "leave_date")
    private LocalDate leaveDate;

    /** Số năm kinh nghiệm */
    @Column(name = "years_of_experience")
    private Integer yearsOfExperience;

    /** Phí nội bộ/giờ — dùng tính Project Cost */
    @Column(name = "billing_rate", precision = 10, scale = 2)
    private BigDecimal billingRate;

    /** Ghi chú kỹ năng từ PM (tích hợp Skill Matrix nhẹ) */
    @Column(name = "skill_notes", length = 500)
    private String skillNotes;

    // Constructor cơ bản
    public ProjectMember(Project project, User user, ProjectRole role) {
        this.project = project;
        this.user = user;
        this.role = role;
        this.joinDate = LocalDate.now();
        this.memberStatus = MemberStatus.ACTIVE;
    }

    public boolean isOwner() {
        return this.role == ProjectRole.OWNER;
    }

    public boolean isManager() {
        return this.role == ProjectRole.MANAGER;
    }

    public boolean canManageProject() {
        return this.role == ProjectRole.OWNER || this.role == ProjectRole.MANAGER;
    }

    // Enums
    public enum ProjectRole {
        OWNER,   // Chủ project - full permissions
        MANAGER, // Quản lý - manage issues, sprints
        MEMBER   // Thành viên - view, create issues
    }

    public enum MemberStatus {
        ACTIVE,   // Đang tham gia
        INACTIVE, // Tạm ngừng
        PENDING   // Chờ xác nhận
    }
}
