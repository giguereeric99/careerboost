-- Update the save_resume_complete function to handle selected_template
CREATE OR REPLACE FUNCTION public.save_resume_complete(
  p_resume_id UUID,
  p_content TEXT,
  p_ats_score INT,
  p_applied_suggestions UUID[],
  p_applied_keywords TEXT[],
  p_selected_template TEXT DEFAULT NULL
)
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
    -- 1. Update the resume content, ATS score, and template if provided
    UPDATE resumes 
    SET 
      last_saved_text = p_content,
      last_saved_score_ats = p_ats_score,
      updated_at = NOW(),
      -- Update selected_template only if a new value is provided
      selected_template = CASE 
        WHEN p_selected_template IS NOT NULL THEN p_selected_template
        ELSE selected_template
      END
    WHERE id = p_resume_id;
    
    -- 2. Reset all suggestions to not applied first
    UPDATE resume_suggestions
    SET 
      is_applied = FALSE,
      updated_at = NOW()
    WHERE resume_id = p_resume_id;
    
    -- 3. Set specified suggestions to applied
    IF array_length(p_applied_suggestions, 1) > 0 THEN
      UPDATE resume_suggestions
      SET 
        is_applied = TRUE,
        updated_at = NOW()
      WHERE resume_id = p_resume_id
      AND id = ANY(p_applied_suggestions);
    END IF;
    
    -- 4. Reset all keywords to not applied first
    UPDATE resume_keywords
    SET 
      is_applied = FALSE,
      updated_at = NOW()
    WHERE resume_id = p_resume_id;
    
    -- 5. Set specified keywords to applied
    IF array_length(p_applied_keywords, 1) > 0 THEN
      UPDATE resume_keywords
      SET 
        is_applied = TRUE,
        updated_at = NOW()
      WHERE resume_id = p_resume_id
      AND keyword = ANY(p_applied_keywords);
    END IF;
    
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
GRANT EXECUTE ON FUNCTION public.save_resume_complete(UUID, TEXT, INT, UUID[], TEXT[], TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_resume_complete(UUID, TEXT, INT, UUID[], TEXT[], TEXT) TO service_role;

-- Update function comment
COMMENT ON FUNCTION public.save_resume_complete(UUID, TEXT, INT, UUID[], TEXT[], TEXT) IS 
'Saves a resume with all changes atomically.
This function:
1. Updates the last_saved_text and last_saved_score_ats fields in the resumes table
2. Updates the selected_template field if provided
3. Resets all suggestions in resume_suggestions and then sets specified ones to applied
4. Resets all keywords in resume_keywords and then sets specified ones to applied
All operations are performed in a single transaction to ensure atomicity.';