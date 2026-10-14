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
    hampi = next(d for d in dests if d["id"] == "hampi-ruins")
    qutub = next(d for d in dests if d["id"] == "qutub-minar")

    profile_step_free = TravelProfile(step_free_required=True)

    # Qutub has good step-free access
    q_score, q_label, q_breakdown, q_factors, q_matches, q_diffs, _ = evaluate_suitability(qutub, profile_step_free)
    assert q_score > 60
    assert q_breakdown.accessibility_score >= 80

    # Hampi has limited/boulder terrain -> Hard constraint mismatch
    h_score, h_label, h_breakdown, h_factors, h_matches, h_diffs, _ = evaluate_suitability(hampi, profile_step_free)
    assert h_score <= 45
    assert h_breakdown.accessibility_score <= 25
    assert "Mismatch" in h_label or "Caution" in h_label

def test_walking_preference():
    dests = get_test_destinations()
    hampi = next(d for d in dests if d["id"] == "hampi-ruins")
    gateway = next(d for d in dests if d["id"] == "gateway-of-india-mumbai")

    profile_minimal_walk = TravelProfile(walking_intensity_preference="Minimal")
    g_score, _, g_breakdown, _, g_matches, _, _ = evaluate_suitability(gateway, profile_minimal_walk)
    assert any("low walking" in m.lower() or "minimal" in m.lower() for m in g_matches)
    assert g_breakdown.walking_score >= 85

    h_score, _, h_breakdown, _, _, h_diffs, _ = evaluate_suitability(hampi, profile_minimal_walk)
    assert any("walking strain" in d.lower() or "5.5 km" in d.lower() for d in h_diffs)
    assert h_breakdown.walking_score <= 40

def test_deterministic_fallback():
    dests = get_test_destinations()
    taj = next(d for d in dests if d["id"] == "taj-mahal")
    profile = TravelProfile()
    score, label, breakdown, factors, matches, diffs, verify = evaluate_suitability(taj, profile)
    alts = find_alternative_destinations("taj-mahal", dests, profile, score)

    report = build_deterministic_synthesis(taj, profile, score, label, breakdown, factors, matches, diffs, verify, alts)
    assert report.engine_mode == "deterministic_rule_engine"
    assert len(report.what_we_know) >= 4
    assert report.score_breakdown.overall_suitability == score

if __name__ == "__main__":
    test_completeness_score()
    test_step_free_hard_constraint()
    test_walking_preference()
    test_deterministic_fallback()
    print("ALL WAYWISE ENGINE TESTS PASSED!")
