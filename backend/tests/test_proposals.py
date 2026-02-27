import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_list_proposals_requires_auth():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/proposals/")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_nonexistent_proposal_returns_404(auth_headers):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(
            "/api/proposals/00000000-0000-0000-0000-000000000000",
            headers=auth_headers,
        )
    assert response.status_code == 404
