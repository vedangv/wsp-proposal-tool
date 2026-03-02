# WSP Proposal Management Tool

## Project Overview

A web-based replacement for the WSP SharePoint Excel spreadsheet used for RFP (Request for Proposal) responses. Built as a GitHub PoC to demonstrate the vision to company leadership.

**Design doc:** `docs/plans/2026-02-27-wsp-proposal-tool-design.md`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite + TailwindCSS |
| Backend | Python FastAPI |
| Database | PostgreSQL |
| Real-time | WebSockets (FastAPI native) |
| Auth | JWT (demo users for PoC) |
| Deployment | Docker Compose |
| Gantt | frappe-gantt |

---

## Project Structure

```
wsp-proposal-tool/
├── docker-compose.yml
├── CLAUDE.md
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py
│       ├── models/        -- SQLAlchemy models
│       ├── routes/        -- One file per tab/domain
│       ├── websockets/    -- Real-time collaboration
│       └── db/            -- Migrations, session
├── frontend/
│   ├── Dockerfile
│   └── src/
│       ├── pages/
│       ├── components/
│       │   ├── tabs/      -- One component per proposal tab
│       │   ├── tables/    -- Reusable editable table components
│       │   └── gantt/     -- Gantt chart wrapper
│       ├── hooks/         -- WebSocket, data fetching hooks
│       └── api/           -- API client functions
└── docs/
    └── plans/
```

---

## Running Locally

```bash
docker-compose up
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Key Architectural Decisions

### WBS is the source of truth
All tabs (Pricing Matrix, Schedule, Deliverables, Drawing List) reference WBS items via `wbs_id`. Never create data in other tabs that duplicates WBS — always reference.

### Proposal is the parent entity
Every table has a `proposal_id` foreign key. Always scope queries to a proposal. Never return cross-proposal data in a single query.

### WebSockets pattern
Each proposal has a WebSocket room keyed by `proposal_id`. On any field edit, broadcast `{ table, row_id, field, value, updated_by }` to all connected clients in that room. Last-write-wins for conflicts.

### Agent API namespace
All agent endpoints live under `/api/agents/`. Agents are async — return a `job_id` immediately, poll `/api/agents/jobs/{job_id}` for status. This pattern must be preserved for all future agents. Current agents: `cv_fetcher`, `rfp_extractor`, `relevant_projects_fetcher`, `deliverables_fetcher`, `drawings_fetcher`.

### No custom formula engine
Pricing Matrix totals are computed server-side (hours × rate). No client-side formula evaluation. Keep it structured.

---

## Data Relationships

```
WBS Items (source of truth)
  ├── Pricing Matrix   (wbs_id FK — cost view of WBS)
  ├── Schedule         (wbs_id FK — WBS items promoted with dates)
  ├── Deliverables     (wbs_id FK — outputs of WBS items)
  └── Drawing List     (wbs_id FK + optional deliverable_id FK)

People                 (proposal_id only — no WBS reference)
Scope Sections         (proposal_id only — rich text)
```

---

## Sprint Plan

| Sprint | Focus | Status |
|--------|-------|--------|
| 1 | Repo setup, Docker Compose, FastAPI + React scaffold, DB migrations, JWT auth, proposal list | Done |
| 2 | Proposal detail shell + tab nav + WBS tab (full CRUD) | Done |
| 3 | Pricing Matrix + People + WBS cross-linking | Done |
| 4 | Schedule tab + Gantt chart + milestones | Done |
| 5 | Deliverables + Drawing List + cross-tab relationships | Done |
| 6 | Real-time WebSockets + presence indicators | Done |
| 7 | CV-fetcher agent demo + polish + README + demo script | Done |
| 8 | Financial model: rates, DLM, rate cascade, custom phases | Done |
| 9 | Dashboard (metrics, fee summary, timeline), tab completion indicators | Done |
| 10 | WBS auto-numbering, Scope-WBS linkage, WebSocket reconnection | Done |
| 11 | Proposal templates, print summary, Relevant Projects-People linkage | Done |
| 12 | Disciplines tracker, compliance checklist, timeline calendar, Railway deploy | Done |
| 13 | Status dropdown (won/lost), full calendar, target fees, evaluation criteria | Done |
| 14 | Client History tab, demo data (drawings/projects), Fetch from RFP agent, print enhancements | Done |
| 15 | Deliverables + Drawings agent-driven (Fetch from RFP), remove status/due columns | Done |

---

## Phase 2 (Post-PoC)

When the PoC is approved for full implementation, these are deferred:
- Azure Container Apps deployment
- Azure Entra ID SSO (replace JWT demo auth)
- Oracle HCM integration (employee data for People tab)
- Full RBAC permissions
- Document assembly agents (SharePoint/OneDrive)
- Email notifications and approval workflows

---

## Coding Conventions

- **Backend:** Follow FastAPI best practices. One router file per domain. Use SQLAlchemy ORM. Pydantic schemas for all request/response models. Async handlers throughout.
- **Frontend:** Functional components only. Custom hooks for all data fetching and WebSocket logic. TailwindCSS for all styling — no CSS files. Component per proposal tab in `components/tabs/`.
- **Database:** All tables have `id` (UUID), `proposal_id`, `updated_by`, `updated_at`. Use Alembic for all migrations — never edit the DB directly.
- **Naming:** snake_case for Python, camelCase for TypeScript, kebab-case for file names.
