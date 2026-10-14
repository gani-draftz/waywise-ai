"""
Pydantic Models for WayWise AI.
Defines schemas for Travel Profiles, Personas, Suitability Factors, Reality Check Results,
and Community Reports with strict validation and sanitization.
"""

import html
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator

class TravelProfile(BaseModel):
    region_or_destination: Optional[str] = Field(default=None, max_length=100)
    visit_date: Optional[str] = Field(default=None, max_length=30)
    available_time_hours: Optional[float] = Field(default=3.0, ge=0.5, le=24.0)
    budget_tier: Optional[str] = Field(default="Moderate", max_length=20)
    interests: List[str] = Field(default_factory=lambda: ["History", "Culture"])
    walking_intensity_preference: Optional[str] = Field(default="Moderate", max_length=20)
    minimize_stairs: bool = False
    step_free_required: bool = False  # Hard non-negotiable constraint
    traveling_with_children: bool = False
    slower_paced_required: bool = False  # For seniors or mobility-assisted travelers
    environment_preference: Optional[str] = Field(default="Any", max_length=20)
    required_facilities: List[str] = Field(default_factory=list)

    @field_validator("region_or_destination", "visit_date", "budget_tier", "walking_intensity_preference", mode="before")
    @classmethod
    def sanitize_strings(cls, v: Any) -> Any:
        if isinstance(v, str):
            return html.escape(v.strip())
        return v

    @field_validator("interests", "required_facilities", mode="before")
    @classmethod
    def sanitize_lists(cls, v: Any) -> Any:
        if isinstance(v, list):
            return [html.escape(item.strip()) for item in v if isinstance(item, str)]
        return v

class ScoreBreakdown(BaseModel):
    accessibility_score: int = Field(ge=0, le=100)
    walking_score: int = Field(ge=0, le=100)
    schedule_score: int = Field(ge=0, le=100)
    interest_fit_score: int = Field(ge=0, le=100)
    overall_suitability: int = Field(ge=0, le=100)

class SuitabilityFactor(BaseModel):
    criterion: str
    status: str  # "match", "partial", "mismatch", "unverified", "neutral"
    importance: str  # "Hard Requirement", "High Priority", "Medium Preference", "Informational"
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
    destination_id: str = Field(..., min_length=1, max_length=100)
    profile: Optional[TravelProfile] = None
    gemini_api_key: Optional[str] = Field(default=None, max_length=200)

class RealityCheckResult(BaseModel):
    destination_id: str
    destination_name: str
    suitability_score: Optional[int] = None
    suitability_label: str
    completeness_score: int
    score_breakdown: ScoreBreakdown
    engine_mode: str  # "gemini_ai" or "deterministic_rule_engine"
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
    destination_ids: List[str] = Field(..., min_length=1, max_length=3)
    profile: Optional[TravelProfile] = None

class CommunityReportCreate(BaseModel):
    destination_id: str = Field(..., min_length=1, max_length=100)
    category: str = Field(..., min_length=2, max_length=60)
    title: str = Field(..., min_length=3, max_length=150)
    description: str = Field(..., min_length=5, max_length=2000)
    reported_by: Optional[str] = Field(default="Anonymous Traveler", max_length=60)

    @field_validator("title", "description", "reported_by", mode="before")
    @classmethod
    def sanitize_text(cls, v: Any) -> Any:
        if isinstance(v, str):
            # Strip control characters & escape HTML entities to prevent XSS
            cleaned = "".join(ch for ch in v if ch.isprintable() or ch in "\n\r\t")
            return html.escape(cleaned.strip())
        return v

class CommunityReportUpdateStatus(BaseModel):
    verification_status: str = Field(..., max_length=30)
    admin_notes: Optional[str] = Field(default="", max_length=500)

    @field_validator("admin_notes", mode="before")
    @classmethod
    def sanitize_notes(cls, v: Any) -> Any:
        if isinstance(v, str):
            return html.escape(v.strip())
        return v
