-- ============================================================================
-- Migration: Add phase_id foreign key to sprints table
-- Description: Allows Sprint entities to belong to a ProjectPhase
-- ============================================================================

-- Step 1: Add phase_id column (nullable, no FK constraint yet)
ALTER TABLE sprints
ADD COLUMN phase_id BIGINT NULL;

-- Step 2: Add FK constraint referencing project_phases.phase_id
-- Only succeeds if column is nullable first (avoids FK constraint errors on existing rows)
ALTER TABLE sprints
ADD CONSTRAINT fk_sprints_phase
FOREIGN KEY (phase_id)
REFERENCES project_phases(phase_id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Step 3: Create index for faster JOINs on phase_id
CREATE INDEX IF NOT EXISTS idx_sprints_phase_id ON sprints(phase_id);

-- ============================================================================
-- Rollback (if needed):
-- ALTER TABLE sprints DROP CONSTRAINT fk_sprints_phase;
-- ALTER TABLE sprints DROP COLUMN phase_id;
-- ============================================================================
