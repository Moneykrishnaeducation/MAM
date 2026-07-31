"""Socket.IO server setup.

Mount `sio_app` next to your ASGI application, e.g. for FastAPI/Starlette:

    from app.realtime import sio_app
    app.mount("/ws", sio_app)
"""

import socketio

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
sio_app = socketio.ASGIApp(sio)


@sio.event
async def connect(sid: str, environ: dict) -> None:
    """Handle a new client connection."""


@sio.event
async def message(sid: str, data: str) -> None:
    """Echo messages to every connected client."""
    await sio.emit("message", data)


@sio.event
async def disconnect(sid: str) -> None:
    """Handle a client disconnect."""
