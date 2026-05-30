package DoAn.BE.common.config;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseMigrationRunner {

    private final EntityManager entityManager;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void runMigrations() {
        fixAvatarDataColumnType();
        fixEmployeeEncryptedColumns();
    }

    private void fixEmployeeEncryptedColumns() {
        try {
            fixColumnType("employees", "id_card", "ALTER TABLE employees ALTER COLUMN id_card TYPE TEXT USING encode(id_card, 'escape')");
            fixColumnType("employees", "phone", "ALTER TABLE employees ALTER COLUMN phone TYPE TEXT USING encode(phone, 'escape')");
        } catch (Exception e) {
            log.warn("[Migration] Could not fix employee encrypted columns: {}", e.getMessage());
        }
    }

    private void fixColumnType(String table, String column, String alterSql) {
        try {
            String checkSql = String.format(
                "SELECT data_type FROM information_schema.columns WHERE table_name = '%s' AND column_name = '%s'",
                table, column);
            Object result = entityManager.createNativeQuery(checkSql).getSingleResult();
            String currentType = result != null ? result.toString().toLowerCase() : "";
            if ("bytea".equals(currentType)) {
                log.warn("[Migration] Detected {}.{} as BYTEA. Altering to TEXT...", table, column);
                entityManager.createNativeQuery(alterSql).executeUpdate();
                log.info("[Migration] {}.{} column altered to TEXT successfully.", table, column);
            }
        } catch (Exception e) {
            log.warn("[Migration] Could not check/altered {}.{}: {}", table, column, e.getMessage());
        }
    }

    private void fixAvatarDataColumnType() {
        try {
            String checkSql = """
                SELECT data_type FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'avatar_data'
                """;
            Object result = entityManager.createNativeQuery(checkSql).getSingleResult();
            String currentType = result != null ? result.toString().toLowerCase() : "";

            if ("bytea".equals(currentType)) {
                log.warn("[Migration] Detected avatar_data column as BYTEA. Altering to TEXT...");
                entityManager.createNativeQuery(
                    "ALTER TABLE users ALTER COLUMN avatar_data TYPE TEXT USING encode(avatar_data, 'escape')"
                ).executeUpdate();
                log.info("[Migration] avatar_data column altered to TEXT successfully.");
            } else {
                log.info("[Migration] avatar_data column type is already: {}", currentType);
            }
        } catch (Exception e) {
            log.warn("[Migration] Could not check/altered avatar_data column: {}", e.getMessage());
        }
    }
}
