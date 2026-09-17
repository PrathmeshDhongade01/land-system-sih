"use client";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, MapPin } from 'lucide-react';

const HIGHWAY_URL =
  process.env.NEXT_PUBLIC_HIGHWAY_GEOJSON_URL ||
  'https://udpruwshnzrqlhrslbsf.supabase.co/storage/v1/object/public/gis-files/national_highway.geojson';

const AFFECTED_ZONES_URL =
  process.env.NEXT_PUBLIC_ZONES_GEOJSON_URL ||
  'https://udpruwshnzrqlhrslbsf.supabase.co/storage/v1/object/public/gis-files/affected_zones.geojson';

const FALLBACK_HIGHWAY = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Delhi-Mumbai Expressway Corridor' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.020196, 28.4432555],
          [72.6871144, 26.2938593],
          [73.1029852, 22.2668551],
          [73.7895091, 19.3384071],
        ],
      },
    },
  ],
};

const FALLBACK_ZONES = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        zone_name: 'Northern Sector Corridor (Delhi–Rajasthan)',
        land_type: 'Agricultural / Semi-Urban',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.15, 28.50],
            [72.82, 26.36],
            [72.55, 26.22],
            [76.89, 28.38],
            [77.15, 28.50],
          ],
        ],
      },
    },
    {
      "type": "Feature",
      "properties": {
        "zone_name": "Central Sector Corridor (Rajasthan–Gujarat)",
        "land_type": "Mixed Agricultural & Industrial",
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [72.82, 26.36],
            [73.25, 22.32],
            [72.95, 22.21],
            [72.55, 26.22],
            [72.82, 26.36],
          ],
        ],
      },
    },
    {
      "type": "Feature",
      "properties": {
        "zone_name": "Southern Sector Corridor (Gujarat–Maharashtra)",
        "land_type": "Urban Periphery & Port Logistics",
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [73.25, 22.32],
            [73.94, 19.38],
            [73.64, 19.30],
            [72.95, 22.21],
            [73.25, 22.32],
          ],
        ],
      },
    },
  ],
};

export interface MapProps {
  conflictLocation?: { latitude: number; longitude: number; title?: string } | null
  projectGisUrl?: string | null
  projectName?: string | null
  projectCode?: string | null
}

/* Helper to fly to conflict centroid */
function FlyToConflict({ conflictLocation }: { conflictLocation?: { latitude: number; longitude: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (conflictLocation) {
      map.flyTo([conflictLocation.latitude, conflictLocation.longitude], 9, {
        duration: 1.5,
      })
    }
  }, [conflictLocation, map])
  return null
}

/* Helper to fit bounds to dynamic project GeoJSON boundary */
function AutoFitProjectBounds({ geoJsonData }: { geoJsonData: any }) {
  const map = useMap()
  useEffect(() => {
    if (!geoJsonData) return
    try {
      const leafletLib = (L as any).default || L
      if (leafletLib && (leafletLib.geoJSON || leafletLib.geoJson)) {
        const geoFn = leafletLib.geoJSON || leafletLib.geoJson
        const layer = geoFn(geoJsonData)
        const bounds = layer.getBounds()
        if (bounds && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13, animate: true })
        }
      }
    } catch (err) {
      console.warn('[Map] AutoFitProjectBounds error:', err)
    }
  }, [geoJsonData, map])
  return null
}

/* Helper to reset view to national default when switching to ALL or project without GIS */
function ResetNationalBounds({ active }: { active: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (active) {
      map.setView([24.0, 74.5], 6, { animate: true })
    }
  }, [active, map])
  return null
}

export default function Map({ conflictLocation, projectGisUrl, projectName, projectCode }: MapProps) {
  const [mounted, setMounted] = useState(false);
  const [highwayData, setHighwayData] = useState<any>(null);
  const [affectedZonesData, setAffectedZonesData] = useState<any>(null);

  // Project-specific GIS state
  const [projectGeoJson, setProjectGeoJson] = useState<any>(null);
  const [loadingProjectGis, setLoadingProjectGis] = useState(false);
  const [projectGisError, setProjectGisError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch national fallback layers
  useEffect(() => {
    async function fetchDefaultGeoJSON() {
      try {
        const [highwayRes, zonesRes] = await Promise.all([
          fetch(HIGHWAY_URL),
          fetch(AFFECTED_ZONES_URL),
        ]);

        if (highwayRes.ok) {
          const highwayJson = await highwayRes.json();
          setHighwayData(highwayJson);
        } else {
          setHighwayData(FALLBACK_HIGHWAY);
        }

        if (zonesRes.ok) {
          const zonesJson = await zonesRes.json();
          setAffectedZonesData(zonesJson);
        } else {
          setAffectedZonesData(FALLBACK_ZONES);
        }
      } catch (err) {
        console.error('Error fetching GeoJSON files from Supabase:', err);
        setHighwayData(FALLBACK_HIGHWAY);
        setAffectedZonesData(FALLBACK_ZONES);
      }
    }

    fetchDefaultGeoJSON();
  }, []);

  // Fetch project-specific GIS data when projectGisUrl changes
  useEffect(() => {
    if (!projectGisUrl) {
      setProjectGeoJson(null);
      setProjectGisError(null);
      setLoadingProjectGis(false);
      return;
    }

    const targetUrl = projectGisUrl;
    let isMounted = true;
    async function fetchProjectGis() {
      setLoadingProjectGis(true);
      setProjectGisError(null);
      try {
        const res = await fetch(targetUrl);
        if (!res.ok) {
          throw new Error(`Failed to load project GIS file (HTTP ${res.status})`);
        }
        const text = await res.text();
        let json: any = null;
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error('Project GIS file is not valid JSON/GeoJSON format.');
        }

        if (isMounted) {
          setProjectGeoJson(json);
        }
      } catch (err: any) {
        console.warn('[Map] Project GIS load warning:', err.message);
        if (isMounted) {
          setProjectGisError(err.message || 'Could not load project GIS boundary file.');
          setProjectGeoJson(null);
        }
      } finally {
        if (isMounted) {
          setLoadingProjectGis(false);
        }
      }
    }

    fetchProjectGis();

    return () => {
      isMounted = false;
    };
  }, [projectGisUrl]);

  if (!mounted) return null;

  const isProjectActive = Boolean(projectCode || projectName || projectGisUrl);

  return (
    <div className="relative w-full overflow-hidden rounded-lg shadow-md border border-border">
      {/* Map Status Overlay Bar */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 max-w-[90%] pointer-events-auto">
        {loadingProjectGis ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-900/85 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white shadow-md">
            <Loader2 className="size-3.5 animate-spin text-blue-400" />
            Loading project GIS data…
          </span>
        ) : projectGeoJson ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-900/90 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-emerald-100 shadow-md border border-emerald-700/50">
            <MapPin className="size-3.5 text-emerald-400" />
            Project Boundary: {projectCode ? `${projectCode} · ` : ''}{projectName || 'Active Project'}
          </span>
        ) : projectGisError ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-900/90 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-amber-100 shadow-md border border-amber-700/50">
            <AlertCircle className="size-3.5 text-amber-400" />
            No GIS boundary file uploaded for {projectCode || 'this project'} (Showing national view)
          </span>
        ) : isProjectActive ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-900/85 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-slate-200 shadow-md">
            <MapPin className="size-3.5 text-slate-400" />
            Project: {projectCode ? `${projectCode} · ` : ''}{projectName || 'Selected'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-900/85 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-slate-200 shadow-md">
            <MapPin className="size-3.5 text-amber-400" />
            National Corridor View (All Projects)
          </span>
        )}
      </div>

      <MapContainer
        key="nlams-main-map"
        center={conflictLocation ? [conflictLocation.latitude, conflictLocation.longitude] : [24.0, 74.5]}
        zoom={conflictLocation ? 9 : 6}
        scrollWheelZoom={false}
        className="h-96 w-full rounded-lg shadow-md z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FlyToConflict conflictLocation={conflictLocation} />
        <ResetNationalBounds active={!projectGeoJson && !conflictLocation} />

        {/* Dynamic Project GeoJSON Boundary Layer (rendered when project GIS is loaded) */}
        {projectGeoJson ? (
          <>
            <GeoJSON
              key={projectGisUrl || 'project-geojson-layer'}
              data={projectGeoJson}
              style={(feature: any) => {
                const props = feature?.properties || {}
                const geomType = feature?.geometry?.type
                if (props.layer_type === 'route' || geomType === 'LineString') {
                  return { color: '#dc2626', weight: 4, opacity: 0.95 }
                }
                if (props.layer_type === 'corridor') {
                  return { color: '#2563eb', weight: 1.5, fillColor: '#3b82f6', fillOpacity: 0.12, dashArray: '4, 4' }
                }
                if (props.layer_type === 'affected_area') {
                  return { color: '#059669', weight: 2, fillColor: '#10b981', fillOpacity: 0.65 }
                }
                if (props.layer_type === 'parcel') {
                  return { color: '#d97706', weight: 1.5, fillColor: '#f59e0b', fillOpacity: 0.2 }
                }
                return {
                  color: '#059669',
                  fillColor: '#10b981',
                  fillOpacity: 0.35,
                  weight: 3,
                }
              }}
              onEachFeature={(feature, layer) => {
                const props = feature.properties || {}
                const name = props.name || props.parcel_id || props.project_name || projectName || 'Project Acquisition Boundary'
                const isSynthetic = Boolean(props.is_synthetic)
                const isAffected = props.layer_type === 'affected_area'
                const isParcel = props.layer_type === 'parcel' || Boolean(props.parcel_id && !isAffected)

                let bodyHtml = ''
                if (props.parcel_id) {
                  bodyHtml += `<div><strong>Parcel ID:</strong> ${props.parcel_id}</div>`
                }
                if (props.village) {
                  bodyHtml += `<div><strong>Village:</strong> ${props.village}</div>`
                }
                if (props.total_area_ha !== undefined) {
                  bodyHtml += `<div><strong>Total Area:</strong> ${props.total_area_ha} Ha</div>`
                }
                if (props.affected_area_ha !== undefined) {
                  bodyHtml += `<div><strong>Affected Area:</strong> ${props.affected_area_ha} Ha (${props.affected_percentage ?? ''}%)</div>`
                }
                if (!bodyHtml) {
                  bodyHtml = `<div><strong>Project Code:</strong> ${projectCode || 'N/A'}</div>`
                }

                const badge = isSynthetic
                  ? '<span style="display: inline-block; margin-top: 8px; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px;">⚠️ Synthetic Prototype Geometry</span>'
                  : '<span style="display: inline-block; margin-top: 8px; background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px;">Official Project Acquisition Boundary</span>'

                const html = `
                  <div style="font-family: system-ui, sans-serif; font-size: 12px; padding: 4px; min-width: 200px;">
                    <strong style="color: ${isAffected ? '#047857' : isParcel ? '#b45309' : '#1e3a8a'}; font-size: 13px;">📍 ${name}</strong>
                    <div style="margin-top: 6px; display: grid; gap: 4px; color: #334155;">
                      ${bodyHtml}
                    </div>
                    ${badge}
                  </div>
                `
                layer.bindPopup(html)
              }}
            />
            <AutoFitProjectBounds geoJsonData={projectGeoJson} />
          </>
        ) : (
          /* National Fallback Layers (rendered when no project GIS is active) */
          <>
            {highwayData && (
              <GeoJSON
                data={highwayData}
                style={() => ({
                  color: '#ef4444',
                  weight: 4,
                  opacity: 0.9,
                })}
                onEachFeature={(feature, layer) => {
                  const name = feature.properties?.name || 'Delhi-Mumbai Expressway Alignment'
                  const html = `
                    <div style="font-family: system-ui, sans-serif; font-size: 12px; padding: 4px;">
                      <strong style="color: #dc2626; font-size: 13px;">🛣️ ${name}</strong>
                      <p style="margin: 4px 0 0 0; color: #475569;">60m Right of Way (RoW) Central Alignment Line</p>
                      <span style="display: inline-block; margin-top: 6px; background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px;">Status: Active Highway Survey Line</span>
                    </div>
                  `
                  layer.bindPopup(html)
                }}
              />
            )}

            {affectedZonesData && (
              <GeoJSON
                data={affectedZonesData}
                style={() => ({
                  color: '#2563eb',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.35,
                  weight: 1.5,
                })}
                onEachFeature={(feature, layer) => {
                  const props = feature.properties || {}
                  const zoneName = props.zone_name || props.zone || 'Affected Acquisition Sector'
                  const landType = props.land_type || 'Agricultural / Mixed'
                  const area = props.affected_area_ha ? `${props.affected_area_ha} Ha` : 'Notified Corridor'

                  const html = `
                    <div style="font-family: system-ui, sans-serif; font-size: 12px; padding: 4px; min-width: 180px;">
                      <strong style="color: #1e40af; font-size: 13px;">📍 ${zoneName}</strong>
                      <div style="margin-top: 6px; display: grid; gap: 4px; color: #334155;">
                        <div><strong>Land Classification:</strong> ${landType}</div>
                        <div><strong>Notified Area:</strong> ${area}</div>
                      </div>
                      <span style="display: inline-block; margin-top: 8px; background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px;">Section 11 Statutory Affected Zone</span>
                    </div>
                  `
                  layer.bindPopup(html)
                }}
              />
            )}
          </>
        )}

        {/* Conflict Centroid Marker */}
        {conflictLocation && (
          <CircleMarker
            center={[conflictLocation.latitude, conflictLocation.longitude]}
            radius={12}
            pathOptions={{
              color: '#991b1b',
              fillColor: '#ef4444',
              fillOpacity: 0.85,
              weight: 3,
            }}
          >
            <Popup>
              <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: '12px', padding: '4px' }}>
                <strong style={{ color: '#dc2626', fontSize: '13px' }}>⚠️ Potential Spatial Conflict</strong>
                <p style={{ margin: '4px 0', color: '#334155' }}>
                  {conflictLocation.title || 'Overlapping acquisition corridors detected.'}
                </p>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Centroid: {conflictLocation.latitude}, {conflictLocation.longitude}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}

