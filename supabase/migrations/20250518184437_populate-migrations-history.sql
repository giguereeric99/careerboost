-- migration-populate-migrations-history.sql
-- Add previous migrations to the migrations tracking table

-- Make sure the migrations table exists first
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert records for all previous migrations in chronological order
-- Normalize the version format to ensure consistency
INSERT INTO migrations (version, name, applied_at)
VALUES 
    ('20250423201439', 'create_resumes_table', '2025-04-23 20:14:39+00'),
    ('20250423201747', 'add_file_size', '2025-04-23 20:17:47+00'),
    ('20250423203827', 'uuid', '2025-04-23 20:38:27+00'),
    ('20250423204840', 'migrate_existing_data', '2025-04-23 20:48:40+00'),
    ('20250424015533', 'add_auth_user_id_column', '2025-04-24 01:55:33+00'),
    ('20250424133347', 'add_ai_provider_column', '2025-04-24 13:33:47+00'),
    ('20250424192013', 'add_resume_keywords_and_suggestions_tables', '2025-04-24 19:20:13+00'),
    ('20250425141257', 'create_resumes_rls', '2025-04-25 14:12:57+00'),
    ('20250502154341', 'last_saved_text', '2025-05-02 15:43:41+00'),
    ('20250509003940', 'add_last_saved_score', '2025-05-09 00:39:40+00'),
    ('20250516155305', 'reset_resume_function', '2025-05-16 15:53:05+00'),
    ('20250516183510', 'save_resume_function', '2025-05-16 18:35:10+00'),
    ('20250518000000', 'create_migrations_table', '2025-05-18 00:00:00+00'),
    ('20250518001000', 'add_selected_template', '2025-05-18 00:10:00+00')
ON CONFLICT (version) DO UPDATE
SET name = EXCLUDED.name;

-- Verify all migrations are now in the table
SELECT version, name, applied_at 
FROM migrations 
ORDER BY applied_at, version;