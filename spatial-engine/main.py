import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import geopandas as gpd

app = FastAPI(
    title="NLAMS Spatial Intersection Engine",
    description="Python GIS FastAPI engine for national highway land acquisition overlap & conflict calculations",
    version="2.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConflictDetectionRequest(BaseModel):
    project_code_a: str
    project_code_b: str

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "NLAMS Spatial Intersection Engine",
        "endpoints": ["/api/calculate-overlap", "/api/detect-conflicts", "/docs"]
    }

@app.get("/api/calculate-overlap")
def calculate_overlap():
    highway_url = "https://udpruwshnzrqlhrslbsf.supabase.co/storage/v1/object/public/gis-files/national_highway.geojson"
    zones_url = "https://udpruwshnzrqlhrslbsf.supabase.co/storage/v1/object/public/gis-files/affected_zones.geojson"
    
    # Local fallback paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    local_highway = os.path.join(base_dir, "lib", "national_highway.geojson")
    local_zones = os.path.join(base_dir, "lib", "affected_zones.geojson")

    highway = None
    zones = None

    # Try fetching remote files first
    try:
        highway = gpd.read_file(highway_url)
        zones = gpd.read_file(zones_url)
    except Exception as remote_err:
        print(f"Remote storage fetch notice: {remote_err}. Falling back to local GeoJSON datasets.")

    # Fallback to local files if remote fetch failed or returned empty
    if highway is None or len(highway) == 0:
        if os.path.exists(local_highway):
            highway = gpd.read_file(local_highway)
        else:
            raise FileNotFoundError("National highway GeoJSON file not found.")

    if zones is None or len(zones) == 0:
        if os.path.exists(local_zones):
            zones = gpd.read_file(local_zones)
        else:
            raise FileNotFoundError("Affected zones GeoJSON file not found.")

    try:
        # 1. Convert to metric coordinate system (EPSG:3857 measures in meters)
        highway = highway.to_crs(epsg=3857)
        zones = zones.to_crs(epsg=3857)
        
        # 2. Add a 30-meter buffer to the line to create a 60-meter wide highway corridor
        highway['geometry'] = highway.geometry.buffer(30)
        
        # 3. Calculate the intersection of the new corridor and the land zones
        intersection = gpd.overlay(zones, highway, how='intersection')
        
        # 4. Calculate the actual overlapping area in square meters
        total_affected_area = float(intersection.geometry.area.sum())
        
        return {
            "status": "success",
            "message": "Spatial analysis complete.",
            "affected_area_sqm": round(total_affected_area, 2),
            "intersecting_zones_count": len(intersection)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/detect-conflicts")
def detect_conflicts(req: ConflictDetectionRequest):
    code_a = (req.project_code_a or "").strip()
    code_b = (req.project_code_b or "").strip()

    if not code_a or not code_b:
        raise HTTPException(status_code=400, detail="Both project_code_a and project_code_b parameters are required.")

    if code_a.upper() == code_b.upper():
        raise HTTPException(status_code=400, detail="Cannot perform spatial conflict detection for a project against itself.")

    # Data file resolution
    curr_dir = os.path.dirname(os.path.abspath(__file__))
    primary_data = os.path.join(curr_dir, "data", "project_corridors.geojson")
    fallback_data = os.path.join(os.path.dirname(curr_dir), "lib", "project_corridors.geojson")

    target_file = primary_data if os.path.exists(primary_data) else fallback_data

    if not os.path.exists(target_file):
        raise HTTPException(status_code=500, detail="Project corridors GeoJSON dataset unavailable.")

    try:
        gdf = gpd.read_file(target_file)

        feat_a = gdf[gdf['project_code'].str.upper() == code_a.upper()]
        feat_b = gdf[gdf['project_code'].str.upper() == code_b.upper()]

        missing = []
        if len(feat_a) == 0:
            missing.append(code_a)
        if len(feat_b) == 0:
            missing.append(code_b)

        if missing:
            raise HTTPException(
                status_code=404,
                detail=f"Project corridor geometry not found for: {', '.join(missing)}"
            )

        # Reproject to metric CRS (EPSG:3857)
        feat_a_3857 = feat_a.to_crs(epsg=3857).copy()
        feat_b_3857 = feat_b.to_crs(epsg=3857).copy()

        # Buffer both project corridors by standard 30m (creating 60m corridor buffer)
        feat_a_3857['geometry'] = feat_a_3857.geometry.buffer(30)
        feat_b_3857['geometry'] = feat_b_3857.geometry.buffer(30)

        # Calculate geometric intersection
        intersection = gpd.overlay(feat_a_3857, feat_b_3857, how='intersection')

        total_area_sqm = float(intersection.geometry.area.sum()) if not intersection.empty else 0.0
        has_conflict = total_area_sqm > 0.0

        proj_a_name = str(feat_a.iloc[0].get('project_name') or code_a)
        proj_b_name = str(feat_b.iloc[0].get('project_name') or code_b)

        if has_conflict:
            overlap_area_sqm = round(total_area_sqm, 2)
            overlap_area_ha = round(total_area_sqm / 10000.0, 4)

            # Extract intersection centroid latitude / longitude (reproject back to EPSG:4326)
            union_geom = intersection.geometry.unary_union
            centroid_3857 = union_geom.centroid
            centroid_series = gpd.GeoSeries([centroid_3857], crs="EPSG:3857").to_crs(epsg=4326)
            centroid_pt = centroid_series.iloc[0]

            overlap_centroid = {
                "latitude": round(float(centroid_pt.y), 6),
                "longitude": round(float(centroid_pt.x), 6)
            }
            message = "Potential spatial conflict detected."
        else:
            overlap_area_sqm = 0.0
            overlap_area_ha = 0.0
            overlap_centroid = None
            message = "No spatial overlap detected."

        return {
            "status": "success",
            "conflict_detected": has_conflict,
            "project_a": {
                "project_code": code_a,
                "project_name": proj_a_name
            },
            "project_b": {
                "project_code": code_b,
                "project_name": proj_b_name
            },
            "overlap_area_sqm": overlap_area_sqm,
            "overlap_area_ha": overlap_area_ha,
            "overlap_centroid": overlap_centroid,
            "message": message
        }

    except HTTPException:
        raise
    except Exception as err:
        print(f"[FastAPI /api/detect-conflicts] Error performing spatial conflict analysis: {err}")
        raise HTTPException(status_code=500, detail="Internal server error during spatial conflict analysis.")