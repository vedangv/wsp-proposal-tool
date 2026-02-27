# WSP Proposal Tool — Demo Script

**Audience:** WSP leadership / decision makers
**Duration:** ~15 minutes
**Preparation:** Two browser windows open side-by-side (Alice + Bob)

---

## Setup (2 min before demo)

```bash
docker-compose up
```

Open two windows:
- **Window A** — http://localhost:3000 → sign in as `alice@wsp.com / demo123`
- **Window B** — http://localhost:3000 → sign in as `bob@wsp.com / demo123`

---

## Act 1 — Proposal List (1 min)

**Window A (Alice):**
1. Show the Proposals list — clean, professional WSP-branded interface.
2. Click **+ New Proposal**.
3. Fill in:
   - Proposal #: `WSP-2026-042`
   - Title: `Glenbrook Rail Tunnel Assessment`
   - Client: `Sydney Trains`
4. Click **Create Proposal** → it appears in the list with status **draft**.
5. Click the proposal to open it.

**Talking point:** _"This replaces the shared Excel file on SharePoint. Every proposal lives here, accessible from any device, always up to date."_

---

## Act 2 — WBS (2 min)

**Window A — WBS tab:**
1. Click **+ Add Item** twice to create two WBS items.
2. Edit the first:
   - Code: `1.0`, Description: `Preliminary Assessment`, Phase: `Preliminary`, Hours: `120`, Rate: `185`
   - Click **Save** → total cost updates immediately: **$22,200**
3. Edit the second:
   - Code: `2.0`, Description: `Detailed Engineering`, Phase: `Detailed`, Hours: `380`, Rate: `210`
   - Click **Save** → **Total: $101,800**

**Talking point:** _"Hours × rate computed server-side. No formulas to break. The total updates the moment you save."_

---

## Act 3 — Real-time collaboration (2 min)

**Both windows on the proposal, Window A on WBS, Window B open to same proposal.**

1. **Window B** — navigate to the **Pricing Matrix** tab.
2. Show the **presence indicator**: Window A's tab nav shows a red **A** bubble on the WBS tab; Window B sees a **B** bubble on Pricing.
3. **Window A** — add another WBS item: `3.0 Environmental Review`, 60 hrs, $195.
4. **Window B** — switch to WBS tab → the new item appears **automatically, no refresh needed.**

**Talking point:** _"WebSocket rooms per proposal. Every change broadcasts to all connected collaborators instantly — like Google Docs, but for engineering proposals."_

---

## Act 4 — Pricing Matrix (2 min)

**Window A — Pricing Matrix tab:**
1. Click **+ Add Row**.
2. Edit:
   - WBS Link: select `1.0 Preliminary Assessment`
   - Role: `Senior Engineer`, Staff: `Tom Fitzgerald`, Grade: `SE5`, Rate: `$210`
   - Preliminary hours: `120`
3. Save → Total updates instantly.

**Talking point:** _"The Pricing Matrix is the cost view of the WBS. Every row links back to a WBS item — there's one source of truth, no duplication."_

---

## Act 5 — People + CV Fetcher Agent (3 min)

**Window A — People tab:**
1. Click **+ Add Person** twice.
2. Set names: `Sarah Chen` and `Tom Fitzgerald`.
3. Click **Fetch CVs** → spinner appears.
4. After ~1 second, two CVCard panels slide in:
   - Each card shows: discipline tags, years of experience, key project history, education.
5. Click **Add to Team** on Sarah Chen's card → her `Employee ID`, `Role`, and `Years Exp` populate automatically.

**Talking point:** _"In production, this calls Oracle HCM to fetch real employee CVs. The agent runs async — you get a job ID back in milliseconds, then the UI polls and shows results as they arrive. The same pattern supports document generation, cost-model agents, and more."_

---

## Act 6 — Schedule + Gantt (2 min)

**Window A — Schedule tab:**
1. Click **+ Add Task** three times.
2. Set up:
   - `Preliminary Assessment`, Start: `2026-03-01`, End: `2026-04-30`
   - `Detailed Engineering`, Start: `2026-05-01`, End: `2026-08-31`
   - `Final Report`, Start: `2026-09-01`, End: `2026-09-30`, tick **Milestone**
3. Switch to **Gantt** view → bars appear in WSP red; the milestone shows as a dark diamond.
4. Toggle zoom levels: Week → Month → Quarter.

**Talking point:** _"Interactive Gantt chart, linked to WBS phases. Milestones distinguished visually. Toggle between Gantt and list view for different working styles."_

---

## Act 7 — Deliverables & Drawing List (1 min)

**Window A — Deliverables tab:**
1. Add a deliverable: `Ref: D-001`, Title: `Preliminary Assessment Report`, Type: Report, Status: In Progress.
2. Switch to **Drawing List** → add a drawing linked to D-001.
3. Go back to Deliverables → the **Drawings** column shows **1 dwg** automatically.

**Talking point:** _"Every deliverable knows how many drawings it owns. No manual counting — it's live from the database."_

---

## Closing (1 min)

Show the **Overview tab** — six default scope sections ready to fill in (Executive Summary, Scope of Work, etc.).

**Key messages:**
1. **Single source of truth** — WBS drives everything.
2. **Real-time collaboration** — no more emailing versions of Excel.
3. **AI-ready architecture** — agents for CVs today; document assembly and cost modelling next.
4. **Production path is clear** — swap JWT for Entra ID SSO, containerise to Azure, connect to Oracle HCM.

---

## Q&A Prompts

| Question | Answer |
|----------|--------|
| "How is data stored?" | PostgreSQL — structured, queryable, exportable to Excel/PDF |
| "Can we integrate with Oracle HCM?" | Yes — the CV fetcher agent endpoint is already wired; swap mock for real API call |
| "What about document generation?" | Same agent pattern: POST → job_id → poll; agent assembles Word/PDF from structured data |
| "Is it mobile-friendly?" | Responsive layout; full mobile support is Phase 2 scope |
| "What about permissions?" | JWT roles in PoC; Azure Entra ID RBAC in Phase 2 |
