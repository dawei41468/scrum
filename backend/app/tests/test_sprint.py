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
    response = client.post("/users/login", data={
        "username": username,
        "password": "testpass"
    })
    assert response.status_code == 200
    return response.json()["access_token"]

@pytest.fixture
def dev_token(client):
    return register_and_login(client, "dev_sprint", "developer")

@pytest.fixture
def sm_token(client):
    return register_and_login(client, "sm_sprint", "scrum_master")

@pytest.fixture
def po_token(client):
    return register_and_login(client, "po_sprint", "product_owner")

@pytest.fixture
def backlog_item_id(client, po_token):
    response = client.post("/items", json={
        "type": "task",
        "title": "Test Item for Sprint",
        "description": "Test Description",
        "story_points": 3
    }, headers={"Authorization": f"Bearer {po_token}"})
    return response.json()["id"]

def test_create_sprint_allowed_roles(client, sm_token, po_token, backlog_item_id):
    response = client.post("/sprints/", json={
        "goal": "Test Sprint Goal",
        "duration": 14,
        "backlog_items": [backlog_item_id]
    }, headers={"Authorization": f"Bearer {sm_token}"})
    assert response.status_code == 200
    assert response.json()["goal"] == "Test Sprint Goal"
    assert len(response.json()["backlog_items"]) == 1
    # PO can create too
    response2 = client.post("/sprints/", json={
        "goal": "PO Sprint",
        "duration": 7,
        "backlog_items": [backlog_item_id]
    }, headers={"Authorization": f"Bearer {po_token}"})
    assert response2.status_code == 200

def test_create_sprint_forbidden_for_dev(client, dev_token, backlog_item_id):
    response = client.post("/sprints/", json={
        "goal": "Dev Sprint",
        "duration": 7,
        "backlog_items": [backlog_item_id]
    }, headers={"Authorization": f"Bearer {dev_token}"})
    assert response.status_code == 403

def test_get_sprints(client, dev_token, sm_token, backlog_item_id):
    # Create a sprint first
    client.post("/sprints/", json={
        "goal": "Another Test Sprint",
        "duration": 7,
        "backlog_items": [backlog_item_id]
    }, headers={"Authorization": f"Bearer {sm_token}"})
    
    response = client.get("/sprints/", headers={"Authorization": f"Bearer {dev_token}"})
    assert response.status_code == 200
    assert len(response.json()) > 0

def test_add_and_remove_item_and_burndown(client, sm_token, po_token, dev_token, backlog_item_id):
    # SM creates sprint with no items
    sp_resp = client.post("/sprints/", json={
        "goal": "BD Sprint",
        "duration": 7,
        "backlog_items": []
    }, headers={"Authorization": f"Bearer {sm_token}"})
    assert sp_resp.status_code == 200
    sprint_id = sp_resp.json()["id"]

    # SM adds item to sprint (allowed)
    add_resp = client.post(f"/sprints/{sprint_id}/items/{backlog_item_id}", headers={"Authorization": f"Bearer {sm_token}"})
    assert add_resp.status_code == 200
    assert backlog_item_id in add_resp.json()["backlog_items"]

    # Dev can read burndown (read-only)
    bd_resp = client.get(f"/sprints/{sprint_id}/burndown", headers={"Authorization": f"Bearer {dev_token}"})
    assert bd_resp.status_code == 200
    bd = bd_resp.json()
    assert bd["total"] >= 0
    assert bd["remaining"] >= 0

    # Dev cannot remove item
    rm_dev = client.delete(f"/sprints/{sprint_id}/items/{backlog_item_id}", headers={"Authorization": f"Bearer {dev_token}"})
    assert rm_dev.status_code == 403

    # PO can remove item
    rm_po = client.delete(f"/sprints/{sprint_id}/items/{backlog_item_id}", headers={"Authorization": f"Bearer {po_token}"})
    assert rm_po.status_code == 200
    assert backlog_item_id not in rm_po.json()["backlog_items"]