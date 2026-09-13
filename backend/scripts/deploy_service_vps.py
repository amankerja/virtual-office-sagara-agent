import subprocess

deploy_script = """
import os
import subprocess

env_content = '''# Sagara Mission Control Production Environment
SAGARA_PROJECT_ROOT=/home/ubuntu/sagara-agent
HERMES_STATE_DB_PATH=/home/ubuntu/.hermes/state.db
HERMES_BINARY=/home/ubuntu/.local/bin/hermes
HERMES_HOME_DIR=/home/ubuntu/.hermes
PROFILE_SOURCE=sagara
SKILL_SOURCE=sagara
RUNTIME_SOURCE=hermes
FRONTEND_DIST_PATH=/home/ubuntu/sagara-mission-control/frontend/dist
MISSION_CONTROL_DATABASE_URL=sqlite:////home/ubuntu/sagara-mission-control/backend/data/mission-control.db
MISSION_CONTROL_EXECUTION_ENABLED=false
MISSION_CONTROL_LIVE_CANARY_ENABLED=false
MISSION_CONTROL_TRUSTED_AUTH_PROXY_ENABLED=false
MISSION_CONTROL_HOST=127.0.0.1
MISSION_CONTROL_PORT=8000
'''

env_path = '/home/ubuntu/sagara-mission-control/backend/.env'
with open(env_path, 'w', encoding='utf-8') as f:
    f.write(env_content)
os.chmod(env_path, 0o600)
print(f"Created protected .env at {env_path}")

service_content = '''[Unit]
Description=Sagara Mission Control - Unified Agent Operations Dashboard
After=network.target
Wants=network.target

[Service]
Type=simple
WorkingDirectory=/home/ubuntu/sagara-mission-control/backend
EnvironmentFile=/home/ubuntu/sagara-mission-control/backend/.env
ExecStart=/home/ubuntu/sagara-mission-control/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
'''

service_dir = os.path.expanduser('~/.config/systemd/user')
os.makedirs(service_dir, exist_ok=True)
service_path = os.path.join(service_dir, 'sagara-mission-control.service')
with open(service_path, 'w', encoding='utf-8') as f:
    f.write(service_content)
print(f"Created systemd service unit at {service_path}")

# Reload and enable
subprocess.run(['systemctl', '--user', 'daemon-reload'], check=True)
subprocess.run(['systemctl', '--user', 'enable', 'sagara-mission-control.service'], check=True)
subprocess.run(['systemctl', '--user', 'restart', 'sagara-mission-control.service'], check=True)

# Check status
res = subprocess.run(['systemctl', '--user', 'is-active', 'sagara-mission-control.service'], capture_output=True, text=True)
print(f"SERVICE_ACTIVE:{res.stdout.strip()}")
"""

res = subprocess.run(
    ["ssh", "sagara", "python3"],
    input=deploy_script.encode("utf-8"),
    capture_output=True,
)
print("STDOUT:")
print(res.stdout.decode("utf-8", errors="replace"))
print("STDERR:")
print(res.stderr.decode("utf-8", errors="replace"))
