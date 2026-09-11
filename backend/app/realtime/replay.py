from collections import deque
from typing import Optional

from app.realtime.types import RealtimeMessageEnvelope


class RealtimeReplayBuffer:
    """In-memory ring buffer of recent realtime messages for fast reconnect replay."""

    def __init__(self, max_size: int = 256) -> None:
        self._max_size = max_size
        self._buffer: deque[RealtimeMessageEnvelope] = deque(maxlen=max_size)

    def append(self, message: RealtimeMessageEnvelope) -> None:
        self._buffer.append(message)

    def get_messages_since(self, from_sequence: int) -> Optional[list[RealtimeMessageEnvelope]]:
        """Return messages with sequence > from_sequence.

        Returns None if from_sequence is older than the oldest buffered message (evicted),
        indicating that a full resync is required.
        """
        if not self._buffer:
            return None

        min_seq = self._buffer[0].sequence
        max_seq = self._buffer[-1].sequence

        # Client is asking for something older than we have retained
        if from_sequence < min_seq - 1:
            return None

        # Client is already ahead or matching latest
        if from_sequence >= max_seq:
            return []

        # Return the missing slice
        return [msg for msg in self._buffer if msg.sequence > from_sequence]

    def clear(self) -> None:
        self._buffer.clear()

    @property
    def current_size(self) -> int:
        return len(self._buffer)

    @property
    def latest_sequence(self) -> Optional[int]:
        if self._buffer:
            return self._buffer[-1].sequence
        return None
