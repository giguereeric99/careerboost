-- migration-add-selected-template.sql
-- Migration to add the selected_template column to the resumes table

-- Check if the column already exists
DO $$
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns 
        WHERE table_name = 'resumes' 
        AND column_name = 'selected_template'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE resumes ADD COLUMN selected_template TEXT;
        
        -- Set a default value for existing entries
        UPDATE resumes SET selected_template = 'basic' WHERE selected_template IS NULL;
        
        -- Add a comment to the column for documentation
        COMMENT ON COLUMN resumes.selected_template IS 'ID of the template applied to the resume (basic, professional, creative, etc.)';
    END IF;
END $$;

-- Verification after migration
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_name = 'resumes' 
    AND column_name = 'selected_template';