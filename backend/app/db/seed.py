from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User, UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_USERS = [
    {"name": "Alice PM", "email": "alice@wsp.com", "password": "demo123", "role": UserRole.pm},
    {"name": "Bob Finance", "email": "bob@wsp.com", "password": "demo123", "role": UserRole.finance},
    {"name": "Carol Admin", "email": "carol@wsp.com", "password": "demo123", "role": UserRole.admin},
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
