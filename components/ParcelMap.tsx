'use client'

import { useEffect, useMemo } from 'react'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

export interface ParcelMapItem {
  id: string
  project_code: string | null
  parcel_number: string | null
  parcel_no?: string | null
  owner_name: string
  village_name: string
  survey_number: string | null
  survey_no?: string | null
  khasra_no?: string | null
  notified_area_sqm: number | null
  affected_area_sqm: number | null
  possession_status: string | null
  field_verification_status: string | null
  latitude: number | null
  longitude: number | null
}

interface ParcelMapProps {
  parcels: ParcelMapItem[]
  selectedParcelId: string | null
  onSelectParcel: (parcel: ParcelMapItem) => void
}

// 1. Helper to validate finite latitude / longitude coordinates
function isValidCoordinate(lat: number | null, lng: number | null): boolean {
  if (lat === null || lng === null) return false
  if (typeof lat !== 'number' || typeof lng !== 'number') return false
  if (!isFinite(lat) || !isFinite(lng)) return false
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

// 2. Custom Marker Icon Creator based on status and selection
function createParcelIcon(status: string | null, isSelected: boolean) {
  let bgColor = '#f59e0b' // Pending (Amber)
  let borderColor = '#b45309'
  let label = 'P'

  if (status === 'Verified') {
    bgColor = '#10b981' // Verified (Green)
    borderColor = '#047857'
    label = 'V'
  } else if (status === 'Needs Review') {
    bgColor = '#3b82f6' // Needs Review (Blue)
    borderColor = '#1d4ed8'
    label = 'R'
  }

  const size = isSelected ? 34 : 26
  const borderSize = isSelected ? 3 : 2
  const shadow = isSelected
    ? '0 0 0 4px rgba(37, 99, 235, 0.4), 0 6px 12px rgba(0, 0, 0, 0.3)'
    : '0 3px 6px rgba(0, 0, 0, 0.25)'

  const html = `
    <div style="
      background-color: ${bgColor};
      border: ${borderSize}px solid ${borderColor};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: ${isSelected ? '12px' : '10px'};
      font-family: system-ui, -apple-system, sans-serif;
      box-shadow: ${shadow};
      transition: transform 0.2s ease-in-out;
      cursor: pointer;
    ">
      ${label}
    </div>
  `

  return L.divIcon({
    className: 'custom-parcel-marker-icon',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// 3. Controller to handle map auto-fitting & camera transitions
function MapBoundsController({
  validParcels,
  selectedParcel,
}: {
  validParcels: ParcelMapItem[]
  selectedParcel: ParcelMapItem | undefined
}) {
  const map = useMap()

  useEffect(() => {
    if (selectedParcel && isValidCoordinate(selectedParcel.latitude, selectedParcel.longitude)) {
      map.flyTo([selectedParcel.latitude!, selectedParcel.longitude!], 13, { duration: 1.0 })
      return
    }

    if (validParcels.length > 0) {
      const bounds = L.latLngBounds(
        validParcels.map((p) => [p.latitude!, p.longitude!] as [number, number])
      )
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 })
    } else {
      map.setView([22.5, 78.5], 5)
    }
  }, [validParcels, selectedParcel, map])

  return null
}

export default function ParcelMap({ parcels, selectedParcelId, onSelectParcel }: ParcelMapProps) {
  // Filter parcels with valid finite coordinates
  const validParcels = useMemo(() => {
    return parcels.filter((p) => isValidCoordinate(p.latitude, p.longitude))
  }, [parcels])

  const selectedParcel = useMemo(() => {
    if (!selectedParcelId) return undefined
    return validParcels.find((p) => p.id === selectedParcelId)
  }, [validParcels, selectedParcelId])

  const initialCenter: [number, number] =
    validParcels.length > 0 && validParcels[0].latitude !== null && validParcels[0].longitude !== null
      ? [validParcels[0].latitude, validParcels[0].longitude]
      : [22.5, 78.5]

  return (
    <div className="relative w-full h-80 sm:h-96 rounded-lg overflow-hidden border border-border shadow-xs bg-card">
      <MapContainer
        center={initialCenter}
        zoom={6}
        scrollWheelZoom={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsController validParcels={validParcels} selectedParcel={selectedParcel} />

        {validParcels.map((parcel) => {
          const isSelected = parcel.id === selectedParcelId
          const icon = createParcelIcon(parcel.field_verification_status, isSelected)
          const parcelNo = parcel.parcel_number || parcel.parcel_no || 'N/A'

          return (
            <Marker
              key={parcel.id}
              position={[parcel.latitude!, parcel.longitude!]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectParcel(parcel),
              }}
            >
              <Popup className="custom-parcel-popup">
                <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: '12px', minWidth: '180px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '6px' }}>
                    📍 Parcel #{parcelNo}
                  </div>
                  <div style={{ display: 'grid', gap: '3px', color: '#334155' }}>
                    <div><strong>Owner:</strong> {parcel.owner_name}</div>
                    <div><strong>Village:</strong> {parcel.village_name}</div>
                    <div><strong>Project:</strong> {parcel.project_code || 'N/A'}</div>
                    <div><strong>Affected Area:</strong> {parcel.affected_area_sqm ? `${parcel.affected_area_sqm.toLocaleString()} m²` : '0 m²'}</div>
                    <div><strong>Possession:</strong> {parcel.possession_status || 'Pending'}</div>
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: '600',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor:
                          parcel.field_verification_status === 'Verified'
                            ? '#d1fae5'
                            : parcel.field_verification_status === 'Needs Review'
                            ? '#dbeafe'
                            : '#fef3c7',
                        color:
                          parcel.field_verification_status === 'Verified'
                            ? '#065f46'
                            : parcel.field_verification_status === 'Needs Review'
                            ? '#1e40af'
                            : '#92400e',
                      }}
                    >
                      {parcel.field_verification_status || 'Pending'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectParcel(parcel)}
                      style={{
                        marginLeft: 'auto',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#2563eb',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      View Details &rarr;
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Floating Map Legend Overlay */}
      <div className="absolute bottom-3 right-3 z-10 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-md p-2 shadow-md text-[11px] font-medium text-slate-700 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-emerald-500 border border-emerald-700 inline-block" />
          <span>Verified</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-amber-500 border border-amber-700 inline-block" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-blue-500 border border-blue-700 inline-block" />
          <span>Needs Review</span>
        </div>
      </div>
    </div>
  )
}
