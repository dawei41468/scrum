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
        "username": "testbacklog",
        "password": "testpass",
        "role": "developer"
    })
    
    # Login to get token
    response = client.post("/users/login", data={
        "username": "testbacklog",
        "password": "testpass"
    })
    return response.json()["access_token"]

def test_create_backlog_item(client, auth_token):
    response = client.post("/backlogs/", json={
        "title": "Test Item",
        "description": "Test Description",
        "priority": 1,
        "story_points": 3
    }, headers={"Authorization": f"Bearer {auth_token}"})
    assert response.status_code == 200
    assert response.json()["title"] == "Test Item"

def test_get_backlog_items(client, auth_token):
    # Create an item first
    client.post("/backlogs/", json={
        "title": "Test Item 2",
        "description": "Test Description 2",
        "priority": 2,
        "story_points": 5
    }, headers={"Authorization": f"Bearer {auth_token}"})
    
    response = client.get("/backlogs/", headers={"Authorization": f"Bearer {auth_token}"})
    assert response.status_code == 200
    assert len(response.json()) > 0