package DoAn.BE.hrm.entity;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.common.entity.TenantScopedEntity;
import org.hibernate.annotations.Filter;

// Attendance entity - renamed from ChamCong

// Tracks employee working hours and check-in/out
@Entity
@Table(name = "attendances", indexes = {
        @Index(name = "idx_att_employee_date", columnList = "employee_id, attendance_date"),
        @Index(name = "idx_att_date", columnList = "attendance_date"),
        @Index(name = "idx_att_status", columnList = "status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Filter(name = "tenantFilter", condition = "company_id = :companyId")
public class Attendance extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attendance_id")
    private Long attendanceId;

    @ManyToOne
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Column(name = "check_in_time")
    private LocalTime checkInTime;

    @Column(name = "check_out_time")
    private LocalTime checkOutTime;

    @Column(name = "working_hours", precision = 5, scale = 2)
    private BigDecimal workingHours = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30)
    private AttendanceStatus status;

    @Column(name = "note", length = 500)
    private String note;

    // GPS fields
    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "check_in_address", length = 500)
    private String checkInAddress;

    @Column(name = "distance")
    private Double distance; // Distance from office in meters

    @Enumerated(EnumType.STRING)
    @Column(name = "check_in_method", length = 20)
    private CheckInMethod checkInMethod = CheckInMethod.MANUAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "shift_type", length = 20)
    private ShiftType shiftType = ShiftType.FULL;

    @Override
    protected void onCreate() {
        super.onCreate();
        calculateWorkingHours();
        autoDetectStatus();
    }

    @PreUpdate
    protected void onUpdate() {
        calculateWorkingHours();
        autoDetectStatus();
    }

    private void calculateWorkingHours() {
        if (checkInTime != null && checkOutTime != null) {
            long minutes = java.time.Duration.between(checkInTime, checkOutTime).toMinutes();
            this.workingHours = BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        }
    }

    private void autoDetectStatus() {
        if (status == null && checkInTime != null) {
            LocalTime standardStart = LocalTime.of(8, 0);
            if (checkInTime.isAfter(standardStart)) {
                this.status = AttendanceStatus.LATE;
            } else if (checkOutTime != null && isEarlyLeave()) {
                this.status = AttendanceStatus.EARLY_LEAVE;
            } else if (checkOutTime != null) {
                this.status = AttendanceStatus.FULL_DAY;
            }
        }
    }

    public boolean isLate() {
        LocalTime standardStart = LocalTime.of(8, 0);
        return checkInTime != null && checkInTime.isAfter(standardStart);
    }

    public boolean isEarlyLeave() {
        LocalTime standardEnd = LocalTime.of(17, 0);
        return checkOutTime != null && checkOutTime.isBefore(standardEnd);
    }

    public enum AttendanceStatus {
        LATE, // DI_TRE
        EARLY_LEAVE, // VE_SOM
        FULL_DAY, // DU_GIO
        ON_LEAVE, // NGHI_PHEP
        ABSENT // NGHI_KHONG_PHEP
    }

    public enum CheckInMethod {
        GPS,
        MANUAL,
        QR_CODE,
        FACE_ID
    }

    public enum ShiftType {
        MORNING, // SANG
        AFTERNOON, // CHIEU
        EVENING, // TOI
        FULL // FULL
    }

}
