-- ============================================================================
-- NLAMS DATABASE MIGRATION 005: PARCEL ASSIGNMENTS DATA MODEL
-- National Land Acquisition Management System (MoRTH / NHAI)
-- Migration 005: Normalized, auditable parcel assignments table & strict RLS
-- ============================================================================

-- 1. CREATE PARCEL ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.parcel_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID NOT NULL REFERENCES public.land_parcels(id) ON DELETE CASCADE,
    assigned_officer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unassigned_at TIMESTAMPTZ NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    remarks TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_assignment_status CHECK (
        status IN ('Active', 'Completed', 'Cancelled')
    )
);

-- 2. INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_parcel_assignments_parcel_id ON public.parcel_assignments(parcel_id);
CREATE INDEX IF NOT EXISTS idx_parcel_assignments_officer_id ON public.parcel_assignments(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_parcel_assignments_status ON public.parcel_assignments(status);
CREATE INDEX IF NOT EXISTS idx_parcel_assignments_assigned_at ON public.parcel_assignments(assigned_at);

-- 3. PARTIAL UNIQUE INDEX: AT MOST ONE ACTIVE ASSIGNMENT PER PARCEL
-- Allows historical Completed / Cancelled records while guaranteeing single active assignment per parcel
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_assignment_per_parcel
ON public.parcel_assignments (parcel_id)
WHERE status = 'Active';

-- 4. AUTOMATIC UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_parcel_assignments_updated ON public.parcel_assignments;
CREATE TRIGGER on_parcel_assignments_updated
    BEFORE UPDATE ON public.parcel_assignments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.parcel_assignments ENABLE ROW LEVEL SECURITY;

-- 6. SELECT POLICY: Active authenticated users can view assignment records
DROP POLICY IF EXISTS "Active users can view parcel assignments" ON public.parcel_assignments;
CREATE POLICY "Active users can view parcel assignments"
ON public.parcel_assignments
FOR SELECT
TO authenticated
USING (public.is_active_user());

-- Direct browser INSERT, UPDATE, DELETE are DENIED by default (no write policies created).
-- Future assignment mutations will pass through /api/assignments where server-side RBAC,
-- active profile check, and target officer role validation will be enforced.
