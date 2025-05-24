-- =============================================================================
-- CAREERBOOST - Function Cleanup and Recreation Migration
-- =============================================================================
-- 
-- Purpose: Fix function overload conflicts and add SECURITY DEFINER context
-- Issues: Multiple function signatures causing SQLSTATE 42725 errors
-- Solution: Clean removal and recreation with proper permissions
--
-- Functions addressed:
-- 1. save_resume_complete - Atomic save for resume + suggestions + keywords
-- 2. reset_resume - Reset resume to original optimized state
--
-- Author: CareerBoost Development Team
-- Date: 2025-01-24
-- =============================================================================

-- =============================================================================
-- SECTION 1: DIAGNOSTIC - Identify existing function versions
-- =============================================================================

-- Check all existing versions of save_resume_complete function
SELECT 
    routine_name,
    specific_name,
    routine_type,
    security_type,
    routine_definition IS NOT NULL as has_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'save_resume_complete';

-- =============================================================================
-- SECTION 2: CLEANUP - Remove all existing function versions
-- =============================================================================

-- Drop all existing versions of save_resume_complete to avoid conflicts
-- Using CASCADE to handle any dependencies safely
DROP FUNCTION IF EXISTS save_resume_complete(UUID, TEXT, INTEGER, UUID[], TEXT[]) CASCADE;
DROP FUNCTION IF EXISTS save_resume_complete(UUID, TEXT, INTEGER, UUID[], TEXT[], TEXT) CASCADE;

-- Drop reset_resume function for clean recreation
DROP FUNCTION IF EXISTS reset_resume(UUID) CASCADE;

-- =============================================================================
-- SECTION 3: CREATE OPTIMIZED save_resume_complete FUNCTION
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
SECURITY DEFINER  -- Critical: Execute with creator's permissions, not caller's
SET search_path = public  -- Ensure consistent schema resolution
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
-- SECTION 4: CREATE OPTIMIZED reset_resume FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION reset_resume(p_resume_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- Execute with creator's permissions for data consistency
SET search_path = public
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
-- SECTION 5: GRANT EXECUTION PERMISSIONS
-- =============================================================================

-- Grant execution permissions with specific function signatures to avoid ambiguity
GRANT EXECUTE ON FUNCTION save_resume_complete(UUID, TEXT, INTEGER, UUID[], TEXT[], TEXT) 
TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION reset_resume(UUID) 
TO authenticated, service_role;

-- =============================================================================
-- SECTION 6: VALIDATION AND VERIFICATION
-- =============================================================================

-- Verify functions were created successfully with correct security context
SELECT 
    routine_name as function_name,
    specific_name as internal_name,
    routine_type as type,
    security_type as security_context,
    'SUCCESS' as creation_status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('save_resume_complete', 'reset_resume')
ORDER BY routine_name;

-- Verify execution permissions were granted correctly
SELECT 
    routine_name as function_name,
    grantee as role,
    privilege_type as permission,
    is_grantable as can_grant_to_others
FROM information_schema.routine_privileges 
WHERE routine_schema = 'public' 
AND routine_name IN ('save_resume_complete', 'reset_resume')
AND grantee IN ('authenticated', 'service_role')
ORDER BY routine_name, grantee;

-- =============================================================================
-- SECTION 7: COMPLETION NOTIFICATION
-- =============================================================================

-- Display completion message with operation summary
DO $$ 
BEGIN
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'CAREERBOOST RPC FUNCTIONS MIGRATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Functions recreated with SECURITY DEFINER context:';
    RAISE NOTICE '  1. save_resume_complete(UUID, TEXT, INTEGER, UUID[], TEXT[], TEXT)';
    RAISE NOTICE '  2. reset_resume(UUID)';
    RAISE NOTICE '';
    RAISE NOTICE 'Security Features:';
    RAISE NOTICE '  - SECURITY DEFINER: Functions execute with creator permissions';
    RAISE NOTICE '  - Atomic transactions: All operations succeed or fail together';
    RAISE NOTICE '  - Detailed logging: Operations logged for debugging';
    RAISE NOTICE '  - Input validation: Resume existence verified before operations';
    RAISE NOTICE '';
    RAISE NOTICE 'Permissions granted to: authenticated, service_role roles';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEP: Test resume saving functionality from CareerBoost app';
    RAISE NOTICE 'Check Postgres logs for detailed operation information';
    RAISE NOTICE '=================================================================';
END $$;