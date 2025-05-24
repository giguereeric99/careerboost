-- Updated subscription functions for CareerBoost's 3 main features
-- CV Optimization, Job Search, and AI Interview

-- Function to get limits for a subscription plan (updated for all features)
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
            RETURN '{
                "cv_optimizations_per_month": 1,
                "job_search_enabled": false,
                "ai_interview_enabled": false,
                "templates_available": 1
            }'::jsonb;
        WHEN 'pro' THEN
            RETURN '{
                "cv_optimizations_per_month": -1,
                "job_search_enabled": true,
                "ai_interview_enabled": false,
                "templates_available": -1
            }'::jsonb;
        WHEN 'expert' THEN
            RETURN '{
                "cv_optimizations_per_month": -1,
                "job_search_enabled": true,
                "ai_interview_enabled": true,
                "templates_available": -1
            }'::jsonb;
        ELSE
            RETURN '{
                "cv_optimizations_per_month": 1,
                "job_search_enabled": false,
                "ai_interview_enabled": false,
                "templates_available": 1
            }'::jsonb;
    END CASE;
END;
$$;

-- Enhanced function to check feature access (not just usage limits)
CREATE OR REPLACE FUNCTION public.check_feature_access(
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
    feature_enabled boolean;
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
    
    -- Handle feature-based access (job_search, ai_interview)
    IF p_feature IN ('job_search', 'ai_interview') THEN
        feature_enabled := (plan_limits ->> (p_feature || '_enabled'))::boolean;
        
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
    limit_value := (plan_limits ->> p_feature)::integer;
    
    -- If limit is -1, it's unlimited
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
            'reason', 'Usage limit exceeded for ' || p_feature,
            'upgrade_needed', true
        );
    END IF;
    
    -- Increment usage for usage-based features
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

-- Updated function to get complete user subscription info with all features
CREATE OR REPLACE FUNCTION public.get_user_subscription_info(p_clerk_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    user_record record;
    plan_limits jsonb;
    features jsonb;
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
    
    -- Define features based on subscription plan
    features := CASE user_record.subscription_plan
        WHEN 'basic' THEN '{
            "cv_optimization": true, 
            "cv_optimizations_per_month": 1, 
            "basic_templates": true,
            "job_search": false,
            "ai_interview": false,
            "email_support": false
        }'::jsonb
        WHEN 'pro' THEN '{
            "cv_optimization": true, 
            "cv_optimizations_per_month": -1, 
            "pro_templates": true,
            "job_search": true,
            "ai_interview": false,
            "priority_support": true
        }'::jsonb  
        WHEN 'expert' THEN '{
            "cv_optimization": true, 
            "cv_optimizations_per_month": -1, 
            "pro_templates": true,
            "job_search": true,
            "ai_interview": true,
            "priority_support": true
        }'::jsonb
        ELSE '{}'::jsonb
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
END;
$$;

-- Helper function to check if user can access a specific feature
CREATE OR REPLACE FUNCTION public.can_use_feature(
    p_clerk_id text,
    p_feature text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    access_result json;
BEGIN
    -- Use the main access check function
    access_result := public.check_feature_access(p_clerk_id, p_feature, 0); -- 0 increment = check only
    
    RETURN (access_result ->> 'allowed')::boolean;
END;
$$;