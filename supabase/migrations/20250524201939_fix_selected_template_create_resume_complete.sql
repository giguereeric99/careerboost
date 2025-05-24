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
  new_resume_id UUID;
  keywords_count INTEGER := 0;
  suggestions_count INTEGER := 0;
  rows_affected INTEGER := 0;
  final_result JSONB;
  inserted_keywords JSONB;
  inserted_suggestions JSONB;
BEGIN
  -- Input validation and operation logging
  RAISE LOG 'create_resume_complete: Operation started - clerk_id: %, original_length: %, optimized_length: %, ats_score: %', 
    p_clerk_id, LENGTH(p_original_text), LENGTH(p_optimized_text), p_ats_score;
  
  -- Input validation - ensure required fields are provided
  IF p_clerk_id IS NULL OR LENGTH(TRIM(p_clerk_id)) = 0 THEN
    RAISE LOG 'create_resume_complete: Invalid clerk_id provided (NULL or empty)';
    RETURN json_build_object('success', false, 'error', 'Clerk ID is required and cannot be empty');
  END IF;
  
  IF p_original_text IS NULL OR LENGTH(TRIM(p_original_text)) < 10 THEN
    RAISE LOG 'create_resume_complete: Invalid original_text provided (NULL or too short)';
    RETURN json_build_object('success', false, 'error', 'Original text is required and must be at least 10 characters');
  END IF;
  
  IF p_optimized_text IS NULL OR LENGTH(TRIM(p_optimized_text)) < 10 THEN
    RAISE LOG 'create_resume_complete: Invalid optimized_text provided (NULL or too short)';
    RETURN json_build_object('success', false, 'error', 'Optimized text is required and must be at least 10 characters');
  END IF;
  
  -- Validate ATS score range
  IF p_ats_score < 0 OR p_ats_score > 100 THEN
    RAISE LOG 'create_resume_complete: Invalid ats_score provided: %', p_ats_score;
    RETURN json_build_object('success', false, 'error', 'ATS score must be between 0 and 100');
  END IF;
  
  -- Get user mapping to find associated Supabase UUID
  -- Note: Fully qualified table names due to empty search_path
  SELECT *
  INTO user_mapping_record
  FROM public.user_mapping
  WHERE clerk_id = p_clerk_id;
  
  -- If no user mapping exists, return error
  IF NOT FOUND THEN
    RAISE LOG 'create_resume_complete: No user mapping found for clerk_id % (user may not be properly synced)', p_clerk_id;
    RETURN json_build_object('success', false, 'error', 'User mapping not found for clerk_id: ' || p_clerk_id);
  END IF;
  
  RAISE LOG 'create_resume_complete: Found user mapping - supabase_uuid: %', user_mapping_record.supabase_uuid;
  
  -- Begin atomic transaction for all database operations
  BEGIN
    -- Step 1: Insert main resume record
    -- Note: Fully qualified table names due to empty search_path
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
      ai_provider,
      selected_template,
      created_at,
      updated_at
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
      p_ai_provider,
      'basic',
      NOW(),
      NOW()
    )
    RETURNING * INTO resume_record;
    
    -- Get the new resume ID for logging and further operations
    new_resume_id := resume_record.id;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RAISE LOG 'create_resume_complete: Resume record inserted with ID % (% rows affected)', new_resume_id, rows_affected;
    
    -- Step 2: Insert keywords if provided
    IF p_keywords IS NOT NULL AND array_length(p_keywords, 1) > 0 THEN
      INSERT INTO public.resume_keywords (resume_id, keyword, is_applied, created_at, updated_at)
      SELECT new_resume_id, unnest(p_keywords), false, NOW(), NOW();
      
      GET DIAGNOSTICS keywords_count = ROW_COUNT;
      RAISE LOG 'create_resume_complete: Inserted % keywords successfully', keywords_count;
    ELSE
      RAISE LOG 'create_resume_complete: No keywords to insert';
    END IF;
    
    -- Step 3: Insert suggestions if provided
    IF p_suggestions IS NOT NULL AND jsonb_array_length(p_suggestions) > 0 THEN
      INSERT INTO public.resume_suggestions (resume_id, type, text, impact, is_applied, created_at, updated_at)
      SELECT 
        new_resume_id,
        COALESCE((suggestion->>'type')::TEXT, 'general'),
        (suggestion->>'text')::TEXT,
        COALESCE((suggestion->>'impact')::TEXT, 'medium'),
        false,
        NOW(),
        NOW()
      FROM jsonb_array_elements(p_suggestions) AS suggestion
      WHERE (suggestion->>'text') IS NOT NULL;
      
      GET DIAGNOSTICS suggestions_count = ROW_COUNT;
      RAISE LOG 'create_resume_complete: Inserted % suggestions successfully', suggestions_count;
    ELSE
      RAISE LOG 'create_resume_complete: No suggestions to insert';
    END IF;
    
    -- Step 4: Build keywords response data
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
    FROM public.resume_keywords
    WHERE resume_id = new_resume_id;
    
    -- Step 5: Build suggestions response data
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
    FROM public.resume_suggestions
    WHERE resume_id = new_resume_id;
    
    -- Step 6: Build final result object
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
        'selected_template', resume_record.selected_template,
        'created_at', resume_record.created_at,
        'updated_at', resume_record.updated_at,
        'has_edits', (resume_record.last_saved_text IS NOT NULL)
      ),
      'keywords', inserted_keywords,
      'suggestions', inserted_suggestions,
      'resumeId', new_resume_id
    );
    
    -- Success logging with operation summary
    RAISE LOG 'create_resume_complete: Operation completed successfully - resume_id: %, keywords: %, suggestions: %', 
      new_resume_id, keywords_count, suggestions_count;
    
    RETURN final_result;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Detailed error logging for debugging purposes
      RAISE LOG 'create_resume_complete: Transaction failed - SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
      RAISE LOG 'create_resume_complete: Error context - clerk_id: %, original_length: %', p_clerk_id, LENGTH(p_original_text);
      
      -- Return error response instead of re-raising
      RETURN json_build_object(
        'success', false,
        'error', 'Failed to create resume: ' || SQLERRM,
        'details', SQLSTATE
      );
  END;
END;
$$;