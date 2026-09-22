-- Enable UUID and RLS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table with Firebase UID as primary key
CREATE TABLE public.users (
  id TEXT PRIMARY KEY, -- Firebase UID
  firebase_uid TEXT NOT NULL UNIQUE,
  email TEXT,
  username TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_sign_in TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User profiles table (optional, for extended user data)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name TEXT,
  location TEXT,
  website TEXT,
  social_links JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- User sessions table (for tracking login sessions)
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON public.users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_users_firebase_uid ON public.users(firebase_uid);
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions(expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Policy 1: Users can read their own profile
CREATE POLICY "users_read_own_profile"
ON public.users
FOR SELECT
USING (auth.uid()::text = id);

-- Policy 2: Admins can read all user profiles
CREATE POLICY "admins_read_all_profiles"
ON public.users
FOR SELECT
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()::text) = TRUE
);

-- Policy 3: Users can update their own profile
CREATE POLICY "users_update_own_profile"
ON public.users
FOR UPDATE
USING (auth.uid()::text = id)
WITH CHECK (auth.uid()::text = id);

-- Policy 4: Service role can insert/upsert users (during auth sync)
CREATE POLICY "service_role_upsert_users"
ON public.users
FOR ALL
USING (TRUE) -- Allow all for service role
WITH CHECK (TRUE);

-- Policy 5: Authenticated users can insert own profile
CREATE POLICY "users_insert_own_profile"
ON public.users
FOR INSERT
WITH CHECK (auth.uid()::text = id);

-- RLS Policies for user_profiles table
-- Policy 1: Users can read their own profile
CREATE POLICY "user_profiles_read_own"
ON public.user_profiles
FOR SELECT
USING (user_id = auth.uid()::text);

-- Policy 2: Users can read public profile info
CREATE POLICY "user_profiles_read_public"
ON public.user_profiles
FOR SELECT
USING (TRUE); -- Allow all users to read (consider making selective)

-- Policy 3: Users can update their own profile
CREATE POLICY "user_profiles_update_own"
ON public.user_profiles
FOR UPDATE
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- Policy 4: Users can insert their own profile
CREATE POLICY "user_profiles_insert_own"
ON public.user_profiles
FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

-- RLS Policies for user_sessions table
-- Policy 1: Users can only see their own sessions
CREATE POLICY "user_sessions_read_own"
ON public.user_sessions
FOR SELECT
USING (user_id = auth.uid()::text);

-- Policy 2: Users can delete their own sessions (logout)
CREATE POLICY "user_sessions_delete_own"
ON public.user_sessions
FOR DELETE
USING (user_id = auth.uid()::text);

-- Policy 3: Service role can insert sessions
CREATE POLICY "service_role_insert_sessions"
ON public.user_sessions
FOR INSERT
WITH CHECK (TRUE);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_profiles table
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a view for easier access to user data
CREATE OR REPLACE VIEW public.user_data AS
SELECT
  u.id,
  u.firebase_uid,
  u.email,
  u.username,
  u.phone,
  u.avatar_url,
  u.bio,
  u.is_admin,
  u.is_active,
  u.created_at,
  u.last_sign_in,
  up.full_name,
  up.location,
  up.website,
  up.social_links,
  up.preferences
FROM public.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id;

-- RLS Policy for view
CREATE POLICY "user_data_read_own"
ON public.users
FOR SELECT
USING (auth.uid()::text = id);
