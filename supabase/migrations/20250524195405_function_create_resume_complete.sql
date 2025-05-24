CREATE OR REPLACE FUNCTION "public"."create_resume_complete"(
  -- User identification
  "p_clerk_id" TEXT,
  
  -- Resume content
  "p_original_text" TEXT,
  "p_optimized_text" TEXT,
  "p_language" TEXT DEFAULT 'en',
  "p_ats_score" INTEGER DEFAULT 65,
  
  -- File information  
  "p_file_url" TEXT DEFAULT NULL,
  "p_file_name" TEXT DEFAULT NULL,
  "p_file_type" TEXT DEFAULT NULL,
  "p_file_size" INTEGER DEFAULT NULL,
  
  -- AI provider info
  "p_ai_provider" TEXT DEFAULT NULL,
  
  -- Keywords and suggestions arrays
  "p_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "p_suggestions" JSONB DEFAULT '[]'::JSONB,
  
  -- Reset flag
  "p_reset_last_saved_text" BOOLEAN DEFAULT TRUE
) 
RETURNS JSONB
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO ''
AS $$
DECLARE
  user_mapping_record RECORD;
  resume_record RECORD;
  inserted_keywords JSONB;
  inserted_suggestions JSONB;
  final_result JSONB;
BEGIN
  -- Input validation
  IF p_clerk_id IS NULL OR LENGTH(TRIM(p_clerk_id)) = 0 THEN
    RETURN json_build_object('error', 'Clerk ID is required');
  END IF;
  
  IF p_original_text IS NULL OR LENGTH(TRIM(p_original_text)) < 10 THEN
    RETURN json_build_object('error', 'Original text is required and must be at least 10 characters');
  END IF;
  
  IF p_optimized_text IS NULL OR LENGTH(TRIM(p_optimized_text)) < 10 THEN
    RETURN json_build_object('error', 'Optimized text is required and must be at least 10 characters');
  END IF;
  
  -- Validate ATS score range
  IF p_ats_score < 0 OR p_ats_score > 100 THEN
    RETURN json_build_object('error', 'ATS score must be between 0 and 100');
  END IF;
  
  RAISE LOG 'create_resume_complete: Starting for clerk_id %', p_clerk_id;
  
  -- Get user mapping
  SELECT *
  INTO user_mapping_record
  FROM public.user_mapping
  WHERE clerk_id = p_clerk_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'User mapping not found for clerk_id: ' || p_clerk_id);
  END IF;
  
  -- Start transaction
  BEGIN
    -- Insert main resume record
    INSERT INTO public.resumes (
      user_id,
      auth_user_id, 
      supabase_user_id,
      original_text,
      optimized_text,
      last_saved_text,
      language,
      ats_score,
      file_url,
      file_name,
      file_type,
      file_size,
      ai_provider
    ) VALUES (
      user_mapping_record.supabase_uuid,
      p_clerk_id,
      user_mapping_record.supabase_uuid,
      p_original_text,
      p_optimized_text,
      CASE WHEN p_reset_last_saved_text THEN NULL ELSE p_optimized_text END,
      p_language,
      p_ats_score,
      p_file_url,
      p_file_name,
      p_file_type,
      p_file_size,
      p_ai_provider
    )
    RETURNING * INTO resume_record;
    
    RAISE LOG 'create_resume_complete: Resume inserted with ID %', resume_record.id;
    
    -- Insert keywords if provided
    IF p_keywords IS NOT NULL AND array_length(p_keywords, 1) > 0 THEN
      WITH inserted_keywords_cte AS (
        INSERT INTO public.resume_keywords (resume_id, keyword, is_applied)
        SELECT resume_record.id, unnest(p_keywords), false
        RETURNING id, keyword, is_applied, created_at, updated_at
      )
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', id,
            'text', keyword,
            'keyword', keyword,
            'is_applied', is_applied,
            'applied', is_applied,
            'isApplied', is_applied,
            'created_at', created_at,
            'updated_at', updated_at
          )
        ), '[]'::jsonb
      ) INTO inserted_keywords
      FROM inserted_keywords_cte;
      
      RAISE LOG 'create_resume_complete: Inserted % keywords', array_length(p_keywords, 1);
    ELSE
      inserted_keywords := '[]'::jsonb;
    END IF;
    
    -- Insert suggestions if provided
    IF p_suggestions IS NOT NULL AND jsonb_array_length(p_suggestions) > 0 THEN
      WITH inserted_suggestions_cte AS (
        INSERT INTO public.resume_suggestions (resume_id, type, text, impact, is_applied)
        SELECT 
          resume_record.id,
          COALESCE((suggestion->>'type')::TEXT, 'general'),
          (suggestion->>'text')::TEXT,
          COALESCE((suggestion->>'impact')::TEXT, 'medium'),
          false
        FROM jsonb_array_elements(p_suggestions) AS suggestion
        WHERE (suggestion->>'text') IS NOT NULL
        RETURNING id, type, text, impact, is_applied, created_at, updated_at
      )
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', id,
            'type', type,
            'text', text,
            'impact', impact,
            'is_applied', is_applied,
            'isApplied', is_applied,
            'created_at', created_at,
            'updated_at', updated_at
          )
        ), '[]'::jsonb
      ) INTO inserted_suggestions
      FROM inserted_suggestions_cte;
      
      RAISE LOG 'create_resume_complete: Inserted % suggestions', jsonb_array_length(p_suggestions);
    ELSE
      inserted_suggestions := '[]'::jsonb;
    END IF;
    
    -- Build final result
    final_result := jsonb_build_object(
      'success', true,
      'resume', jsonb_build_object(
        'id', resume_record.id,
        'user_id', resume_record.user_id,
        'auth_user_id', resume_record.auth_user_id,
        'supabase_user_id', resume_record.supabase_user_id,
        'original_text', resume_record.original_text,
        'optimized_text', resume_record.optimized_text,
        'last_saved_text', resume_record.last_saved_text,
        'language', resume_record.language,
        'ats_score', resume_record.ats_score,
        'file_url', resume_record.file_url,
        'file_name', resume_record.file_name,
        'file_type', resume_record.file_type,
        'file_size', resume_record.file_size,
        'ai_provider', resume_record.ai_provider,
        'created_at', resume_record.created_at,
        'updated_at', resume_record.updated_at,
        'has_edits', (resume_record.last_saved_text IS NOT NULL)
      ),
      'keywords', inserted_keywords,
      'suggestions', inserted_suggestions,
      'resumeId', resume_record.id
    );
    
    RAISE LOG 'create_resume_complete: Successfully completed for resume %', resume_record.id;
    RETURN final_result;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error details
      RAISE LOG 'create_resume_complete: Transaction failed - SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
      
      -- Return error
      RETURN json_build_object(
        'success', false,
        'error', 'Failed to create resume: ' || SQLERRM,
        'details', SQLSTATE
      );
  END;
END;
$$;