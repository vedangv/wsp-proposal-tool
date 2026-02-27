import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_login_with_invalid_credentials_returns_401():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/auth/login", json={
            "email": "nobody@wsp.com",
            "password": "wrong"
        })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_without_token_returns_403():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/auth/me")
    assert response.status_code == 403
