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
    return register_and_login(client, "dev_h", "developer")

@pytest.fixture
def po_token(client):
    return register_and_login(client, "po_h", "product_owner")

@pytest.fixture
def epic_id(client, po_token):
    r = client.post("/epics/", json={
        "title": "Epic A",
        "description": "Desc",
        "labels": ["feat"]
    }, headers={"Authorization": f"Bearer {po_token}"})
    assert r.status_code == 200
    return r.json()["id"]

@pytest.fixture
def story_id(client, po_token, epic_id):
    r = client.post("/items/", json={
        "type": "story",
        "title": "Story 1",
        "epic_id": epic_id,
        "description": "S",
        "acceptance_criteria": ["AC1"],
        "labels": ["ui"],
        "story_points": 3
    }, headers={"Authorization": f"Bearer {po_token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["epic_id"] == epic_id
    return body["id"]

@pytest.fixture
def task_id(client, po_token, story_id):
    r = client.post("/items/", json={
        "type": "task",
        "title": "Task X",
        "story_id": story_id,
        "description": "T",
        "labels": ["dev"],
        "story_points": 2
    }, headers={"Authorization": f"Bearer {po_token}"})
    assert r.status_code == 200
    body = r.json()
    return body["id"]

@pytest.fixture
def subtask_id(client, po_token, task_id):
    r = client.post("/subtasks/", json={
        "title": "Subtask a",
        "parent_task_id": task_id,
        "description": "ST"
    }, headers={"Authorization": f"Bearer {po_token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["parent_task_id"] == task_id
    return body["id"]

# --- Read permissions ---

def test_reads_allowed(client, dev_token, epic_id, story_id, task_id, subtask_id):
    paths = [
        "/epics/",
        "/items/?type=story",
        "/items/?type=task",
        "/subtasks/",
    ]
    for path in paths:
        resp = client.get(path, headers={"Authorization": f"Bearer {dev_token}"})
        assert resp.status_code == 200

# --- Create RBAC ---

def test_dev_cannot_create(client, dev_token):
    assert client.post("/epics/", json={"title": "E"}, headers={"Authorization": f"Bearer {dev_token}"}).status_code == 403
    assert client.post("/items/", json={"type": "story", "title": "S"}, headers={"Authorization": f"Bearer {dev_token}"}).status_code == 403
    assert client.post("/items/", json={"type": "task", "title": "T"}, headers={"Authorization": f"Bearer {dev_token}"}).status_code == 403
    assert client.post("/subtasks/", json={"title": "ST"}, headers={"Authorization": f"Bearer {dev_token}"}).status_code == 403

# --- Status-only updates allowed for developer ---

def test_status_only_update_for_dev(client, po_token, dev_token, epic_id, story_id, task_id, subtask_id):
    # Dev can change status but not title
    for path, _id in [("/epics", epic_id), ("/items", story_id), ("/items", task_id), ("/subtasks", subtask_id)]:
        ok = client.put(f"{path}/{_id}", json={"status": "in_progress"}, headers={"Authorization": f"Bearer {dev_token}"})
        assert ok.status_code == 200
        bad = client.put(f"{path}/{_id}", json={"title": "Hacked"}, headers={"Authorization": f"Bearer {dev_token}"})
        assert bad.status_code == 403

# --- Delete with PO ---

def test_po_can_delete(client, po_token, epic_id, story_id, task_id, subtask_id):
    # delete subtask
    d1 = client.delete(f"/subtasks/{subtask_id}", headers={"Authorization": f"Bearer {po_token}"})
    assert d1.status_code == 200
    # delete task
    d2 = client.delete(f"/items/{task_id}", headers={"Authorization": f"Bearer {po_token}"})
    assert d2.status_code == 200
    # delete story
    d3 = client.delete(f"/items/{story_id}", headers={"Authorization": f"Bearer {po_token}"})
    assert d3.status_code == 200
    # delete epic
    d4 = client.delete(f"/epics/{epic_id}", headers={"Authorization": f"Bearer {po_token}"})
    assert d4.status_code == 200
