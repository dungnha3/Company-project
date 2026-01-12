package DoAn.BE.common.search;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.*;

import java.time.LocalDateTime;

/**
 * Elasticsearch document for Issue search
 */
@Document(indexName = "issues")
@Setting(settingPath = "elasticsearch/settings.json")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IssueDocument {

    @Id
    private String id;

    @Field(type = FieldType.Long)
    private Long issueId;

    @Field(type = FieldType.Long)
    private Long companyId;

    @Field(type = FieldType.Long)
    private Long projectId;

    @Field(type = FieldType.Keyword)
    private String issueKey;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String title;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String description;

    @Field(type = FieldType.Keyword)
    private String status;

    @Field(type = FieldType.Keyword)
    private String priority;

    @Field(type = FieldType.Keyword)
    private String assigneeName;

    @Field(type = FieldType.Long)
    private Long assigneeId;

    @Field(type = FieldType.Keyword)
    private String reporterName;

    @Field(type = FieldType.Keyword)
    private String projectName;

    @Field(type = FieldType.Date)
    private LocalDateTime createdAt;

    @Field(type = FieldType.Date)
    private LocalDateTime updatedAt;
}
