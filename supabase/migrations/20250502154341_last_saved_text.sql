-- Migration: Add last_saved_text column to resumes table
-- Description: This migration adds a new column to store the user's last manually saved version
-- of their resume, separate from the AI-optimized version.
-- Date: 2025-05-02

-- Step 1: Add the new column to store the last saved text
ALTER TABLE resumes 
ADD COLUMN last_saved_text TEXT;

-- Step 2: Add a comment to explain the column's purpose
COMMENT ON COLUMN resumes.last_saved_text IS 'Stores the latest manually saved version of the resume by the user, which may differ from the AI-optimized version in optimized_text';

-- Step 3: Update any existing records to initialize the last_saved_text with optimized_text
-- This ensures existing resumes will display correctly with the new logic
UPDATE resumes
SET last_saved_text = optimized_text
WHERE optimized_text IS NOT NULL;

-- Step 4: Add an index to speed up queries that filter by this column
CREATE INDEX idx_resumes_last_saved_text_not_null
ON resumes ((last_saved_text IS NOT NULL));

-- Step 5: Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: Added last_saved_text column to resumes table';
END $$;