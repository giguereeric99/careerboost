BEGIN;

-- Temporarily disable RLS
ALTER TABLE resumes DISABLE ROW LEVEL SECURITY;

-- Create mapping table if not exists
CREATE TABLE IF NOT EXISTS public.user_mapping (
  supabase_uuid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add reference column (skip if exists)
ALTER TABLE public.resumes 
ADD COLUMN IF NOT EXISTS supabase_user_id uuid;

-- Add constraint separately to avoid errors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'resumes_supabase_user_id_fkey'
  ) THEN
    ALTER TABLE public.resumes 
    ADD CONSTRAINT resumes_supabase_user_id_fkey 
    FOREIGN KEY (supabase_user_id) REFERENCES public.user_mapping(supabase_uuid);
  END IF;
END $$;

-- Helper function with error handling
CREATE OR REPLACE FUNCTION public.handle_clerk_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_mapping (clerk_id)
  VALUES (NEW.id)
  ON CONFLICT (clerk_id) DO UPDATE SET updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Clean policy creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'user_resumes_access_policy' 
    AND tablename = 'resumes'
  ) THEN
    CREATE POLICY user_resumes_access_policy ON public.resumes
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.user_mapping
        WHERE user_mapping.clerk_id = auth.uid()::text
        AND user_mapping.supabase_uuid = resumes.supabase_user_id
      )
    );
  END IF;
END $$;

-- Re-enable RLS
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

COMMIT;