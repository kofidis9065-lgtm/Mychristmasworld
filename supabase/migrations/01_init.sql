-- Supabase Database Schema Migration for My Christmas World
-- 01_init.sql

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Worlds Table (Stores persistent 3D Christmas worlds)
CREATE TABLE IF NOT EXISTS public.worlds (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Christmas World',
  landscape_type TEXT NOT NULL DEFAULT 'village',
  placed_objects JSONB NOT NULL DEFAULT '[]'::jsonb,
  camera_state JSONB DEFAULT NULL,
  settings JSONB NOT NULL DEFAULT '{"timeOfDay":"night","snowfallDensity":"moderate","soundEnabled":true,"bloomEnabled":true}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user world lookup
CREATE INDEX IF NOT EXISTS idx_worlds_owner ON public.worlds(owner_user_id);

-- 3. Daily Rewards Table (Enforces 1 claim per user per calendar day)
CREATE TABLE IF NOT EXISTS public.daily_rewards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reward_date DATE NOT NULL,
  reward_type TEXT NOT NULL,
  world_id UUID REFERENCES public.worlds(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Database constraint: unique reward claim per user per day!
  CONSTRAINT unique_user_daily_reward UNIQUE (owner_user_id, reward_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_rewards_user_date ON public.daily_rewards(owner_user_id, reward_date);

-- ROW LEVEL SECURITY (RLS) POLICIES --

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own profile, update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Worlds: users can only view, insert, update, or delete their own worlds
CREATE POLICY "Users can view own worlds"
  ON public.worlds FOR SELECT
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can insert own worlds"
  ON public.worlds FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update own worlds"
  ON public.worlds FOR UPDATE
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can delete own worlds"
  ON public.worlds FOR DELETE
  USING (auth.uid() = owner_user_id);

-- Daily Rewards: users can only view and insert their own rewards
CREATE POLICY "Users can view own daily rewards"
  ON public.daily_rewards FOR SELECT
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can insert own daily rewards"
  ON public.daily_rewards FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);
