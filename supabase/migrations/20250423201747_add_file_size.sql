-- Add file_size column
ALTER TABLE public.resumes
ADD COLUMN file_size INTEGER;

-- Create helper function
CREATE OR REPLACE FUNCTION format_file_size(bytes INTEGER)
RETURNS TEXT AS $$
BEGIN
  -- Implementation...
END;
$$ LANGUAGE plpgsql;