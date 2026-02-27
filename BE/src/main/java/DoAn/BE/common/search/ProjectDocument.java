package DoAn.BE.common.search;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.*;

// Elasticsearch document for Project search
// /
@Document(indexName = "projects")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectDocument {

    @Id
    private String id;

    @Field(type = FieldType.Long)
    private Long projectId;

    @Field(type = FieldType.Long)
    private Long companyId;

    @Field(type = FieldType.Keyword)
    private String projectKey;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String name;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String description;

    @Field(type = FieldType.Keyword)
    private String status;

    @Field(type = FieldType.Keyword)
    private String methodology;

    @Field(type = FieldType.Keyword)
    private String managerName;

    @Field(type = FieldType.Long)
    private Long managerId;

    @Field(type = FieldType.Integer)
    private Integer memberCount;

    @Field(type = FieldType.Integer)
    private Integer issueCount;
}
