-- CareerBoost SAAS - Security Migration
-- Fix Supabase security warnings by updating function security settings
-- Migration for development team onboarding and version control

-- Drop triggers and dependencies first
DROP TRIGGER IF EXISTS clerk_user_trigger ON auth.users;
DROP TRIGGER IF EXISTS handle_clerk_user_trigger ON auth.users;

-- Drop existing functions with CASCADE to handle all dependencies
DROP FUNCTION IF EXISTS public.handle_clerk_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_uuid(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_resume_keywords(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.format_file_size(integer) CASCADE;
DROP FUNCTION IF EXISTS public.save_resume_complete(uuid, text, integer, uuid[], text[]) CASCADE;
DROP FUNCTION IF EXISTS public.save_resume_complete(uuid, text, integer, uuid[], text[], text) CASCADE;
DROP FUNCTION IF EXISTS public.reset_resume(uuid) CASCADE;

-- Function: reset_resume - Reset resume to original optimized version
CREATE OR REPLACE FUNCTION public.reset_resume(p_resume_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  resume_exists BOOLEAN;
  original_template TEXT;
BEGIN
  -- Check if the resume exists
  SELECT EXISTS(SELECT 1 FROM public.resumes WHERE id = p_resume_id) INTO resume_exists;
  
  IF NOT resume_exists THEN
    RETURN FALSE; -- Return FALSE if resume doesn't exist
  END IF;
  
  -- Get the original template before reset (or default to "basic")
  SELECT COALESCE(selected_template, 'basic') 
  FROM public.resumes 
  WHERE id = p_resume_id 
  INTO original_template;
  
  -- Start a transaction to ensure atomicity
  BEGIN
    -- 1. Reset the resume content, ATS score, and keep the selected template
    UPDATE public.resumes 
    SET 
      last_saved_text = NULL,           -- Clear the saved text
      last_saved_score_ats = NULL,      -- Clear the saved ATS score
      selected_template = original_template, -- Reset to original template
      updated_at = NOW()                -- Update the timestamp
    WHERE id = p_resume_id;
    
    -- 2. Reset all suggestions to "not applied"
    UPDATE public.resume_suggestions
    SET 
      is_applied = FALSE,               -- Mark as not applied
      updated_at = NOW()                -- Update the timestamp
    WHERE resume_id = p_resume_id;
    
    -- 3. Reset all keywords to "not applied"
    UPDATE public.resume_keywords
    SET 
      is_applied = FALSE,               -- Mark as not applied
      updated_at = NOW()                -- Update the timestamp  
    WHERE resume_id = p_resume_id;
    
    -- If everything went well, commit the transaction
    RETURN TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      -- In case of error, cancel the transaction and return FALSE
      RAISE;
      RETURN FALSE;
  END;
END;
$$;

-- Function: save_resume_complete - Complete save of modified resume (5 parameters)
CREATE OR REPLACE FUNCTION public.save_resume_complete(p_resume_id uuid, p_content text, p_ats_score integer, p_applied_suggestions uuid[], p_applied_keywords text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  resume_exists BOOLEAN;
BEGIN
  -- Check if the resume exists
  SELECT EXISTS(SELECT 1 FROM public.resumes WHERE id = p_resume_id) INTO resume_exists;
  
  IF NOT resume_exists THEN
    RETURN FALSE; -- Return FALSE if resume doesn't exist
  END IF;
  
  -- Start a transaction to ensure atomicity
  BEGIN
    -- 1. Update the resume content and ATS score
    UPDATE public.resumes 
    SET 
      last_saved_text = p_content,
      last_saved_score_ats = p_ats_score,
      updated_at = NOW()
    WHERE id = p_resume_id;
    
    -- 2. Reset all suggestions to not applied first
    UPDATE public.resume_suggestions
    SET 
      is_applied = FALSE,
      updated_at = NOW()
    WHERE resume_id = p_resume_id;
    
    -- 3. Set specified suggestions to applied
    IF array_length(p_applied_suggestions, 1) > 0 THEN
      UPDATE public.resume_suggestions
      SET 
        is_applied = TRUE,
        updated_at = NOW()
      WHERE resume_id = p_resume_id
      AND id = ANY(p_applied_suggestions);
    END IF;
    
    -- 4. Reset all keywords to not applied first
    UPDATE public.resume_keywords
    SET 
      is_applied = FALSE,
      updated_at = NOW()
    WHERE resume_id = p_resume_id;
    
    -- 5. Set specified keywords to applied
    IF array_length(p_applied_keywords, 1) > 0 THEN
      UPDATE public.resume_keywords
      SET 
        is_applied = TRUE,
        updated_at = NOW()
      WHERE resume_id = p_resume_id
      AND keyword = ANY(p_applied_keywords);
    END IF;
    
    -- If everything went well, commit the transaction
    RETURN TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      -- In case of error, cancel the transaction and return FALSE
      RAISE;
      RETURN FALSE;
  END;
END;
$$;

-- Function: save_resume_complete - Complete save of modified resume (6 parameters with template)
CREATE OR REPLACE FUNCTION public.save_resume_complete(p_resume_id uuid, p_content text, p_ats_score integer, p_applied_suggestions uuid[], p_applied_keywords text[], p_selected_template text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  resume_exists BOOLEAN;
BEGIN
  -- Check if the resume exists
  SELECT EXISTS(SELECT 1 FROM public.resumes WHERE id = p_resume_id) INTO resume_exists;
  
  IF NOT resume_exists THEN
    RETURN FALSE; -- Return FALSE if resume doesn't exist
  END IF;
  
  -- Start a transaction to ensure atomicity
  BEGIN
    -- 1. Update the resume content, ATS score, and template if provided
    UPDATE public.resumes 
    SET 
      last_saved_text = p_content,
      last_saved_score_ats = p_ats_score,
      updated_at = NOW(),
      -- Update selected_template only if a new value is provided
      selected_template = CASE 
        WHEN p_selected_template IS NOT NULL THEN p_selected_template
        ELSE selected_template
      END
    WHERE id = p_resume_id;
    
    -- 2. Reset all suggestions to not applied first
    UPDATE public.resume_suggestions
    SET 
      is_applied = FALSE,
      updated_at = NOW()
    WHERE resume_id = p_resume_id;
    
    -- 3. Set specified suggestions to applied
    IF array_length(p_applied_suggestions, 1) > 0 THEN
      UPDATE public.resume_suggestions
      SET 
        is_applied = TRUE,
        updated_at = NOW()
      WHERE resume_id = p_resume_id
      AND id = ANY(p_applied_suggestions);
    END IF;
    
    -- 4. Reset all keywords to not applied first
    UPDATE public.resume_keywords
    SET 
      is_applied = FALSE,
      updated_at = NOW()
    WHERE resume_id = p_resume_id;
    
    -- 5. Set specified keywords to applied
    IF array_length(p_applied_keywords, 1) > 0 THEN
      UPDATE public.resume_keywords
      SET 
        is_applied = TRUE,
        updated_at = NOW()
      WHERE resume_id = p_resume_id
      AND keyword = ANY(p_applied_keywords);
    END IF;
    
    -- If everything went well, commit the transaction
    RETURN TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      -- In case of error, cancel the transaction and return FALSE
      RAISE;
      RETURN FALSE;
  END;
END;
$$;

-- Function: format_file_size - Format file size in human readable format
CREATE OR REPLACE FUNCTION public.format_file_size(bytes integer)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    -- Formats file size in B, KB, MB, GB based on size
    IF bytes IS NULL THEN
        RETURN 'Unknown';
    END IF;
    
    IF bytes < 1024 THEN
        RETURN bytes || ' B';
    ELSIF bytes < 1024 * 1024 THEN
        RETURN ROUND(bytes / 1024.0, 1) || ' KB';
    ELSIF bytes < 1024 * 1024 * 1024 THEN
        RETURN ROUND(bytes / (1024.0 * 1024.0), 1) || ' MB';
    ELSE
        RETURN ROUND(bytes / (1024.0 * 1024.0 * 1024.0), 1) || ' GB';
    END IF;
END;
$$;

-- Function: handle_clerk_user - Handle Clerk user management (trigger function)
CREATE OR REPLACE FUNCTION public.handle_clerk_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  -- Insert or update user mapping when Clerk user is created/updated
  INSERT INTO public.user_mapping (clerk_id)
  VALUES (NEW.id)
  ON CONFLICT (clerk_id) DO UPDATE SET updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Function: get_user_uuid - Get current user UUID from Clerk ID
CREATE OR REPLACE FUNCTION public.get_user_uuid(clerk_id text)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT supabase_uuid FROM public.user_mapping WHERE clerk_id = $1;
$$;

-- Function: get_resume_keywords - Get resume keywords as comma-separated string
CREATE OR REPLACE FUNCTION public.get_resume_keywords(resume_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    keywords_list text;
BEGIN
    -- Get comma-separated list of keywords for a specific resume
    SELECT string_agg(keyword, ', ')
    INTO keywords_list
    FROM public.resume_keywords
    WHERE resume_id = resume_uuid;
    
    RETURN keywords_list;
END;
$$;

-- Migration Notes:
-- 1. All functions updated with SECURITY INVOKER instead of SECURITY DEFINER
-- 2. All functions include SET search_path = '' for security
-- 3. All function signatures match exactly with existing database schema
-- 4. Proper PostgreSQL function delimiters ($$) used throughout
-- 5. This migration fixes all Supabase security warnings