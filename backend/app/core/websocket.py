"""
Real-time WebSocket Manager — handles live notification broadcasts & messaging
between Master Admin, Doctor OPD, and Medical Shop Pharmacies.
"""
import json
import asyncio
from typing import List, Dict
from fastapi import WebSocket, WebSocketDisconnect


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, client_id: str = "guest"):
        await websocket.accept()
        self.active_connections.append(websocket)
        if client_id not in self.user_connections:
            self.user_connections[client_id] = []
        self.user_connections[client_id].append(websocket)

    def disconnect(self, websocket: WebSocket, client_id: str = "guest"):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if client_id in self.user_connections and websocket in self.user_connections[client_id]:
            self.user_connections[client_id].remove(websocket)

    async def broadcast(self, message: dict):
        """Broadcast a real-time message payload to all active WebSocket clients."""
        payload = json.dumps(message)
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                disconnected.append(connection)
        
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)

    async def send_personal_message(self, message: dict, client_id: str):
        """Send a real-time message to a specific user/clinic client connections."""
        payload = json.dumps(message)
        if client_id in self.user_connections:
            for connection in self.user_connections[client_id]:
                try:
                    await connection.send_text(payload)
                except Exception:
                    pass


ws_manager = ConnectionManager()
