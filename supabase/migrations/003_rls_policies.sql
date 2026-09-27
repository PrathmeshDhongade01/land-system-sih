-- ============================================================================
-- NLAMS DATABASE MIGRATION 003: ROW LEVEL SECURITY (RLS) POLICIES (CORRECTED)
-- National Land Acquisition Management System (MoRTH / NHAI)
-- Migration 003: Strict Read-Only RLS Policies for Direct Supabase Access
-- ============================================================================

-- 1. SECURITY DEFINER ACTIVE USER HELPER (Prevents Circular RLS Recursion)
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
        AND is_active = TRUE
    );
END;
$$;

-- 2. ENABLE ROW LEVEL SECURITY ON ALL NLAMS TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.land_parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statutory_workflows ENABLE ROW LEVEL SECURITY;

-- 3. PROFILES POLICIES
-- Users may read ONLY their own profile row (id = auth.uid())
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Direct INSERT, UPDATE, DELETE on profiles are DENIED (no write policies created)

-- 4. PROJECTS POLICIES
-- Active authenticated users may SELECT projects
DROP POLICY IF EXISTS "Active users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Active users can update projects metadata" ON public.projects;

CREATE POLICY "Active users can view projects"
ON public.projects
FOR SELECT
TO authenticated
USING (public.is_active_user());

-- Direct INSERT, UPDATE, DELETE on projects are DENIED (no write policies created)

-- 5. LAND PARCELS POLICIES
-- Active authenticated users may SELECT land parcels
DROP POLICY IF EXISTS "Active users can view land parcels" ON public.land_parcels;

CREATE POLICY "Active users can view land parcels"
ON public.land_parcels
FOR SELECT
TO authenticated
USING (public.is_active_user());

-- Direct INSERT, UPDATE, DELETE on land_parcels are DENIED (no write policies created)

-- 6. STATUTORY WORKFLOWS POLICIES
-- Active authenticated users may SELECT statutory workflows
DROP POLICY IF EXISTS "Active users can view statutory workflows" ON public.statutory_workflows;
DROP POLICY IF EXISTS "Active users can insert statutory workflows" ON public.statutory_workflows;
DROP POLICY IF EXISTS "Active users can update statutory workflows" ON public.statutory_workflows;

CREATE POLICY "Active users can view statutory workflows"
ON public.statutory_workflows
FOR SELECT
TO authenticated
USING (public.is_active_user());

-- Direct INSERT, UPDATE, DELETE on statutory_workflows from browser are DENIED (no write policies created)
-- All workflow mutations must pass through /api/workflows where server-side RBAC is enforced.
