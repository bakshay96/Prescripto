"""
WebSocket Endpoints — /api/v1/ws
Real-time bidirectional WebSocket connection for instant Doctor, Pharmacy, and Admin updates.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.core.websocket import ws_manager
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/ws", tags=["Realtime WebSocket"])


class WSBroadcastPayload(BaseModel):
    event: str  # broadcast_message, chat_message, subscription_updated, reping_message
    title: str
    message: str
    target_role: Optional[str] = "ALL"
    target_clinic_id: Optional[str] = None
    priority: Optional[str] = "INFO"
    expires_at: Optional[str] = None


@router.websocket("/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """Establishes real-time persistent WebSocket connection."""
    await ws_manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo heartbeat or client message
            await websocket.send_json({"event": "pong", "data": data})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, client_id)
    except Exception:
        ws_manager.disconnect(websocket, client_id)


@router.post("/broadcast")
async def trigger_ws_broadcast(payload: WSBroadcastPayload):
    """Trigger a real-time WebSocket broadcast to all connected Doctor, Pharmacy, and Admin screens."""
    data_dict = payload.model_dump()
    await ws_manager.broadcast(data_dict)
    return {"message": "WebSocket broadcast dispatched successfully.", "payload": data_dict}
