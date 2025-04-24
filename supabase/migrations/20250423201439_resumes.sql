-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main resumes table with RLS
CREATE TABLE public.resumes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_text TEXT NOT NULL,
  optimized_text TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  file_url TEXT,
  language VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Set up Row Level Security
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

-- Security policies
CREATE POLICY "User access only" ON public.resumes
FOR ALL USING (auth.uid() = user_id);