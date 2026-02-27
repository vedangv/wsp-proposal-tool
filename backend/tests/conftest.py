import pytest
from app.auth.jwt import create_access_token
import uuid


@pytest.fixture
def auth_headers():
    token = create_access_token({"sub": str(uuid.uuid4())})
    return {"Authorization": f"Bearer {token}"}
