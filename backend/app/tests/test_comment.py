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
        "username": "testcomment",
        "password": "testpass",
        "role": "developer"
    })
    
    # Login to get token
    response = client.post("/users/login", data={
        "username": "testcomment",
        "password": "testpass"
    })
    return response.json()["access_token"]

@pytest.fixture
def backlog_item_id(client, auth_token):
    response = client.post("/backlogs/", json={
        "title": "Test Item for Comment",
        "description": "Test Description",
        "priority": 1,
        "story_points": 3
    }, headers={"Authorization": f"Bearer {auth_token}"})
    return response.json()["id"]

def test_add_comment(client, auth_token, backlog_item_id):
    response = client.post("/comments/", json={
        "text": "This is a test comment",
        "item_id": backlog_item_id
    }, headers={"Authorization": f"Bearer {auth_token}"})
    assert response.status_code == 200
    assert response.json()["text"] == "This is a test comment"

def test_get_comments(client, auth_token, backlog_item_id):
    # Add a comment first
    client.post("/comments/", json={
        "text": "Another test comment",
        "item_id": backlog_item_id
    }, headers={"Authorization": f"Bearer {auth_token}"})
    
    response = client.get(f"/comments/{backlog_item_id}", headers={"Authorization": f"Bearer {auth_token}"})
    assert response.status_code == 200
    assert len(response.json()) > 0
    assert any(comment["text"] == "Another test comment" for comment in response.json())