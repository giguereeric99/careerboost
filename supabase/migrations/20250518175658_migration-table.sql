-- migration-create-migrations-table.sql
-- Migration to create a migrations tracking table

-- Check if the migrations table already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
    ) THEN
        -- Create the migrations table for tracking applied database changes
        CREATE TABLE migrations (
            id SERIAL PRIMARY KEY,
            version VARCHAR(100) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            applied_at TIMESTAMP WITH TIME ZONE NOT NULL
        );

        -- Add index for faster lookups by version
        CREATE INDEX migrations_version_idx ON migrations(version);

        -- Add comment for documentation
        COMMENT ON TABLE migrations IS 'Tracks database migrations that have been applied to the system';
        COMMENT ON COLUMN migrations.version IS 'Version identifier, typically in format YYYYMMDDNNN';
        COMMENT ON COLUMN migrations.name IS 'Descriptive name of the migration';
        COMMENT ON COLUMN migrations.applied_at IS 'Timestamp when the migration was applied';
    END IF;
END $$;

-- Log this initial migration in the newly created table
-- This entry itself is the first migration
INSERT INTO migrations (version, name, applied_at)
VALUES ('20250518000', 'create-migrations-table', NOW())
ON CONFLICT (version) DO NOTHING;

-- Verify the table was created
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'migrations'
) AS migrations_table_exists;

-- Show the structure of the created table
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_name = 'migrations'
ORDER BY 
    ordinal_position;