import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock
from app.auth.jwt import create_access_token
from app.auth.deps import get_current_user
from app.db.session import get_db
from app.main import app
from app.models.user import User, UserRole


# A fake user returned by the overridden dependency in all auth-guarded tests
FAKE_USER_ID = uuid.uuid4()
fake_user = User(
    id=FAKE_USER_ID,
    name="Test User",
    email="test@wsp.com",
    role=UserRole.pm,
    password_hash="",
)


async def override_get_current_user():
    return fake_user


async def override_get_db():
    """Mock DB session that returns empty results for any scalar_one_or_none query."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_result.scalars.return_value.all.return_value = []

    session = AsyncMock()
    session.execute = AsyncMock(return_value=mock_result)
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.delete = AsyncMock()
    yield session


@pytest.fixture(autouse=False)
def auth_headers():
    """Returns headers with a valid JWT. Overrides auth + DB deps so no real DB hit occurs."""
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_db] = override_get_db
    token = create_access_token({"sub": str(FAKE_USER_ID)})
    yield {"Authorization": f"Bearer {token}"}
    app.dependency_overrides.clear()
