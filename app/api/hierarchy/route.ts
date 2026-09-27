import { NextResponse } from 'next/server'
import { getAuthenticatedUserWithProfile } from '@/lib/supabase/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const ALLOWED_GET_ROLES = new Set([
  'Admin',
  'SLAO',
  'CALA',
  'MoRTH Nodal Officer',
  'Field Officer',
  'Viewer',
])

const ALLOWED_LEVELS = new Set([
  'national',
  'state',
  'district',
  'project',
  'village',
  'parcel',
])

export async function GET(request: Request) {
  try {
    const authRes = await getAuthenticatedUserWithProfile()
    if (authRes.status !== 200 || !authRes.profile) {
      return NextResponse.json(
        { success: false, error: authRes.error || 'Authentication required' },
        { status: authRes.status }
      )
    }

    if (!ALLOWED_GET_ROLES.has(authRes.profile.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const levelRaw = searchParams.get('level')

    if (!levelRaw || !ALLOWED_LEVELS.has(levelRaw.trim().toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid or missing hierarchy level. Allowed: national, state, district, project, village, parcel.',
        },
        { status: 400 }
      )
    }

    const level = levelRaw.trim().toLowerCase()
    const db = authRes.supabase

    /* -------------------------------------------------------------------------- */
    /* 1. LEVEL: NATIONAL                                                         */
    /* -------------------------------------------------------------------------- */
    if (level === 'national') {
      const { data: parcels, error: parcelErr } = await db
        .from('land_parcels')
        .select('id, project_code, village_name, district, state, notified_area_sqm, affected_area_sqm')

      if (parcelErr) {
        console.error('[API /api/hierarchy] Error fetching parcels for national level:', parcelErr)
        return NextResponse.json(
          { success: false, error: 'Unable to load hierarchy data' },
          { status: 500 }
        )
      }

      const allParcels = parcels || []

      // Grouping by land_parcels.state
      const stateMap = new Map<
        string,
        {
          districts: Set<string>
          projects: Set<string>
          villages: Set<string>
          parcel_count: number
          notified_area_sqm: number
          affected_area_sqm: number
        }
      >()

      const allStates = new Set<string>()
      const allDistricts = new Set<string>()
      const allProjects = new Set<string>()
      const allVillages = new Set<string>()
      let totalNotifiedArea = 0
      let totalAffectedArea = 0

      for (const p of allParcels) {
        const stateName = (p.state || 'Unspecified').trim()
        const districtName = (p.district || 'Unspecified').trim()
        const projectCode = (p.project_code || 'Unassigned').trim()
        const villageName = (p.village_name || 'Unspecified').trim()
        const notified = parseFloat(String(p.notified_area_sqm || 0)) || 0
        const affected = parseFloat(String(p.affected_area_sqm || 0)) || 0

        if (stateName !== 'Unspecified') allStates.add(stateName)
        if (districtName !== 'Unspecified') allDistricts.add(districtName)
        if (projectCode !== 'Unassigned') allProjects.add(projectCode)
        if (villageName !== 'Unspecified') allVillages.add(villageName)

        totalNotifiedArea += notified
        totalAffectedArea += affected

        if (!stateMap.has(stateName)) {
          stateMap.set(stateName, {
            districts: new Set(),
            projects: new Set(),
            villages: new Set(),
            parcel_count: 0,
            notified_area_sqm: 0,
            affected_area_sqm: 0,
          })
        }

        const st = stateMap.get(stateName)!
        if (districtName !== 'Unspecified') st.districts.add(districtName)
        if (projectCode !== 'Unassigned') st.projects.add(projectCode)
        if (villageName !== 'Unspecified') st.villages.add(villageName)
        st.parcel_count += 1
        st.notified_area_sqm += notified
        st.affected_area_sqm += affected
      }

      const statesList = Array.from(stateMap.entries())
        .map(([stateName, info]) => ({
          state: stateName,
          district_count: info.districts.size,
          project_count: info.projects.size,
          village_count: info.villages.size,
          parcel_count: info.parcel_count,
          notified_area_sqm: info.notified_area_sqm,
          affected_area_sqm: info.affected_area_sqm,
        }))
        .sort((a, b) => a.state.localeCompare(b.state))

      return NextResponse.json(
        {
          success: true,
          level: 'national',
          country: 'India',
          total_states: allStates.size,
          total_districts: allDistricts.size,
          total_projects: allProjects.size,
          total_villages: allVillages.size,
          total_parcels: allParcels.length,
          total_notified_area_sqm: totalNotifiedArea,
          total_affected_area_sqm: totalAffectedArea,
          states: statesList,
        },
        { status: 200 }
      )
    }

    /* -------------------------------------------------------------------------- */
    /* 2. LEVEL: STATE                                                            */
    /* -------------------------------------------------------------------------- */
    if (level === 'state') {
      const stateParam = searchParams.get('state')
      if (!stateParam || !stateParam.trim()) {
        return NextResponse.json(
          { success: false, error: 'Missing required parameter: state' },
          { status: 400 }
        )
      }

      const reqState = stateParam.trim()

      const { data: parcels, error: parcelErr } = await db
        .from('land_parcels')
        .select('id, project_code, village_name, district, state, notified_area_sqm, affected_area_sqm')
        .ilike('state', reqState)

      if (parcelErr) {
        console.error('[API /api/hierarchy] Error fetching state level:', parcelErr)
        return NextResponse.json(
          { success: false, error: 'Unable to load hierarchy data' },
          { status: 500 }
        )
      }

      if (!parcels || parcels.length === 0) {
        return NextResponse.json(
          { success: false, error: `State '${reqState}' not found.` },
          { status: 404 }
        )
      }

      const canonicalStateName = parcels[0].state || reqState
      const districtMap = new Map<
        string,
        {
          projects: Set<string>
          villages: Set<string>
          parcel_count: number
          notified_area_sqm: number
          affected_area_sqm: number
        }
      >()

      const allDistricts = new Set<string>()
      const allProjects = new Set<string>()
      const allVillages = new Set<string>()
      let totalNotifiedArea = 0
      let totalAffectedArea = 0

      for (const p of parcels) {
        const districtName = (p.district || 'Unspecified').trim()
        const projectCode = (p.project_code || 'Unassigned').trim()
        const villageName = (p.village_name || 'Unspecified').trim()
        const notified = parseFloat(String(p.notified_area_sqm || 0)) || 0
        const affected = parseFloat(String(p.affected_area_sqm || 0)) || 0

        if (districtName !== 'Unspecified') allDistricts.add(districtName)
        if (projectCode !== 'Unassigned') allProjects.add(projectCode)
        if (villageName !== 'Unspecified') allVillages.add(villageName)

        totalNotifiedArea += notified
        totalAffectedArea += affected

        if (!districtMap.has(districtName)) {
          districtMap.set(districtName, {
            projects: new Set(),
            villages: new Set(),
            parcel_count: 0,
            notified_area_sqm: 0,
            affected_area_sqm: 0,
          })
        }

        const dist = districtMap.get(districtName)!
        if (projectCode !== 'Unassigned') dist.projects.add(projectCode)
        if (villageName !== 'Unspecified') dist.villages.add(villageName)
        dist.parcel_count += 1
        dist.notified_area_sqm += notified
        dist.affected_area_sqm += affected
      }

      const districtsList = Array.from(districtMap.entries())
        .map(([distName, info]) => ({
          district: distName,
          project_count: info.projects.size,
          village_count: info.villages.size,
          parcel_count: info.parcel_count,
          notified_area_sqm: info.notified_area_sqm,
          affected_area_sqm: info.affected_area_sqm,
        }))
        .sort((a, b) => a.district.localeCompare(b.district))

      return NextResponse.json(
        {
          success: true,
          level: 'state',
          state: canonicalStateName,
          district_count: allDistricts.size,
          project_count: allProjects.size,
          village_count: allVillages.size,
          parcel_count: parcels.length,
          notified_area_sqm: totalNotifiedArea,
          affected_area_sqm: totalAffectedArea,
          districts: districtsList,
        },
        { status: 200 }
      )
    }

    /* -------------------------------------------------------------------------- */
    /* 3. LEVEL: DISTRICT                                                         */
    /* -------------------------------------------------------------------------- */
    if (level === 'district') {
      const stateParam = searchParams.get('state')
      const districtParam = searchParams.get('district')

      if (!stateParam || !stateParam.trim() || !districtParam || !districtParam.trim()) {
        return NextResponse.json(
          { success: false, error: 'Missing required parameter: state and district are required' },
          { status: 400 }
        )
      }

      const reqState = stateParam.trim()
      const reqDistrict = districtParam.trim()

      const { data: parcels, error: parcelErr } = await db
        .from('land_parcels')
        .select('id, project_id, project_code, village_name, district, state, notified_area_sqm, affected_area_sqm')
        .ilike('state', reqState)
        .ilike('district', reqDistrict)

      if (parcelErr) {
        console.error('[API /api/hierarchy] Error fetching district level:', parcelErr)
        return NextResponse.json(
          { success: false, error: 'Unable to load hierarchy data' },
          { status: 500 }
        )
      }

      if (!parcels || parcels.length === 0) {
        return NextResponse.json(
          { success: false, error: `District '${reqDistrict}' in state '${reqState}' not found.` },
          { status: 404 }
        )
      }

      const canonicalStateName = parcels[0].state || reqState
      const canonicalDistrictName = parcels[0].district || reqDistrict

      const projectCodes = Array.from(
        new Set(parcels.map((p: any) => (p.project_code || '').trim()).filter(Boolean))
      )

      let projectsMeta: any[] = []
      if (projectCodes.length > 0) {
        const { data: pData } = await db
          .from('projects')
          .select('id, project_code, project_name, department, status, corridor_length_km, total_area_required_ha')
          .in('project_code', projectCodes)
        projectsMeta = pData || []
      }

      const projectMetaMap = new Map<string, any>()
      for (const pm of projectsMeta) {
        if (pm.project_code) projectMetaMap.set(pm.project_code, pm)
      }

      const projectGroupMap = new Map<
        string,
        {
          project_id: string | null
          villages: Set<string>
          parcel_count: number
        }
      >()

      const allVillages = new Set<string>()
      let totalNotifiedArea = 0
      let totalAffectedArea = 0

      for (const p of parcels) {
        const projectCode = (p.project_code || 'Unassigned').trim()
        const villageName = (p.village_name || 'Unspecified').trim()
        const notified = parseFloat(String(p.notified_area_sqm || 0)) || 0
        const affected = parseFloat(String(p.affected_area_sqm || 0)) || 0

        if (villageName !== 'Unspecified') allVillages.add(villageName)
        totalNotifiedArea += notified
        totalAffectedArea += affected

        if (!projectGroupMap.has(projectCode)) {
          projectGroupMap.set(projectCode, {
            project_id: p.project_id || null,
            villages: new Set(),
            parcel_count: 0,
          })
        }

        const pg = projectGroupMap.get(projectCode)!
        if (villageName !== 'Unspecified') pg.villages.add(villageName)
        pg.parcel_count += 1
      }

      const projectsList = Array.from(projectGroupMap.entries()).map(([pCode, info]) => {
        const meta = projectMetaMap.get(pCode) || {}
        return {
          project_id: meta.id || info.project_id || null,
          project_code: pCode,
          project_name: meta.project_name || pCode,
          department: meta.department || null,
          status: meta.status || null,
          corridor_length_km: meta.corridor_length_km != null ? Number(meta.corridor_length_km) : null,
          total_area_required_ha: meta.total_area_required_ha != null ? Number(meta.total_area_required_ha) : null,
          parcel_count: info.parcel_count,
          village_count: info.villages.size,
        }
      })

      return NextResponse.json(
        {
          success: true,
          level: 'district',
          state: canonicalStateName,
          district: canonicalDistrictName,
          project_count: projectGroupMap.size,
          village_count: allVillages.size,
          parcel_count: parcels.length,
          notified_area_sqm: totalNotifiedArea,
          affected_area_sqm: totalAffectedArea,
          projects: projectsList,
        },
        { status: 200 }
      )
    }

    /* -------------------------------------------------------------------------- */
    /* 4. LEVEL: PROJECT                                                          */
    /* -------------------------------------------------------------------------- */
    if (level === 'project') {
      const pCodeParam = searchParams.get('project_code')
      if (!pCodeParam || !pCodeParam.trim()) {
        return NextResponse.json(
          { success: false, error: 'Missing required parameter: project_code' },
          { status: 400 }
        )
      }

      const reqProjectCode = pCodeParam.trim()

      const { data: projectRecord } = await db
        .from('projects')
        .select('id, project_code, project_name, department, status, state, district, corridor_length_km, total_area_required_ha')
        .eq('project_code', reqProjectCode)
        .maybeSingle()

      const { data: parcels, error: parcelErr } = await db
        .from('land_parcels')
        .select('id, village_name, district, state, notified_area_sqm, affected_area_sqm')
        .eq('project_code', reqProjectCode)

      if (parcelErr) {
        console.error('[API /api/hierarchy] Error fetching project level:', parcelErr)
        return NextResponse.json(
          { success: false, error: 'Unable to load hierarchy data' },
          { status: 500 }
        )
      }

      if (!projectRecord && (!parcels || parcels.length === 0)) {
        return NextResponse.json(
          { success: false, error: `Project '${reqProjectCode}' not found.` },
          { status: 404 }
        )
      }

      const allParcels = parcels || []

      const villageGroupMap = new Map<
        string,
        {
          state: string | null
          district: string | null
          parcel_count: number
          notified_area_sqm: number
          affected_area_sqm: number
        }
      >()

      const allVillages = new Set<string>()

      for (const p of allParcels) {
        const villageName = (p.village_name || 'Unspecified').trim()
        const notified = parseFloat(String(p.notified_area_sqm || 0)) || 0
        const affected = parseFloat(String(p.affected_area_sqm || 0)) || 0

        if (villageName !== 'Unspecified') allVillages.add(villageName)

        if (!villageGroupMap.has(villageName)) {
          villageGroupMap.set(villageName, {
            state: p.state || null,
            district: p.district || null,
            parcel_count: 0,
            notified_area_sqm: 0,
            affected_area_sqm: 0,
          })
        }

        const vg = villageGroupMap.get(villageName)!
        vg.parcel_count += 1
        vg.notified_area_sqm += notified
        vg.affected_area_sqm += affected
      }

      const villagesList = Array.from(villageGroupMap.entries())
        .map(([vName, info]) => ({
          village_name: vName,
          state: info.state,
          district: info.district,
          parcel_count: info.parcel_count,
          notified_area_sqm: info.notified_area_sqm,
          affected_area_sqm: info.affected_area_sqm,
        }))
        .sort((a, b) => a.village_name.localeCompare(b.village_name))

      return NextResponse.json(
        {
          success: true,
          level: 'project',
          project: {
            id: projectRecord?.id || null,
            project_code: projectRecord?.project_code || reqProjectCode,
            project_name: projectRecord?.project_name || reqProjectCode,
            department: projectRecord?.department || null,
            status: projectRecord?.status || 'Active',
            state: projectRecord?.state || null,
            district: projectRecord?.district || null,
            corridor_length_km:
              projectRecord?.corridor_length_km != null ? Number(projectRecord.corridor_length_km) : null,
            total_area_required_ha:
              projectRecord?.total_area_required_ha != null ? Number(projectRecord.total_area_required_ha) : null,
            parcel_count: allParcels.length,
            village_count: allVillages.size,
          },
          villages: villagesList,
        },
        { status: 200 }
      )
    }

    /* -------------------------------------------------------------------------- */
    /* 5. LEVEL: VILLAGE                                                          */
    /* -------------------------------------------------------------------------- */
    if (level === 'village') {
      const pCodeParam = searchParams.get('project_code')
      const villageParam = searchParams.get('village') || searchParams.get('village_name')

      if (!pCodeParam || !pCodeParam.trim() || !villageParam || !villageParam.trim()) {
        return NextResponse.json(
          { success: false, error: 'Missing required parameter: project_code and village are required' },
          { status: 400 }
        )
      }

      const reqProjectCode = pCodeParam.trim()
      const reqVillage = villageParam.trim()

      const { data: parcels, error: parcelErr } = await db
        .from('land_parcels')
        .select(
          'id, parcel_number, parcel_no, survey_number, survey_no, khasra_no, khasra_number, village_name, taluka_name, tehsil, district, state, notified_area_sqm, affected_area_sqm, field_verification_status, possession_status, latitude, longitude'
        )
        .eq('project_code', reqProjectCode)
        .ilike('village_name', reqVillage)

      if (parcelErr) {
        console.error('[API /api/hierarchy] Error fetching village level:', parcelErr)
        return NextResponse.json(
          { success: false, error: 'Unable to load hierarchy data' },
          { status: 500 }
        )
      }

      if (!parcels || parcels.length === 0) {
        return NextResponse.json(
          { success: false, error: `Village '${reqVillage}' in project '${reqProjectCode}' not found.` },
          { status: 404 }
        )
      }

      const canonicalVillage = parcels[0].village_name || reqVillage
      const stateName = parcels[0].state || null
      const districtName = parcels[0].district || null

      const parcelsList = parcels.map((p: any) => ({
        id: p.id,
        parcel_number: p.parcel_number || p.parcel_no || null,
        survey_number: p.survey_number || p.survey_no || null,
        khasra_no: p.khasra_no || p.khasra_number || null,
        village_name: p.village_name,
        taluka_name: p.taluka_name || p.tehsil || null,
        district: p.district || null,
        state: p.state || null,
        notified_area_sqm: Number(p.notified_area_sqm || 0),
        affected_area_sqm: Number(p.affected_area_sqm || 0),
        verification_status: p.field_verification_status || 'Pending',
        possession_status: p.possession_status || 'Pending',
        latitude: p.latitude != null ? Number(p.latitude) : null,
        longitude: p.longitude != null ? Number(p.longitude) : null,
      }))

      return NextResponse.json(
        {
          success: true,
          level: 'village',
          project_code: reqProjectCode,
          village: canonicalVillage,
          state: stateName,
          district: districtName,
          parcels: parcelsList,
        },
        { status: 200 }
      )
    }

    /* -------------------------------------------------------------------------- */
    /* 6. LEVEL: PARCEL                                                           */
    /* -------------------------------------------------------------------------- */
    if (level === 'parcel') {
      const idParam = searchParams.get('id')
      if (!idParam || !idParam.trim()) {
        return NextResponse.json(
          { success: false, error: 'Missing required parameter: id' },
          { status: 400 }
        )
      }

      const trimmedId = idParam.trim()

      if (!UUID_REGEX.test(trimmedId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid id UUID format.' },
          { status: 400 }
        )
      }

      const { data: parcel, error: parcelErr } = await db
        .from('land_parcels')
        .select(
          'id, project_id, project_code, parcel_number, parcel_no, survey_number, survey_no, khasra_no, khasra_number, village_name, taluka_name, tehsil, district, state, notified_area_sqm, affected_area_sqm, field_verification_status, possession_status, latitude, longitude'
        )
        .eq('id', trimmedId)
        .maybeSingle()

      if (parcelErr) {
        console.error('[API /api/hierarchy] Error fetching parcel level:', parcelErr)
        return NextResponse.json(
          { success: false, error: 'Unable to load hierarchy data' },
          { status: 500 }
        )
      }

      if (!parcel) {
        return NextResponse.json(
          { success: false, error: 'Land parcel not found.' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        {
          success: true,
          level: 'parcel',
          parcel: {
            id: parcel.id,
            parcel_number: parcel.parcel_number || parcel.parcel_no || null,
            survey_number: parcel.survey_number || parcel.survey_no || null,
            project_id: parcel.project_id || null,
            project_code: parcel.project_code || null,
            village_name: parcel.village_name,
            taluka_name: parcel.taluka_name || parcel.tehsil || null,
            district: parcel.district || null,
            state: parcel.state || null,
            verification_status: parcel.field_verification_status || 'Pending',
            possession_status: parcel.possession_status || 'Pending',
            notified_area_sqm: Number(parcel.notified_area_sqm || 0),
            affected_area_sqm: Number(parcel.affected_area_sqm || 0),
            latitude: parcel.latitude != null ? Number(parcel.latitude) : null,
            longitude: parcel.longitude != null ? Number(parcel.longitude) : null,
          },
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Invalid hierarchy level' },
      { status: 400 }
    )
  } catch (err: any) {
    console.error('Unexpected error in GET /api/hierarchy:', err)
    return NextResponse.json(
      { success: false, error: 'Unable to load hierarchy data' },
      { status: 500 }
    )
  }
}
