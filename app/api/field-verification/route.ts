import { NextResponse } from 'next/server'
import { getAuthenticatedUserWithProfile, createServiceRoleClient } from '@/lib/supabase/server'
import { evaluateParcelAlerts } from '@/lib/alerts/engine'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALLOWED_VERIFICATION_STATUSES = new Set(['Verified', 'Needs Review'])
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(request: Request) {
  const uploadedStoragePaths: string[] = []
  const insertedEvidenceIds: string[] = []
  let dbClient: any = null

  try {
    const authRes = await getAuthenticatedUserWithProfile(request)
    if (authRes.status !== 200 || !authRes.profile) {
      return NextResponse.json(
        { success: false, error: authRes.error || 'Authentication required' },
        { status: authRes.status }
      )
    }

    const ALLOWED_ROLES = new Set(['Admin', 'SLAO', 'CALA', 'MoRTH Nodal Officer', 'Field Officer'])
    if (!ALLOWED_ROLES.has(authRes.profile.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid multipart form data in request body.' },
        { status: 400 }
      )
    }

    const parcel_id = formData.get('parcel_id')
    if (!parcel_id || typeof parcel_id !== 'string' || !UUID_REGEX.test(parcel_id.trim())) {
      return NextResponse.json(
        { success: false, error: 'Valid parcel_id UUID is required.' },
        { status: 400 }
      )
    }

    const trimmedParcelId = parcel_id.trim()
    dbClient = createServiceRoleClient() || authRes.supabase

    // 1. Verify Parcel Exists
    const { data: existingParcel, error: parcelErr } = await dbClient
      .from('land_parcels')
      .select('id, survey_number, parcel_number, field_remarks, land_type, possession_status')
      .eq('id', trimmedParcelId)
      .maybeSingle()

    if (parcelErr || !existingParcel) {
      return NextResponse.json(
        { success: false, error: 'Land parcel not found.' },
        { status: 404 }
      )
    }

    // 2. For Field Officer, verify active parcel assignment
    if (authRes.profile.role === 'Field Officer') {
      const { data: assignment, error: assignErr } = await dbClient
        .from('parcel_assignments')
        .select('id')
        .eq('parcel_id', trimmedParcelId)
        .eq('assigned_officer_id', authRes.user.id)
        .eq('status', 'Active')
        .maybeSingle()

      if (assignErr || !assignment) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: This parcel is not actively assigned to you.' },
          { status: 403 }
        )
      }
    }

    // 3. Validate Status (exact canonical database values)
    const rawStatus = (formData.get('status') as string) || 'Verified'
    const statusVal = rawStatus.trim()
    if (!ALLOWED_VERIFICATION_STATUSES.has(statusVal)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Must be one of: ${Array.from(ALLOWED_VERIFICATION_STATUSES).join(', ')}`,
        },
        { status: 400 }
      )
    }

    // 4. Parse GPS Data
    let capturedLatitude: number | null = null
    let capturedLongitude: number | null = null
    let capturedAccuracyM: number | null = null

    const rawLat = formData.get('captured_latitude')
    const rawLng = formData.get('captured_longitude')
    const rawAcc = formData.get('captured_accuracy_m')

    if (rawLat) {
      const lat = Number(rawLat)
      if (isFinite(lat) && lat >= -90 && lat <= 90) capturedLatitude = lat
    }
    if (rawLng) {
      const lng = Number(rawLng)
      if (isFinite(lng) && lng >= -180 && lng <= 180) capturedLongitude = lng
    }
    if (rawAcc) {
      const acc = Number(rawAcc)
      if (isFinite(acc) && acc >= 0) capturedAccuracyM = acc
    }

    // 5. Parse Observations
    const landUse = (formData.get('land_use') as string)?.trim() || existingParcel.land_type
    const boundaryCondition = (formData.get('boundary_condition') as string)?.trim() || 'Identified'
    const possessionStatus = (formData.get('possession_status') as string)?.trim() || existingParcel.possession_status
    const encroachment = (formData.get('encroachment') as string)?.trim() || 'None'
    const officerRemarks = (formData.get('remarks') as string)?.trim() || ''

    // Ensure bucket exists
    try {
      if (dbClient.storage) {
        await dbClient.storage.createBucket('field-evidence', { public: false })
      }
    } catch {}

    const userEmail = authRes.profile.email || authRes.user?.email || 'authenticated_officer'

    // 6. Process Evidence Photographs (tracked for compensation)
    const photosCount = parseInt((formData.get('photos_count') as string) || '0', 10)
    const evidenceRecords: any[] = []

    for (let i = 0; i < photosCount; i++) {
      const photoFile = formData.get(`photo_${i}`)
      if (photoFile && photoFile instanceof File && photoFile.size > 0) {
        if (photoFile.size > MAX_FILE_SIZE_BYTES) {
          throw new Error(`Photo ${i + 1} exceeds maximum allowed limit of 10 MB.`)
        }

        const category = (formData.get(`photo_${i}_category`) as string)?.trim() || 'Field Photograph'
        const desc = (formData.get(`photo_${i}_description`) as string)?.trim() || ''
        const fullDesc = `[Category: ${category}] ${desc}`.trim()

        const sanitizedName = photoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const fileExt = sanitizedName.includes('.') ? sanitizedName.split('.').pop() : 'jpg'
        const storagePath = `parcels/${trimmedParcelId}/${Date.now()}_${i}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`

        const buffer = Buffer.from(await photoFile.arrayBuffer())
        const { error: uploadErr } = await dbClient.storage
          .from('field-evidence')
          .upload(storagePath, buffer, {
            contentType: photoFile.type || 'image/jpeg',
            upsert: false,
          })

        if (uploadErr) {
          throw new Error(`Failed to upload photo ${i + 1}: ${uploadErr.message}`)
        }

        uploadedStoragePaths.push(storagePath)

        const metaRecord = {
          parcel_id: trimmedParcelId,
          file_name: photoFile.name,
          storage_path: storagePath,
          file_type: photoFile.type || 'image/jpeg',
          file_size_bytes: photoFile.size,
          uploaded_by: authRes.user.id,
          uploaded_by_email: userEmail,
          description: fullDesc,
          captured_latitude: capturedLatitude,
          captured_longitude: capturedLongitude,
          captured_accuracy_m: capturedAccuracyM,
        }

        const { data: inserted, error: insertErr } = await dbClient
          .from('field_evidence')
          .insert([metaRecord])
          .select('id')

        if (insertErr || !inserted || inserted.length === 0) {
          throw new Error(`Failed to record metadata for photo ${i + 1}: ${insertErr?.message || 'Insert error'}`)
        }

        insertedEvidenceIds.push(inserted[0].id)
        evidenceRecords.push({ ...metaRecord, id: inserted[0].id })
      }
    }

    // 7. Process Officer Signature (if provided)
    const signatureFile = formData.get('signature_file')
    if (signatureFile && signatureFile instanceof File && signatureFile.size > 0) {
      const sigPath = `parcels/${trimmedParcelId}/signature_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`
      const sigBuffer = Buffer.from(await signatureFile.arrayBuffer())
      const { error: sigUploadErr } = await dbClient.storage
        .from('field-evidence')
        .upload(sigPath, sigBuffer, {
          contentType: 'image/png',
          upsert: false,
        })

      if (!sigUploadErr) {
        uploadedStoragePaths.push(sigPath)
        const sigMeta = {
          parcel_id: trimmedParcelId,
          file_name: 'officer_signature.png',
          storage_path: sigPath,
          file_type: 'image/png',
          file_size_bytes: signatureFile.size,
          uploaded_by: authRes.user.id,
          uploaded_by_email: userEmail,
          description: `Officer Signature — Field Verification — Survey ${existingParcel.survey_number || trimmedParcelId}`,
          captured_latitude: capturedLatitude,
          captured_longitude: capturedLongitude,
          captured_accuracy_m: capturedAccuracyM,
        }

        const { data: sigInserted, error: sigMetaErr } = await dbClient
          .from('field_evidence')
          .insert([sigMeta])
          .select('id')

        if (!sigMetaErr && sigInserted && sigInserted.length > 0) {
          insertedEvidenceIds.push(sigInserted[0].id)
        }
      }
    }

    // 8. Construct Preserved Structured Remarks
    const priorRemarks = existingParcel.field_remarks ? existingParcel.field_remarks.trim() : ''
    const newStructuredRemarks = [
      `Boundary Condition: ${boundaryCondition}`,
      `Encroachment: ${encroachment}`,
      `Officer Remarks: ${officerRemarks || 'Inspection completed on site.'}`,
    ].join('\n')

    const finalRemarks = priorRemarks && !newStructuredRemarks.includes(priorRemarks)
      ? `${newStructuredRemarks}\n[Prior Note: ${priorRemarks}]`
      : newStructuredRemarks

    // 9. Update Land Parcel
    const now = new Date().toISOString()
    const parcelUpdates: Record<string, any> = {
      field_verification_status: statusVal,
      field_verified_at: now,
      field_verified_by: userEmail,
      land_type: landUse,
      possession_status: possessionStatus,
      field_remarks: finalRemarks,
      updated_at: now,
    }

    const { data: updatedParcel, error: parcelUpdateErr } = await dbClient
      .from('land_parcels')
      .update(parcelUpdates)
      .eq('id', trimmedParcelId)
      .select()

    if (parcelUpdateErr || !updatedParcel || updatedParcel.length === 0) {
      throw new Error(`Failed to update parcel status: ${parcelUpdateErr?.message || 'Update error'}`)
    }

    // 10. Record In-App Success Notification
    try {
      await dbClient.from('notifications').insert([
        {
          user_id: authRes.user.id,
          title: 'Field Verification Submitted',
          message: `Verification for Survey ${existingParcel.survey_number || trimmedParcelId} submitted as "${statusVal}".`,
          type: 'SUCCESS',
          link_url: `/parcels/${trimmedParcelId}`,
          is_read: false,
        },
      ])
    } catch {}

    // Safe non-blocking alert evaluation
    try {
      await evaluateParcelAlerts(trimmedParcelId)
    } catch {}

    return NextResponse.json(
      {
        success: true,
        message: 'Field verification submitted successfully.',
        data: {
          parcel: updatedParcel[0],
          evidence_count: evidenceRecords.length,
          status: statusVal,
          submitted_at: now,
        },
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('Field verification error (initiating compensation):', err)

    // Compensation: cleanup any files uploaded or metadata inserted before error
    if (dbClient) {
      try {
        if (uploadedStoragePaths.length > 0) {
          console.log('Compensating: removing uploaded files:', uploadedStoragePaths)
          await dbClient.storage.from('field-evidence').remove(uploadedStoragePaths)
        }
        if (insertedEvidenceIds.length > 0) {
          console.log('Compensating: removing inserted evidence records:', insertedEvidenceIds)
          await dbClient.from('field_evidence').delete().in('id', insertedEvidenceIds)
        }
      } catch (compensationErr) {
        console.error('Compensation cleanup failed:', compensationErr)
      }
    }

    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to submit field verification.' },
      { status: 500 }
    )
  }
}
