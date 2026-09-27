-- ============================================================================
-- NLAMS DATABASE MIGRATION 004: FIELD EVIDENCE METADATA & RLS POLICIES
-- National Land Acquisition Management System (MoRTH / NHAI)
-- Migration 004: Non-destructive field evidence metadata table & RLS policies
-- ============================================================================

-- 1. FIELD EVIDENCE TABLE
CREATE TABLE IF NOT EXISTS public.field_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID NOT NULL REFERENCES public.land_parcels(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    uploaded_by_email TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast parcel-based evidence retrieval
CREATE INDEX IF NOT EXISTS idx_field_evidence_parcel_id ON public.field_evidence(parcel_id);

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.field_evidence ENABLE ROW LEVEL SECURITY;

-- 3. SELECT POLICY: Active authenticated users can view field evidence
DROP POLICY IF EXISTS "Active users can view field evidence" ON public.field_evidence;
CREATE POLICY "Active users can view field evidence"
ON public.field_evidence
FOR SELECT
TO authenticated
USING (public.is_active_user());

-- Direct browser INSERT, UPDATE, DELETE are DENIED (no write policies created)
-- All mutations pass through /api/evidence where server-side RBAC and storage validation are enforced.
