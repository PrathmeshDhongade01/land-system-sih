-- ============================================================================
-- NLAMS DATABASE MIGRATION 010: SEED SAMRUDDHI NASHIK CORRIDOR DEMO PROJECT
-- Project Code: SM-NASHIK-DEMO-01
-- Mumbai-Nagpur Samruddhi Expressway - Nashik Corridor Demo
-- 100% Additive & Idempotent (Leaves all existing projects and parcels untouched)
-- ============================================================================

-- 1. INSERT NEW PROJECT (Additive / Idempotent)
INSERT INTO public.projects (
    project_code,
    project_name,
    state,
    district,
    department,
    acquiring_authority,
    project_type,
    corridor_length_km,
    total_area_required_ha,
    status,
    review_status,
    gis_file_url,
    description
) VALUES (
    'SM-NASHIK-DEMO-01',
    'Mumbai–Nagpur Samruddhi Expressway — Nashik Corridor Demo',
    'Maharashtra',
    'Nashik',
    'Ministry of Road Transport & Highways',
    'NHAI – National Highways Authority of India',
    'National Highway',
    39.92,
    97.48,
    'Active',
    'Approved',
    '/gis/SM-NASHIK-DEMO-01.geojson',
    'Demonstration corridor for Mumbai–Nagpur Samruddhi Expressway in Nashik District comprising 24 synthetic demo land parcels.'
)
ON CONFLICT (project_code) DO NOTHING;

-- 2. INSERT 24 LAND PARCELS (Additive / Idempotent)
INSERT INTO public.land_parcels (
    project_id,
    project_code,
    parcel_number,
    parcel_no,
    owner_name,
    village_name,
    taluka_name,
    tehsil,
    district,
    state,
    survey_number,
    survey_no,
    khasra_no,
    land_type,
    notified_area_sqm,
    affected_area_sqm,
    possession_status,
    field_verification_status,
    field_verified_at,
    field_verified_by,
    field_remarks,
    compensation_amount,
    compensation_assessed,
    compensation_approved,
    compensation_paid,
    payment_status,
    payment_reference,
    payment_released_at,
    rehabilitation_status,
    rehabilitation_amount,
    rehabilitation_remarks,
    rehabilitation_completed_at,
    latitude,
    longitude
)
SELECT
    p.id,
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
FROM public.projects p
CROSS JOIN (
    VALUES
    ('SM-NASHIK-DEMO-01', 'SM-NK-101', 'SM-NK-101', 'Eknath Balwantrao Shinde (DEMO-101)', 'Vihigaon', 'Igatpuri Taluka', 'Igatpuri Taluka', 'Nashik', 'Maharashtra', 'SY-101/A', 'SY-101/A', 'KHS-SM-101', 'Agricultural', 263250.00, 19968.58, 'Possession Taken', 'Verified', NOW() - INTERVAL '22 days', 'Inspector S. P. Kadam', 'Ground survey verified. Highway boundary stones demarcated.', 12979577.00, 12979577.00, 12979577.00, 12979577.00, 'Paid', 'PFMS-DBT-2026-8000', NOW() - INTERVAL '19 days', 'Completed', 500000.00, 'R&R one-time resettlement allowance credited.', NOW() - INTERVAL '17 days', 19.769918, 73.789561),
    ('SM-NASHIK-DEMO-01', 'SM-NK-102', 'SM-NK-102', 'Vishwanath Pandurang Jadhav (DEMO-102)', 'Kasarwadi', 'Igatpuri Taluka', 'Igatpuri Taluka', 'Nashik', 'Maharashtra', 'SY-102/B', 'SY-102/B', 'KHS-SM-102', 'Orchard', 348347.37, 36380.35, 'Acquired', 'Verified', NOW() - INTERVAL '18 days', 'Inspector S. P. Kadam', 'Joint measurement survey completed. Solatium paid.', 23647228.00, 23647228.00, 23647228.00, 23647228.00, 'Paid', 'PFMS-DBT-2026-8001', NOW() - INTERVAL '15 days', 'In Progress', 250000.00, 'Livelihood assistance in progress.', NULL, 19.780653, 73.801558),
    ('SM-NASHIK-DEMO-01', 'SM-NK-103', 'SM-NK-103', 'Sunita Dnyaneshwar Bhor (DEMO-103)', 'Wadivarhe', 'Igatpuri Taluka', 'Igatpuri Taluka', 'Nashik', 'Maharashtra', 'SY-103/C', 'SY-103/C', 'KHS-SM-103', 'Agricultural', 446286.19, 31866.37, 'Completed', 'Verified', NOW() - INTERVAL '25 days', 'Inspector S. P. Kadam', 'Full compensation and R&R entitlement cleared.', 20713141.00, 20713141.00, 20713141.00, 20713141.00, 'Paid', 'PFMS-DBT-2026-8002', NOW() - INTERVAL '22 days', 'Completed', 500000.00, 'R&R one-time resettlement allowance credited.', NOW() - INTERVAL '20 days', 19.783741, 73.817855),
    ('SM-NASHIK-DEMO-01', 'SM-NK-104', 'SM-NK-104', 'Dattatray Ramchandra Gaikwad (DEMO-104)', 'Gondedumala', 'Igatpuri Taluka', 'Igatpuri Taluka', 'Nashik', 'Maharashtra', 'SY-104/D', 'SY-104/D', 'KHS-SM-104', 'Residential fringe', 543965.50, 57070.75, 'In Progress', 'Verified', NOW() - INTERVAL '14 days', 'Inspector V. R. Patil', 'Award determined under Section 23. Disbursal pending.', 37095988.00, 37095988.00, 37095988.00, 0.00, 'Approved', NULL, NULL, 'Eligible', 0.00, NULL, NULL, 19.794963, 73.829629),
    ('SM-NASHIK-DEMO-01', 'SM-NK-105', 'SM-NK-105', 'Kashinath Shivram Gite (DEMO-105)', 'Bharvir Khurd', 'Sinnar Taluka', 'Sinnar Taluka', 'Nashik', 'Maharashtra', 'SY-105/A', 'SY-105/A', 'KHS-SM-105', 'Agricultural', 630787.36, 29774.23, 'Pending', 'Needs Review', NOW() - INTERVAL '8 days', 'Inspector V. R. Patil', 'Heirship partition claim submitted; pending revenue review.', 19353250.00, 19353250.00, 0.00, 0.00, 'Assessed', NULL, NULL, 'Not Started', 0.00, NULL, NULL, 19.797166, 73.846247),
    ('SM-NASHIK-DEMO-01', 'SM-NK-106', 'SM-NK-106', 'Anand Raoji Sangale (DEMO-106)', 'Bharvir Budruk', 'Sinnar Taluka', 'Sinnar Taluka', 'Nashik', 'Maharashtra', 'SY-106/B', 'SY-106/B', 'KHS-SM-106', 'Orchard', 794861.93, 55936.57, 'In Progress', 'Verified', NOW() - INTERVAL '12 days', 'Inspector S. P. Kadam', 'Field verification complete. Bank account validated on PFMS.', 36358771.00, 36358771.00, 36358771.00, 0.00, 'Payment Pending', NULL, NULL, 'Eligible', 0.00, NULL, NULL, 19.809476, 73.857507),
    ('SM-NASHIK-DEMO-01', 'SM-NK-107', 'SM-NK-107', 'Pramod Vasantrao Chavan (DEMO-107)', 'Shivajinagar', 'Sinnar Taluka', 'Sinnar Taluka', 'Nashik', 'Maharashtra', 'SY-107/C', 'SY-107/C', 'KHS-SM-107', 'Agricultural', 457140.48, 18390.80, 'Possession Taken', 'Verified', NOW() - INTERVAL '30 days', 'Inspector V. R. Patil', 'Possession handed over to NHAI project director.', 11954020.00, 11954020.00, 11954020.00, 11954020.00, 'Paid', 'PFMS-DBT-2026-8006', NOW() - INTERVAL '27 days', 'Completed', 500000.00, 'R&R one-time resettlement allowance credited.', NOW() - INTERVAL '25 days', 19.810267, 73.874734),
    ('SM-NASHIK-DEMO-01', 'SM-NK-108', 'SM-NK-108', 'Shantabai Madhavrao Dhikale (DEMO-108)', 'Mundhegaon', 'Sinnar Taluka', 'Sinnar Taluka', 'Nashik', 'Maharashtra', 'SY-108/D', 'SY-108/D', 'KHS-SM-108', 'Residential fringe', 331990.71, 42968.04, 'Pending', 'Pending', NULL, NULL, 'Awaiting village joint inspection date.', 27929226.00, 27929226.00, 0.00, 0.00, 'Not Assessed', NULL, NULL, 'Not Started', 0.00, NULL, NULL, 19.821577, 73.886553),
    ('SM-NASHIK-DEMO-01', 'SM-NK-109', 'SM-NK-109', 'Bhagwan Trimbak Kokate (DEMO-109)', 'Vihigaon', 'Igatpuri Taluka', 'Igatpuri Taluka', 'Nashik', 'Maharashtra', 'SY-109/A', 'SY-109/A', 'KHS-SM-109', 'Agricultural', 405783.50, 30390.94, 'Acquired', 'Verified', NOW() - INTERVAL '16 days', 'Inspector S. P. Kadam', 'Tree and borewell valuation approved.', 19754111.00, 19754111.00, 19754111.00, 19754111.00, 'Paid', 'PFMS-DBT-2026-8008', NOW() - INTERVAL '13 days', 'Completed', 500000.00, 'R&R one-time resettlement allowance credited.', NOW() - INTERVAL '11 days', 19.824668, 73.902645),
    ('SM-NASHIK-DEMO-01', 'SM-NK-110', 'SM-NK-110', 'Sambhaji Namdeo Bodke (DEMO-110)', 'Kasarwadi', 'Igatpuri Taluka', 'Igatpuri Taluka', 'Nashik', 'Maharashtra', 'SY-110/B', 'SY-110/B', 'KHS-SM-110', 'Orchard', 497144.93, 56981.82, 'In Progress', 'Verified', NOW() - INTERVAL '10 days', 'Inspector V. R. Patil', 'Verification cleared without encumbrance.', 37038183.00, 37038183.00, 37038183.00, 0.00, 'Approved', NULL, NULL, 'In Progress', 250000.00, 'Livelihood assistance in progress.', NULL, 19.835464, 73.914736),
    ('SM-NASHIK-DEMO-01', 'SM-NK-111', 'SM-NK-111', 'Chandrakant Motiram Khule (DEMO-111)', 'Wadivarhe', 'Igatpuri Taluka', 'Igatpuri Taluka', 'Nashik', 'Maharashtra', 'SY-111/C', 'SY-111/C', 'KHS-SM-111', 'Agricultural', 639268.56, 37856.11, 'Pending', 'Needs Review', NOW() - INTERVAL '5 days', 'Inspector V. R. Patil', 'Boundary discrepancy noted against adjacent canal spur.', 24606472.00, 24606472.00, 0.00, 0.00, 'Assessed', NULL, NULL, 'Not Started', 0.00, NULL, NULL, 19.837759, 73.931338),
    ('SM-NASHIK-DEMO-01', 'SM-NK-112', 'SM-NK-112', 'Ravindra Popatrao Wagh (DEMO-112)', 'Gondedumala', 'Igatpuri Taluka', 'Igatpuri Taluka', 'Nashik', 'Maharashtra', 'SY-112/D', 'SY-112/D', 'KHS-SM-112', 'Residential fringe', 772148.58, 67615.30, 'Possession Taken', 'Verified', NOW() - INTERVAL '28 days', 'Inspector S. P. Kadam', 'Formal possession receipt executed with village Talathi.', 43949945.00, 43949945.00, 43949945.00, 43949945.00, 'Paid', 'PFMS-DBT-2026-8011', NOW() - INTERVAL '25 days', 'Completed', 500000.00, 'R&R one-time resettlement allowance credited.', NOW() - INTERVAL '23 days', 19.848796, 73.94369),
    ('SM-NASHIK-DEMO-01', 'SM-NK-113', 'SM-NK-113', 'Babasaheb Kisan Avhad (DEMO-113)', 'Bharvir Khurd', 'Sinnar Taluka', 'Sinnar Taluka', 'Nashik', 'Maharashtra', 'SY-113/A', 'SY-113/A', 'KHS-SM-113', 'Agricultural', 422846.72, 16919.18, 'In Progress', 'Verified', NOW() - INTERVAL '9 days', 'Inspector S. P. Kadam', 'Section 19 declaration notified.', 10997467.00, 10997467.00, 10997467.00, 0.00, 'Payment Pending', NULL, NULL, 'Eligible', 0.00, NULL, NULL, 19.848214, 73.960657),
    ('SM-NASHIK-DEMO-01', 'SM-NK-114', 'SM-NK-114', 'Nirmala Ramdas Jagtap (DEMO-114)', 'Bharvir Budruk', 'Sinnar Taluka', 'Sinnar Taluka', 'Nashik', 'Maharashtra', 'SY-114/B', 'SY-114/B', 'KHS-SM-114', 'Orchard', 536809.96, 42640.19, 'Pending', 'Pending', NULL, NULL, 'Initial notice served to landholder.', 27716124.00, 27716124.00, 0.00, 0.00, 'Not Assessed', NULL, NULL, 'Not Started', 0.00, NULL, NULL, 19.859606, 73.973232),
    ('SM-NASHIK-DEMO-01', 'SM-NK-115', 'SM-NK-115', 'Suresh Ganpat Sonawane (DEMO-115)', 'Shivajinagar', 'Sinnar Taluka', 'Sinnar Taluka', 'Nashik', 'Maharashtra', 'SY-115/C', 'SY-115/C', 'KHS-SM-115', 'Agricultural', 388094.03, 30510.76, 'Acquired', 'Verified', NOW() - INTERVAL '20 days', 'Inspector V. R. Patil', 'Agricultural land compensation credited via DBT.', 19831994.00, 19831994.00, 19831994.00, 19831994.00, 'Paid', 'PFMS-DBT-2026-8014', NOW() - INTERVAL '17 days', 'In Progress', 250000.00, 'Livelihood assistance in progress.', NULL, 19.858853, 73.990355),
    ('SM-NASHIK-DEMO-01', 'SM-NK-116', 'SM-NK-116', 'Gorakhnath Bhaurao Pingle (DEMO-116)', 'Mundhegaon', 'Sinnar Taluka', 'Sinnar Taluka', 'Nashik', 'Maharashtra', 'SY-116/D', 'SY-116/D', 'KHS-SM-116', 'Residential fringe', 499517.03, 52521.85, 'Completed', 'Verified', NOW() - INTERVAL '35 days', 'Inspector S. P. Kadam', 'All statutory requirements fulfilled.', 34139203.00, 34139203.00, 34139203.00, 34139203.00, 'Paid', 'PFMS-DBT-2026-8015', NOW() - INTERVAL '32 days', 'Completed', 500000.00, 'R&R one-time resettlement allowance credited.', NOW() - INTERVAL '30 days', 19.867679, 74.004107),
    ('SM-NASHIK-DEMO-01', 'SM-NK-117', 'SM-NK-117', 'Murlidhar Hari Sanap (DEMO-117)', 'Vihigaon', 'Igatpuri Taluka', 'Igatpuri Taluka', 'Nashik', 'Maharashtra', 'SY-117/A', 'SY-117/A', 'KHS-SM-117', 'Agricultural', 585993.95, 36063.57, 'In Progress', 'Verified', NOW() - INTERVAL '11 days', 'Inspector V. R. Patil', 'Field evidence photos and GPS boundary logged.', 23441321.00, 23441321.00, 23441321.00, 0.00, 'Approved', NULL, NULL, 'Eligible', 0.00, NULL, NULL, 19.867305, 74.020744),
    ('SM-NASHIK-DEMO-01', 'SM-NK-118', 'SM-NK-118', 'Indubai Janardan Gade (DEMO-118)', 'Kasarwadi', 'Igatpuri Taluka', 'Igatpuri Taluka', 'Nashik', 'Maharashtra', 'SY-118/B', 'SY-118/B', 'KHS-SM-118', 'Orchard', 710862.71, 64291.68, 'Possession Taken', 'Verified', NOW() - INTERVAL '24 days', 'Inspector S. P. Kadam', 'Demarcation completed with stone pillars.', 41789592.00, 41789592.00, 41789592.00, 41789592.00, 'Paid', 'PFMS-DBT-2026-8017', NOW() - INTERVAL '21 days', 'Completed', 500000.00, 'R&R one-time resettlement allowance credited.', NOW() - INTERVAL '19 days', 19.876375, 74.034687),
    ('SM-NASHIK-DEMO-01', 'SM-NK-119', 'SM-NK-119', 'Ashok Nivrutti Mogal (DEMO-119)', 'Wadivarhe', 'Igatpuri Taluka', 'Igatpuri Taluka', 'Nashik', 'Maharashtra', 'SY-119/C', 'SY-119/C', 'KHS-SM-119', 'Agricultural', 411949.12, 16342.46, 'Pending', 'Needs Review', NOW() - INTERVAL '7 days', 'Inspector V. R. Patil', 'Tenancy verification pending with Tehsildar office.', 10622599.00, 10622599.00, 0.00, 0.00, 'Assessed', NULL, NULL, 'Not Started', 0.00, NULL, NULL, 19.874504, 74.051529),
    ('SM-NASHIK-DEMO-01', 'SM-NK-120', 'SM-NK-120', 'Deepak Yashwant Kadam (DEMO-120)', 'Gondedumala', 'Igatpuri Taluka', 'Igatpuri Taluka', 'Nashik', 'Maharashtra', 'SY-120/D', 'SY-120/D', 'KHS-SM-120', 'Residential fringe', 524670.27, 44863.74, 'In Progress', 'Verified', NOW() - INTERVAL '13 days', 'Inspector S. P. Kadam', 'Valuation report submitted to SLAO.', 29161431.00, 29161431.00, 29161431.00, 0.00, 'Payment Pending', NULL, NULL, 'Eligible', 0.00, NULL, NULL, 19.884578, 74.065091),
    ('SM-NASHIK-DEMO-01', 'SM-NK-121', 'SM-NK-121', 'Uttam Dashrath Darade (DEMO-121)', 'Bharvir Khurd', 'Sinnar Taluka', 'Sinnar Taluka', 'Nashik', 'Maharashtra', 'SY-121/A', 'SY-121/A', 'KHS-SM-121', 'Agricultural', 366064.32, 31918.72, 'Acquired', 'Verified', NOW() - INTERVAL '19 days', 'Inspector V. R. Patil', 'DBT transfer successful. No grievances pending.', 20747168.00, 20747168.00, 20747168.00, 20747168.00, 'Paid', 'PFMS-DBT-2026-8020', NOW() - INTERVAL '16 days', 'Completed', 500000.00, 'R&R one-time resettlement allowance credited.', NOW() - INTERVAL '14 days', 19.883768, 74.08185),
    ('SM-NASHIK-DEMO-01', 'SM-NK-122', 'SM-NK-122', 'Parvatibai Shankar Tile (DEMO-122)', 'Bharvir Budruk', 'Sinnar Taluka', 'Sinnar Taluka', 'Nashik', 'Maharashtra', 'SY-122/B', 'SY-122/B', 'KHS-SM-122', 'Orchard', 454280.48, 48338.64, 'Pending', 'Pending', NULL, NULL, 'Scheduled for joint field visit next week.', 31420116.00, 31420116.00, 0.00, 0.00, 'Not Assessed', NULL, NULL, 'Not Started', 0.00, NULL, NULL, 19.892003, 74.09584),
    ('SM-NASHIK-DEMO-01', 'SM-NK-123', 'SM-NK-123', 'Navnath Raghunath Dhatrak (DEMO-123)', 'Shivajinagar', 'Sinnar Taluka', 'Sinnar Taluka', 'Nashik', 'Maharashtra', 'SY-123/C', 'SY-123/C', 'KHS-SM-123', 'Agricultural', 564338.22, 35224.23, 'In Progress', 'Verified', NOW() - INTERVAL '15 days', 'Inspector S. P. Kadam', 'Horticulture crop compensation assessed.', 22895750.00, 22895750.00, 22895750.00, 0.00, 'Approved', NULL, NULL, 'In Progress', 250000.00, 'Livelihood assistance in progress.', NULL, 19.892163, 74.1125),
    ('SM-NASHIK-DEMO-01', 'SM-NK-124', 'SM-NK-124', 'Kalyan Bhikaji Pund (DEMO-124)', 'Mundhegaon', 'Sinnar Taluka', 'Sinnar Taluka', 'Nashik', 'Maharashtra', 'SY-124/D', 'SY-124/D', 'KHS-SM-124', 'Residential fringe', 687823.51, 69921.49, 'Possession Taken', 'Verified', NOW() - INTERVAL '27 days', 'Inspector V. R. Patil', 'Expressway corridor possession taken. Fencing underway.', 45448969.00, 45448969.00, 45448969.00, 45448969.00, 'Paid', 'PFMS-DBT-2026-8023', NOW() - INTERVAL '24 days', 'Completed', 500000.00, 'R&R one-time resettlement allowance credited.', NOW() - INTERVAL '22 days', 19.901515, 74.126079)
) AS v(
    project_code, parcel_number, parcel_no, owner_name, village_name, taluka_name, tehsil, district, state,
    survey_number, survey_no, khasra_no, land_type, notified_area_sqm, affected_area_sqm,
    possession_status, field_verification_status, field_verified_at, field_verified_by, field_remarks,
    compensation_amount, compensation_assessed, compensation_approved, compensation_paid,
    payment_status, payment_reference, payment_released_at, rehabilitation_status, rehabilitation_amount,
    rehabilitation_remarks, rehabilitation_completed_at, latitude, longitude
)
WHERE p.project_code = 'SM-NASHIK-DEMO-01'
  AND NOT EXISTS (
      SELECT 1 FROM public.land_parcels existing
      WHERE existing.project_code = 'SM-NASHIK-DEMO-01'
        AND (existing.parcel_number = v.parcel_number OR existing.parcel_no = v.parcel_no)
  );

-- 3. INSERT STATUTORY WORKFLOWS FOR NEW PROJECT
INSERT INTO public.statutory_workflows (
    project_code,
    workflow_type,
    stage_name,
    status,
    assigned_to,
    submitted_by,
    approved_by,
    remarks,
    created_at,
    approved_at
)
SELECT
    v.project_code,
    v.workflow_type,
    v.stage_name,
    v.status,
    v.assigned_to,
    v.submitted_by,
    v.approved_by,
    v.remarks,
    v.created_at,
    v.approved_at
FROM (
    VALUES
    ('SM-NASHIK-DEMO-01', 'Section 19 - Declaration of Acquisition', 'Section 19 - Declaration of Acquisition', 'Approved', 'SLAO Nashik Division', 'Nashik Division CALA', 'Competent Authority M. K. Rao, IAS', 'Section 19 statutory declaration gazetted for Samruddhi Nashik corridor.', NOW() - INTERVAL '15 days', NOW() - INTERVAL '12 days'),
    ('SM-NASHIK-DEMO-01', 'Section 23 - Award Determination', 'Section 23 - Award Determination', 'Pending Approval', 'SLAO Nashik Division', 'SLAO Nashik Division', NULL, 'Comprehensive award enquiry and compensation calculations under review.', NOW() - INTERVAL '3 days', NULL)
) AS v(project_code, workflow_type, stage_name, status, assigned_to, submitted_by, approved_by, remarks, created_at, approved_at)
WHERE NOT EXISTS (
    SELECT 1 FROM public.statutory_workflows existing
    WHERE existing.project_code = 'SM-NASHIK-DEMO-01'
      AND (existing.workflow_type = v.workflow_type OR existing.stage_name = v.stage_name)
);
