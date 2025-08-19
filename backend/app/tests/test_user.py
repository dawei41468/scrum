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

def test_register_user(client):
    response = client.post("/users/register", json={
        "username": "testlogin",
        "password": "testpass",
        "role": "developer"
    })
    assert response.status_code == 200
    assert response.json()["username"] == "testlogin"

def test_login_user(client):
    # First register
    client.post("/users/register", json={
        "username": "testlogin",
        "password": "testpass",
        "role": "developer"
    })
    
    # Then login
    response = client.post("/users/login", data={
        "username": "testlogin",
        "password": "testpass"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()