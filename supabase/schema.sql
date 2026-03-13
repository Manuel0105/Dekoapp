-- Drop existing if needed
DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS sync_meta CASCADE;

-- Profiles: extends auth.users
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    can_edit_status BOOLEAN DEFAULT FALSE,
    can_edit_room BOOLEAN DEFAULT FALSE,
    can_view_ratings BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Items: The items from Amazon
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE NOT NULL, -- Amazon ASIN or URL hash
    title TEXT NOT NULL,
    image_url TEXT,
    product_url TEXT,
    price DECIMAL(10, 2),
    room TEXT DEFAULT 'Allgemein',
    purchase_status TEXT DEFAULT 'geplant' CHECK (purchase_status IN ('geplant', 'bestellt', 'gekauft', 'verworfen')),
    is_new BOOLEAN DEFAULT TRUE,
    average_rating DECIMAL(4, 2) DEFAULT NULL,
    ratings_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    active BOOLEAN DEFAULT TRUE
);

-- Ratings: user ratings on items
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    value INTEGER CHECK (value >= 0 AND value <= 10) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(item_id, user_id) -- One rating per user per item
);

-- Vetoes: user vetoes on items ("Auf gar keinen Fall")
CREATE TABLE vetoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(item_id, user_id)
);

-- Sync Meta: tracking sync status
CREATE TABLE sync_meta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_list_url TEXT,
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    last_status TEXT,
    items_imported INTEGER DEFAULT 0,
    log TEXT
);

-- RLS setup
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vetoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_meta ENABLE ROW LEVEL SECURITY;

-- Create a secure function to check admin status bypassing RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Profiles Policies
CREATE POLICY "Authenticated users can view profiles" 
    ON profiles FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Admins can manage profiles" 
    ON profiles FOR UPDATE 
    USING (public.is_admin());

CREATE POLICY "Admins can delete profiles" 
    ON profiles FOR DELETE 
    USING (public.is_admin());

CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Items Policies
CREATE POLICY "Authenticated users can read items" 
    ON items FOR SELECT 
    TO authenticated 
    USING (active = true);

CREATE POLICY "Admins can manage items" 
    ON items FOR ALL 
    TO authenticated 
    USING (public.is_admin());

CREATE POLICY "Authorized users can update items" 
    ON items FOR UPDATE 
    TO authenticated 
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (can_edit_status = true OR can_edit_room = true)
      )
    );

-- Ratings Policies
CREATE POLICY "Users can manage own ratings" 
    ON ratings FOR ALL 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all ratings" 
    ON ratings FOR SELECT 
    TO authenticated 
    USING (public.is_admin());

CREATE POLICY "Authorized users can view all ratings"
    ON ratings FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND can_view_ratings = true
      )
    );

-- Vetoes Policies
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

-- Sync Meta Policies
CREATE POLICY "Admins can manage sync_meta" 
    ON sync_meta FOR ALL 
    TO authenticated 
    USING (public.is_admin());


-- Trigger to handle new users and create profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), NEW.id::text),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger to recalculate average rating for items automatically
CREATE OR REPLACE FUNCTION public.recalculate_item_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE items 
    SET 
        average_rating = (SELECT AVG(value) FROM ratings WHERE item_id = COALESCE(NEW.item_id, OLD.item_id)),
        ratings_count = (SELECT COUNT(*) FROM ratings WHERE item_id = COALESCE(NEW.item_id, OLD.item_id))
    WHERE id = COALESCE(NEW.item_id, OLD.item_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_rating_changed ON ratings;
CREATE TRIGGER on_rating_changed
    AFTER INSERT OR UPDATE OR DELETE ON ratings
    FOR EACH ROW EXECUTE PROCEDURE public.recalculate_item_rating();
