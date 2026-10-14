import os
import json
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from .models import (
    TravelProfile,
    RealityCheckRequest,
    RealityCheckResult,
    CompareRequest,
    CommunityReportCreate,
    CommunityReportUpdateStatus,
    AlternativeSuggestion
)
from .engine import evaluate_suitability, calculate_completeness_score, find_alternative_destinations
from .gemini_service import generate_gemini_reality_report
from .weather_service import fetch_destination_weather

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DESTINATIONS_FILE = DATA_DIR / "destinations.json"
REPORTS_FILE = DATA_DIR / "reports.json"
STATIC_DIR = BASE_DIR.parent / "static"

app = FastAPI(
    title="TravelReality AI",
    description="Evidence-grounded destination intelligence & personalized travel decision support - Know Before You Go.",
    version="1.0.0"
)

# Enable CORS for local testing and flex
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_destinations() -> List[Dict[str, Any]]:
    if not DESTINATIONS_FILE.exists():
        return []
    with open(DESTINATIONS_FILE, "r", encoding="utf-8") as f:
        destinations = json.load(f)
    # Ensure completeness scores are fresh
    for d in destinations:
        if "data_completeness_score" not in d:
            d["data_completeness_score"] = calculate_completeness_score(d)
    return destinations

def load_reports() -> List[Dict[str, Any]]:
    if not REPORTS_FILE.exists():
        return []
    with open(REPORTS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_reports(reports: List[Dict[str, Any]]) -> None:
    with open(REPORTS_FILE, "w", encoding="utf-8") as f:
        json.dump(reports, f, indent=2, ensure_ascii=False)

@app.get("/api/health")
def health_check():
    dests = load_destinations()
    reps = load_reports()
    return {
        "status": "healthy",
        "app_name": "TravelReality AI",
        "tagline": "Know Before You Go.",
        "destinations_count": len(dests),
        "reports_count": len(reps),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@app.get("/api/destinations")
def list_destinations(
    search: Optional[str] = None,
    category: Optional[str] = None,
    step_free_only: bool = False,
    max_walking_km: Optional[float] = None,
    sort_by: str = "default"
):
    """
    Search and filter destinations with factual attributes and completeness score.
    """
    destinations = load_destinations()
    results = destinations

    if search:
        s = search.lower().strip()
        results = [
            d for d in results
            if s in d.get("name", "").lower()
            or s in d.get("city", "").lower()
            or s in d.get("state", "").lower()
            or s in d.get("country", "").lower()
            or any(s in t.lower() for t in d.get("tags", []))
            or s in d.get("category", "").lower()
        ]

    if category and category != "All":
        results = [d for d in results if category.lower() in d.get("category", "").lower()]

    if step_free_only:
        results = [
            d for d in results
            if d.get("practical_info", {}).get("accessibility", {}).get("step_free_access") in ["Full", "Good"]
        ]

    if max_walking_km is not None and max_walking_km > 0:
        results = [
            d for d in results
            if d.get("practical_info", {}).get("walking_requirements", {}).get("estimated_distance_km", 99.0) <= max_walking_km
        ]

    # Sorting
    if sort_by == "name":
        results.sort(key=lambda x: x["name"])
    elif sort_by == "completeness":
        results.sort(key=lambda x: x.get("data_completeness_score", 0), reverse=True)
    elif sort_by == "duration_asc":
        results.sort(key=lambda x: x.get("practical_info", {}).get("visit_duration", {}).get("estimated_hours", 0))

    return {
        "total": len(results),
        "destinations": results
    }

@app.get("/api/destinations/{dest_id}")
def get_destination(dest_id: str):
    destinations = load_destinations()
    dest = next((d for d in destinations if d["id"] == dest_id), None)
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")
    return dest

@app.post("/api/reality-check", response_model=RealityCheckResult)
async def perform_reality_check(req: RealityCheckRequest):
    destinations = load_destinations()
    dest = next((d for d in destinations if d["id"] == req.destination_id), None)
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")

    # 1. Run Explainable Suitability Engine
    score, label, factors, matches, difficulties, verify_items = evaluate_suitability(dest, req.profile)

    # 2. Find Alternative Suggestions if there are difficulties or mismatches
    alternatives = find_alternative_destinations(req.destination_id, destinations, req.profile, score)

    # 3. Generate Gemini AI report or Deterministic fallback
    result = await generate_gemini_reality_report(
        dest=dest,
        profile=req.profile,
        suitability_score=score,
        suitability_label=label,
        factors=factors,
        matches=matches,
        difficulties=difficulties,
        verify_items=verify_items,
        alternatives=alternatives,
        api_key=req.gemini_api_key
    )

    return result

@app.post("/api/compare")
def compare_destinations(req: CompareRequest):
    if not req.destination_ids:
        raise HTTPException(status_code=400, detail="Provide at least 1 destination to compare")
    if len(req.destination_ids) > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 destinations can be compared side-by-side")

    destinations = load_destinations()
    selected = [d for d in destinations if d["id"] in req.destination_ids]

    if not selected:
        raise HTTPException(status_code=404, detail="None of the specified destinations were found")

    comparison_items = []
    for d in selected:
        score, label, factors, matches, difficulties, verify_items = evaluate_suitability(d, req.profile)
        p = d.get("practical_info", {})
        access = p.get("accessibility", {})
        walk = p.get("walking_requirements", {})
        duration = p.get("visit_duration", {})
        hours = p.get("opening_hours", {})
        fee = p.get("entry_fee", {})
        amenities = p.get("amenities", {})

        comparison_items.append({
            "id": d["id"],
            "name": d["name"],
            "city": f"{d['city']}, {d['country']}",
            "category": d["category"],
            "image_url": d["image_url"],
            "suitability_score": score,
            "suitability_label": label,
            "data_completeness": d.get("data_completeness_score", 90),
            "step_free_access": access.get("step_free_access", "Unverified"),
            "stairs_details": access.get("stairs", {}).get("details", "Not specified"),
            "elevators": "Available" if access.get("elevators", {}).get("available") else "None",
            "wheelchairs_on_site": "Yes" if access.get("wheelchairs", {}).get("available") else "No",
            "walking_distance_km": walk.get("estimated_distance_km", "Unknown"),
            "walking_intensity": walk.get("intensity", "Unknown"),
            "walking_surface": walk.get("surface", "Not specified"),
            "shuttle_transit": walk.get("shuttle_info", "None"),
            "duration_hours": duration.get("estimated_hours", "Unknown"),
            "schedule": hours.get("schedule", "Unknown"),
            "closed_days": ", ".join(hours.get("closed_days", ["None stated"])),
            "cost_domestic": fee.get("domestic", fee.get("temple_grounds_entry", fee.get("gardens_only", "Free/Varies"))),
            "parking": "Yes" if amenities.get("parking", {}).get("available") else "No",
            "restrooms": "Yes" if amenities.get("restrooms", {}).get("available") else "No",
            "accessible_restroom": "Yes" if amenities.get("restrooms", {}).get("accessible") else "No/Unverified",
            "top_match": matches[0] if matches else "Meets standard criteria",
            "top_difficulty": difficulties[0] if difficulties else "No major constraints identified",
            "source_provenance": hours.get("source", "Official Heritage Portal")
        })

    return {
        "count": len(comparison_items),
        "destinations": comparison_items,
        "active_profile": req.profile.dict() if req.profile else None
    }

@app.get("/api/weather/{dest_id}")
async def get_weather(dest_id: str, visit_date: Optional[str] = None):
    destinations = load_destinations()
    dest = next((d for d in destinations if d["id"] == dest_id), None)
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")

    coords = dest.get("coordinates", {})
    lat = coords.get("latitude")
    lon = coords.get("longitude")
    if lat is None or lon is None:
        raise HTTPException(status_code=400, detail="Destination lacks verified geographic coordinates")

    weather_data = await fetch_destination_weather(lat, lon, visit_date)
    return {
        "destination_id": dest_id,
        "destination_name": dest["name"],
        "coordinates": coords,
        "weather": weather_data
    }

@app.get("/api/reports")
def get_reports(
    destination_id: Optional[str] = None,
    status: Optional[str] = None
):
    """
    Returns community destination condition reports.
    Clearly distinguishes unverified from verified status.
    """
    reports = load_reports()
    if destination_id:
        reports = [r for r in reports if r.get("destination_id") == destination_id]
    if status and status != "all":
        reports = [r for r in reports if r.get("verification_status") == status]

    # Sort descending by reported date
    reports.sort(key=lambda x: x.get("reported_at", ""), reverse=True)
    return {
        "total": len(reports),
        "reports": reports
    }

@app.post("/api/reports")
def submit_community_report(report_in: CommunityReportCreate):
    """
    User submits a community observation.
    Saved initially as 'unverified'. Does not fabricate or overwrite verified facts.
    """
    destinations = load_destinations()
    dest = next((d for d in destinations if d["id"] == report_in.destination_id), None)
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")

    reports = load_reports()
    new_report = {
        "id": f"rep-{uuid.uuid4().hex[:6]}",
        "destination_id": dest["id"],
        "destination_name": dest["name"],
        "category": report_in.category,
        "title": report_in.title.strip(),
        "description": report_in.description.strip(),
        "reported_at": datetime.utcnow().isoformat() + "Z",
        "reported_by": report_in.reported_by or "Anonymous Traveler",
        "verification_status": "unverified",
        "admin_notes": "Submitted via Community Portal. Pending verification."
    }

    reports.insert(0, new_report)
    save_reports(reports)
    return {
        "message": "Community condition report submitted. Marked as 'unverified' until reviewed.",
        "report": new_report
    }

@app.patch("/api/reports/{report_id}/status")
def update_report_status(report_id: str, payload: CommunityReportUpdateStatus):
    """
    Admin moderation workflow: verify, reject, or mark under review.
    """
    reports = load_reports()
    report = next((r for r in reports if r["id"] == report_id), None)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    valid_statuses = ["unverified", "under_review", "verified", "rejected", "expired"]
    if payload.verification_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid_statuses}")

    report["verification_status"] = payload.verification_status
    if payload.admin_notes:
        report["admin_notes"] = payload.admin_notes
    report["last_moderated_at"] = datetime.utcnow().isoformat() + "Z"

    save_reports(reports)
    return {
        "message": f"Report {report_id} status updated to {payload.verification_status}",
        "report": report
    }

# Mount static files and SPA route
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

    @app.get("/")
    def serve_index():
        return FileResponse(STATIC_DIR / "index.html")
