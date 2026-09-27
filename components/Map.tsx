"use client";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useEffect, useState, useMemo } from 'react';
import { Loader2, AlertCircle, MapPin } from 'lucide-react';
import projectCorridorsGeoJson from '@/lib/project_corridors.json';

export const DEFAULT_PROJECT_CODE = 'SM-NASHIK-DEMO-01';
export const DEFAULT_PROJECT_NAME =
  'Mumbai–Nagpur Samruddhi Expressway — Nashik Corridor Demo';
export const DEFAULT_PROJECT_GIS_URL = '/gis/SM-NASHIK-DEMO-01.geojson';

// Samruddhi Mahamarg – Nashik Corridor (Sinnar segment) default coordinates & bounds
const SAMRUDDHI_NASHIK_CENTER: [number, number] = [19.8345, 73.9586];
const SAMRUDDHI_NASHIK_ZOOM = 11;
const SAMRUDDHI_NASHIK_BOUNDS: [[number, number], [number, number]] = [
  [19.768017, 73.782293],
  [19.901, 74.135],
];

const NATIONAL_CENTER: [number, number] = [24.0, 74.5];
const NATIONAL_ZOOM = 6;

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
            [77.15, 28.5],
            [72.82, 26.36],
            [72.55, 26.22],
            [76.89, 28.38],
            [77.15, 28.5],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        zone_name: 'Central Sector Corridor (Rajasthan–Gujarat)',
        land_type: 'Mixed Agricultural & Industrial',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
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
      type: 'Feature',
      properties: {
        zone_name: 'Southern Sector Corridor (Gujarat–Maharashtra)',
        land_type: 'Urban Periphery & Port Logistics',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [73.25, 22.32],
            [73.94, 19.38],
            [73.64, 19.3],
            [72.95, 22.21],
            [73.25, 22.32],
          ],
        ],
      },
    },
  ],
};

export interface MapProps {
  conflictLocation?: { latitude: number; longitude: number; title?: string } | null;
  projectGisUrl?: string | null;
  projectName?: string | null;
  projectCode?: string | null;
  parcels?: any[];
  isNationalView?: boolean;
  defaultProjectMissingFromDb?: boolean;
}

/* Helper to fly to conflict centroid */
function FlyToConflict({
  conflictLocation,
}: {
  conflictLocation?: { latitude: number; longitude: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (conflictLocation) {
      map.flyTo([conflictLocation.latitude, conflictLocation.longitude], 9, {
        duration: 1.5,
      });
    }
  }, [conflictLocation, map]);
  return null;
}

/* Helper to fit bounds to dynamic project GeoJSON boundary or initial Samruddhi corridor */
function AutoFitProjectBounds({
  geoJsonData,
  isSamruddhiDefault,
  isNational,
}: {
  geoJsonData: any;
  isSamruddhiDefault: boolean;
  isNational: boolean;
}) {
  const map = useMap();

  // Immediately fit to Samruddhi Nashik corridor bounds when active so it never flashes an unrelated location
  useEffect(() => {
    if (isNational) return;
    if (isSamruddhiDefault && !geoJsonData) {
      try {
        map.fitBounds(SAMRUDDHI_NASHIK_BOUNDS, {
          padding: [28, 28],
          maxZoom: 13,
          animate: false,
        });
      } catch (err) {
        console.warn('[Map] Initial Samruddhi fitBounds error:', err);
      }
    }
  }, [isSamruddhiDefault, isNational, geoJsonData, map]);

  useEffect(() => {
    if (!geoJsonData || isNational) return;
    try {
      const leafletLib = (L as any).default || L;
      if (leafletLib && (leafletLib.geoJSON || leafletLib.geoJson)) {
        const geoFn = leafletLib.geoJSON || leafletLib.geoJson;
        const layer = geoFn(geoJsonData);
        const bounds = layer.getBounds();
        if (bounds && bounds.isValid()) {
          map.fitBounds(bounds, {
            padding: [28, 28],
            maxZoom: 13,
            animate: !isSamruddhiDefault,
          });
        }
      }
    } catch (err) {
      console.warn('[Map] AutoFitProjectBounds error:', err);
    }
  }, [geoJsonData, isSamruddhiDefault, isNational, map]);

  return null;
}

/* Helper to reset view to national default ONLY when user explicitly switches to National View (ALL) */
function ResetNationalBounds({ active }: { active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (active) {
      map.setView(NATIONAL_CENTER, NATIONAL_ZOOM, { animate: true });
    }
  }, [active, map]);
  return null;
}

export default function Map({
  conflictLocation,
  projectGisUrl,
  projectName,
  projectCode,
  parcels = [],
  isNationalView = false,
  defaultProjectMissingFromDb = false,
}: MapProps) {
  const [mounted, setMounted] = useState(false);
  const [highwayData, setHighwayData] = useState<any>(null);
  const [affectedZonesData, setAffectedZonesData] = useState<any>(null);

  // Determine whether National View ('ALL') was explicitly selected
  const isExplicitNationalView =
    isNationalView || projectCode === 'ALL';

  // Resolve effective project code, name, and GIS URL (defaulting to SM-NASHIK-DEMO-01)
  const effectiveProjectCode = isExplicitNationalView
    ? null
    : projectCode || DEFAULT_PROJECT_CODE;

  const isSamruddhiProject = effectiveProjectCode === DEFAULT_PROJECT_CODE;

  const effectiveProjectName = isExplicitNationalView
    ? null
    : projectName ||
      (isSamruddhiProject ? DEFAULT_PROJECT_NAME : effectiveProjectCode);

  const effectiveGisUrl = isExplicitNationalView
    ? null
    : projectGisUrl ||
      (isSamruddhiProject ? DEFAULT_PROJECT_GIS_URL : null);

  // Project-specific GIS state
  const [projectGeoJson, setProjectGeoJson] = useState<any>(null);
  const [loadingProjectGis, setLoadingProjectGis] = useState<boolean>(
    Boolean(effectiveGisUrl)
  );
  const [projectGisError, setProjectGisError] = useState<string | null>(null);

  // Build lookup of live parcels by parcel_number / parcel_no / id
  const parcelLookup = useMemo(() => {
    const map = new globalThis.Map<string, any>();
    for (const p of parcels || []) {
      if (p?.parcel_number) map.set(String(p.parcel_number).trim(), p);
      if (p?.parcel_no) map.set(String(p.parcel_no).trim(), p);
      if (p?.id) map.set(String(p.id).trim(), p);
    }
    return map;
  }, [parcels]);

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

  // Fetch project-specific GIS data when effectiveGisUrl or effectiveProjectCode changes
  useEffect(() => {
    if (isExplicitNationalView) {
      setProjectGeoJson(null);
      setProjectGisError(null);
      setLoadingProjectGis(false);
      return;
    }

    if (!effectiveGisUrl) {
      // Check if lib/project_corridors.geojson has a corridor feature for this projectCode
      if (effectiveProjectCode && projectCorridorsGeoJson?.features) {
        const matchingFeatures = projectCorridorsGeoJson.features.filter(
          (f: any) => f.properties?.project_code === effectiveProjectCode
        );
        if (matchingFeatures.length > 0) {
          setProjectGeoJson({
            type: 'FeatureCollection',
            features: matchingFeatures,
          });
          setProjectGisError(null);
          setLoadingProjectGis(false);
          return;
        }
      }
      setProjectGeoJson(null);
      setProjectGisError(null);
      setLoadingProjectGis(false);
      return;
    }

    const targetUrl = effectiveGisUrl;
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
          setProjectGisError(
            err.message || 'Could not load project GIS boundary file.'
          );
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
  }, [effectiveGisUrl, effectiveProjectCode, isExplicitNationalView]);

  if (!mounted) {
    return (
      <div className="relative flex h-96 min-h-[400px] w-full items-center justify-center rounded-lg border border-border bg-slate-900/5">
        <div className="flex items-center gap-2 rounded-md bg-slate-900/90 px-4 py-2 text-xs font-medium text-white shadow-md">
          <Loader2 className="size-4 animate-spin text-emerald-400" />
          <span>Initializing GIS Corridor Map (Samruddhi Mahamarg – Nashik)…</span>
        </div>
      </div>
    );
  }

  const initialCenter: [number, number] = conflictLocation
    ? [conflictLocation.latitude, conflictLocation.longitude]
    : isExplicitNationalView
      ? NATIONAL_CENTER
      : SAMRUDDHI_NASHIK_CENTER;

  const initialZoom = conflictLocation
    ? 9
    : isExplicitNationalView
      ? NATIONAL_ZOOM
      : SAMRUDDHI_NASHIK_ZOOM;

  return (
    <div className="relative w-full h-full min-h-[400px] overflow-hidden rounded-lg shadow-md border border-border">
      {/* Project Boundary Overlay Banner (Matches Reference UI) */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-[92%] z-[1000] flex flex-col gap-1.5 pointer-events-auto">
        {!isExplicitNationalView ? (
          <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-900/95 backdrop-blur-sm px-3.5 py-2 text-xs sm:text-[13px] font-semibold text-white shadow-lg border border-emerald-700/70">
            <MapPin className="size-4 text-emerald-400 shrink-0" />
            <span className="leading-snug">
              Project Boundary:{' '}
              {effectiveProjectCode ? `${effectiveProjectCode} · ` : ''}
              {effectiveProjectName || DEFAULT_PROJECT_NAME}
            </span>
            {loadingProjectGis && (
              <Loader2 className="ml-1.5 size-3.5 animate-spin text-emerald-300 shrink-0" />
            )}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-lg bg-slate-900/90 backdrop-blur-sm px-3.5 py-2 text-xs font-semibold text-slate-100 shadow-lg border border-slate-700">
            <MapPin className="size-4 text-amber-400 shrink-0" />
            <span>National Corridor View (All Projects)</span>
          </div>
        )}

        {defaultProjectMissingFromDb && isSamruddhiProject && (
          <div className="inline-flex items-center gap-1.5 self-start rounded-md bg-amber-950/90 backdrop-blur-sm px-2.5 py-1 text-[11px] font-medium text-amber-200 border border-amber-700/60 shadow-sm">
            <AlertCircle className="size-3 text-amber-400 shrink-0" />
            <span>
              Live DB record for {DEFAULT_PROJECT_CODE} not found · Showing verified GIS corridor overlay
            </span>
          </div>
        )}

        {projectGisError && !projectGeoJson && (
          <div className="inline-flex items-center gap-1.5 self-start rounded-md bg-amber-900/90 backdrop-blur-sm px-2.5 py-1 text-[11px] font-medium text-amber-100 border border-amber-700/60 shadow-sm">
            <AlertCircle className="size-3.5 text-amber-400 shrink-0" />
            <span>
              No custom GIS file for {effectiveProjectCode || 'project'} (Showing available corridor view)
            </span>
          </div>
        )}
      </div>

      <MapContainer
        key="nlams-main-map"
        center={initialCenter}
        zoom={initialZoom}
        scrollWheelZoom={false}
        className="h-96 min-h-[400px] w-full rounded-lg shadow-md z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FlyToConflict conflictLocation={conflictLocation} />
        <AutoFitProjectBounds
          geoJsonData={projectGeoJson}
          isSamruddhiDefault={isSamruddhiProject}
          isNational={isExplicitNationalView}
        />
        <ResetNationalBounds
          active={isExplicitNationalView && !conflictLocation}
        />

        {/* Dynamic Project GeoJSON Boundary Layer (rendered when project GIS is loaded) */}
        {projectGeoJson ? (
          <GeoJSON
            key={`${effectiveProjectCode || 'project'}-${effectiveGisUrl || 'corridor'}-${parcelLookup.size}`}
            data={projectGeoJson}
            style={(feature: any) => {
              const props = feature?.properties || {};
              const geomType = feature?.geometry?.type;
              if (props.layer_type === 'route' || geomType === 'LineString') {
                return { color: '#dc2626', weight: 4, opacity: 0.95 };
              }
              if (props.layer_type === 'corridor') {
                return {
                  color: '#2563eb',
                  weight: 1.5,
                  fillColor: '#3b82f6',
                  fillOpacity: 0.12,
                  dashArray: '4, 4',
                };
              }
              if (props.layer_type === 'affected_area') {
                return {
                  color: '#059669',
                  weight: 2,
                  fillColor: '#10b981',
                  fillOpacity: 0.65,
                };
              }
              if (props.layer_type === 'parcel') {
                const liveParcel = props.parcel_id
                  ? parcelLookup.get(String(props.parcel_id).trim())
                  : null;
                const livePossession =
                  liveParcel?.possession_status || props.possession_status || '';
                const isAcquired = [
                  'Possessed',
                  'Possession Taken',
                  'Acquired',
                  'Completed',
                ].includes(livePossession);
                if (isAcquired) {
                  return {
                    color: '#059669',
                    weight: 1.8,
                    fillColor: '#10b981',
                    fillOpacity: 0.45,
                  };
                }
                return {
                  color: '#d97706',
                  weight: 1.5,
                  fillColor: '#f59e0b',
                  fillOpacity: 0.22,
                };
              }
              return {
                color: '#059669',
                fillColor: '#10b981',
                fillOpacity: 0.35,
                weight: 3,
              };
            }}
            onEachFeature={(feature, layer) => {
              const props = feature.properties || {};
              const liveParcel = props.parcel_id
                ? parcelLookup.get(String(props.parcel_id).trim())
                : null;
              const name =
                props.name ||
                props.parcel_id ||
                props.project_name ||
                effectiveProjectName ||
                'Project Acquisition Boundary';
              const type = props.project_type || 'Land Acquisition Zone';
              const isSynthetic = Boolean(props.is_synthetic);
              const isAffected = props.layer_type === 'affected_area';
              const isParcel =
                props.layer_type === 'parcel' ||
                Boolean(props.parcel_id && !isAffected);

              let bodyHtml = '';
              if (props.parcel_id) {
                bodyHtml += `<div><strong>Parcel ID:</strong> ${props.parcel_id}</div>`;
              }
              if (liveParcel?.owner_name || props.owner_name) {
                bodyHtml += `<div><strong>Owner:</strong> ${liveParcel?.owner_name || props.owner_name}</div>`;
              }
              if (liveParcel?.village_name || props.village) {
                bodyHtml += `<div><strong>Village:</strong> ${liveParcel?.village_name || props.village}</div>`;
              }
              if (liveParcel?.possession_status) {
                bodyHtml += `<div><strong>Status:</strong> ${liveParcel.possession_status}</div>`;
              }
              if (liveParcel?.field_verification_status) {
                bodyHtml += `<div><strong>Verification:</strong> ${liveParcel.field_verification_status}</div>`;
              }
              if (props.total_area_ha !== undefined) {
                bodyHtml += `<div><strong>Total Area:</strong> ${props.total_area_ha} Ha</div>`;
              }
              if (props.affected_area_ha !== undefined) {
                bodyHtml += `<div><strong>Affected Area:</strong> ${props.affected_area_ha} Ha (${props.affected_percentage ?? ''}%)</div>`;
              }
              if (!bodyHtml) {
                bodyHtml = `<div><strong>Project Code:</strong> ${effectiveProjectCode || 'N/A'}</div><div><strong>Type:</strong> ${type}</div>`;
              }

              const badge = isSynthetic
                ? '<span style="display: inline-block; margin-top: 8px; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px;">⚠️ Synthetic Prototype Geometry</span>'
                : '<span style="display: inline-block; margin-top: 8px; background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px;">Official Project Acquisition Boundary</span>';

              const html = `
                <div style="font-family: system-ui, sans-serif; font-size: 12px; padding: 4px; min-width: 200px;">
                  <strong style="color: ${isAffected ? '#047857' : isParcel ? '#b45309' : '#1e3a8a'}; font-size: 13px;">📍 ${name}</strong>
                  <div style="margin-top: 6px; display: grid; gap: 4px; color: #334155;">
                    ${bodyHtml}
                  </div>
                  ${badge}
                </div>
              `;
              layer.bindPopup(html);
            }}
          />
        ) : isExplicitNationalView ? (
          /* National Fallback Layers (rendered ONLY when National View is active) */
          <>
            {highwayData && (
              <GeoJSON
                data={highwayData}
                style={() => ({
                  color: '#ef4444',
                  weight: 5,
                })}
                onEachFeature={(feature, layer) => {
                  const name =
                    feature.properties?.name || 'Highway Corridor';
                  layer.bindPopup(
                    `<div class="font-sans text-xs"><strong>${name}</strong><br/>Primary National Highway Alignment</div>`
                  );
                }}
              />
            )}

            {affectedZonesData && (
              <GeoJSON
                data={affectedZonesData}
                style={() => ({
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.35,
                  weight: 2,
                })}
                onEachFeature={(feature, layer) => {
                  const props = feature.properties || {};
                  const name =
                    props.zone_name ||
                    props.name ||
                    'Affected Acquisition Zone';
                  const type = props.land_type || 'Mixed Revenue Land';
                  layer.bindPopup(
                    `<div class="font-sans text-xs"><strong>${name}</strong><br/>Land Type: ${type}</div>`
                  );
                }}
              />
            )}
          </>
        ) : null}

        {/* Conflict Centroid Marker */}
        {conflictLocation && (
          <CircleMarker
            center={[conflictLocation.latitude, conflictLocation.longitude]}
            radius={12}
            pathOptions={{
              color: '#dc2626',
              fillColor: '#ef4444',
              fillOpacity: 0.85,
              weight: 3,
            }}
          >
            <Popup>
              <div className="font-sans text-xs p-1">
                <strong className="text-red-700 block mb-1">
                  ⚠️ Spatial Corridor Conflict Detected
                </strong>
                <span>
                  {conflictLocation.title ||
                    'Overlapping project boundaries detected at this coordinate.'}
                </span>
                <br />
                <span className="font-mono text-[10px] text-slate-500">
                  Lat: {conflictLocation.latitude.toFixed(5)}, Lng:{' '}
                  {conflictLocation.longitude.toFixed(5)}
                </span>
              </div>
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}
