import subprocess

script = """
import sys
sys.path.insert(0, '/home/ubuntu/sagara-mission-control/backend')
from app.db.connection import get_db_connection
from app.services.execution_policy_service import ExecutionPolicyService
from app.services.execution_lock_service import ExecutionLockService

conn = get_db_connection('/home/ubuntu/sagara-mission-control/backend/data/mission-control.db')
pol = ExecutionPolicyService.get_active_policy(conn)
locked, reason, win = ExecutionLockService.get_effective_status(conn)

print(f"ACTIVE_POLICY:{pol.version}")
print(f"POLICY_HASH:{pol.policy_hash}")
print(f"LOCKED:{locked}")
print(f"ACTIVE_WINDOWS:{0 if win is None else len(win)}")
"""

res = subprocess.run(
    ["ssh", "sagara", "/home/ubuntu/sagara-mission-control/backend/.venv/bin/python"],
    input=script.encode("utf-8"),
    capture_output=True,
)
print("STDOUT:")
print(res.stdout.decode("utf-8", errors="replace"))
print("STDERR:")
print(res.stderr.decode("utf-8", errors="replace"))
