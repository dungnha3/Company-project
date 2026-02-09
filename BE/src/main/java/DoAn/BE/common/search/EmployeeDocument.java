package DoAn.BE.common.search;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.*;

/**
 * Elasticsearch document for Employee search
 */
@Document(indexName = "employees")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDocument {

    @Id
    private String id;

    @Field(type = FieldType.Long)
    private Long employeeId;

    @Field(type = FieldType.Long)
    private Long companyId;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String fullName;

    @Field(type = FieldType.Keyword)
    private String email;

    @Field(type = FieldType.Keyword)
    private String departmentName;

    @Field(type = FieldType.Long)
    private Long departmentId;

    @Field(type = FieldType.Keyword)
    private String positionName;

    @Field(type = FieldType.Long)
    private Long positionId;

    @Field(type = FieldType.Keyword)
    private String status;
}
