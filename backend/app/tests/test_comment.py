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
    # Register a user (developer) for commenting actions
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
def po_token(client):
    # Register product owner for creating backlog items
    client.post("/users/register", json={
        "username": "po_for_comments",
        "password": "testpass",
        "role": "product_owner"
    })
    response = client.post("/users/login", data={
        "username": "po_for_comments",
        "password": "testpass"
    })
    assert response.status_code == 200
    return response.json()["access_token"]

@pytest.fixture
def backlog_item_id(client, po_token):
    response = client.post("/items", json={
        "type": "task",
        "title": "Test Item for Comment",
        "description": "Test Description"
    }, headers={"Authorization": f"Bearer {po_token}"})
    return response.json()["id"]

# Additional fixtures and helpers for deletion tests
@pytest.fixture
def other_dev_token(client):
    client.post("/users/register", json={
        "username": "testcomment2",
        "password": "testpass",
        "role": "developer"
    })
    response = client.post("/users/login", data={
        "username": "testcomment2",
        "password": "testpass"
    })
    assert response.status_code == 200
    return response.json()["access_token"]


def _create_comment(client, token, item_id, text="tmp"):
    resp = client.post(
        "/comments/",
        json={"text": text, "item_id": item_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    return resp.json()["id"]

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

def test_delete_comment_by_author(client, auth_token, backlog_item_id):
    cid = _create_comment(client, auth_token, backlog_item_id, text="to delete by author")
    del_resp = client.delete(f"/comments/{cid}", headers={"Authorization": f"Bearer {auth_token}"})
    assert del_resp.status_code == 200
    # Verify gone
    get_resp = client.get(f"/comments/{backlog_item_id}", headers={"Authorization": f"Bearer {auth_token}"})
    assert get_resp.status_code == 200
    assert all(c["id"] != cid for c in get_resp.json())

def test_delete_comment_by_product_owner(client, auth_token, po_token, backlog_item_id):
    cid = _create_comment(client, auth_token, backlog_item_id, text="to delete by po")
    del_resp = client.delete(f"/comments/{cid}", headers={"Authorization": f"Bearer {po_token}"})
    assert del_resp.status_code == 200

def test_delete_comment_forbidden_other_user(client, auth_token, other_dev_token, backlog_item_id):
    cid = _create_comment(client, auth_token, backlog_item_id, text="forbidden delete")
    del_resp = client.delete(f"/comments/{cid}", headers={"Authorization": f"Bearer {other_dev_token}"})
    assert del_resp.status_code == 403

def test_delete_comment_not_found_on_second_delete(client, auth_token, backlog_item_id):
    cid = _create_comment(client, auth_token, backlog_item_id, text="delete twice")
    first = client.delete(f"/comments/{cid}", headers={"Authorization": f"Bearer {auth_token}"})
    assert first.status_code == 200
    second = client.delete(f"/comments/{cid}", headers={"Authorization": f"Bearer {auth_token}"})
    assert second.status_code == 404

def test_edit_comment_by_author(client, auth_token, backlog_item_id):
    cid = _create_comment(client, auth_token, backlog_item_id, text="orig")
    resp = client.patch(
        f"/comments/{cid}",
        json={"text": "edited by author"},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["text"] == "edited by author"

def test_edit_comment_by_product_owner(client, auth_token, po_token, backlog_item_id):
    cid = _create_comment(client, auth_token, backlog_item_id, text="orig2")
    resp = client.patch(
        f"/comments/{cid}",
        json={"text": "edited by po"},
        headers={"Authorization": f"Bearer {po_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["text"] == "edited by po"

def test_edit_comment_forbidden_other_user(client, auth_token, other_dev_token, backlog_item_id):
    cid = _create_comment(client, auth_token, backlog_item_id, text="orig3")
    resp = client.patch(
        f"/comments/{cid}",
        json={"text": "should be forbidden"},
        headers={"Authorization": f"Bearer {other_dev_token}"},
    )
    assert resp.status_code == 403

def test_edit_comment_not_found(client, auth_token):
    # Some random non-existent id (24-hex string)
    fake_id = "64b0c0ffee0ddfaced00d123"
    resp = client.patch(
        f"/comments/{fake_id}",
        json={"text": "nope"},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    # Our router checks existence first and returns 404
    assert resp.status_code == 404