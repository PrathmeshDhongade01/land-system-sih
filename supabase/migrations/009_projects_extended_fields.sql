-- ============================================================================
-- NLAMS DATABASE MIGRATION 009: PROJECTS EXTENDED FIELDS
-- National Land Acquisition Management System (MoRD)
-- Migration 009: Additive-only columns for project entry flow (Phase 3)
-- Safe for existing data — all new columns have NULL defaults
-- ============================================================================

-- 1. ADD EXTENDED FIELDS TO PROJECTS TABLE (non-destructive)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS project_type TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS target_date DATE,
  ADD COLUMN IF NOT EXISTS acquiring_authority TEXT,
  ADD COLUMN IF NOT EXISTS gis_file_url TEXT,
  ADD COLUMN IF NOT EXISTS proposal_document_url TEXT,
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'Draft';

-- 2. INDEXES FOR NEW FIELDS
CREATE INDEX IF NOT EXISTS idx_projects_project_type    ON public.projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_review_status   ON public.projects(review_status);
CREATE INDEX IF NOT EXISTS idx_projects_target_date     ON public.projects(target_date);
CREATE INDEX IF NOT EXISTS idx_projects_submitted_by    ON public.projects(submitted_by);

-- 3. ALLOWED VALUES NOTE (enforced at application layer, not DB constraint):
--    project_type: 'National Highway' | 'State Highway' | 'Railway' | 'Irrigation'
--                  | 'Power Transmission' | 'Urban Development' | 'Defence' | 'Other'
--    review_status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected'

-- 4. STORAGE BUCKETS (manual step — run in Supabase Dashboard or via CLI):
--    CREATE BUCKET IF NOT EXISTS 'project-gis'        (public: false, file size limit: 20MB)
--    CREATE BUCKET IF NOT EXISTS 'project-documents'  (public: false, file size limit: 20MB)
--    Allowed MIME types for project-gis: application/json, application/vnd.google-earth.kml+xml, text/xml
--    Allowed MIME types for project-documents: application/pdf

-- NOTE: This migration is idempotent. Re-running will not error or drop existing data.
