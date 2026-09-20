import asyncio
from datetime import datetime, timezone
import json
import logging
import os
import subprocess
from pathlib import Path
import sqlite3
from typing import Any, Optional

from app.repositories.memory.fixtures import TASKS_FIXTURE
from app.schemas.tasks import (
    CreateTaskDto,
    TaskDto,
    TaskFailureDto,
    TaskPriority,
    TaskResultDto,
    TaskState,
    UpdateTaskDto,
)

logger = logging.getLogger("sagara.mission_control.adapters.jobs")

STATUS_TO_TASK_STATE: dict[str, TaskState] = {
    "completed": "COMPLETED",
    "success": "COMPLETED",
    "failed": "FAILED",
    "error": "FAILED",
    "running": "RUNNING",
    "in_progress": "RUNNING",
    "dispatching": "RUNNING",
    "awaiting_approval": "AWAITING_APPROVAL",
    "blocked": "BLOCKED",
    "pending": "READY",
    "queued": "READY",
    "cancelled": "CANCELLED",
    "canceled": "CANCELLED",
}


class SagaraJobRepository:
    """
    Read-through TaskRepository adapter against native Sagara `jobs.sqlite3` (Section 11, 17).
    Preserves native job truth (job_id, profile, intent, skill, status, hermes_session_id).
    Enforces read-only URI mode and query_only=ON.
    Merges native Sagara jobs with locally managed Mission Control tasks.
    """

    def __init__(self, db_path: Optional[str] = None) -> None:
        self._db_path = db_path or os.environ.get("SAGARA_JOBS_DB_PATH")
        if not self._db_path:
            candidate = Path.home() / ".sagara" / "data" / "jobs.sqlite3"
            if candidate.is_file():
                self._db_path = str(candidate)

        self._local_tasks: dict[str, TaskDto] = {t.id: t.model_copy(deep=True) for t in TASKS_FIXTURE}

    def _sync_read_native_jobs(self) -> list[TaskDto]:
        if not self._db_path or not os.path.isfile(self._db_path):
            return []

        jobs: list[TaskDto] = []
        try:
            conn = sqlite3.connect(f"file:{self._db_path}?mode=ro", uri=True)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("PRAGMA query_only=ON;")

            # Verify table
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sagara_jobs';")
            if not cur.fetchone():
                conn.close()
                return []

            cur.execute(
                """
                SELECT job_id, sequence, payload_json, updated_at, hermes_session_id
                FROM sagara_jobs
                ORDER BY updated_at DESC;
            """
            )
            rows = cur.fetchall()
            for r in rows:
                try:
                    payload = json.loads(r["payload_json"]) if r["payload_json"] else {}
                    raw_status = str(payload.get("status", "pending")).lower()
                    state = STATUS_TO_TASK_STATE.get(raw_status, "READY")

                    profile = payload.get("profile") or None
                    intent = payload.get("intent") or "native-job"
                    skill = payload.get("skill") or None
                    created_at = payload.get("created_at") or r["updated_at"]
                    error = payload.get("error")
                    result_data = payload.get("result")

                    title = f"[{profile or 'agent'}] {intent}"
                    desc = f"Native Sagara job executing {skill}" if skill else f"Native job: {intent}"

                    failure_dto = None
                    if error:
                        failure_dto = TaskFailureDto(code="JOB_EXECUTION_ERROR", message=str(error))

                    result_dto = None
                    if result_data:
                        result_dto = TaskResultDto(summary=str(result_data)[:500])

                    task = TaskDto(
                        id=r["job_id"],
                        title=title,
                        description=desc,
                        state=state,
                        priority="MEDIUM",
                        created_at=created_at,
                        updated_at=r["updated_at"],
                        assigned_agent_id=profile,
                        requested_skills=[skill] if skill else None,
                        session_id=r["hermes_session_id"],
                        failure=failure_dto,
                        result=result_dto,
                    )
                    jobs.append(task)
                except Exception as ex:
                    logger.debug(f"Failed to map native job {r['job_id']}: {ex}")

            conn.close()
        except Exception as e:
            logger.debug(f"Error reading native jobs DB: {e}")

        return jobs

    def _sync_read_hermes_cron_jobs(self) -> list[TaskDto]:
        cron_files = [
            Path.home() / ".hermes" / "cron" / "jobs.json",
        ]
        profiles_dir = Path.home() / ".hermes" / "profiles"
        if profiles_dir.is_dir():
            for p in profiles_dir.iterdir():
                cf = p / "cron" / "jobs.json"
                if cf.is_file():
                    cron_files.append(cf)

        tasks: list[TaskDto] = []
        for cf in cron_files:
            if not cf.is_file():
                continue
            try:
                data = json.loads(cf.read_text("utf-8"))
                for job in data.get("jobs", []):
                    jid = f"cron-{job.get('id')}"
                    name = job.get("name") or job.get("prompt") or job.get("script") or "Scheduled Cron Job"
                    sched = job.get("schedule_display") or job.get("schedule", {}).get("display", "Scheduled")
                    state = "RUNNING" if job.get("enabled") and job.get("state") == "running" else ("COMPLETED" if not job.get("enabled") else "READY")
                    if job.get("last_status") == "error":
                        state = "FAILED"

                    assigned_agent = None
                    if "origin" in job and isinstance(job["origin"], dict):
                        chat_name = job["origin"].get("chat_name", "")
                        for p_name in ["business", "cs", "exportir-handal", "it-coding", "it-support", "lead", "marketing", "personal", "sagara-lab"]:
                            if p_name in chat_name.lower():
                                assigned_agent = p_name
                                break

                    last_err = job.get("last_error")
                    failure_dto = TaskFailureDto(code="CRON_JOB_ERROR", message=str(last_err)) if last_err else None
                    result_dto = TaskResultDto(summary=f"Schedule: {sched} | Next run: {job.get('next_run_at', 'N/A')}")

                    tasks.append(
                        TaskDto(
                            id=jid,
                            title=name,
                            description=f"Hermes Cronjob: {sched}. Target: {job.get('deliver', 'local')}",
                            state=state,
                            priority="MEDIUM",
                            created_at=job.get("created_at", datetime.now(timezone.utc).isoformat()),
                            updated_at=job.get("last_run_at") or job.get("created_at") or datetime.now(timezone.utc).isoformat(),
                            assigned_agent_id=assigned_agent or "lead",
                            requested_skills=job.get("skills") or None,
                            failure=failure_dto,
                            result=result_dto,
                        )
                    )
            except Exception as e:
                logger.debug(f"Failed to read Hermes cron file {cf}: {e}")

        return tasks

    async def list_tasks(
        self,
        state: Optional[str] = None,
        priority: Optional[str] = None,
        agent_id: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> list[TaskDto]:
        native_jobs = await asyncio.to_thread(self._sync_read_native_jobs)
        cron_jobs = await asyncio.to_thread(self._sync_read_hermes_cron_jobs)
        combined = list(self._local_tasks.values()) + native_jobs + cron_jobs

        results = combined
        if state and state != "ALL":
            results = [t for t in results if t.state == state]
        if priority and priority != "ALL":
            results = [t for t in results if t.priority == priority]
        if agent_id and agent_id != "ALL":
            if agent_id == "UNASSIGNED":
                results = [t for t in results if not t.assigned_agent_id]
            else:
                results = [t for t in results if t.assigned_agent_id == agent_id]

        start_index = 0
        if cursor:
            try:
                start_index = int(cursor)
            except ValueError:
                start_index = 0

        return results[start_index : start_index + limit]

    async def get_task(self, task_id: str) -> Optional[TaskDto]:
        if task_id in self._local_tasks:
            return self._local_tasks[task_id].model_copy(deep=True)

        clean_id = task_id.replace("cron-", "")
        native_jobs = await asyncio.to_thread(self._sync_read_native_jobs)
        cron_jobs = await asyncio.to_thread(self._sync_read_hermes_cron_jobs)
        all_jobs = native_jobs + cron_jobs
        for t in all_jobs:
            if t.id == task_id or t.id == f"cron-{task_id}" or t.id.replace("cron-", "") == clean_id:
                return t.model_copy(deep=True)
        return None

    async def create_task(self, input_dto: CreateTaskDto) -> TaskDto:
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        new_id = f"tsk-{len(self._local_tasks) + 1:02d}"
        new_task = TaskDto(
            id=new_id,
            title=input_dto.title,
            description=input_dto.description,
            state=input_dto.state or "DRAFT",
            priority=input_dto.priority,
            created_at=now,
            updated_at=now,
            assigned_agent_id=input_dto.assigned_agent_id,
            requested_skills=input_dto.requested_skills,
            capability_requirements=input_dto.capability_requirements,
            due_at=input_dto.due_at,
        )
        self._local_tasks[new_id] = new_task
        return new_task.model_copy(deep=True)

    async def update_task(
        self,
        task_id: str,
        input_dto: UpdateTaskDto,
        expected_revision: Optional[int] = None,
    ) -> TaskDto:
        task = await self.get_task(task_id)
        if not task:
            raise KeyError(f"Task {task_id} not found")

        if expected_revision is not None and task.revision is not None:
            if expected_revision != task.revision:
                from app.api.errors import ConflictError
                raise ConflictError(
                    code="RESOURCE_CONFLICT",
                    message=f"Conflict updating task: expected revision {expected_revision}, current revision is {task.revision}.",
                )

        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        if input_dto.title is not None:
            task.title = input_dto.title
        if input_dto.description is not None:
            task.description = input_dto.description
        if input_dto.priority is not None:
            task.priority = input_dto.priority
        if input_dto.state is not None:
            task.state = input_dto.state
        if input_dto.assigned_agent_id is not None:
            task.assigned_agent_id = input_dto.assigned_agent_id
        if input_dto.requested_skills is not None:
            task.requested_skills = input_dto.requested_skills
        task.revision = (task.revision or 1) + 1
        task.updated_at = now
        self._local_tasks[task_id] = task
        return task.model_copy(deep=True)

    async def dispatch_task(self, task_id: str) -> TaskDto:
        task = await self.get_task(task_id)
        if not task:
            raise KeyError(f"Task {task_id} not found")
        if task.state in ["DISPATCHING", "RUNNING"]:
            from app.api.errors import ConflictError
            raise ConflictError(
                code="TASK_ALREADY_DISPATCHED",
                message=f"Task {task_id} is already in state '{task.state}'.",
            )
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        task.state = "DISPATCHING"
        task.updated_at = now
        self._local_tasks[task.id] = task

        clean_id = task_id.replace("cron-", "")
        def _run_cron():
            try:
                subprocess.run(["hermes", "cron", "run", clean_id], timeout=30, capture_output=True)
            except Exception as e:
                logger.error(f"Failed to dispatch cron task {clean_id}: {e}")

        asyncio.get_event_loop().run_in_executor(None, _run_cron)
        return task.model_copy(deep=True)

    async def cancel_task(self, task_id: str) -> TaskDto:
        task = await self.get_task(task_id)
        if not task:
            raise KeyError(f"Task {task_id} not found")
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        task.state = "CANCELLED"
        task.updated_at = now
        self._local_tasks[task.id] = task

        clean_id = task_id.replace("cron-", "")
        def _pause_cron():
            try:
                subprocess.run(["hermes", "cron", "pause", clean_id], timeout=15, capture_output=True)
            except Exception as e:
                logger.error(f"Failed to pause cron task {clean_id}: {e}")

        asyncio.get_event_loop().run_in_executor(None, _pause_cron)
        return task.model_copy(deep=True)

    async def delete_task(self, task_id: str) -> bool:
        if task_id in self._local_tasks:
            del self._local_tasks[task_id]
        
        clean_id = task_id.replace("cron-", "")
        def _rm_cron():
            try:
                res = subprocess.run(["hermes", "cron", "remove", clean_id], timeout=15, capture_output=True)
                return res.returncode == 0
            except Exception as e:
                logger.error(f"Failed to remove cron task {clean_id}: {e}")
                return False

        return await asyncio.to_thread(_rm_cron)
