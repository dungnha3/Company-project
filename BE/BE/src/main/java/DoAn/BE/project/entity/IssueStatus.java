package DoAn.BE.project.entity;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import lombok.*;

// Entity quản lý trạng thái của Issue (To Do, In Progress, Review, Done)
@Entity
@Table(name = "issue_statuses")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class IssueStatus {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "status_id")
    private Integer statusId;

    @Column(nullable = false, unique = true, length = 50)
    private String name;  // To Do, In Progress, Review, Done

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;  // Thứ tự: 1, 2, 3, 4

    @Column(length = 7)
    private String color;  // Hex color: #4BADE8

    // Relationships
    @OneToMany(mappedBy = "issueStatus")
    @JsonIgnore
    private List<Issue> issues;

    // Constructor
    public IssueStatus(String name, Integer orderIndex, String color) {
        this.name = name;
        this.orderIndex = orderIndex;
        this.color = color;
    }

    // Helper methods
    public boolean isToDo() {
        return "To Do".equals(this.name);
    }

    public boolean isInProgress() {
        return "In Progress".equals(this.name);
    }

    public boolean isDone() {
        return "Done".equals(this.name);
    }
}

