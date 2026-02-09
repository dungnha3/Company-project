package DoAn.BE.user.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import DoAn.BE.user.entity.PersonalTask.RecurringPattern;
import DoAn.BE.user.entity.PersonalTask.TaskPriority;
import DoAn.BE.user.entity.PersonalTask.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

public class PersonalTaskDto {

    // ===== Request DTOs =====

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateRequest {
        @NotBlank(message = "Tiêu đề không được để trống")
        @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
        private String title;

        private String description;
        private LocalDate dueDate;
        private TaskPriority priority;

        // PRO features
        private List<String> labels;
        private RecurringPattern recurringPattern;
        private LocalDateTime reminderAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateRequest {
        @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
        private String title;

        private String description;
        private LocalDate dueDate;
        private TaskStatus status;
        private TaskPriority priority;

        // PRO features
        private List<String> labels;
        private RecurringPattern recurringPattern;
        private LocalDateTime reminderAt;
    }

    // ===== Response DTOs =====

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private Long taskId;
        private String title;
        private String description;
        private LocalDate dueDate;
        private TaskStatus status;
        private TaskPriority priority;
        private boolean overdue;

        // PRO features
        private List<String> labels;
        private RecurringPattern recurringPattern;
        private LocalDateTime reminderAt;

        // Timestamps
        private LocalDateTime createdAt;
        private LocalDateTime completedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StatsResponse {
        private int total;
        private int todo;
        private int inProgress;
        private int done;
        private int overdue;

        // Quota info
        private int maxTasks; // FREE=10, PRO=unlimited (-1)
        private boolean atLimit;
        private boolean isPro;
    }
}
