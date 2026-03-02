# WSP Proposal Management Tool — Slide Deck Content

**Presenter:** Vedang Vadalkar
**Audience:** WSP Leadership
**Duration:** ~15 minutes (presentation) + 10 minutes (live demo)

---

## Slide 1 — Title

**WSP Proposal Management Tool**
Replacing spreadsheets with a structured, AI-ready platform

*Proof of Concept — March 2026*

---

## Slide 2 — The Problem

**How we manage proposals today**

- RFP responses live in a **shared Excel spreadsheet** on SharePoint
- Multiple PMs editing the same file simultaneously — **data conflicts and overwrites**
- No enforced structure — WBS, pricing, schedule, team data all in free-form cells
- **No audit trail** — who changed what and when?
- No integration with Oracle HCM, document management, or AI tools
- Every proposal starts from scratch — **no templates, no reuse**
- High PM time investment per proposal slows our response speed

*"We're managing $2.5B in annual proposals with the same tools we used 15 years ago."*

---

## Slide 3 — The Vision

**A purpose-built web application for proposal management**

Three horizons:

| Horizon | What | When |
|---------|------|------|
| **PoC** (today) | Web app replacing the spreadsheet with structured data, templates, and real-time collaboration | Built |
| **Phase 2** | Azure deployment, Entra ID SSO, Oracle HCM integration, full RBAC | Q3 2026 |
| **Phase 3** | AI agents that auto-populate proposals from RFPs, fetch CVs, generate schedules | Q4 2026+ |

The PoC demonstrates all three — the platform is built, the agent APIs are designed, and 5 demo agents already work.

---

## Slide 4 — What the PoC Does

**A complete proposal workspace in 11 tabs**

| Tab | Purpose |
|-----|---------|
| Dashboard | Key metrics, fee summary, DLM tracking, timeline, compliance status |
| Overview | Scope narrative, target fees, evaluation criteria |
| WBS | Work Breakdown Structure — the single source of truth |
| Pricing Matrix | People assigned to WBS items with hours by phase — billing + cost view |
| People | Team roster with cost/burdened/billing rates, DLM calculations |
| Schedule | Gantt chart + list view, WBS-linked tasks and milestones |
| Deliverables | RFP deliverables — AI-extracted from the RFP document |
| Drawing List | Expected engineering drawings — AI-generated from RFP/WBS |
| Relevant Projects | Past WSP projects demonstrating relevant experience |
| Client History | Past proposals for the same client, outreach log, debrief notes |
| Print Summary | Printable one-page summary for reviews |

---

## Slide 5 — WBS as the Source of Truth

**Everything flows from the Work Breakdown Structure**

```
WBS Items
  ├── Pricing Matrix    (who works on what, how many hours)
  ├── Schedule          (WBS items promoted with start/end dates)
  ├── Deliverables      (project outputs linked to WBS items)
  └── Drawing List      (engineering drawings linked to WBS + deliverables)
```

- Change a WBS item → pricing, schedule, deliverables all stay linked
- Auto-numbering (1, 1.1, 1.2, 2, 2.1...) — no manual numbering
- Delete a WBS item → warning if linked schedule tasks or deliverables exist
- Pricing rows only allowed on leaf WBS items (enforced)

---

## Slide 6 — Financial Model

**Three rates, one DLM target**

| Rate | What | Example |
|------|------|---------|
| Cost Rate | Direct labor cost (salary-derived) | $85/hr |
| Burdened Rate | Cost + overhead (benefits, office, IT) | $115/hr |
| Billing Rate | What the client pays | $245/hr |

**DLM** (Direct Labor Multiplier) = Billing Rate / Cost Rate

- Set a proposal-wide DLM target (e.g. 3.0x)
- Set per-team targets (Transportation: 3.2x, Environmental: 2.8x)
- Dashboard tracks achieved DLM vs target in real-time
- Rate changes on a person cascade to all their pricing rows automatically

---

## Slide 7 — AI Agents (The Future, Working Today)

**5 demo agents show what's possible**

| Agent | Tab | What It Does |
|-------|-----|--------------|
| RFP Extractor | Overview | Reads the RFP and extracts scope sections |
| CV Fetcher | People | Fetches CVs and summaries for proposed team |
| Relevant Projects | Relevant Projects | Finds past WSP projects matching RFP requirements |
| Deliverables Fetcher | Deliverables | Extracts required deliverables from the RFP |
| Drawings Fetcher | Drawing List | Generates expected drawing list from RFP/WBS |

**How it works:**
1. PM clicks "Fetch from RFP" button
2. Agent analyzes the RFP (2-second mock, real LLM in production)
3. Results appear as review cards — PM accepts or dismisses each one
4. Accepted items are added to the proposal

*"In production, these agents connect to real LLMs and WSP's document systems. The API pattern is identical — we just swap mock data for real AI."*

---

## Slide 8 — Real-Time Collaboration

**Multiple PMs, one proposal, zero conflicts**

- WebSocket-based real-time sync across all tabs
- See who's online and which tab they're viewing (presence indicators)
- Cell-level broadcasting — only the changed field is sent, not the whole table
- Brief "syncing..." indicator on save
- Last-write-wins for the PoC (optimistic locking planned for Phase 2)

*"Two PMs can work on pricing and schedule simultaneously without stepping on each other."*

---

## Slide 9 — Client Intelligence

**Learn from every proposal**

- **Client History tab** — see all past proposals for the same client
- **Win/Loss tracking** — proposals marked as won, lost, submitted, draft
- **Debrief notes** — capture lessons learned after each submission
- **Client feedback** — record what the client told us in the debrief
- **Outreach log** — track all client interactions (calls, emails, meetings, presentations)

*"Before writing a word, the PM sees: we've submitted 3 proposals to MTO, won 2, lost 1 on price. The lost one's debrief says 'right-size the team'. That intelligence shapes the new proposal."*

---

## Slide 10 — Templates & Reuse

**Start every proposal with a proven structure**

- 3 built-in templates: Road/Highway, Environmental Assessment, Bridge/Structure
- Templates include WBS items, phases, and DLM targets
- Create a proposal from template → full WBS pre-populated in seconds
- Custom phases per proposal (Study, Preliminary, Detailed, Tender, Construction)

---

## Slide 11 — Tech Stack

**Modern, scalable, WSP-compatible**

| Layer | PoC | Production |
|-------|-----|------------|
| Frontend | React + TypeScript + Vite | Azure Static Web Apps |
| Backend | Python FastAPI | Azure Container Apps |
| Database | PostgreSQL (Docker) | Azure Database for PostgreSQL |
| Auth | JWT (demo users) | Azure Entra ID SSO |
| Real-time | WebSockets | WebSockets + Redis pub/sub |
| Agents | Mock data | Azure OpenAI + Oracle HCM |
| Secrets | Environment vars | Azure Key Vault |

- **Everything is containerized** — `docker-compose up` runs the entire stack
- **API-first design** — every feature is an API endpoint, enabling future integrations
- **15 sprints completed** in rapid iteration

---

## Slide 12 — Phase 2 Roadmap

**From PoC to production**

| Feature | Effort | Impact |
|---------|--------|--------|
| Azure Entra ID SSO | 2 weeks | Org-wide access, no separate passwords |
| Oracle HCM integration | 3 weeks | Auto-populate team rates from HR system |
| Full RBAC | 2 weeks | PM, Finance, Admin roles with proper permissions |
| Real AI agents | 4 weeks | LLM-powered CV fetching, RFP extraction, project matching |
| SharePoint integration | 3 weeks | Document assembly, proposal folder creation |
| Email notifications | 1 week | Deadline reminders, review assignments |
| Mobile responsive | 2 weeks | Review proposals on the go |

**Total estimated Phase 2:** ~17 weeks with a dedicated team

---

## Slide 13 — The Ask

**What we need to move forward**

1. **Approval** to proceed from PoC to Phase 2
2. **Azure resources** — Container Apps, PostgreSQL, Entra ID app registration
3. **Oracle HCM API access** — for employee data integration
4. **Pilot group** — 3-5 PMs to use the tool on real proposals during Phase 2 development
5. **Feedback loop** — bi-weekly demos with pilot PMs to iterate

---

## Slide 14 — Live Demo

**Let's see it in action**

Demo walkthrough:
1. Login → Proposals list (3 proposals: draft, won, lost)
2. Open Highway 401 → Dashboard (metrics, timeline, DLM)
3. WBS tab → auto-numbered structure
4. Pricing Matrix → hours by phase, rate cascade
5. People tab → team with rates, DLM calculation
6. Schedule → Gantt chart with milestones
7. Deliverables → "Fetch from RFP" → Accept 3 items
8. Drawing List → "Fetch from RFP" → Accept all
9. Relevant Projects → pre-populated + "Fetch from RFP"
10. Client History → past proposals (won/lost), outreach log
11. Print Summary → one-page overview

*Live at: [Railway URL]*

---

## Slide 15 — Thank You

**WSP Proposal Management Tool**

Built in 15 sprints. 11 tabs. 5 AI agents. Real-time collaboration.

*Ready for Phase 2.*

Contact: Vedang Vadalkar
