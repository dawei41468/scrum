import pytest
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from app.main import app

@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        yield c

def register_and_login(client, username: str, role: str) -> str:
    client.post("/users/register", json={
        "username": username,
        "password": "testpass",
        "role": role
    })
    r = client.post("/users/login", data={
        "username": username,
        "password": "testpass"
    })
    assert r.status_code == 200
    return r.json()["access_token"]

@pytest.fixture
def po_token(client):
    return register_and_login(client, "po_bulk", "product_owner")

@pytest.fixture
def epic_id(client, po_token):
    r = client.post("/epics/", json={
        "title": "Bulk Epic",
        "description": "",
        "labels": []
    }, headers={"Authorization": f"Bearer {po_token}"})
    assert r.status_code == 200
    return r.json()["id"]

@pytest.fixture
def story_id(client, po_token, epic_id):
    r = client.post("/items/", json={
        "type": "story",
        "title": "Bulk Story",
        "epic_id": epic_id,
        "description": "",
        "labels": [],
        "story_points": 1
    }, headers={"Authorization": f"Bearer {po_token}"})
    assert r.status_code == 200
    return r.json()["id"]

def test_epic_bulk_update_and_audit(client, po_token, epic_id):
    payload = {"labels": ["a", "b"], "story_points": 8, "status": "in_progress"}
    r = client.patch(f"/epics/{epic_id}/bulk", json=payload, headers={"Authorization": f"Bearer {po_token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["labels"] == ["a", "b"]
    assert body["story_points"] == 8
    assert body["status"] == "in_progress"
    audits = client.get(f"/audits/?entity=epic&entity_id={epic_id}", headers={"Authorization": f"Bearer {po_token}"})
    assert audits.status_code == 200
    assert any(ev.get("action") == "bulk_update" for ev in audits.json())

def test_story_bulk_update_and_audit(client, po_token, story_id):
    payload = {"labels": ["x"], "story_points": 5, "status": "done", "title": "Bulk Story Updated"}
    r = client.patch(f"/items/{story_id}/bulk", json=payload, headers={"Authorization": f"Bearer {po_token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["labels"] == ["x"]
    assert body["story_points"] == 5
    assert body["status"] == "done"
    assert body["title"] == "Bulk Story Updated"
    audits = client.get(f"/audits/?entity=item&entity_id={story_id}", headers={"Authorization": f"Bearer {po_token}"})
    assert audits.status_code == 200
    assert any(ev.get("action") == "bulk_update" for ev in audits.json())
