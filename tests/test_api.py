import sys
from starlette.testclient import TestClient
from backend.app import app

client = TestClient(app)

def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["app_name"] == "WayWise AI"
    assert data["destinations_count"] >= 10
    assert data["caching_active"] is True

def test_security_headers():
    res = client.get("/api/health")
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "SAMEORIGIN"
    assert res.headers.get("X-XSS-Protection") == "1; mode=block"

def test_api_list_and_filter_destinations():
    res = client.get("/api/destinations")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 10

    res_search = client.get("/api/destinations?search=delhi")
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert any("qutub" in d["id"] for d in search_data["destinations"])

def test_api_reality_check():
    payload = {
        "destination_id": "taj-mahal",
        "profile": {
            "step_free_required": False,
            "walking_intensity_preference": "Moderate",
            "available_time_hours": 3.0,
            "interests": ["History", "Architecture"]
        }
    }
    res = client.post("/api/reality-check", json=payload)
    assert res.status_code == 200
    result = res.json()
    assert result["destination_id"] == "taj-mahal"
    assert "score_breakdown" in result
    assert result["score_breakdown"]["overall_suitability"] == result["suitability_score"]

def test_api_compare():
    payload = {
        "destination_ids": ["taj-mahal", "qutub-minar", "hampi-ruins"],
        "profile": {"step_free_required": True}
    }
    res = client.post("/api/compare", json=payload)
    assert res.status_code == 200
    result = res.json()
    assert result["count"] == 3

def test_community_reporting_sanitization():
    new_rep = {
        "destination_id": "taj-mahal",
        "category": "Temporary Closure",
        "title": "<script>alert('xss')</script>Normal Title",
        "description": "Details about gate 2 update.",
        "reported_by": "Traveler"
    }
    res = client.post("/api/reports", json=new_rep)
    assert res.status_code == 200
    rep_data = res.json()["report"]
    # Check that script tags are sanitized / escaped
    assert "<script>" not in rep_data["title"]
    assert "&lt;script&gt;" in rep_data["title"] or "alert" in rep_data["title"]

if __name__ == "__main__":
    test_api_health()
    test_security_headers()
    test_api_list_and_filter_destinations()
    test_api_reality_check()
    test_api_compare()
    test_community_reporting_sanitization()
    print("ALL WAYWISE API TESTS PASSED!")
