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

@pytest.fixture
def auth_token(client):
    # Register a user
    client.post("/users/register", json={
        "username": "testsprint",
        "password": "testpass",
        "role": "developer"
    })
    
    # Login to get token
    response = client.post("/users/login", data={
        "username": "testsprint",
        "password": "testpass"
    })
    return response.json()["access_token"]

@pytest.fixture
def backlog_item_id(client, auth_token):
    response = client.post("/backlogs/", json={
        "title": "Test Item for Sprint",
        "description": "Test Description",
        "priority": 1,
        "story_points": 3
    }, headers={"Authorization": f"Bearer {auth_token}"})
    return response.json()["id"]

def test_create_sprint(client, auth_token, backlog_item_id):
    response = client.post("/sprints/", json={
        "goal": "Test Sprint Goal",
        "duration": 14,
        "backlog_items": [backlog_item_id]
    }, headers={"Authorization": f"Bearer {auth_token}"})
    assert response.status_code == 200
    assert response.json()["goal"] == "Test Sprint Goal"
    assert len(response.json()["backlog_items"]) == 1

def test_get_sprints(client, auth_token):
    # Create a sprint first
    item_response = client.post("/backlogs/", json={
        "title": "Another Test Item",
        "description": "Another Test Description",
        "priority": 2,
        "story_points": 5
    }, headers={"Authorization": f"Bearer {auth_token}"})
    item_id = item_response.json()["id"]
    
    client.post("/sprints/", json={
        "goal": "Another Test Sprint",
        "duration": 7,
        "backlog_items": [item_id]
    }, headers={"Authorization": f"Bearer {auth_token}"})
    
    response = client.get("/sprints/", headers={"Authorization": f"Bearer {auth_token}"})
    assert response.status_code == 200
    assert len(response.json()) > 0

def test_add_and_remove_item_and_burndown(client, auth_token):
    # create backlog item
    item_resp = client.post("/backlogs/", json={
        "title": "BD Item",
        "description": "For burndown",
        "priority": 1,
        "story_points": 8
    }, headers={"Authorization": f"Bearer {auth_token}"})
    assert item_resp.status_code == 200
    item_id = item_resp.json()["id"]

    # create sprint with no items
    sp_resp = client.post("/sprints/", json={
        "goal": "BD Sprint",
        "duration": 7,
        "backlog_items": []
    }, headers={"Authorization": f"Bearer {auth_token}"})
    assert sp_resp.status_code == 200
    sprint_id = sp_resp.json()["id"]

    # add item to sprint
    add_resp = client.post(f"/sprints/{sprint_id}/items/{item_id}", headers={"Authorization": f"Bearer {auth_token}"})
    assert add_resp.status_code == 200
    assert item_id in add_resp.json()["backlog_items"]

    # burndown should reflect remaining story points
    bd_resp = client.get(f"/sprints/{sprint_id}/burndown", headers={"Authorization": f"Bearer {auth_token}"})
    assert bd_resp.status_code == 200
    bd = bd_resp.json()
    assert bd["total"] >= 8
    assert bd["remaining"] >= 8

    # remove item from sprint
    rm_resp = client.delete(f"/sprints/{sprint_id}/items/{item_id}", headers={"Authorization": f"Bearer {auth_token}"})
    assert rm_resp.status_code == 200
    assert item_id not in rm_resp.json()["backlog_items"]