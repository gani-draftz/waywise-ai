import json
from pathlib import Path
from backend.models import TravelProfile
from backend.engine import evaluate_suitability, calculate_completeness_score, find_alternative_destinations
from backend.gemini_service import build_deterministic_synthesis

DEST_PATH = Path(__file__).resolve().parent.parent / "backend" / "data" / "destinations.json"

def get_test_destinations():
    with open(DEST_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def test_completeness_score():
    dests = get_test_destinations()
    for d in dests:
        score = calculate_completeness_score(d)
        assert 0 <= score <= 100, f"Completeness score {score} out of bounds for {d['id']}"
        assert score >= 70, f"Verified dataset should have high completeness, got {score} for {d['id']}"

def test_step_free_hard_constraint():
    dests = get_test_destinations()
    taj = next(d for d in dests if d["id"] == "taj-mahal")
    hampi = next(d for d in dests if d["id"] == "hampi-ruins")
    qutub = next(d for d in dests if d["id"] == "qutub-minar")

    # When step_free_required is True:
    profile_step_free = TravelProfile(step_free_required=True)

    # Qutub has good step-free access
    q_score, q_label, q_factors, q_matches, q_diffs, _ = evaluate_suitability(qutub, profile_step_free)
    assert q_score > 60, f"Qutub Minar should score well for step-free access, got {q_score}"
    assert any("step-free" in m.lower() for m in q_matches)

    # Hampi has limited/boulder terrain -> Hard constraint mismatch
    h_score, h_label, h_factors, h_matches, h_diffs, _ = evaluate_suitability(hampi, profile_step_free)
    assert h_score <= 45, f"Hampi should receive a severe penalty for mandatory step-free access, got {h_score}"
    assert "Mismatch" in h_label or "Caution" in h_label
    assert any("mobility mismatch" in d.lower() or "step-free" in d.lower() for d in h_diffs)

def test_walking_preference():
    dests = get_test_destinations()
    hampi = next(d for d in dests if d["id"] == "hampi-ruins")
    gateway = next(d for d in dests if d["id"] == "gateway-of-india-mumbai")

    # Minimal walking profile
    profile_minimal_walk = TravelProfile(walking_intensity_preference="Minimal")
    
    # Gateway requires only 0.6 km -> should match
    g_score, _, _, g_matches, _, _ = evaluate_suitability(gateway, profile_minimal_walk)
    assert any("low walking" in m.lower() or "minimal" in m.lower() for m in g_matches)

    # Hampi requires 5.5 km -> should report difficulty
    h_score, _, _, _, h_diffs, _ = evaluate_suitability(hampi, profile_minimal_walk)
    assert any("walking strain" in d.lower() or "5.5 km" in d.lower() for d in h_diffs)

def test_available_time_constraint():
    dests = get_test_destinations()
    pangong = next(d for d in dests if d["id"] == "pangong-tso-ladakh") # Requires 12+ hrs

    profile_short_time = TravelProfile(available_time_hours=2.0)
    score, label, factors, matches, diffs, verify = evaluate_suitability(pangong, profile_short_time)
    
    assert any("time constraint" in d.lower() for d in diffs)
    assert any("shortened itinerary" in v.lower() for v in verify)

def test_alternatives_generation():
    dests = get_test_destinations()
    profile_accessible = TravelProfile(step_free_required=True, interests=["History", "Heritage"])
    
    # For Hampi (inaccessible), alternatives should offer accessible heritage sites
    alts = find_alternative_destinations("hampi-ruins", dests, profile_accessible, current_score=35)
    assert len(alts) >= 1
    # Check that alternatives provide comparative advantages
    assert len(alts[0].comparative_advantages) > 0

def test_deterministic_fallback():
    dests = get_test_destinations()
    taj = next(d for d in dests if d["id"] == "taj-mahal")
    profile = TravelProfile()
    score, label, factors, matches, diffs, verify = evaluate_suitability(taj, profile)
    alts = find_alternative_destinations("taj-mahal", dests, profile, score)

    report = build_deterministic_synthesis(taj, profile, score, label, factors, matches, diffs, verify, alts)
    assert report.engine_mode == "deterministic_rule_engine"
    assert len(report.what_we_know) >= 4
    assert len(report.what_to_verify_before_leaving) > 0
    assert report.completeness_score >= 80

if __name__ == "__main__":
    test_completeness_score()
    test_step_free_hard_constraint()
    test_walking_preference()
    test_available_time_constraint()
    test_alternatives_generation()
    test_deterministic_fallback()
    print("ALL SUITABILITY ENGINE TESTS PASSED SUCCESSFULLY!")
