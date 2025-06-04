-- Migration: Fix suggestions mapping in get_latest_resume_by_clerk_id function
-- Date: 2025-06-03
-- Description: Add 'applied' compatibility field to suggestions to match keywords structure

-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_latest_resume_by_clerk_id(text);

-- Recreate the function with fixed suggestions mapping
CREATE OR REPLACE FUNCTION public.get_latest_resume_by_clerk_id(p_clerk_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    user_mapping_record RECORD;
    resume_record RECORD;
    suggestions_data JSONB;
    keywords_data JSONB;
    result JSONB;
BEGIN
    -- Input validation - ensure Clerk ID is provided and not empty
    IF p_clerk_id IS NULL OR LENGTH(TRIM(p_clerk_id)) = 0 THEN
        RAISE LOG 'get_latest_resume_by_clerk_id: Invalid clerk_id provided (NULL or empty)';
        RETURN json_build_object('error', 'Clerk ID is required and cannot be empty');
    END IF;
    
    RAISE LOG 'get_latest_resume_by_clerk_id: Processing request for clerk_id %', p_clerk_id;
    
    -- Step 1: Get user mapping to find associated Supabase UUID
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
    SELECT *
    INTO resume_record
    FROM public.resumes
    WHERE auth_user_id = p_clerk_id
    ORDER BY created_at DESC, updated_at DESC
    LIMIT 1;
    
    -- If not found, try Strategy 2: Search by supabase_user_id
    IF NOT FOUND THEN
        SELECT *
        INTO resume_record
        FROM public.resumes
        WHERE supabase_user_id = user_mapping_record.supabase_uuid
        ORDER BY created_at DESC, updated_at DESC
        LIMIT 1;
    END IF;
    
    -- If not found, try Strategy 3: Search by user_id with UUID
    IF NOT FOUND THEN
        SELECT *
        INTO resume_record
        FROM public.resumes
        WHERE user_id = user_mapping_record.supabase_uuid
        ORDER BY created_at DESC, updated_at DESC
        LIMIT 1;
    END IF;
    
    -- If no resume found through any strategy
    IF NOT FOUND THEN
        RAISE LOG 'get_latest_resume_by_clerk_id: No resume found for clerk_id % (normal for new users)', p_clerk_id;
        RETURN json_build_object('data', null);
    END IF;
    
    RAISE LOG 'get_latest_resume_by_clerk_id: Found resume with ID %', resume_record.id;
    
    -- FIXED: Fetch all suggestions with consistent structure (added 'applied' field)
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', id,
                'text', text,
                'type', type,
                'impact', impact,
                'is_applied', is_applied,
                'isApplied', is_applied,  -- Compatibility field for frontend
                'applied', is_applied,    -- FIXED: Added compatibility field to match keywords
                'created_at', created_at,
                'updated_at', updated_at
            )
        ), '[]'::jsonb
    ) INTO suggestions_data
    FROM public.resume_suggestions
    WHERE resume_id = resume_record.id;
    
    -- Fetch all keywords associated with this resume (unchanged)
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', id,
                'keyword', keyword,
                'text', keyword,  -- Compatibility field
                'is_applied', is_applied,
                'applied', is_applied,  -- Compatibility field
                'created_at', created_at,
                'updated_at', updated_at
            )
        ), '[]'::jsonb
    ) INTO keywords_data
    FROM public.resume_keywords
    WHERE resume_id = resume_record.id;
    
    -- Build comprehensive result object with all resume data
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
        
        -- Calculated convenience field
        'has_edits', (resume_record.last_saved_text IS NOT NULL)
    );
    
    RAISE LOG 'get_latest_resume_by_clerk_id: Successfully fetched complete data for resume %', resume_record.id;
    RETURN json_build_object('data', result);
    
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

-- Grant necessary permissions
GRANT ALL ON FUNCTION public.get_latest_resume_by_clerk_id(text) TO anon;
GRANT ALL ON FUNCTION public.get_latest_resume_by_clerk_id(text) TO authenticated;
GRANT ALL ON FUNCTION public.get_latest_resume_by_clerk_id(text) TO service_role;

-- Log migration completion
DO $$
BEGIN
    RAISE LOG 'Migration completed: Fixed suggestions mapping in get_latest_resume_by_clerk_id function';
END $$;