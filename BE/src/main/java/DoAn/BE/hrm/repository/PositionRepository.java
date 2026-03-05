package DoAn.BE.hrm.repository;

import DoAn.BE.hrm.entity.Position;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PositionRepository extends JpaRepository<Position, Long> {

    Optional<Position> findByName(String name);

    boolean existsByName(String name);

    List<Position> findByLevel(Integer level);

    List<Position> findByLevelGreaterThanEqual(Integer level);

    List<Position> findAllByOrderByLevelAsc();

    // Count employees by position
    @Query("SELECT COUNT(e) FROM Employee e WHERE e.position.positionId = :positionId")
    long countEmployeesByPosition(@Param("positionId") Long positionId);

    // Search by keyword
    @Query("SELECT p FROM Position p WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Position> searchByKeyword(@Param("keyword") String keyword);
    List<Position> findByCompany_CompanyId(Long companyId);
}
