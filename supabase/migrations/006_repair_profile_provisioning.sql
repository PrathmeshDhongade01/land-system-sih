-- ============================================================================
-- NLAMS DATABASE MIGRATION 006: REPAIR NEW USER PROFILE PROVISIONING
-- National Land Acquisition Management System (MoRTH / NHAI)
-- Migration 006: Idempotent profile provisioning trigger & backfill for auth users
-- ============================================================================

-- 1. AUTOMATIC PROFILE CREATION TRIGGER FUNCTION
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

-- 2. ATTACH TRIGGER TO auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. IDEMPOTENT BACKFILL FOR AUTH USERS MISSING A PROFILE
-- Provisions a default 'Viewer' profile with is_active = TRUE for any existing auth user missing a profile.
-- Does NOT modify existing profiles or promote any user to Admin.
INSERT INTO public.profiles (id, email, full_name, role, is_active)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''),
    'Viewer', 
    TRUE
FROM auth.users
ON CONFLICT (id) DO NOTHING;
