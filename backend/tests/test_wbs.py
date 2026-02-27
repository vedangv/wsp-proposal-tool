import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_list_wbs_requires_auth():
    fake_id = str(uuid.uuid4())
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(f"/api/proposals/{fake_id}/wbs/")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_wbs_for_unknown_proposal_returns_empty(auth_headers):
    fake_id = str(uuid.uuid4())
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(f"/api/proposals/{fake_id}/wbs/", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []
