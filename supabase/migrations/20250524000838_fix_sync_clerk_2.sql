-- Simplified sync function without pgcrypto dependencies
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
    
    IF existing_mapping IS NOT NULL THEN
        -- Update existing user metadata if needed
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
            'supabase_uuid', existing_mapping.supabase_uuid
        );
    ELSE
        -- Generate new UUID
        supabase_user_id := gen_random_uuid();
        
        -- Create new user in Supabase Auth (ULTRA SIMPLIFIED)
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
            'clerk_managed_' || p_clerk_id, -- Simple password
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
            'clerk_token_' || p_clerk_id, -- Simple confirmation token instead of gen_random_bytes
            'authenticated',
            'authenticated'
        );
        
        -- Create mapping with default subscription (basic plan)
        INSERT INTO public.user_mapping (supabase_uuid, clerk_id) 
        VALUES (supabase_user_id, p_clerk_id);
        
        result := json_build_object(
            'success', true,
            'action', 'created',
            'clerk_id', p_clerk_id,
            'supabase_uuid', supabase_user_id
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