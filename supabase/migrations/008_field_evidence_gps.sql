-- ============================================================================
-- NLAMS DATABASE MIGRATION 008: FIELD EVIDENCE GPS COORDINATES
-- National Land Acquisition Management System (MoRTH / NHAI)
-- Migration 008: Additive GPS capture columns on field_evidence table
-- ============================================================================
-- These columns are nullable so all existing evidence records remain valid.
-- Values are populated by POST /api/evidence when the officer captures their
-- device GPS location at the time of evidence upload.
-- ============================================================================

ALTER TABLE public.field_evidence
  ADD COLUMN IF NOT EXISTS captured_latitude  NUMERIC(10, 7) NULL,
  ADD COLUMN IF NOT EXISTS captured_longitude NUMERIC(10, 7) NULL,
  ADD COLUMN IF NOT EXISTS captured_accuracy_m NUMERIC(10, 2) NULL;

-- Constraint: if latitude is provided, it must be within valid WGS-84 range.
-- Applied as check constraints that only fire on non-NULL values.
ALTER TABLE public.field_evidence
  ADD CONSTRAINT chk_captured_latitude
    CHECK (captured_latitude IS NULL OR (captured_latitude >= -90 AND captured_latitude <= 90));

ALTER TABLE public.field_evidence
  ADD CONSTRAINT chk_captured_longitude
    CHECK (captured_longitude IS NULL OR (captured_longitude >= -180 AND captured_longitude <= 180));

ALTER TABLE public.field_evidence
  ADD CONSTRAINT chk_captured_accuracy_m
    CHECK (captured_accuracy_m IS NULL OR captured_accuracy_m >= 0);
