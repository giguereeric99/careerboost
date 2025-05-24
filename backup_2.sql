

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."can_use_feature"("p_clerk_id" "text", "p_feature" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    access_result JSON;
BEGIN
    -- Input validation
    IF p_clerk_id IS NULL OR p_feature IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Use the main access check function
    access_result := public.check_feature_access(p_clerk_id, p_feature, 0); -- 0 increment = check only
    
    RETURN (access_result ->> 'allowed')::BOOLEAN;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'can_use_feature: Error for % checking % - %', p_clerk_id, p_feature, SQLERRM;
        RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."can_use_feature"("p_clerk_id" "text", "p_feature" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_feature_access"("p_clerk_id" "text", "p_feature" "text", "p_increment" integer DEFAULT 1) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    user_record RECORD;
    plan_limits JSONB;
    current_usage INTEGER := 0;
    limit_value INTEGER;
    feature_enabled BOOLEAN;
    new_usage JSONB;
BEGIN
    -- Input validation
    IF p_clerk_id IS NULL OR LENGTH(TRIM(p_clerk_id)) = 0 THEN
        RETURN json_build_object('allowed', false, 'reason', 'Invalid clerk_id provided');
    END IF;
    
    IF p_feature IS NULL OR LENGTH(TRIM(p_feature)) = 0 THEN
        RETURN json_build_object('allowed', false, 'reason', 'Invalid feature specified');
    END IF;
    
    RAISE LOG 'check_feature_access: Checking % for user %', p_feature, p_clerk_id;
    
    -- Get user mapping with subscription info
    SELECT *
    INTO user_record
    FROM public.user_mapping
    WHERE clerk_id = p_clerk_id 
    AND subscription_status = 'active';
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'allowed', false, 
            'reason', 'No active subscription found'
        );
    END IF;
    
    -- Check if usage needs monthly reset
    IF user_record.usage_reset_date <= NOW() THEN
        UPDATE public.user_mapping 
        SET 
            usage_data = '{}',
            usage_reset_date = date_trunc('month', NOW()) + INTERVAL '1 month'
        WHERE clerk_id = p_clerk_id;
        
        user_record.usage_data := '{}';
    END IF;
    
    -- Get limits for current plan
    plan_limits := public.get_plan_limits(user_record.subscription_plan);
    
    -- Handle feature-based access (job_search, ai_interview)
    IF p_feature IN ('job_search', 'ai_interview') THEN
        feature_enabled := (plan_limits ->> (p_feature || '_enabled'))::BOOLEAN;
        
        IF NOT feature_enabled THEN
            RETURN json_build_object(
                'allowed', false,
                'reason', 'Feature not available in ' || user_record.subscription_plan || ' plan',
                'plan', user_record.subscription_plan,
                'upgrade_needed', true
            );
        END IF;
        
        -- For enabled features without usage limits, return success
        RETURN json_build_object(
            'allowed', true,
            'plan', user_record.subscription_plan,
            'feature_enabled', true
        );
    END IF;
    
    -- Handle usage-based limits (cv_optimizations_per_month, etc.)
    limit_value := (plan_limits ->> p_feature)::INTEGER;
    
    -- If limit is -1, it's unlimited
    IF limit_value = -1 THEN
        RETURN json_build_object(
            'allowed', true, 
            'unlimited', true,
            'plan', user_record.subscription_plan
        );
    END IF;
    
    -- Get current usage for this feature
    current_usage := COALESCE((user_record.usage_data ->> p_feature)::INTEGER, 0);
    
    -- Check if incrementing would exceed limit
    IF current_usage + p_increment > limit_value THEN
        RETURN json_build_object(
            'allowed', false,
            'current_usage', current_usage,
            'limit', limit_value,
            'plan', user_record.subscription_plan,
            'reason', 'Usage limit exceeded for ' || p_feature,
            'upgrade_needed', true
        );
    END IF;
    
    -- Increment usage for usage-based features
    new_usage := COALESCE(user_record.usage_data, '{}'::JSONB) || 
                 jsonb_build_object(p_feature, current_usage + p_increment);
    
    UPDATE public.user_mapping 
    SET usage_data = new_usage
    WHERE clerk_id = p_clerk_id;
    
    RETURN json_build_object(
        'allowed', true,
        'current_usage', current_usage + p_increment,
        'limit', limit_value,
        'plan', user_record.subscription_plan
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'check_feature_access: Error for % - %', p_clerk_id, SQLERRM;
        RETURN json_build_object(
            'allowed', false,
            'reason', 'System error occurred'
        );
END;
$$;


ALTER FUNCTION "public"."check_feature_access"("p_clerk_id" "text", "p_feature" "text", "p_increment" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_usage_limits"("p_clerk_id" "text", "p_feature" "text", "p_increment" integer DEFAULT 1) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    user_record RECORD;
    plan_limits JSONB;
    current_usage INTEGER := 0;
    limit_value INTEGER;
    new_usage JSONB;
BEGIN
    -- Input validation
    IF p_clerk_id IS NULL OR LENGTH(TRIM(p_clerk_id)) = 0 THEN
        RETURN json_build_object('allowed', false, 'reason', 'Invalid clerk_id provided');
    END IF;
    
    IF p_feature IS NULL OR LENGTH(TRIM(p_feature)) = 0 THEN
        RETURN json_build_object('allowed', false, 'reason', 'Invalid feature specified');
    END IF;
    
    IF p_increment < 0 THEN
        RETURN json_build_object('allowed', false, 'reason', 'Invalid increment value');
    END IF;
    
    RAISE LOG 'check_usage_limits: Checking % for user % (increment: %)', p_feature, p_clerk_id, p_increment;
    
    -- Get user mapping with subscription info
    SELECT *
    INTO user_record
    FROM public.user_mapping
    WHERE clerk_id = p_clerk_id 
    AND subscription_status = 'active';
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'allowed', false, 
            'reason', 'No active subscription found'
        );
    END IF;
    
    -- Check if usage needs monthly reset
    IF user_record.usage_reset_date <= NOW() THEN
        -- Reset usage data for new month
        UPDATE public.user_mapping 
        SET 
            usage_data = '{}',
            usage_reset_date = date_trunc('month', NOW()) + INTERVAL '1 month'
        WHERE clerk_id = p_clerk_id;
        
        user_record.usage_data := '{}';
        RAISE LOG 'check_usage_limits: Reset monthly usage for user %', p_clerk_id;
    END IF;
    
    -- Get limits for current plan
    plan_limits := public.get_plan_limits(user_record.subscription_plan);
    limit_value := (plan_limits ->> p_feature)::INTEGER;
    
    -- If limit is -1, it's unlimited (Expert plan)
    IF limit_value = -1 THEN
        RAISE LOG 'check_usage_limits: Unlimited access for % on % plan', p_clerk_id, user_record.subscription_plan;
        RETURN json_build_object(
            'allowed', true, 
            'unlimited', true,
            'plan', user_record.subscription_plan
        );
    END IF;
    
    -- Get current usage for this feature
    current_usage := COALESCE((user_record.usage_data ->> p_feature)::INTEGER, 0);
    
    -- Check if incrementing would exceed limit
    IF current_usage + p_increment > limit_value THEN
        RAISE LOG 'check_usage_limits: Usage limit exceeded for % - current: %, limit: %', 
            p_clerk_id, current_usage, limit_value;
        RETURN json_build_object(
            'allowed', false,
            'current_usage', current_usage,
            'limit', limit_value,
            'plan', user_record.subscription_plan,
            'reason', 'Usage limit exceeded - upgrade needed'
        );
    END IF;
    
    -- Increment usage
    new_usage := COALESCE(user_record.usage_data, '{}'::JSONB) || 
                 jsonb_build_object(p_feature, current_usage + p_increment);
    
    UPDATE public.user_mapping 
    SET usage_data = new_usage
    WHERE clerk_id = p_clerk_id;
    
    RAISE LOG 'check_usage_limits: Usage updated for % - new count: %', p_clerk_id, current_usage + p_increment;
    
    RETURN json_build_object(
        'allowed', TRUE,
        'current_usage', current_usage + p_increment,
        'limit', limit_value,
        'plan', user_record.subscription_plan
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'check_usage_limits: Error for % - %', p_clerk_id, SQLERRM;
        RETURN json_build_object(
            'allowed', false,
            'reason', 'System error occurred',
            'error_detail', SQLERRM
        );
END;
$$;


ALTER FUNCTION "public"."check_usage_limits"("p_clerk_id" "text", "p_feature" "text", "p_increment" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_clerk_user"("p_clerk_id" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    mapping_record RECORD;
    result JSON;
BEGIN
    -- Input validation
    IF p_clerk_id IS NULL OR LENGTH(TRIM(p_clerk_id)) = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid clerk_id provided');
    END IF;
    
    RAISE LOG 'delete_clerk_user: Processing deletion for %', p_clerk_id;
    
    -- Find the mapping
    SELECT * INTO mapping_record
    FROM public.user_mapping 
    WHERE clerk_id = p_clerk_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User mapping not found',
            'clerk_id', p_clerk_id
        );
    END IF;
    
    -- Delete from Supabase Auth (cascades to user_mapping and related data)
    DELETE FROM auth.users WHERE id = mapping_record.supabase_uuid;
    
    RAISE LOG 'delete_clerk_user: Successfully deleted user %', p_clerk_id;
    
    RETURN json_build_object(
        'success', true,
        'action', 'deleted',
        'clerk_id', p_clerk_id,
        'supabase_uuid', mapping_record.supabase_uuid
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'delete_clerk_user: Error deleting % - %', p_clerk_id, SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'clerk_id', p_clerk_id
        );
END;
$$;


ALTER FUNCTION "public"."delete_clerk_user"("p_clerk_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_latest_resume"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."get_current_user_latest_resume"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_latest_resume_by_clerk_id"("p_clerk_id" "text") RETURNS "jsonb"
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


ALTER FUNCTION "public"."get_latest_resume_by_clerk_id"("p_clerk_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_plan_limits"("plan_name" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" IMMUTABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    -- Input validation
    IF plan_name IS NULL OR LENGTH(TRIM(plan_name)) = 0 THEN
        RAISE LOG 'get_plan_limits: Invalid plan_name provided';
        -- Return basic plan limits as fallback
        RETURN '{
            "cv_optimizations_per_month": 1,
            "job_search_enabled": false,
            "ai_interview_enabled": false,
            "templates_available": 1
        }'::JSONB;
    END IF;
    
    -- Return plan limits based on plan name
    CASE LOWER(TRIM(plan_name))
        WHEN 'basic' THEN
            RETURN '{
                "cv_optimizations_per_month": 1,
                "job_search_enabled": false,
                "ai_interview_enabled": false,
                "templates_available": 1
            }'::JSONB;
        WHEN 'pro' THEN
            RETURN '{
                "cv_optimizations_per_month": -1,
                "job_search_enabled": true,
                "ai_interview_enabled": false,
                "templates_available": -1
            }'::JSONB;
        WHEN 'expert' THEN
            RETURN '{
                "cv_optimizations_per_month": -1,
                "job_search_enabled": true,
                "ai_interview_enabled": true,
                "templates_available": -1
            }'::JSONB;
        ELSE
            -- Log unknown plan and return basic as fallback
            RAISE LOG 'get_plan_limits: Unknown plan "%" - defaulting to basic', plan_name;
            RETURN '{
                "cv_optimizations_per_month": 1,
                "job_search_enabled": false,
                "ai_interview_enabled": false,
                "templates_available": 1
            }'::JSONB;
    END CASE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'get_plan_limits: Error processing plan "%" - %', plan_name, SQLERRM;
        -- Return basic plan as safe fallback
        RETURN '{
            "cv_optimizations_per_month": 1,
            "job_search_enabled": false,
            "ai_interview_enabled": false,
            "templates_available": 1
        }'::JSONB;
END;
$$;


ALTER FUNCTION "public"."get_plan_limits"("plan_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_plan_limits"("plan_name" "text") IS 'Returns the limits for a given subscription plan - easily modifiable';



CREATE OR REPLACE FUNCTION "public"."get_resume_by_id"("p_resume_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."get_resume_by_id"("p_resume_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_subscription_info"("p_clerk_id" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    user_record RECORD;
    plan_limits JSONB;
    features JSONB;
    result JSON;
BEGIN
    -- Input validation
    IF p_clerk_id IS NULL OR LENGTH(TRIM(p_clerk_id)) = 0 THEN
        RETURN json_build_object('error', 'Invalid clerk_id provided');
    END IF;
    
    -- Get user mapping
    SELECT * INTO user_record
    FROM public.user_mapping
    WHERE clerk_id = p_clerk_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'User not found');
    END IF;
    
    -- Get plan limits
    plan_limits := public.get_plan_limits(user_record.subscription_plan);
    
    -- Define features based on subscription plan
    features := CASE user_record.subscription_plan
        WHEN 'basic' THEN '{
            "cv_optimization": true, 
            "cv_optimizations_per_month": 1, 
            "basic_templates": true,
            "job_search": false,
            "ai_interview": false,
            "email_support": false
        }'::JSONB
        WHEN 'pro' THEN '{
            "cv_optimization": true, 
            "cv_optimizations_per_month": -1, 
            "pro_templates": true,
            "job_search": true,
            "ai_interview": false,
            "priority_support": true
        }'::JSONB  
        WHEN 'expert' THEN '{
            "cv_optimization": true, 
            "cv_optimizations_per_month": -1, 
            "pro_templates": true,
            "job_search": true,
            "ai_interview": true,
            "priority_support": true
        }'::JSONB
        ELSE '{}'::JSONB
    END;
    
    SELECT json_build_object(
        'user', json_build_object(
            'clerk_id', user_record.clerk_id,
            'supabase_uuid', user_record.supabase_uuid,
            'subscription_plan', user_record.subscription_plan,
            'subscription_status', user_record.subscription_status,
            'subscription_period_end', user_record.subscription_period_end,
            'usage_data', user_record.usage_data,
            'usage_reset_date', user_record.usage_reset_date
        ),
        'plan_limits', plan_limits,
        'features', features
    ) INTO result;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'get_user_subscription_info: Error for % - %', p_clerk_id, SQLERRM;
        RETURN json_build_object('error', 'System error occurred');
END;
$$;


ALTER FUNCTION "public"."get_user_subscription_info"("p_clerk_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_uuid"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get the current authenticated user's UUID from Supabase Auth context
    current_user_id := auth.uid();
    
    -- Log for debugging if needed
    IF current_user_id IS NULL THEN
        RAISE LOG 'get_user_uuid: No authenticated user found in current context';
    END IF;
    
    RETURN current_user_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'get_user_uuid: Error retrieving authenticated user - %', SQLERRM;
        RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."get_user_uuid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_uuid"("clerk_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    user_uuid UUID;
BEGIN
    -- Input validation
    IF clerk_id IS NULL OR LENGTH(TRIM(clerk_id)) = 0 THEN
        RAISE LOG 'get_user_uuid: Invalid clerk_id provided (NULL or empty)';
        RETURN NULL;
    END IF;
    
    -- Retrieve Supabase UUID from user mapping table
    SELECT supabase_uuid 
    INTO user_uuid
    FROM public.user_mapping 
    WHERE user_mapping.clerk_id = get_user_uuid.clerk_id;
    
    -- Log result for debugging
    IF user_uuid IS NULL THEN
        RAISE LOG 'get_user_uuid: No mapping found for clerk_id %', clerk_id;
    END IF;
    
    RETURN user_uuid;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'get_user_uuid: Error mapping clerk_id % - %', clerk_id, SQLERRM;
        RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."get_user_uuid"("clerk_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_clerk_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    -- Insert or update user mapping when Clerk user is created/updated
    -- Enhanced with better error handling and logging
    BEGIN
        INSERT INTO public.user_mapping (clerk_id)
        VALUES (NEW.id)
        ON CONFLICT (clerk_id) DO UPDATE SET updated_at = NOW();
        
        RAISE LOG 'handle_clerk_user: Successfully processed user %', NEW.id;
        
        RETURN NEW;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'handle_clerk_user: Error processing user % - %', NEW.id, SQLERRM;
            -- Return NEW anyway to not block the trigger
            RETURN NEW;
    END;
END;
$$;


ALTER FUNCTION "public"."handle_clerk_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_resume"("p_resume_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."reset_resume"("p_resume_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_resume_complete"("p_resume_id" "uuid", "p_content" "text", "p_ats_score" integer, "p_applied_suggestions" "uuid"[] DEFAULT ARRAY[]::"uuid"[], "p_applied_keywords" "text"[] DEFAULT ARRAY[]::"text"[], "p_selected_template" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."save_resume_complete"("p_resume_id" "uuid", "p_content" "text", "p_ats_score" integer, "p_applied_suggestions" "uuid"[], "p_applied_keywords" "text"[], "p_selected_template" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_clerk_to_supabase_auth"("p_clerk_id" "text", "p_email" "text", "p_first_name" "text" DEFAULT NULL::"text", "p_last_name" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text", "p_email_verified" boolean DEFAULT true) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
DECLARE
    supabase_user_id UUID;
    existing_mapping RECORD;
    result JSON;
BEGIN
    -- Input validation
    IF p_clerk_id IS NULL OR LENGTH(TRIM(p_clerk_id)) = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid clerk_id provided');
    END IF;
    
    IF p_email IS NULL OR LENGTH(TRIM(p_email)) = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid email provided');
    END IF;
    
    -- Email format validation
    IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RETURN json_build_object('success', false, 'error', 'Invalid email format');
    END IF;
    
    RAISE LOG 'sync_clerk_to_supabase_auth: Processing clerk_id % with email %', p_clerk_id, p_email;
    
    -- Check if mapping already exists
    SELECT * INTO existing_mapping 
    FROM public.user_mapping 
    WHERE clerk_id = p_clerk_id;
    
    IF existing_mapping IS NOT NULL THEN
        -- Update existing user metadata
        UPDATE auth.users 
        SET 
            email = p_email,
            raw_user_meta_data = jsonb_build_object(
                'clerk_id', p_clerk_id,
                'first_name', p_first_name,
                'last_name', p_last_name,
                'phone', p_phone,
                'provider', 'clerk'
            ),
            email_confirmed_at = CASE 
                WHEN p_email_verified THEN COALESCE(email_confirmed_at, NOW())
                ELSE email_confirmed_at
            END,
            updated_at = NOW()
        WHERE id = existing_mapping.supabase_uuid;
        
        -- Update mapping timestamp
        UPDATE public.user_mapping 
        SET updated_at = NOW() 
        WHERE clerk_id = p_clerk_id;
        
        result := json_build_object(
            'success', true,
            'action', 'updated',
            'clerk_id', p_clerk_id,
            'supabase_uuid', existing_mapping.supabase_uuid
        );
        
        RAISE LOG 'sync_clerk_to_supabase_auth: Updated existing user %', p_clerk_id;
    ELSE
        -- Generate new UUID and create user
        supabase_user_id := gen_random_uuid();
        
        -- Create new user in Supabase Auth
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            aud,
            role
        ) VALUES (
            supabase_user_id,
            p_email,
            'clerk_managed_' || p_clerk_id,
            CASE WHEN p_email_verified THEN NOW() ELSE NULL END,
            jsonb_build_object(
                'clerk_id', p_clerk_id,
                'first_name', p_first_name,
                'last_name', p_last_name,
                'phone', p_phone,
                'provider', 'clerk'
            ),
            NOW(),
            NOW(),
            'clerk_token_' || p_clerk_id,
            'authenticated',
            'authenticated'
        );
        
        -- Create mapping with default subscription
        INSERT INTO public.user_mapping (supabase_uuid, clerk_id) 
        VALUES (supabase_user_id, p_clerk_id);
        
        result := json_build_object(
            'success', true,
            'action', 'created',
            'clerk_id', p_clerk_id,
            'supabase_uuid', supabase_user_id
        );
        
        RAISE LOG 'sync_clerk_to_supabase_auth: Created new user %', p_clerk_id;
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'sync_clerk_to_supabase_auth: Error processing % - %', p_clerk_id, SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'clerk_id', p_clerk_id
        );
END;
$_$;


ALTER FUNCTION "public"."sync_clerk_to_supabase_auth"("p_clerk_id" "text", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_email_verified" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_subscription"("p_clerk_id" "text", "p_new_plan" "text", "p_subscription_status" "text" DEFAULT 'active'::"text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    result JSON;
BEGIN
    -- Input validation
    IF p_clerk_id IS NULL OR LENGTH(TRIM(p_clerk_id)) = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid clerk_id provided');
    END IF;
    
    -- Validate plan name
    IF p_new_plan NOT IN ('basic', 'pro', 'expert') THEN
        RETURN json_build_object('success', false, 'error', 'Invalid plan name');
    END IF;
    
    -- Validate subscription status
    IF p_subscription_status NOT IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing') THEN
        RETURN json_build_object('success', false, 'error', 'Invalid subscription status');
    END IF;
    
    RAISE LOG 'update_user_subscription: Updating % to % plan with % status', 
        p_clerk_id, p_new_plan, p_subscription_status;
    
    -- Update user subscription
    UPDATE public.user_mapping 
    SET 
        subscription_plan = p_new_plan,
        subscription_status = p_subscription_status,
        updated_at = NOW(),
        usage_data = '{}' -- Reset usage when changing plans
    WHERE clerk_id = p_clerk_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;
    
    RAISE LOG 'update_user_subscription: Successfully updated % to % plan', p_clerk_id, p_new_plan;
    
    RETURN json_build_object(
        'success', true, 
        'new_plan', p_new_plan,
        'status', p_subscription_status
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'update_user_subscription: Error updating % - %', p_clerk_id, SQLERRM;
        RETURN json_build_object(
            'success', false, 
            'error', SQLERRM
        );
END;
$$;


ALTER FUNCTION "public"."update_user_subscription"("p_clerk_id" "text", "p_new_plan" "text", "p_subscription_status" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."migrations" (
    "id" integer NOT NULL,
    "version" character varying(100) NOT NULL,
    "name" character varying(255) NOT NULL,
    "applied_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."migrations" OWNER TO "postgres";


COMMENT ON TABLE "public"."migrations" IS 'Tracks database migrations that have been applied to the system';



COMMENT ON COLUMN "public"."migrations"."version" IS 'Version identifier, typically in format YYYYMMDDNNN';



COMMENT ON COLUMN "public"."migrations"."name" IS 'Descriptive name of the migration';



COMMENT ON COLUMN "public"."migrations"."applied_at" IS 'Timestamp when the migration was applied';



CREATE SEQUENCE IF NOT EXISTS "public"."migrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."migrations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."migrations_id_seq" OWNED BY "public"."migrations"."id";



CREATE TABLE IF NOT EXISTS "public"."resume_keywords" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "resume_id" "uuid" NOT NULL,
    "keyword" "text" NOT NULL,
    "is_applied" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."resume_keywords" OWNER TO "postgres";


COMMENT ON TABLE "public"."resume_keywords" IS 'Stores keyword suggestions for resumes';



COMMENT ON COLUMN "public"."resume_keywords"."keyword" IS 'The suggested keyword text';



COMMENT ON COLUMN "public"."resume_keywords"."is_applied" IS 'Whether the user has applied this keyword to their resume';



CREATE TABLE IF NOT EXISTS "public"."resume_suggestions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "resume_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "text" "text" NOT NULL,
    "impact" "text",
    "is_applied" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."resume_suggestions" OWNER TO "postgres";


COMMENT ON TABLE "public"."resume_suggestions" IS 'Stores improvement suggestions for resumes';



COMMENT ON COLUMN "public"."resume_suggestions"."type" IS 'Category of the suggestion (e.g., format, content, etc.)';



COMMENT ON COLUMN "public"."resume_suggestions"."text" IS 'The actual suggestion text';



COMMENT ON COLUMN "public"."resume_suggestions"."impact" IS 'Description of how this suggestion improves the resume';



COMMENT ON COLUMN "public"."resume_suggestions"."is_applied" IS 'Whether the user has applied this suggestion';



CREATE TABLE IF NOT EXISTS "public"."resumes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "original_text" "text" NOT NULL,
    "optimized_text" "text" NOT NULL,
    "file_name" "text",
    "file_type" "text",
    "file_url" "text",
    "language" character varying(20),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "file_size" integer,
    "supabase_user_id" "uuid",
    "auth_user_id" "text",
    "ai_provider" "text",
    "ats_score" integer DEFAULT 0,
    "last_saved_text" "text",
    "last_saved_score_ats" integer,
    "selected_template" "text",
    CONSTRAINT "resumes_last_saved_score_ats_range" CHECK ((("last_saved_score_ats" IS NULL) OR (("last_saved_score_ats" >= 0) AND ("last_saved_score_ats" <= 100))))
);


ALTER TABLE "public"."resumes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."resumes"."last_saved_text" IS 'Stores the latest manually saved version of the resume by the user, which may differ from the AI-optimized version in optimized_text';



COMMENT ON COLUMN "public"."resumes"."last_saved_score_ats" IS 'Stores the ATS score at the time of saving edits to a resume. 
Set to NULL when resume is reset to original optimized version.';



COMMENT ON COLUMN "public"."resumes"."selected_template" IS 'ID of the template applied to the resume (basic, professional, creative, etc.)';



CREATE TABLE IF NOT EXISTS "public"."user_mapping" (
    "supabase_uuid" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clerk_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "subscription_plan" "text" DEFAULT 'basic'::"text",
    "subscription_status" "text" DEFAULT 'active'::"text",
    "subscription_period_end" timestamp with time zone DEFAULT ("now"() + '1 year'::interval),
    "usage_data" "jsonb" DEFAULT '{}'::"jsonb",
    "usage_reset_date" timestamp with time zone DEFAULT ("date_trunc"('month'::"text", "now"()) + '1 mon'::interval),
    CONSTRAINT "user_mapping_subscription_plan_check" CHECK (("subscription_plan" = ANY (ARRAY['basic'::"text", 'pro'::"text", 'expert'::"text"]))),
    CONSTRAINT "user_mapping_subscription_status_check" CHECK (("subscription_status" = ANY (ARRAY['active'::"text", 'canceled'::"text", 'past_due'::"text", 'unpaid'::"text", 'trialing'::"text"])))
);


ALTER TABLE "public"."user_mapping" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_mapping" IS 'Mapping table between Clerk IDs and Supabase UUIDs';



COMMENT ON COLUMN "public"."user_mapping"."subscription_plan" IS 'Current subscription plan: basic, pro, or expert';



COMMENT ON COLUMN "public"."user_mapping"."subscription_status" IS 'Current status of the subscription (active, canceled, etc.)';



COMMENT ON COLUMN "public"."user_mapping"."usage_data" IS 'JSON object tracking current month usage for each feature';



COMMENT ON COLUMN "public"."user_mapping"."usage_reset_date" IS 'Date when usage counters will be reset (monthly)';



ALTER TABLE ONLY "public"."migrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."migrations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."migrations"
    ADD CONSTRAINT "migrations_version_key" UNIQUE ("version");



ALTER TABLE ONLY "public"."resume_keywords"
    ADD CONSTRAINT "resume_keywords_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resume_suggestions"
    ADD CONSTRAINT "resume_suggestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resumes"
    ADD CONSTRAINT "resumes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_mapping"
    ADD CONSTRAINT "user_mapping_clerk_id_key" UNIQUE ("clerk_id");



ALTER TABLE ONLY "public"."user_mapping"
    ADD CONSTRAINT "user_mapping_pkey" PRIMARY KEY ("supabase_uuid");



CREATE INDEX "idx_resume_keywords_resume_id" ON "public"."resume_keywords" USING "btree" ("resume_id");



CREATE INDEX "idx_resume_suggestions_resume_id" ON "public"."resume_suggestions" USING "btree" ("resume_id");



CREATE INDEX "idx_resumes_auth_user_id" ON "public"."resumes" USING "btree" ("auth_user_id");



CREATE INDEX "idx_resumes_last_saved_text_not_null" ON "public"."resumes" USING "btree" ((("last_saved_text" IS NOT NULL)));



CREATE INDEX "idx_user_mapping_subscription_plan" ON "public"."user_mapping" USING "btree" ("subscription_plan");



CREATE INDEX "idx_user_mapping_subscription_status" ON "public"."user_mapping" USING "btree" ("subscription_status");



CREATE INDEX "idx_user_mapping_usage_reset" ON "public"."user_mapping" USING "btree" ("usage_reset_date");



CREATE INDEX "migrations_version_idx" ON "public"."migrations" USING "btree" ("version");



ALTER TABLE ONLY "public"."resume_keywords"
    ADD CONSTRAINT "resume_keywords_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resume_suggestions"
    ADD CONSTRAINT "resume_suggestions_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resumes"
    ADD CONSTRAINT "resumes_supabase_user_id_fkey" FOREIGN KEY ("supabase_user_id") REFERENCES "public"."user_mapping"("supabase_uuid");



CREATE POLICY "User access only" ON "public"."resumes" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own resumes" ON "public"."resumes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own resumes" ON "public"."resumes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own resume keywords" ON "public"."resume_keywords" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."resumes"
  WHERE (("resumes"."id" = "resume_keywords"."resume_id") AND ("resumes"."auth_user_id" = ("auth"."uid"())::"text")))));



CREATE POLICY "Users can update their own resume suggestions" ON "public"."resume_suggestions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."resumes"
  WHERE (("resumes"."id" = "resume_suggestions"."resume_id") AND ("resumes"."auth_user_id" = ("auth"."uid"())::"text")))));



CREATE POLICY "Users can update their own resumes" ON "public"."resumes" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own resume keywords" ON "public"."resume_keywords" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."resumes"
  WHERE (("resumes"."id" = "resume_keywords"."resume_id") AND ("resumes"."auth_user_id" = ("auth"."uid"())::"text")))));



CREATE POLICY "Users can view their own resume suggestions" ON "public"."resume_suggestions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."resumes"
  WHERE (("resumes"."id" = "resume_suggestions"."resume_id") AND ("resumes"."auth_user_id" = ("auth"."uid"())::"text")))));



CREATE POLICY "Users can view their own resumes" ON "public"."resumes" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."resume_keywords" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resume_suggestions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resumes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_resumes_access_policy" ON "public"."resumes" USING ((EXISTS ( SELECT 1
   FROM "public"."user_mapping"
  WHERE (("user_mapping"."clerk_id" = ("auth"."jwt"() ->> 'sub'::"text")) AND ("user_mapping"."supabase_uuid" = "resumes"."supabase_user_id")))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

















































































































































































GRANT ALL ON FUNCTION "public"."can_use_feature"("p_clerk_id" "text", "p_feature" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_use_feature"("p_clerk_id" "text", "p_feature" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_use_feature"("p_clerk_id" "text", "p_feature" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_feature_access"("p_clerk_id" "text", "p_feature" "text", "p_increment" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_feature_access"("p_clerk_id" "text", "p_feature" "text", "p_increment" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_feature_access"("p_clerk_id" "text", "p_feature" "text", "p_increment" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_usage_limits"("p_clerk_id" "text", "p_feature" "text", "p_increment" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_usage_limits"("p_clerk_id" "text", "p_feature" "text", "p_increment" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_usage_limits"("p_clerk_id" "text", "p_feature" "text", "p_increment" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_clerk_user"("p_clerk_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_clerk_user"("p_clerk_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_clerk_user"("p_clerk_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_latest_resume"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_latest_resume"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_latest_resume"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_latest_resume_by_clerk_id"("p_clerk_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_latest_resume_by_clerk_id"("p_clerk_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_latest_resume_by_clerk_id"("p_clerk_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_plan_limits"("plan_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_plan_limits"("plan_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_plan_limits"("plan_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_resume_by_id"("p_resume_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_resume_by_id"("p_resume_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_resume_by_id"("p_resume_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_subscription_info"("p_clerk_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_subscription_info"("p_clerk_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_subscription_info"("p_clerk_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_uuid"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_uuid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_uuid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_uuid"("clerk_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_uuid"("clerk_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_uuid"("clerk_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_clerk_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_clerk_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_clerk_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_resume"("p_resume_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reset_resume"("p_resume_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_resume"("p_resume_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_resume_complete"("p_resume_id" "uuid", "p_content" "text", "p_ats_score" integer, "p_applied_suggestions" "uuid"[], "p_applied_keywords" "text"[], "p_selected_template" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."save_resume_complete"("p_resume_id" "uuid", "p_content" "text", "p_ats_score" integer, "p_applied_suggestions" "uuid"[], "p_applied_keywords" "text"[], "p_selected_template" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_resume_complete"("p_resume_id" "uuid", "p_content" "text", "p_ats_score" integer, "p_applied_suggestions" "uuid"[], "p_applied_keywords" "text"[], "p_selected_template" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_clerk_to_supabase_auth"("p_clerk_id" "text", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_email_verified" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sync_clerk_to_supabase_auth"("p_clerk_id" "text", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_email_verified" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_clerk_to_supabase_auth"("p_clerk_id" "text", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_email_verified" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_subscription"("p_clerk_id" "text", "p_new_plan" "text", "p_subscription_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_subscription"("p_clerk_id" "text", "p_new_plan" "text", "p_subscription_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_subscription"("p_clerk_id" "text", "p_new_plan" "text", "p_subscription_status" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."migrations" TO "anon";
GRANT ALL ON TABLE "public"."migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."migrations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."migrations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."migrations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."migrations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."resume_keywords" TO "anon";
GRANT ALL ON TABLE "public"."resume_keywords" TO "authenticated";
GRANT ALL ON TABLE "public"."resume_keywords" TO "service_role";



GRANT ALL ON TABLE "public"."resume_suggestions" TO "anon";
GRANT ALL ON TABLE "public"."resume_suggestions" TO "authenticated";
GRANT ALL ON TABLE "public"."resume_suggestions" TO "service_role";



GRANT ALL ON TABLE "public"."resumes" TO "anon";
GRANT ALL ON TABLE "public"."resumes" TO "authenticated";
GRANT ALL ON TABLE "public"."resumes" TO "service_role";



GRANT ALL ON TABLE "public"."user_mapping" TO "anon";
GRANT ALL ON TABLE "public"."user_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."user_mapping" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
