-- Migration: add_resume_keywords_and_suggestions_tables
-- Description: Adds tables for storing resume keywords and improvement suggestions
-- Created at: 2025-04-25

-- Ensure extension for UUID generation is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add ATS score column to existing resumes table if not already present
ALTER TABLE public.resumes
ADD COLUMN IF NOT EXISTS ats_score INTEGER DEFAULT 0;

-- Create table for resume keywords
CREATE TABLE public.resume_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    is_applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on resume_id for faster lookups
CREATE INDEX idx_resume_keywords_resume_id ON public.resume_keywords(resume_id);

-- Create table for resume improvement suggestions
CREATE TABLE public.resume_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- e.g., "summary", "format", "skills", etc.
    text TEXT NOT NULL, -- The suggestion itself
    impact TEXT, -- Description of the suggestion's impact
    is_applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on resume_id for faster lookups
CREATE INDEX idx_resume_suggestions_resume_id ON public.resume_suggestions(resume_id);

-- Set up Row Level Security (RLS) for the new tables
ALTER TABLE public.resume_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_suggestions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own resume keywords
CREATE POLICY "Users can view their own resume keywords" 
ON public.resume_keywords 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.resumes 
        WHERE resumes.id = resume_keywords.resume_id 
        AND resumes.auth_user_id = auth.uid()::text
    )
);

-- Policy: Users can update their own resume keywords
CREATE POLICY "Users can update their own resume keywords" 
ON public.resume_keywords 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.resumes 
        WHERE resumes.id = resume_keywords.resume_id 
        AND resumes.auth_user_id = auth.uid()::text
    )
);

-- Policy: Users can view their own resume suggestions
CREATE POLICY "Users can view their own resume suggestions" 
ON public.resume_suggestions 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.resumes 
        WHERE resumes.id = resume_suggestions.resume_id 
        AND resumes.auth_user_id = auth.uid()::text
    )
);

-- Policy: Users can update their own resume suggestions
CREATE POLICY "Users can update their own resume suggestions" 
ON public.resume_suggestions 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.resumes 
        WHERE resumes.id = resume_suggestions.resume_id 
        AND resumes.auth_user_id = auth.uid()::text
    )
);

-- Grant appropriate permissions to authenticated users
GRANT SELECT, UPDATE ON public.resume_keywords TO authenticated;
GRANT SELECT, UPDATE ON public.resume_suggestions TO authenticated;

-- Comment on tables and columns for better documentation
COMMENT ON TABLE public.resume_keywords IS 'Stores keyword suggestions for resumes';
COMMENT ON COLUMN public.resume_keywords.keyword IS 'The suggested keyword text';
COMMENT ON COLUMN public.resume_keywords.is_applied IS 'Whether the user has applied this keyword to their resume';

COMMENT ON TABLE public.resume_suggestions IS 'Stores improvement suggestions for resumes';
COMMENT ON COLUMN public.resume_suggestions.type IS 'Category of the suggestion (e.g., format, content, etc.)';
COMMENT ON COLUMN public.resume_suggestions.text IS 'The actual suggestion text';
COMMENT ON COLUMN public.resume_suggestions.impact IS 'Description of how this suggestion improves the resume';
COMMENT ON COLUMN public.resume_suggestions.is_applied IS 'Whether the user has applied this suggestion';

-- Helper function to format keywords to comma-separated list
CREATE OR REPLACE FUNCTION get_resume_keywords(resume_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    keywords_list TEXT;
BEGIN
    SELECT string_agg(keyword, ', ')
    INTO keywords_list
    FROM public.resume_keywords
    WHERE resume_id = resume_uuid;
    
    RETURN keywords_list;
END;
$$ LANGUAGE plpgsql;