"""
Phase 8 - Real-Time Tracking WebSocket Connection Manager.

Maintains active WebSocket connections segregated by mission_id so that
GPS telemetry is routed only to authorized/subscribed stakeholders.
"""

from __future__ import annotations

import logging
from typing import Dict, Set, Any
from fastapi import WebSocket, status

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket client connections segmented into mission rooms.
    """

    def __init__(self) -> None:
        # mission_id -> Set of active WebSocket connections
        self._rooms: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, mission_id: str) -> None:
        """
        Accepts and registers a new WebSocket connection into the specified mission room.
        """
        await websocket.accept()
        if mission_id not in self._rooms:
            self._rooms[mission_id] = set()
        self._rooms[mission_id].add(websocket)
        logger.info(
            "WebSocket client connected to mission [%s]. Total clients in room: %d",
            mission_id,
            len(self._rooms[mission_id]),
        )

    def disconnect(self, websocket: WebSocket, mission_id: str) -> None:
        """
        Safely unregisters a WebSocket connection from the specified mission room.
        """
        if mission_id in self._rooms:
            self._rooms[mission_id].discard(websocket)
            if not self._rooms[mission_id]:
                del self._rooms[mission_id]
            logger.info("WebSocket client disconnected from mission [%s]", mission_id)

    async def broadcast_to_mission(self, mission_id: str, message_data: dict[str, Any]) -> int:
        """
        Broadcasts a JSON message to all clients subscribed to the given mission.
        Returns the number of clients that successfully received the message.
        Automatically cleans up any dead or disconnected sockets.
        """
        clients = self._rooms.get(mission_id, set()).copy()
        if not clients:
            return 0

        success_count = 0
        dead_sockets: Set[WebSocket] = set()

        for ws in clients:
            try:
                await ws.send_json(message_data)
                success_count += 1
            except Exception as exc:
                logger.warning(
                    "Failed to deliver message to WebSocket in mission [%s]: %s",
                    mission_id,
                    exc,
                )
                dead_sockets.add(ws)

        # Cleanup dead sockets
        for dead_ws in dead_sockets:
            self.disconnect(dead_ws, mission_id)

        return success_count

    def get_active_count(self, mission_id: str | None = None) -> int:
        """
        Returns active client count for a specific mission or total across all missions.
        """
        if mission_id:
            return len(self._rooms.get(mission_id, set()))
        return sum(len(clients) for clients in self._rooms.values())

    def get_active_missions(self) -> list[str]:
        """
        Returns list of mission IDs with active WebSocket subscribers.
        """
        return list(self._rooms.keys())


# Global singleton instance
tracking_ws_manager = ConnectionManager()
