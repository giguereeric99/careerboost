-- Supprimer les politiques existantes s'il y en a
DROP POLICY IF EXISTS "Users can insert their own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can view their own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can update their own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can delete their own resumes" ON resumes;

-- S'assurer que RLS est activé
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

-- Créer les politiques avec les bonnes contraintes de type
CREATE POLICY "Users can insert their own resumes"
ON resumes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own resumes"
ON resumes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own resumes"
ON resumes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resumes"
ON resumes
FOR DELETE
USING (auth.uid() = user_id);