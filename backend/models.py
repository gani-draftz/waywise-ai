from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class TravelProfile(BaseModel):
    region_or_destination: Optional[str] = None
    visit_date: Optional[str] = None
    available_time_hours: Optional[float] = 3.0
    budget_tier: Optional[str] = "Moderate" # "Budget", "Moderate", "Premium", "Any"
    interests: List[str] = Field(default_factory=lambda: ["History", "Culture"])
    walking_intensity_preference: Optional[str] = "Moderate" # "Minimal", "Moderate", "High", "Any"
    minimize_stairs: bool = False
    step_free_required: bool = False # Hard constraint if True
    traveling_with_children: bool = False
    slower_paced_required: bool = False # For seniors or mobility assistance
    environment_preference: Optional[str] = "Any" # "Quiet", "Moderate", "Vibrant", "Any"
    required_facilities: List[str] = Field(default_factory=list) # "Restrooms", "Wheelchairs", "Elevators", "Parking"

class SuitabilityFactor(BaseModel):
    criterion: str
    status: str # "match", "partial", "mismatch", "unverified", "neutral"
    importance: str # "Hard Requirement", "High Priority", "Medium Preference", "Informational"
    weight: float
    score_impact: float
    explanation: str

class AlternativeSuggestion(BaseModel):
    id: str
    name: str
    city: str
    category: str
    image_url: str
    reason: str
    comparative_advantages: List[str]
    remaining_unknowns: List[str]

class RealityCheckRequest(BaseModel):
    destination_id: str
    profile: Optional[TravelProfile] = None
    gemini_api_key: Optional[str] = None # Optional user-supplied key or uses env if present

class RealityCheckResult(BaseModel):
    destination_id: str
    destination_name: str
    suitability_score: Optional[int] = None # None if insufficient data
    suitability_label: str
    completeness_score: int
    engine_mode: str # "gemini_ai" or "deterministic_rule_engine"
    overall_synthesis: str
    what_we_know: List[Dict[str, Any]]
    how_well_it_matches_you: List[str]
    what_could_be_difficult: List[str]
    what_to_verify_before_leaving: List[str]
    factors: List[SuitabilityFactor]
    suggested_alternatives: List[AlternativeSuggestion]
    verified_disruptions: List[Dict[str, Any]]
    unverified_aspects: List[str]
    official_sources: List[Dict[str, str]]

class CompareRequest(BaseModel):
    destination_ids: List[str] = Field(..., max_length=3)
    profile: Optional[TravelProfile] = None

class CommunityReportCreate(BaseModel):
    destination_id: str
    category: str # "Temporary Closure", "Unexpected Obstacle", "Accessibility Issue", "Facility Observation", "Route Disruption", "General Observation"
    title: str
    description: str
    reported_by: Optional[str] = "Anonymous Traveler"

class CommunityReportUpdateStatus(BaseModel):
    verification_status: str # "unverified", "under_review", "verified", "rejected", "expired"
    admin_notes: Optional[str] = ""
