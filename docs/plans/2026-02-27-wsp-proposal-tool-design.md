# WSP Proposal Management Tool — Design Document

**Date:** 2026-02-27
**Author:** Vedang Vadalkar
**Status:** Approved

---

## 1. Problem Statement

WSP currently manages RFP (Request for Proposal) responses using a shared Excel spreadsheet hosted on SharePoint. This approach suffers from:

- Unreliable simultaneous multi-user editing
- No structured data — everything lives in cells with no enforced schema
- No audit trail for who changed what
- No integration capability with other systems or automation tools
- High PM time investment per proposal, slowing response speed

The goal is to replace this with a web-based tool that centralizes proposal data, enables real collaborative editing, and serves as the foundation for AI agent automation in future phases.

---

## 2. Goals

### Phase 1 — PoC (this document)
- Replace the SharePoint spreadsheet with a structured web application
- Support real-time collaborative editing across all proposal sections
- Demonstrate the vision to WSP leadership via a GitHub PoC
- Design APIs from day one to support agent integration in Phase 2

### Phase 2 — Production (future)
- Deploy on Azure with Entra ID SSO for org-wide rollout
- Integrate with Oracle HCM for employee/resource data
- Enable AI agents (CV fetcher, proposal assistant, schedule generator)
- Connect to proposal folder on SharePoint/OneDrive for document assembly

---

## 3. Architecture

### Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React + TypeScript + Vite + TailwindCSS | SPA |
| Backend | Python FastAPI | REST + WebSockets |
| Database | PostgreSQL | Via Docker Compose for PoC |
| Real-time | WebSockets (FastAPI native) | Redis pub/sub for Phase 2 scale |
| Auth | JWT with seeded demo users | Entra ID SSO in production |
| Deployment | Docker Compose | `docker-compose up` for PoC |
| Gantt | frappe-gantt (React wrapper) | Lightweight, open source |

### PoC Deployment

```
docker-compose up
  ├── frontend   (React, port 3000)
  ├── backend    (FastAPI, port 8000)
  └── db         (PostgreSQL, port 5432)
```

### Production Architecture (Phase 2 target)
- Azure Container Apps (backend)
- Azure Static Web Apps (frontend)
- Azure Database for PostgreSQL
- Azure Entra ID (SSO)
- Azure Key Vault (secrets)

---

## 4. Data Model

### Core Entity: Proposal

```sql
proposals
  id              UUID PRIMARY KEY
  proposal_number VARCHAR UNIQUE NOT NULL
  title           VARCHAR NOT NULL
  client_name     VARCHAR
  status          ENUM (draft, in_review, submitted)
  created_by      UUID REFERENCES users
  created_at      TIMESTAMP
  updated_at      TIMESTAMP
```

### WBS Items (source of truth)

```sql
wbs_items
  id              UUID PRIMARY KEY
  proposal_id     UUID REFERENCES proposals
  wbs_code        VARCHAR NOT NULL  -- e.g. 1.0, 1.1, 2.3
  description     TEXT
  phase           VARCHAR
  hours           DECIMAL
  unit_rate       DECIMAL
  total_cost      DECIMAL GENERATED  -- hours * unit_rate
  order_index     INTEGER
  updated_by      UUID REFERENCES users
  updated_at      TIMESTAMP
```

### Pricing Matrix

```sql
pricing_rows
  id              UUID PRIMARY KEY
  proposal_id     UUID REFERENCES proposals
  wbs_id          UUID REFERENCES wbs_items
  role_title      VARCHAR
  staff_name      VARCHAR
  grade           VARCHAR
  hourly_rate     DECIMAL
  hours_by_phase  JSONB  -- { "phase1": 40, "phase2": 80, ... }
  total_hours     DECIMAL GENERATED
  total_cost      DECIMAL GENERATED
  updated_by      UUID REFERENCES users
  updated_at      TIMESTAMP
```

### Proposed People

```sql
proposed_people
  id              UUID PRIMARY KEY
  proposal_id     UUID REFERENCES proposals
  employee_name   VARCHAR
  employee_id     VARCHAR  -- Oracle HCM ID (Phase 2)
  role_on_project VARCHAR
  years_experience INTEGER
  cv_path         VARCHAR  -- populated by CV-fetcher agent (Phase 2)
  updated_by      UUID REFERENCES users
  updated_at      TIMESTAMP
```

### Project Scope

```sql
scope_sections
  id              UUID PRIMARY KEY
  proposal_id     UUID REFERENCES proposals
  section_name    VARCHAR
  content         TEXT  -- rich text / markdown
  order_index     INTEGER
  updated_by      UUID REFERENCES users
  updated_at      TIMESTAMP
```

### Schedule Items

```sql
schedule_items
  id              UUID PRIMARY KEY
  proposal_id     UUID REFERENCES proposals
  wbs_id          UUID REFERENCES wbs_items  -- promoted from WBS
  task_name       VARCHAR
  start_date      DATE
  end_date        DATE
  responsible_party VARCHAR
  is_milestone    BOOLEAN DEFAULT false
  dependencies    UUID[]  -- array of schedule_item IDs
  phase           VARCHAR
  updated_by      UUID REFERENCES users
  updated_at      TIMESTAMP
```

### Deliverables

```sql
deliverables
  id              UUID PRIMARY KEY
  proposal_id     UUID REFERENCES proposals
  wbs_id          UUID REFERENCES wbs_items
  deliverable_ref VARCHAR  -- e.g. D-001
  title           VARCHAR
  type            ENUM (report, model, specification, drawing_package, other)
  description     TEXT
  due_date        DATE
  responsible_party VARCHAR
  status          ENUM (tbd, in_progress, complete)
  updated_by      UUID REFERENCES users
  updated_at      TIMESTAMP
```

### Drawing List

```sql
drawings
  id              UUID PRIMARY KEY
  proposal_id     UUID REFERENCES proposals
  wbs_id          UUID REFERENCES wbs_items
  deliverable_id  UUID REFERENCES deliverables  -- optional parent deliverable
  drawing_number  VARCHAR
  title           VARCHAR
  discipline      VARCHAR
  scale           VARCHAR
  format          ENUM (pdf, dwg, revit, other)
  due_date        DATE
  responsible_party VARCHAR
  revision        VARCHAR
  status          ENUM (tbd, in_progress, complete)
  updated_by      UUID REFERENCES users
  updated_at      TIMESTAMP
```

### Users (PoC demo users)

```sql
users
  id              UUID PRIMARY KEY
  name            VARCHAR
  email           VARCHAR UNIQUE
  role            ENUM (pm, finance, admin)
  password_hash   VARCHAR
```

---

## 5. Inter-Tab Data Relationships

WBS is the **single source of truth**. All other tabs reference it.

```
WBS Items
  │
  ├──► Pricing Matrix     (cost rows per WBS item — same items, financial view)
  │
  ├──► Schedule           (WBS items promoted with start/end dates + dependencies)
  │         └──► Gantt    (visual render of schedule items)
  │
  ├──► Deliverables       (project outputs, each linked to a WBS item)
  │         └──► Drawings (granular drawing sheets, linked to WBS + optionally Deliverable)
  │
  └──► People             (independent — no WBS reference needed)
```

**Cascade behaviour:**
- Deleting a WBS item warns the user if linked schedule tasks, deliverables, or drawings exist
- WBS codes autocomplete in all referencing tabs
- Gantt chart optionally overlays Deliverable due dates as milestone markers
- Deliverables tab shows "Drawings (n)" count column linking to filtered Drawing List view

---

## 6. Proposal Navigation Structure

```
Proposals List (dashboard)
└── Proposal #XYZ — Client Name
    ├── Overview        (scope sections — rich text)
    ├── WBS             (editable table, source of truth)
    ├── Pricing Matrix  (WBS-linked cost table)
    ├── People          (proposed team members)
    ├── Schedule        (Gantt chart + list toggle, WBS-linked)
    ├── Deliverables    (project outputs, WBS-linked)
    └── Drawing List    (engineering drawings, WBS + Deliverable linked)
```

---

## 7. Real-Time Collaboration

- All tabs use WebSockets via FastAPI
- On any edit: change broadcasts to all users viewing the same proposal
- **Presence indicators:** avatars showing who is on which tab
- **Cell-level broadcasting:** only the changed field/row is sent, not the whole table
- **Conflict resolution:** last-write-wins (sufficient for PoC)
- **Sync indicator:** brief "syncing..." toast on save

---

## 8. Agent Integration (Phase 2 Ready)

The backend exposes a `/agents` API namespace from day one. PoC implements one demo agent.

### API Namespace

```
POST /api/agents/cv-fetcher          -- given people list, retrieves CVs
POST /api/agents/proposal-assistant  -- Claude fills scope sections from context
POST /api/agents/schedule-generator  -- Claude suggests schedule from WBS items
GET  /api/agents/jobs/{job_id}       -- async job polling endpoint
```

### PoC Demo Agent: CV Fetcher

1. User navigates to People tab, clicks "Fetch CVs"
2. Backend sends people list to Claude with mock employee profiles
3. Claude returns a summary card per person (name, role, experience highlights)
4. Cards display inline on the People tab
5. Demonstrates the agent loop without real Oracle HCM data

---

## 9. Sprint Plan (PoC)

| Sprint | Scope |
|--------|-------|
| Sprint 1 | Repo setup, Docker Compose, FastAPI scaffold, React scaffold, DB migrations, JWT auth, proposal list page |
| Sprint 2 | Proposal detail shell + tab navigation + WBS tab (full CRUD) |
| Sprint 3 | Pricing Matrix tab + People tab + WBS cross-linking (autocomplete, cascade warnings) |
| Sprint 4 | Schedule tab + Gantt chart (frappe-gantt) + milestone markers |
| Sprint 5 | Deliverables tab + Drawing List tab + cross-tab relationship views |
| Sprint 6 | Real-time WebSockets across all tabs + presence indicators |
| Sprint 7 | CV-fetcher agent demo + UI polish + README + demo script |

---

## 10. Out of Scope for PoC

| Feature | Phase |
|---------|-------|
| Azure / Entra ID SSO | Phase 2 |
| Oracle HCM integration | Phase 2 |
| Full RBAC permissions system | Phase 2 |
| Document assembly (SharePoint/OneDrive) | Phase 2 |
| Email notifications | Phase 2 |
| Proposal approval workflows | Phase 2 |
| Production monitoring / backups | Phase 2 |
| Mobile responsive design | Phase 2 |

---

## 11. Repository Structure

```
wsp-proposal-tool/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py
│   │   ├── models/
│   │   ├── routes/
│   │   │   ├── proposals.py
│   │   │   ├── wbs.py
│   │   │   ├── pricing.py
│   │   │   ├── people.py
│   │   │   ├── schedule.py
│   │   │   ├── deliverables.py
│   │   │   ├── drawings.py
│   │   │   └── agents.py
│   │   ├── websockets/
│   │   └── db/
├── frontend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   │   ├── tabs/
│   │   │   ├── tables/
│   │   │   └── gantt/
│   │   ├── hooks/
│   │   └── api/
└── docs/
    └── plans/
        └── 2026-02-27-wsp-proposal-tool-design.md
```
