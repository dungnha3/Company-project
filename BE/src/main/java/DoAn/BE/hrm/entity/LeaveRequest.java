package DoAn.BE.hrm.entity;

import DoAn.BE.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

import DoAn.BE.common.entity.TenantScopedEntity;
import org.hibernate.annotations.Filter;

// LeaveRequest entity - renamed from NghiPhep

// Tracks employee leave/time-off requests
@Entity
@Table(name = "leave_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
@Filter(name = "tenantFilter", condition = "company_id = :companyId")
public class LeaveRequest extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "leave_request_id")
    @EqualsAndHashCode.Include
    private Long leaveRequestId;

    @ManyToOne
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Enumerated(EnumType.STRING)
    @Column(name = "leave_type", nullable = false, length = 50)
    private LeaveType leaveType;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "total_days", nullable = false)
    private Integer totalDays;

    @Column(name = "reason", length = 500, columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30)
    private LeaveStatus status = LeaveStatus.PENDING;

    // Approver (single-step approval — anyone with leaveApprove permission)
    @ManyToOne
    @JoinColumn(name = "approver_id")
    private User approver;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "approval_note", length = 500, columnDefinition = "TEXT")
    private String approvalNote;

    // Legacy PM/Accounting columns kept for backward compatibility with existing
    // data
    @ManyToOne
    @JoinColumn(name = "pm_approver_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User pmApprover;

    @Column(name = "pm_approved_at")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private LocalDateTime pmApprovedAt;

    @Column(name = "pm_note", length = 500, columnDefinition = "TEXT")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String pmNote;

    @ManyToOne
    @JoinColumn(name = "accounting_approver_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User accountingApprover;

    @Column(name = "accounting_approved_at")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private LocalDateTime accountingApprovedAt;

    @Column(name = "accounting_note", length = 500, columnDefinition = "TEXT")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String accountingNote;

    // Optional: gắn với dự án để biết nghỉ phép ảnh hưởng dự án nào
    @Column(name = "project_id")
    private Long projectId;

    @Column(name = "project_name", length = 200)
    private String projectName;

    @Override
    protected void onCreate() {
        super.onCreate();
        calculateDays();
    }

    @PreUpdate
    protected void onUpdate() {
        calculateDays();
    }

    private void calculateDays() {
        if (startDate != null && endDate != null) {
            long days = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate) + 1;
            this.totalDays = (int) days;
        }
    }

    public void approve(User approverUser, String note) {
        this.status = LeaveStatus.APPROVED;
        this.approver = approverUser;
        this.approvedAt = LocalDateTime.now();
        this.approvalNote = note;
    }

    public void reject(User approverUser, String note) {
        this.status = LeaveStatus.REJECTED;
        this.approver = approverUser;
        this.approvedAt = LocalDateTime.now();
        this.approvalNote = note;
    }

    public boolean isPending() {
        return status == LeaveStatus.PENDING;
    }

    public boolean isApproved() {
        return status == LeaveStatus.APPROVED;
    }

    public boolean isRejected() {
        return status == LeaveStatus.REJECTED;
    }

    public enum LeaveType {
        ANNUAL, // PHEP_NAM
        SICK, // OM
        UNPAID, // KO_LUONG
        OTHER // KHAC
    }

    public enum LeaveStatus {
        PENDING, // CHO_DUYET
        APPROVED, // DA_DUYET
        REJECTED // TU_CHOI
    }

}
