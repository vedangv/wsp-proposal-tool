# WSP Proposal Management Tool — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a real-time collaborative web app replacing the WSP SharePoint RFP spreadsheet, with 7 proposal tabs (WBS, Pricing, People, Schedule/Gantt, Deliverables, Drawing List, Overview), agent API hooks, and a one-command Docker Compose PoC.

**Architecture:** React + TypeScript SPA calling a Python FastAPI backend via REST and WebSockets. PostgreSQL stores all structured proposal data with WBS as the source of truth. JWT auth with seeded demo users stands in for production Entra ID SSO.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic, asyncpg, python-jose, passlib, pytest, httpx | React 18, TypeScript, Vite, TailwindCSS 3, TanStack Query v5, frappe-gantt, vitest, React Testing Library | PostgreSQL 15, Docker Compose

---

## Sprint 1 — Scaffolding, Auth, Proposal List

---

### Task 1: Docker Compose and project skeleton

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/Dockerfile`
- Create: `backend/requirements.txt`
- Create: `frontend/Dockerfile`
- Create: `.gitignore`

**Step 1: Create `.gitignore`**

```
# Python
__pycache__/
*.pyc
.venv/
.env

# Node
node_modules/
dist/

# Docker
*.log
```

**Step 2: Create `backend/requirements.txt`**

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy[asyncio]==2.0.36
asyncpg==0.30.0
alembic==1.13.3
pydantic==2.9.2
pydantic-settings==2.6.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.12
httpx==0.27.2
pytest==8.3.3
pytest-asyncio==0.24.0
pytest-cov==5.0.0
```

**Step 3: Create `backend/Dockerfile`**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

**Step 4: Create `frontend/Dockerfile`**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev", "--", "--host"]
```

**Step 5: Create `docker-compose.yml`**

```yaml
version: "3.9"

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: wsp
      POSTGRES_PASSWORD: wsp
      POSTGRES_DB: wsp_proposals
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://wsp:wsp@db:5432/wsp_proposals
      SECRET_KEY: dev-secret-key-change-in-production
      ALGORITHM: HS256
      ACCESS_TOKEN_EXPIRE_MINUTES: 480
    depends_on:
      - db
    volumes:
      - ./backend:/app

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      VITE_API_URL: http://localhost:8000
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules

volumes:
  pgdata:
```

**Step 6: Commit**

```bash
git add docker-compose.yml backend/Dockerfile backend/requirements.txt frontend/Dockerfile .gitignore
git commit -m "chore: add Docker Compose scaffold and Dockerfiles"
```

---

### Task 2: FastAPI app skeleton with health endpoint

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_health.py`

**Step 1: Write the failing test**

Create `backend/tests/test_health.py`:

```python
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_returns_ok():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

**Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_health.py -v
```
Expected: `ModuleNotFoundError` or `ImportError` — app doesn't exist yet.

**Step 3: Create `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://wsp:wsp@localhost:5432/wsp_proposals"
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    class Config:
        env_file = ".env"


settings = Settings()
```

**Step 4: Create `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="WSP Proposal Tool", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}
```

**Step 5: Run test to verify it passes**

```bash
cd backend && python -m pytest tests/test_health.py -v
```
Expected: `PASSED`

**Step 6: Commit**

```bash
git add backend/app/ backend/tests/
git commit -m "feat: FastAPI skeleton with health endpoint and test"
```

---

### Task 3: Database connection and SQLAlchemy setup

**Files:**
- Create: `backend/app/db/__init__.py`
- Create: `backend/app/db/session.py`
- Create: `backend/app/db/base.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`

**Step 1: Create `backend/app/db/session.py`**

```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.config import settings

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```

**Step 2: Create `backend/app/db/base.py`**

```python
from sqlalchemy.orm import DeclarativeBase
import uuid
from sqlalchemy import Column, DateTime, func
from sqlalchemy.dialects.postgresql import UUID


class Base(DeclarativeBase):
    pass


def uuid_pk():
    return Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
```

**Step 3: Initialize Alembic**

```bash
cd backend && alembic init alembic
```

**Step 4: Edit `backend/alembic/env.py`** — replace the `target_metadata` section:

```python
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db.base import Base
from app import models  # noqa — ensures all models are imported
from app.config import settings

# ... existing alembic boilerplate ...

target_metadata = Base.metadata

# Update the run_migrations_online function to use the sync URL:
def get_url():
    return settings.database_url.replace("+asyncpg", "+psycopg2")
```

Note: Alembic needs a sync driver for migrations. Add `psycopg2-binary` to `requirements.txt`.

**Step 5: Add psycopg2 to requirements**

Add to `backend/requirements.txt`:
```
psycopg2-binary==2.9.10
```

**Step 6: Commit**

```bash
git add backend/app/db/ backend/alembic.ini backend/alembic/ backend/requirements.txt
git commit -m "feat: SQLAlchemy async session and Alembic setup"
```

---

### Task 4: User and Proposal models + initial migration

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/proposal.py`
- Create: `backend/tests/test_models.py`

**Step 1: Create `backend/app/models/user.py`**

```python
import uuid
import enum
from sqlalchemy import Column, String, Enum
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class UserRole(str, enum.Enum):
    pm = "pm"
    finance = "finance"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.pm)
    password_hash = Column(String, nullable=False)
```

**Step 2: Create `backend/app/models/proposal.py`**

```python
import uuid
import enum
from sqlalchemy import Column, String, Enum, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class ProposalStatus(str, enum.Enum):
    draft = "draft"
    in_review = "in_review"
    submitted = "submitted"


class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_number = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    client_name = Column(String)
    status = Column(Enum(ProposalStatus), nullable=False, default=ProposalStatus.draft)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

**Step 3: Create `backend/app/models/__init__.py`**

```python
from app.models.user import User, UserRole
from app.models.proposal import Proposal, ProposalStatus

__all__ = ["User", "UserRole", "Proposal", "ProposalStatus"]
```

**Step 4: Generate migration**

```bash
cd backend && alembic revision --autogenerate -m "create users and proposals tables"
```
Expected: new file in `alembic/versions/`.

**Step 5: Apply migration (requires DB running)**

```bash
docker-compose up -d db
cd backend && alembic upgrade head
```
Expected: `Running upgrade -> <hash>, create users and proposals tables`

**Step 6: Write a model test**

Create `backend/tests/test_models.py`:

```python
import pytest
from app.models.user import UserRole
from app.models.proposal import ProposalStatus


def test_user_role_values():
    assert set(UserRole) == {UserRole.pm, UserRole.finance, UserRole.admin}


def test_proposal_status_values():
    assert set(ProposalStatus) == {
        ProposalStatus.draft, ProposalStatus.in_review, ProposalStatus.submitted
    }
```

**Step 7: Run test**

```bash
cd backend && python -m pytest tests/test_models.py -v
```
Expected: `PASSED`

**Step 8: Commit**

```bash
git add backend/app/models/ backend/alembic/
git commit -m "feat: User and Proposal models with initial Alembic migration"
```

---

### Task 5: JWT authentication endpoints

**Files:**
- Create: `backend/app/auth/__init__.py`
- Create: `backend/app/auth/jwt.py`
- Create: `backend/app/auth/deps.py`
- Create: `backend/app/schemas/auth.py`
- Create: `backend/app/routes/auth.py`
- Create: `backend/tests/test_auth.py`

**Step 1: Create `backend/app/auth/jwt.py`**

```python
from datetime import datetime, timedelta
from jose import jwt, JWTError
from app.config import settings


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
```

**Step 2: Create `backend/app/schemas/auth.py`**

```python
from pydantic import BaseModel
from enum import Enum


class UserRole(str, Enum):
    pm = "pm"
    finance = "finance"
    admin = "admin"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: str
    password: str
```

**Step 3: Create `backend/app/auth/deps.py`**

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.auth.jwt import decode_token
from app.db.session import get_db
from app.models.user import User

bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = decode_token(credentials.credentials)
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return user
```

**Step 4: Create `backend/app/routes/auth.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserOut
from app.auth.jwt import create_access_token
from app.auth.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not pwd_context.verify(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
```

**Step 5: Register router in `backend/app/main.py`**

```python
from app.routes import auth

app.include_router(auth.router)
```

**Step 6: Write failing auth tests**

Create `backend/tests/test_auth.py`:

```python
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
```

**Step 7: Run tests**

```bash
cd backend && python -m pytest tests/test_auth.py -v
```
Expected: Both `PASSED` (no real DB needed for these cases).

**Step 8: Commit**

```bash
git add backend/app/auth/ backend/app/schemas/ backend/app/routes/
git commit -m "feat: JWT auth endpoints (login, me)"
```

---

### Task 6: Seed demo users

**Files:**
- Create: `backend/app/db/seed.py`
- Modify: `backend/app/main.py`

**Step 1: Create `backend/app/db/seed.py`**

```python
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User, UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_USERS = [
    {"name": "Alice PM", "email": "alice@wsp.com", "password": "demo123", "role": UserRole.pm},
    {"name": "Bob Finance", "email": "bob@wsp.com", "password": "demo123", "role": UserRole.finance},
    {"name": "Carol Admin", "email": "carol@wsp.com", "password": "demo123", "role": UserRole.admin},
]


async def seed_users(db: AsyncSession):
    for user_data in DEMO_USERS:
        result = await db.execute(select(User).where(User.email == user_data["email"]))
        if result.scalar_one_or_none():
            continue
        user = User(
            name=user_data["name"],
            email=user_data["email"],
            role=user_data["role"],
            password_hash=pwd_context.hash(user_data["password"]),
        )
        db.add(user)
    await db.commit()
```

**Step 2: Call seed on startup in `backend/app/main.py`**

```python
from contextlib import asynccontextmanager
from app.db.session import AsyncSessionLocal
from app.db.seed import seed_users


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncSessionLocal() as db:
        await seed_users(db)
    yield

app = FastAPI(title="WSP Proposal Tool", version="0.1.0", lifespan=lifespan)
```

**Step 3: Verify seeding works**

```bash
docker-compose up -d db backend
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@wsp.com", "password": "demo123"}'
```
Expected: JSON with `access_token`.

**Step 4: Commit**

```bash
git add backend/app/db/seed.py backend/app/main.py
git commit -m "feat: seed demo users on startup (alice, bob, carol)"
```

---

### Task 7: Proposals CRUD API

**Files:**
- Create: `backend/app/schemas/proposal.py`
- Create: `backend/app/routes/proposals.py`
- Create: `backend/tests/test_proposals.py`

**Step 1: Create `backend/app/schemas/proposal.py`**

```python
from pydantic import BaseModel
from enum import Enum
from datetime import datetime
from typing import Optional
import uuid


class ProposalStatus(str, Enum):
    draft = "draft"
    in_review = "in_review"
    submitted = "submitted"


class ProposalCreate(BaseModel):
    proposal_number: str
    title: str
    client_name: Optional[str] = None
    status: ProposalStatus = ProposalStatus.draft


class ProposalUpdate(BaseModel):
    title: Optional[str] = None
    client_name: Optional[str] = None
    status: Optional[ProposalStatus] = None


class ProposalOut(BaseModel):
    id: uuid.UUID
    proposal_number: str
    title: str
    client_name: Optional[str]
    status: ProposalStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
```

**Step 2: Create `backend/app/routes/proposals.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.proposal import Proposal
from app.models.user import User
from app.schemas.proposal import ProposalCreate, ProposalUpdate, ProposalOut
from app.auth.deps import get_current_user
from typing import List
import uuid

router = APIRouter(prefix="/api/proposals", tags=["proposals"])


@router.get("/", response_model=List[ProposalOut])
async def list_proposals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Proposal).order_by(Proposal.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=ProposalOut, status_code=201)
async def create_proposal(
    body: ProposalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proposal = Proposal(**body.model_dump(), created_by=current_user.id)
    db.add(proposal)
    await db.commit()
    await db.refresh(proposal)
    return proposal


@router.get("/{proposal_id}", response_model=ProposalOut)
async def get_proposal(
    proposal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Proposal).where(Proposal.id == proposal_id))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return proposal


@router.patch("/{proposal_id}", response_model=ProposalOut)
async def update_proposal(
    proposal_id: uuid.UUID,
    body: ProposalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Proposal).where(Proposal.id == proposal_id))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(proposal, field, value)
    await db.commit()
    await db.refresh(proposal)
    return proposal
```

**Step 3: Register router in `main.py`**

```python
from app.routes import proposals
app.include_router(proposals.router)
```

**Step 4: Write failing tests**

Create `backend/tests/test_proposals.py`:

```python
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
```

Add `backend/tests/conftest.py`:

```python
import pytest
from app.auth.jwt import create_access_token
import uuid


@pytest.fixture
def auth_headers():
    token = create_access_token({"sub": str(uuid.uuid4())})
    return {"Authorization": f"Bearer {token}"}
```

**Step 5: Run tests**

```bash
cd backend && python -m pytest tests/test_proposals.py -v
```
Expected: Both `PASSED`.

**Step 6: Generate and apply migration for proposal model**

```bash
cd backend && alembic revision --autogenerate -m "proposals table already exists - no-op if rerun"
alembic upgrade head
```

**Step 7: Commit**

```bash
git add backend/app/routes/proposals.py backend/app/schemas/proposal.py backend/tests/
git commit -m "feat: proposals CRUD API with auth guard"
```

---

### Task 8: React + Vite + TailwindCSS frontend scaffold

**Files:**
- Create: `frontend/` (via Vite CLI)

**Step 1: Scaffold React app**

```bash
cd frontend && npm create vite@latest . -- --template react-ts
npm install
```

**Step 2: Install dependencies**

```bash
npm install tailwindcss@3 postcss autoprefixer
npm install @tanstack/react-query axios react-router-dom
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom
npx tailwindcss init -p
```

**Step 3: Configure TailwindCSS — edit `frontend/tailwind.config.js`**

```js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

**Step 4: Edit `frontend/src/index.css`** — replace with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 5: Create `frontend/src/api/client.ts`**

```typescript
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

**Step 6: Write a smoke test**

Create `frontend/src/api/client.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import api from "./client";

describe("api client", () => {
  it("has correct baseURL", () => {
    expect(api.defaults.baseURL).toBe("http://localhost:8000");
  });
});
```

**Step 7: Configure vitest in `frontend/vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    globals: true,
  },
});
```

Create `frontend/src/test-setup.ts`:

```typescript
import "@testing-library/jest-dom";
```

**Step 8: Run frontend tests**

```bash
cd frontend && npx vitest run
```
Expected: `PASSED`

**Step 9: Commit**

```bash
git add frontend/
git commit -m "feat: React + Vite + TailwindCSS scaffold with API client"
```

---

### Task 9: Login page and auth context

**Files:**
- Create: `frontend/src/context/AuthContext.tsx`
- Create: `frontend/src/pages/LoginPage.tsx`
- Create: `frontend/src/App.tsx`

**Step 1: Create `frontend/src/context/AuthContext.tsx`**

```typescript
import { createContext, useContext, useState, ReactNode } from "react";
import api from "../api/client";

interface User { id: string; name: string; email: string; role: string; }
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  async function login(email: string, password: string) {
    const { data } = await api.post("/api/auth/login", { email, password });
    localStorage.setItem("token", data.access_token);
    const { data: me } = await api.get("/api/auth/me");
    setUser(me);
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
```

**Step 2: Create `frontend/src/pages/LoginPage.tsx`**

```typescript
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("alice@wsp.com");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/proposals");
    } catch {
      setError("Invalid credentials");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white shadow rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">WSP Proposal Tool</h1>
        <p className="text-gray-500 text-sm mb-6">Sign in to continue</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" required
          />
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700"
          >
            Sign In
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-4">
          Demo: alice@wsp.com / bob@wsp.com / carol@wsp.com — password: demo123
        </p>
      </div>
    </div>
  );
}
```

**Step 3: Create `frontend/src/App.tsx`**

```typescript
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

**Step 4: Verify manually**

```bash
docker-compose up
```
Open http://localhost:3000 — login form appears, sign in with `alice@wsp.com / demo123`.

**Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: login page and auth context"
```

---

### Task 10: Proposals list page

**Files:**
- Create: `frontend/src/pages/ProposalsPage.tsx`
- Create: `frontend/src/api/proposals.ts`
- Modify: `frontend/src/App.tsx`

**Step 1: Create `frontend/src/api/proposals.ts`**

```typescript
import api from "./client";

export interface Proposal {
  id: string;
  proposal_number: string;
  title: string;
  client_name: string | null;
  status: "draft" | "in_review" | "submitted";
  created_at: string;
  updated_at: string;
}

export const proposalsApi = {
  list: () => api.get<Proposal[]>("/api/proposals/").then(r => r.data),
  create: (data: Omit<Proposal, "id" | "created_at" | "updated_at">) =>
    api.post<Proposal>("/api/proposals/", data).then(r => r.data),
  get: (id: string) => api.get<Proposal>(`/api/proposals/${id}`).then(r => r.data),
};
```

**Step 2: Create `frontend/src/pages/ProposalsPage.tsx`**

```typescript
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { proposalsApi } from "../api/proposals";
import { useAuth } from "../context/AuthContext";

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-700",
  in_review: "bg-yellow-100 text-yellow-700",
  submitted: "bg-green-100 text-green-700",
};

export default function ProposalsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ proposal_number: "", title: "", client_name: "" });

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: proposalsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: proposalsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["proposals"] }); setShowForm(false); },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-700">WSP Proposal Tool</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.name}</span>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-800">Sign out</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Proposals</h2>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >+ New Proposal</button>
        </div>

        {showForm && (
          <div className="bg-white border rounded-lg p-4 mb-4 grid grid-cols-3 gap-3">
            <input className="border rounded px-3 py-1.5 text-sm" placeholder="Proposal #" value={form.proposal_number} onChange={e => setForm(f => ({...f, proposal_number: e.target.value}))} />
            <input className="border rounded px-3 py-1.5 text-sm" placeholder="Title" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} />
            <input className="border rounded px-3 py-1.5 text-sm" placeholder="Client Name" value={form.client_name} onChange={e => setForm(f => ({...f, client_name: e.target.value}))} />
            <div className="col-span-3 flex gap-2">
              <button onClick={() => createMutation.mutate({ ...form, status: "draft" })} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm">Create</button>
              <button onClick={() => setShowForm(false)} className="border px-4 py-1.5 rounded text-sm">Cancel</button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Proposal #</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Title</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Client</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {proposals.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/proposals/${p.id}`)}>
                    <td className="px-4 py-3 font-mono text-blue-600">{p.proposal_number}</td>
                    <td className="px-4 py-3">{p.title}</td>
                    <td className="px-4 py-3 text-gray-500">{p.client_name || "—"}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>{p.status}</span></td>
                    <td className="px-4 py-3 text-gray-400">{new Date(p.updated_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {proposals.length === 0 && <p className="text-center py-12 text-gray-400">No proposals yet. Create one.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
```

**Step 3: Add route in `App.tsx`**

```typescript
import ProposalsPage from "./pages/ProposalsPage";

// Add to Routes:
<Route path="/proposals" element={<ProposalsPage />} />
```

**Step 4: Manual verification**

Open http://localhost:3000, log in, create a proposal, verify it appears in the table.

**Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: proposals list page with create form"
```

---

## Sprint 2 — Proposal Detail Shell + WBS Tab

---

### Task 11: All remaining data models + migration

**Files:**
- Create: `backend/app/models/wbs.py`
- Create: `backend/app/models/pricing.py`
- Create: `backend/app/models/people.py`
- Create: `backend/app/models/scope.py`
- Create: `backend/app/models/schedule.py`
- Create: `backend/app/models/deliverable.py`
- Create: `backend/app/models/drawing.py`
- Modify: `backend/app/models/__init__.py`

**Step 1: Create `backend/app/models/wbs.py`**

```python
import uuid
import enum
from sqlalchemy import Column, String, Numeric, Integer, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class WBSItem(Base):
    __tablename__ = "wbs_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    wbs_code = Column(String, nullable=False)
    description = Column(String)
    phase = Column(String)
    hours = Column(Numeric(10, 2), default=0)
    unit_rate = Column(Numeric(10, 2), default=0)
    order_index = Column(Integer, default=0)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

**Step 2: Create `backend/app/models/pricing.py`**

```python
import uuid
from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base


class PricingRow(Base):
    __tablename__ = "pricing_rows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    wbs_id = Column(UUID(as_uuid=True), ForeignKey("wbs_items.id", ondelete="SET NULL"), nullable=True)
    role_title = Column(String)
    staff_name = Column(String)
    grade = Column(String)
    hourly_rate = Column(Numeric(10, 2), default=0)
    hours_by_phase = Column(JSONB, default=dict)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

**Step 3: Create `backend/app/models/people.py`**

```python
import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class ProposedPerson(Base):
    __tablename__ = "proposed_people"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_name = Column(String, nullable=False)
    employee_id = Column(String)
    role_on_project = Column(String)
    years_experience = Column(Integer)
    cv_path = Column(String, nullable=True)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

**Step 4: Create `backend/app/models/scope.py`**

```python
import uuid
from sqlalchemy import Column, String, Text, Integer, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class ScopeSection(Base):
    __tablename__ = "scope_sections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    section_name = Column(String, nullable=False)
    content = Column(Text, default="")
    order_index = Column(Integer, default=0)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

**Step 5: Create `backend/app/models/schedule.py`**

```python
import uuid
from sqlalchemy import Column, String, Boolean, Date, ForeignKey, DateTime, func, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class ScheduleItem(Base):
    __tablename__ = "schedule_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    wbs_id = Column(UUID(as_uuid=True), ForeignKey("wbs_items.id", ondelete="SET NULL"), nullable=True)
    task_name = Column(String, nullable=False)
    start_date = Column(Date)
    end_date = Column(Date)
    responsible_party = Column(String)
    is_milestone = Column(Boolean, default=False)
    phase = Column(String)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

**Step 6: Create `backend/app/models/deliverable.py`**

```python
import uuid
import enum
from sqlalchemy import Column, String, Text, Date, ForeignKey, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class DeliverableType(str, enum.Enum):
    report = "report"
    model = "model"
    specification = "specification"
    drawing_package = "drawing_package"
    other = "other"


class DeliverableStatus(str, enum.Enum):
    tbd = "tbd"
    in_progress = "in_progress"
    complete = "complete"


class Deliverable(Base):
    __tablename__ = "deliverables"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    wbs_id = Column(UUID(as_uuid=True), ForeignKey("wbs_items.id", ondelete="SET NULL"), nullable=True)
    deliverable_ref = Column(String)
    title = Column(String, nullable=False)
    type = Column(Enum(DeliverableType), default=DeliverableType.other)
    description = Column(Text)
    due_date = Column(Date)
    responsible_party = Column(String)
    status = Column(Enum(DeliverableStatus), default=DeliverableStatus.tbd)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

**Step 7: Create `backend/app/models/drawing.py`**

```python
import uuid
import enum
from sqlalchemy import Column, String, Date, ForeignKey, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class DrawingFormat(str, enum.Enum):
    pdf = "pdf"
    dwg = "dwg"
    revit = "revit"
    other = "other"


class DrawingStatus(str, enum.Enum):
    tbd = "tbd"
    in_progress = "in_progress"
    complete = "complete"


class Drawing(Base):
    __tablename__ = "drawings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    wbs_id = Column(UUID(as_uuid=True), ForeignKey("wbs_items.id", ondelete="SET NULL"), nullable=True)
    deliverable_id = Column(UUID(as_uuid=True), ForeignKey("deliverables.id", ondelete="SET NULL"), nullable=True)
    drawing_number = Column(String)
    title = Column(String, nullable=False)
    discipline = Column(String)
    scale = Column(String)
    format = Column(Enum(DrawingFormat), default=DrawingFormat.pdf)
    due_date = Column(Date)
    responsible_party = Column(String)
    revision = Column(String)
    status = Column(Enum(DrawingStatus), default=DrawingStatus.tbd)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

**Step 8: Update `backend/app/models/__init__.py`**

```python
from app.models.user import User, UserRole
from app.models.proposal import Proposal, ProposalStatus
from app.models.wbs import WBSItem
from app.models.pricing import PricingRow
from app.models.people import ProposedPerson
from app.models.scope import ScopeSection
from app.models.schedule import ScheduleItem
from app.models.deliverable import Deliverable, DeliverableType, DeliverableStatus
from app.models.drawing import Drawing, DrawingFormat, DrawingStatus
```

**Step 9: Generate and apply migration**

```bash
cd backend && alembic revision --autogenerate -m "add all proposal section tables"
alembic upgrade head
```

**Step 10: Commit**

```bash
git add backend/app/models/ backend/alembic/
git commit -m "feat: add all proposal section models and migration"
```

---

### Task 12: WBS CRUD API

**Files:**
- Create: `backend/app/schemas/wbs.py`
- Create: `backend/app/routes/wbs.py`
- Create: `backend/tests/test_wbs.py`

**Step 1: Create `backend/app/schemas/wbs.py`**

```python
from pydantic import BaseModel
from typing import Optional
import uuid
from decimal import Decimal


class WBSItemCreate(BaseModel):
    wbs_code: str
    description: Optional[str] = None
    phase: Optional[str] = None
    hours: Decimal = Decimal("0")
    unit_rate: Decimal = Decimal("0")
    order_index: int = 0


class WBSItemUpdate(BaseModel):
    wbs_code: Optional[str] = None
    description: Optional[str] = None
    phase: Optional[str] = None
    hours: Optional[Decimal] = None
    unit_rate: Optional[Decimal] = None
    order_index: Optional[int] = None


class WBSItemOut(BaseModel):
    id: uuid.UUID
    proposal_id: uuid.UUID
    wbs_code: str
    description: Optional[str]
    phase: Optional[str]
    hours: Decimal
    unit_rate: Decimal
    total_cost: Decimal

    model_config = {"from_attributes": True}

    @property
    def total_cost(self) -> Decimal:
        return self.hours * self.unit_rate
```

Note: `total_cost` is computed in the schema, not stored in DB.

**Step 2: Create `backend/app/routes/wbs.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.wbs import WBSItem
from app.models.user import User
from app.schemas.wbs import WBSItemCreate, WBSItemUpdate, WBSItemOut
from app.auth.deps import get_current_user
from typing import List
import uuid

router = APIRouter(prefix="/api/proposals/{proposal_id}/wbs", tags=["wbs"])


@router.get("/", response_model=List[WBSItemOut])
async def list_wbs(
    proposal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WBSItem)
        .where(WBSItem.proposal_id == proposal_id)
        .order_by(WBSItem.order_index, WBSItem.wbs_code)
    )
    items = result.scalars().all()
    return [WBSItemOut(
        id=i.id, proposal_id=i.proposal_id, wbs_code=i.wbs_code,
        description=i.description, phase=i.phase, hours=i.hours or 0,
        unit_rate=i.unit_rate or 0, total_cost=(i.hours or 0) * (i.unit_rate or 0)
    ) for i in items]


@router.post("/", response_model=WBSItemOut, status_code=201)
async def create_wbs_item(
    proposal_id: uuid.UUID,
    body: WBSItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = WBSItem(**body.model_dump(), proposal_id=proposal_id, updated_by=current_user.id)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return WBSItemOut(
        id=item.id, proposal_id=item.proposal_id, wbs_code=item.wbs_code,
        description=item.description, phase=item.phase, hours=item.hours or 0,
        unit_rate=item.unit_rate or 0, total_cost=(item.hours or 0) * (item.unit_rate or 0)
    )


@router.patch("/{item_id}", response_model=WBSItemOut)
async def update_wbs_item(
    proposal_id: uuid.UUID,
    item_id: uuid.UUID,
    body: WBSItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WBSItem).where(WBSItem.id == item_id, WBSItem.proposal_id == proposal_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    item.updated_by = current_user.id
    await db.commit()
    await db.refresh(item)
    return WBSItemOut(
        id=item.id, proposal_id=item.proposal_id, wbs_code=item.wbs_code,
        description=item.description, phase=item.phase, hours=item.hours or 0,
        unit_rate=item.unit_rate or 0, total_cost=(item.hours or 0) * (item.unit_rate or 0)
    )


@router.delete("/{item_id}", status_code=204)
async def delete_wbs_item(
    proposal_id: uuid.UUID,
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WBSItem).where(WBSItem.id == item_id, WBSItem.proposal_id == proposal_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404)
    await db.delete(item)
    await db.commit()
```

**Step 3: Register in `main.py`**

```python
from app.routes import wbs
app.include_router(wbs.router)
```

**Step 4: Write tests**

```python
# backend/tests/test_wbs.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
import uuid


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
```

**Step 5: Run tests**

```bash
cd backend && python -m pytest tests/test_wbs.py -v
```
Expected: `PASSED`

**Step 6: Commit**

```bash
git add backend/app/routes/wbs.py backend/app/schemas/wbs.py backend/tests/test_wbs.py
git commit -m "feat: WBS CRUD API endpoints"
```

---

### Task 13: Proposal detail shell + tab navigation (frontend)

**Files:**
- Create: `frontend/src/pages/ProposalDetailPage.tsx`
- Create: `frontend/src/components/tabs/TabNav.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Create `frontend/src/components/tabs/TabNav.tsx`**

```typescript
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "wbs", label: "WBS" },
  { id: "pricing", label: "Pricing Matrix" },
  { id: "people", label: "People" },
  { id: "schedule", label: "Schedule" },
  { id: "deliverables", label: "Deliverables" },
  { id: "drawings", label: "Drawing List" },
];

interface TabNavProps {
  activeTab: string;
  onChange: (tab: string) => void;
}

export default function TabNav({ activeTab, onChange }: TabNavProps) {
  return (
    <div className="border-b flex gap-1 px-6 bg-white">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === tab.id
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

**Step 2: Create `frontend/src/pages/ProposalDetailPage.tsx`**

```typescript
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { proposalsApi } from "../api/proposals";
import TabNav from "../components/tabs/TabNav";
import WBSTab from "../components/tabs/WBSTab";

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("wbs");

  const { data: proposal, isLoading } = useQuery({
    queryKey: ["proposal", id],
    queryFn: () => proposalsApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-gray-400">Loading...</div>;
  if (!proposal) return <div className="p-8 text-red-500">Proposal not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate("/proposals")} className="text-gray-400 hover:text-gray-700 text-sm">← Back</button>
        <div>
          <span className="font-mono text-blue-600 text-sm">{proposal.proposal_number}</span>
          <h1 className="text-lg font-bold text-gray-800">{proposal.title}</h1>
        </div>
        {proposal.client_name && <span className="text-sm text-gray-500 ml-auto">{proposal.client_name}</span>}
      </header>

      <TabNav activeTab={activeTab} onChange={setActiveTab} />

      <div className="max-w-7xl mx-auto py-6 px-4">
        {activeTab === "wbs" && <WBSTab proposalId={id!} />}
        {activeTab === "overview" && <div className="text-gray-400 text-sm">Overview tab — coming in Sprint 3</div>}
        {activeTab === "pricing" && <div className="text-gray-400 text-sm">Pricing Matrix — coming in Sprint 3</div>}
        {activeTab === "people" && <div className="text-gray-400 text-sm">People — coming in Sprint 3</div>}
        {activeTab === "schedule" && <div className="text-gray-400 text-sm">Schedule/Gantt — coming in Sprint 4</div>}
        {activeTab === "deliverables" && <div className="text-gray-400 text-sm">Deliverables — coming in Sprint 5</div>}
        {activeTab === "drawings" && <div className="text-gray-400 text-sm">Drawing List — coming in Sprint 5</div>}
      </div>
    </div>
  );
}
```

**Step 3: Add route in `App.tsx`**

```typescript
import ProposalDetailPage from "./pages/ProposalDetailPage";

<Route path="/proposals/:id" element={<ProposalDetailPage />} />
```

**Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: proposal detail shell with tab navigation"
```

---

### Task 14: WBS tab component (frontend)

**Files:**
- Create: `frontend/src/api/wbs.ts`
- Create: `frontend/src/components/tabs/WBSTab.tsx`

**Step 1: Create `frontend/src/api/wbs.ts`**

```typescript
import api from "./client";

export interface WBSItem {
  id: string;
  proposal_id: string;
  wbs_code: string;
  description: string | null;
  phase: string | null;
  hours: number;
  unit_rate: number;
  total_cost: number;
  order_index: number;
}

export const wbsApi = {
  list: (proposalId: string) =>
    api.get<WBSItem[]>(`/api/proposals/${proposalId}/wbs/`).then(r => r.data),
  create: (proposalId: string, data: Partial<WBSItem>) =>
    api.post<WBSItem>(`/api/proposals/${proposalId}/wbs/`, data).then(r => r.data),
  update: (proposalId: string, itemId: string, data: Partial<WBSItem>) =>
    api.patch<WBSItem>(`/api/proposals/${proposalId}/wbs/${itemId}`, data).then(r => r.data),
  delete: (proposalId: string, itemId: string) =>
    api.delete(`/api/proposals/${proposalId}/wbs/${itemId}`),
};
```

**Step 2: Create `frontend/src/components/tabs/WBSTab.tsx`**

```typescript
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { wbsApi, WBSItem } from "../../api/wbs";

interface Props { proposalId: string; }

export default function WBSTab({ proposalId }: Props) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<WBSItem>>({});

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["wbs", proposalId],
    queryFn: () => wbsApi.list(proposalId),
  });

  const createMutation = useMutation({
    mutationFn: () => wbsApi.create(proposalId, {
      wbs_code: "1.0", description: "New item", phase: "", hours: 0, unit_rate: 0,
      order_index: items.length
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wbs", proposalId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WBSItem> }) =>
      wbsApi.update(proposalId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wbs", proposalId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => wbsApi.delete(proposalId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wbs", proposalId] }),
  });

  const totalCost = items.reduce((sum, i) => sum + (i.total_cost || 0), 0);

  const startEdit = (item: WBSItem) => {
    setEditingId(item.id);
    setEditValues({ wbs_code: item.wbs_code, description: item.description || "", phase: item.phase || "", hours: item.hours, unit_rate: item.unit_rate });
  };

  const saveEdit = (id: string) => updateMutation.mutate({ id, data: editValues });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-800">Work Breakdown Structure</h3>
        <button onClick={() => createMutation.mutate()} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">+ Add Item</button>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium w-28">WBS Code</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Description</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium w-32">Phase</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium w-24">Hours</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium w-28">Rate ($/hr)</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium w-32">Total Cost</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                {editingId === item.id ? (
                  <>
                    <td className="px-2 py-1"><input className="border rounded px-2 py-1 w-full text-sm font-mono" value={editValues.wbs_code || ""} onChange={e => setEditValues(v => ({...v, wbs_code: e.target.value}))} /></td>
                    <td className="px-2 py-1"><input className="border rounded px-2 py-1 w-full text-sm" value={editValues.description || ""} onChange={e => setEditValues(v => ({...v, description: e.target.value}))} /></td>
                    <td className="px-2 py-1"><input className="border rounded px-2 py-1 w-full text-sm" value={editValues.phase || ""} onChange={e => setEditValues(v => ({...v, phase: e.target.value}))} /></td>
                    <td className="px-2 py-1"><input className="border rounded px-2 py-1 w-full text-sm text-right" type="number" value={editValues.hours || 0} onChange={e => setEditValues(v => ({...v, hours: parseFloat(e.target.value) || 0}))} /></td>
                    <td className="px-2 py-1"><input className="border rounded px-2 py-1 w-full text-sm text-right" type="number" value={editValues.unit_rate || 0} onChange={e => setEditValues(v => ({...v, unit_rate: parseFloat(e.target.value) || 0}))} /></td>
                    <td className="px-4 py-2 text-right text-gray-400 text-sm">${((editValues.hours || 0) * (editValues.unit_rate || 0)).toLocaleString()}</td>
                    <td className="px-2 py-1 flex gap-1">
                      <button onClick={() => saveEdit(item.id)} className="text-green-600 hover:text-green-800 text-xs px-2 py-1 border border-green-300 rounded">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 border rounded">✕</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-mono text-blue-700">{item.wbs_code}</td>
                    <td className="px-4 py-3">{item.description || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{item.phase || "—"}</td>
                    <td className="px-4 py-3 text-right">{item.hours}</td>
                    <td className="px-4 py-3 text-right">${item.unit_rate}</td>
                    <td className="px-4 py-3 text-right font-medium">${(item.total_cost || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => startEdit(item)} className="text-gray-400 hover:text-gray-700 text-xs">Edit</button>
                      <button onClick={() => deleteMutation.mutate(item.id)} className="text-red-400 hover:text-red-600 text-xs">Del</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-gray-50">
            <tr>
              <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</td>
              <td className="px-4 py-3 text-right font-bold text-gray-900">${totalCost.toLocaleString()}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
        {items.length === 0 && !isLoading && <p className="text-center py-10 text-gray-400 text-sm">No WBS items yet. Add one.</p>}
      </div>
    </div>
  );
}
```

**Step 5: Verify manually**

Navigate to a proposal, click WBS tab, add/edit/delete items, verify totals calculate.

**Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat: WBS tab with inline editing and total cost calculation"
```

---

## Sprint 3 — Pricing Matrix, People, Overview

---

### Task 15: Pricing Matrix API + tab

Follow the same pattern as WBS (Task 12 + 14).

**Files:**
- Create: `backend/app/schemas/pricing.py`
- Create: `backend/app/routes/pricing.py`
- Create: `frontend/src/api/pricing.ts`
- Create: `frontend/src/components/tabs/PricingTab.tsx`
- Modify: `backend/app/main.py`, `frontend/src/pages/ProposalDetailPage.tsx`

**Schema `backend/app/schemas/pricing.py`:**

```python
from pydantic import BaseModel
from typing import Optional, Dict
import uuid
from decimal import Decimal


class PricingRowCreate(BaseModel):
    wbs_id: Optional[uuid.UUID] = None
    role_title: Optional[str] = None
    staff_name: Optional[str] = None
    grade: Optional[str] = None
    hourly_rate: Decimal = Decimal("0")
    hours_by_phase: Dict[str, float] = {}


class PricingRowUpdate(BaseModel):
    wbs_id: Optional[uuid.UUID] = None
    role_title: Optional[str] = None
    staff_name: Optional[str] = None
    grade: Optional[str] = None
    hourly_rate: Optional[Decimal] = None
    hours_by_phase: Optional[Dict[str, float]] = None


class PricingRowOut(BaseModel):
    id: uuid.UUID
    proposal_id: uuid.UUID
    wbs_id: Optional[uuid.UUID]
    role_title: Optional[str]
    staff_name: Optional[str]
    grade: Optional[str]
    hourly_rate: Decimal
    hours_by_phase: Dict[str, float]
    total_hours: float
    total_cost: Decimal

    model_config = {"from_attributes": True}
```

**Route pattern** — same as WBS router, prefix `/api/proposals/{proposal_id}/pricing`.

**Frontend `PricingTab`** — shows a table of role/staff/grade/rate/hours columns. Include a WBS code column that shows an autocomplete dropdown from the WBS items for this proposal. Total row at bottom.

**Step for WBS autocomplete in Pricing:** In `PricingTab.tsx`, load WBS items alongside pricing rows:

```typescript
const { data: wbsItems = [] } = useQuery({
  queryKey: ["wbs", proposalId],
  queryFn: () => wbsApi.list(proposalId),
});
```

Render a `<select>` for `wbs_id` in edit mode, populated from `wbsItems`.

**Commit after each file group.**

---

### Task 16: People API + tab

Follow the same pattern.

**Files:**
- Create: `backend/app/schemas/people.py`
- Create: `backend/app/routes/people.py`
- Create: `frontend/src/api/people.ts`
- Create: `frontend/src/components/tabs/PeopleTab.tsx`

**Schema `backend/app/schemas/people.py`:**

```python
from pydantic import BaseModel
from typing import Optional
import uuid


class PersonCreate(BaseModel):
    employee_name: str
    employee_id: Optional[str] = None
    role_on_project: Optional[str] = None
    years_experience: Optional[int] = None


class PersonUpdate(BaseModel):
    employee_name: Optional[str] = None
    employee_id: Optional[str] = None
    role_on_project: Optional[str] = None
    years_experience: Optional[int] = None
    cv_path: Optional[str] = None


class PersonOut(BaseModel):
    id: uuid.UUID
    proposal_id: uuid.UUID
    employee_name: str
    employee_id: Optional[str]
    role_on_project: Optional[str]
    years_experience: Optional[int]
    cv_path: Optional[str]

    model_config = {"from_attributes": True}
```

**PeopleTab** — table with name, employee ID, role, years experience. Include a "Fetch CVs" button (wired in Sprint 7 to the agent). For now it shows disabled with tooltip "Coming in Phase 2".

**Commit after each file group.**

---

### Task 17: Overview tab (scope sections)

**Files:**
- Create: `backend/app/schemas/scope.py`
- Create: `backend/app/routes/scope.py`
- Create: `frontend/src/api/scope.ts`
- Create: `frontend/src/components/tabs/OverviewTab.tsx`

**OverviewTab** — a list of collapsible rich-text sections (use a simple `<textarea>` for PoC, not a full rich-text editor). Default sections: "Project Background", "Scope of Services", "Exclusions", "Assumptions".

Seed default scope sections when a proposal is first opened:

```python
# In scope route GET handler — if no sections exist, create defaults
DEFAULT_SECTIONS = ["Project Background", "Scope of Services", "Exclusions", "Assumptions"]
```

**Commit.**

---

## Sprint 4 — Schedule Tab + Gantt

---

### Task 18: Schedule API

**Files:**
- Create: `backend/app/schemas/schedule.py`
- Create: `backend/app/routes/schedule.py`

**Schema:**

```python
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import date


class ScheduleItemCreate(BaseModel):
    wbs_id: Optional[uuid.UUID] = None
    task_name: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    responsible_party: Optional[str] = None
    is_milestone: bool = False
    phase: Optional[str] = None


class ScheduleItemUpdate(BaseModel):
    wbs_id: Optional[uuid.UUID] = None
    task_name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    responsible_party: Optional[str] = None
    is_milestone: Optional[bool] = None
    phase: Optional[str] = None


class ScheduleItemOut(BaseModel):
    id: uuid.UUID
    proposal_id: uuid.UUID
    wbs_id: Optional[uuid.UUID]
    task_name: str
    start_date: Optional[date]
    end_date: Optional[date]
    responsible_party: Optional[str]
    is_milestone: bool
    phase: Optional[str]

    model_config = {"from_attributes": True}
```

**Commit.**

---

### Task 19: Gantt chart + Schedule tab (frontend)

**Files:**
- Create: `frontend/src/api/schedule.ts`
- Create: `frontend/src/components/tabs/ScheduleTab.tsx`
- Create: `frontend/src/components/gantt/GanttChart.tsx`

**Step 1: Install frappe-gantt**

```bash
cd frontend && npm install frappe-gantt
```

**Step 2: Create `frontend/src/components/gantt/GanttChart.tsx`**

```typescript
import { useEffect, useRef } from "react";
import Gantt from "frappe-gantt";
import "frappe-gantt/dist/frappe-gantt.css";
import { ScheduleItem } from "../../api/schedule";

interface Props { items: ScheduleItem[]; }

export default function GanttChart({ items }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<Gantt | null>(null);

  const tasks = items
    .filter(i => i.start_date && i.end_date)
    .map(i => ({
      id: i.id,
      name: i.task_name,
      start: i.start_date!,
      end: i.end_date!,
      progress: 0,
      custom_class: i.is_milestone ? "milestone-bar" : "",
    }));

  useEffect(() => {
    if (!containerRef.current || tasks.length === 0) return;
    if (ganttRef.current) {
      ganttRef.current.refresh(tasks);
    } else {
      ganttRef.current = new Gantt(containerRef.current, tasks, { view_mode: "Week" });
    }
  }, [tasks]);

  if (tasks.length === 0) {
    return <p className="text-gray-400 text-sm py-8 text-center">Add schedule items with start and end dates to see the Gantt chart.</p>;
  }

  return <div ref={containerRef} className="overflow-x-auto" />;
}
```

**Step 3: Create `frontend/src/components/tabs/ScheduleTab.tsx`**

Show two views toggled by a button: **Gantt** (default) and **List**. Gantt uses `GanttChart`. List is an editable table similar to WBS tab.

Include a "Add from WBS" shortcut — a dropdown that lets the user pick a WBS item to promote to a schedule task (pre-fills task name from WBS description).

**Milestone items** display with a diamond icon (🔷) in the list view.

**Commit.**

---

## Sprint 5 — Deliverables, Drawing List, Cross-tab

---

### Task 20: Deliverables API + tab

**Files:**
- Create: `backend/app/schemas/deliverable.py`
- Create: `backend/app/routes/deliverables.py`
- Create: `frontend/src/api/deliverables.ts`
- Create: `frontend/src/components/tabs/DeliverablesTab.tsx`

**DeliverablesTab** features:
- Table: ref, title, type (badge), WBS code (autocomplete), due date, responsible, status
- "Drawings (n)" column — shows count of drawings linked to this deliverable, clicking filters Drawing List tab
- Status badge: `tbd` (gray), `in_progress` (yellow), `complete` (green)

**Commit.**

---

### Task 21: Drawing List API + tab

**Files:**
- Create: `backend/app/schemas/drawing.py`
- Create: `backend/app/routes/drawings.py`
- Create: `frontend/src/api/drawings.ts`
- Create: `frontend/src/components/tabs/DrawingListTab.tsx`

**DrawingListTab** features:
- Table: drawing number, title, discipline, scale, format badge, WBS code, deliverable (optional link), due date, responsible, revision, status
- Filter by discipline (dropdown)
- Filter by deliverable (populated from this proposal's deliverables)

**Cross-tab WBS cascade warning** — when deleting a WBS item, check if any schedule items, deliverables, or drawings reference it. If yes, show a warning modal:

```typescript
// In WBSTab delete handler:
const linkedCount = await checkWBSLinks(proposalId, itemId); // hits GET /api/proposals/{id}/wbs/{item_id}/links
if (linkedCount > 0) {
  if (!confirm(`This WBS item is linked to ${linkedCount} other items. Delete anyway?`)) return;
}
```

Add `GET /api/proposals/{proposal_id}/wbs/{item_id}/links` endpoint that returns counts.

**Commit.**

---

## Sprint 6 — Real-time WebSockets

---

### Task 22: WebSocket connection manager (backend)

**Files:**
- Create: `backend/app/websockets/__init__.py`
- Create: `backend/app/websockets/manager.py`
- Create: `backend/app/routes/ws.py`
- Modify: `backend/app/main.py`

**Step 1: Create `backend/app/websockets/manager.py`**

```python
from fastapi import WebSocket
from typing import Dict, List
import json


class ConnectionManager:
    def __init__(self):
        # proposal_id -> list of connected websockets
        self.rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, proposal_id: str, websocket: WebSocket):
        await websocket.accept()
        if proposal_id not in self.rooms:
            self.rooms[proposal_id] = []
        self.rooms[proposal_id].append(websocket)

    def disconnect(self, proposal_id: str, websocket: WebSocket):
        if proposal_id in self.rooms:
            self.rooms[proposal_id].remove(websocket)
            if not self.rooms[proposal_id]:
                del self.rooms[proposal_id]

    async def broadcast(self, proposal_id: str, message: dict, exclude: WebSocket = None):
        if proposal_id not in self.rooms:
            return
        for ws in self.rooms[proposal_id]:
            if ws is not exclude:
                await ws.send_text(json.dumps(message))


manager = ConnectionManager()
```

**Step 2: Create `backend/app/routes/ws.py`**

```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websockets.manager import manager
import json

router = APIRouter()


@router.websocket("/ws/proposals/{proposal_id}")
async def proposal_websocket(proposal_id: str, websocket: WebSocket):
    await manager.connect(proposal_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            # Broadcast to all other clients in the same proposal room
            await manager.broadcast(proposal_id, message, exclude=websocket)
    except WebSocketDisconnect:
        manager.disconnect(proposal_id, websocket)
```

**Step 3: Register in `main.py`**

```python
from app.routes import ws
app.include_router(ws.router)
```

**Step 4: Write WebSocket test**

```python
# backend/tests/test_websocket.py
import pytest
from fastapi.testclient import TestClient
from app.main import app


def test_websocket_connects_and_disconnects():
    client = TestClient(app)
    import uuid
    proposal_id = str(uuid.uuid4())
    with client.websocket_connect(f"/ws/proposals/{proposal_id}") as ws:
        ws.send_json({"type": "ping"})
        # No response expected (broadcast excludes sender)
```

**Step 5: Run test**

```bash
cd backend && python -m pytest tests/test_websocket.py -v
```
Expected: `PASSED`

**Step 6: Commit**

```bash
git add backend/app/websockets/ backend/app/routes/ws.py
git commit -m "feat: WebSocket connection manager and proposal room broadcasts"
```

---

### Task 23: WebSocket hook + real-time updates (frontend)

**Files:**
- Create: `frontend/src/hooks/useProposalSocket.ts`
- Modify: `frontend/src/components/tabs/WBSTab.tsx` (add socket integration)

**Step 1: Create `frontend/src/hooks/useProposalSocket.ts`**

```typescript
import { useEffect, useRef, useCallback } from "react";

interface SocketMessage {
  type: string;
  table: string;
  row_id: string;
  field: string;
  value: unknown;
  updated_by: string;
}

export function useProposalSocket(
  proposalId: string,
  onMessage: (msg: SocketMessage) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace("http", "ws");

  useEffect(() => {
    const ws = new WebSocket(`${baseUrl}/ws/proposals/${proposalId}`);
    wsRef.current = ws;
    ws.onmessage = (event) => onMessage(JSON.parse(event.data));
    return () => ws.close();
  }, [proposalId]);

  const send = useCallback((message: SocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return { send };
}
```

**Step 2: Wire socket into WBSTab**

In `WBSTab.tsx`, add:

```typescript
const { send } = useProposalSocket(proposalId, (msg) => {
  if (msg.table === "wbs_items") {
    qc.invalidateQueries({ queryKey: ["wbs", proposalId] });
  }
});

// In updateMutation.onSuccess:
send({ type: "update", table: "wbs_items", row_id: id, field: "all", value: null, updated_by: "" });
```

**Step 3: Add the same socket integration to all other tab components** — PricingTab, PeopleTab, ScheduleTab, DeliverablesTab, DrawingListTab. Each listens on its own `table` key.

**Step 4: Presence indicators**

Add a `presence` message type:

```typescript
// On tab change, send presence
send({ type: "presence", table: activeTab, row_id: "", field: "", value: currentUser.name, updated_by: currentUser.id });
```

In `ProposalDetailPage.tsx`, maintain a `presenceMap: Record<string, string>` state. Show small colored avatar initials in the tab bar for users currently on each tab.

**Step 5: Commit**

```bash
git add frontend/src/hooks/ frontend/src/components/
git commit -m "feat: real-time WebSocket sync and presence indicators across all tabs"
```

---

## Sprint 7 — Agent Demo, Polish, README

---

### Task 24: Agent API namespace (backend)

**Files:**
- Create: `backend/app/schemas/agents.py`
- Create: `backend/app/routes/agents.py`
- Create: `backend/app/agents/cv_fetcher.py`

**Step 1: Create `backend/app/schemas/agents.py`**

```python
from pydantic import BaseModel
from enum import Enum
from typing import Optional, List
import uuid


class JobStatus(str, Enum):
    pending = "pending"
    running = "running"
    complete = "complete"
    failed = "failed"


class AgentJob(BaseModel):
    job_id: str
    status: JobStatus
    result: Optional[dict] = None
    error: Optional[str] = None


class CVCard(BaseModel):
    person_name: str
    role: str
    experience_summary: str
    key_skills: List[str]
```

**Step 2: Create `backend/app/agents/cv_fetcher.py`**

This uses the Anthropic Python SDK with mock employee data.

First add to `requirements.txt`:
```
anthropic==0.40.0
```

```python
import anthropic
import json
from app.schemas.agents import CVCard
from typing import List

# Mock employee database (Phase 2: replace with Oracle HCM API call)
MOCK_EMPLOYEES = {
    "John Smith": {"years": 15, "discipline": "Civil Engineering", "projects": ["Highway 401 Expansion", "Port Hope Tunnel", "GO RER"]},
    "Sarah Chen": {"years": 8, "discipline": "Environmental Engineering", "projects": ["Lake Ontario Remediation", "Don River Restoration"]},
    "Mike Johnson": {"years": 20, "discipline": "Structural Engineering", "projects": ["Pearson Terminal 1", "Ottawa LRT Stage 2"]},
}


async def fetch_cvs(people_names: List[str], roles: List[str]) -> List[CVCard]:
    client = anthropic.Anthropic()

    people_context = []
    for name, role in zip(people_names, roles):
        data = MOCK_EMPLOYEES.get(name, {"years": 10, "discipline": "Engineering", "projects": ["Various WSP Projects"]})
        people_context.append(f"- {name}: {data['years']} years experience in {data['discipline']}. Key projects: {', '.join(data['projects'])}. Proposed role: {role}")

    prompt = f"""You are helping prepare an RFP proposal for WSP. Generate a brief CV summary card for each of the following proposed team members.

Team members:
{chr(10).join(people_context)}

For each person return a JSON array with objects containing:
- person_name: string
- role: string (their proposed role)
- experience_summary: 1-2 sentence summary of their relevant experience
- key_skills: list of 3-5 key skills

Return ONLY valid JSON, no other text."""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )

    cards_data = json.loads(message.content[0].text)
    return [CVCard(**card) for card in cards_data]
```

**Step 3: Create `backend/app/routes/agents.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.people import ProposedPerson
from app.models.user import User
from app.schemas.agents import AgentJob, JobStatus
from app.agents.cv_fetcher import fetch_cvs
from app.auth.deps import get_current_user
import uuid

router = APIRouter(prefix="/api/agents", tags=["agents"])

# In-memory job store (Phase 2: use Redis or DB)
jobs: dict = {}


@router.post("/proposals/{proposal_id}/cv-fetch", response_model=AgentJob)
async def trigger_cv_fetch(
    proposal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProposedPerson).where(ProposedPerson.proposal_id == proposal_id)
    )
    people = result.scalars().all()
    if not people:
        raise HTTPException(status_code=400, detail="No people added to this proposal yet")

    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": JobStatus.pending, "result": None, "error": None}

    # Run synchronously for PoC simplicity
    try:
        jobs[job_id]["status"] = JobStatus.running
        cards = await fetch_cvs(
            [p.employee_name for p in people],
            [p.role_on_project or "Team Member" for p in people],
        )
        jobs[job_id] = {"status": JobStatus.complete, "result": {"cards": [c.model_dump() for c in cards]}, "error": None}
    except Exception as e:
        jobs[job_id] = {"status": JobStatus.failed, "result": None, "error": str(e)}

    return AgentJob(job_id=job_id, **jobs[job_id])


@router.get("/jobs/{job_id}", response_model=AgentJob)
async def get_job(job_id: str, current_user: User = Depends(get_current_user)):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return AgentJob(job_id=job_id, **jobs[job_id])
```

**Step 4: Register in `main.py`**

```python
from app.routes import agents
app.include_router(agents.router)
```

**Step 5: Commit**

```bash
git add backend/app/agents/ backend/app/routes/agents.py backend/app/schemas/agents.py
git commit -m "feat: agent API namespace with CV-fetcher demo using Claude"
```

---

### Task 25: CV Fetch button + results (frontend)

**Files:**
- Modify: `frontend/src/components/tabs/PeopleTab.tsx`
- Create: `frontend/src/components/CVCard.tsx`

**Step 1: Create `frontend/src/components/CVCard.tsx`**

```typescript
interface CVCardProps {
  personName: string;
  role: string;
  experienceSummary: string;
  keySkills: string[];
}

export default function CVCard({ personName, role, experienceSummary, keySkills }: CVCardProps) {
  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-gray-800">{personName}</h4>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{role}</span>
      </div>
      <p className="text-sm text-gray-600 mb-3">{experienceSummary}</p>
      <div className="flex flex-wrap gap-1">
        {keySkills.map(skill => (
          <span key={skill} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{skill}</span>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Wire "Fetch CVs" button in `PeopleTab.tsx`**

```typescript
const [cvCards, setCvCards] = useState<CVCardProps[]>([]);
const [fetchingCVs, setFetchingCVs] = useState(false);

async function handleFetchCVs() {
  setFetchingCVs(true);
  try {
    const { data } = await api.post(`/api/agents/proposals/${proposalId}/cv-fetch`);
    if (data.result?.cards) setCvCards(data.result.cards);
  } finally {
    setFetchingCVs(false);
  }
}

// In the tab header area:
<button
  onClick={handleFetchCVs}
  disabled={fetchingCVs || people.length === 0}
  className="bg-purple-600 text-white px-3 py-1.5 rounded text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
>
  {fetchingCVs ? "Fetching..." : "✨ Fetch CVs (Agent Demo)"}
</button>

// Below the people table, if cvCards exist:
{cvCards.length > 0 && (
  <div className="mt-6">
    <h4 className="font-semibold text-gray-700 mb-3 text-sm">CV Summaries (generated by Claude)</h4>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cvCards.map(card => <CVCard key={card.personName} {...card} />)}
    </div>
  </div>
)}
```

**Step 3: Add `ANTHROPIC_API_KEY` to docker-compose.yml**

```yaml
backend:
  environment:
    ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}  # set in .env file
```

Create `.env.example`:
```
ANTHROPIC_API_KEY=your-key-here
```

**Step 4: Commit**

```bash
git add frontend/src/ backend/ .env.example
git commit -m "feat: CV-fetcher agent demo with Claude-generated summaries on People tab"
```

---

### Task 26: README and demo script

**Files:**
- Create: `README.md`
- Create: `docs/demo-script.md`

**Step 1: Create `README.md`**

```markdown
# WSP Proposal Management Tool — PoC

A web-based replacement for the WSP SharePoint RFP spreadsheet. Real-time collaborative editing, structured proposal data, and AI agent hooks.

## Quick Start

1. Copy `.env.example` to `.env` and add your Anthropic API key
2. Run `docker-compose up`
3. Open http://localhost:3000
4. Sign in: `alice@wsp.com` / `demo123`

## Features

- Proposal dashboard with status tracking
- 7 interconnected proposal tabs: Overview, WBS, Pricing Matrix, People, Schedule (Gantt), Deliverables, Drawing List
- WBS as source of truth — Pricing, Schedule, Deliverables, and Drawing List all reference WBS items
- Real-time collaborative editing — open two browser windows to the same proposal
- Presence indicators — see who is on which tab
- AI agent demo — "Fetch CVs" on the People tab generates CV summaries using Claude

## Architecture

See `docs/plans/2026-02-27-wsp-proposal-tool-design.md` for the full design.

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite + TailwindCSS |
| Backend | Python FastAPI |
| Database | PostgreSQL |
| Real-time | WebSockets |
| AI | Anthropic Claude (claude-sonnet-4-6) |

## Demo Users

| Email | Password | Role |
|---|---|---|
| alice@wsp.com | demo123 | PM |
| bob@wsp.com | demo123 | Finance |
| carol@wsp.com | demo123 | Admin |

## Production Roadmap

- Replace JWT demo auth with Azure Entra ID SSO
- Deploy on Azure Container Apps
- Integrate Oracle HCM for employee data
- Full agent suite: proposal assistant, schedule generator, document assembly
```

**Step 2: Create `docs/demo-script.md`**

Walk leadership through:
1. Show the proposals dashboard
2. Create a new proposal (e.g. "City of Ottawa Bridge Inspection 2026")
3. Add 4-5 WBS items with codes, descriptions, hours, and rates — show the total updating
4. Switch to Pricing Matrix — show WBS items appearing in the dropdown, add staff costs
5. Add 3 team members on the People tab
6. Click "Fetch CVs" — show Claude generating summaries in real time
7. Add schedule tasks, promote a WBS item — open Gantt view
8. Open a second browser window to the same proposal — edit a WBS item — show it updating live in both windows (real-time demo)
9. Show the Deliverables and Drawing List tabs
10. Explain the Phase 2 roadmap: Azure deployment, Entra ID, Oracle HCM, full agent suite

**Step 3: Commit**

```bash
git add README.md docs/demo-script.md
git commit -m "docs: README and leadership demo script"
```

---

## Final Checklist

- [ ] `docker-compose up` starts everything with one command
- [ ] Login works with demo users
- [ ] Create proposal → all 7 tabs navigate correctly
- [ ] WBS CRUD with total cost calculation
- [ ] WBS codes autocomplete in Pricing Matrix
- [ ] Gantt chart renders when schedule items have dates
- [ ] Milestones show as distinct markers on Gantt
- [ ] Deliverables show "Drawings (n)" count linking to Drawing List
- [ ] WBS delete warns when linked items exist
- [ ] Two browser windows to same proposal sync in real time
- [ ] Presence indicators show on tab bar
- [ ] "Fetch CVs" triggers Claude and shows CV cards
- [ ] README explains setup in under 5 steps
