import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, proposals, wbs, pricing, people, scope, schedule, deliverables, drawings, agents
from app.db.session import AsyncSessionLocal
from app.db.seed import seed_users
from app.websockets.manager import manager
from app.auth.jwt import decode_token


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
app.include_router(wbs.router)
app.include_router(pricing.router)
app.include_router(people.router)
app.include_router(scope.router)
app.include_router(schedule.router)
app.include_router(deliverables.router)
app.include_router(drawings.router)
app.include_router(agents.router)


@app.websocket("/ws/proposals/{proposal_id}")
async def proposal_ws(
    ws: WebSocket,
    proposal_id: str,
    token: str = Query(...),
    tab: str = Query("wbs"),
):
    # Authenticate via token query param (browsers can't set WS headers)
    payload = decode_token(token)
    user_name = payload.get("sub", "unknown") if payload else "unknown"

    await manager.connect(ws, proposal_id, user_name, tab)
    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except ValueError:
                continue

            # Handle tab-change notification
            if msg.get("type") == "tab_change":
                await manager.update_tab(ws, msg.get("tab", "wbs"))
                continue

            # Broadcast data-change to all other clients in the room
            msg["updated_by"] = user_name
            await manager.broadcast(proposal_id, msg, exclude=ws)

    except WebSocketDisconnect:
        manager.disconnect(ws)


@app.get("/health")
async def health():
    return {"status": "ok"}
