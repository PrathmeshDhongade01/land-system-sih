-- ============================================================================
-- NLAMS DATABASE MIGRATION 002: USER PROFILES & ROLE FOUNDATION
-- National Land Acquisition Management System (MoRTH / NHAI)
-- Migration 002: User profiles schema, role CHECK constraint & auth trigger
-- ============================================================================

-- 1. CREATE USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'Viewer',
    department TEXT,
    designation TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_user_role CHECK (
        role IN (
            'Admin',
            'SLAO',
            'CALA',
            'MoRTH Nodal Officer',
            'Field Officer',
            'Viewer'
        )
    )
);

-- 2. USEFUL INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- 3. AUTOMATIC PROFILE CREATION TRIGGER & FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        'Viewer',
        TRUE
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. NON-DESTRUCTIVE BACKFILL FOR EXISTING USERS
INSERT INTO public.profiles (id, email, full_name, role, is_active)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''),
    'Viewer', 
    TRUE
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 5. ADMIN BOOTSTRAP INSTRUCTIONS (MANUAL EXECUTION BY DBA ONLY)
-- To promote an authenticated user's profile to Admin role manually, run:
-- UPDATE public.profiles SET role = 'Admin' WHERE email = 'admin@example.com';

-- 6. RLS STATUS
-- RLS intentionally deferred to Step 7C. Do not enable RLS in this migration.
