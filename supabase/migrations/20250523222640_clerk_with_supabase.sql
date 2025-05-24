-- Migration: Clerk + Supabase Auth Integration (Simple Subscription)
-- Description: Links Clerk authentication with Supabase Auth and adds simple subscription column
-- Date: 2025-05-23

-- ================================================================
-- 1. EXTEND USER_MAPPING TABLE WITH SIMPLE SUBSCRIPTION
-- ================================================================

-- Add subscription-related columns to existing user_mapping table
ALTER TABLE public.user_mapping 
ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'pro', 'expert')),
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing')),
ADD COLUMN IF NOT EXISTS subscription_period_end timestamptz DEFAULT (now() + interval '1 year'), -- Basic plan gets 1 year free
ADD COLUMN IF NOT EXISTS usage_data jsonb DEFAULT '{}', -- Track usage per month: {"cv_optimizations_per_month": 2}
ADD COLUMN IF NOT EXISTS usage_reset_date timestamptz DEFAULT date_trunc('month', now()) + interval '1 month';

-- ================================================================
-- 2. SUBSCRIPTION LIMITS HELPER FUNCTION
-- ================================================================

-- Function to get limits for a subscription plan (can be easily modified)
CREATE OR REPLACE FUNCTION public.get_plan_limits(plan_name text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    CASE plan_name
        WHEN 'basic' THEN
            RETURN '{"cv_optimizations_per_month": 3, "templates_available": 1, "ai_suggestions": 10}'::jsonb;
        WHEN 'pro' THEN
            RETURN '{"cv_optimizations_per_month": 15, "templates_available": 6, "ai_suggestions": 50}'::jsonb;
        WHEN 'expert' THEN
            RETURN '{"cv_optimizations_per_month": -1, "templates_available": -1, "ai_suggestions": -1}'::jsonb; -- -1 = unlimited
        ELSE
            RETURN '{"cv_optimizations_per_month": 1, "templates_available": 1, "ai_suggestions": 5}'::jsonb; -- Fallback
    END CASE;
END;
$$;

-- ================================================================
-- 3. ENHANCED SYNC FUNCTIONS
-- ================================================================

-- Function to create/sync Clerk user with Supabase Auth and assign Basic subscription
CREATE OR REPLACE FUNCTION public.sync_clerk_to_supabase_auth(
    p_clerk_id text,
    p_email text,
    p_first_name text DEFAULT NULL,
    p_last_name text DEFAULT NULL,
    p_phone text DEFAULT NULL,
    p_email_verified boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    supabase_user_id uuid;
    existing_mapping record;
    result json;
BEGIN
    -- Check if mapping already exists
    SELECT * INTO existing_mapping 
    FROM public.user_mapping 
    WHERE clerk_id = p_clerk_id;
    
    -- If mapping exists, update the user
    IF existing_mapping IS NOT NULL THEN
        -- Update existing Supabase Auth user metadata
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
                WHEN p_email_verified THEN COALESCE(email_confirmed_at, now())
                ELSE email_confirmed_at
            END,
            updated_at = now()
        WHERE id = existing_mapping.supabase_uuid;
        
        -- Update mapping timestamp
        UPDATE public.user_mapping 
        SET updated_at = now() 
        WHERE clerk_id = p_clerk_id;
        
        result := json_build_object(
            'success', true,
            'action', 'updated',
            'clerk_id', p_clerk_id,
            'supabase_uuid', existing_mapping.supabase_uuid,
            'subscription_plan', existing_mapping.subscription_plan
        );
    ELSE
        -- Generate new UUID for Supabase user
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
            crypt('clerk_managed_password_' || p_clerk_id, gen_salt('bf')), -- Secure dummy password
            CASE WHEN p_email_verified THEN now() ELSE NULL END,
            jsonb_build_object(
                'clerk_id', p_clerk_id,
                'first_name', p_first_name,
                'last_name', p_last_name,
                'phone', p_phone,
                'provider', 'clerk'
            ),
            now(),
            now(),
            encode(gen_random_bytes(32), 'hex'),
            'authenticated',
            'authenticated'
        );
        
        -- Create mapping with Basic subscription (default values from column definition)
        INSERT INTO public.user_mapping (
            supabase_uuid, 
            clerk_id
            -- subscription_plan defaults to 'basic'
            -- subscription_status defaults to 'active'  
            -- subscription_period_end defaults to now() + 1 year
            -- usage_data defaults to '{}'
            -- usage_reset_date defaults to next month
        ) VALUES (
            supabase_user_id,
            p_clerk_id
        );
        
        result := json_build_object(
            'success', true,
            'action', 'created',
            'clerk_id', p_clerk_id,
            'supabase_uuid', supabase_user_id,
            'subscription_plan', 'basic'
        );
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'clerk_id', p_clerk_id
        );
END;
$$;

-- Function to delete user (called when Clerk user is deleted)
CREATE OR REPLACE FUNCTION public.delete_clerk_user(p_clerk_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    mapping_record record;
    result json;
BEGIN
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
    
    -- Delete from Supabase Auth (this will cascade to user_mapping and related data)
    DELETE FROM auth.users WHERE id = mapping_record.supabase_uuid;
    
    RETURN json_build_object(
        'success', true,
        'action', 'deleted',
        'clerk_id', p_clerk_id,
        'supabase_uuid', mapping_record.supabase_uuid
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'clerk_id', p_clerk_id
        );
END;
$$;

-- ================================================================
-- 4. SUBSCRIPTION MANAGEMENT FUNCTIONS
-- ================================================================

-- Function to check usage limits before allowing operations
CREATE OR REPLACE FUNCTION public.check_usage_limits(
    p_clerk_id text,
    p_feature text,
    p_increment integer DEFAULT 1
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    user_record record;
    plan_limits jsonb;
    current_usage integer := 0;
    limit_value integer;
    new_usage jsonb;
BEGIN
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
    
    -- Check if usage needs to be reset (monthly reset)
    IF user_record.usage_reset_date <= now() THEN
        -- Reset usage data for new month
        UPDATE public.user_mapping 
        SET 
            usage_data = '{}',
            usage_reset_date = date_trunc('month', now()) + interval '1 month'
        WHERE clerk_id = p_clerk_id;
        
        user_record.usage_data := '{}';
    END IF;
    
    -- Get limits for current plan
    plan_limits := public.get_plan_limits(user_record.subscription_plan);
    limit_value := (plan_limits ->> p_feature)::integer;
    
    -- If limit is -1, it's unlimited (Expert plan)
    IF limit_value = -1 THEN
        RETURN json_build_object(
            'allowed', true, 
            'unlimited', true,
            'plan', user_record.subscription_plan
        );
    END IF;
    
    -- Get current usage for this feature
    current_usage := COALESCE((user_record.usage_data ->> p_feature)::integer, 0);
    
    -- Check if incrementing would exceed limit
    IF current_usage + p_increment > limit_value THEN
        RETURN json_build_object(
            'allowed', false,
            'current_usage', current_usage,
            'limit', limit_value,
            'plan', user_record.subscription_plan,
            'reason', 'Usage limit exceeded - upgrade needed'
        );
    END IF;
    
    -- Increment usage
    new_usage := COALESCE(user_record.usage_data, '{}'::jsonb) || 
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
END;
$$;

-- Function to get user subscription info
CREATE OR REPLACE FUNCTION public.get_user_subscription_info(p_clerk_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    user_record record;
    plan_limits jsonb;
    result json;
BEGIN
    -- Get user mapping
    SELECT * INTO user_record
    FROM public.user_mapping
    WHERE clerk_id = p_clerk_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'User not found');
    END IF;
    
    -- Get plan limits
    plan_limits := public.get_plan_limits(user_record.subscription_plan);
    
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
        'features', CASE user_record.subscription_plan
            WHEN 'basic' THEN '{
            "cv_optimization": true, 
            "cv_optimizations_per_month": 1, 
            "basic_templates": true,
            "job_search": false,
            "ai_interview": false,
            "email_support": false}'::jsonb
            WHEN 'pro' THEN '{
            "cv_optimization": true, 
            "cv_optimizations_per_month": unlimited, 
            "pro_templates": true,
            "job_search": true,
            "ai_interview": false,
            "priority_support": true}'::jsonb  
            WHEN 'expert' THEN '{
            "cv_optimization": true, 
            "cv_optimizations_per_month": unlimited, 
            "pro_templates": true,
            "job_search": true,
            "ai_interview": true,
            "priority_support": true}'::jsonb
            ELSE '{}'::jsonb
        END
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Function to upgrade/downgrade subscription (simple version)
CREATE OR REPLACE FUNCTION public.update_user_subscription(
    p_clerk_id text,
    p_new_plan text,
    p_subscription_status text DEFAULT 'active'
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    result json;
BEGIN
    -- Validate plan name
    IF p_new_plan NOT IN ('basic', 'pro', 'expert') THEN
        RETURN json_build_object('success', false, 'error', 'Invalid plan name');
    END IF;
    
    -- Update user subscription
    UPDATE public.user_mapping 
    SET 
        subscription_plan = p_new_plan,
        subscription_status = p_subscription_status,
        updated_at = now(),
        usage_data = '{}' -- Reset usage when changing plans
    WHERE clerk_id = p_clerk_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;
    
    RETURN json_build_object(
        'success', true, 
        'new_plan', p_new_plan,
        'status', p_subscription_status
    );
END;
$$;

-- ================================================================
-- 5. INDEXES FOR PERFORMANCE
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_user_mapping_subscription_plan ON public.user_mapping(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_user_mapping_subscription_status ON public.user_mapping(subscription_status);
CREATE INDEX IF NOT EXISTS idx_user_mapping_usage_reset ON public.user_mapping(usage_reset_date);

-- ================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ================================================================

COMMENT ON COLUMN public.user_mapping.subscription_plan IS 'Current subscription plan: basic, pro, or expert';
COMMENT ON COLUMN public.user_mapping.subscription_status IS 'Current status of the subscription (active, canceled, etc.)';
COMMENT ON COLUMN public.user_mapping.usage_data IS 'JSON object tracking current month usage for each feature';
COMMENT ON COLUMN public.user_mapping.usage_reset_date IS 'Date when usage counters will be reset (monthly)';

COMMENT ON FUNCTION public.get_plan_limits IS 'Returns the limits for a given subscription plan - easily modifiable';
COMMENT ON FUNCTION public.sync_clerk_to_supabase_auth IS 'Creates or updates a Supabase Auth user from Clerk webhook data with Basic subscription';
COMMENT ON FUNCTION public.check_usage_limits IS 'Checks if user can perform an action based on their subscription limits';

-- Migration completed successfully
-- Next steps:
-- 1. Set up Clerk webhooks to call sync_clerk_to_supabase_auth function  
-- 2. Integrate check_usage_limits into your optimization API
-- 3. Modify get_plan_limits function to adjust subscription limits as needed