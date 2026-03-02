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
  id                UUID PRIMARY KEY
  proposal_number   VARCHAR UNIQUE NOT NULL
  title             VARCHAR NOT NULL
  client_name       VARCHAR
  status            ENUM (draft, in_review, submitted, won, lost)
  target_dlm        FLOAT DEFAULT 3.0       -- proposal-wide DLM target
  team_dlm_targets  JSONB DEFAULT '{}'      -- per-team targets, e.g. {"Transportation": 3.2}
  phases            JSONB                   -- custom phases, e.g. ["Study", "Preliminary", ...]
  kickoff_date      DATE                    -- milestone dates
  red_review_date   DATE
  gold_review_date  DATE
  submission_deadline DATE
  check_in_meetings JSONB DEFAULT '[]'      -- [{date, notes}]
  target_fees       JSONB DEFAULT '[]'      -- [{description, amount}]
  evaluation_criteria JSONB DEFAULT '[]'    -- [{criterion, weight, notes}]
  debrief_notes     TEXT                    -- post-submission debrief
  client_feedback   TEXT                    -- client feedback received
  created_by        UUID REFERENCES users
  created_at        TIMESTAMP
  updated_at        TIMESTAMP
```

### WBS Items (source of truth)

Hours and cost are **never stored on WBS items** — they are computed server-side by aggregating pricing rows and rolling up from children to parents.

```sql
wbs_items
  id              UUID PRIMARY KEY
  proposal_id     UUID REFERENCES proposals
  wbs_code        VARCHAR NOT NULL  -- e.g. 1, 1.1, 2.3
  description     TEXT
  phase           VARCHAR           -- references proposal.phases
  order_index     INTEGER
  updated_by      UUID REFERENCES users
  updated_at      TIMESTAMP
  -- Computed (not stored): total_hours, total_cost (billing), total_cost_internal (cost)
```

### Pricing Matrix

```sql
pricing_rows
  id              UUID PRIMARY KEY
  proposal_id     UUID REFERENCES proposals
  wbs_id          UUID REFERENCES wbs_items (SET NULL)
  person_id       UUID REFERENCES proposed_people (SET NULL)
  hourly_rate     DECIMAL           -- billing rate (auto-filled from person, read-only)
  cost_rate       DECIMAL           -- cost rate (auto-filled from person, read-only)
  hours_by_phase  JSONB             -- { "Study": 40, "Detailed": 80, ... }
  updated_by      UUID REFERENCES users
  updated_at      TIMESTAMP
  -- Computed (not stored): total_hours, total_cost (billing), total_cost_internal (cost)
```

### Proposed People

Each person carries three rates for financial tracking:
- **cost_rate** — direct labor cost (salary-derived)
- **burdened_rate** — cost + overhead (benefits, office, IT, etc.)
- **hourly_rate (billing_rate)** — what the client pays

DLM (Direct Labor Multiplier) = billing_rate / cost_rate (computed, not stored).

```sql
proposed_people
  id              UUID PRIMARY KEY
  proposal_id     UUID REFERENCES proposals
  employee_name   VARCHAR
  employee_id     VARCHAR           -- Oracle HCM ID (Phase 2)
  wsp_role        VARCHAR           -- e.g. "Senior Project Manager"
  team            VARCHAR           -- e.g. "Transportation", "Environmental"
  role_on_project VARCHAR
  hourly_rate     DECIMAL           -- billing rate (what client pays)
  cost_rate       DECIMAL           -- direct labor cost
  burdened_rate   DECIMAL           -- cost + overhead
  years_experience INTEGER
  cv_path         VARCHAR           -- populated by CV-fetcher agent (Phase 2)
  updated_by      UUID REFERENCES users
  updated_at      TIMESTAMP
```

### Project Scope

```sql
scope_sections
  id              UUID PRIMARY KEY
  proposal_id     UUID REFERENCES proposals
  wbs_id          UUID REFERENCES wbs_items (SET NULL)  -- optional WBS linkage
  section_name    VARCHAR
  content         TEXT              -- rich text / markdown
  order_index     INTEGER
  updated_by      UUID REFERENCES users
  updated_at      TIMESTAMP
```

### Relevant Projects

```sql
relevant_projects
  id                  UUID PRIMARY KEY
  proposal_id         UUID REFERENCES proposals
  project_name        VARCHAR
  project_number      VARCHAR
  client              VARCHAR
  location            VARCHAR
  contract_value      DECIMAL
  year_completed      VARCHAR
  wsp_role            VARCHAR
  project_manager     VARCHAR
  services_performed  TEXT
  relevance_notes     TEXT
  key_personnel_ids   JSONB DEFAULT '[]'  -- links to proposed_people IDs
  updated_by          UUID REFERENCES users
  updated_at          TIMESTAMP
```

### Proposal Templates

```sql
proposal_templates
  id              UUID PRIMARY KEY
  name            VARCHAR UNIQUE NOT NULL
  description     TEXT
  template_data   JSONB           -- contains WBS items, phases, team_dlm_targets
  created_at      TIMESTAMP
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
WBS Items (source of truth)
  │
  ├──► Pricing Matrix     (people assigned to WBS items with hours — billing + cost view)
  │         └──► People   (person_id FK — rates flow from person to pricing row)
  │
  ├──► Schedule           (WBS items promoted with start/end dates + dependencies)
  │         └──► Gantt    (visual render of schedule items)
  │
  ├──► Deliverables       (project outputs, each linked to a WBS item)
  │         └──► Drawings (granular drawing sheets, linked to WBS + optionally Deliverable)
  │
  ├──► Scope Sections     (optional wbs_id FK — narrative linked to WBS)
  │
  └──► Relevant Projects  (key_personnel_ids links to People)
```

**Rate flow:**
- Person has cost_rate, burdened_rate, hourly_rate (billing)
- When person assigned to pricing row, rates auto-fill (read-only on pricing row)
- When person's rates updated in People tab, cascade to all their pricing rows
- WBS totals computed from pricing: total_hours, total_cost (billing), total_cost_internal (cost)
- Dashboard computes: net_margin, margin_%, achieved_DLM vs target_DLM

**Cascade behaviour:**
- Deleting a WBS item warns the user if linked schedule tasks, deliverables, or drawings exist
- Pricing rows only allowed on leaf WBS items (no children)
- Gantt chart optionally overlays Deliverable due dates as milestone markers
- Deliverables tab shows "Drawings (n)" count column linking to filtered Drawing List view

---

## 6. Proposal Navigation Structure

```
Proposals List
  ├── New Proposal (blank)
  └── New from Template (Road/Highway, Environmental Assessment, Bridge/Structure)

Proposal #XYZ — Client Name
    ├── Dashboard        (key metrics, fee summary, DLM, timeline calendar, disciplines, compliance)
    ├── Overview         (scope, target fees, evaluation criteria, RFP extract agent)
    ├── WBS              (editable table, source of truth, auto-numbering)
    ├── Pricing Matrix   (people assigned to leaf WBS items, billing + cost view)
    ├── People           (team roster with cost/burdened/billing rates, DLM, CV fetch agent)
    ├── Schedule         (Gantt chart + list toggle, WBS-linked)
    ├── Deliverables     (project outputs, WBS-linked)
    ├── Drawing List     (engineering drawings, WBS + Deliverable linked)
    ├── Relevant Projects (past work, linked to key personnel, AI fetch from RFP agent)
    ├── Client History   (past proposals for same client, outreach log, debrief notes)
    └── Print Summary    (printable summary: timeline, fees, team, WBS, drawings, compliance)
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
POST /api/agents/cv-fetch                  -- given people list, retrieves CVs
POST /api/agents/rfp-extract               -- extract scope sections from RFP
POST /api/agents/relevant-projects-fetch   -- find relevant projects from RFP requirements
POST /api/agents/deliverables-fetch        -- extract deliverables from RFP
POST /api/agents/drawings-fetch            -- generate drawing list from RFP/WBS
GET  /api/agents/jobs/{job_id}             -- async job polling endpoint
```

### PoC Demo Agents (5 implemented with mock data)

1. **CV Fetcher** — People tab "Fetch CVs" button. Returns mock CV summaries per person.
2. **RFP Extractor** — Overview tab "Fetch from RFP" button. Returns mock scope sections.
3. **Relevant Projects Fetcher** — Relevant Projects tab "Fetch from RFP" button. Returns AI-suggested relevant projects with Accept/Dismiss review cards.
4. **Deliverables Fetcher** — Deliverables tab "Fetch from RFP" button. Returns 8 deliverables extracted from the RFP with Accept/Dismiss review cards.
5. **Drawings Fetcher** — Drawing List tab "Fetch from RFP" button. Returns 10 drawings generated from the RFP/WBS with Accept/Dismiss review cards.

All agents follow the same async pattern: POST creates a job → mock 2s delay → poll for results.

---

## 9. Sprint Plan (PoC)

| Sprint | Scope | Status |
|--------|-------|--------|
| Sprint 1 | Repo setup, Docker Compose, FastAPI scaffold, React scaffold, DB migrations, JWT auth, proposal list page | Done |
| Sprint 2 | Proposal detail shell + tab navigation + WBS tab (full CRUD) | Done |
| Sprint 3 | Pricing Matrix tab + People tab + WBS cross-linking (autocomplete, cascade warnings) | Done |
| Sprint 4 | Schedule tab + Gantt chart (frappe-gantt) + milestone markers | Done |
| Sprint 5 | Deliverables tab + Drawing List tab + cross-tab relationship views | Done |
| Sprint 6 | Real-time WebSockets across all tabs + presence indicators | Done |
| Sprint 7 | CV-fetcher agent demo + Relevant Projects tab + UI polish | Done |
| Sprint 8 | Financial model: cost/burdened/billing rates, DLM targets, rate cascade, custom phases, code hygiene | Done |
| Sprint 9 | Proposal Dashboard (metrics, fee summary, settings), custom phases UI, tab completion indicators | Done |
| Sprint 10 | WBS auto-numbering, Scope-WBS linkage, delete confirmations, WebSocket reconnection | Done |
| Sprint 11 | Proposal templates, print summary/export, Relevant Projects-People linkage, error toasts | Done |
| Sprint 12 | Disciplines tracker, compliance checklist, timeline calendar, Railway deployment | Done |
| Sprint 13 | Status dropdown (won/lost), full calendar view, target fees, evaluation criteria | Done |
| Sprint 14 | Client History tab, demo drawings/relevant projects, "Fetch from RFP" agent, print summary enhancements | Done |
| Sprint 15 | Deliverables + Drawings agent-driven (Fetch from RFP buttons), remove status/due columns from both tabs | Done |

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
│   │   ├── schemas/
│   │   ├── routes/
│   │   │   ├── proposals.py
│   │   │   ├── wbs.py
│   │   │   ├── pricing.py
│   │   │   ├── people.py
│   │   │   ├── schedule.py
│   │   │   ├── deliverables.py
│   │   │   ├── drawings.py
│   │   │   ├── client_history.py
│   │   │   ├── disciplines.py
│   │   │   ├── compliance.py
│   │   │   ├── dashboard.py
│   │   │   └── agents.py
│   │   ├── agents/
│   │   │   ├── cv_fetcher.py
│   │   │   ├── rfp_extractor.py
│   │   │   ├── relevant_projects_fetcher.py
│   │   │   ├── deliverables_fetcher.py
│   │   │   └── drawings_fetcher.py
│   │   ├── websockets/
│   │   └── db/
├── frontend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   │   ├── tabs/          -- 11 tab components
│   │   │   ├── tables/
│   │   │   └── gantt/
│   │   ├── hooks/
│   │   └── api/
└── docs/
    └── plans/
        └── 2026-02-27-wsp-proposal-tool-design.md
```
