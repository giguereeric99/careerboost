-- =============================================================================
-- CAREERBOOST - FIX MISSING RPC FUNCTION MIGRATION
-- =============================================================================
-- 
-- Purpose: Create missing get_resume_by_id function that was not properly created
-- in the previous migration
-- 
-- Issue: get_latest_resume_by_clerk_id calls get_resume_by_id but it doesn't exist
-- Solution: Create the missing helper function with proper permissions
-- 
-- Author: CareerBoost Development Team
-- Date: 2025-01-24
-- Version: 1.0.1 (Hotfix)
-- =============================================================================

-- =============================================================================
-- SECTION 1: CREATE MISSING HELPER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION get_resume_by_id(p_resume_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- Execute with elevated permissions for cross-table access
SET search_path = ''  -- Secure search path to prevent schema injection
AS $$
DECLARE
    resume_record RECORD;
    suggestions_data JSONB;
    keywords_data JSONB;
    result JSONB;
BEGIN
    -- Input validation - ensure resume ID is provided
    IF p_resume_id IS NULL THEN
        RAISE LOG 'get_resume_by_id: resume_id parameter cannot be NULL';
        RETURN json_build_object('error', 'Resume ID is required');
    END IF;
    
    RAISE LOG 'get_resume_by_id: Fetching resume data for ID %', p_resume_id;
    
    -- Fetch the main resume record from database
    SELECT *
    INTO resume_record
    FROM public.resumes
    WHERE id = p_resume_id;
    
    -- Check if resume exists in database
    IF NOT FOUND THEN
        RAISE LOG 'get_resume_by_id: Resume with ID % not found in database', p_resume_id;
        RETURN json_build_object('error', 'Resume not found');
    END IF;
    
    -- Fetch all suggestions associated with this resume
    -- Use COALESCE to return empty array if no suggestions exist
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', id,
                'text', text,
                'type', type,
                'impact', impact,
                'is_applied', is_applied,
                'isApplied', is_applied,  -- Compatibility field for frontend
                'created_at', created_at,
                'updated_at', updated_at
            )
        ), '[]'::jsonb
    ) INTO suggestions_data
    FROM public.resume_suggestions
    WHERE resume_id = p_resume_id;
    
    -- Fetch all keywords associated with this resume
    -- Use COALESCE to return empty array if no keywords exist
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', id,
                'keyword', keyword,
                'text', keyword,  -- Compatibility field - some components expect 'text'
                'is_applied', is_applied,
                'applied', is_applied,  -- Compatibility field - some components expect 'applied'
                'created_at', created_at,
                'updated_at', updated_at
            )
        ), '[]'::jsonb
    ) INTO keywords_data
    FROM public.resume_keywords
    WHERE resume_id = p_resume_id;
    
    -- Build comprehensive result object with all resume data
    -- This matches the structure expected by the frontend
    result := jsonb_build_object(
        -- Main resume fields
        'id', resume_record.id,
        'user_id', resume_record.user_id,
        'supabase_user_id', resume_record.supabase_user_id,
        'auth_user_id', resume_record.auth_user_id,
        'original_text', resume_record.original_text,
        'optimized_text', resume_record.optimized_text,
        'last_saved_text', resume_record.last_saved_text,
        'file_name', resume_record.file_name,
        'file_type', resume_record.file_type,
        'file_url', resume_record.file_url,
        'file_size', resume_record.file_size,
        'language', resume_record.language,
        'ai_provider', resume_record.ai_provider,
        'ats_score', resume_record.ats_score,
        'last_saved_score_ats', resume_record.last_saved_score_ats,
        'selected_template', resume_record.selected_template,
        'created_at', resume_record.created_at,
        'updated_at', resume_record.updated_at,
        
        -- Related data arrays
        'suggestions', suggestions_data,
        'keywords', keywords_data,
        'resume_suggestions', suggestions_data,  -- API compatibility
        'resume_keywords', keywords_data,       -- API compatibility
        
        -- Calculated convenience field - indicates if user has made edits
        'has_edits', (resume_record.last_saved_text IS NOT NULL)
    );
    
    RAISE LOG 'get_resume_by_id: Successfully fetched complete data for resume %', p_resume_id;
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log detailed error information for debugging
        RAISE LOG 'get_resume_by_id: Error fetching resume % - SQLSTATE: %, SQLERRM: %', 
            p_resume_id, SQLSTATE, SQLERRM;
        RETURN json_build_object(
            'error', 'Failed to fetch resume data',
            'details', SQLERRM
        );
END;
$$;

-- =============================================================================
-- SECTION 2: GRANT EXECUTION PERMISSIONS
-- =============================================================================

-- Grant execute permissions to appropriate roles
GRANT EXECUTE ON FUNCTION get_resume_by_id(UUID) TO authenticated, service_role;

-- =============================================================================
-- SECTION 3: VERIFICATION
-- =============================================================================

-- Verify the function was created successfully
SELECT 
    routine_name as function_name,
    routine_type as type,
    security_type as security_context,
    'CREATED' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_resume_by_id';

-- Verify execution permissions were granted
SELECT 
    routine_name as function_name,
    grantee as role,
    privilege_type as permission
FROM information_schema.routine_privileges 
WHERE routine_schema = 'public' 
AND routine_name = 'get_resume_by_id'
AND grantee IN ('authenticated', 'service_role');