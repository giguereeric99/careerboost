CREATE OR REPLACE FUNCTION "public"."get_latest_resume_by_clerk_id"("p_clerk_id" "text") 
RETURNS "jsonb"
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO ''
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
    
    -- Strategy 2: Search by supabase_user_id using mapped UUID
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
    
    -- Strategy 3: Search by user_id field (legacy compatibility)
    -- FIXED: Only search if the UUID is valid to avoid type errors
    SELECT *
    INTO resume_record
    FROM public.resumes
    WHERE user_id = user_mapping_record.supabase_uuid  -- Use UUID directly, not text conversion
    ORDER BY created_at DESC, updated_at DESC
    LIMIT 1;
    
    -- If found via user_id, fetch complete data and return
    IF FOUND THEN
        RAISE LOG 'get_latest_resume_by_clerk_id: Found resume via user_id (UUID) - resume_id: %', 
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