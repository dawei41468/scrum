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
    resp = client.post("/users/login", data={
        "username": username,
        "password": "testpass"
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]

@pytest.fixture
def dev_token(client):
    return register_and_login(client, "dev_backlog", "developer")

@pytest.fixture
def po_token(client):
    return register_and_login(client, "po_backlog", "product_owner")

def test_backlog_reads_allowed(client, dev_token):
    # Reads should be allowed for any authenticated user
    resp = client.get("/items", headers={"Authorization": f"Bearer {dev_token}"})
    assert resp.status_code == 200

def test_dev_cannot_create_backlog_item(client, dev_token):
    response = client.post("/items", json={
        "type": "task",
        "title": "Test Item",
        "description": "Test Description"
    }, headers={"Authorization": f"Bearer {dev_token}"})
    assert response.status_code == 403

def test_po_can_create_and_delete_backlog_item(client, po_token):
    create_resp = client.post("/items", json={
        "type": "task",
        "title": "PO Item",
        "description": "PO Description"
    }, headers={"Authorization": f"Bearer {po_token}"})
    assert create_resp.status_code == 200
    item_id = create_resp.json()["id"]

    del_resp = client.delete(f"/items/{item_id}", headers={"Authorization": f"Bearer {po_token}"})
    assert del_resp.status_code == 200

def test_status_only_update_allowed_for_dev(client, po_token, dev_token):
    # PO creates an item first
    create_resp = client.post("/items", json={
        "type": "task",
        "title": "Status Item",
        "description": "X"
    }, headers={"Authorization": f"Bearer {po_token}"})
    assert create_resp.status_code == 200
    item_id = create_resp.json()["id"]

    # Developer can update status
    up_resp = client.put(f"/items/{item_id}", json={"status": "in_progress"}, headers={"Authorization": f"Bearer {dev_token}"})
    assert up_resp.status_code == 200
    assert up_resp.json().get("status") in ("in_progress", "in_progress")

def test_non_status_update_forbidden_for_dev(client, po_token, dev_token):
    # PO creates an item
    create_resp = client.post("/items", json={
        "type": "task",
        "title": "Edit Guard",
        "description": "X"
    }, headers={"Authorization": f"Bearer {po_token}"})
    item_id = create_resp.json()["id"]

    # Dev tries to change title -> should be forbidden
    up_resp = client.put(f"/items/{item_id}", json={"title": "Hacked"}, headers={"Authorization": f"Bearer {dev_token}"})
    assert up_resp.status_code == 403