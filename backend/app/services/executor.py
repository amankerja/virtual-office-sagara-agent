import os
import re
import subprocess
import tempfile
from datetime import datetime, timezone
from typing import Protocol, Optional
from app.api.errors import AppError
from app.config import settings
from app.domain.execution import (
    TaskDispatchExecutionRequest,
    TaskDispatchExecutionResult,
)


class TaskDispatchExecutor(Protocol):
    """Protocol for task dispatch executors (Prompt 14 Section 22)."""

    async def dispatch_task(
        self,
        request: TaskDispatchExecutionRequest,
    ) -> TaskDispatchExecutionResult:
        ...


class DisabledActionExecutor:
    """Default fail-closed executor raising ACTION_EXECUTION_DISABLED."""

    async def dispatch_task(
        self,
        request: TaskDispatchExecutionRequest,
    ) -> TaskDispatchExecutionResult:
        raise AppError(
            status_code=403,
            code="ACTION_EXECUTION_DISABLED",
            message="Production action execution is disabled. Controlled dispatch is locked.",
        )


class FakeHermesTaskDispatchExecutor:
    """
    Deterministic synthetic executor for testing and verification (Prompt 14 Section 91).
    Simulates successful session creation, timeouts, pre-submission failures, and ambiguous outcomes.
    """

    def __init__(
        self,
        simulated_session_id: str = "sess-syn-001",
        force_outcome: Optional[str] = None,
        force_error_code: Optional[str] = None,
    ):
        self.simulated_session_id = simulated_session_id
        self.force_outcome = force_outcome
        self.force_error_code = force_error_code
        self.call_count: int = 0
        self.last_request: Optional[TaskDispatchExecutionRequest] = None

    async def dispatch_task(
        self,
        request: TaskDispatchExecutionRequest,
    ) -> TaskDispatchExecutionResult:
        self.call_count += 1
        self.last_request = request
        now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        outcome = self.force_outcome or "ACKNOWLEDGED"

        if outcome == "FAILED_PRE_SUBMISSION":
            return TaskDispatchExecutionResult(
                hermes_session_id=None,
                outcome="FAILED_PRE_SUBMISSION",
                submitted_at=now_str,
                acknowledged_at=None,
                executor_type="FakeHermesTaskDispatchExecutor",
                executor_version="synthetic-1.0",
                raw_output_snippet="Synthetic pre-submission failure before external process invocation",
                error_code=self.force_error_code or "SYNTHETIC_PRE_SUBMISSION_ERROR",
            )

        if outcome == "OUTCOME_UNKNOWN":
            return TaskDispatchExecutionResult(
                hermes_session_id=None,
                outcome="OUTCOME_UNKNOWN",
                submitted_at=now_str,
                acknowledged_at=None,
                executor_type="FakeHermesTaskDispatchExecutor",
                executor_version="synthetic-1.0",
                raw_output_snippet="Synthetic ambiguous timeout: Hermes invocation submitted but response lost",
                error_code=self.force_error_code or "HERMES_EXECUTION_TIMEOUT",
            )

        # Successful ACKNOWLEDGED outcome
        session_id = f"{self.simulated_session_id}-{self.call_count}"
        return TaskDispatchExecutionResult(
            hermes_session_id=session_id,
            outcome="ACKNOWLEDGED",
            submitted_at=now_str,
            acknowledged_at=now_str,
            executor_type="FakeHermesTaskDispatchExecutor",
            executor_version="synthetic-1.0",
            raw_output_snippet=f"Session: {session_id}\nSynthetic execution acknowledged successfully.",
            error_code=None,
        )


class HermesTaskDispatchExecutor:
    """
    Production Hermes execution adapter (Prompt 14 Section 19-22).
    Invariants:
    - Never shell=True
    - Typed argv subprocess invocation
    - Bounded execution timeout and output size
    - Safe query-file transfer (no raw shell string interpolation)
    - Exact profile targeting via HERMES_HOME
    - Direct session receipt verification (Session: <id>)
    """

    def __init__(
        self,
        binary_path: Optional[str] = None,
        hermes_home_dir: Optional[str] = None,
    ):
        self.binary_path = binary_path or settings.hermes_binary
        self.hermes_home_dir = hermes_home_dir or settings.hermes_home_dir

    def _resolve_profile_home(self, profile_id: str) -> Optional[str]:
        """Verify if exact profile directory exists under Hermes home (Prompt 14 Section 38-42)."""
        root = self.hermes_home_dir or os.path.expanduser("~/.hermes")
        if profile_id == "default":
            return root
        target_dir = os.path.join(root, "profiles", profile_id)
        if os.path.isdir(target_dir):
            return target_dir
        return None

    async def dispatch_task(
        self,
        request: TaskDispatchExecutionRequest,
    ) -> TaskDispatchExecutionResult:
        submitted_at_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        # 1. Validate Binary Path
        if not self.binary_path or not os.path.isfile(self.binary_path):
            return TaskDispatchExecutionResult(
                hermes_session_id=None,
                outcome="FAILED_PRE_SUBMISSION",
                submitted_at=submitted_at_str,
                acknowledged_at=None,
                executor_type="HermesTaskDispatchExecutor",
                executor_version="unknown",
                raw_output_snippet="Configured Hermes binary path does not exist or is not executable.",
                error_code="HERMES_EXECUTION_UNAVAILABLE",
            )

        # 2. Targetability Verification (Exact Profile Target)
        profile_home = self._resolve_profile_home(request.profile_id)
        if not profile_home:
            return TaskDispatchExecutionResult(
                hermes_session_id=None,
                outcome="FAILED_PRE_SUBMISSION",
                submitted_at=submitted_at_str,
                acknowledged_at=None,
                executor_type="HermesTaskDispatchExecutor",
                executor_version="0.20.6",
                raw_output_snippet=f"Profile '{request.profile_id}' is not installed in Hermes profiles directory.",
                error_code="HERMES_PROFILE_NOT_TARGETABLE",
            )

        # 3. Create isolated temporary query file to avoid shell escaping
        tmp_fd, tmp_query_path = tempfile.mkstemp(prefix=f"task_{request.task_id}_", suffix=".txt")
        try:
            with os.fdopen(tmp_fd, "w", encoding="utf-8") as f:
                f.write(request.prompt)

            # Build typed argv list (NO shell=True)
            argv = [
                self.binary_path,
                "chat",
                "--query-file",
                tmp_query_path,
                "-Q",
                "--oneshot",
            ]

            if not request.tools_enabled or request.safe_mode:
                argv.append("--safe-mode")

            env = dict(os.environ)
            env["HERMES_HOME"] = profile_home

            timeout_sec = min(request.timeout_seconds, 600.0)

            # 4. Invoke Hermes subprocess
            try:
                proc = subprocess.run(
                    argv,
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    timeout=timeout_sec,
                    check=False,
                )
            except subprocess.TimeoutExpired:
                # Ambiguous Outcome: process was launched but timed out
                # Section 56 & 83: MUST NOT blindly retry!
                return TaskDispatchExecutionResult(
                    hermes_session_id=None,
                    outcome="OUTCOME_UNKNOWN",
                    submitted_at=submitted_at_str,
                    acknowledged_at=None,
                    executor_type="HermesTaskDispatchExecutor",
                    executor_version="0.20.6",
                    raw_output_snippet=f"Hermes dispatch timed out after {timeout_sec}s. Outcome unknown.",
                    error_code="HERMES_EXECUTION_TIMEOUT",
                )
            except Exception as err:
                return TaskDispatchExecutionResult(
                    hermes_session_id=None,
                    outcome="FAILED_PRE_SUBMISSION",
                    submitted_at=submitted_at_str,
                    acknowledged_at=None,
                    executor_type="HermesTaskDispatchExecutor",
                    executor_version="0.20.6",
                    raw_output_snippet=f"Subprocess spawn failed: {err}",
                    error_code="HERMES_EXECUTION_UNAVAILABLE",
                )

            stdout_text = proc.stdout or ""
            stderr_text = proc.stderr or ""
            combined_output = (stdout_text + "\n" + stderr_text)[:4096]

            # 5. Parse Direct Session ID from Output
            # Hermes outputs: 'Session:        {session_id}' in exit summary
            match = re.search(r"Session:\s+([a-zA-Z0-9_\-]+)", stdout_text)
            if not match:
                # Secondary pattern: 'hermes --resume ([a-zA-Z0-9_\-]+)'
                match = re.search(r"hermes\s+--resume\s+([a-zA-Z0-9_\-]+)", stdout_text)

            ack_at_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

            if match:
                session_id = match.group(1).strip()
                return TaskDispatchExecutionResult(
                    hermes_session_id=session_id,
                    outcome="ACKNOWLEDGED",
                    submitted_at=submitted_at_str,
                    acknowledged_at=ack_at_str,
                    executor_type="HermesTaskDispatchExecutor",
                    executor_version="0.20.6",
                    raw_output_snippet=combined_output,
                    error_code=None,
                )
            else:
                # If exit code is non-zero and no session was ever printed
                if proc.returncode != 0:
                    return TaskDispatchExecutionResult(
                        hermes_session_id=None,
                        outcome="FAILED_PRE_SUBMISSION",
                        submitted_at=submitted_at_str,
                        acknowledged_at=None,
                        executor_type="HermesTaskDispatchExecutor",
                        executor_version="0.20.6",
                        raw_output_snippet=combined_output,
                        error_code="HERMES_EXECUTION_REJECTED",
                    )
                # If process returned 0 but session ID could not be proven directly
                return TaskDispatchExecutionResult(
                    hermes_session_id=None,
                    outcome="OUTCOME_UNKNOWN",
                    submitted_at=submitted_at_str,
                    acknowledged_at=None,
                    executor_type="HermesTaskDispatchExecutor",
                    executor_version="0.20.6",
                    raw_output_snippet=combined_output,
                    error_code="DIRECT_SESSION_RECEIPT_UNAVAILABLE",
                )

        finally:
            if os.path.exists(tmp_query_path):
                try:
                    os.remove(tmp_query_path)
                except Exception:
                    pass
