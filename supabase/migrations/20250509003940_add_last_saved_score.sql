-- Migration to add last_saved_score_ats column to resumes table
-- This column tracks the ATS score when a user saves edits to their resume
-- Similar to how last_saved_text stores the edited content

-- Step 1: Add the new column to the resumes table
ALTER TABLE "public"."resumes" 
ADD COLUMN "last_saved_score_ats" INTEGER;

-- Step 2: Add comment to the column to document its purpose
COMMENT ON COLUMN "public"."resumes"."last_saved_score_ats" IS 
'Stores the ATS score at the time of saving edits to a resume. 
Set to NULL when resume is reset to original optimized version.';

-- Step 3: Add constraint to ensure the score value is within a valid range (0-100)
ALTER TABLE "public"."resumes" 
ADD CONSTRAINT "resumes_last_saved_score_ats_range" 
CHECK (last_saved_score_ats IS NULL OR (last_saved_score_ats >= 0 AND last_saved_score_ats <= 100));