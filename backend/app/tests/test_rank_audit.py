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
    return register_and_login(client, "po_rank", "product_owner")

@pytest.fixture
def epic_id(client, po_token):
    r = client.post("/epics/", json={
        "title": "Rank Epic",
        "description": "",
        "labels": []
    }, headers={"Authorization": f"Bearer {po_token}"})
    assert r.status_code == 200
    return r.json()["id"]

def test_patch_rank_creates_audit(client, po_token, epic_id):
    # Update rank
    pr = client.patch(f"/epics/{epic_id}/rank", json={"rank": 42.5}, headers={"Authorization": f"Bearer {po_token}"})
    assert pr.status_code == 200
    assert pr.json()["rank"] == 42.5

    # Fetch audits
    audits = client.get(f"/audits/?entity=epic&entity_id={epic_id}", headers={"Authorization": f"Bearer {po_token}"})
    assert audits.status_code == 200
    data = audits.json()
    assert len(data) >= 1
    latest = data[0]
    assert latest["entity"] == "epic"
    assert latest["entity_id"] == epic_id
    assert latest["action"] == "reorder"
    assert latest["changes"]["rank"] == 42.5
