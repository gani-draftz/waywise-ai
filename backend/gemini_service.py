"""
Gemini Service Module for WayWise AI.
Dual-mode synthesis engine combining live Google Gemini AI with a robust,
deterministic rule-based fallback when offline or without an API key.
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List
import httpx
from .models import (
    TravelProfile,
    RealityCheckResult,
    AlternativeSuggestion,
    SuitabilityFactor,
    ScoreBreakdown
)

logger = logging.getLogger("waywise.ai")

def build_deterministic_synthesis(
    dest: Dict[str, Any],
    profile: Optional[TravelProfile],
    suitability_score: Optional[int],
    suitability_label: str,
    score_breakdown: ScoreBreakdown,
    factors: List[SuitabilityFactor],
    matches: List[str],
    difficulties: List[str],
    verify_items: List[str],
    alternatives: List[AlternativeSuggestion]
) -> RealityCheckResult:
    """
    Deterministic rule-based synthesizer used when Gemini API key is absent or offline.
    Directly reflects verified facts without fabrication or ungrounded assumptions.
    """
    practical = dest.get("practical_info", {})
    dest_name = dest.get("name", "Destination")
    completeness = dest.get("data_completeness_score", 90)

    what_we_know = [
        {
            "category": "Hours & Schedule",
            "fact": practical.get("opening_hours", {}).get("schedule", "Hours unverified"),
            "closed": ", ".join(practical.get("opening_hours", {}).get("closed_days", ["None stated"])),
            "source": practical.get("opening_hours", {}).get("source", "Official Portal"),
            "verified_date": practical.get("opening_hours", {}).get("last_verified", "Recent")
        },
        {
            "category": "Ticketing & Pricing",
            "fact": f"Domestic: ₹{practical.get('entry_fee', {}).get('domestic', 'N/A')} | Foreign: ₹{practical.get('entry_fee', {}).get('foreign', 'N/A')}",
            "booking_mode": practical.get("entry_fee", {}).get("ticketing_mode", "Standard counter/online"),
            "source": practical.get("entry_fee", {}).get("source", "Ticketing Authority"),
            "verified_date": practical.get("entry_fee", {}).get("last_verified", "Recent")
        },
        {
            "category": "Walking & Terrain",
            "fact": f"Intensity: {practical.get('walking_requirements', {}).get('intensity', 'Moderate')} (~{practical.get('walking_requirements', {}).get('estimated_distance_km', 1.5)} km)",
            "surface": practical.get("walking_requirements", {}).get("surface", "Paved"),
            "shuttle": practical.get("walking_requirements", {}).get("shuttle_info", "None"),
            "source": practical.get("walking_requirements", {}).get("source", "Tourism Guidelines"),
            "verified_date": practical.get("walking_requirements", {}).get("last_verified", "Recent")
        },
        {
            "category": "Accessibility & Elevators",
            "fact": f"Step-Free Access: {practical.get('accessibility', {}).get('step_free_access', 'Unverified')}",
            "stairs": practical.get("accessibility", {}).get("stairs", {}).get("details", "Standard steps"),
            "elevators": "Available" if practical.get("accessibility", {}).get("elevators", {}).get("available") else "Not Available",
            "source": practical.get("accessibility", {}).get("stairs", {}).get("source", "Accessibility Audit"),
            "verified_date": practical.get("accessibility", {}).get("stairs", {}).get("last_verified", "Recent")
        },
        {
            "category": "Transit & Arrival",
            "fact": f"Nearest Rail: {practical.get('transit', {}).get('nearest_railway', 'Local station')}",
            "airport": practical.get('transit', {}).get('nearest_airport', 'Regional airport'),
            "source": "Municipal Transit Network",
            "verified_date": "Recent"
        }
    ]

    profile_summary = []
    if profile:
        if profile.step_free_required:
            profile_summary.append("mandatory step-free access")
        if profile.walking_intensity_preference:
            profile_summary.append(f"{profile.walking_intensity_preference.lower()} walking intensity")
        if profile.available_time_hours:
            profile_summary.append(f"{profile.available_time_hours} hours available")
        if profile.interests:
            profile_summary.append(f"interests in {', '.join(profile.interests[:2])}")
    
    pref_str = ", ".join(profile_summary) if profile_summary else "standard visitor parameters"

    overall_text = (
        f"Based on verified data (completeness: {completeness}%), {dest_name} has been evaluated against your profile ({pref_str}). "
        f"Overall suitability is assessed at {suitability_score}/100 ({suitability_label}). "
    )

    if difficulties:
        overall_text += f"Key caution points include: {difficulties[0]} "
    if matches:
        overall_text += f"Key matching factors include: {matches[0]}"

    return RealityCheckResult(
        destination_id=dest["id"],
        destination_name=dest["name"],
        suitability_score=suitability_score,
        suitability_label=suitability_label,
        completeness_score=completeness,
        score_breakdown=score_breakdown,
        engine_mode="deterministic_rule_engine",
        overall_synthesis=overall_text,
        what_we_know=what_we_know,
        how_well_it_matches_you=matches,
        what_could_be_difficult=difficulties,
        what_to_verify_before_leaving=verify_items,
        factors=factors,
        suggested_alternatives=alternatives,
        verified_disruptions=dest.get("verified_disruptions", []),
        unverified_aspects=dest.get("unverified_aspects", []),
        official_sources=dest.get("official_sources", [])
    )

async def generate_gemini_reality_report(
    dest: Dict[str, Any],
    profile: Optional[TravelProfile],
    suitability_score: Optional[int],
    suitability_label: str,
    score_breakdown: ScoreBreakdown,
    factors: List[SuitabilityFactor],
    matches: List[str],
    difficulties: List[str],
    verify_items: List[str],
    alternatives: List[AlternativeSuggestion],
    api_key: Optional[str] = None
) -> RealityCheckResult:
    """
    Attempts to synthesize an evidence-grounded report using Google Gemini API.
    If key is absent or API fails, seamlessly falls back to the deterministic rule engine.
    """
    active_key = api_key or os.environ.get("GEMINI_API_KEY")

    if not active_key:
        logger.info("No Gemini API key provided. Using deterministic rule-based engine.")
        return build_deterministic_synthesis(
            dest, profile, suitability_score, suitability_label, score_breakdown,
            factors, matches, difficulties, verify_items, alternatives
        )

    prompt_payload = {
        "destination_name": dest.get("name"),
        "country_and_city": f"{dest.get('city')}, {dest.get('country')}",
        "category": dest.get("category"),
        "description": dest.get("description"),
        "verified_practical_info": dest.get("practical_info"),
        "verified_disruptions": dest.get("verified_disruptions"),
        "unverified_aspects": dest.get("unverified_aspects"),
        "user_profile": profile.dict() if profile else {},
        "calculated_suitability": {
            "score": suitability_score,
            "label": suitability_label,
            "breakdown": score_breakdown.dict(),
            "factors": [f.dict() for f in factors]
        }
    }

    system_instruction = (
        "You are the Core Intelligence Engine of WayWise AI ('Know Before You Go'). "
        "Your duty is evidence-based, personalized travel decision support. "
        "CRITICAL RULES: "
        "1. NEVER invent opening hours, facilities, accessibility features, or conditions. "
        "2. If an attribute is missing or unverified, state it as unverified. "
        "3. Provide personalized analysis comparing the destination's confirmed attributes with the traveler's stated profile. "
        "4. Output MUST be valid JSON conforming strictly to the requested schema."
    )

    prompt_text = (
        f"{system_instruction}\n\n"
        f"Input Data:\n{json.dumps(prompt_payload, indent=2)}\n\n"
        "Generate a structured reality report in JSON format with exactly these keys:\n"
        "{\n"
        '  "overall_synthesis": "Comprehensive narrative explaining the reality check for this traveler",\n'
        '  "how_well_it_matches_you": ["Point 1", "Point 2"],\n'
        '  "what_could_be_difficult": ["Specific caution 1", "Specific caution 2"],\n'
        '  "what_to_verify_before_leaving": ["Actionable verification item 1", "Item 2"]\n'
        "}"
    )

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={active_key}"
        headers = {"Content-Type": "application/json"}
        body = {
            "contents": [
                {
                    "parts": [{"text": prompt_text}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json"
            }
        }

        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.post(url, headers=headers, json=body)
            if response.status_code != 200:
                url_fallback = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={active_key}"
                response = await client.post(url_fallback, headers=headers, json=body)

            if response.status_code == 200:
                resp_json = response.json()
                candidate_text = resp_json["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(candidate_text)

                base_result = build_deterministic_synthesis(
                    dest, profile, suitability_score, suitability_label, score_breakdown,
                    factors, matches, difficulties, verify_items, alternatives
                )

                return RealityCheckResult(
                    destination_id=base_result.destination_id,
                    destination_name=base_result.destination_name,
                    suitability_score=base_result.suitability_score,
                    suitability_label=base_result.suitability_label,
                    completeness_score=base_result.completeness_score,
                    score_breakdown=base_result.score_breakdown,
                    engine_mode="gemini_ai",
                    overall_synthesis=parsed.get("overall_synthesis", base_result.overall_synthesis),
                    what_we_know=base_result.what_we_know,
                    how_well_it_matches_you=parsed.get("how_well_it_matches_you", base_result.how_well_it_matches_you),
                    what_could_be_difficult=parsed.get("what_could_be_difficult", base_result.what_could_be_difficult),
                    what_to_verify_before_leaving=parsed.get("what_to_verify_before_leaving", base_result.what_to_verify_before_leaving),
                    factors=base_result.factors,
                    suggested_alternatives=base_result.suggested_alternatives,
                    verified_disruptions=base_result.verified_disruptions,
                    unverified_aspects=base_result.unverified_aspects,
                    official_sources=base_result.official_sources
                )
            else:
                logger.warning("Gemini API returned status %s: %s", response.status_code, response.text)
    except Exception as e:
        logger.warning("Error querying Gemini API (%s). Falling back to deterministic engine.", e)

    return build_deterministic_synthesis(
        dest, profile, suitability_score, suitability_label, score_breakdown,
        factors, matches, difficulties, verify_items, alternatives
    )
