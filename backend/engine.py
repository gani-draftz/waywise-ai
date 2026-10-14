import math
from typing import List, Dict, Any, Optional, Tuple
from .models import TravelProfile, SuitabilityFactor, AlternativeSuggestion

def calculate_completeness_score(dest: Dict[str, Any]) -> int:
    """
    Transparently evaluates the factual completeness of destination practical data.
    Checks presence of verified opening hours, fees, duration, walking, accessibility,
    amenities, disruptions, and sources.
    """
    practical = dest.get("practical_info", {})
    checklist = [
        bool(practical.get("opening_hours", {}).get("schedule")),
        bool(practical.get("opening_hours", {}).get("source")),
        bool(practical.get("entry_fee", {}).get("source")),
        bool(practical.get("visit_duration", {}).get("estimated_hours")),
        bool(practical.get("walking_requirements", {}).get("intensity")),
        bool(practical.get("walking_requirements", {}).get("source")),
        bool(practical.get("accessibility", {}).get("step_free_access")),
        bool(practical.get("accessibility", {}).get("stairs", {}).get("source")),
        bool(practical.get("accessibility", {}).get("wheelchairs")),
        bool(practical.get("amenities", {}).get("restrooms")),
        bool(practical.get("amenities", {}).get("parking")),
        bool(practical.get("transit", {}).get("nearest_railway") or practical.get("transit", {}).get("local_transport")),
        len(dest.get("official_sources", [])) > 0
    ]
    confirmed_count = sum(1 for item in checklist if item)
    score = int(round((confirmed_count / len(checklist)) * 100))
    return min(max(score, 20), 100)

def evaluate_suitability(
    dest: Dict[str, Any],
    profile: Optional[TravelProfile]
) -> Tuple[Optional[int], str, List[SuitabilityFactor], List[str], List[str], List[str]]:
    """
    Explainable Suitability Engine:
    Compares verified destination attributes against user profile.
    Returns:
    - suitability_score (0-100 or None if insufficient info)
    - suitability_label
    - factors list
    - how_well_it_matches_you list
    - what_could_be_difficult list
    - what_to_verify_before_leaving list
    """
    practical = dest.get("practical_info", {})
    factors: List[SuitabilityFactor] = []
    matches: List[str] = []
    difficulties: List[str] = []
    verify_items: List[str] = []

    # If no profile was provided, default to a neutral, informative assessment
    if not profile:
        profile = TravelProfile()

    # Total score calculation with baseline
    base_score = 50.0
    total_delta = 0.0
    hard_block = False

    # 1. HARD REQUIREMENT: Step-free access
    access_info = practical.get("accessibility", {})
    step_free = access_info.get("step_free_access", "Unverified")
    stairs_info = access_info.get("stairs", {})
    elevators_info = access_info.get("elevators", {})

    if profile.step_free_required:
        if step_free == "Full":
            impact = 25.0
            total_delta += impact
            factors.append(SuitabilityFactor(
                criterion="Step-Free Access (Mandatory)",
                status="match",
                importance="Hard Requirement",
                weight=30.0,
                score_impact=impact,
                explanation="Confirmed full step-free access available across all main public visit areas."
            ))
            matches.append("Confirmed step-free access: Ramps or level pathways cover the primary visitor route.")
        elif step_free == "Good":
            impact = 20.0
            total_delta += impact
            factors.append(SuitabilityFactor(
                criterion="Step-Free Access (Mandatory)",
                status="match",
                importance="Hard Requirement",
                weight=30.0,
                score_impact=impact,
                explanation="Good step-free coverage with elevators/ramps on primary exhibition routes."
            ))
            matches.append("Good step-free access: Primary routes and exhibits are ramped or lift-equipped.")
        elif step_free == "Partial":
            impact = -10.0
            total_delta += impact
            factors.append(SuitabilityFactor(
                criterion="Step-Free Access (Mandatory)",
                status="partial",
                importance="Hard Requirement",
                weight=30.0,
                score_impact=impact,
                explanation=f"Partial step-free access: {stairs_info.get('details', 'Outer areas ramped but interior sections have steps.')}"
            ))
            difficulties.append(f"Partial step-free access limitation: {stairs_info.get('details', 'Certain key areas require climbing stairs.')}")
            verify_items.append("Confirm with venue staff if wheelchair loan and plinth ramp assistance will be available on your visit date.")
        elif step_free == "Limited" or step_free == "Challenging":
            impact = -40.0
            total_delta += impact
            hard_block = True
            factors.append(SuitabilityFactor(
                criterion="Step-Free Access (Mandatory)",
                status="mismatch",
                importance="Hard Requirement",
                weight=35.0,
                score_impact=impact,
                explanation=f"Significant accessibility barrier: {stairs_info.get('details', 'Terrain consists of rugged stone steps without step-free bypass.')}"
            ))
            difficulties.append(f"Strict Mobility Mismatch: You specified step-free access as a requirement, but this destination features: {stairs_info.get('details', 'steep terrain or stairs without elevators')}.")
            verify_items.append("Consider an alternative accessible destination or verify if a vehicle-only perimeter view meets your needs.")
        else: # Unverified
            factors.append(SuitabilityFactor(
                criterion="Step-Free Access (Mandatory)",
                status="unverified",
                importance="Hard Requirement",
                weight=25.0,
                score_impact=0.0,
                explanation="Step-free accessibility has not been verified by an official audit for this destination."
            ))
            difficulties.append("Accessibility status unverified: We cannot confirm whether step-free access is supported.")
            verify_items.append("Directly contact the destination authority to confirm step-free entrances before traveling.")

    # 2. Minimizing Stairs (Soft Preference)
    if profile.minimize_stairs and not profile.step_free_required:
        has_stairs = stairs_info.get("has_stairs", True)
        has_lift = elevators_info.get("available", False)
        if not has_stairs or has_lift:
            impact = 12.0
            total_delta += impact
            factors.append(SuitabilityFactor(
                criterion="Stairs Minimization",
                status="match",
                importance="High Priority",
                weight=15.0,
                score_impact=impact,
                explanation="Destination minimizes stairs or provides elevators/ramps."
            ))
            matches.append("Stairs minimized: Paved ramps or passenger lifts facilitate visit without extensive stair-climbing.")
        else:
            impact = -12.0
            total_delta += impact
            factors.append(SuitabilityFactor(
                criterion="Stairs Minimization",
                status="partial",
                importance="High Priority",
                weight=15.0,
                score_impact=impact,
                explanation=f"Contains unavoidable stairs: {stairs_info.get('details', 'Steps required on tour route.')}"
            ))
            difficulties.append(f"Stairs required: {stairs_info.get('details', 'Walking route includes stone steps.')}")
            verify_items.append("Check available handrails and rest benches along stepped sections.")

    # 3. Available Time vs Estimated Duration
    duration_info = practical.get("visit_duration", {})
    est_hours = duration_info.get("estimated_hours", 2.0)
    user_time = profile.available_time_hours or 3.0

    if user_time < (est_hours - 0.75):
        # User has substantially less time than typical visit requires
        impact = -15.0
        total_delta += impact
        factors.append(SuitabilityFactor(
            criterion="Visit Duration vs Available Time",
            status="mismatch",
            importance="High Priority",
            weight=15.0,
            score_impact=impact,
            explanation=f"Estimated visit time ({est_hours} hrs) exceeds your scheduled time ({user_time} hrs)."
        ))
        difficulties.append(f"Time constraint: Typical visit requires ~{est_hours} hours ({duration_info.get('basis', 'thorough walk')}), which exceeds your {user_time} hours. You may need to rush or skip major sections.")
        verify_items.append("Plan a shortened itinerary focusing only on top priority highlights.")
    elif user_time >= est_hours:
        impact = 15.0
        total_delta += impact
        factors.append(SuitabilityFactor(
            criterion="Visit Duration vs Available Time",
            status="match",
            importance="High Priority",
            weight=15.0,
            score_impact=impact,
            explanation=f"Your available time ({user_time} hrs) comfortably covers the recommended {est_hours} hours."
        ))
        matches.append(f"Comfortable schedule: You have {user_time} hours for a visit that typically takes ~{est_hours} hours.")
    else:
        impact = 5.0
        total_delta += impact
        factors.append(SuitabilityFactor(
            criterion="Visit Duration vs Available Time",
            status="partial",
            importance="Medium Preference",
            weight=10.0,
            score_impact=impact,
            explanation=f"Time window ({user_time} hrs) is tight for this {est_hours} hr destination."
        ))
        matches.append(f"Feasible timing: Your {user_time} hours can accommodate the {est_hours} hour visit if punctually planned.")

    # 4. Walking Intensity Preference
    walk_info = practical.get("walking_requirements", {})
    walk_intensity = walk_info.get("intensity", "Moderate")
    walk_dist = walk_info.get("estimated_distance_km", 1.5)
    pref_walk = profile.walking_intensity_preference or "Moderate"

    if pref_walk == "Minimal":
        if "Minimal" in walk_intensity:
            impact = 15.0
            total_delta += impact
            factors.append(SuitabilityFactor(
                criterion="Walking Requirements",
                status="match",
                importance="High Priority",
                weight=15.0,
                score_impact=impact,
                explanation=f"Matches your preference for minimal walking (~{walk_dist} km on level ground)."
            ))
            matches.append(f"Low walking requirement: Route requires approx {walk_dist} km on level paved ground.")
        elif "Moderate" in walk_intensity:
            impact = -5.0
            total_delta += impact
            factors.append(SuitabilityFactor(
                criterion="Walking Requirements",
                status="partial",
                importance="High Priority",
                weight=15.0,
                score_impact=impact,
                explanation=f"Requires moderate walking (~{walk_dist} km), which slightly exceeds minimal preference."
            ))
            difficulties.append(f"Walking distance: Typical circuit involves approx {walk_dist} km ({walk_info.get('surface', 'paved walkways')}).")
            if walk_info.get("shuttle_info"):
                matches.append(f"Shuttle assistance: {walk_info.get('shuttle_info')}")
        else: # High / Very High / Strenuous
            impact = -20.0
            total_delta += impact
            factors.append(SuitabilityFactor(
                criterion="Walking Requirements",
                status="mismatch",
                importance="High Priority",
                weight=20.0,
                score_impact=impact,
                explanation=f"Requires extensive walking/trekking ({walk_dist} km, {walk_intensity})."
            ))
            difficulties.append(f"High walking strain: Requires ~{walk_dist} km across {walk_info.get('surface', 'uneven ground')}, conflicting with your minimal walking preference.")
            verify_items.append("Check whether electric carts or golf buggies are running on your specific visit date.")
    elif pref_walk == "High":
        if "High" in walk_intensity or "Strenuous" in walk_intensity:
            impact = 12.0
            total_delta += impact
            factors.append(SuitabilityFactor(
                criterion="Walking Requirements",
                status="match",
                importance="Medium Preference",
                weight=10.0,
                score_impact=impact,
                explanation=f"Satisfies your interest in active exploration ({walk_dist} km, {walk_intensity})."
            ))
            matches.append(f"Active exploration: Provides an expansive walking circuit of ~{walk_dist} km.")
        else:
            impact = 6.0
            total_delta += impact
            factors.append(SuitabilityFactor(
                criterion="Walking Requirements",
                status="partial",
                importance="Informational",
                weight=5.0,
                score_impact=impact,
                explanation=f"Walking is modest (~{walk_dist} km), though you prefer high activity."
            ))
    else: # Moderate or Any
        impact = 10.0
        total_delta += impact
        factors.append(SuitabilityFactor(
            criterion="Walking Requirements",
            status="match",
            importance="Medium Preference",
            weight=10.0,
            score_impact=impact,
            explanation=f"Walking requirements (~{walk_dist} km, {walk_intensity}) are well within normal expectations."
        ))
        matches.append(f"Manageable walking: Expect roughly {walk_dist} km on {walk_info.get('surface', 'paved surface')}.")

    # 5. Interests Match
    dest_tags = set([t.lower() for t in dest.get("tags", [])] + [dest.get("category", "").lower()])
    user_interests = [i.lower() for i in profile.interests] if profile.interests else []

    matched_interests = []
    for interest in user_interests:
        if any(interest in tag or tag in interest for tag in dest_tags):
            matched_interests.append(interest.title())
        elif interest in dest.get("description", "").lower():
            matched_interests.append(interest.title())

    if matched_interests:
        interest_impact = min(len(matched_interests) * 7.0, 20.0)
        total_delta += interest_impact
        factors.append(SuitabilityFactor(
            criterion="Interests Alignment",
            status="match",
            importance="High Priority",
            weight=20.0,
            score_impact=interest_impact,
            explanation=f"Matches your stated interests in: {', '.join(matched_interests)}."
        ))
        matches.append(f"Interest match: Strongly aligns with your interest in {', '.join(matched_interests)}.")
    elif user_interests:
        factors.append(SuitabilityFactor(
            criterion="Interests Alignment",
            status="neutral",
            importance="Medium Preference",
            weight=10.0,
            score_impact=0.0,
            explanation=f"Destination category is '{dest.get('category')}', which does not directly overlap with {', '.join([i.title() for i in user_interests])}."
        ))

    # 6. Slower-Paced / Senior Citizen Fit
    demo_fit = practical.get("demographic_fit", {})
    senior_fit = demo_fit.get("senior_friendly", "Moderate")

    if profile.slower_paced_required:
        if senior_fit == "High":
            impact = 12.0
            total_delta += impact
            factors.append(SuitabilityFactor(
                criterion="Pace & Senior Suitability",
                status="match",
                importance="High Priority",
                weight=15.0,
                score_impact=impact,
                explanation="Destination is well-equipped for slower-paced, elderly-friendly visits with resting spots and smooth transit."
            ))
            matches.append("Senior & slower pace friendly: Flat terrain, rest areas, and accessible amenities support a relaxed visit.")
        elif "Caution" in str(senior_fit) or "Low" in str(senior_fit):
            impact = -20.0
            total_delta += impact
            factors.append(SuitabilityFactor(
                criterion="Pace & Senior Suitability",
                status="mismatch",
                importance="High Priority",
                weight=20.0,
                score_impact=impact,
                explanation=f"Challenging environment for slower-paced travelers: {dest.get('description', '')[:80]}..."
            ))
            difficulties.append(f"Pacing challenge: Destination environment is rated '{senior_fit}' for seniors/slower pace travelers due to altitude, heat, or rugged terrain.")
            verify_items.append("Consult medical advice if high altitude or extreme climate applies; verify resting pavilion availability.")
        else:
            impact = 0.0
            factors.append(SuitabilityFactor(
                criterion="Pace & Senior Suitability",
                status="partial",
                importance="Medium Preference",
                weight=10.0,
                score_impact=impact,
                explanation=f"Moderate suitability for slower-paced visits ({senior_fit})."
            ))
            matches.append("Pace: Achievable at a slower pace with planned rest breaks.")

    # 7. Traveling with Children
    child_fit = demo_fit.get("child_friendly", True)
    if profile.traveling_with_children:
        if child_fit is True or child_fit == "High":
            impact = 8.0
            total_delta += impact
            factors.append(SuitabilityFactor(
                criterion="Family & Child Friendliness",
                status="match",
                importance="Medium Preference",
                weight=10.0,
                score_impact=impact,
                explanation="Destination grounds are child-friendly with open spaces and security barriers."
            ))
            matches.append("Child friendly: Safe walking areas and family amenities available.")
        elif "Caution" in str(child_fit):
            impact = -15.0
            total_delta += impact
            factors.append(SuitabilityFactor(
                criterion="Family & Child Friendliness",
                status="partial",
                importance="High Priority",
                weight=15.0,
                score_impact=impact,
                explanation=f"Requires caution when traveling with young children: {child_fit}."
            ))
            difficulties.append(f"Child safety notice: {child_fit}. Keep close supervision near cliffs or high elevation.")
            verify_items.append("Verify pediatric emergency readiness and hydration packing.")

    # 8. Required Facilities check
    amenities = practical.get("amenities", {})
    if profile.required_facilities:
        for fac in profile.required_facilities:
            fac_lower = fac.lower()
            if "restroom" in fac_lower or "toilet" in fac_lower:
                restrooms = amenities.get("restrooms", {})
                if restrooms.get("available"):
                    matches.append(f"Restrooms available: Located at {', '.join(restrooms.get('locations', ['complex']))}.")
                else:
                    difficulties.append("Restroom facilities are unverified or limited.")
                    verify_items.append("Confirm nearest public toilet locations outside ticket perimeter.")
            elif "wheelchair" in fac_lower:
                wc = access_info.get("wheelchairs", {})
                if wc.get("available"):
                    matches.append(f"Wheelchair service available: {wc.get('location', 'at entrance')} ({wc.get('cost', 'Free')}).")
                else:
                    difficulties.append("On-site wheelchair loan is NOT standardly provided; must bring personal mobility aid.")
                    verify_items.append("Arrange your own portable transport chair.")
            elif "elevator" in fac_lower or "lift" in fac_lower:
                elev = access_info.get("elevators", {})
                if elev.get("available"):
                    matches.append("Elevators available: Operational service lifts connect primary levels.")
                else:
                    difficulties.append("No elevators available in this historical structure.")

    # 9. Verified Disruptions check
    disruptions = dest.get("verified_disruptions", [])
    for dis in disruptions:
        if dis.get("status") == "Active":
            difficulties.append(f"Verified Alert: [{dis.get('type')}] {dis.get('title')} - {dis.get('detail')}")
            verify_items.append(f"Check latest status of: {dis.get('title')}")

    # 10. Always add unverified aspects to checklist
    for unv in dest.get("unverified_aspects", []):
        verify_items.append(f"Verify locally: {unv}")

    # Compute final numerical score
    raw_score = base_score + total_delta
    if hard_block:
        final_score = min(int(round(raw_score)), 38) # Cap if hard constraint failed
    else:
        final_score = min(max(int(round(raw_score)), 10), 99)

    # Label calculation
    if hard_block:
        label = "High Mismatch Risk"
    elif final_score >= 82:
        label = "Highly Suitable"
    elif final_score >= 65:
        label = "Moderately Suitable"
    elif final_score >= 45:
        label = "Proceed with Caution"
    else:
        label = "Significant Mismatch"

    return final_score, label, factors, matches, difficulties, verify_items


def find_alternative_destinations(
    current_dest_id: str,
    all_destinations: List[Dict[str, Any]],
    profile: Optional[TravelProfile],
    current_score: Optional[int]
) -> List[AlternativeSuggestion]:
    """
    Identifies grounded alternative destinations when the current selection
    has accessibility barriers, time constraints, or mismatches.
    """
    alternatives: List[AlternativeSuggestion] = []
    current_dest = next((d for d in all_destinations if d["id"] == current_dest_id), None)
    if not current_dest:
        return []

    # Score each other destination against user profile
    candidates = []
    for other in all_destinations:
        if other["id"] == current_dest_id:
            continue
        score, label, factors, matches, diffs, _ = evaluate_suitability(other, profile)
        comp = other.get("data_completeness_score", 90)
        candidates.append({
            "dest": other,
            "score": score or 50,
            "label": label,
            "matches": matches,
            "diffs": diffs,
            "completeness": comp
        })

    # Sort candidates by suitability score, then by data completeness
    candidates.sort(key=lambda x: (x["score"], x["completeness"]), reverse=True)

    # Pick top 2-3 candidates that solve current destination's weaknesses
    for cand in candidates[:3]:
        d = cand["dest"]
        reasons = []
        advantages = []

        if profile and profile.step_free_required:
            step_free = d.get("practical_info", {}).get("accessibility", {}).get("step_free_access")
            if step_free in ["Full", "Good"]:
                advantages.append(f"Provides verified {step_free.lower()} step-free accessibility with ramps/elevators.")

        if profile and profile.walking_intensity_preference == "Minimal":
            walk_dist = d.get("practical_info", {}).get("walking_requirements", {}).get("estimated_distance_km", 2.0)
            advantages.append(f"Lower walking distance (~{walk_dist} km).")

        if d.get("category") == current_dest.get("category"):
            reasons.append(f"Shares your interest in {d.get('category')}")
        else:
            reasons.append(f"Offers an enriching {d.get('category')} experience in {d.get('city')}")

        if not advantages:
            advantages.append(f"Scored {cand['score']}/100 ({cand['label']}) for your travel profile.")
            advantages.append(f"Verified high data completeness ({cand['completeness']}%).")

        main_reason = f"Suggested alternative in {d.get('city')}: " + ". ".join(reasons) + "."

        alternatives.append(AlternativeSuggestion(
            id=d["id"],
            name=d["name"],
            city=f"{d['city']}, {d['country']}",
            category=d["category"],
            image_url=d["image_url"],
            reason=main_reason,
            comparative_advantages=advantages,
            remaining_unknowns=d.get("unverified_aspects", [])[:2]
        ))

    return alternatives
