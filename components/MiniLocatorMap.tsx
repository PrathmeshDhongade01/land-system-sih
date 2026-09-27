'use client'

import { useEffect } from 'react'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

interface MiniLocatorMapProps {
  latitude: number
  longitude: number
  parcelNumber?: string
  villageName?: string
}

function CenterMapController({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], 15)
  }, [lat, lng, map])
  return null
}

const pinIcon = L.divIcon({
  className: 'mini-parcel-pin',
  html: `
    <div style="
      background-color: #2563eb;
      border: 2px solid white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 11px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    ">
      📍
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

export default function MiniLocatorMap({
  latitude,
  longitude,
  parcelNumber,
  villageName,
}: MiniLocatorMapProps) {
  return (
    <div className="w-full h-48 rounded-lg overflow-hidden border border-border bg-card shadow-2xs relative">
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CenterMapController lat={latitude} lng={longitude} />
        <Marker position={[latitude, longitude]} icon={pinIcon}>
          <Popup>
            <div className="text-xs p-1 font-sans">
              <strong>Parcel #{parcelNumber || 'N/A'}</strong>
              {villageName && <div className="text-slate-500">{villageName}</div>}
              <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}
