-- ============================================================================
-- NLAMS DATABASE MIGRATION 011: VIEWER PARCEL OWNERSHIP LINKAGE
-- National Land Acquisition Management System (MoRTH / NHAI)
-- Migration 011: Add owner_profile_id FK column, index, and demo owner mapping
-- ============================================================================

-- 1. ADD OWNER_PROFILE_ID FOREIGN KEY TO LAND_PARCELS TABLE
-- Nullable foreign key linking parcel to a user's profile.
-- Existing text column owner_name is strictly preserved for official records.
ALTER TABLE public.land_parcels
ADD COLUMN IF NOT EXISTS owner_profile_id UUID
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- 2. CREATE INDEX FOR FAST OWNER-BASED PARCEL RETRIEVAL
CREATE INDEX IF NOT EXISTS idx_land_parcels_owner_profile_id
ON public.land_parcels(owner_profile_id);

-- 3. SEED DEMO VIEWER OWNERSHIP LINKAGE
-- Authoritative relationship: land_parcels.owner_profile_id = profiles.id
-- Links existing Viewer profile 'viewer.test@morth.gov.in' (id: '6cd9977a-d35b-4216-b8b9-351e553f8a1a')
-- to demo parcel LP-DEL-001 (id: 'd60ab2ab-4676-4748-bcd8-4e56d7bee893').
UPDATE public.land_parcels
SET owner_profile_id = '6cd9977a-d35b-4216-b8b9-351e553f8a1a'
WHERE (parcel_number = 'LP-DEL-001' OR parcel_no = 'LP-DEL-001');

-- Also link secondary Viewer profile 'prathmeshlaptop01@gmail.com' (id: 'a39f2e43-6cb6-4eec-a7a6-b48d24fb20ba')
-- to demo parcel LP-DEL-002 (id: '5258923e-9ce7-43bf-ad19-e5bf503a9c4f') for multi-owner isolation verification.
UPDATE public.land_parcels
SET owner_profile_id = 'a39f2e43-6cb6-4eec-a7a6-b48d24fb20ba'
WHERE (parcel_number = 'LP-DEL-002' OR parcel_no = 'LP-DEL-002');
