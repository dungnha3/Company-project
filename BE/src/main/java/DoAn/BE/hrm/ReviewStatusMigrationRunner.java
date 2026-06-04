package DoAn.BE.hrm;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class ReviewStatusMigrationRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ReviewStatusMigrationRunner.class);
    private final JdbcTemplate jdbcTemplate;

    public ReviewStatusMigrationRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        log.info("Starting review status migration (IN_PROGRESS -> PENDING)...");
        try {
            int updatedRows = jdbcTemplate.update("UPDATE reviews SET status = 'PENDING' WHERE status = 'IN_PROGRESS'");
            if (updatedRows > 0) {
                log.info("Successfully migrated {} reviews from IN_PROGRESS to PENDING", updatedRows);
            } else {
                log.info("No reviews with status IN_PROGRESS found. Migration skipped.");
            }
        } catch (Exception e) {
            log.error("Failed to migrate review statuses", e);
        }
    }
}
