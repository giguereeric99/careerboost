-- Add ai_provider column to track which AI service optimized the resume
ALTER TABLE public.resumes
ADD COLUMN ai_provider TEXT;