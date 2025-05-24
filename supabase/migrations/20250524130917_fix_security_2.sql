-- =============================================================================
-- CAREERBOOST - Security Fix for Function Search Path
-- =============================================================================
-- 
-- Purpose: Fix search_path security warnings by using empty string
-- Issue: Functions using 'search_path = public' trigger security warnings
-- Solution: Use 'search_path = ''' and fully qualify all object references
--
-- Security Benefits:
-- - Prevents schema injection attacks
-- - Forces explicit schema qualification
-- - Follows Supabase security best practices
--
-- Author: CareerBoost Development Team
-- Date: 2025-01-24
-- =============================================================================

-- =============================================================================
-- SECTION 1: UPDATE save_resume_complete WITH SECURE SEARCH PATH
-- =============================================================================

CREATE OR REPLACE FUNCTION save_resume_complete(
    p_resume_id UUID, 
    p_content TEXT, 
    p_ats_score INTEGER, 
    p_applied_suggestions UUID[] DEFAULT ARRAY[]::UUID[], 
    p_applied_keywords TEXT[] DEFAULT ARRAY[]::TEXT[], 
    p_selected_template TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- Execute with creator's permissions for data consistency
SET search_path = ''  -- Security: Empty search_path prevents schema injection attacks
AS $$
DECLARE
  resume_exists BOOLEAN;
  suggestions_count INTEGER := 0;
  keywords_count INTEGER := 0;
  rows_affected INTEGER := 0;
BEGIN
  -- Input validation and operation logging
  RAISE LOG 'save_resume_complete: Operation started - resume_id: %, content_length: %, ats_score: %', 
    p_resume_id, LENGTH(p_content), p_ats_score;
  
  -- Verify resume exists before attempting any operations
  -- Note: Fully qualified table names due to empty search_path
  SELECT EXISTS(SELECT 1 FROM public.resumes WHERE id = p_resume_id) INTO resume_exists;
  
  IF NOT resume_exists THEN
    RAISE LOG 'save_resume_complete: Resume not found with ID %', p_resume_id;
    RETURN FALSE;
  END IF;
  
  -- Begin atomic transaction for all database operations
  BEGIN
    -- Step 1: Update main resume record with new content and metadata
    UPDATE public.resumes 
    SET 
      last_saved_text = p_content,
      last_saved_score_ats = p_ats_score,
      updated_at = NOW(),
      -- Update template only if new value provided, otherwise keep existing
      selected_template = CASE 
        WHEN p_selected_template IS NOT NULL THEN p_selected_template
        ELSE selected_template
      END
    WHERE id = p_resume_id;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RAISE LOG 'save_resume_complete: Resume record updated (% rows affected)', rows_affected;
    
    -- Step 2: Reset all suggestions to unapplied state first
    UPDATE public.resume_suggestions
    SET 
      is_applied = FALSE,
      updated_at = NOW()
    WHERE resume_id = p_resume_id;
    
    GET DIAGNOSTICS suggestions_count = ROW_COUNT;
    RAISE LOG 'save_resume_complete: Reset % suggestions to unapplied state', suggestions_count;
    
    -- Step 3: Apply selected suggestions based on provided IDs
    IF p_applied_suggestions IS NOT NULL AND array_length(p_applied_suggestions, 1) > 0 THEN
      UPDATE public.resume_suggestions
      SET 
        is_applied = TRUE,
        updated_at = NOW()
      WHERE resume_id = p_resume_id
      AND id = ANY(p_applied_suggestions);
      
      GET DIAGNOSTICS rows_affected = ROW_COUNT;
      RAISE LOG 'save_resume_complete: Applied % suggestions successfully', rows_affected;
    ELSE
      RAISE LOG 'save_resume_complete: No suggestions to apply';
    END IF;
    
    -- Step 4: Reset all keywords to unapplied state first
    UPDATE public.resume_keywords
    SET 
      is_applied = FALSE,
      updated_at = NOW()
    WHERE resume_id = p_resume_id;
    
    GET DIAGNOSTICS keywords_count = ROW_COUNT;
    RAISE LOG 'save_resume_complete: Reset % keywords to unapplied state', keywords_count;
    
    -- Step 5: Apply selected keywords based on provided text values
    IF p_applied_keywords IS NOT NULL AND array_length(p_applied_keywords, 1) > 0 THEN
      UPDATE public.resume_keywords
      SET 
        is_applied = TRUE,
        updated_at = NOW()
      WHERE resume_id = p_resume_id
      AND keyword = ANY(p_applied_keywords);
      
      GET DIAGNOSTICS rows_affected = ROW_COUNT;
      RAISE LOG 'save_resume_complete: Applied % keywords successfully', rows_affected;
    ELSE
      RAISE LOG 'save_resume_complete: No keywords to apply';
    END IF;
    
    -- Success logging with operation summary
    RAISE LOG 'save_resume_complete: Operation completed successfully for resume %', p_resume_id;
    RETURN TRUE;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Detailed error logging for debugging purposes
      RAISE LOG 'save_resume_complete: Transaction failed - SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
      RAISE LOG 'save_resume_complete: Error context - resume_id: %, content_length: %', p_resume_id, LENGTH(p_content);
      
      -- Re-raise exception to trigger transaction rollback
      RAISE;
      RETURN FALSE;
  END;
END;
$$;

-- =============================================================================
-- SECTION 2: UPDATE reset_resume WITH SECURE SEARCH PATH
-- =============================================================================

CREATE OR REPLACE FUNCTION reset_resume(p_resume_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- Execute with creator's permissions for data consistency
SET search_path = ''  -- Security: Empty search_path prevents schema injection attacks
AS $$
DECLARE
  resume_exists BOOLEAN;
  original_template TEXT;
  suggestions_count INTEGER := 0;
  keywords_count INTEGER := 0;
  rows_affected INTEGER := 0;
BEGIN
  -- Operation start logging
  RAISE LOG 'reset_resume: Operation started for resume_id %', p_resume_id;
  
  -- Verify resume exists before attempting reset operations
  -- Note: Fully qualified table names due to empty search_path
  SELECT EXISTS(SELECT 1 FROM public.resumes WHERE id = p_resume_id) INTO resume_exists;
  
  IF NOT resume_exists THEN
    RAISE LOG 'reset_resume: Resume not found with ID %', p_resume_id;
    RETURN FALSE;
  END IF;
  
  -- Get current template or default to "basic" for preservation
  SELECT COALESCE(selected_template, 'basic') 
  FROM public.resumes 
  WHERE id = p_resume_id 
  INTO original_template;
  
  -- Begin atomic transaction for all reset operations
  BEGIN
    -- Step 1: Reset resume to original optimized state (clear saved changes)
    UPDATE public.resumes 
    SET 
      last_saved_text = NULL,        -- Remove user modifications
      last_saved_score_ats = NULL,   -- Remove modified ATS score
      selected_template = original_template,  -- Preserve current template
      updated_at = NOW()             -- Update modification timestamp
    WHERE id = p_resume_id;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RAISE LOG 'reset_resume: Resume record reset (% rows affected)', rows_affected;
    
    -- Step 2: Reset all suggestions to unapplied state
    UPDATE public.resume_suggestions
    SET 
      is_applied = FALSE,
      updated_at = NOW()
    WHERE resume_id = p_resume_id;
    
    GET DIAGNOSTICS suggestions_count = ROW_COUNT;
    RAISE LOG 'reset_resume: Reset % suggestions to unapplied state', suggestions_count;
    
    -- Step 3: Reset all keywords to unapplied state
    UPDATE public.resume_keywords
    SET 
      is_applied = FALSE,
      updated_at = NOW()
    WHERE resume_id = p_resume_id;
    
    GET DIAGNOSTICS keywords_count = ROW_COUNT;
    RAISE LOG 'reset_resume: Reset % keywords to unapplied state', keywords_count;
    
    -- Success logging with operation summary
    RAISE LOG 'reset_resume: Operation completed successfully - resume: %, suggestions: %, keywords: %', 
      p_resume_id, suggestions_count, keywords_count;
    
    RETURN TRUE;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Detailed error logging for debugging
      RAISE LOG 'reset_resume: Transaction failed - SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
      RAISE LOG 'reset_resume: Error context - resume_id: %', p_resume_id;
      
      -- Re-raise exception to trigger transaction rollback
      RAISE;
      RETURN FALSE;
  END;
END;
$$;

-- =============================================================================
-- SECTION 3: VERIFICATION AND SECURITY CHECK
-- =============================================================================

-- Verify functions are updated with secure search_path
SELECT 
    routine_name as function_name,
    routine_type as type,
    security_type as security_context,
    CASE 
        WHEN prosecdef AND proleakproof THEN 'SECURE + LEAKPROOF'
        WHEN prosecdef THEN 'SECURE'
        ELSE 'STANDARD'
    END as security_level,
    'UPDATED' as status
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
WHERE r.routine_schema = 'public' 
AND r.routine_name IN ('save_resume_complete', 'reset_resume')
ORDER BY r.routine_name;

-- Check search_path configuration for both functions
SELECT 
    proname as function_name,
    CASE 
        WHEN proconfig IS NULL THEN 'No configuration'
        ELSE array_to_string(proconfig, ', ')
    END as configuration,
    CASE 
        WHEN 'search_path=' = ANY(proconfig) THEN 'SECURE (empty search_path)'
        WHEN 'search_path=public' = ANY(proconfig) THEN 'WARNING (public search_path)'
        ELSE 'UNKNOWN'
    END as security_status
FROM pg_proc 
WHERE proname IN ('save_resume_complete', 'reset_resume')
AND pronamespace = 'public'::regnamespace
ORDER BY proname;

-- =============================================================================
-- SECTION 4: COMPLETION NOTIFICATION
-- =============================================================================

-- Display security fix completion message
DO $$ 
BEGIN
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'CAREERBOOST SECURITY FIX COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Security improvements applied:';
    RAISE NOTICE '  - search_path set to empty string (prevents schema injection)';
    RAISE NOTICE '  - All table references fully qualified with public schema';
    RAISE NOTICE '  - Functions maintain SECURITY DEFINER context';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions updated:';
    RAISE NOTICE '  1. save_resume_complete - Now uses secure search_path';
    RAISE NOTICE '  2. reset_resume - Now uses secure search_path';
    RAISE NOTICE '';
    RAISE NOTICE 'RESULT: Supabase security warnings should now be resolved';
    RAISE NOTICE '=================================================================';
END $$;