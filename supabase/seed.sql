-- Enable pgcrypto if not enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Sicherstellen, dass average_rating die richtige Präzision hat, falls das schema.sql nicht neu geladen wurde
ALTER TABLE items ALTER COLUMN average_rating TYPE DECIMAL(4, 2);

-- Insert the admin user into auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'd0d0d0d0-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'admin@deko.local',
  crypt('admin', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"username":"admin","display_name":"Administrator","role":"admin"}',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Manually ensure the profile exists in case the auth.user already existed and the trigger didn't fire
INSERT INTO public.profiles (id, username, display_name, role)
VALUES (
  'd0d0d0d0-0000-0000-0000-000000000001',
  'admin',
  'Administrator',
  'admin'
) ON CONFLICT (id) DO NOTHING;
-- No starter mock items so the user can import their own Amazon lists immediately
