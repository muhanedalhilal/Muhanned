from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class GroupRealtimeManager:
    def __init__(self):
        self._connections: dict[int, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self._connections[user_id].add(websocket)

    async def disconnect(self, user_id: int, websocket: WebSocket):
        async with self._lock:
            sockets = self._connections.get(user_id)
            if not sockets:
                return
            sockets.discard(websocket)
            if not sockets:
                self._connections.pop(user_id, None)

    async def send_to_user(self, user_id: int, payload: dict[str, Any]):
        async with self._lock:
            sockets = list(self._connections.get(user_id, set()))

        stale = []
        for websocket in sockets:
            try:
                await websocket.send_json(payload)
            except Exception:
                stale.append(websocket)

        if stale:
            async with self._lock:
                active = self._connections.get(user_id)
                if active:
                    for websocket in stale:
                        active.discard(websocket)

    async def send_to_users(self, user_ids: list[int] | set[int], payload: dict[str, Any]):
        for user_id in set(user_ids):
            await self.send_to_user(user_id, payload)


group_realtime = GroupRealtimeManager()
