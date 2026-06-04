package DoAn.BE.project.entity;

import java.util.List;
import java.util.Locale;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "issue_statuses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class IssueStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "status_id")
    @EqualsAndHashCode.Include
    private Integer statusId;

    @Column(nullable = false, unique = true, length = 50)
    private String name; // To Do, In Progress, Review, Done

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex; // Thứ tự: 1, 2, 3, 4

    @Column(length = 7)
    private String color; // Hex color: #4BADE8

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

    public boolean isToDo() {
        return matchesAnyKeyword("todo", "to do", "backlog", "open", "new", "draft", "pending", "chua bat dau", "mo", "san sang")
                || hasOrderIndex(1, 0);
    }

    public boolean isInProgress() {
        return matchesAnyKeyword("progress", "doing", "develop", "development", "implement", "working", "dang thuc hien", "thuc hien", "xu ly")
                || hasOrderIndex(2, 1);
    }

    public boolean isReview() {
        return matchesAnyKeyword("review", "qa", "qc", "test", "testing", "verify", "verification", "approve", "approval", "danh gia", "kiem tra", "nghiem thu")
                || hasOrderIndex(3, 2);
    }

    public boolean isDone() {
        return matchesAnyKeyword("done", "complete", "completed", "finish", "finished", "resolved", "hoan thanh", "da hoan thanh", "da xong", "xong")
                || hasOrderIndex(4, 3);
    }

    private boolean hasOrderIndex(int... indices) {
        if (orderIndex == null) {
            return false;
        }
        for (int index : indices) {
            if (orderIndex == index) {
                return true;
            }
        }
        return false;
    }

    private boolean matchesAnyKeyword(String... keywords) {
        if (name == null || name.isBlank()) {
            return false;
        }
        String normalized = normalize(name);
        for (String keyword : keywords) {
            if (normalized.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private static String normalize(String value) {
        return java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }
}
