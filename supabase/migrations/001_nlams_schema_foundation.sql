-- ============================================================================
-- NLAMS DATABASE SCHEMA FOUNDATION MIGRATION
-- National Land Acquisition Management System (MoRTH / NHAI)
-- Migration 001: Non-destructive schema foundation & index creation
-- ============================================================================

-- 1. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code TEXT UNIQUE NOT NULL,
    project_name TEXT NOT NULL,
    state TEXT,
    district TEXT,
    department TEXT DEFAULT 'Ministry of Road Transport & Highways',
    corridor_length_km NUMERIC(10, 2),
    status TEXT DEFAULT 'Active',
    total_area_required_ha NUMERIC(12, 4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_code TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Ministry of Road Transport & Highways';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS corridor_length_km NUMERIC(10, 2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_area_required_ha NUMERIC(12, 4);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. LAND_PARCELS TABLE
CREATE TABLE IF NOT EXISTS land_parcels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    project_code TEXT,
    parcel_number TEXT,
    owner_name TEXT NOT NULL,
    village_name TEXT NOT NULL,
    district TEXT,
    survey_number TEXT,
    land_type TEXT DEFAULT 'Agricultural',
    notified_area_sqm NUMERIC(12, 2) DEFAULT 0,
    affected_area_sqm NUMERIC(12, 2) DEFAULT 0,
    possession_status TEXT DEFAULT 'Pending',
    field_verification_status TEXT DEFAULT 'Pending',
    field_verified_at TIMESTAMPTZ,
    field_verified_by TEXT,
    field_remarks TEXT,
    compensation_amount NUMERIC(14, 2) DEFAULT 0,
    compensation_assessed NUMERIC(14, 2) DEFAULT 0,
    compensation_approved NUMERIC(14, 2) DEFAULT 0,
    compensation_paid NUMERIC(14, 2) DEFAULT 0,
    payment_status TEXT DEFAULT 'Not Assessed',
    payment_reference TEXT,
    payment_released_at TIMESTAMPTZ,
    rehabilitation_status TEXT DEFAULT 'Not Started',
    rehabilitation_amount NUMERIC(14, 2) DEFAULT 0,
    rehabilitation_remarks TEXT,
    rehabilitation_completed_at TIMESTAMPTZ,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS project_code TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS parcel_number TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS village_name TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS survey_number TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS land_type TEXT DEFAULT 'Agricultural';
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS notified_area_sqm NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS affected_area_sqm NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS possession_status TEXT DEFAULT 'Pending';
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS field_verification_status TEXT DEFAULT 'Pending';
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS field_verified_at TIMESTAMPTZ;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS field_verified_by TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS field_remarks TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS compensation_amount NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS compensation_assessed NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS compensation_approved NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS compensation_paid NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Not Assessed';
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS payment_released_at TIMESTAMPTZ;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS rehabilitation_status TEXT DEFAULT 'Not Started';
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS rehabilitation_amount NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS rehabilitation_remarks TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS rehabilitation_completed_at TIMESTAMPTZ;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. STATUTORY_WORKFLOWS TABLE
CREATE TABLE IF NOT EXISTS statutory_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code TEXT NOT NULL,
    land_parcel_id UUID REFERENCES land_parcels(id) ON DELETE SET NULL,
    workflow_type TEXT,
    stage_name TEXT,
    status TEXT DEFAULT 'Pending Approval',
    assigned_to TEXT,
    submitted_by TEXT,
    approved_by TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ
);

ALTER TABLE statutory_workflows ADD COLUMN IF NOT EXISTS project_code TEXT;
ALTER TABLE statutory_workflows ADD COLUMN IF NOT EXISTS land_parcel_id UUID REFERENCES land_parcels(id) ON DELETE SET NULL;
ALTER TABLE statutory_workflows ADD COLUMN IF NOT EXISTS workflow_type TEXT;
ALTER TABLE statutory_workflows ADD COLUMN IF NOT EXISTS stage_name TEXT;
ALTER TABLE statutory_workflows ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending Approval';
ALTER TABLE statutory_workflows ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE statutory_workflows ADD COLUMN IF NOT EXISTS submitted_by TEXT;
ALTER TABLE statutory_workflows ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE statutory_workflows ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE statutory_workflows ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE statutory_workflows ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE statutory_workflows ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Backfill legacy column names to canonical column names safely
UPDATE statutory_workflows 
SET workflow_type = stage_name 
WHERE (workflow_type IS NULL OR workflow_type = '') AND stage_name IS NOT NULL AND stage_name <> '';

UPDATE statutory_workflows 
SET stage_name = workflow_type 
WHERE (stage_name IS NULL OR stage_name = '') AND workflow_type IS NOT NULL AND workflow_type <> '';

UPDATE statutory_workflows 
SET assigned_to = submitted_by 
WHERE (assigned_to IS NULL OR assigned_to = '') AND submitted_by IS NOT NULL AND submitted_by <> '';

UPDATE statutory_workflows 
SET submitted_by = assigned_to 
WHERE (submitted_by IS NULL OR submitted_by = '') AND assigned_to IS NOT NULL AND assigned_to <> '';

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_projects_project_code ON projects(project_code);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE INDEX IF NOT EXISTS idx_land_parcels_project_id ON land_parcels(project_id);
CREATE INDEX IF NOT EXISTS idx_land_parcels_possession_status ON land_parcels(possession_status);
CREATE INDEX IF NOT EXISTS idx_land_parcels_field_verification ON land_parcels(field_verification_status);
CREATE INDEX IF NOT EXISTS idx_land_parcels_payment_status ON land_parcels(payment_status);
CREATE INDEX IF NOT EXISTS idx_land_parcels_rehabilitation_status ON land_parcels(rehabilitation_status);

CREATE INDEX IF NOT EXISTS idx_statutory_workflows_project_code ON statutory_workflows(project_code);
CREATE INDEX IF NOT EXISTS idx_statutory_workflows_status ON statutory_workflows(status);
CREATE INDEX IF NOT EXISTS idx_statutory_workflows_created_at ON statutory_workflows(created_at DESC);
