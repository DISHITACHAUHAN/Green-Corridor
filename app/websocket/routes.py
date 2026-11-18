"""
Phase 8 - Real-Time Tracking WebSocket Routes.

Provides the mission-segregated WebSocket endpoint:
/ws/tracking/{mission_id}
"""

from __future__ import annotations

import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from jose import jwt, JWTError

from app.core.security import SECRET_KEY, ALGORITHM
from app.websocket.manager import tracking_ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket Real-Time Tracking"])


def _validate_ws_token(token: Optional[str]) -> Optional[dict]:
    """
    Validates optional JWT token provided via query parameter.
    Returns payload if valid, None if no token provided.
    Raises ValueError if token is invalid or expired.
    """
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as exc:
        raise ValueError("Invalid or expired authentication token") from exc


@router.websocket("/ws/tracking/{mission_id}")
async def mission_tracking_ws(
    websocket: WebSocket,
    mission_id: str,
    token: Optional[str] = Query(None),
):
    """
    WebSocket endpoint for real-time ambulance tracking.
    Clients subscribe to updates for a specific mission_id.
    
    Query Parameters:
      - token (optional): JWT Bearer token for authenticated role validation.
    """
    # Validate token if supplied
    user_payload = None
    if token:
        try:
            user_payload = _validate_ws_token(token)
        except ValueError as err:
            logger.warning("WebSocket auth rejected for mission [%s]: %s", mission_id, err)
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized")
            return

    # Accept connection and register into mission room
    await tracking_ws_manager.connect(websocket, mission_id)

    try:
        # Send initial confirmation handshake
        await websocket.send_json({
            "type": "connection_established",
            "mission_id": mission_id,
            "status": "connected",
            "active_subscribers": tracking_ws_manager.get_active_count(mission_id),
            "authenticated": user_payload is not None,
            "user_email": user_payload.get("sub") if user_payload else None,
            "user_role": user_payload.get("role") if user_payload else "guest",
        })

        # Keep connection alive & handle incoming client messages (e.g. ping/heartbeat)
        while True:
            client_msg = await websocket.receive_text()
            if client_msg == "ping":
                await websocket.send_text("pong")
            else:
                # Echo receipt
                logger.debug("Received WebSocket message from client in [%s]: %s", mission_id, client_msg)

    except WebSocketDisconnect:
        tracking_ws_manager.disconnect(websocket, mission_id)
    except Exception as exc:
        logger.error("Error in WebSocket session for mission [%s]: %s", mission_id, exc)
        tracking_ws_manager.disconnect(websocket, mission_id)
