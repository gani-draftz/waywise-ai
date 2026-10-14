import sys
from pathlib import Path
from starlette.testclient import TestClient

from backend.app import app

client = TestClient(app)

def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["destinations_count"] >= 10

def test_api_list_and_filter_destinations():
    # 1. Basic list
    res = client.get("/api/destinations")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 10

    # 2. Search
    res_search = client.get("/api/destinations?search=delhi")
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert any("qutub" in d["id"] for d in search_data["destinations"])

    # 3. Category filter
    res_cat = client.get("/api/destinations?category=Nature")
    assert res_cat.status_code == 200
    cat_data = res_cat.json()
    assert all("nature" in d["category"].lower() for d in cat_data["destinations"])

    # 4. Step-free only filter
    res_step = client.get("/api/destinations?step_free_only=true")
    assert res_step.status_code == 200
    step_data = res_step.json()
    for d in step_data["destinations"]:
        access = d["practical_info"]["accessibility"]["step_free_access"]
        assert access in ["Full", "Good"]

def test_api_get_destination_detail():
    res = client.get("/api/destinations/taj-mahal")
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Taj Mahal"
    assert "practical_info" in data
    assert data["practical_info"]["opening_hours"]["schedule"] is not None

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
    assert result["suitability_score"] is not None
    assert len(result["what_we_know"]) > 0
    assert len(result["what_to_verify_before_leaving"]) > 0
    assert result["engine_mode"] in ["deterministic_rule_engine", "gemini_ai"]

def test_api_compare():
    payload = {
        "destination_ids": ["taj-mahal", "qutub-minar", "hampi-ruins"],
        "profile": {
            "step_free_required": True
        }
    }
    res = client.post("/api/compare", json=payload)
    assert res.status_code == 200
    result = res.json()
    assert result["count"] == 3
    # Check that comparative details are populated
    for d in result["destinations"]:
        assert "step_free_access" in d
        assert "walking_distance_km" in d
        assert "suitability_score" in d

def test_community_reporting_and_moderation():
    # 1. Submit report
    new_rep = {
        "destination_id": "taj-mahal",
        "category": "Temporary Closure",
        "title": "East Gate security line temporarily rerouted",
        "description": "Due to paving work, entry is routed via the shaded garden arcade.",
        "reported_by": "TestUser"
    }
    res = client.post("/api/reports", json=new_rep)
    assert res.status_code == 200
    rep_data = res.json()["report"]
    report_id = rep_data["id"]
    assert rep_data["verification_status"] == "unverified"

    # 2. Moderate report (Admin verify)
    update_payload = {
        "verification_status": "verified",
        "admin_notes": "Verified by monument management inspection team."
    }
    res_mod = client.patch(f"/api/reports/{report_id}/status", json=update_payload)
    assert res_mod.status_code == 200
    updated_rep = res_mod.json()["report"]
    assert updated_rep["verification_status"] == "verified"
    assert updated_rep["admin_notes"] == update_payload["admin_notes"]

if __name__ == "__main__":
    test_api_health()
    test_api_list_and_filter_destinations()
    test_api_get_destination_detail()
    test_api_reality_check()
    test_api_compare()
    test_community_reporting_and_moderation()
    print("ALL API INTEGRATION TESTS PASSED SUCCESSFULLY!")
