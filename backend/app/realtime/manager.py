import asyncio
import logging
import uuid
from typing import Optional
from fastapi import WebSocket

from app.config import settings
from app.realtime.delta import RealtimeDeltaService
from app.realtime.protocol import (
    create_delta_message,
    create_heartbeat_message,
    create_resync_message,
    create_snapshot_message,
)
from app.realtime.replay import RealtimeReplayBuffer
from app.realtime.types import (
    CanonicalRealtimeSnapshot,
    RealtimeMessageEnvelope,
)

logger = logging.getLogger("mission_control.realtime")


class ClientSession:
    """Encapsulates a connected WebSocket client with a bounded outgoing queue."""

    def __init__(self, client_id: str, websocket: WebSocket, queue_size: int = 64) -> None:
        self.client_id = client_id
        self.websocket = websocket
        self.queue: asyncio.Queue[RealtimeMessageEnvelope] = asyncio.Queue(maxsize=queue_size)
        self.writer_task: Optional[asyncio.Task] = None
        self.is_closing: bool = False


class RealtimeConnectionManager:
    """Manages WebSocket client connections, sequencing, replay, backpressure, and broadcasting."""

    def __init__(
        self,
        replay_size: int = 256,
        client_queue_size: int = 64,
        max_connections: int = 50,
    ) -> None:
        self.server_instance_id: str = f"mc-{uuid.uuid4().hex[:8]}"
        self.sequence: int = 0
        self.replay_buffer = RealtimeReplayBuffer(max_size=replay_size)
        self.client_queue_size = client_queue_size
        self.max_connections = max_connections
        self._delta_service = RealtimeDeltaService()
        self._latest_snapshot: Optional[CanonicalRealtimeSnapshot] = None
        self._clients: dict[str, ClientSession] = {}
        self._lock = asyncio.Lock()

        # Diagnostics counters
        self.slow_client_drops: int = 0
        self.resync_events: int = 0
        self.broadcast_count: int = 0

    @property
    def connected_clients_count(self) -> int:
        return len(self._clients)

    @property
    def latest_snapshot(self) -> Optional[CanonicalRealtimeSnapshot]:
        return self._latest_snapshot

    def is_at_capacity(self) -> bool:
        return len(self._clients) >= self.max_connections

    async def register(self, websocket: WebSocket) -> Optional[ClientSession]:
        """Register a new client session. Returns None if server is at connection capacity."""
        async with self._lock:
            if self.is_at_capacity():
                logger.warning(
                    f"Connection rejected: reached capacity ({self.max_connections} connections)"
                )
                return None

            client_id = f"client-{uuid.uuid4().hex[:8]}"
            session = ClientSession(client_id, websocket, queue_size=self.client_queue_size)
            self._clients[client_id] = session

            session.writer_task = asyncio.create_task(
                self._client_writer_loop(session),
                name=f"ws-writer-{client_id}",
            )
            logger.info(
                f"WebSocket client registered: {client_id} (total active: {len(self._clients)})"
            )
            return session

    async def unregister(self, client_id: str) -> None:
        """Unregister and cleanly clean up a client session."""
        session: Optional[ClientSession] = None
        async with self._lock:
            session = self._clients.pop(client_id, None)

        if session:
            session.is_closing = True
            if session.writer_task and not session.writer_task.done():
                session.writer_task.cancel()
                try:
                    await asyncio.wait_for(session.writer_task, timeout=1.0)
                except (asyncio.CancelledError, asyncio.TimeoutError):
                    pass
            logger.info(
                f"WebSocket client unregistered: {client_id} (total active: {len(self._clients)})"
            )

    async def _client_writer_loop(self, session: ClientSession) -> None:
        """Drain client queue and send over WebSocket."""
        try:
            while not session.is_closing:
                message = await session.queue.get()
                try:
                    text_payload = message.model_dump_json()
                    await session.websocket.send_text(text_payload)
                finally:
                    session.queue.task_done()
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.warning(f"Error in client writer {session.client_id}: {exc}")
        finally:
            # Ensure cleanup if writer finishes unexpectedly
            if session.client_id in self._clients and not session.is_closing:
                asyncio.create_task(self.unregister(session.client_id))

    async def send_to_client(self, session: ClientSession, message: RealtimeMessageEnvelope) -> bool:
        """Enqueue a message for a single client with bounded queue backpressure."""
        if session.is_closing:
            return False

        try:
            session.queue.put_nowait(message)
            return True
        except asyncio.QueueFull:
            self.slow_client_drops += 1
            logger.warning(
                f"Backpressure: Queue full for slow client {session.client_id}. Initiating resync/disconnect."
            )
            # Send resync_required or close
            try:
                # Drain one old message if possible to fit resync_required
                try:
                    _ = session.queue.get_nowait()
                    session.queue.task_done()
                except (asyncio.QueueEmpty, ValueError):
                    pass

                self.resync_events += 1
                resync_msg = create_resync_message(
                    sequence=self.sequence,
                    server_instance_id=self.server_instance_id,
                    reason="slow_client_backpressure",
                )
                session.queue.put_nowait(resync_msg)
            except Exception:
                # If still failing, trigger disconnect
                asyncio.create_task(self.unregister(session.client_id))
            return False

    async def broadcast(self, message: RealtimeMessageEnvelope) -> None:
        """Broadcast message to all connected clients."""
        self.broadcast_count += 1
        sessions = list(self._clients.values())
        for s in sessions:
            await self.send_to_client(s, message)

    async def handle_new_snapshot(self, snapshot: CanonicalRealtimeSnapshot) -> Optional[RealtimeMessageEnvelope]:
        """Receive a fresh snapshot from the sampler, compute diff, and broadcast if changed."""
        async with self._lock:
            if self._latest_snapshot is None:
                # First snapshot since startup
                self.sequence += 1
                msg = create_snapshot_message(
                    snapshot_data=snapshot,
                    sequence=self.sequence,
                    server_instance_id=self.server_instance_id,
                    generated_at=snapshot.generated_at,
                )
                self.replay_buffer.append(msg)
                self._latest_snapshot = snapshot
                await self.broadcast(msg)
                return msg

            # Compute pure delta against previous snapshot
            delta = self._delta_service.compute_delta(self._latest_snapshot, snapshot)
            if delta is None:
                # No meaningful domain change: suppress transmission
                return None

            self.sequence += 1
            msg = create_delta_message(
                delta=delta,
                sequence=self.sequence,
                server_instance_id=self.server_instance_id,
            )
            self.replay_buffer.append(msg)
            self._latest_snapshot = snapshot
            await self.broadcast(msg)
            return msg

    async def send_heartbeat(self) -> None:
        """Broadcast periodic transport heartbeat."""
        async with self._lock:
            msg = create_heartbeat_message(
                sequence=self.sequence,
                server_instance_id=self.server_instance_id,
            )
            await self.broadcast(msg)

    async def close_all(self) -> None:
        """Cleanly close all connected clients on server shutdown."""
        async with self._lock:
            sessions = list(self._clients.values())
            self._clients.clear()

        for s in sessions:
            s.is_closing = True
            if s.writer_task and not s.writer_task.done():
                s.writer_task.cancel()
            try:
                await s.websocket.close(code=1000, reason="Server shutting down")
            except Exception:
                pass
        logger.info("All WebSocket connections cleanly closed")
