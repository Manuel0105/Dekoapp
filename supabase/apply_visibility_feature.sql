-- SQL Patch für das neue 'can_view_ratings' Feature

-- 1. Füge die neue Spalte zur profiles Tabelle hinzu (falls sie noch nicht existiert)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='can_view_ratings') THEN
        ALTER TABLE public.profiles ADD COLUMN can_view_ratings BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Erstelle die neue Leseberechtigung für die ratings Tabelle
CREATE POLICY "Authorized users can view all ratings"
    ON ratings FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND can_view_ratings = true
      )
    );
