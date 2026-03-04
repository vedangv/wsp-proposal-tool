# Lessons Learnt Register & Project Sheet Database — Design Document

**Date:** 2026-03-04
**Author:** Vedang Vadalkar
**Status:** Draft

---

## 1. Overview

Extend the WSP Proposal Management Tool with two new org-wide databases:

1. **Project Sheet Database** — master registry of all WSP projects (past and current) with detailed profiles
2. **Lessons Learnt Register** — searchable, categorized knowledge base of lessons from proposals, project delivery, and general practice

Both are standalone (browsable independently) and integrated into the proposal workflow via agents and cross-references.

---

## 2. Goals

- Central project registry eliminates duplicate data entry across proposals
- Structured lessons capture from proposal debriefs and project delivery
- Searchable knowledge base that informs future proposals
- Agent-powered suggestions surface relevant projects and lessons when starting a new proposal
- Same tech stack, same app, same deployment

---

## 3. Navigation

Add top-level navigation to the app shell. Currently there is only a proposals list page.

```
┌──────────────────────────────────────────────────┐
│  WSP  [Proposals]  [Projects]  [Lessons Learnt]  │
└──────────────────────────────────────────────────┘
```

- URL structure: `/proposals`, `/projects`, `/projects/:id`, `/lessons`, `/lessons/:id`
- Same JWT auth, same backend, same database
- Active nav item highlighted

---

## 4. Data Model

### 4.1 Projects Table

Master project registry. **Not scoped to a proposal** — org-wide.

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_number VARCHAR UNIQUE,          -- e.g. "221-40401-00"
    project_name VARCHAR NOT NULL,
    client VARCHAR,
    location VARCHAR,
    contract_value DECIMAL,
    year_completed VARCHAR,                 -- "2023" or "Ongoing"
    status VARCHAR DEFAULT 'completed',     -- active | completed | cancelled
    wsp_role VARCHAR,                       -- Prime Consultant, Sub-Consultant, JV, etc.
    project_manager VARCHAR,
    sector VARCHAR,                         -- Transportation, Environment, Structures, Water, Buildings, etc.
    services_performed TEXT,                -- multi-line description
    key_personnel JSONB DEFAULT '[]',      -- [{name: string, role: string}]
    description TEXT,                       -- project overview
    outcomes TEXT,                          -- results, awards, achievements
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.2 Lessons Table

Standalone lessons, optionally linked to a project and/or proposal.

```sql
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR NOT NULL,                 -- short summary
    description TEXT,                       -- detailed narrative
    source VARCHAR NOT NULL,                -- proposal_debrief | project_delivery | technical | general
    category VARCHAR NOT NULL,              -- win_strategy | loss_reason | technical | client_management |
                                           -- pricing | team | schedule | scope | process
    impact VARCHAR DEFAULT 'medium',        -- high | medium | low
    recommendation TEXT,                    -- what to do differently
    sector VARCHAR,                         -- Transportation, Environment, etc.
    disciplines JSONB DEFAULT '[]',        -- ["Structural", "Environmental"]
    client VARCHAR,                         -- nullable, for client-specific lessons
    region VARCHAR,                         -- nullable, e.g. "GTA", "Northern Ontario", "National"
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
    reported_by VARCHAR,                    -- who identified the lesson
    date_reported DATE,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.3 Relevant Projects Linkage

Add optional FK from `relevant_projects` to the master `projects` table:

```sql
ALTER TABLE relevant_projects
    ADD COLUMN source_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
```

When a proposal's Relevant Projects tab pulls from the master DB, the `source_project_id` links back so data stays connected.

---

## 5. API Endpoints

### 5.1 Projects

```
GET    /api/projects/                    -- list all (with search/filter params)
POST   /api/projects/                    -- create
GET    /api/projects/{id}                -- get detail
PATCH  /api/projects/{id}                -- update
DELETE /api/projects/{id}                -- delete
GET    /api/projects/{id}/lessons        -- lessons linked to this project
GET    /api/projects/{id}/proposals      -- proposals that reference this project
```

Query params for list: `?search=`, `?sector=`, `?client=`, `?status=`

### 5.2 Lessons

```
GET    /api/lessons/                     -- list all (with search/filter params)
POST   /api/lessons/                     -- create
GET    /api/lessons/{id}                 -- get detail
PATCH  /api/lessons/{id}                 -- update
DELETE /api/lessons/{id}                 -- delete
```

Query params for list: `?search=`, `?source=`, `?category=`, `?sector=`, `?client=`, `?impact=`, `?discipline=`

### 5.3 Agents (2 new)

```
POST /api/agents/projects-search        -- search projects DB for a proposal
POST /api/agents/lessons-fetch           -- fetch relevant lessons for a proposal
GET  /api/agents/jobs/{job_id}           -- existing polling endpoint (shared)
```

---

## 6. Frontend Pages

### 6.1 Projects List Page (`/projects`)

- Search bar (searches name, client, project number)
- Filter dropdowns: sector, status (active/completed), client
- Card-based list showing: project number, name, client, location, value, year, status badge
- "+ Add Project" button

### 6.2 Project Detail Page (`/projects/:id`)

Tabbed layout:

| Tab | Content |
|-----|---------|
| Overview | Metadata fields (editable), description, outcomes |
| Team | Key personnel table (name, role) — editable |
| Lessons | Lessons linked to this project (list + "Add Lesson" button) |
| Linked Proposals | Proposals that reference this project via `source_project_id` (read-only list) |

### 6.3 Lessons List Page (`/lessons`)

- Search bar (searches title, description, recommendation)
- Filter dropdowns: source, category, impact, sector, discipline
- Card-based list showing: title, source badge, category badge, impact pill, sector, date
- "+ Add Lesson" button

### 6.4 Lesson Detail Page (`/lessons/:id`)

Single editable page (no tabs needed):

- Title (text input)
- Source, Category, Impact (dropdowns/badges)
- Description (textarea)
- Recommendation (textarea)
- Sector, Disciplines (dropdown + tags)
- Region (text input)
- Client (text input)
- Linked Project (dropdown → projects table, with link to project detail)
- Linked Proposal (dropdown → proposals table, with link to proposal detail)
- Reported by (text input), Date reported (date picker)

---

## 7. Proposal Integration

### 7.1 Relevant Projects Tab — "Search Projects DB" Button

New purple button alongside existing "Fetch from RFP":

```
[Fetch from RFP]  [Search Projects DB]  [+ Add Project]
```

- "Search Projects DB" calls `POST /api/agents/projects-search` with `proposal_id`
- Agent queries master projects table by matching client name and sector
- Returns project cards with Accept/Dismiss
- Accept creates a `relevant_project` row with `source_project_id` set

### 7.2 Dashboard — "Lessons for This Client" Widget

New card on the proposal dashboard (below existing sections):

- Queries lessons where `client` matches the proposal's `client_name`
- Shows 3-5 most recent/relevant lessons as compact cards
- "View All" link goes to `/lessons?client=...`

### 7.3 Client History Tab — "Create Lesson" Button

Next to the debrief notes textarea on past proposals:

- "Create Lesson from Debrief" button
- Pre-fills a new lesson with:
  - `source`: `proposal_debrief`
  - `category`: `win_strategy` or `loss_reason` based on proposal status
  - `client`: from proposal
  - `proposal_id`: linked
  - `description`: copied from debrief_notes
  - `recommendation`: copied from client_feedback

---

## 8. Demo Seed Data

### 8.1 Projects (6 items — mix of active and completed)

| # | Project Name | Client | Sector | Location | Value | Status |
|---|-------------|--------|--------|----------|-------|--------|
| 1 | Highway 404 Extension — Newmarket to Keswick | MTO | Transportation | York Region, ON | $4.2M | Completed (2023) |
| 2 | Highway 69/400 Widening — Sudbury Section | MTO | Transportation | Sudbury, ON | $6.8M | Completed (2021) |
| 3 | Gardiner Expressway Rehabilitation | City of Toronto | Transportation | Toronto, ON | $12.5M | Active |
| 4 | Highway 11 Corridor Study — Barrie to Orillia | MTO | Transportation | Simcoe County, ON | $1.8M | Completed (2020) |
| 5 | Eglinton Crosstown LRT Stations | Metrolinx | Transit | Toronto, ON | $8.3M | Active |
| 6 | Gordie Howe International Bridge — Canadian Port of Entry | WDBA | Structures | Windsor, ON | $15.0M | Completed (2024) |

Each project has description, services_performed, outcomes, and 2-3 key_personnel entries.

### 8.2 Lessons (12 items — diverse mix)

| # | Title | Source | Category | Sector | Impact | Region |
|---|-------|--------|----------|--------|--------|--------|
| 1 | Right-size team for MTO bridge assessments | proposal_debrief | loss_reason | Transportation | high | GTA |
| 2 | Innovative corridor modeling wins MTO work | proposal_debrief | win_strategy | Transportation | high | Southern Ontario |
| 3 | Early utility coordination prevents schedule overruns | project_delivery | schedule | Transportation | high | GTA |
| 4 | Species at risk surveys need 2-season lead time | project_delivery | technical | Environment | high | Northern Ontario |
| 5 | Client pre-RFP meetings improve win rate by 30% | proposal_debrief | client_management | Transportation | high | National |
| 6 | Subconsultant LOIs should be secured before proposal submission | proposal_debrief | process | Transportation | medium | National |
| 7 | Rock cut design in Canadian Shield requires specialized geotech | project_delivery | technical | Transportation | medium | Northern Ontario |
| 8 | Traffic staging plans need municipal stakeholder sign-off early | project_delivery | scope | Transportation | medium | GTA |
| 9 | LRT station design requires fire-life-safety review at 30% milestone | project_delivery | technical | Transit | high | GTA |
| 10 | International bridge projects require dual-jurisdiction environmental review | project_delivery | process | Structures | high | Windsor |
| 11 | Proposal pricing should benchmark against last 3 similar wins | general | pricing | Transportation | medium | National |
| 12 | Use check-in meetings to course-correct scope interpretation | general | process | Transportation | medium | National |

Lessons 1-2 linked to the existing won/lost MTO proposals. Lessons 3-4 linked to master projects. Others standalone.

---

## 9. Migration from Existing Data

The 4 relevant projects currently seeded in the Highway 401 proposal seed data should be migrated to the master projects table. The seed data should:

1. Create master project records first
2. Create relevant_project records in the Highway 401 proposal with `source_project_id` pointing to the master records

This preserves backward compatibility while establishing the linkage.

---

## 10. Tech Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Projects table vs extending relevant_projects | New table | Org-wide scope, different lifecycle, no proposal_id FK |
| Lessons source enum vs free text | Enum | Enables reliable filtering and dashboard widgets |
| Key personnel on projects | JSONB array | Lightweight for PoC, no need for full user FK |
| Search implementation | SQL ILIKE + filters | Good enough for PoC; Phase 2 can add full-text search or Elasticsearch |
| Agent pattern for project search | Same async pattern | Consistency with existing agents; easy to swap DB query for LLM in production |

---

## 11. Out of Scope for PoC

- Full-text search (Elasticsearch/pgvector)
- File/photo attachments on projects
- Lesson approval workflows
- Auto-extraction of lessons from proposal debriefs via LLM
- Project sheet PDF export
- Permission controls (who can edit which projects/lessons)
