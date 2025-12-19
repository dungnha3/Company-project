package DoAn.BE.ai.dto;

import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO cho các action mà AI có thể thực hiện
 * Khi AI detect user muốn tạo project/task, sẽ trả về action này
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIActionDTO {

    /**
     * Loại action
     */
    private ActionType actionType;

    /**
     * Trạng thái action
     */
    private ActionStatus status;

    /**
     * Thông điệp mô tả action
     */
    private String message;

    /**
     * Dữ liệu của action (tùy theo loại action)
     */
    private Map<String, Object> data;

    /**
     * ID của entity được tạo/cập nhật (nếu có)
     */
    private Long entityId;

    /**
     * Tên của entity được tạo/cập nhật
     */
    private String entityName;

    /**
     * Các loại action AI có thể thực hiện
     */
    public enum ActionType {
        // Project actions
        CREATE_PROJECT,
        UPDATE_PROJECT,
        DELETE_PROJECT,

        // Issue/Task actions
        CREATE_ISSUE,
        UPDATE_ISSUE,
        DELETE_ISSUE,
        ASSIGN_ISSUE,
        CHANGE_ISSUE_STATUS,

        // Sprint actions
        CREATE_SPRINT,
        START_SPRINT,
        COMPLETE_SPRINT,

        // Bulk actions
        CREATE_MULTIPLE_ISSUES,

        // Auto setup actions - Tự động thiết lập dự án hoàn chỉnh
        SETUP_PROJECT_COMPLETE, // Tạo project + tasks + members + assign
        ADD_PROJECT_MEMBERS, // Thêm thành viên vào project
        AUTO_ASSIGN_TASKS, // Tự động gán tasks cho members

        // Query actions (không thay đổi data)
        QUERY_PROJECTS,
        QUERY_ISSUES,
        QUERY_SPRINT_STATUS,

        // No action needed
        NONE
    }

    /**
     * Trạng thái của action
     */
    public enum ActionStatus {
        PENDING, // Chờ xác nhận từ user
        CONFIRMED, // User đã xác nhận
        EXECUTED, // Đã thực hiện
        FAILED, // Thất bại
        CANCELLED // User hủy
    }
}
