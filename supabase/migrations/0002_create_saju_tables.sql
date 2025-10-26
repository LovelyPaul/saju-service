-- Migration: Create tables for Saju Analysis Service
-- Description: Creates users, analyses, payments, and billing_keys tables

-- Ensure pgcrypto extension is available for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free',
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  analyses_remaining INTEGER NOT NULL DEFAULT 3,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_subscription_tier CHECK (subscription_tier IN ('free', 'pro')),
  CONSTRAINT check_analyses_remaining CHECK (analyses_remaining >= 0)
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON public.users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_ends ON public.users(subscription_ends_at)
  WHERE subscription_ends_at IS NOT NULL;

COMMENT ON TABLE public.users IS 'Users table with Clerk integration and subscription management';

-- 2. analyses table
CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  birth_time TIME,
  is_lunar BOOLEAN NOT NULL DEFAULT FALSE,
  gender VARCHAR(10) NOT NULL,
  additional_info TEXT,
  analysis_result TEXT NOT NULL,
  model_used VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_gender CHECK (gender IN ('male', 'female'))
);

CREATE INDEX IF NOT EXISTS idx_analyses_user_created ON public.analyses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_name ON public.analyses(user_id, name);

COMMENT ON TABLE public.analyses IS 'Saju analysis results';

-- 3. payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id VARCHAR(255) UNIQUE NOT NULL,
  payment_key VARCHAR(255) UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_status CHECK (status IN ('done', 'cancelled', 'failed')),
  CONSTRAINT check_amount CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);

COMMENT ON TABLE public.payments IS 'Payment history with Toss Payments integration';

-- 4. billing_keys table
CREATE TABLE IF NOT EXISTS public.billing_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  billing_key VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.billing_keys IS 'Toss Payments billing keys for auto-renewal';

-- 5. Trigger: updated_at auto-update
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- 6. Row Level Security (RLS) - Disable for now since we're using service role
-- We're using Supabase service role key on the server side
-- RLS policies would be needed if we were using client-side queries with anon key
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_keys DISABLE ROW LEVEL SECURITY;
