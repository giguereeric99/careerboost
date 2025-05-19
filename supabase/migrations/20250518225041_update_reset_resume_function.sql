-- Update the reset_resume function to handle selected_template
CREATE OR REPLACE FUNCTION public.reset_resume(p_resume_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Uses the permissions of the function creator
AS $$
DECLARE
  resume_exists BOOLEAN;
  original_template TEXT;
BEGIN
  -- Check if the resume exists
  SELECT EXISTS(SELECT 1 FROM resumes WHERE id = p_resume_id) INTO resume_exists;
  
  IF NOT resume_exists THEN
    RETURN FALSE; -- Return FALSE if resume doesn't exist
  END IF;

  -- Get the original template before reset (or default to "basic")
  SELECT COALESCE(selected_template, 'basic') 
  FROM resumes 
  WHERE id = p_resume_id 
  INTO original_template;

  -- Start a transaction to ensure atomicity
  BEGIN
    -- 1. Reset the resume content, ATS score, and keep the selected template
    UPDATE resumes 
    SET 
      last_saved_text = NULL,           -- Clear the saved text
      last_saved_score_ats = NULL,      -- Clear the saved ATS score
      selected_template = original_template, -- Reset to original template
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

-- Update execution rights
GRANT EXECUTE ON FUNCTION public.reset_resume(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_resume(UUID) TO service_role;

-- Update function comment
COMMENT ON FUNCTION public.reset_resume(UUID) IS 
'Resets a resume to its original optimized version.
This function:
1. Clears the last_saved_text and last_saved_score_ats fields in the resumes table
2. Resets the selected_template to its original value
3. Resets all suggestions in resume_suggestions by setting is_applied to FALSE
4. Resets all keywords in resume_keywords by setting is_applied to FALSE
All operations are atomic (in a transaction).';