-- migration-populate-migrations-history-update.sql
-- Update migrations tracking table with new migration entries

-- Make sure the migrations table exists first
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert records for all migrations in chronological order, including the new ones
-- Normalize the version format to ensure consistency
INSERT INTO migrations (version, name, applied_at)
VALUES 
    ('20250518225041', 'update_reset_resume_function', '2025-05-18 22:50:41+00'),
    ('20250518225117', 'update_save_resume_complete_function', '2025-05-18 22:51:17+00')
ON CONFLICT (version) DO UPDATE
SET name = EXCLUDED.name;

-- Verify all migrations are now in the table
SELECT version, name, applied_at 
FROM migrations 
ORDER BY applied_at, version;