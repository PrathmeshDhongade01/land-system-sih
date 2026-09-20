-- ============================================================================
-- NLAMS DATABASE MIGRATION 012: PARCEL OBJECTIONS SYSTEM
-- National Land Acquisition Management System (MoRTH / NHAI)
-- Migration 012: parcel_objections and objection_evidence tables, indexes & RLS
-- ============================================================================

-- 1. CREATE PARCEL OBJECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.parcel_objections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID NOT NULL REFERENCES public.land_parcels(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    objection_type TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Submitted',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ NULL,
    resolved_at TIMESTAMPTZ NULL,
    reviewer_profile_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolution_remarks TEXT NULL,
    CONSTRAINT chk_objection_type CHECK (
        objection_type IN (
            'Land / Parcel Details',
            'Acquisition Status',
            'Compensation',
            'Rehabilitation & Resettlement',
            'Measurement / Area',
            'Notice / Documentation',
            'Other'
        )
    ),
    CONSTRAINT chk_objection_status CHECK (
        status IN (
            'Submitted',
            'Under Review',
            'Resolved',
            'Rejected'
        )
    )
);

-- 2. CREATE OBJECTION EVIDENCE / ATTACHMENTS TABLE
CREATE TABLE IF NOT EXISTS public.objection_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objection_id UUID NOT NULL REFERENCES public.parcel_objections(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_parcel_objections_parcel_id ON public.parcel_objections(parcel_id);
CREATE INDEX IF NOT EXISTS idx_parcel_objections_submitted_by ON public.parcel_objections(submitted_by);
CREATE INDEX IF NOT EXISTS idx_parcel_objections_status ON public.parcel_objections(status);
CREATE INDEX IF NOT EXISTS idx_objection_evidence_objection_id ON public.objection_evidence(objection_id);

-- 4. ROW LEVEL SECURITY
ALTER TABLE public.parcel_objections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objection_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active users can view parcel objections" ON public.parcel_objections;
CREATE POLICY "Active users can view parcel objections"
ON public.parcel_objections
FOR SELECT
TO authenticated
USING (public.is_active_user());

DROP POLICY IF EXISTS "Active users can view objection evidence" ON public.objection_evidence;
CREATE POLICY "Active users can view objection evidence"
ON public.objection_evidence
FOR SELECT
TO authenticated
USING (public.is_active_user());
