"""Tests for authentication endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    """Should create a new user and return a JWT token with correct user data."""
    response = await client.post("/api/auth/register", json={
        "username": "testuser",
        "password": "test123456",
    })
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "testuser"
    assert data["user"]["role"] == "user"


@pytest.mark.asyncio
async def test_register_duplicate_username(client: AsyncClient):
    """Should return 409 Conflict when the username already exists."""
    await client.post("/api/auth/register", json={
        "username": "dupeuser", "password": "test123456",
    })
    response = await client.post("/api/auth/register", json={
        "username": "dupeuser", "password": "test123456",
    })
    assert response.status_code == 409
    assert "already taken" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """Should authenticate a registered user and return a valid JWT."""
    # Register first
    await client.post("/api/auth/register", json={
        "username": "loginuser", "password": "test123456",
    })
    # Then login
    response = await client.post("/api/auth/login", json={
        "username": "loginuser", "password": "test123456",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["username"] == "loginuser"
    assert data["user"]["role"] == "user"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    """Should return 401 when password is incorrect."""
    await client.post("/api/auth/register", json={
        "username": "badpw", "password": "correctpw",
    })
    response = await client.post("/api/auth/login", json={
        "username": "badpw", "password": "wrongpw",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    """Should return 401 when the user does not exist."""
    response = await client.post("/api/auth/login", json={
        "username": "ghostuser", "password": "whatever",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_requires_auth(client: AsyncClient):
    """Should reject unauthenticated requests with 401."""
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_with_valid_token(client: AsyncClient):
    """Should return the user profile when a valid token is provided."""
    register_resp = await client.post("/api/auth/register", json={
        "username": "profileuser", "password": "test123456",
    })
    token = register_resp.json()["access_token"]

    response = await client.get("/api/auth/me", headers={
        "Authorization": f"Bearer {token}",
    })
    assert response.status_code == 200
    assert response.json()["username"] == "profileuser"


@pytest.mark.asyncio
async def test_change_password(client: AsyncClient):
    """Should successfully change password and allow login with new password."""
    # Register
    register_resp = await client.post("/api/auth/register", json={
        "username": "changepw", "password": "oldpass123",
    })
    token = register_resp.json()["access_token"]

    # Change password
    response = await client.put("/api/auth/change-password", json={
        "old_password": "oldpass123",
        "new_password": "newpass456",
    }, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 204

    # Old password should fail
    old_login = await client.post("/api/auth/login", json={
        "username": "changepw", "password": "oldpass123",
    })
    assert old_login.status_code == 401

    # New password should work
    new_login = await client.post("/api/auth/login", json={
        "username": "changepw", "password": "newpass456",
    })
    assert new_login.status_code == 200


@pytest.mark.asyncio
async def test_regular_user_cannot_access_admin_endpoint(client: AsyncClient):
    """Should reject non-admin users from admin-only routes."""
    # Register as regular user
    register_resp = await client.post("/api/auth/register", json={
        "username": "regularuser", "password": "test123456",
    })
    token = register_resp.json()["access_token"]

    # Try to access admin endpoint
    response = await client.get("/api/kb/documents", headers={
        "Authorization": f"Bearer {token}",
    })
    assert response.status_code == 403
