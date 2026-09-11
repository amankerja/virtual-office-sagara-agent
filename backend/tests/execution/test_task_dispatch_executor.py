import os
import subprocess
import tempfile
from unittest.mock import MagicMock, patch
import pytest

from app.api.errors import AppError
from app.domain.execution import TaskDispatchExecutionRequest
from app.services.executor import (
    DisabledActionExecutor,
    FakeHermesTaskDispatchExecutor,
    HermesTaskDispatchExecutor,
)


@pytest.mark.asyncio
async def test_disabled_action_executor_fails_closed():
    executor = DisabledActionExecutor()
    req = TaskDispatchExecutionRequest(
        intent_id="act-1",
        task_id="task-1",
        profile_id="default",
        task_revision=1,
        payload_hash="hash-1",
        correlation_id="corr-1",
        execution_authorization_id="auth-1",
        prompt="Do work",
    )
    with pytest.raises(AppError) as exc_info:
        await executor.dispatch_task(req)
    assert exc_info.value.status_code == 403
    assert exc_info.value.code == "ACTION_EXECUTION_DISABLED"


@pytest.mark.asyncio
async def test_fake_hermes_executor_happy_path():
    executor = FakeHermesTaskDispatchExecutor(simulated_session_id="sess-test")
    req = TaskDispatchExecutionRequest(
        intent_id="act-1",
        task_id="task-1",
        profile_id="default",
        task_revision=1,
        payload_hash="hash-1",
        correlation_id="corr-1",
        execution_authorization_id="auth-1",
        prompt="Execute test",
    )
    res = await executor.dispatch_task(req)
    assert res.outcome == "ACKNOWLEDGED"
    assert res.hermes_session_id == "sess-test-1"
    assert executor.call_count == 1
    assert executor.last_request.task_id == "task-1"


@pytest.mark.asyncio
async def test_fake_hermes_executor_forced_outcomes():
    # Pre-submission failure
    executor_fail = FakeHermesTaskDispatchExecutor(force_outcome="FAILED_PRE_SUBMISSION")
    req = TaskDispatchExecutionRequest(
        intent_id="act-1",
        task_id="task-1",
        profile_id="default",
        task_revision=1,
        payload_hash="hash-1",
        correlation_id="corr-1",
        execution_authorization_id="auth-1",
        prompt="Execute test",
    )
    res_fail = await executor_fail.dispatch_task(req)
    assert res_fail.outcome == "FAILED_PRE_SUBMISSION"
    assert res_fail.hermes_session_id is None

    # Ambiguous outcome
    executor_unknown = FakeHermesTaskDispatchExecutor(force_outcome="OUTCOME_UNKNOWN")
    res_unknown = await executor_unknown.dispatch_task(req)
    assert res_unknown.outcome == "OUTCOME_UNKNOWN"
    assert res_unknown.hermes_session_id is None
    assert res_unknown.error_code == "HERMES_EXECUTION_TIMEOUT"


@pytest.mark.asyncio
async def test_hermes_executor_missing_binary():
    executor = HermesTaskDispatchExecutor(binary_path="/non/existent/path/to/hermes")
    req = TaskDispatchExecutionRequest(
        intent_id="act-1",
        task_id="task-1",
        profile_id="default",
        task_revision=1,
        payload_hash="hash-1",
        correlation_id="corr-1",
        execution_authorization_id="auth-1",
        prompt="Execute test",
    )
    res = await executor.dispatch_task(req)
    assert res.outcome == "FAILED_PRE_SUBMISSION"
    assert res.error_code == "HERMES_EXECUTION_UNAVAILABLE"


@pytest.mark.asyncio
async def test_hermes_executor_untargetable_profile():
    with tempfile.TemporaryDirectory() as fake_hermes_home:
        # Create dummy binary
        dummy_bin = os.path.join(fake_hermes_home, "hermes")
        with open(dummy_bin, "w") as f:
            f.write("#!/bin/sh\nexit 0\n")

        executor = HermesTaskDispatchExecutor(
            binary_path=dummy_bin,
            hermes_home_dir=fake_hermes_home,
        )
        req = TaskDispatchExecutionRequest(
            intent_id="act-1",
            task_id="task-1",
            profile_id="non-existent-profile",
            task_revision=1,
            payload_hash="hash-1",
            correlation_id="corr-1",
            execution_authorization_id="auth-1",
            prompt="Execute test",
        )
        res = await executor.dispatch_task(req)
        assert res.outcome == "FAILED_PRE_SUBMISSION"
        assert res.error_code == "HERMES_PROFILE_NOT_TARGETABLE"


@pytest.mark.asyncio
async def test_hermes_executor_session_id_parsing():
    with tempfile.TemporaryDirectory() as fake_hermes_home:
        dummy_bin = os.path.join(fake_hermes_home, "hermes")
        with open(dummy_bin, "w") as f:
            f.write("#!/bin/sh\n")

        executor = HermesTaskDispatchExecutor(
            binary_path=dummy_bin,
            hermes_home_dir=fake_hermes_home,
        )
        req = TaskDispatchExecutionRequest(
            intent_id="act-1",
            task_id="task-1",
            profile_id="default",
            task_revision=1,
            payload_hash="hash-1",
            correlation_id="corr-1",
            execution_authorization_id="auth-1",
            prompt="Execute test",
        )

        mock_proc = MagicMock()
        mock_proc.returncode = 0
        mock_proc.stdout = "Task executed.\nSession:        20260911_abc123\nTokens: 42"
        mock_proc.stderr = ""

        with patch("subprocess.run", return_value=mock_proc) as mock_run:
            res = await executor.dispatch_task(req)
            assert res.outcome == "ACKNOWLEDGED"
            assert res.hermes_session_id == "20260911_abc123"

            # Verify no shell=True
            called_args, called_kwargs = mock_run.call_args
            assert called_kwargs.get("check") is False
            assert "shell" not in called_kwargs or called_kwargs["shell"] is False


@pytest.mark.asyncio
async def test_hermes_executor_timeout_produces_outcome_unknown():
    with tempfile.TemporaryDirectory() as fake_hermes_home:
        dummy_bin = os.path.join(fake_hermes_home, "hermes")
        with open(dummy_bin, "w") as f:
            f.write("#!/bin/sh\n")

        executor = HermesTaskDispatchExecutor(
            binary_path=dummy_bin,
            hermes_home_dir=fake_hermes_home,
        )
        req = TaskDispatchExecutionRequest(
            intent_id="act-1",
            task_id="task-1",
            profile_id="default",
            task_revision=1,
            payload_hash="hash-1",
            correlation_id="corr-1",
            execution_authorization_id="auth-1",
            prompt="Execute test",
            timeout_seconds=5.0,
        )

        with patch("subprocess.run", side_effect=subprocess.TimeoutExpired(cmd=["hermes"], timeout=5.0)):
            res = await executor.dispatch_task(req)
            assert res.outcome == "OUTCOME_UNKNOWN"
            assert res.error_code == "HERMES_EXECUTION_TIMEOUT"
            assert res.hermes_session_id is None
