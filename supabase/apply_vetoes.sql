-- Create vetoes table
CREATE TABLE IF NOT EXISTS vetoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(item_id, user_id)
);

-- RLS setup
ALTER TABLE vetoes ENABLE ROW LEVEL SECURITY;

-- Policies for Vetoes
CREATE POLICY "Users can insert own vetoes" 
    ON vetoes FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vetoes" 
    ON vetoes FOR DELETE 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view vetoes" 
    ON vetoes FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Admins can manage vetoes" 
    ON vetoes FOR ALL 
    TO authenticated 
    USING (public.is_admin());
