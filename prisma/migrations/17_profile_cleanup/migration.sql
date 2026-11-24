-- Drop profile columns the application does not use.
BEGIN;

DROP INDEX IF EXISTS ix_profile_photo_file_id;
ALTER TABLE profile DROP CONSTRAINT IF EXISTS fk_profile_photo_file_id;
ALTER TABLE profile DROP COLUMN photo_file_id;
ALTER TABLE profile DROP COLUMN preferred_language;
ALTER TABLE profile DROP COLUMN notes;

COMMIT;
