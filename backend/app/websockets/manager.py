import json
import asyncio
from typing import Dict, Set
from fastapi import WebSocket


class ConnectionManager:
    """
    Manages WebSocket connections grouped by proposal_id rooms.
    Broadcasts field-level edits to all connected clients in a room.
    Message shape: { table, row_id, field, value, updated_by, tab }
    """

    def __init__(self):
        # proposal_id -> set of active WebSocket connections
        self._rooms: Dict[str, Set[WebSocket]] = {}
        # websocket -> (proposal_id, user_name, active_tab)
        self._meta: Dict[WebSocket, tuple] = {}

    async def connect(self, ws: WebSocket, proposal_id: str, user_name: str, tab: str = "wbs"):
        await ws.accept()
        if proposal_id not in self._rooms:
            self._rooms[proposal_id] = set()
        self._rooms[proposal_id].add(ws)
        self._meta[ws] = (proposal_id, user_name, tab)
        await self._broadcast_presence(proposal_id)

    def disconnect(self, ws: WebSocket):
        meta = self._meta.pop(ws, None)
        if not meta:
            return
        proposal_id = meta[0]
        room = self._rooms.get(proposal_id, set())
        room.discard(ws)
        if not room:
            self._rooms.pop(proposal_id, None)
        # Fire-and-forget presence update
        asyncio.create_task(self._broadcast_presence(proposal_id))

    async def update_tab(self, ws: WebSocket, tab: str):
        meta = self._meta.get(ws)
        if meta:
            proposal_id, user_name, _ = meta
            self._meta[ws] = (proposal_id, user_name, tab)
            await self._broadcast_presence(proposal_id)

    async def broadcast(self, proposal_id: str, message: dict, exclude: WebSocket | None = None):
        """Send a data-change message to all connections in the room."""
        room = self._rooms.get(proposal_id, set())
        dead: list[WebSocket] = []
        payload = json.dumps(message)
        for ws in list(room):
            if ws is exclude:
                continue
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def _broadcast_presence(self, proposal_id: str):
        """Broadcast current user-tab presence to all in the room."""
        room = self._rooms.get(proposal_id, set())
        if not room:
            return
        # Build presence map: tab -> list of user names
        presence: Dict[str, list] = {}
        for ws in list(room):
            meta = self._meta.get(ws)
            if meta:
                _, user_name, tab = meta
                presence.setdefault(tab, []).append(user_name)

        payload = json.dumps({"type": "presence", "presence": presence})
        dead: list[WebSocket] = []
        for ws in list(room):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


# Singleton shared across the app
manager = ConnectionManager()
