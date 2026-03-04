# Lessons Learnt Register & Project Sheet Database — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the WSP Proposal Management Tool with two org-wide databases (Projects, Lessons Learnt) accessible via top-level navigation, with proposal integration via agents and cross-references.

**Architecture:** New `projects` and `lessons` tables are org-wide (no `proposal_id` FK). `relevant_projects` gets a `source_project_id` FK to link back to master projects. Top-level nav added to app shell. Two new agents surface relevant data when creating proposals.

**Tech Stack:** FastAPI + SQLAlchemy + Alembic (backend), React + TypeScript + TailwindCSS (frontend), PostgreSQL, same Docker Compose setup.

**Design doc:** `docs/plans/2026-03-04-lessons-projects-db-design.md`

---

## Task 1: Database Migration — Create `projects` and `lessons` Tables

**Files:**
- Create: `backend/alembic/versions/m2c3d4e5f6a7_add_projects_and_lessons_tables.py`

**Step 1: Write the migration**

```python
"""add projects and lessons tables

Revision ID: m2c3d4e5f6a7
Revises: l1b2c3d4e5f6
Create Date: 2026-03-04
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "m2c3d4e5f6a7"
down_revision = "l1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade():
    # Projects table — org-wide master registry
    op.create_table(
        "projects",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_number", sa.String, unique=True, nullable=True),
        sa.Column("project_name", sa.String, nullable=False),
        sa.Column("client", sa.String, nullable=True),
        sa.Column("location", sa.String, nullable=True),
        sa.Column("contract_value", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("year_completed", sa.String, nullable=True),
        sa.Column("status", sa.String, server_default="completed", nullable=False),
        sa.Column("wsp_role", sa.String, nullable=True),
        sa.Column("project_manager", sa.String, nullable=True),
        sa.Column("sector", sa.String, nullable=True),
        sa.Column("services_performed", sa.Text, nullable=True),
        sa.Column("key_personnel", JSONB, server_default="[]", nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("outcomes", sa.Text, nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Lessons table — org-wide knowledge base
    op.create_table(
        "lessons",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("title", sa.String, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("source", sa.String, nullable=False),
        sa.Column("category", sa.String, nullable=False),
        sa.Column("impact", sa.String, server_default="medium", nullable=False),
        sa.Column("recommendation", sa.Text, nullable=True),
        sa.Column("sector", sa.String, nullable=True),
        sa.Column("disciplines", JSONB, server_default="[]", nullable=False),
        sa.Column("client", sa.String, nullable=True),
        sa.Column("region", sa.String, nullable=True),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("proposal_id", UUID(as_uuid=True), sa.ForeignKey("proposals.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reported_by", sa.String, nullable=True),
        sa.Column("date_reported", sa.Date, nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_lessons_project_id", "lessons", ["project_id"])
    op.create_index("ix_lessons_proposal_id", "lessons", ["proposal_id"])

    # Add source_project_id FK on relevant_projects
    op.add_column("relevant_projects", sa.Column("source_project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True))


def downgrade():
    op.drop_column("relevant_projects", "source_project_id")
    op.drop_index("ix_lessons_proposal_id", "lessons")
    op.drop_index("ix_lessons_project_id", "lessons")
    op.drop_table("lessons")
    op.drop_table("projects")
```

**Step 2: Verify migration applies**

Run: `docker-compose down -v && docker-compose up --build`
Expected: Tables `projects` and `lessons` exist, `relevant_projects` has `source_project_id` column.

**Step 3: Commit**

```bash
git add backend/alembic/versions/m2c3d4e5f6a7_add_projects_and_lessons_tables.py
git commit -m "feat: add projects and lessons tables migration"
```

---

## Task 2: Backend Models — Project and Lesson

**Files:**
- Create: `backend/app/models/project.py`
- Create: `backend/app/models/lesson.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/app/models/relevant_project.py`

**Step 1: Create Project model**

`backend/app/models/project.py`:
```python
import uuid
from sqlalchemy import Column, String, Text, Numeric, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_number = Column(String, unique=True, nullable=True)
    project_name = Column(String, nullable=False)
    client = Column(String, nullable=True)
    location = Column(String, nullable=True)
    contract_value = Column(Numeric(precision=14, scale=2), nullable=True)
    year_completed = Column(String, nullable=True)
    status = Column(String, nullable=False, server_default="completed")
    wsp_role = Column(String, nullable=True)
    project_manager = Column(String, nullable=True)
    sector = Column(String, nullable=True)
    services_performed = Column(Text, nullable=True)
    key_personnel = Column(JSONB, nullable=False, default=list, server_default="[]")
    description = Column(Text, nullable=True)
    outcomes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

**Step 2: Create Lesson model**

`backend/app/models/lesson.py`:
```python
import uuid
from sqlalchemy import Column, String, Text, Date, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    source = Column(String, nullable=False)
    category = Column(String, nullable=False)
    impact = Column(String, nullable=False, server_default="medium")
    recommendation = Column(Text, nullable=True)
    sector = Column(String, nullable=True)
    disciplines = Column(JSONB, nullable=False, default=list, server_default="[]")
    client = Column(String, nullable=True)
    region = Column(String, nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="SET NULL"), nullable=True, index=True)
    reported_by = Column(String, nullable=True)
    date_reported = Column(Date, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

**Step 3: Add `source_project_id` to RelevantProject model**

In `backend/app/models/relevant_project.py`, add after the `key_personnel_ids` column:
```python
    source_project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
```

**Step 4: Register models in `__init__.py`**

In `backend/app/models/__init__.py`, add imports:
```python
from app.models.project import Project
from app.models.lesson import Lesson
```
And add `"Project"`, `"Lesson"` to the `__all__` list.

**Step 5: Commit**

```bash
git add backend/app/models/project.py backend/app/models/lesson.py backend/app/models/__init__.py backend/app/models/relevant_project.py
git commit -m "feat: add Project and Lesson models, source_project_id on RelevantProject"
```

---

## Task 3: Backend Schemas — Project and Lesson

**Files:**
- Create: `backend/app/schemas/project.py`
- Create: `backend/app/schemas/lesson.py`

**Step 1: Create Project schemas**

`backend/app/schemas/project.py`:
```python
from typing import Optional
from decimal import Decimal
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class ProjectCreate(BaseModel):
    project_number: Optional[str] = None
    project_name: str
    client: Optional[str] = None
    location: Optional[str] = None
    contract_value: Optional[Decimal] = None
    year_completed: Optional[str] = None
    status: Optional[str] = "completed"
    wsp_role: Optional[str] = None
    project_manager: Optional[str] = None
    sector: Optional[str] = None
    services_performed: Optional[str] = None
    key_personnel: Optional[list[dict]] = None
    description: Optional[str] = None
    outcomes: Optional[str] = None


class ProjectUpdate(BaseModel):
    project_number: Optional[str] = None
    project_name: Optional[str] = None
    client: Optional[str] = None
    location: Optional[str] = None
    contract_value: Optional[Decimal] = None
    year_completed: Optional[str] = None
    status: Optional[str] = None
    wsp_role: Optional[str] = None
    project_manager: Optional[str] = None
    sector: Optional[str] = None
    services_performed: Optional[str] = None
    key_personnel: Optional[list[dict]] = None
    description: Optional[str] = None
    outcomes: Optional[str] = None


class ProjectOut(BaseModel):
    id: UUID
    project_number: Optional[str]
    project_name: str
    client: Optional[str]
    location: Optional[str]
    contract_value: Optional[Decimal]
    year_completed: Optional[str]
    status: str
    wsp_role: Optional[str]
    project_manager: Optional[str]
    sector: Optional[str]
    services_performed: Optional[str]
    key_personnel: list[dict]
    description: Optional[str]
    outcomes: Optional[str]
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}
```

**Step 2: Create Lesson schemas**

`backend/app/schemas/lesson.py`:
```python
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from pydantic import BaseModel


class LessonCreate(BaseModel):
    title: str
    description: Optional[str] = None
    source: str
    category: str
    impact: Optional[str] = "medium"
    recommendation: Optional[str] = None
    sector: Optional[str] = None
    disciplines: Optional[list[str]] = None
    client: Optional[str] = None
    region: Optional[str] = None
    project_id: Optional[UUID] = None
    proposal_id: Optional[UUID] = None
    reported_by: Optional[str] = None
    date_reported: Optional[date] = None


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    category: Optional[str] = None
    impact: Optional[str] = None
    recommendation: Optional[str] = None
    sector: Optional[str] = None
    disciplines: Optional[list[str]] = None
    client: Optional[str] = None
    region: Optional[str] = None
    project_id: Optional[UUID] = None
    proposal_id: Optional[UUID] = None
    reported_by: Optional[str] = None
    date_reported: Optional[date] = None


class LessonOut(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    source: str
    category: str
    impact: str
    recommendation: Optional[str]
    sector: Optional[str]
    disciplines: list[str]
    client: Optional[str]
    region: Optional[str]
    project_id: Optional[UUID]
    proposal_id: Optional[UUID]
    reported_by: Optional[str]
    date_reported: Optional[date]
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}
```

**Step 3: Commit**

```bash
git add backend/app/schemas/project.py backend/app/schemas/lesson.py
git commit -m "feat: add Project and Lesson Pydantic schemas"
```

---

## Task 4: Backend Routes — Projects CRUD

**Files:**
- Create: `backend/app/routes/projects.py`
- Modify: `backend/app/main.py`

**Step 1: Create projects route**

`backend/app/routes/projects.py`:
```python
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.project import Project
from app.models.lesson import Lesson
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("/", response_model=List[ProjectOut])
async def list_projects(
    search: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    client: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Project)
    if search:
        pattern = f"%{search}%"
        q = q.where(
            Project.project_name.ilike(pattern)
            | Project.client.ilike(pattern)
            | Project.project_number.ilike(pattern)
        )
    if sector:
        q = q.where(Project.sector == sector)
    if status:
        q = q.where(Project.status == status)
    if client:
        q = q.where(func.lower(Project.client) == client.lower())
    q = q.order_by(Project.updated_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=ProjectOut, status_code=201)
async def create_project(
    body: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    p = Project(created_by=user.id, updated_by=user.id, **body.model_dump())
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Project not found")
    return p


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: UUID,
    body: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Project not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(p, field, value)
    p.updated_by = user.id
    await db.commit()
    await db.refresh(p)
    return p


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Project not found")
    await db.delete(p)
    await db.commit()


@router.get("/{project_id}/lessons", response_model=list)
async def get_project_lessons(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from app.schemas.lesson import LessonOut
    result = await db.execute(
        select(Lesson).where(Lesson.project_id == project_id).order_by(Lesson.updated_at.desc())
    )
    return [LessonOut.model_validate(l) for l in result.scalars().all()]
```

**Step 2: Register in `main.py`**

In `backend/app/main.py`, add:
```python
from app.routes import projects
```
And:
```python
app.include_router(projects.router)
```

**Step 3: Commit**

```bash
git add backend/app/routes/projects.py backend/app/main.py
git commit -m "feat: add Projects CRUD API endpoints"
```

---

## Task 5: Backend Routes — Lessons CRUD

**Files:**
- Create: `backend/app/routes/lessons.py`
- Modify: `backend/app/main.py`

**Step 1: Create lessons route**

`backend/app/routes/lessons.py`:
```python
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.lesson import Lesson
from app.models.user import User
from app.schemas.lesson import LessonCreate, LessonUpdate, LessonOut

router = APIRouter(prefix="/api/lessons", tags=["lessons"])


@router.get("/", response_model=List[LessonOut])
async def list_lessons(
    search: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    client: Optional[str] = Query(None),
    impact: Optional[str] = Query(None),
    discipline: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Lesson)
    if search:
        pattern = f"%{search}%"
        q = q.where(
            Lesson.title.ilike(pattern)
            | Lesson.description.ilike(pattern)
            | Lesson.recommendation.ilike(pattern)
        )
    if source:
        q = q.where(Lesson.source == source)
    if category:
        q = q.where(Lesson.category == category)
    if sector:
        q = q.where(Lesson.sector == sector)
    if client:
        q = q.where(func.lower(Lesson.client) == client.lower())
    if impact:
        q = q.where(Lesson.impact == impact)
    if discipline:
        q = q.where(Lesson.disciplines.contains([discipline]))
    q = q.order_by(Lesson.updated_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=LessonOut, status_code=201)
async def create_lesson(
    body: LessonCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    l = Lesson(created_by=user.id, updated_by=user.id, **body.model_dump())
    db.add(l)
    await db.commit()
    await db.refresh(l)
    return l


@router.get("/{lesson_id}", response_model=LessonOut)
async def get_lesson(
    lesson_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    l = result.scalar_one_or_none()
    if not l:
        raise HTTPException(404, "Lesson not found")
    return l


@router.patch("/{lesson_id}", response_model=LessonOut)
async def update_lesson(
    lesson_id: UUID,
    body: LessonUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    l = result.scalar_one_or_none()
    if not l:
        raise HTTPException(404, "Lesson not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(l, field, value)
    l.updated_by = user.id
    await db.commit()
    await db.refresh(l)
    return l


@router.delete("/{lesson_id}", status_code=204)
async def delete_lesson(
    lesson_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    l = result.scalar_one_or_none()
    if not l:
        raise HTTPException(404, "Lesson not found")
    await db.delete(l)
    await db.commit()
```

**Step 2: Register in `main.py`**

In `backend/app/main.py`, add:
```python
from app.routes import lessons
```
And:
```python
app.include_router(lessons.router)
```

**Step 3: Commit**

```bash
git add backend/app/routes/lessons.py backend/app/main.py
git commit -m "feat: add Lessons CRUD API endpoints"
```

---

## Task 6: Seed Data — 6 Projects + 12 Lessons

**Files:**
- Modify: `backend/app/db/seed.py`

**Step 1: Add seed data**

Add imports at top of `seed.py`:
```python
from app.models.project import Project
from app.models.lesson import Lesson
```

Add a new function `seed_projects_and_lessons(db: AsyncSession)` that creates:

**6 Projects** (idempotent by `project_number`):

1. `221-40401-00` — "Highway 404 Extension — Newmarket to Keswick", MTO, Transportation, York Region ON, $4.2M, completed 2023
2. `221-30122-00` — "Highway 69/400 Widening — Sudbury Section", MTO, Transportation, Sudbury ON, $6.8M, completed 2021
3. `221-50033-00` — "Gardiner Expressway Rehabilitation", City of Toronto, Transportation, Toronto ON, $12.5M, active
4. `221-20099-00` — "Highway 11 Corridor Study — Barrie to Orillia", MTO, Transportation, Simcoe County ON, $1.8M, completed 2020
5. `221-60055-00` — "Eglinton Crosstown LRT Stations", Metrolinx, Transit, Toronto ON, $8.3M, active
6. `221-70088-00` — "Gordie Howe International Bridge — Canadian Port of Entry", WDBA, Structures, Windsor ON, $15.0M, completed 2024

Each with `description`, `services_performed`, `outcomes`, `key_personnel` (2-3 entries as `[{"name": "...", "role": "..."}]`), `wsp_role`, `project_manager`.

**12 Lessons** (idempotent by `title`):

1. "Right-size team for MTO bridge assessments" — proposal_debrief, loss_reason, Transportation, high, GTA
2. "Innovative corridor modeling wins MTO work" — proposal_debrief, win_strategy, Transportation, high, Southern Ontario
3. "Early utility coordination prevents schedule overruns" — project_delivery, schedule, Transportation, high, GTA
4. "Species at risk surveys need 2-season lead time" — project_delivery, technical, Environment, high, Northern Ontario
5. "Client pre-RFP meetings improve win rate by 30%" — proposal_debrief, client_management, Transportation, high, National
6. "Subconsultant LOIs should be secured before proposal submission" — proposal_debrief, process, Transportation, medium, National
7. "Rock cut design in Canadian Shield requires specialized geotech" — project_delivery, technical, Transportation, medium, Northern Ontario
8. "Traffic staging plans need municipal stakeholder sign-off early" — project_delivery, scope, Transportation, medium, GTA
9. "LRT station design requires fire-life-safety review at 30% milestone" — project_delivery, technical, Transit, high, GTA
10. "International bridge projects require dual-jurisdiction environmental review" — project_delivery, process, Structures, high, Windsor
11. "Proposal pricing should benchmark against last 3 similar wins" — general, pricing, Transportation, medium, National
12. "Use check-in meetings to course-correct scope interpretation" — general, process, Transportation, medium, National

Lessons 1-2 linked to proposals (via `proposal_id`). Lessons 3-4 linked to projects (via `project_id`). Others standalone.

Each lesson has `description`, `recommendation`, `disciplines` array, `reported_by`, `date_reported`.

**Step 2: Call seed function from `seed_demo_proposal`**

At the end of `seed_demo_proposal`, call `await seed_projects_and_lessons(db)`.

**Step 3: Update relevant projects seed to set `source_project_id`**

After creating the master projects, update the existing relevant project seed data for the Highway 401 proposal to set `source_project_id` pointing to matching master project records.

**Step 4: Rebuild and verify**

Run: `docker-compose down -v && docker-compose up --build`
Then: `docker-compose restart backend` (if DB race condition)
Verify: `curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/projects/` returns 6 projects
Verify: `curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/lessons/` returns 12 lessons

**Step 5: Commit**

```bash
git add backend/app/db/seed.py
git commit -m "feat: seed 6 projects and 12 lessons with cross-references"
```

---

## Task 7: Frontend — Top-Level Navigation Component

**Files:**
- Create: `frontend/src/components/AppNav.tsx`
- Modify: `frontend/src/pages/ProposalsPage.tsx`

**Step 1: Create AppNav component**

`frontend/src/components/AppNav.tsx`:

A shared header component that replaces the inline header in `ProposalsPage.tsx`. Contains:
- WSP logo + app title on the left
- Nav links: **Proposals**, **Projects**, **Lessons Learnt** (centered or left-aligned after title)
- User name + sign out on the right
- Active nav item highlighted with bottom border or background color
- Uses `useLocation()` from react-router-dom to determine active item
- Uses same auth context pattern as ProposalsPage for user name and sign out

Nav items:
```typescript
const NAV_ITEMS = [
  { label: "Proposals", path: "/proposals" },
  { label: "Projects", path: "/projects" },
  { label: "Lessons Learnt", path: "/lessons" },
];
```

Styling: Same `bg-wsp-dark border-b border-white/10` header. Nav links use `text-white/50 hover:text-white` with active state `text-white border-b-2 border-wsp-red`.

**Step 2: Replace header in ProposalsPage**

Remove the inline `<header>` block from `ProposalsPage.tsx` and replace with `<AppNav />` import.

**Step 3: Verify**

Run dev server, navigate to `/proposals`. Same header but with nav links. Clicking "Projects" navigates to `/projects` (404 expected until pages created).

**Step 4: Commit**

```bash
git add frontend/src/components/AppNav.tsx frontend/src/pages/ProposalsPage.tsx
git commit -m "feat: add top-level navigation with Proposals, Projects, Lessons links"
```

---

## Task 8: Frontend — API Clients for Projects and Lessons

**Files:**
- Create: `frontend/src/api/projects.ts`
- Create: `frontend/src/api/lessons.ts`

**Step 1: Create projects API client**

`frontend/src/api/projects.ts`:
```typescript
import api from "./client";

export interface Project {
  id: string;
  project_number: string | null;
  project_name: string;
  client: string | null;
  location: string | null;
  contract_value: number | null;
  year_completed: string | null;
  status: string;
  wsp_role: string | null;
  project_manager: string | null;
  sector: string | null;
  services_performed: string | null;
  key_personnel: { name: string; role: string }[];
  description: string | null;
  outcomes: string | null;
  updated_at: string | null;
}

export const projectsApi = {
  list: (params?: { search?: string; sector?: string; status?: string; client?: string }) =>
    api.get<Project[]>("/api/projects/", { params }).then(r => r.data),
  get: (id: string) =>
    api.get<Project>(`/api/projects/${id}`).then(r => r.data),
  create: (data: Partial<Project>) =>
    api.post<Project>("/api/projects/", data).then(r => r.data),
  update: (id: string, data: Partial<Project>) =>
    api.patch<Project>(`/api/projects/${id}`, data).then(r => r.data),
  delete: (id: string) =>
    api.delete(`/api/projects/${id}`),
  lessons: (id: string) =>
    api.get<any[]>(`/api/projects/${id}/lessons`).then(r => r.data),
};
```

**Step 2: Create lessons API client**

`frontend/src/api/lessons.ts`:
```typescript
import api from "./client";

export interface Lesson {
  id: string;
  title: string;
  description: string | null;
  source: string;
  category: string;
  impact: string;
  recommendation: string | null;
  sector: string | null;
  disciplines: string[];
  client: string | null;
  region: string | null;
  project_id: string | null;
  proposal_id: string | null;
  reported_by: string | null;
  date_reported: string | null;
  updated_at: string | null;
}

export const lessonsApi = {
  list: (params?: { search?: string; source?: string; category?: string; sector?: string; client?: string; impact?: string; discipline?: string }) =>
    api.get<Lesson[]>("/api/lessons/", { params }).then(r => r.data),
  get: (id: string) =>
    api.get<Lesson>(`/api/lessons/${id}`).then(r => r.data),
  create: (data: Partial<Lesson>) =>
    api.post<Lesson>("/api/lessons/", data).then(r => r.data),
  update: (id: string, data: Partial<Lesson>) =>
    api.patch<Lesson>(`/api/lessons/${id}`, data).then(r => r.data),
  delete: (id: string) =>
    api.delete(`/api/lessons/${id}`),
};
```

**Step 3: Commit**

```bash
git add frontend/src/api/projects.ts frontend/src/api/lessons.ts
git commit -m "feat: add frontend API clients for projects and lessons"
```

---

## Task 9: Frontend — Projects List Page

**Files:**
- Create: `frontend/src/pages/ProjectsPage.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Create ProjectsPage**

`frontend/src/pages/ProjectsPage.tsx`:

Layout: `<AppNav />` header, then main content area with:
- Page title "Projects" with subtitle "Master project registry"
- Search bar (searches name, client, project number)
- Filter row: Sector dropdown (Transportation, Transit, Structures, Environment, Water, Buildings), Status dropdown (active, completed, cancelled)
- Card-based list: each card shows project_number, project_name, client, location, contract_value (formatted), year_completed, status badge (green=completed, blue=active, gray=cancelled)
- "+" floating or top-right "Add Project" button
- Cards are clickable → navigate to `/projects/:id`
- Uses `useQuery("projects", ...)` with React Query
- Search/filter params passed to `projectsApi.list()`
- Empty state: "No projects found"

**Step 2: Add route in App.tsx**

In `frontend/src/App.tsx`, add:
```typescript
import ProjectsPage from "./pages/ProjectsPage";
```
And add route:
```tsx
<Route path="/projects" element={<ProjectsPage />} />
```

**Step 3: Verify**

Navigate to `/projects`. See 6 seeded projects as cards. Search for "MTO" → filters to MTO projects. Click a card → navigates to `/projects/:id` (blank page expected).

**Step 4: Commit**

```bash
git add frontend/src/pages/ProjectsPage.tsx frontend/src/App.tsx
git commit -m "feat: add Projects list page with search and filters"
```

---

## Task 10: Frontend — Project Detail Page (Tabbed)

**Files:**
- Create: `frontend/src/pages/ProjectDetailPage.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Create ProjectDetailPage**

`frontend/src/pages/ProjectDetailPage.tsx`:

Tabbed layout with 4 tabs: **Overview**, **Team**, **Lessons**, **Linked Proposals**.

**Overview tab:**
- Editable metadata fields: project_number, project_name, client, location, contract_value, year_completed, status (dropdown), wsp_role, project_manager, sector (dropdown)
- Editable textareas: description, services_performed, outcomes
- All fields blur-to-save via `projectsApi.update()`

**Team tab:**
- Editable table of `key_personnel` (JSONB array of `{name, role}`)
- Add row button, inline edit, delete button
- Saves entire array on change via `projectsApi.update(id, { key_personnel: [...] })`

**Lessons tab:**
- Lists lessons linked to this project (from `projectsApi.lessons(id)`)
- Each lesson shown as compact card with title, source badge, category badge, impact pill
- "Add Lesson" button → navigates to `/lessons/new?project_id=...`
- Clicking a lesson → navigates to `/lessons/:id`

**Linked Proposals tab:**
- Read-only list of proposals that reference this project via `relevant_projects.source_project_id`
- Requires a new backend endpoint or can be fetched client-side
- For PoC: show a placeholder "Coming soon" or fetch via `/api/projects/{id}/proposals`

Uses `useParams()` to get `id`, `useQuery` for data fetching, `useMutation` for updates.

**Step 2: Add route in App.tsx**

```tsx
<Route path="/projects/:id" element={<ProjectDetailPage />} />
```

**Step 3: Verify**

Click a project from the list → see detail page with tabs. Edit project name → blur → saves. Switch tabs.

**Step 4: Commit**

```bash
git add frontend/src/pages/ProjectDetailPage.tsx frontend/src/App.tsx
git commit -m "feat: add Project detail page with Overview, Team, Lessons, Linked Proposals tabs"
```

---

## Task 11: Frontend — Lessons List Page

**Files:**
- Create: `frontend/src/pages/LessonsPage.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Create LessonsPage**

`frontend/src/pages/LessonsPage.tsx`:

Layout: `<AppNav />` header, then main content area with:
- Page title "Lessons Learnt" with subtitle "Knowledge base from proposals and projects"
- Search bar (searches title, description, recommendation)
- Filter row: Source dropdown (proposal_debrief, project_delivery, technical, general), Category dropdown (win_strategy, loss_reason, technical, client_management, pricing, team, schedule, scope, process), Impact dropdown (high, medium, low), Sector dropdown
- Card-based list: each card shows title, source badge (color-coded), category badge, impact pill (red=high, amber=medium, green=low), sector, region, date_reported
- "+" Add Lesson button
- Cards clickable → navigate to `/lessons/:id`
- Uses React Query with filter params

Badge colors:
- Source: `proposal_debrief` = purple, `project_delivery` = blue, `technical` = teal, `general` = gray
- Impact: `high` = red, `medium` = amber, `low` = green

**Step 2: Add route in App.tsx**

```tsx
<Route path="/lessons" element={<LessonsPage />} />
```

**Step 3: Verify**

Navigate to `/lessons`. See 12 seeded lessons as cards. Filter by source "proposal_debrief" → shows 5 lessons. Filter by impact "high" → shows 7 lessons.

**Step 4: Commit**

```bash
git add frontend/src/pages/LessonsPage.tsx frontend/src/App.tsx
git commit -m "feat: add Lessons list page with search and filters"
```

---

## Task 12: Frontend — Lesson Detail Page

**Files:**
- Create: `frontend/src/pages/LessonDetailPage.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Create LessonDetailPage**

`frontend/src/pages/LessonDetailPage.tsx`:

Single editable page (no tabs needed):
- Title (text input, large font)
- Source (dropdown: proposal_debrief, project_delivery, technical, general)
- Category (dropdown: win_strategy, loss_reason, technical, client_management, pricing, team, schedule, scope, process)
- Impact (dropdown: high, medium, low)
- Description (textarea)
- Recommendation (textarea)
- Sector (dropdown)
- Disciplines (multi-select tags or comma-separated input)
- Region (text input)
- Client (text input)
- Linked Project (dropdown → projects list, with link icon to `/projects/:id`)
- Linked Proposal (dropdown → proposals list, with link icon to `/proposals/:id`)
- Reported by (text input)
- Date reported (date input)
- All fields blur-to-save

Also handle `/lessons/new` — create mode with empty fields, saves via `lessonsApi.create()`, then navigates to `/lessons/:id`.

Support query param `?project_id=...` or `?proposal_id=...` to pre-fill linked entity.

**Step 2: Add routes in App.tsx**

```tsx
<Route path="/lessons/new" element={<LessonDetailPage />} />
<Route path="/lessons/:id" element={<LessonDetailPage />} />
```

**Step 3: Verify**

Click a lesson from list → detail page with all fields. Edit title → blur → saves. Click linked project → navigates to project detail.

**Step 4: Commit**

```bash
git add frontend/src/pages/LessonDetailPage.tsx frontend/src/App.tsx
git commit -m "feat: add Lesson detail page with all editable fields and cross-links"
```

---

## Task 13: Proposal Integration — "Search Projects DB" on Relevant Projects Tab

**Files:**
- Create: `backend/app/agents/projects_search.py`
- Modify: `backend/app/routes/agents.py`
- Modify: `frontend/src/api/agents.ts`
- Modify: `frontend/src/components/tabs/RelevantProjectsTab.tsx`

**Step 1: Create projects_search agent**

`backend/app/agents/projects_search.py`:

Same pattern as `relevant_projects_fetcher.py`. Mock agent that:
- Takes `proposal_id`
- Returns 3 project suggestions from the master projects table
- Mock data: 3 projects with project_name, client, contract_value, year_completed, location, services_performed, relevance_notes, `source_project_id` (the master project's UUID)

**Step 2: Add endpoint to agents.py**

Add `POST /api/agents/projects-search` following existing pattern. Import `projects_search` module. Add to job lookup chain.

**Step 3: Update frontend agents API**

In `frontend/src/api/agents.ts`, add:
```typescript
export interface ProjectSearchResult {
  project_name: string;
  client: string;
  contract_value: number;
  year_completed: string;
  location: string;
  services_performed: string;
  relevance_notes: string;
  source_project_id: string;
}

startProjectsSearch: (proposalId: string) =>
  api.post<{ job_id: string }>("/api/agents/projects-search", { proposal_id: proposalId }).then(r => r.data),
```

**Step 4: Add "Search Projects DB" button to RelevantProjectsTab**

Add a second purple button next to "Fetch from RFP":
```
[Fetch from RFP]  [Search Projects DB]  [+ Add Project]
```

"Search Projects DB" follows same pattern: start job → poll → show review cards → Accept creates relevant project with `source_project_id` set.

**Step 5: Commit**

```bash
git add backend/app/agents/projects_search.py backend/app/routes/agents.py frontend/src/api/agents.ts frontend/src/components/tabs/RelevantProjectsTab.tsx
git commit -m "feat: add Search Projects DB agent button on Relevant Projects tab"
```

---

## Task 14: Proposal Integration — "Lessons for This Client" Dashboard Widget

**Files:**
- Modify: `frontend/src/components/tabs/DashboardTab.tsx`

**Step 1: Add Lessons widget to DashboardTab**

After the existing ComplianceSection, add a new section "Lessons for This Client":
- Fetches lessons where `client` matches the proposal's `client_name` (use `lessonsApi.list({ client: proposal.client_name })`)
- Shows up to 5 most recent lessons as compact cards
- Each card: title, source badge, category badge, impact pill, recommendation snippet (truncated)
- "View All" link navigates to `/lessons?client=...`
- If no client set or no lessons found, show subtle "No lessons found for this client" message

This requires the proposal's `client_name` — get from the proposal data already fetched by DashboardTab.

**Step 2: Verify**

Open Highway 401 proposal → Dashboard. See "Lessons for This Client" section with MTO-related lessons.

**Step 3: Commit**

```bash
git add frontend/src/components/tabs/DashboardTab.tsx
git commit -m "feat: add Lessons for This Client widget on proposal dashboard"
```

---

## Task 15: Proposal Integration — "Create Lesson from Debrief" on Client History Tab

**Files:**
- Modify: `frontend/src/components/tabs/ClientHistoryTab.tsx`

**Step 1: Add "Create Lesson from Debrief" button**

In the Past Proposals section, next to each expanded proposal's debrief notes/feedback, add a button "Create Lesson from Debrief":
- Navigates to `/lessons/new` with query params:
  - `source=proposal_debrief`
  - `category=win_strategy` (if proposal status is "won") or `loss_reason` (if "lost")
  - `client={proposal.client_name}`
  - `proposal_id={past_proposal.id}`
  - `description={debrief_notes}` (URL-encoded)
  - `recommendation={client_feedback}` (URL-encoded)

The LessonDetailPage (Task 12) already reads these query params to pre-fill fields.

**Step 2: Verify**

Open Highway 401 → Client History → expand the lost QEW Bridge proposal → click "Create Lesson from Debrief" → navigates to lesson creation page pre-filled with debrief data.

**Step 3: Commit**

```bash
git add frontend/src/components/tabs/ClientHistoryTab.tsx
git commit -m "feat: add Create Lesson from Debrief button on Client History tab"
```

---

## Task 16: Use AppNav on All Pages + Final Routing

**Files:**
- Modify: `frontend/src/pages/ProjectsPage.tsx` (already has AppNav from Task 9)
- Modify: `frontend/src/pages/LessonsPage.tsx` (already has AppNav from Task 11)
- Modify: `frontend/src/pages/ProjectDetailPage.tsx` (add AppNav)
- Modify: `frontend/src/pages/LessonDetailPage.tsx` (add AppNav)
- Modify: `frontend/src/App.tsx` — ensure catch-all redirects to `/proposals`

**Step 1: Ensure all pages use AppNav**

All list and detail pages for Projects and Lessons should use `<AppNav />` as the header. ProposalDetailPage keeps its own header (it has the proposal-specific tab nav).

**Step 2: Verify full navigation flow**

- `/proposals` → Proposals list with nav
- `/projects` → Projects list with nav
- `/lessons` → Lessons list with nav
- `/projects/:id` → Project detail with nav
- `/lessons/:id` → Lesson detail with nav
- `/lessons/new` → New lesson form with nav
- Nav links highlight correctly on each page
- Back navigation works

**Step 3: Commit**

```bash
git add frontend/src/pages/ProjectsPage.tsx frontend/src/pages/LessonsPage.tsx frontend/src/pages/ProjectDetailPage.tsx frontend/src/pages/LessonDetailPage.tsx frontend/src/App.tsx
git commit -m "feat: ensure AppNav on all pages, finalize routing"
```

---

## Task 17: Docker Rebuild, Full Test, and Deploy

**Step 1: Clean rebuild**

```bash
docker-compose down -v && docker-compose up --build
```
Wait for DB, then `docker-compose restart backend` if needed.

**Step 2: Verify all endpoints**

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8001/api/auth/login -H 'Content-Type: application/json' -d '{"email":"alice@wsp.com","password":"demo123"}' | jq -r '.access_token')

# Projects
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/projects/ | jq length  # expect 6
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/projects/?sector=Transportation | jq length  # expect 4
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/projects/?status=active | jq length  # expect 2

# Lessons
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/lessons/ | jq length  # expect 12
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/lessons/?source=proposal_debrief | jq length  # expect 5
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/lessons/?impact=high | jq length  # expect 7
```

**Step 3: Verify frontend**

- Login → see nav with 3 links
- Click "Projects" → 6 projects
- Click a project → detail page with 4 tabs
- Click "Lessons Learnt" → 12 lessons
- Click a lesson → detail page
- Click "Proposals" → back to proposals list
- Open Highway 401 → Dashboard → see "Lessons for This Client"
- Open Highway 401 → Relevant Projects → see "Search Projects DB" button
- Open Highway 401 → Client History → expand lost proposal → see "Create Lesson from Debrief"

**Step 4: Commit any fixes**

**Step 5: Deploy to Railway**

```bash
railway service backend && railway up --detach
railway service frontend && railway up --detach
```

Reset Railway DB if needed:
```bash
docker exec -e PGPASSWORD=... wsp-db-1 psql -h ballast.proxy.rlwy.net -p 57686 -U postgres -d railway -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```
Then redeploy backend.

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete Projects DB and Lessons Learnt Register implementation"
```

---

## Task 18: Update Documentation

**Files:**
- Modify: `CLAUDE.md` — add Sprint 16, update agent count to 7, add projects/lessons routes
- Modify: `docs/plans/2026-02-27-wsp-proposal-tool-design.md` — add Projects/Lessons section
- Modify: `docs/demo/demo-script.md` — add Projects and Lessons to demo flow
- Modify: `docs/demo/slide-deck-content.md` — update slide count if needed

**Step 1: Update all docs**

**Step 2: Update memory files**

Update `MEMORY.md` and `architecture.md` with new patterns, files, and seed data.

**Step 3: Commit**

```bash
git add CLAUDE.md docs/ .claude/
git commit -m "docs: update all documentation for Projects DB and Lessons Learnt Register"
```
