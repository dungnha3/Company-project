package DoAn.BE.project.repository;

import DoAn.BE.project.entity.IssueCustomFieldValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IssueCustomFieldValueRepository extends JpaRepository<IssueCustomFieldValue, Long> {

    // Find all custom field values for an issue
    // /
    List<IssueCustomFieldValue> findByIssue_IssueId(Long issueId);

    // Find value for specific issue and field
    // /
    Optional<IssueCustomFieldValue> findByIssue_IssueIdAndCustomField_FieldId(Long issueId, Long fieldId);

    // Delete all values for an issue
    // /
    @Modifying
    @Query("DELETE FROM IssueCustomFieldValue v WHERE v.issue.issueId = :issueId")
    void deleteAllByIssueId(@Param("issueId") Long issueId);

    // Delete all values for a custom field (when field is deleted)
    // /
    @Modifying
    @Query("DELETE FROM IssueCustomFieldValue v WHERE v.customField.fieldId = :fieldId")
    void deleteAllByFieldId(@Param("fieldId") Long fieldId);

    // Count issues using a specific custom field value
    // /
    @Query("SELECT COUNT(v) FROM IssueCustomFieldValue v WHERE v.customField.fieldId = :fieldId AND v.stringValue = :value")
    long countByFieldIdAndStringValue(@Param("fieldId") Long fieldId, @Param("value") String value);
}
