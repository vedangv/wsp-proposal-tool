# WSP Proposal Management Tool — Live Demo Script

**Duration:** ~10 minutes
**Login:** alice@wsp.com / demo123
**URL:** Railway production URL or localhost:3000

---

## Setup Before Demo

1. Open the app in Chrome (incognito recommended for clean state)
2. If Railway DB was reset, the Deliverables and Drawings tabs will be empty (this is intentional — we'll populate them live with the AI agent)
3. Have the slide deck ready to switch back to if needed

---

## Demo Flow

### 1. Login & Proposals List (30 sec)

**Talk track:** *"This is the proposals dashboard. We can see all active and past proposals. Notice we have three — the Highway 401 we're actively working on, a Highway 7 project we won last year, and a QEW Bridge assessment we lost."*

- Point out the status badges (Draft, Won, Lost)
- Point out the client name, deadline, and status colors

---

### 2. Open Highway 401 → Dashboard Tab (1 min)

**Talk track:** *"Let's open our active proposal. The dashboard gives the PM an instant snapshot — total hours, total fees, achieved DLM, and where we stand against our target."*

- Point out: Total Hours, Total Fee (billing), Net Margin, Achieved DLM vs Target
- Scroll to **Timeline Calendar** — *"The calendar shows all our milestones. Kickoff, Red Review, Gold Review, Submission Deadline. Click a date to see details."*
- Click a day with events to show the popover
- Point to **Disciplines** and **Compliance** sections

---

### 3. WBS Tab (1 min)

**Talk track:** *"The WBS is the backbone. Everything — pricing, schedule, deliverables — flows from this structure. It auto-numbers, so if I add a child under item 3, it becomes 3.4 automatically."*

- Show the hierarchical WBS with auto-numbering
- Point out phase assignments (Study, Detailed, Tender, etc.)
- *"If I delete a WBS item that has linked schedule tasks or pricing rows, the system warns me first."*

---

### 4. Pricing Matrix (1 min)

**Talk track:** *"This is where the money lives. Each person is assigned to WBS items with hours broken down by phase. The rates come directly from the People tab — if Sarah's billing rate changes, it cascades to every pricing row she's on."*

- Point out the hours-by-phase columns
- Show the billing rate and cost rate columns
- *"Everything rolls up. Total hours, total cost, total billing — all computed server-side, no formulas to break."*

---

### 5. People Tab (30 sec)

**Talk track:** *"Here's our team. Each person has three rates — cost, burdened, and billing. The DLM is calculated automatically. We can see at a glance if anyone's multiplier is off target."*

- Point out the DLM column
- Mention the "Fetch CVs" button — *"In production, this connects to our HR system and pulls formatted CVs automatically."*

---

### 6. Schedule Tab (30 sec)

**Talk track:** *"The schedule tab has both a Gantt view and a list view. Tasks link back to the WBS. Milestones are marked — Study Phase Complete, Design Freeze."*

- Toggle between Gantt and list if available
- Point out milestones

---

### 7. Deliverables — AI Agent Demo (1.5 min) ★

**Talk track:** *"Now here's where it gets interesting. The deliverables tab starts empty — because we haven't told the system what the RFP requires yet. Watch what happens when I click 'Fetch from RFP'."*

- Click **"Fetch from RFP"** button
- Wait 2 seconds for the spinner
- *"The AI agent analyzed the RFP and identified 8 required deliverables — the Preliminary Design Report, Environmental Compliance Report, Traffic Impact Assessment, drawing packages at 30%, 60%, and 100%, specifications, and the tender package."*
- **Accept 3-4 items** by clicking Accept — *"I can review each suggestion and accept or dismiss. If the AI got something wrong, I just dismiss it."*
- Dismiss 1 item to show that flow
- *"The accepted items are now in my deliverables list, linked to the right type and responsible party."*

---

### 8. Drawing List — AI Agent Demo (1 min) ★

**Talk track:** *"Same concept for drawings. Click Fetch from RFP..."*

- Click **"Fetch from RFP"**
- Wait for results
- *"The agent generated 10 expected drawings — general arrangement, alignments, cross sections, drainage, bridge, traffic staging, signage, environmental constraints, and the survey base plan. Each has the right discipline, format, and scale."*
- Accept all — *"For a highway project, this list is a great starting point. The PM can add, remove, or modify as needed."*

---

### 9. Relevant Projects (30 sec)

**Talk track:** *"These are past WSP projects that demonstrate relevant experience. We've pre-populated four — Highway 404, Highway 69/400, the Gardiner, and Highway 11. Each links to key team members."*

- Expand one project to show services and relevance notes
- *"There's also a 'Fetch from RFP' button here that suggests additional relevant projects from our database."*

---

### 10. Client History Tab (1 min) ★

**Talk track:** *"This is something we've never had before. Before writing a single word of this proposal, I can see every past interaction with MTO."*

- Point out the two past proposals — Highway 7 (won) and QEW Bridge (lost)
- Expand the **lost** proposal — *"We lost QEW Bridge on price. The debrief says our scope interpretation was broader than intended. The client feedback says to right-size the team. That directly informs how we approach this Highway 401 submission."*
- Scroll to outreach log — *"We can also see all client interactions — the pre-RFP meeting, the emails, the presentations — across all MTO proposals."*

---

### 11. Print Summary (30 sec)

**Talk track:** *"Finally, we can generate a printable summary for review meetings — timeline, team, WBS, drawings, compliance status, all on one page."*

- Open Print Summary (if navigable from the tab or via URL)
- Show the formatted output

---

## Closing

**Talk track:** *"This is a proof of concept built in 15 rapid sprints. Everything you've seen works — real data, real-time collaboration, real APIs. The AI agents are mocked for the demo, but the API pattern is production-ready. In Phase 2, we swap mock data for Azure OpenAI and Oracle HCM, add Entra ID SSO, and deploy to Azure. The platform is ready. We just need the green light."*

---

## Common Questions & Answers

**Q: How long to go from PoC to production?**
A: ~17 weeks for Phase 2 with a dedicated team. SSO, Oracle HCM, real AI agents, RBAC.

**Q: Can it handle multiple proposals at once?**
A: Yes. Each proposal is a separate workspace. The proposals list shows all active and past proposals.

**Q: What about data security?**
A: Phase 2 uses Azure Entra ID for auth, Azure Key Vault for secrets, and Azure Database for PostgreSQL with encryption at rest. Same security posture as our other Azure applications.

**Q: Can PMs still use Excel if they want?**
A: The print summary exports a formatted view. In Phase 2, we can add Excel export. But the goal is to move away from spreadsheets entirely.

**Q: How does real-time collaboration work?**
A: WebSockets. When PM A edits a pricing cell, PM B sees the change instantly without refreshing. We show who's online and which tab they're viewing.

**Q: What if two people edit the same cell?**
A: Last-write-wins for the PoC. Phase 2 adds optimistic locking with conflict resolution.
