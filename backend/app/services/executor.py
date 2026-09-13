import logging
import os
import sys
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

logger = logging.getLogger("sagara.mission_control.executor")

# Canonical error codes (frozen in adapter boundary contract)
ERROR_HERMES_UNAVAILABLE = "HERMES_UNAVAILABLE"
ERROR_HERMES_TIMEOUT = "HERMES_TIMEOUT"
ERROR_HERMES_EXECUTION_FAILED = "HERMES_EXECUTION_FAILED"
ERROR_HERMES_SESSION_RECEIPT_MISSING = "HERMES_SESSION_RECEIPT_MISSING"
ERROR_PROFILE_NOT_FOUND = "PROFILE_NOT_FOUND"
ERROR_PROFILE_NOT_TARGETABLE = "PROFILE_NOT_TARGETABLE"


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
    Production Hermes execution adapter — BLOCKER A fix (Prompt 15.0 Section 5).

    Canonical Hermes invocation contract:
        hermes -p <profile_id> chat --query-file - --oneshot -Q

    Invariants (all MUST be maintained):
    - shell=False always — typed argv list only
    - Explicit -p <profile_id> flag in argv — NOT via HERMES_HOME env var
    - Prompt delivered via --query-file temp file (no stdin race conditions)
    - Bounded execution timeout, stdout/stderr captured
    - Exit code captured
    - Authoritative session ID parsed from CLI receipt output
    - No shell command string construction
    - No heuristic session correlation (timestamp proximity, title matching, etc.)
    - OUTCOME_UNKNOWN on timeout → caller must NOT retry blindly
    """

    EXECUTOR_VERSION = "0.20.6"

    # Session ID pattern from Hermes -Q receipt:
    # Matches: "Session:        <id>", "session_id: <id>", "hermes --resume <id>"
    _SESSION_RECEIPT_PATTERN = re.compile(
        r"(?:Session:\s+|session_id:\s+|hermes\s+--resume\s+)([a-zA-Z0-9_\-]+)",
        re.IGNORECASE,
    )

    def __init__(
        self,
        binary_path: Optional[str] = None,
        hermes_home_dir: Optional[str] = None,
    ):
        self.binary_path = binary_path or settings.hermes_binary
        self.hermes_home_dir = hermes_home_dir or settings.hermes_home_dir

    def _resolve_profile_home(self, profile_id: str) -> Optional[str]:
        """Resolve the profile directory for a given profile_id (backward-compatibility helper)."""
        root = self.hermes_home_dir
        if not root or not os.path.isdir(root):
            return None
        if profile_id == "default":
            return root
        target_dir = os.path.join(root, "profiles", profile_id)
        if os.path.isdir(target_dir):
            return target_dir
        return None

    def _verify_profile_targetable(self, profile_id: str) -> bool:
        """
        Pre-flight: verify that the exact profile directory exists in the Hermes
        installation before attempting to invoke. This is a local-filesystem check
        only — it does NOT guarantee the profile is reachable on a remote VPS.

        Returns True if targetable locally, False otherwise.
        When HERMES_HOME_DIR is not configured (remote-only deployments),
        returns True to allow the CLI to perform its own validation.
        """
        root = self.hermes_home_dir
        if not root:
            # No local hermes home configured — allow the CLI flag to validate
            return True
        if not os.path.isdir(root):
            logger.warning("HERMES_HOME_DIR configured but directory not found: %s", root)
            return True  # Still allow CLI attempt on remote
        # Check for profile-specific directory under profiles/
        if profile_id == "default":
            return True  # default maps to hermes root
        target_dir = os.path.join(root, "profiles", profile_id)
        return os.path.isdir(target_dir)

    def _build_argv(
        self,
        profile_id: str,
        query_file_path: str,
        tools_enabled: bool,
        safe_mode: bool,
    ) -> list[str]:
        """
        Build the canonical Hermes argv list.

        Canonical form (Section 5 invariant):
            hermes -p <profile_id> chat --query-file <path> --oneshot -Q [--safe-mode]

        Profile is passed via the -p flag, NOT via environment variable.
        shell=False is enforced by the caller — this returns a list, never a string.
        """
        base_bin: list[str]
        if self.binary_path and self.binary_path.endswith(".py"):
            base_bin = [sys.executable, self.binary_path]
        else:
            base_bin = [self.binary_path or "hermes"]

        argv = base_bin + [
            "-p", profile_id,          # Explicit canonical profile selector
            "chat",
            "--query-file", query_file_path,
            "--oneshot",
            "-Q",                       # Quiet mode → session receipt on exit
        ]

        if not tools_enabled or safe_mode:
            argv.append("--safe-mode")

        return argv

    def _parse_session_id(self, combined_output: str) -> Optional[str]:
        """Extract authoritative session ID from Hermes -Q receipt output.
        Returns None if no direct receipt is found.
        Does NOT fall back to heuristic / timestamp correlation.
        """
        match = self._SESSION_RECEIPT_PATTERN.search(combined_output)
        if match:
            return match.group(1).strip()
        return None

    async def dispatch_task(
        self,
        request: TaskDispatchExecutionRequest,
    ) -> TaskDispatchExecutionResult:
        """
        Dispatch a task to Hermes using the canonical CLI contract.
        
        Profile is selected exclusively via -p <profile_id> argv flag.
        No shell=True. No HERMES_HOME env-based profile routing.
        Session receipt is parsed directly from subprocess output.
        OUTCOME_UNKNOWN is returned on timeout — caller must NOT retry.
        """
        submitted_at_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        # --- Pre-flight 1: Validate binary path ---
        if not self.binary_path or not os.path.isfile(self.binary_path):
            logger.error(
                "Hermes binary not found at configured path: %s",
                self.binary_path,
            )
            return TaskDispatchExecutionResult(
                hermes_session_id=None,
                outcome="FAILED_PRE_SUBMISSION",
                submitted_at=submitted_at_str,
                acknowledged_at=None,
                executor_type="HermesTaskDispatchExecutor",
                executor_version=self.EXECUTOR_VERSION,
                raw_output_snippet="Configured Hermes binary path does not exist or is not executable.",
                error_code=ERROR_HERMES_UNAVAILABLE,
            )

        # --- Pre-flight 2: Validate explicit profile targetability ---
        # Fail closed: if profile directory does not exist locally, reject.
        # No fallback to 'default', 'lead', or 'sagara-lab'. (Section 6)
        if not self._verify_profile_targetable(request.profile_id):
            logger.error(
                "Profile '%s' is not present in Hermes profiles directory. Failing closed.",
                request.profile_id,
            )
            return TaskDispatchExecutionResult(
                hermes_session_id=None,
                outcome="FAILED_PRE_SUBMISSION",
                submitted_at=submitted_at_str,
                acknowledged_at=None,
                executor_type="HermesTaskDispatchExecutor",
                executor_version=self.EXECUTOR_VERSION,
                raw_output_snippet=(
                    f"Profile '{request.profile_id}' is not installed in Hermes profiles directory. "
                    "No fallback profile will be used."
                ),
                error_code=ERROR_PROFILE_NOT_TARGETABLE,
            )

        # --- Step 3: Write prompt to isolated temp file ---
        # This avoids shell interpolation for prompts with special characters.
        tmp_fd, tmp_query_path = tempfile.mkstemp(
            prefix=f"mc_task_{request.task_id}_",
            suffix=".txt",
        )
        try:
            with os.fdopen(tmp_fd, "w", encoding="utf-8") as f:
                f.write(request.prompt)

            # --- Step 4: Build canonical typed argv (NO shell=True, NO string concat) ---
            argv = self._build_argv(
                profile_id=request.profile_id,
                query_file_path=tmp_query_path,
                tools_enabled=request.tools_enabled,
                safe_mode=request.safe_mode,
            )

            # Env: do NOT inject HERMES_HOME — let -p flag be the sole profile selector.
            # Pass a clean copy of environment without HERMES_HOME to prevent
            # residual env-based profile routing from overriding the -p flag.
            env = {k: v for k, v in os.environ.items() if k != "HERMES_HOME"}

            timeout_sec = min(request.timeout_seconds, 600.0)

            logger.info(
                "Dispatching Hermes task: profile=%s task=%s timeout=%.0fs argv=%s",
                request.profile_id,
                request.task_id,
                timeout_sec,
                argv[:4],  # Only log first 4 elements to avoid logging prompt path
            )

            # --- Step 5: Invoke Hermes subprocess (shell=False enforced) ---
            try:
                proc = subprocess.run(
                    argv,
                    env=env,
                    stdin=subprocess.DEVNULL,   # Prompt is via --query-file, not stdin
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    timeout=timeout_sec,
                    check=False,
                    shell=False,                 # MANDATORY: never shell=True
                )
            except subprocess.TimeoutExpired:
                # AMBIGUOUS OUTCOME: process was launched but timed out.
                # Per Section 40: MUST NOT retry. Caller must reconcile.
                logger.warning(
                    "Hermes dispatch timed out after %.0fs for task=%s profile=%s",
                    timeout_sec,
                    request.task_id,
                    request.profile_id,
                )
                return TaskDispatchExecutionResult(
                    hermes_session_id=None,
                    outcome="OUTCOME_UNKNOWN",
                    submitted_at=submitted_at_str,
                    acknowledged_at=None,
                    executor_type="HermesTaskDispatchExecutor",
                    executor_version=self.EXECUTOR_VERSION,
                    raw_output_snippet=(
                        f"Hermes dispatch timed out after {timeout_sec}s. "
                        "Outcome unknown — reconciliation required. DO NOT retry."
                    ),
                    error_code=ERROR_HERMES_TIMEOUT,
                )
            except Exception as err:
                logger.error(
                    "Subprocess spawn failed for task=%s profile=%s: %s",
                    request.task_id,
                    request.profile_id,
                    err,
                )
                return TaskDispatchExecutionResult(
                    hermes_session_id=None,
                    outcome="FAILED_PRE_SUBMISSION",
                    submitted_at=submitted_at_str,
                    acknowledged_at=None,
                    executor_type="HermesTaskDispatchExecutor",
                    executor_version=self.EXECUTOR_VERSION,
                    raw_output_snippet=f"Subprocess spawn failed: {type(err).__name__}",
                    error_code=ERROR_HERMES_UNAVAILABLE,
                )

            # --- Step 6: Capture and bound output ---
            stdout_text = proc.stdout or ""
            stderr_text = proc.stderr or ""
            combined_output = (stdout_text + "\n" + stderr_text)[:4096]

            ack_at_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

            # --- Step 7: Parse authoritative session ID from CLI receipt ---
            # Uses direct receipt pattern only — NO heuristic correlation.
            # Hermes -Q produces: "Session:  <id>" on exit.
            session_id = self._parse_session_id(combined_output)

            if session_id:
                logger.info(
                    "Hermes task acknowledged: profile=%s task=%s session=%s",
                    request.profile_id,
                    request.task_id,
                    session_id,
                )
                return TaskDispatchExecutionResult(
                    hermes_session_id=session_id,
                    outcome="ACKNOWLEDGED",
                    submitted_at=submitted_at_str,
                    acknowledged_at=ack_at_str,
                    executor_type="HermesTaskDispatchExecutor",
                    executor_version=self.EXECUTOR_VERSION,
                    raw_output_snippet=combined_output,
                    error_code=None,
                )

            # Session ID not found in output
            if proc.returncode != 0:
                logger.warning(
                    "Hermes returned non-zero exit code=%d for task=%s profile=%s. No session receipt.",
                    proc.returncode,
                    request.task_id,
                    request.profile_id,
                )
                return TaskDispatchExecutionResult(
                    hermes_session_id=None,
                    outcome="FAILED_PRE_SUBMISSION",
                    submitted_at=submitted_at_str,
                    acknowledged_at=None,
                    executor_type="HermesTaskDispatchExecutor",
                    executor_version=self.EXECUTOR_VERSION,
                    raw_output_snippet=combined_output,
                    error_code=ERROR_HERMES_EXECUTION_FAILED,
                )

            # Exit 0 but no session receipt — ambiguous
            logger.warning(
                "Hermes exit 0 but no authoritative session receipt for task=%s profile=%s.",
                request.task_id,
                request.profile_id,
            )
            return TaskDispatchExecutionResult(
                hermes_session_id=None,
                outcome="OUTCOME_UNKNOWN",
                submitted_at=submitted_at_str,
                acknowledged_at=None,
                executor_type="HermesTaskDispatchExecutor",
                executor_version=self.EXECUTOR_VERSION,
                raw_output_snippet=combined_output,
                error_code=ERROR_HERMES_SESSION_RECEIPT_MISSING,
            )

        finally:
            # Always clean up temp file
            if os.path.exists(tmp_query_path):
                try:
                    os.remove(tmp_query_path)
                except Exception:
                    pass
