-- Migration: add_auth_user_id_column
-- Description: Adds an auth_user_id column to store Supabase Auth identifiers
-- Created at: 2025-04-23

-- Add the auth_user_id column to the resumes table
ALTER TABLE public.resumes
ADD COLUMN auth_user_id TEXT;

-- Add an index for faster queries on auth_user_id
CREATE INDEX idx_resumes_auth_user_id ON public.resumes(auth_user_id);

-- Update existing rows if there are any (optional)
-- This assumes you have a way to map current user_id values to auth user IDs
-- You may need to customize this or run a separate script if needed
-- UPDATE public.resumes SET auth_user_id = '...' WHERE ...;

-- Enable Row Level Security if not already enabled
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

-- Add policies to control access based on auth_user_id
-- This allows users to only see their own resumes
CREATE POLICY "Users can view their own resumes" 
ON public.resumes 
FOR SELECT 
USING (auth.uid()::text = auth_user_id);

-- This allows users to insert their own resumes
CREATE POLICY "Users can insert their own resumes" 
ON public.resumes 
FOR INSERT 
WITH CHECK (auth.uid()::text = auth_user_id);

-- This allows users to update their own resumes
CREATE POLICY "Users can update their own resumes" 
ON public.resumes 
FOR UPDATE
USING (auth.uid()::text = auth_user_id);

-- This allows users to delete their own resumes
CREATE POLICY "Users can delete their own resumes" 
ON public.resumes 
FOR DELETE
USING (auth.uid()::text = auth_user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resumes TO authenticated;
GRANT SELECT ON public.resumes TO anon;