from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, proposals
from app.db.session import AsyncSessionLocal
from app.db.seed import seed_users


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncSessionLocal() as db:
        await seed_users(db)
    yield


app = FastAPI(title="WSP Proposal Tool", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(proposals.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
