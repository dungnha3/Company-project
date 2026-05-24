package DoAn.BE.project.repository;

import DoAn.BE.project.entity.ProjectExpense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ProjectExpenseRepository extends JpaRepository<ProjectExpense, Long> {
    List<ProjectExpense> findByProject_ProjectIdOrderByExpenseDateDesc(Long projectId);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM ProjectExpense e WHERE e.project.projectId = :projectId")
    BigDecimal sumAmountByProjectId(@Param("projectId") Long projectId);
}
