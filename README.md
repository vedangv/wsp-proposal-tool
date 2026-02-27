# WSP Proposal Management Tool — PoC

A collaborative web application that replaces the WSP SharePoint/Excel RFP spreadsheet workflow. Built as a GitHub proof-of-concept to demonstrate the vision to company leadership.

---

## Quick Start

```bash
docker-compose up
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

**Demo accounts** (password: `demo123`)

| Email | Name |
|-------|------|
| alice@wsp.com | Alice |
| bob@wsp.com | Bob |
| carol@wsp.com | Carol |

> Open the app in two browser windows with different accounts to see real-time collaboration.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS 3 |
| Backend | Python 3.13 + FastAPI (async) |
| Database | PostgreSQL 15 |
| Real-time | WebSockets (FastAPI native) |
| Auth | JWT (demo users for PoC) |
| Gantt | frappe-gantt |
| Deployment | Docker Compose |

---

## Features

### Sprint 1–2 — Core
- JWT authentication with demo users
- Proposal list — create, view, manage RFP proposals
- **WBS Tab** — full CRUD with inline editing, computed `hours × rate` totals, cascade-delete warning showing cross-tab link counts

### Sprint 3 — Cross-linked tabs
- **Overview Tab** — editable scope sections (auto-seeded with 6 default headings)
- **Pricing Matrix Tab** — per-person, per-phase hours grid linked to WBS items; grand total
- **People Tab** — proposed team with CV Fetch agent integration (Sprint 7)

### Sprint 4 — Schedule
- **Schedule Tab** — Gantt chart (frappe-gantt) + list view toggle, Day/Week/Month/Quarter/Year zoom, WBS linking, milestone markers

### Sprint 5 — Deliverables & Drawings
- **Deliverables Tab** — status badges (TBD / In Progress / Complete), live drawing-count column
- **Drawing List Tab** — discipline/status filters, WBS + Deliverable cross-links, format badges

### Sprint 6 — Real-time collaboration
- WebSocket rooms keyed by `proposal_id`
- Any tab edit broadcasts `{ table, row_id, field, value, updated_by }` to all connected peers
- Live **presence indicators**: WSP-red avatar bubbles per tab + online count in header
- Last-write-wins conflict resolution

### Sprint 7 — CV Fetcher Agent
- `POST /api/agents/cv-fetch` returns a `job_id` immediately (async job pattern)
- `GET /api/agents/jobs/{job_id}` — poll for results
- Spinning loader → **CVCard** results with discipline tags, key projects, "Add to Team" button
- Mock HR data for PoC; pattern is production-ready for Oracle HCM integration

---

## Project Structure

```
wsp-proposal-tool/
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app + WS endpoint
│   │   ├── agents/               # CV-fetcher (mock) agent
│   │   ├── auth/                 # JWT creation + deps
│   │   ├── db/                   # SQLAlchemy session, migrations, seed
│   │   ├── models/               # 9 SQLAlchemy models
│   │   ├── routes/               # One router per domain
│   │   ├── schemas/              # Pydantic I/O schemas
│   │   └── websockets/           # ConnectionManager
│   └── tests/
└── frontend/
    └── src/
        ├── api/                  # Typed axios wrappers per domain
        ├── components/
        │   ├── tabs/             # One component per proposal tab
        │   ├── gantt/            # frappe-gantt wrapper
        │   └── CVCard.tsx        # CV result card
        ├── context/              # AuthContext (JWT)
        ├── hooks/                # useProposalSocket
        └── pages/                # Login, Proposals list, Proposal detail
```

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **WBS is source of truth** | All other tabs reference `wbs_id`; no duplicated cost data |
| **Totals computed server-side** | `hours × unit_rate` in `WBSItemOut`; no client formula engine |
| **Agent API async pattern** | POST → `job_id`, poll `/api/agents/jobs/{id}`; supports 10–60s LLM calls |
| **WS auth via `?token=`** | Browsers cannot set Authorization headers on WebSocket upgrade |
| **Query-invalidation real-time** | WS data-change frame → `queryClient.invalidateQueries` — zero extra state |

---

## Phase 2 (Post-PoC approval)

- **Azure Container Apps** deployment
- **Azure Entra ID SSO** (replace JWT demo auth)
- **Oracle HCM integration** (real CV fetch)
- **Full RBAC** permissions
- **Document assembly agents** (SharePoint/OneDrive output)
- **Email notifications** and approval workflows
