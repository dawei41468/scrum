import pytest
from datetime import datetime
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from app.main import app

# NOTE: We intentionally use FastAPI's synchronous TestClient here (see other tests
# like `test_user.py`, `test_comment.py`). This ensures the app lifespan and DB
# initialization run reliably under pytest. Prior async httpx-based clients caused
# intermittent 503s during /users/register because the lifespan wasn't engaged.
# Keeping this consistent avoids flakiness while exercising the same endpoints.
# Shared test data
test_users = {
    "developer": {"username": "testuser", "password": "testpass", "role": "developer"},
    "product_owner": {"username": "po_user", "password": "testpass", "role": "product_owner"}
}


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_headers(client):
    """Create test users and return auth headers"""
    # Register users
    for user_data in test_users.values():
        resp = client.post("/users/register", json=user_data)
        # 200 OK for new user, 400 if already exists between tests
        assert resp.status_code in (200, 400), f"register failed: {resp.status_code} {resp.text}"
    
    # Login and get tokens
    tokens = {}
    for role, user_data in test_users.items():
        response = client.post(
            "/users/login",
            data={
                "username": user_data["username"],
                "password": user_data["password"],
                "scope": "",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert response.status_code == 200, f"login failed: {response.status_code} {response.text}"
        token = response.json()["access_token"]
        tokens[role] = {"Authorization": f"Bearer {token}"}
    
    return tokens


@pytest.fixture
def test_story(client, auth_headers):
    """Create a test story"""
    response = client.post("/stories/", 
        json={
            "title": "Test Story",
            "description": "Test description",
            "story_points": 0
        },
        headers=auth_headers["product_owner"]
    )
    return response.json()


def test_create_planning_session(client, auth_headers, test_story):
    """Test creating a planning poker session"""
    response = client.post("/planning/sessions", 
        json={
            "story_id": test_story["id"],
            "scale": "fibonacci"
        },
        headers=auth_headers["developer"]
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["story_id"] == test_story["id"]
    assert data["status"] == "voting"
    assert data["scale"] == "fibonacci"
    assert data["vote_count"] == 0
    assert data["votes_revealed"] is False


def test_create_session_story_not_found(client, auth_headers):
    """Test creating session for non-existent story"""
    response = client.post("/planning/sessions", 
        json={
            "story_id": "507f1f77bcf86cd799439011",
            "scale": "fibonacci"
        },
        headers=auth_headers["developer"]
    )
    
    assert response.status_code == 404
    assert "Story not found" in response.json()["detail"]


def test_create_duplicate_active_session(client, auth_headers, test_story):
    """Test preventing duplicate active sessions"""
    # Create first session
    client.post("/planning/sessions", 
        json={"story_id": test_story["id"], "scale": "fibonacci"},
        headers=auth_headers["developer"]
    )
    
    # Try to create second session
    response = client.post("/planning/sessions", 
        json={"story_id": test_story["id"], "scale": "fibonacci"},
        headers=auth_headers["product_owner"]
    )
    
    assert response.status_code == 400
    assert "Active planning session already exists" in response.json()["detail"]


def test_get_planning_session(client, auth_headers, test_story):
    """Test getting planning session details"""
    # Create session
    create_response = client.post("/planning/sessions", 
        json={"story_id": test_story["id"], "scale": "fibonacci"},
        headers=auth_headers["developer"]
    )
    session_id = create_response.json()["id"]
    
    # Get session
    response = client.get(f"/planning/sessions/{session_id}",
        headers=auth_headers["developer"]
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == session_id
    assert data["status"] == "voting"
    assert data["vote_count"] == 0


def test_submit_vote(client, auth_headers, test_story):
    """Test submitting a vote"""
    # Create session
    create_response = client.post("/planning/sessions", 
        json={"story_id": test_story["id"], "scale": "fibonacci"},
        headers=auth_headers["developer"]
    )
    session_id = create_response.json()["id"]
    
    # Submit vote
    response = client.post(f"/planning/sessions/{session_id}/vote",
        json={"value": "5"},
        headers=auth_headers["developer"]
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == session_id
    assert data["value"] == "5"
    assert "username" in data


def test_submit_invalid_vote(client, auth_headers, test_story):
    """Test submitting invalid vote value"""
    # Create session
    create_response = client.post("/planning/sessions", 
        json={"story_id": test_story["id"], "scale": "fibonacci"},
        headers=auth_headers["developer"]
    )
    session_id = create_response.json()["id"]
    
    # Submit invalid vote
    response = client.post(f"/planning/sessions/{session_id}/vote",
        json={"value": "99"},
        headers=auth_headers["developer"]
    )
    
    assert response.status_code == 400
    assert "Invalid vote value" in response.json()["detail"]


def test_update_existing_vote(client, auth_headers, test_story):
    """Test updating an existing vote"""
    # Create session
    create_response = client.post("/planning/sessions", 
        json={"story_id": test_story["id"], "scale": "fibonacci"},
        headers=auth_headers["developer"]
    )
    session_id = create_response.json()["id"]
    
    # Submit first vote
    client.post(f"/planning/sessions/{session_id}/vote",
        json={"value": "3"},
        headers=auth_headers["developer"]
    )
    
    # Update vote
    response = client.post(f"/planning/sessions/{session_id}/vote",
        json={"value": "8"},
        headers=auth_headers["developer"]
    )
    
    assert response.status_code == 200
    assert response.json()["value"] == "8"


def test_reveal_votes(client, auth_headers, test_story):
    """Test revealing votes"""
    # Create session
    create_response = client.post("/planning/sessions", 
        json={"story_id": test_story["id"], "scale": "fibonacci"},
        headers=auth_headers["developer"]
    )
    session_id = create_response.json()["id"]
    
    # Submit votes from both users
    client.post(f"/planning/sessions/{session_id}/vote",
        json={"value": "3"},
        headers=auth_headers["developer"]
    )
    client.post(f"/planning/sessions/{session_id}/vote",
        json={"value": "5"},
        headers=auth_headers["product_owner"]
    )
    
    # Reveal votes (as session creator)
    response = client.post(f"/planning/sessions/{session_id}/reveal",
        headers=auth_headers["developer"]
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == session_id
    assert len(data["votes"]) == 2
    assert data["average"] == 4.0
    assert data["median"] == "4.0"


def test_reveal_votes_unauthorized(client, auth_headers, test_story):
    """Test unauthorized vote reveal"""
    # Create session as developer
    create_response = client.post("/planning/sessions", 
        json={"story_id": test_story["id"], "scale": "fibonacci"},
        headers=auth_headers["developer"]
    )
    session_id = create_response.json()["id"]
    
    # Try to reveal as different user (should work for PO)
    response = client.post(f"/planning/sessions/{session_id}/reveal",
        headers=auth_headers["product_owner"]
    )
    
    assert response.status_code == 200  # PO can reveal


def test_set_final_estimate(client, auth_headers, test_story):
    """Test setting final estimate"""
    # Create session and reveal votes
    create_response = client.post("/planning/sessions", 
        json={"story_id": test_story["id"], "scale": "fibonacci"},
        headers=auth_headers["developer"]
    )
    session_id = create_response.json()["id"]
    
    client.post(f"/planning/sessions/{session_id}/vote",
        json={"value": "5"},
        headers=auth_headers["developer"]
    )
    
    client.post(f"/planning/sessions/{session_id}/reveal",
        headers=auth_headers["developer"]
    )
    
    # Set final estimate
    response = client.put(f"/planning/sessions/{session_id}/estimate",
        json={"final_estimate": "5"},
        headers=auth_headers["developer"]
    )
    
    assert response.status_code == 200
    assert response.json()["final_estimate"] == "5"
    
    # Verify story was updated
    story_response = client.get(f"/stories/{test_story['id']}",
        headers=auth_headers["developer"]
    )
    assert story_response.json()["story_points"] == 5


def test_session_not_found(client, auth_headers):
    """Test operations on non-existent session"""
    fake_id = "507f1f77bcf86cd799439011"
    
    response = client.get(f"/planning/sessions/{fake_id}",
        headers=auth_headers["developer"]
    )
    assert response.status_code == 404
    
    response = client.post(f"/planning/sessions/{fake_id}/vote",
        json={"value": "5"},
        headers=auth_headers["developer"]
    )
    assert response.status_code == 404
    
    response = client.post(f"/planning/sessions/{fake_id}/reveal",
        headers=auth_headers["developer"]
    )
    assert response.status_code == 404
