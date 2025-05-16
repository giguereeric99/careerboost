-- Create RPC function to reset a resume
CREATE OR REPLACE FUNCTION public.reset_resume(p_resume_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Uses the permissions of the function creator
AS $$
DECLARE
  resume_exists BOOLEAN;
BEGIN
  -- Check if the resume exists
  SELECT EXISTS(SELECT 1 FROM resumes WHERE id = p_resume_id) INTO resume_exists;
  
  IF NOT resume_exists THEN
    RETURN FALSE; -- Return FALSE if resume doesn't exist
  END IF;

  -- Start a transaction to ensure atomicity
  BEGIN
    -- 1. Reset the resume content and ATS score
    UPDATE resumes 
    SET 
      last_saved_text = NULL,           -- Clear the saved text
      last_saved_score_ats = NULL,      -- Clear the saved ATS score
      updated_at = NOW()                -- Update the timestamp
    WHERE id = p_resume_id;
    
    -- 2. Reset all suggestions to "not applied"
    UPDATE resume_suggestions
    SET 
      is_applied = FALSE,               -- Mark as not applied
      updated_at = NOW()                -- Update the timestamp
    WHERE resume_id = p_resume_id;
    
    -- 3. Reset all keywords to "not applied"
    UPDATE resume_keywords
    SET 
      is_applied = FALSE,               -- Mark as not applied
      updated_at = NOW()                -- Update the timestamp  
    WHERE resume_id = p_resume_id;
    
    -- If everything went well, commit the transaction
    RETURN TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      -- In case of error, cancel the transaction and return FALSE
      RAISE;
      RETURN FALSE;
  END;
END;
$$;

-- Add appropriate execution rights
-- Allow authenticated users to execute this function
GRANT EXECUTE ON FUNCTION public.reset_resume(UUID) TO authenticated;
-- Allow the service role to execute this function (for API calls)
GRANT EXECUTE ON FUNCTION public.reset_resume(UUID) TO service_role;

-- Add an explanatory comment to the function
COMMENT ON FUNCTION public.reset_resume(UUID) IS 
'Resets a resume to its original optimized version.
This function:
1. Clears the last_saved_text and last_saved_score_ats fields in the resumes table
2. Resets all suggestions in resume_suggestions by setting is_applied to FALSE
3. Resets all keywords in resume_keywords by setting is_applied to FALSE
All operations are atomic (in a transaction).';