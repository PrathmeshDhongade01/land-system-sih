-- ============================================================================
-- NLAMS DEMO SEED DATA SCRIPT (Dynamic FK Resolution Edition)
-- National Land Acquisition Management System (MoRTH / NHAI)
-- Seed file for populating realistic fictional project, parcel & workflow data
-- Dynamic project_id & land_parcel_id resolution (No hardcoded FK UUIDs)
-- 100% Idempotent: safe for empty DB, partial runs, and existing DB records
-- ============================================================================

-- 0. ENSURE SCHEMA COMPATIBILITY FOR ALL KNOWN & LEGACY COLUMN VARIANTS
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_code TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS corridor_length_km NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_area_required_ha NUMERIC;

ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS project_code TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS parcel_number TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS parcel_no TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS village_name TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS taluka_name TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS tehsil TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS survey_number TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS survey_no TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS khasra_no TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS khasra_number TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS khata_no TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS khatauni_no TEXT;
ALTER TABLE land_parcels ADD COLUMN IF NOT EXISTS land_type TEXT;

ALTER TABLE statutory_workflows ADD COLUMN IF NOT EXISTS project_code TEXT;
ALTER TABLE statutory_workflows ADD COLUMN IF NOT EXISTS land_parcel_id UUID;
ALTER TABLE statutory_workflows ADD COLUMN IF NOT EXISTS workflow_type TEXT;
ALTER TABLE statutory_workflows ADD COLUMN IF NOT EXISTS stage_name TEXT;
ALTER TABLE statutory_workflows ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE statutory_workflows ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE statutory_workflows ADD COLUMN IF NOT EXISTS submitted_by TEXT;

-- 1. INSERT / UPSERT DEMO PROJECTS (5 Projects)
INSERT INTO projects (
    project_code, project_name, state, district, department, corridor_length_km, status, total_area_required_ha
) VALUES 
('NHAI-DEL-BOM-01', 'Delhi–Mumbai Expressway Corridor', 'Delhi / Rajasthan / Gujarat / Maharashtra', 'Multi-District Corridor', 'Ministry of Road Transport & Highways', 1350.00, 'Active', 8120.65),
('NHAI-NSK-SURCHE', 'Nashik–Surat Economic Highway', 'Maharashtra / Gujarat', 'Nashik Division', 'Ministry of Road Transport & Highways', 290.50, 'Active', 3450.50),
('NH-334B', 'Rampur–Baghpat Expressway Corridor', 'Uttar Pradesh', 'Meerut Division', 'National Highways Authority of India', 115.00, 'Under Review', 1280.00),
('NH-709A', 'Kishanganj Bypass Realignment', 'Bihar / UP Periphery', 'Muzaffarnagar', 'State Public Works Department', 45.80, 'Draft', 650.25),
('EW-14', 'Eastern Freight & Logistics Spur', 'Uttar Pradesh', 'Bulandshahr', 'Dedicated Freight Corridor Corp of India', 210.40, 'Active', 2400.00)
ON CONFLICT (project_code) DO UPDATE SET
    project_name = EXCLUDED.project_name,
    state = EXCLUDED.state,
    district = EXCLUDED.district,
    department = EXCLUDED.department,
    corridor_length_km = EXCLUDED.corridor_length_km,
    total_area_required_ha = EXCLUDED.total_area_required_ha,
    status = EXCLUDED.status;

-- 2. UPDATE EXISTING LAND PARCELS (Synchronize project_id & location details)
UPDATE land_parcels lp
SET
    project_id = p.id,
    owner_name = v.owner_name,
    village_name = v.village_name,
    taluka_name = v.taluka_name,
    tehsil = v.tehsil,
    district = v.district,
    state = v.state,
    survey_number = v.survey_number,
    survey_no = v.survey_no,
    khasra_no = v.khasra_no,
    khasra_number = v.khasra_number,
    khata_no = v.khata_no,
    khatauni_no = v.khatauni_no,
    land_type = v.land_type,
    notified_area_sqm = v.notified_area_sqm,
    affected_area_sqm = v.affected_area_sqm,
    possession_status = v.possession_status,
    field_verification_status = v.field_verification_status,
    compensation_amount = v.compensation_amount,
    payment_status = v.payment_status
FROM (VALUES
-- Delhi-Mumbai Corridor Parcels
('NHAI-DEL-BOM-01', 'LP-DEL-001', 'LP-DEL-001', 'Rajesh Kumar Sharma', 'Rampur', 'Gurugram Tehsil', 'Gurugram Tehsil', 'Gurugram', 'Haryana', 'SY-104/A', 'SY-104/A', 'KHS-DEL-001', 'KHS-DEL-001', 'KH-104', 'KHT-104', 'Agricultural', 12500.00, 11200.00, 'Possession Taken', 'Verified', NOW() - INTERVAL '12 days', 'Inspector R. K. Varma', 'Ground survey verified. Boundary markers set.', 4500000.00, 4500000.00, 4500000.00, 4500000.00, 'Paid', 'PFMS-DBT-2026-9011', NOW() - INTERVAL '5 days', 'Completed', 1200000.00, 'Rehabilitation plot allocated in Sector 14.', NOW() - INTERVAL '2 days', 28.443255, 77.020196),
('NHAI-DEL-BOM-01', 'LP-DEL-002', 'LP-DEL-002', 'Suresh Chandra Patel', 'Kishanganj', 'Faridabad Tehsil', 'Faridabad Tehsil', 'Faridabad', 'Haryana', 'SY-208/B', 'SY-208/B', 'KHS-DEL-002', 'KHS-DEL-002', 'KH-208', 'KHT-208', 'Semi-Urban', 34000.00, 31000.00, 'In Progress', 'Verified', NOW() - INTERVAL '8 days', 'Inspector R. K. Varma', 'Verification complete. Awaiting final award document.', 12500000.00, 12500000.00, 12500000.00, 0.00, 'Payment Pending', NULL, NULL, 'In Progress', 2500000.00, 'Housing assistance under review.', NULL, 28.381020, 77.125010),
('NHAI-DEL-BOM-01', 'LP-DEL-003', 'LP-DEL-003', 'Anita Devi Yadav', 'Devnagar', 'Nuh Tehsil', 'Nuh Tehsil', 'Nuh', 'Haryana', 'SY-312/C', 'SY-312/C', 'KHS-DEL-003', 'KHS-DEL-003', 'KH-312', 'KHT-312', 'Agricultural', 21000.00, 20500.00, 'Completed', 'Verified', NOW() - INTERVAL '20 days', 'Inspector A. P. Singh', 'Full clearance granted by revenue department.', 7800000.00, 7800000.00, 7800000.00, 7800000.00, 'Paid', 'PFMS-DBT-2026-8812', NOW() - INTERVAL '10 days', 'Completed', 1800000.00, 'Resettlement completed.', NOW() - INTERVAL '4 days', 28.112000, 77.014500),
('NHAI-DEL-BOM-01', 'LP-DEL-004', 'LP-DEL-004', 'Vikram Singh Rathore', 'Baghpat Sector 2', 'Alwar Tehsil', 'Alwar Tehsil', 'Alwar', 'Rajasthan', 'SY-401/A', 'SY-401/A', 'KHS-DEL-004', 'KHS-DEL-004', 'KH-401', 'KHT-401', 'Industrial', 48000.00, 45000.00, 'Acquired', 'Verified', NOW() - INTERVAL '15 days', 'Inspector M. L. Gupta', 'Industrial plot acquisition cleared.', 22000000.00, 22000000.00, 22000000.00, 22000000.00, 'Paid', 'PFMS-DBT-2026-7901', NOW() - INTERVAL '8 days', 'Eligible', 3500000.00, 'Commercial site relocation approved.', NULL, 27.564100, 76.612000),

-- Nashik-Surat Corridor Parcels
('NHAI-NSK-SURCHE', 'LP-NSK-101', 'LP-NSK-101', 'Mahesh Purushottam Sharma', 'Panchavati', 'Nashik Taluka', 'Nashik Taluka', 'Nashik', 'Maharashtra', 'SY-55/1', 'SY-55/1', 'KHS-NSK-001', 'KHS-NSK-001', 'KH-55', 'KHT-55', 'Agricultural', 17500.00, 16000.00, 'Pending', 'Needs Review', NOW() - INTERVAL '3 days', 'Inspector V. D. Kulkarni', 'Dispute over boundary demarcation with neighbor parcel.', 6200000.00, 6200000.00, 0.00, 0.00, 'Assessed', NULL, NULL, 'Eligible', 0.00, 'Pending field review.', NULL, 19.997500, 73.789500),
('NHAI-NSK-SURCHE', 'LP-NSK-102', 'LP-NSK-102', 'Sunita Ramrao Verma', 'Dindori', 'Dindori Taluka', 'Dindori Taluka', 'Nashik', 'Maharashtra', 'SY-88/4', 'SY-88/4', 'KHS-NSK-002', 'KHS-NSK-002', 'KH-88', 'KHT-88', 'Agricultural', 29000.00, 28500.00, 'Possession Taken', 'Verified', NOW() - INTERVAL '18 days', 'Inspector V. D. Kulkarni', 'Land transferred to NHAI records.', 9500000.00, 9500000.00, 9500000.00, 9500000.00, 'Paid', 'PFMS-DBT-2026-6644', NOW() - INTERVAL '14 days', 'Completed', 2000000.00, 'Grant released.', NOW() - INTERVAL '6 days', 20.201000, 73.831000),
('NHAI-NSK-SURCHE', 'LP-NSK-103', 'LP-NSK-103', 'Ganesh Dattatray Joshi', 'Navsari Periphery', 'Navsari Taluka', 'Navsari Taluka', 'Navsari', 'Gujarat', 'SY-109/2', 'SY-109/2', 'KHS-NSK-003', 'KHS-NSK-003', 'KH-109', 'KHT-109', 'Orchard / Agro', 31500.00, 30000.00, 'Acquired', 'Verified', NOW() - INTERVAL '10 days', 'Inspector B. J. Patel', 'Mango orchard evaluation complete.', 14200000.00, 14200000.00, 14200000.00, 14200000.00, 'Paid', 'PFMS-DBT-2026-5510', NOW() - INTERVAL '7 days', 'In Progress', 1500000.00, 'Fruit tree compensation distributed.', NULL, 20.950000, 72.920000),
('NHAI-NSK-SURCHE', 'LP-NSK-104', 'LP-NSK-104', 'Kavita Pravin Deshmukh', 'Bardoli', 'Bardoli Taluka', 'Bardoli Taluka', 'Surat', 'Gujarat', 'SY-44/A', 'SY-44/A', 'KHS-NSK-004', 'KHS-NSK-004', 'KH-44', 'KHT-44', 'Semi-Urban', 19800.00, 19000.00, 'In Progress', 'Pending', NULL, NULL, 'Initial notice issued under Section 3A.', 8900000.00, 8900000.00, 0.00, 0.00, 'Not Assessed', NULL, NULL, 'Not Started', 0.00, NULL, NULL, 21.120000, 73.110000),

-- Rampur-Baghpat Expressway Parcels
('NH-334B', 'LP-RMP-201', 'LP-RMP-201', 'Harish Chandra Tyagi', 'Muradnagar', 'Modinagar Tehsil', 'Modinagar Tehsil', 'Ghaziabad', 'Uttar Pradesh', 'SY-12/3', 'SY-12/3', 'KHS-RMP-001', 'KHS-RMP-001', 'KH-12', 'KHT-12', 'Agricultural', 14000.00, 13500.00, 'Pending', 'Pending', NULL, NULL, 'Awaiting joint measurement survey.', 5100000.00, 0.00, 0.00, 0.00, 'Not Assessed', NULL, NULL, 'Not Started', 0.00, NULL, NULL, 28.780000, 77.500000),
('NH-334B', 'LP-RMP-202', 'LP-RMP-202', 'Pravin Kumar Chaudhary', 'Baghpat Rural', 'Baghpat Tehsil', 'Baghpat Tehsil', 'Baghpat', 'Uttar Pradesh', 'SY-77/B', 'SY-77/B', 'KHS-RMP-002', 'KHS-RMP-002', 'KH-77', 'KHT-77', 'Agricultural', 26500.00, 25000.00, 'In Progress', 'Verified', NOW() - INTERVAL '5 days', 'Inspector S. K. Rastogi', 'Verified sugar cane plantation valuation.', 8800000.00, 8800000.00, 8800000.00, 0.00, 'Approved', NULL, NULL, 'Eligible', 1200000.00, 'Agricultural replacement grant.', NULL, 28.940000, 77.220000),
('NH-334B', 'LP-RMP-203', 'LP-RMP-203', 'Manju Rani Agarwal', 'Modinagar', 'Meerut Tehsil', 'Meerut Tehsil', 'Meerut', 'Uttar Pradesh', 'SY-201/1', 'SY-201/1', 'KHS-RMP-003', 'KHS-RMP-003', 'KH-201', 'KHT-201', 'Commercial', 8500.00, 8500.00, 'Acquired', 'Verified', NOW() - INTERVAL '14 days', 'Inspector S. K. Rastogi', 'Commercial warehouse premises cleared.', 16500000.00, 16500000.00, 16500000.00, 16500000.00, 'Paid', 'PFMS-DBT-2026-4401', NOW() - INTERVAL '6 days', 'Completed', 4000000.00, 'Commercial unit shifting allowance paid.', NOW() - INTERVAL '1 day', 28.960000, 77.580000),

-- Kishanganj Bypass Parcels
('NH-709A', 'LP-KSG-301', 'LP-KSG-301', 'Mohammad Iqbal Husain', 'Kishanganj North', 'Muzaffarnagar Tehsil', 'Muzaffarnagar Tehsil', 'Muzaffarnagar', 'Uttar Pradesh', 'SY-15/A', 'SY-15/A', 'KHS-KSG-001', 'KHS-KSG-001', 'KH-15', 'KHT-15', 'Agricultural', 18200.00, 17500.00, 'Pending', 'Pending', NULL, NULL, 'Section 11 notification published.', 4800000.00, 0.00, 0.00, 0.00, 'Not Assessed', NULL, NULL, 'Not Started', 0.00, NULL, NULL, 29.470000, 77.700000),
('NH-709A', 'LP-KSG-302', 'LP-KSG-302', 'Sanjay Dutt Tripathi', 'Shamli Periphery', 'Shamli Tehsil', 'Shamli Tehsil', 'Shamli', 'Uttar Pradesh', 'SY-99/3', 'SY-99/3', 'KHS-KSG-002', 'KHS-KSG-002', 'KH-99', 'KHT-99', 'Agricultural', 23000.00, 22000.00, 'In Progress', 'Needs Review', NOW() - INTERVAL '2 days', 'Inspector K. P. Yadav', 'Heirship certificate verification pending.', 6900000.00, 6900000.00, 0.00, 0.00, 'Assessed', NULL, NULL, 'Eligible', 0.00, NULL, NULL, 29.450000, 77.310000),

-- Eastern Freight Spur Parcels
('EW-14', 'LP-EFS-401', 'LP-EFS-401', 'Vijay Kumar Bansal', 'Bulandshahr East', 'Bulandshahr Tehsil', 'Bulandshahr Tehsil', 'Bulandshahr', 'Uttar Pradesh', 'SY-304/B', 'SY-304/B', 'KHS-EFS-001', 'KHS-EFS-001', 'KH-304', 'KHT-304', 'Industrial', 52000.00, 50000.00, 'Completed', 'Verified', NOW() - INTERVAL '25 days', 'Inspector N. K. Saxena', 'Logistics hub land takeover complete.', 32000000.00, 32000000.00, 32000000.00, 32000000.00, 'Paid', 'PFMS-DBT-2026-3390', NOW() - INTERVAL '19 days', 'Completed', 6000000.00, 'Rehabilitation scheme disbursed.', NOW() - INTERVAL '11 days', 28.400000, 77.850000),
('EW-14', 'LP-EFS-402', 'LP-EFS-402', 'Savita Ramakant Mishra', 'Sikandrabad', 'Sikandrabad Tehsil', 'Sikandrabad Tehsil', 'Bulandshahr', 'Uttar Pradesh', 'SY-412/1', 'SY-412/1', 'KHS-EFS-002', 'KHS-EFS-002', 'KH-412', 'KHT-412', 'Agricultural', 38000.00, 36500.00, 'Acquired', 'Verified', NOW() - INTERVAL '16 days', 'Inspector N. K. Saxena', 'Award passed under Section 23.', 13500000.00, 13500000.00, 13500000.00, 13500000.00, 'Paid', 'PFMS-DBT-2026-3391', NOW() - INTERVAL '12 days', 'In Progress', 2200000.00, 'Livelihood support installment released.', NULL, 28.450000, 77.690000),
('EW-14', 'LP-EFS-403', 'LP-EFS-403', 'Dharmendra Pal Singh', 'Khurja Sector 4', 'Khurja Tehsil', 'Khurja Tehsil', 'Bulandshahr', 'Uttar Pradesh', 'SY-518/A', 'SY-518/A', 'KHS-EFS-003', 'KHS-EFS-003', 'KH-518', 'KHT-518', 'Agricultural', 27400.00, 26000.00, 'Possession Taken', 'Verified', NOW() - INTERVAL '11 days', 'Inspector N. K. Saxena', 'Possession handed over to DFCCIL.', 9800000.00, 9800000.00, 9800000.00, 9800000.00, 'Paid', 'PFMS-DBT-2026-3392', NOW() - INTERVAL '7 days', 'Completed', 1800000.00, 'Completed resettlement package.', NOW() - INTERVAL '3 days', 28.250000, 77.850000)
) AS v(project_code, parcel_number, parcel_no, owner_name, village_name, taluka_name, tehsil, district, state, survey_number, survey_no, khasra_no, khasra_number, khata_no, khatauni_no, land_type, notified_area_sqm, affected_area_sqm, possession_status, field_verification_status, field_verified_at, field_verified_by, field_remarks, compensation_amount, compensation_assessed, compensation_approved, compensation_paid, payment_status, payment_reference, payment_released_at, rehabilitation_status, rehabilitation_amount, rehabilitation_remarks, rehabilitation_completed_at, latitude, longitude)
JOIN projects p ON p.project_code = v.project_code
WHERE lp.project_code = v.project_code
  AND (lp.parcel_number = v.parcel_number OR lp.khasra_no = v.khasra_no);

-- 3. INSERT NEW LAND PARCELS (Dynamic project_id resolution via JOIN projects)
INSERT INTO land_parcels (
    project_id, project_code, parcel_number, parcel_no, owner_name, village_name, taluka_name, tehsil, district, state, survey_number, survey_no, khasra_no, khasra_number, khata_no, khatauni_no, land_type, notified_area_sqm, affected_area_sqm, possession_status, field_verification_status, field_verified_at, field_verified_by, field_remarks, compensation_amount, compensation_assessed, compensation_approved, compensation_paid, payment_status, payment_reference, payment_released_at, rehabilitation_status, rehabilitation_amount, rehabilitation_remarks, rehabilitation_completed_at, latitude, longitude
)
SELECT
    p.id AS project_id,
    v.project_code,
    v.parcel_number,
    v.parcel_no,
    v.owner_name,
    v.village_name,
    v.taluka_name,
    v.tehsil,
    v.district,
    v.state,
    v.survey_number,
    v.survey_no,
    v.khasra_no,
    v.khasra_number,
    v.khata_no,
    v.khatauni_no,
    v.land_type,
    v.notified_area_sqm,
    v.affected_area_sqm,
    v.possession_status,
    v.field_verification_status,
    v.field_verified_at,
    v.field_verified_by,
    v.field_remarks,
    v.compensation_amount,
    v.compensation_assessed,
    v.compensation_approved,
    v.compensation_paid,
    v.payment_status,
    v.payment_reference,
    v.payment_released_at,
    v.rehabilitation_status,
    v.rehabilitation_amount,
    v.rehabilitation_remarks,
    v.rehabilitation_completed_at,
    v.latitude,
    v.longitude
FROM (VALUES
-- Delhi-Mumbai Corridor Parcels
('NHAI-DEL-BOM-01', 'LP-DEL-001', 'LP-DEL-001', 'Rajesh Kumar Sharma', 'Rampur', 'Gurugram Tehsil', 'Gurugram Tehsil', 'Gurugram', 'Haryana', 'SY-104/A', 'SY-104/A', 'KHS-DEL-001', 'KHS-DEL-001', 'KH-104', 'KHT-104', 'Agricultural', 12500.00, 11200.00, 'Possession Taken', 'Verified', NOW() - INTERVAL '12 days', 'Inspector R. K. Varma', 'Ground survey verified. Boundary markers set.', 4500000.00, 4500000.00, 4500000.00, 4500000.00, 'Paid', 'PFMS-DBT-2026-9011', NOW() - INTERVAL '5 days', 'Completed', 1200000.00, 'Rehabilitation plot allocated in Sector 14.', NOW() - INTERVAL '2 days', 28.443255, 77.020196),
('NHAI-DEL-BOM-01', 'LP-DEL-002', 'LP-DEL-002', 'Suresh Chandra Patel', 'Kishanganj', 'Faridabad Tehsil', 'Faridabad Tehsil', 'Faridabad', 'Haryana', 'SY-208/B', 'SY-208/B', 'KHS-DEL-002', 'KHS-DEL-002', 'KH-208', 'KHT-208', 'Semi-Urban', 34000.00, 31000.00, 'In Progress', 'Verified', NOW() - INTERVAL '8 days', 'Inspector R. K. Varma', 'Verification complete. Awaiting final award document.', 12500000.00, 12500000.00, 12500000.00, 0.00, 'Payment Pending', NULL, NULL, 'In Progress', 2500000.00, 'Housing assistance under review.', NULL, 28.381020, 77.125010),
('NHAI-DEL-BOM-01', 'LP-DEL-003', 'LP-DEL-003', 'Anita Devi Yadav', 'Devnagar', 'Nuh Tehsil', 'Nuh Tehsil', 'Nuh', 'Haryana', 'SY-312/C', 'SY-312/C', 'KHS-DEL-003', 'KHS-DEL-003', 'KH-312', 'KHT-312', 'Agricultural', 21000.00, 20500.00, 'Completed', 'Verified', NOW() - INTERVAL '20 days', 'Inspector A. P. Singh', 'Full clearance granted by revenue department.', 7800000.00, 7800000.00, 7800000.00, 7800000.00, 'Paid', 'PFMS-DBT-2026-8812', NOW() - INTERVAL '10 days', 'Completed', 1800000.00, 'Resettlement completed.', NOW() - INTERVAL '4 days', 28.112000, 77.014500),
('NHAI-DEL-BOM-01', 'LP-DEL-004', 'LP-DEL-004', 'Vikram Singh Rathore', 'Baghpat Sector 2', 'Alwar Tehsil', 'Alwar Tehsil', 'Alwar', 'Rajasthan', 'SY-401/A', 'SY-401/A', 'KHS-DEL-004', 'KHS-DEL-004', 'KH-401', 'KHT-401', 'Industrial', 48000.00, 45000.00, 'Acquired', 'Verified', NOW() - INTERVAL '15 days', 'Inspector M. L. Gupta', 'Industrial plot acquisition cleared.', 22000000.00, 22000000.00, 22000000.00, 22000000.00, 'Paid', 'PFMS-DBT-2026-7901', NOW() - INTERVAL '8 days', 'Eligible', 3500000.00, 'Commercial site relocation approved.', NULL, 27.564100, 76.612000),

-- Nashik-Surat Corridor Parcels
('NHAI-NSK-SURCHE', 'LP-NSK-101', 'LP-NSK-101', 'Mahesh Purushottam Sharma', 'Panchavati', 'Nashik Taluka', 'Nashik Taluka', 'Nashik', 'Maharashtra', 'SY-55/1', 'SY-55/1', 'KHS-NSK-001', 'KHS-NSK-001', 'KH-55', 'KHT-55', 'Agricultural', 17500.00, 16000.00, 'Pending', 'Needs Review', NOW() - INTERVAL '3 days', 'Inspector V. D. Kulkarni', 'Dispute over boundary demarcation with neighbor parcel.', 6200000.00, 6200000.00, 0.00, 0.00, 'Assessed', NULL, NULL, 'Eligible', 0.00, 'Pending field review.', NULL, 19.997500, 73.789500),
('NHAI-NSK-SURCHE', 'LP-NSK-102', 'LP-NSK-102', 'Sunita Ramrao Verma', 'Dindori', 'Dindori Taluka', 'Dindori Taluka', 'Nashik', 'Maharashtra', 'SY-88/4', 'SY-88/4', 'KHS-NSK-002', 'KHS-NSK-002', 'KH-88', 'KHT-88', 'Agricultural', 29000.00, 28500.00, 'Possession Taken', 'Verified', NOW() - INTERVAL '18 days', 'Inspector V. D. Kulkarni', 'Land transferred to NHAI records.', 9500000.00, 9500000.00, 9500000.00, 9500000.00, 'Paid', 'PFMS-DBT-2026-6644', NOW() - INTERVAL '14 days', 'Completed', 2000000.00, 'Grant released.', NOW() - INTERVAL '6 days', 20.201000, 73.831000),
('NHAI-NSK-SURCHE', 'LP-NSK-103', 'LP-NSK-103', 'Ganesh Dattatray Joshi', 'Navsari Periphery', 'Navsari Taluka', 'Navsari Taluka', 'Navsari', 'Gujarat', 'SY-109/2', 'SY-109/2', 'KHS-NSK-003', 'KHS-NSK-003', 'KH-109', 'KHT-109', 'Orchard / Agro', 31500.00, 30000.00, 'Acquired', 'Verified', NOW() - INTERVAL '10 days', 'Inspector B. J. Patel', 'Mango orchard evaluation complete.', 14200000.00, 14200000.00, 14200000.00, 14200000.00, 'Paid', 'PFMS-DBT-2026-5510', NOW() - INTERVAL '7 days', 'In Progress', 1500000.00, 'Fruit tree compensation distributed.', NULL, 20.950000, 72.920000),
('NHAI-NSK-SURCHE', 'LP-NSK-104', 'LP-NSK-104', 'Kavita Pravin Deshmukh', 'Bardoli', 'Bardoli Taluka', 'Bardoli Taluka', 'Surat', 'Gujarat', 'SY-44/A', 'SY-44/A', 'KHS-NSK-004', 'KHS-NSK-004', 'KH-44', 'KHT-44', 'Semi-Urban', 19800.00, 19000.00, 'In Progress', 'Pending', NULL, NULL, 'Initial notice issued under Section 3A.', 8900000.00, 8900000.00, 0.00, 0.00, 'Not Assessed', NULL, NULL, 'Not Started', 0.00, NULL, NULL, 21.120000, 73.110000),

-- Rampur-Baghpat Expressway Parcels
('NH-334B', 'LP-RMP-201', 'LP-RMP-201', 'Harish Chandra Tyagi', 'Muradnagar', 'Modinagar Tehsil', 'Modinagar Tehsil', 'Ghaziabad', 'Uttar Pradesh', 'SY-12/3', 'SY-12/3', 'KHS-RMP-001', 'KHS-RMP-001', 'KH-12', 'KHT-12', 'Agricultural', 14000.00, 13500.00, 'Pending', 'Pending', NULL, NULL, 'Awaiting joint measurement survey.', 5100000.00, 0.00, 0.00, 0.00, 'Not Assessed', NULL, NULL, 'Not Started', 0.00, NULL, NULL, 28.780000, 77.500000),
('NH-334B', 'LP-RMP-202', 'LP-RMP-202', 'Pravin Kumar Chaudhary', 'Baghpat Rural', 'Baghpat Tehsil', 'Baghpat Tehsil', 'Baghpat', 'Uttar Pradesh', 'SY-77/B', 'SY-77/B', 'KHS-RMP-002', 'KHS-RMP-002', 'KH-77', 'KHT-77', 'Agricultural', 26500.00, 25000.00, 'In Progress', 'Verified', NOW() - INTERVAL '5 days', 'Inspector S. K. Rastogi', 'Verified sugar cane plantation valuation.', 8800000.00, 8800000.00, 8800000.00, 0.00, 'Approved', NULL, NULL, 'Eligible', 1200000.00, 'Agricultural replacement grant.', NULL, 28.940000, 77.220000),
('NH-334B', 'LP-RMP-203', 'LP-RMP-203', 'Manju Rani Agarwal', 'Modinagar', 'Meerut Tehsil', 'Meerut Tehsil', 'Meerut', 'Uttar Pradesh', 'SY-201/1', 'SY-201/1', 'KHS-RMP-003', 'KHS-RMP-003', 'KH-201', 'KHT-201', 'Commercial', 8500.00, 8500.00, 'Acquired', 'Verified', NOW() - INTERVAL '14 days', 'Inspector S. K. Rastogi', 'Commercial warehouse premises cleared.', 16500000.00, 16500000.00, 16500000.00, 16500000.00, 'Paid', 'PFMS-DBT-2026-4401', NOW() - INTERVAL '6 days', 'Completed', 4000000.00, 'Commercial unit shifting allowance paid.', NOW() - INTERVAL '1 day', 28.960000, 77.580000),

-- Kishanganj Bypass Parcels
('NH-709A', 'LP-KSG-301', 'LP-KSG-301', 'Mohammad Iqbal Husain', 'Kishanganj North', 'Muzaffarnagar Tehsil', 'Muzaffarnagar Tehsil', 'Muzaffarnagar', 'Uttar Pradesh', 'SY-15/A', 'SY-15/A', 'KHS-KSG-001', 'KHS-KSG-001', 'KH-15', 'KHT-15', 'Agricultural', 18200.00, 17500.00, 'Pending', 'Pending', NULL, NULL, 'Section 11 notification published.', 4800000.00, 0.00, 0.00, 0.00, 'Not Assessed', NULL, NULL, 'Not Started', 0.00, NULL, NULL, 29.470000, 77.700000),
('NH-709A', 'LP-KSG-302', 'LP-KSG-302', 'Sanjay Dutt Tripathi', 'Shamli Periphery', 'Shamli Tehsil', 'Shamli Tehsil', 'Shamli', 'Uttar Pradesh', 'SY-99/3', 'SY-99/3', 'KHS-KSG-002', 'KHS-KSG-002', 'KH-99', 'KHT-99', 'Agricultural', 23000.00, 22000.00, 'In Progress', 'Needs Review', NOW() - INTERVAL '2 days', 'Inspector K. P. Yadav', 'Heirship certificate verification pending.', 6900000.00, 6900000.00, 0.00, 0.00, 'Assessed', NULL, NULL, 'Eligible', 0.00, NULL, NULL, 29.450000, 77.310000),

-- Eastern Freight Spur Parcels
('EW-14', 'LP-EFS-401', 'LP-EFS-401', 'Vijay Kumar Bansal', 'Bulandshahr East', 'Bulandshahr Tehsil', 'Bulandshahr Tehsil', 'Bulandshahr', 'Uttar Pradesh', 'SY-304/B', 'SY-304/B', 'KHS-EFS-001', 'KHS-EFS-001', 'KH-304', 'KHT-304', 'Industrial', 52000.00, 50000.00, 'Completed', 'Verified', NOW() - INTERVAL '25 days', 'Inspector N. K. Saxena', 'Logistics hub land takeover complete.', 32000000.00, 32000000.00, 32000000.00, 32000000.00, 'Paid', 'PFMS-DBT-2026-3390', NOW() - INTERVAL '19 days', 'Completed', 6000000.00, 'Rehabilitation scheme disbursed.', NOW() - INTERVAL '11 days', 28.400000, 77.850000),
('EW-14', 'LP-EFS-402', 'LP-EFS-402', 'Savita Ramakant Mishra', 'Sikandrabad', 'Sikandrabad Tehsil', 'Sikandrabad Tehsil', 'Bulandshahr', 'Uttar Pradesh', 'SY-412/1', 'SY-412/1', 'KHS-EFS-002', 'KHS-EFS-002', 'KH-412', 'KHT-412', 'Agricultural', 38000.00, 36500.00, 'Acquired', 'Verified', NOW() - INTERVAL '16 days', 'Inspector N. K. Saxena', 'Award passed under Section 23.', 13500000.00, 13500000.00, 13500000.00, 13500000.00, 'Paid', 'PFMS-DBT-2026-3391', NOW() - INTERVAL '12 days', 'In Progress', 2200000.00, 'Livelihood support installment released.', NULL, 28.450000, 77.690000),
('EW-14', 'LP-EFS-403', 'LP-EFS-403', 'Dharmendra Pal Singh', 'Khurja Sector 4', 'Khurja Tehsil', 'Khurja Tehsil', 'Bulandshahr', 'Uttar Pradesh', 'SY-518/A', 'SY-518/A', 'KHS-EFS-003', 'KHS-EFS-003', 'KH-518', 'KHT-518', 'Agricultural', 27400.00, 26000.00, 'Possession Taken', 'Verified', NOW() - INTERVAL '11 days', 'Inspector N. K. Saxena', 'Possession handed over to DFCCIL.', 9800000.00, 9800000.00, 9800000.00, 9800000.00, 'Paid', 'PFMS-DBT-2026-3392', NOW() - INTERVAL '7 days', 'Completed', 1800000.00, 'Completed resettlement package.', NOW() - INTERVAL '3 days', 28.250000, 77.850000)
) AS v(project_code, parcel_number, parcel_no, owner_name, village_name, taluka_name, tehsil, district, state, survey_number, survey_no, khasra_no, khasra_number, khata_no, khatauni_no, land_type, notified_area_sqm, affected_area_sqm, possession_status, field_verification_status, field_verified_at, field_verified_by, field_remarks, compensation_amount, compensation_assessed, compensation_approved, compensation_paid, payment_status, payment_reference, payment_released_at, rehabilitation_status, rehabilitation_amount, rehabilitation_remarks, rehabilitation_completed_at, latitude, longitude)
JOIN projects p ON p.project_code = v.project_code
WHERE NOT EXISTS (
    SELECT 1 FROM land_parcels lp
    WHERE lp.project_code = v.project_code
      AND (lp.parcel_number = v.parcel_number OR lp.khasra_no = v.khasra_no)
);

-- 4. UPDATE EXISTING STATUTORY WORKFLOWS (Synchronize land_parcel_id & stage names)
UPDATE statutory_workflows sw
SET
    land_parcel_id = lp.id,
    workflow_type = v.workflow_type,
    stage_name = v.stage_name,
    status = v.status,
    assigned_to = v.assigned_to,
    submitted_by = v.submitted_by,
    approved_by = v.approved_by,
    remarks = v.remarks,
    approved_at = v.approved_at
FROM (VALUES
('NHAI-DEL-BOM-01', 'LP-DEL-001', 'Section 3A - Intent to Acquire', 'Section 3A - Intent to Acquire', 'Approved', 'MoRTH Nodal Officer', 'MoRTH Nodal Officer', 'Competent Authority A. Sharma, IAS', 'Published in Gazette of India Extraordinary Part II.', NOW() - INTERVAL '40 days', NOW() - INTERVAL '38 days'),
('NHAI-DEL-BOM-01', 'LP-DEL-001', 'Section 3D - Declaration of Acquisition', 'Section 3D - Declaration of Acquisition', 'Approved', 'Competent Authority A. Sharma, IAS', 'Competent Authority A. Sharma, IAS', 'Ministry Nodal Desk', 'Land vests absolutely in Central Government.', NOW() - INTERVAL '30 days', NOW() - INTERVAL '28 days'),
('NHAI-DEL-BOM-01', 'LP-DEL-002', 'Section 11 - Gazette Notification', 'Section 11 - Gazette Notification', 'Approved', 'MoRTH Nodal Officer', 'MoRTH Nodal Officer', 'Competent Authority A. Sharma, IAS', 'Gazette Notification Ref: NHAI/LA-ACT/2026/DEL-BOM-01 generated.', NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days'),
('NHAI-DEL-BOM-01', 'LP-DEL-002', 'Section 23 - Award Determination', 'Section 23 - Award Determination', 'Pending Approval', 'Special Land Acquisition Officer (SLAO)', 'Special Land Acquisition Officer (SLAO)', NULL, 'Award determination calculation submitted for competent authority signature.', NOW() - INTERVAL '5 days', NULL),
('NHAI-NSK-SURCHE', 'LP-NSK-101', 'Section 3A - Intent to Acquire', 'Section 3A - Intent to Acquire', 'Approved', 'Nashik Division CALA', 'Nashik Division CALA', 'Competent Authority A. Sharma, IAS', 'GIS overlap spatial analysis verified 3,450.50 Ha.', NOW() - INTERVAL '25 days', NOW() - INTERVAL '22 days'),
('NHAI-NSK-SURCHE', 'LP-NSK-101', 'Section 3C - Hearing of Objections', 'Section 3C - Hearing of Objections', 'Pending Approval', 'District Revenue Officer', 'District Revenue Officer', NULL, 'Hearing held for boundary dispute on Survey LP-NSK-101.', NOW() - INTERVAL '4 days', NULL),
('NHAI-NSK-SURCHE', 'LP-NSK-102', 'Section 3G - Compensation Disbursement', 'Section 3G - Compensation Disbursement', 'Approved', 'PFMS Direct Benefit Transfer Nodal', 'PFMS Direct Benefit Transfer Nodal', 'Competent Authority A. Sharma, IAS', 'Batch PFMS-DBT-2026-6644 released to beneficiary account.', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),
('NH-334B', 'LP-RMP-201', 'Section 3A - Intent to Acquire', 'Section 3A - Intent to Acquire', 'Pending Approval', 'Meerut Nodal Officer', 'Meerut Nodal Officer', NULL, 'Initial corridor notification draft under review.', NOW() - INTERVAL '3 days', NULL),
('NH-334B', 'LP-RMP-202', 'Section 19 - Declaration of Acquisition', 'Section 19 - Declaration of Acquisition', 'Approved', 'Special Land Acquisition Officer', 'Special Land Acquisition Officer', 'Competent Authority A. Sharma, IAS', 'Declaration issued following Section 15 objection period clearance.', NOW() - INTERVAL '12 days', NOW() - INTERVAL '10 days'),
('NH-709A', 'LP-KSG-301', 'Section 11 - Gazette Notification', 'Section 11 - Gazette Notification', 'Pending Approval', 'Muzaffarnagar CALA Desk', 'Muzaffarnagar CALA Desk', NULL, 'Draft gazette notification submitted for state approval.', NOW() - INTERVAL '2 days', NULL),
('EW-14', 'LP-EFS-401', 'Section 23 - Award Determination', 'Section 23 - Award Determination', 'Approved', 'Bulandshahr CALA', 'Bulandshahr CALA', 'Competent Authority A. Sharma, IAS', 'Final award approved. PFMS payment batch dispatched.', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days'),
('EW-14', 'LP-EFS-402', 'Section 3H - Rehabilitation & Resettlement', 'Section 3H - Rehabilitation & Resettlement', 'Pending Approval', 'Rehabilitation Officer N. K. Saxena', 'Rehabilitation Officer N. K. Saxena', NULL, 'Livelihood support grant installment verification.', NOW() - INTERVAL '1 day', NULL)
) AS v(project_code, parcel_number, workflow_type, stage_name, status, assigned_to, submitted_by, approved_by, remarks, created_at, approved_at)
LEFT JOIN land_parcels lp ON lp.parcel_number = v.parcel_number
WHERE sw.project_code = v.project_code
  AND (sw.workflow_type = v.workflow_type OR sw.stage_name = v.stage_name);

-- 5. INSERT NEW STATUTORY WORKFLOWS (Dynamic land_parcel_id resolution via LEFT JOIN land_parcels)
INSERT INTO statutory_workflows (
    project_code, land_parcel_id, workflow_type, stage_name, status, assigned_to, submitted_by, approved_by, remarks, created_at, approved_at
)
SELECT
    v.project_code,
    lp.id AS land_parcel_id,
    v.workflow_type,
    v.stage_name,
    v.status,
    v.assigned_to,
    v.submitted_by,
    v.approved_by,
    v.remarks,
    v.created_at,
    v.approved_at
FROM (VALUES
('NHAI-DEL-BOM-01', 'LP-DEL-001', 'Section 3A - Intent to Acquire', 'Section 3A - Intent to Acquire', 'Approved', 'MoRTH Nodal Officer', 'MoRTH Nodal Officer', 'Competent Authority A. Sharma, IAS', 'Published in Gazette of India Extraordinary Part II.', NOW() - INTERVAL '40 days', NOW() - INTERVAL '38 days'),
('NHAI-DEL-BOM-01', 'LP-DEL-001', 'Section 3D - Declaration of Acquisition', 'Section 3D - Declaration of Acquisition', 'Approved', 'Competent Authority A. Sharma, IAS', 'Competent Authority A. Sharma, IAS', 'Ministry Nodal Desk', 'Land vests absolutely in Central Government.', NOW() - INTERVAL '30 days', NOW() - INTERVAL '28 days'),
('NHAI-DEL-BOM-01', 'LP-DEL-002', 'Section 11 - Gazette Notification', 'Section 11 - Gazette Notification', 'Approved', 'MoRTH Nodal Officer', 'MoRTH Nodal Officer', 'Competent Authority A. Sharma, IAS', 'Gazette Notification Ref: NHAI/LA-ACT/2026/DEL-BOM-01 generated.', NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days'),
('NHAI-DEL-BOM-01', 'LP-DEL-002', 'Section 23 - Award Determination', 'Section 23 - Award Determination', 'Pending Approval', 'Special Land Acquisition Officer (SLAO)', 'Special Land Acquisition Officer (SLAO)', NULL, 'Award determination calculation submitted for competent authority signature.', NOW() - INTERVAL '5 days', NULL),
('NHAI-NSK-SURCHE', 'LP-NSK-101', 'Section 3A - Intent to Acquire', 'Section 3A - Intent to Acquire', 'Approved', 'Nashik Division CALA', 'Nashik Division CALA', 'Competent Authority A. Sharma, IAS', 'GIS overlap spatial analysis verified 3,450.50 Ha.', NOW() - INTERVAL '25 days', NOW() - INTERVAL '22 days'),
('NHAI-NSK-SURCHE', 'LP-NSK-101', 'Section 3C - Hearing of Objections', 'Section 3C - Hearing of Objections', 'Pending Approval', 'District Revenue Officer', 'District Revenue Officer', NULL, 'Hearing held for boundary dispute on Survey LP-NSK-101.', NOW() - INTERVAL '4 days', NULL),
('NHAI-NSK-SURCHE', 'LP-NSK-102', 'Section 3G - Compensation Disbursement', 'Section 3G - Compensation Disbursement', 'Approved', 'PFMS Direct Benefit Transfer Nodal', 'PFMS Direct Benefit Transfer Nodal', 'Competent Authority A. Sharma, IAS', 'Batch PFMS-DBT-2026-6644 released to beneficiary account.', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),
('NH-334B', 'LP-RMP-201', 'Section 3A - Intent to Acquire', 'Section 3A - Intent to Acquire', 'Pending Approval', 'Meerut Nodal Officer', 'Meerut Nodal Officer', NULL, 'Initial corridor notification draft under review.', NOW() - INTERVAL '3 days', NULL),
('NH-334B', 'LP-RMP-202', 'Section 19 - Declaration of Acquisition', 'Section 19 - Declaration of Acquisition', 'Approved', 'Special Land Acquisition Officer', 'Special Land Acquisition Officer', 'Competent Authority A. Sharma, IAS', 'Declaration issued following Section 15 objection period clearance.', NOW() - INTERVAL '12 days', NOW() - INTERVAL '10 days'),
('NH-709A', 'LP-KSG-301', 'Section 11 - Gazette Notification', 'Section 11 - Gazette Notification', 'Pending Approval', 'Muzaffarnagar CALA Desk', 'Muzaffarnagar CALA Desk', NULL, 'Draft gazette notification submitted for state approval.', NOW() - INTERVAL '2 days', NULL),
('EW-14', 'LP-EFS-401', 'Section 23 - Award Determination', 'Section 23 - Award Determination', 'Approved', 'Bulandshahr CALA', 'Bulandshahr CALA', 'Competent Authority A. Sharma, IAS', 'Final award approved. PFMS payment batch dispatched.', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days'),
('EW-14', 'LP-EFS-402', 'Section 3H - Rehabilitation & Resettlement', 'Section 3H - Rehabilitation & Resettlement', 'Pending Approval', 'Rehabilitation Officer N. K. Saxena', 'Rehabilitation Officer N. K. Saxena', NULL, 'Livelihood support grant installment verification.', NOW() - INTERVAL '1 day', NULL)
) AS v(project_code, parcel_number, workflow_type, stage_name, status, assigned_to, submitted_by, approved_by, remarks, created_at, approved_at)
LEFT JOIN land_parcels lp ON lp.parcel_number = v.parcel_number
WHERE NOT EXISTS (
    SELECT 1 FROM statutory_workflows sw
    WHERE sw.project_code = v.project_code
      AND (sw.workflow_type = v.workflow_type OR sw.stage_name = v.stage_name)
      AND (sw.land_parcel_id = lp.id OR lp.id IS NULL)
);
