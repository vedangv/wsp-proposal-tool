import uuid
from datetime import date, timedelta
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User, UserRole
from app.models.proposal_template import ProposalTemplate
from app.models.proposal import Proposal, ProposalStatus
from app.models.people import ProposedPerson
from app.models.wbs import WBSItem
from app.models.pricing import PricingRow
from app.models.schedule import ScheduleItem
from app.models.scope import ScopeSection
from app.models.discipline import ProposalDiscipline
from app.models.compliance import ComplianceItem
from app.models.relevant_project import RelevantProject
from app.models.client_outreach import ClientOutreach

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_USERS = [
    {"name": "Alice PM", "email": "alice@wsp.com", "password": "demo123", "role": UserRole.pm},
    {"name": "Bob Finance", "email": "bob@wsp.com", "password": "demo123", "role": UserRole.finance},
    {"name": "Carol Admin", "email": "carol@wsp.com", "password": "demo123", "role": UserRole.admin},
]

DEMO_TEMPLATES = [
    {
        "name": "Road / Highway Design",
        "description": "Standard WBS for road and highway design projects including study through construction phases.",
        "template_data": {
            "phases": ["Study", "Preliminary", "Detailed", "Tender", "Construction"],
            "target_dlm": 3.0,
            "wbs_items": [
                {"wbs_code": "1", "description": "Project Management", "phase": ""},
                {"wbs_code": "1.1", "description": "Project Controls & Reporting", "phase": ""},
                {"wbs_code": "1.2", "description": "Quality Assurance", "phase": ""},
                {"wbs_code": "2", "description": "Surveys & Investigations", "phase": "Study"},
                {"wbs_code": "2.1", "description": "Topographic Survey", "phase": "Study"},
                {"wbs_code": "2.2", "description": "Geotechnical Investigation", "phase": "Study"},
                {"wbs_code": "3", "description": "Road Design", "phase": "Detailed"},
                {"wbs_code": "3.1", "description": "Horizontal & Vertical Alignment", "phase": "Detailed"},
                {"wbs_code": "3.2", "description": "Cross Sections & Grading", "phase": "Detailed"},
                {"wbs_code": "3.3", "description": "Pavement Design", "phase": "Detailed"},
                {"wbs_code": "4", "description": "Drainage Design", "phase": "Detailed"},
                {"wbs_code": "4.1", "description": "Hydrology & Hydraulics", "phase": "Detailed"},
                {"wbs_code": "4.2", "description": "Stormwater Management", "phase": "Detailed"},
                {"wbs_code": "5", "description": "Traffic Engineering", "phase": "Preliminary"},
                {"wbs_code": "5.1", "description": "Traffic Analysis", "phase": "Preliminary"},
                {"wbs_code": "5.2", "description": "Signage & Markings", "phase": "Detailed"},
                {"wbs_code": "6", "description": "Environmental Assessment", "phase": "Study"},
                {"wbs_code": "7", "description": "Utilities Coordination", "phase": "Detailed"},
                {"wbs_code": "8", "description": "Tender Documents", "phase": "Tender"},
                {"wbs_code": "9", "description": "Construction Support", "phase": "Construction"},
            ],
        },
    },
    {
        "name": "Environmental Assessment",
        "description": "Standard WBS for environmental impact assessments and permitting.",
        "template_data": {
            "phases": ["Screening", "Scoping", "Assessment", "Mitigation", "Reporting"],
            "target_dlm": 2.8,
            "wbs_items": [
                {"wbs_code": "1", "description": "Project Management", "phase": ""},
                {"wbs_code": "2", "description": "Screening & Scoping", "phase": "Screening"},
                {"wbs_code": "2.1", "description": "Regulatory Review", "phase": "Screening"},
                {"wbs_code": "2.2", "description": "Stakeholder Identification", "phase": "Scoping"},
                {"wbs_code": "3", "description": "Baseline Studies", "phase": "Assessment"},
                {"wbs_code": "3.1", "description": "Natural Environment", "phase": "Assessment"},
                {"wbs_code": "3.2", "description": "Socio-Economic Environment", "phase": "Assessment"},
                {"wbs_code": "3.3", "description": "Cultural Heritage", "phase": "Assessment"},
                {"wbs_code": "4", "description": "Impact Assessment", "phase": "Assessment"},
                {"wbs_code": "4.1", "description": "Effects Analysis", "phase": "Assessment"},
                {"wbs_code": "4.2", "description": "Cumulative Effects", "phase": "Assessment"},
                {"wbs_code": "5", "description": "Mitigation & Monitoring", "phase": "Mitigation"},
                {"wbs_code": "6", "description": "Public Consultation", "phase": "Assessment"},
                {"wbs_code": "7", "description": "EA Report & Submission", "phase": "Reporting"},
            ],
        },
    },
    {
        "name": "Bridge / Structure Design",
        "description": "Standard WBS for bridge and structural engineering projects.",
        "template_data": {
            "phases": ["Study", "Preliminary", "Detailed", "Tender", "Construction"],
            "target_dlm": 3.2,
            "wbs_items": [
                {"wbs_code": "1", "description": "Project Management", "phase": ""},
                {"wbs_code": "1.1", "description": "Project Controls", "phase": ""},
                {"wbs_code": "2", "description": "Site Investigation", "phase": "Study"},
                {"wbs_code": "2.1", "description": "Geotechnical Investigation", "phase": "Study"},
                {"wbs_code": "2.2", "description": "Hydrological Study", "phase": "Study"},
                {"wbs_code": "2.3", "description": "Condition Assessment", "phase": "Study"},
                {"wbs_code": "3", "description": "Structural Design", "phase": "Detailed"},
                {"wbs_code": "3.1", "description": "Foundation Design", "phase": "Detailed"},
                {"wbs_code": "3.2", "description": "Substructure Design", "phase": "Detailed"},
                {"wbs_code": "3.3", "description": "Superstructure Design", "phase": "Detailed"},
                {"wbs_code": "3.4", "description": "Bearing & Expansion Joints", "phase": "Detailed"},
                {"wbs_code": "4", "description": "Approach Works", "phase": "Detailed"},
                {"wbs_code": "5", "description": "Load Rating & Analysis", "phase": "Preliminary"},
                {"wbs_code": "6", "description": "Drawings & Specifications", "phase": "Tender"},
                {"wbs_code": "7", "description": "Construction Support", "phase": "Construction"},
                {"wbs_code": "7.1", "description": "Shop Drawing Review", "phase": "Construction"},
                {"wbs_code": "7.2", "description": "Site Inspections", "phase": "Construction"},
            ],
        },
    },
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


async def seed_templates(db: AsyncSession):
    for tmpl in DEMO_TEMPLATES:
        result = await db.execute(
            select(ProposalTemplate).where(ProposalTemplate.name == tmpl["name"])
        )
        if result.scalar_one_or_none():
            continue
        db.add(ProposalTemplate(
            name=tmpl["name"],
            description=tmpl["description"],
            template_data=tmpl["template_data"],
        ))
    await db.commit()


async def seed_demo_proposal(db: AsyncSession):
    """Seed the Highway 401 demo proposal with full data. Idempotent by proposal_number."""
    result = await db.execute(
        select(Proposal).where(Proposal.proposal_number == "P-2024-0401")
    )
    if result.scalar_one_or_none():
        return  # Already seeded

    # Get Alice (PM) as created_by
    alice_result = await db.execute(select(User).where(User.email == "alice@wsp.com"))
    alice = alice_result.scalar_one_or_none()
    alice_id = alice.id if alice else None

    today = date.today()

    # --- Proposal ---
    proposal_id = uuid.uuid4()
    proposal = Proposal(
        id=proposal_id,
        proposal_number="P-2024-0401",
        title="Highway 401 Widening — Mississauga Section",
        client_name="Ontario Ministry of Transportation (MTO)",
        status=ProposalStatus.draft,
        target_dlm=3.0,
        phases=["Study", "Preliminary", "Detailed", "Tender", "Construction"],
        kickoff_date=today,
        red_review_date=today + timedelta(days=7),
        gold_review_date=today + timedelta(days=10),
        submission_deadline=today + timedelta(days=14),
        check_in_meetings=[
            {"date": (today + timedelta(days=3)).isoformat(), "notes": "Scope alignment & team roles"},
            {"date": (today + timedelta(days=8)).isoformat(), "notes": "Post red-review corrections"},
        ],
        target_fees=[
            {"description": "Engineering Design", "amount": 1250000},
            {"description": "Environmental Assessment", "amount": 350000},
            {"description": "Traffic Engineering", "amount": 280000},
            {"description": "Construction Oversight", "amount": 450000},
            {"description": "Project Management", "amount": 170000},
        ],
        evaluation_criteria=[
            {"criterion": "Technical Approach", "weight": 35, "notes": "Design methodology and innovation"},
            {"criterion": "Team Experience", "weight": 25, "notes": "Relevant highway widening projects"},
            {"criterion": "Project Management", "weight": 15, "notes": "Schedule, risk management, QA/QC"},
            {"criterion": "Price", "weight": 25, "notes": "Competitive fee proposal"},
        ],
        created_by=alice_id,
    )
    db.add(proposal)
    await db.flush()  # Flush so proposal FK is available for child records

    # --- People ---
    people_data = [
        {"name": "Sarah Chen", "role": "Project Manager", "team": "PM", "wsp_role": "Senior PM",
         "cost": 85, "burdened": 115, "hourly": 245, "years": 14},
        {"name": "James Okafor", "role": "Structural Lead", "team": "Structures", "wsp_role": "Senior Structural Engineer",
         "cost": 75, "burdened": 102, "hourly": 225, "years": 11},
        {"name": "Tom Fitzgerald", "role": "Highway Design Lead", "team": "Transportation", "wsp_role": "Principal Engineer",
         "cost": 90, "burdened": 122, "hourly": 265, "years": 19},
        {"name": "Priya Nair", "role": "Environmental Specialist", "team": "Environment", "wsp_role": "Environmental Scientist",
         "cost": 65, "burdened": 88, "hourly": 195, "years": 8},
        {"name": "Anika Sharma", "role": "Graduate Engineer", "team": "Transportation", "wsp_role": "EIT",
         "cost": 42, "burdened": 57, "hourly": 125, "years": 2},
    ]
    person_ids = {}
    for p in people_data:
        pid = uuid.uuid4()
        person_ids[p["name"]] = pid
        db.add(ProposedPerson(
            id=pid,
            proposal_id=proposal_id,
            employee_name=p["name"],
            role_on_project=p["role"],
            team=p["team"],
            wsp_role=p["wsp_role"],
            cost_rate=p["cost"],
            burdened_rate=p["burdened"],
            hourly_rate=p["hourly"],
            years_experience=p["years"],
        ))

    await db.flush()  # Flush people so person FKs are available

    # --- WBS Items (20 items from Road/Highway template) ---
    wbs_data = [
        ("1", "Project Management", ""),
        ("1.1", "Project Controls & Reporting", ""),
        ("1.2", "Quality Assurance", ""),
        ("2", "Surveys & Investigations", "Study"),
        ("2.1", "Topographic Survey", "Study"),
        ("2.2", "Geotechnical Investigation", "Study"),
        ("3", "Road Design", "Detailed"),
        ("3.1", "Horizontal & Vertical Alignment", "Detailed"),
        ("3.2", "Cross Sections & Grading", "Detailed"),
        ("3.3", "Pavement Design", "Detailed"),
        ("4", "Drainage Design", "Detailed"),
        ("4.1", "Hydrology & Hydraulics", "Detailed"),
        ("4.2", "Stormwater Management", "Detailed"),
        ("5", "Traffic Engineering", "Preliminary"),
        ("5.1", "Traffic Analysis", "Preliminary"),
        ("5.2", "Signage & Markings", "Detailed"),
        ("6", "Environmental Assessment", "Study"),
        ("7", "Utilities Coordination", "Detailed"),
        ("8", "Tender Documents", "Tender"),
        ("9", "Construction Support", "Construction"),
    ]
    wbs_ids = {}
    for idx, (code, desc, phase) in enumerate(wbs_data):
        wid = uuid.uuid4()
        wbs_ids[code] = wid
        db.add(WBSItem(
            id=wid,
            proposal_id=proposal_id,
            wbs_code=code,
            description=desc,
            phase=phase,
            order_index=idx,
        ))

    await db.flush()  # Flush WBS items so wbs FKs are available

    # --- Pricing Rows (~2000 hours across team and WBS leaf nodes) ---
    # Only leaf WBS items get pricing rows
    leaf_codes = ["1.1", "1.2", "2.1", "2.2", "3.1", "3.2", "3.3", "4.1", "4.2", "5.1", "5.2", "6", "7", "8", "9"]
    # hours_by_phase maps: {phase: hours}
    # Distribute hours realistically per person per WBS item
    pricing_assignments = [
        # (person, wbs_code, {phase: hours})
        # Sarah Chen — PM, mostly management + some per phase
        ("Sarah Chen", "1.1", {"Study": 24, "Preliminary": 24, "Detailed": 48, "Tender": 16, "Construction": 16}),
        ("Sarah Chen", "1.2", {"Study": 12, "Preliminary": 12, "Detailed": 20, "Tender": 8, "Construction": 8}),
        ("Sarah Chen", "8", {"Tender": 32}),
        ("Sarah Chen", "9", {"Construction": 24}),
        # Tom Fitzgerald — Highway Design Lead
        ("Tom Fitzgerald", "2.1", {"Study": 16}),
        ("Tom Fitzgerald", "3.1", {"Detailed": 120}),
        ("Tom Fitzgerald", "3.2", {"Detailed": 80}),
        ("Tom Fitzgerald", "3.3", {"Detailed": 60}),
        ("Tom Fitzgerald", "5.1", {"Preliminary": 40}),
        ("Tom Fitzgerald", "5.2", {"Detailed": 32}),
        ("Tom Fitzgerald", "7", {"Detailed": 24}),
        ("Tom Fitzgerald", "8", {"Tender": 40}),
        ("Tom Fitzgerald", "9", {"Construction": 60}),
        # James Okafor — Structural
        ("James Okafor", "2.2", {"Study": 48}),
        ("James Okafor", "3.1", {"Detailed": 80}),
        ("James Okafor", "3.2", {"Detailed": 56}),
        ("James Okafor", "7", {"Detailed": 24}),
        ("James Okafor", "8", {"Tender": 40}),
        ("James Okafor", "9", {"Construction": 96}),
        # Priya Nair — Environmental
        ("Priya Nair", "2.1", {"Study": 24}),
        ("Priya Nair", "2.2", {"Study": 16}),
        ("Priya Nair", "4.1", {"Detailed": 60}),
        ("Priya Nair", "4.2", {"Detailed": 80}),
        ("Priya Nair", "6", {"Study": 140}),
        ("Priya Nair", "9", {"Construction": 24}),
        # Anika Sharma — Graduate, supporting multiple leads
        ("Anika Sharma", "2.1", {"Study": 40}),
        ("Anika Sharma", "2.2", {"Study": 24}),
        ("Anika Sharma", "3.1", {"Detailed": 80}),
        ("Anika Sharma", "3.2", {"Detailed": 60}),
        ("Anika Sharma", "3.3", {"Detailed": 40}),
        ("Anika Sharma", "4.1", {"Detailed": 40}),
        ("Anika Sharma", "4.2", {"Detailed": 48}),
        ("Anika Sharma", "5.2", {"Detailed": 24}),
        ("Anika Sharma", "6", {"Study": 40}),
        ("Anika Sharma", "7", {"Detailed": 32}),
        ("Anika Sharma", "8", {"Tender": 60}),
        ("Anika Sharma", "9", {"Construction": 40}),
    ]
    for person_name, wbs_code, hours in pricing_assignments:
        db.add(PricingRow(
            proposal_id=proposal_id,
            wbs_id=wbs_ids[wbs_code],
            person_id=person_ids[person_name],
            hourly_rate=next(p["hourly"] for p in people_data if p["name"] == person_name),
            cost_rate=next(p["cost"] for p in people_data if p["name"] == person_name),
            hours_by_phase=hours,
        ))

    # --- Schedule Items (8 items + 2 milestones, ~90 day span) ---
    schedule_data = [
        ("Topographic Survey", "2.1", today, today + timedelta(days=14), "Tom Fitzgerald", False, "Study"),
        ("Geotechnical Investigation", "2.2", today + timedelta(days=7), today + timedelta(days=28), "James Okafor", False, "Study"),
        ("Environmental Assessment", "6", today, today + timedelta(days=35), "Priya Nair", False, "Study"),
        ("Study Phase Complete", None, None, today + timedelta(days=35), None, True, "Study"),
        ("Traffic Analysis", "5.1", today + timedelta(days=21), today + timedelta(days=42), "Tom Fitzgerald", False, "Preliminary"),
        ("Highway Design", "3.1", today + timedelta(days=35), today + timedelta(days=63), "Tom Fitzgerald", False, "Detailed"),
        ("Drainage Design", "4.1", today + timedelta(days=42), today + timedelta(days=63), "Priya Nair", False, "Detailed"),
        ("Utilities Coordination", "7", today + timedelta(days=49), today + timedelta(days=70), "Tom Fitzgerald", False, "Detailed"),
        ("Design Freeze", None, None, today + timedelta(days=70), None, True, "Detailed"),
        ("Tender Package Preparation", "8", today + timedelta(days=70), today + timedelta(days=90), "Sarah Chen", False, "Tender"),
    ]
    for task_name, wbs_code, start, end, resp, milestone, phase in schedule_data:
        db.add(ScheduleItem(
            proposal_id=proposal_id,
            wbs_id=wbs_ids.get(wbs_code) if wbs_code else None,
            task_name=task_name,
            start_date=start if not milestone else end,
            end_date=end,
            responsible_party=resp,
            is_milestone=milestone,
            phase=phase,
        ))

    # --- Deliverables ---
    # Not pre-seeded — use the "Fetch from RFP" agent button on the Deliverables tab

    # --- Scope Sections (3 sections) ---
    scope_data = [
        ("Project Description",
         "The Ontario Ministry of Transportation requires engineering consulting services "
         "for the widening of Highway 401 through the Mississauga section, from Hurontario "
         "Street to Highway 403 interchange. The project involves adding one lane in each "
         "direction (6 to 8 lanes), including associated bridge modifications, drainage "
         "improvements, and noise barrier installations.",
         0),
        ("Scope of Work",
         "The consultant shall provide the following services:\n"
         "- Preliminary and detailed design for highway widening\n"
         "- Structural assessment and design for 3 bridge modifications\n"
         "- Stormwater management design and environmental compliance\n"
         "- Traffic management plan during construction\n"
         "- Utility coordination with regional utilities\n"
         "- Geotechnical investigation and pavement design\n"
         "- Preparation of tender documents and construction support",
         1),
        ("Deliverables Required",
         "The following deliverables are expected:\n"
         "1. Preliminary Design Report (PDR)\n"
         "2. Environmental Compliance Report\n"
         "3. Traffic Impact Assessment\n"
         "4. 30%, 60%, and 100% Design Drawings\n"
         "5. Specifications and Special Provisions\n"
         "6. Contract Documents and Tender Package",
         2),
    ]
    for name, content, order in scope_data:
        db.add(ScopeSection(
            proposal_id=proposal_id,
            section_name=name,
            content=content,
            order_index=order,
        ))

    # --- Disciplines (5 with contacts and mixed statuses) ---
    discipline_data = [
        ("Transportation", "Tom Fitzgerald", "t.fitzgerald@wsp.com", "416-555-0101", "confirmed", "Lead discipline", 0),
        ("Structural", "James Okafor", "j.okafor@wsp.com", "416-555-0102", "confirmed", "3 bridge modifications", 1),
        ("Environmental", "Priya Nair", "p.nair@wsp.com", "416-555-0103", "confirmed", "", 2),
        ("Geotechnical", "Michael Torres", "m.torres@wsp.com", "416-555-0104", "contacted", "Awaiting availability confirmation", 3),
        ("Electrical", "Lisa Park", "l.park@wsp.com", "", "not_contacted", "ITS & lighting scope TBD", 4),
    ]
    for disc_name, contact, email, phone, status, notes, order in discipline_data:
        db.add(ProposalDiscipline(
            proposal_id=proposal_id,
            discipline_name=disc_name,
            contact_name=contact,
            contact_email=email,
            contact_phone=phone,
            status=status,
            notes=notes,
            order_index=order,
        ))

    # --- Compliance Items (defaults with 3 completed, 1 in_progress) ---
    compliance_data = [
        ("Insurance ($5M Professional Liability)", "Financial", "completed", "Sarah Chen", 0),
        ("Bonding Capacity", "Financial", "completed", "Sarah Chen", 1),
        ("Conflict of Interest Declaration", "Legal", "completed", "Sarah Chen", 2),
        ("Teaming Agreements", "Legal", "in_progress", "Sarah Chen", 3),
        ("Subconsultant Letters of Intent", "Legal", "pending", "", 4),
        ("Certificate of Good Standing", "Administrative", "pending", "", 5),
        ("Security Clearance (if required)", "Administrative", "not_applicable", "", 6),
        ("AODA Compliance", "Technical", "pending", "", 7),
    ]
    for item_name, category, status, assigned, order in compliance_data:
        db.add(ComplianceItem(
            proposal_id=proposal_id,
            item_name=item_name,
            category=category,
            status=status,
            assigned_to=assigned,
            order_index=order,
        ))

    # --- Drawings ---
    # Not pre-seeded — use the "Fetch from RFP" agent button on the Drawing List tab

    # --- Relevant Projects (4 items) ---
    relevant_data = [
        ("Highway 404 Extension — Newmarket to Keswick", "221-40401-00", "Ontario Ministry of Transportation (MTO)",
         "York Region, ON", 4200000, "2023", "Prime Consultant", "Tom Fitzgerald",
         "Preliminary and detailed design for 18km highway extension\nInterchange design at 3 locations\nStormwater management and environmental compliance\nConstruction administration services",
         "Directly comparable MTO highway extension project. Demonstrates WSP's ability to manage large-scale highway projects from preliminary design through construction.",
         ["Tom Fitzgerald", "Anika Sharma"]),
        ("Highway 69/400 Widening — Sudbury Section", "221-69400-00", "Ontario Ministry of Transportation (MTO)",
         "Sudbury, ON", 6800000, "2021", "Prime Consultant", "Sarah Chen",
         "Detailed design for 4-lane to 6-lane widening over 25km corridor\nBridge replacement for 2 structures\nRock cut design in Canadian Shield terrain\nEnvironmental assessment and species at risk studies",
         "Large-scale highway widening project with similar scope to Highway 401. Demonstrates experience with complex terrain and bridge replacement.",
         ["Sarah Chen", "Priya Nair"]),
        ("Gardiner Expressway Rehabilitation", "221-GARD-00", "City of Toronto",
         "Toronto, ON", 12500000, "2022", "Prime Consultant", "Tom Fitzgerald",
         "Structural assessment and rehabilitation design for elevated expressway\nDeck replacement and barrier design\nTraffic management plan for urban expressway\nStakeholder consultation and public engagement",
         "Major urban expressway rehabilitation demonstrating WSP's expertise with high-profile infrastructure projects and complex traffic management.",
         ["Tom Fitzgerald", "James Okafor"]),
        ("Highway 11 Corridor Study — Barrie to Orillia", "221-HWY11-00", "Ontario Ministry of Transportation (MTO)",
         "Simcoe County, ON", 1800000, "2020", "Prime Consultant", "Sarah Chen",
         "Transportation corridor study and alternatives analysis\nTraffic forecasting and demand modeling\nEnvironmental screening and constraints mapping\nPublic consultation program",
         "MTO corridor study demonstrating WSP's planning capabilities. Environmental screening methodology applicable to Highway 401 scope.",
         ["Sarah Chen", "Priya Nair"]),
    ]
    for proj_name, proj_num, client, loc, val, year, role, pm, services, rel_notes, personnel_names in relevant_data:
        db.add(RelevantProject(
            proposal_id=proposal_id,
            project_name=proj_name,
            project_number=proj_num,
            client=client,
            location=loc,
            contract_value=val,
            year_completed=year,
            wsp_role=role,
            project_manager=pm,
            services_performed=services,
            relevance_notes=rel_notes,
            key_personnel_ids=[str(person_ids[n]) for n in personnel_names if n in person_ids],
        ))

    await db.commit()

    # --- Past MTO Proposals (2 additional proposals for same client) ---
    await _seed_past_mto_proposals(db, alice_id, proposal_id)


async def _seed_past_mto_proposals(db: AsyncSession, alice_id, main_proposal_id):
    """Seed 2 past MTO proposals + outreach records. Idempotent by proposal_number."""

    # --- Proposal 2: Highway 7 (won) ---
    result = await db.execute(
        select(Proposal).where(Proposal.proposal_number == "P-2023-0288")
    )
    p2 = result.scalar_one_or_none()
    if not p2:
        p2_id = uuid.uuid4()
        p2 = Proposal(
            id=p2_id,
            proposal_number="P-2023-0288",
            title="Highway 7 Corridor Study — Kitchener to Guelph",
            client_name="Ontario Ministry of Transportation (MTO)",
            status=ProposalStatus.won,
            target_dlm=2.8,
            phases=["Study", "Preliminary", "Detailed", "Tender"],
            submission_deadline=date(2023, 6, 15),
            debrief_notes=(
                "Strong technical proposal with innovative corridor modeling approach. "
                "Client appreciated the detailed stakeholder engagement plan. "
                "Team scored highest on technical approach (92/100)."
            ),
            client_feedback=(
                "WSP's proposal demonstrated excellent understanding of the corridor challenges. "
                "The project team's experience with similar MTO projects was a differentiator. "
                "Fee was competitive and well-justified."
            ),
            created_by=alice_id,
        )
        db.add(p2)
        await db.flush()
    else:
        p2_id = p2.id

    # --- Proposal 3: QEW Bridge (lost) ---
    result = await db.execute(
        select(Proposal).where(Proposal.proposal_number == "P-2022-0155")
    )
    p3 = result.scalar_one_or_none()
    if not p3:
        p3_id = uuid.uuid4()
        p3 = Proposal(
            id=p3_id,
            proposal_number="P-2022-0155",
            title="QEW Bridge Rehabilitation Assessment",
            client_name="Ontario Ministry of Transportation (MTO)",
            status=ProposalStatus.lost,
            target_dlm=3.2,
            phases=["Study", "Preliminary", "Detailed"],
            submission_deadline=date(2022, 9, 30),
            debrief_notes=(
                "Lost on price — technical score was strong (85/100) but fee was 12% above "
                "the winning bid. Client indicated our scope interpretation was broader than intended. "
                "Lesson: confirm scope boundaries during Q&A period."
            ),
            client_feedback=(
                "WSP's technical approach was well-received, particularly the bridge condition "
                "assessment methodology. However, the proposed level of effort exceeded the budget "
                "envelope. Consider right-sizing the team for future similar submissions."
            ),
            created_by=alice_id,
        )
        db.add(p3)
        await db.flush()
    else:
        p3_id = p3.id

    # --- Client Outreach Records (across all 3 MTO proposals) ---
    result = await db.execute(select(ClientOutreach).limit(1))
    if not result.scalar_one_or_none():
        outreach_data = [
            (main_proposal_id, date(2026, 2, 10), "meeting", "David Park", "Senior Project Manager, MTO",
             "Pre-RFP meeting to discuss Highway 401 widening scope and WSP's interest. David confirmed the RFP would be released in late February."),
            (main_proposal_id, date(2026, 2, 18), "email", "David Park", "Senior Project Manager, MTO",
             "Sent WSP capability statement and team resumes. David acknowledged receipt and confirmed review."),
            (p2_id, date(2023, 4, 5), "presentation", "Sandra Liu", "Director of Highway Planning, MTO",
             "Presented WSP's corridor modeling approach for Highway 7. Sandra expressed interest in the innovative traffic simulation methodology."),
            (p2_id, date(2023, 7, 20), "call", "Sandra Liu", "Director of Highway Planning, MTO",
             "Post-award debrief call. Sandra confirmed WSP scored highest on technical approach. Discussed lessons for future proposals."),
            (p3_id, date(2022, 8, 15), "meeting", "Robert Kim", "Bridge Program Manager, MTO",
             "Pre-submission meeting to clarify bridge assessment scope. Robert indicated budget constraints — should have adjusted scope accordingly."),
        ]
        for prop_id, odate, otype, contact, role, notes in outreach_data:
            db.add(ClientOutreach(
                proposal_id=prop_id,
                outreach_date=odate,
                outreach_type=otype,
                contact_name=contact,
                contact_role=role,
                notes=notes,
            ))

    await db.commit()
