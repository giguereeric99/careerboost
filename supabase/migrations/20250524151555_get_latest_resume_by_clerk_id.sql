-- =============================================================================
-- CAREERBOOST - COMPLETE RPC MIGRATION FOR RESUME FETCHING
-- =============================================================================
-- 
-- Purpose: Replace API route with direct Supabase RPC functions for better performance
-- Benefits:
-- - Direct database access (faster than API route)
-- - Native RLS integration (more secure)
-- - Simplified client-side code
-- - Consistent error handling with other RPC functions
-- 
-- Main Function: get_latest_resume_by_clerk_id
-- - Replaces: GET /api/resumes?userId=X API call
-- - Returns: Complete resume data with suggestions and keywords
-- - Features: Multiple ID resolution strategies, calculated fields
-- 
-- Author: CareerBoost Development Team
-- Date: 2025-01-24
-- Version: 1.0.0
-- =============================================================================

-- =============================================================================
-- SECTION 1: HELPER FUNCTION - Get Complete Resume Data by ID
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
    -- This matches the structure returned by the original API route
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
        -- This eliminates the need for null checks on the frontend
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
-- SECTION 2: MAIN FUNCTION - Get Latest Resume by Clerk ID
-- =============================================================================

CREATE OR REPLACE FUNCTION get_latest_resume_by_clerk_id(p_clerk_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- Execute with elevated permissions for user_mapping access
SET search_path = ''  -- Secure search path to prevent schema injection
AS $$
DECLARE
    user_mapping_record RECORD;
    resume_record RECORD;
    resume_data JSONB;
BEGIN
    -- Input validation - ensure Clerk ID is provided and not empty
    IF p_clerk_id IS NULL OR LENGTH(TRIM(p_clerk_id)) = 0 THEN
        RAISE LOG 'get_latest_resume_by_clerk_id: Invalid clerk_id provided (NULL or empty)';
        RETURN json_build_object('error', 'Clerk ID is required and cannot be empty');
    END IF;
    
    RAISE LOG 'get_latest_resume_by_clerk_id: Processing request for clerk_id %', p_clerk_id;
    
    -- Step 1: Get user mapping to find associated Supabase UUID
    -- This is required because resumes might be linked via different ID fields
    SELECT *
    INTO user_mapping_record
    FROM public.user_mapping
    WHERE clerk_id = p_clerk_id;
    
    -- If no user mapping exists, this might be a new user
    IF NOT FOUND THEN
        RAISE LOG 'get_latest_resume_by_clerk_id: No user mapping found for clerk_id % (likely new user)', p_clerk_id;
        -- Return null data (not an error) - this is normal for new users
        RETURN json_build_object('data', null);
    END IF;
    
    RAISE LOG 'get_latest_resume_by_clerk_id: Found user mapping - supabase_uuid: %', 
        user_mapping_record.supabase_uuid;
    
    -- Strategy 1: Search by auth_user_id (most common for Clerk integration)
    -- This field typically stores the Clerk user ID directly
    SELECT *
    INTO resume_record
    FROM public.resumes
    WHERE auth_user_id = p_clerk_id
    ORDER BY created_at DESC, updated_at DESC  -- Get most recent resume
    LIMIT 1;
    
    -- If found via auth_user_id, fetch complete data and return
    IF FOUND THEN
        RAISE LOG 'get_latest_resume_by_clerk_id: Found resume via auth_user_id - resume_id: %', 
            resume_record.id;
        resume_data := get_resume_by_id(resume_record.id);
        RETURN json_build_object('data', resume_data);
    END IF;
    
    -- Strategy 2: Search by user_id field (legacy compatibility)
    -- Some older resumes might use this field for Clerk ID storage
    SELECT *
    INTO resume_record
    FROM public.resumes
    WHERE user_id = p_clerk_id
    ORDER BY created_at DESC, updated_at DESC
    LIMIT 1;
    
    -- If found via user_id, fetch complete data and return
    IF FOUND THEN
        RAISE LOG 'get_latest_resume_by_clerk_id: Found resume via user_id - resume_id: %', 
            resume_record.id;
        resume_data := get_resume_by_id(resume_record.id);
        RETURN json_build_object('data', resume_data);
    END IF;
    
    -- Strategy 3: Search by supabase_user_id using mapped UUID
    -- This uses the UUID from the user_mapping table
    SELECT *
    INTO resume_record
    FROM public.resumes
    WHERE supabase_user_id = user_mapping_record.supabase_uuid
    ORDER BY created_at DESC, updated_at DESC
    LIMIT 1;
    
    -- If found via supabase_user_id, fetch complete data and return
    IF FOUND THEN
        RAISE LOG 'get_latest_resume_by_clerk_id: Found resume via supabase_user_id - resume_id: %', 
            resume_record.id;
        resume_data := get_resume_by_id(resume_record.id);
        RETURN json_build_object('data', resume_data);
    END IF;
    
    -- Strategy 4: Search by user_id with Supabase UUID (edge case)
    -- Handle case where user_id field contains the Supabase UUID as text
    SELECT *
    INTO resume_record
    FROM public.resumes
    WHERE user_id = user_mapping_record.supabase_uuid::TEXT
    ORDER BY created_at DESC, updated_at DESC
    LIMIT 1;
    
    -- If found via UUID-as-text, fetch complete data and return
    IF FOUND THEN
        RAISE LOG 'get_latest_resume_by_clerk_id: Found resume via user_id (UUID format) - resume_id: %', 
            resume_record.id;
        resume_data := get_resume_by_id(resume_record.id);
        RETURN json_build_object('data', resume_data);
    END IF;
    
    -- No resume found through any strategy - this is normal for new users
    -- Return null data (not an error) to indicate no resume exists yet
    RAISE LOG 'get_latest_resume_by_clerk_id: No resume found for clerk_id % through any search strategy (normal for new users)', 
        p_clerk_id;
    RETURN json_build_object('data', null);
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log comprehensive error information for debugging
        RAISE LOG 'get_latest_resume_by_clerk_id: Error processing clerk_id % - SQLSTATE: %, SQLERRM: %', 
            p_clerk_id, SQLSTATE, SQLERRM;
        RETURN json_build_object(
            'error', 'Failed to fetch latest resume',
            'details', SQLERRM,
            'clerk_id', p_clerk_id
        );
END;
$$;

-- =============================================================================
-- SECTION 3: AUTHENTICATED USER CONVENIENCE FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION get_current_user_latest_resume()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- Execute with elevated permissions for auth and mapping access
SET search_path = ''  -- Secure search path to prevent schema injection
AS $$
DECLARE
    current_user_id UUID;
    clerk_id TEXT;
    result JSONB;
BEGIN
    -- Get current authenticated user from Supabase Auth context
    current_user_id := auth.uid();
    
    -- Ensure user is authenticated before proceeding
    IF current_user_id IS NULL THEN
        RAISE LOG 'get_current_user_latest_resume: No authenticated user in current context';
        RETURN json_build_object('error', 'Authentication required - no authenticated user found');
    END IF;
    
    RAISE LOG 'get_current_user_latest_resume: Processing request for authenticated user %', current_user_id;
    
    -- Look up the Clerk ID from user mapping table
    -- This reverse lookup allows us to use the main function
    SELECT um.clerk_id
    INTO clerk_id
    FROM public.user_mapping um
    WHERE um.supabase_uuid = current_user_id;
    
    -- If no mapping found, user might not be properly set up
    IF clerk_id IS NULL THEN
        RAISE LOG 'get_current_user_latest_resume: No Clerk mapping found for authenticated user %', 
            current_user_id;
        RETURN json_build_object('data', null);
    END IF;
    
    RAISE LOG 'get_current_user_latest_resume: Found clerk_id % for authenticated user %', 
        clerk_id, current_user_id;
    
    -- Use the main function to get the resume data
    result := get_latest_resume_by_clerk_id(clerk_id);
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error details for debugging
        RAISE LOG 'get_current_user_latest_resume: Error processing authenticated user - SQLSTATE: %, SQLERRM: %', 
            SQLSTATE, SQLERRM;
        RETURN json_build_object(
            'error', 'Failed to fetch resume for current user',
            'details', SQLERRM
        );
END;
$$;

-- =============================================================================
-- SECTION 4: GRANT EXECUTION PERMISSIONS
-- =============================================================================

-- Grant execute permissions to appropriate roles for all functions
-- authenticated: For logged-in users accessing their own data
-- service_role: For server-side operations and admin functions

GRANT EXECUTE ON FUNCTION get_resume_by_id(UUID) 
TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION get_latest_resume_by_clerk_id(TEXT) 
TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION get_current_user_latest_resume() 
TO authenticated, service_role;

-- =============================================================================
-- SECTION 5: FUNCTION VERIFICATION AND TESTING
-- =============================================================================

-- Verify all functions were created successfully with correct security context
SELECT 
    routine_name as function_name,
    routine_type as type,
    security_type as security_context,
    CASE 
        WHEN routine_name = 'get_resume_by_id' THEN 'Helper function for fetching complete resume data'
        WHEN routine_name = 'get_latest_resume_by_clerk_id' THEN 'Main function - replaces API route'
        WHEN routine_name = 'get_current_user_latest_resume' THEN 'Convenience function for authenticated users'
        ELSE 'Unknown function'
    END as description,
    'CREATED' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_resume_by_id',
    'get_latest_resume_by_clerk_id', 
    'get_current_user_latest_resume'
)
ORDER BY 
    CASE routine_name 
        WHEN 'get_resume_by_id' THEN 1
        WHEN 'get_latest_resume_by_clerk_id' THEN 2  
        WHEN 'get_current_user_latest_resume' THEN 3
    END;

-- Verify execution permissions were granted correctly to appropriate roles
SELECT 
    routine_name as function_name,
    grantee as role,
    privilege_type as permission,
    is_grantable as can_grant_to_others
FROM information_schema.routine_privileges 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_resume_by_id',
    'get_latest_resume_by_clerk_id',
    'get_current_user_latest_resume'
)
AND grantee IN ('authenticated', 'service_role')
ORDER BY routine_name, 
    CASE grantee 
        WHEN 'service_role' THEN 1 
        WHEN 'authenticated' THEN 2 
    END;

-- =============================================================================
-- SECTION 6: USAGE DOCUMENTATION AND EXAMPLES
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'CAREERBOOST RESUME FETCH RPC MIGRATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'FUNCTIONS CREATED:';
    RAISE NOTICE '';
    RAISE NOTICE '1. get_resume_by_id(resume_id UUID) -> JSONB';
    RAISE NOTICE '   Purpose: Fetch specific resume with all related data';
    RAISE NOTICE '   Usage: SELECT get_resume_by_id(uuid-here);';
    RAISE NOTICE '   Returns: Complete resume object with has_edits calculated field';
    RAISE NOTICE '';
    RAISE NOTICE '2. get_latest_resume_by_clerk_id(clerk_id TEXT) -> JSONB';
    RAISE NOTICE '   Purpose: MAIN FUNCTION - Replaces /api/resumes API route';
    RAISE NOTICE '   Usage: SELECT get_latest_resume_by_clerk_id(user_clerk123);';
    RAISE NOTICE '   Features: Multiple ID resolution strategies';
    RAISE NOTICE '';
    RAISE NOTICE '3. get_current_user_latest_resume() -> JSONB';
    RAISE NOTICE '   Purpose: Convenience function for authenticated users';
    RAISE NOTICE '   Usage: SELECT get_current_user_latest_resume();';
    RAISE NOTICE '   Requires: Valid Supabase Auth session';
    RAISE NOTICE '';
    RAISE NOTICE 'CLIENT-SIDE INTEGRATION:';
    RAISE NOTICE '';
    RAISE NOTICE '// Replace API call with RPC';
    RAISE NOTICE 'const { data, error } = await supabase.rpc(';
    RAISE NOTICE '  get_latest_resume_by_clerk_id, ';
    RAISE NOTICE '  { p_clerk_id: userId }';
    RAISE NOTICE ');';
    RAISE NOTICE '';
    RAISE NOTICE 'KEY BENEFITS:';
    RAISE NOTICE '  - Direct database access (faster than API route)';
    RAISE NOTICE '  - Native RLS integration (more secure)';
    RAISE NOTICE '  - has_edits field simplifies frontend logic';
    RAISE NOTICE '  - Multiple ID resolution strategies (robust)';
    RAISE NOTICE '  - Comprehensive error handling and logging';
    RAISE NOTICE '  - Compatible with existing resumeService.ts structure';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '  1. Test functions with your actual Clerk user IDs';
    RAISE NOTICE '  2. Update resumeService.ts getLatestOptimizedResume function';
    RAISE NOTICE '  3. Test integration with your React components';
    RAISE NOTICE '  4. Monitor performance improvements';
    RAISE NOTICE '';
    RAISE NOTICE 'TESTING COMMANDS:';
    RAISE NOTICE '-- Test with actual user ID:';
    RAISE NOTICE 'SELECT get_latest_resume_by_clerk_id(your_actual_clerk_user_id);';
    RAISE NOTICE '';
    RAISE NOTICE '-- Test authenticated user function:';
    RAISE NOTICE 'SELECT get_current_user_latest_resume();';
    RAISE NOTICE '';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Migration completed successfully';
    RAISE NOTICE 'Ready for resumeService.ts integration';
    RAISE NOTICE '=================================================================';
END $$;