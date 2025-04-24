BEGIN;

-- First check if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'resumes' AND column_name = 'user_id'
  ) THEN
    -- First determine the column type
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'resumes' 
        AND column_name = 'user_id' 
        AND data_type = 'text'
    ) THEN
      -- Handle text-type Clerk IDs
      INSERT INTO public.user_mapping (clerk_id)
      SELECT DISTINCT user_id FROM public.resumes 
      WHERE user_id ~ '^user_[a-zA-Z0-9]+$'
      ON CONFLICT (clerk_id) DO NOTHING;
      
      -- Update references for text IDs
      UPDATE public.resumes r
      SET supabase_user_id = um.supabase_uuid
      FROM public.user_mapping um
      WHERE r.user_id = um.clerk_id;
    ELSE
      -- Handle UUID-type IDs
      INSERT INTO public.user_mapping (clerk_id)
      SELECT DISTINCT 'supabase_' || user_id::text FROM public.resumes 
      WHERE user_id::text ~ '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$'
      ON CONFLICT (clerk_id) DO NOTHING;
      
      UPDATE public.resumes r
      SET supabase_user_id = um.supabase_uuid
      FROM public.user_mapping um
      WHERE um.clerk_id = 'supabase_' || r.user_id::text;
    END IF;
  END IF;
END $$;

COMMIT;