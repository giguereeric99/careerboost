-- =============================================================================
-- CAREERBOOST - Fix Parameter Name Error
-- =============================================================================
-- 
-- Purpose: Fix parameter name conflicts by dropping and recreating functions
-- Issue: Cannot change parameter names in existing functions
-- Solution: DROP functions first, then CREATE with new parameter names
--
-- Author: CareerBoost Development Team
-- Date: 2025-01-24
-- =============================================================================

-- =============================================================================
-- SECTION 1: DROP FUNCTIONS WITH PARAMETER NAME CONFLICTS
-- =============================================================================

-- Drop get_user_uuid functions to allow parameter name changes
DROP FUNCTION IF EXISTS get_user_uuid() CASCADE;
DROP FUNCTION IF EXISTS get_user_uuid(TEXT) CASCADE;

-- Drop other functions that might have parameter name conflicts
DROP FUNCTION IF EXISTS sync_clerk_to_supabase_auth CASCADE;
DROP FUNCTION IF EXISTS delete_clerk_user CASCADE;
DROP FUNCTION IF EXISTS check_usage_limits CASCADE;
DROP FUNCTION IF EXISTS check_feature_access CASCADE;
DROP FUNCTION IF EXISTS update_user_subscription CASCADE;
DROP FUNCTION IF EXISTS get_user_subscription_info CASCADE;
DROP FUNCTION IF EXISTS can_use_feature CASCADE;

-- =============================================================================
-- SECTION 2: RECREATE ALL FUNCTIONS WITH CONSISTENT PARAMETER NAMES
-- =============================================================================

-- Enhanced get_user_uuid functions (both versions)
CREATE OR REPLACE FUNCTION get_user_uuid()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Keep original parameter name to avoid conflicts
CREATE OR REPLACE FUNCTION get_user_uuid(clerk_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Enhanced sync_clerk_to_supabase_auth - keep original parameter names
CREATE OR REPLACE FUNCTION sync_clerk_to_supabase_auth(
    p_clerk_id TEXT, 
    p_email TEXT, 
    p_first_name TEXT DEFAULT NULL, 
    p_last_name TEXT DEFAULT NULL, 
    p_phone TEXT DEFAULT NULL, 
    p_email_verified BOOLEAN DEFAULT TRUE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- Enhanced delete_clerk_user - keep original parameter names
CREATE OR REPLACE FUNCTION delete_clerk_user(p_clerk_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Enhanced check_usage_limits - keep original parameter names
CREATE OR REPLACE FUNCTION check_usage_limits(
    p_clerk_id TEXT, 
    p_feature TEXT, 
    p_increment INTEGER DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Enhanced check_feature_access - keep original parameter names
CREATE OR REPLACE FUNCTION check_feature_access(
    p_clerk_id TEXT, 
    p_feature TEXT, 
    p_increment INTEGER DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Enhanced update_user_subscription - keep original parameter names
CREATE OR REPLACE FUNCTION update_user_subscription(
    p_clerk_id TEXT, 
    p_new_plan TEXT, 
    p_subscription_status TEXT DEFAULT 'active'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Enhanced get_user_subscription_info - keep original parameter names
CREATE OR REPLACE FUNCTION get_user_subscription_info(p_clerk_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Enhanced can_use_feature - keep original parameter names
CREATE OR REPLACE FUNCTION can_use_feature(p_clerk_id TEXT, p_feature TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- =============================================================================
-- SECTION 3: GRANT PERMISSIONS TO ALL RECREATED FUNCTIONS
-- =============================================================================

-- User UUID functions
GRANT EXECUTE ON FUNCTION get_user_uuid() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_uuid(TEXT) TO anon, authenticated, service_role;

-- Authentication and user management functions
GRANT EXECUTE ON FUNCTION sync_clerk_to_supabase_auth(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) 
TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION delete_clerk_user(TEXT) 
TO anon, authenticated, service_role;

-- Subscription and usage functions
GRANT EXECUTE ON FUNCTION check_usage_limits(TEXT, TEXT, INTEGER) 
TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION check_feature_access(TEXT, TEXT, INTEGER) 
TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION can_use_feature(TEXT, TEXT) 
TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION update_user_subscription(TEXT, TEXT, TEXT) 
TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION get_user_subscription_info(TEXT) 
TO anon, authenticated, service_role;

-- =============================================================================
-- SECTION 4: VERIFICATION
-- =============================================================================

-- Verify all functions are recreated with SECURITY DEFINER
SELECT 
    routine_name as function_name,
    security_type as security_context,
    'RECREATED' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_user_uuid', 
    'sync_clerk_to_supabase_auth', 
    'delete_clerk_user',
    'check_usage_limits',
    'check_feature_access', 
    'can_use_feature',
    'update_user_subscription',
    'get_user_subscription_info'
)
ORDER BY routine_name;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'PARAMETER NAME CONFLICTS RESOLVED SUCCESSFULLY';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'All functions have been dropped and recreated with:';
    RAISE NOTICE '  ✅ Original parameter names preserved';
    RAISE NOTICE '  ✅ SECURITY DEFINER context applied';
    RAISE NOTICE '  ✅ Empty search_path for security';
    RAISE NOTICE '  ✅ Enhanced error handling and logging';
    RAISE NOTICE '  ✅ Proper permissions granted';
    RAISE NOTICE '';
    RAISE NOTICE 'The previous migration can now be run without parameter conflicts';
    RAISE NOTICE '=================================================================';
END $$;