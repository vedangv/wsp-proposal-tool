from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User, UserRole
from app.models.proposal_template import ProposalTemplate

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
