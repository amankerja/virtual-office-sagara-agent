#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/home/ubuntu/sagara-mission-control"
cd "$REPO_DIR"

export GIT_SSH_COMMAND="ssh -i /home/ubuntu/.ssh/sagara_virtual_office_deploy -o StrictHostKeyChecking=no"

# Fetch latest changes silently
git fetch origin main >/dev/null 2>&1 || exit 0

LOCAL_HASH=$(git rev-parse HEAD)
REMOTE_HASH=$(git rev-parse origin/main)

if [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
    echo "[$(date)] New commit detected ($REMOTE_HASH). Deploying update..."
    git pull origin main --ff-only
    cd "$REPO_DIR/frontend"
    npm install >/dev/null 2>&1
    node ./node_modules/vite/bin/vite.js build >/dev/null 2>&1
    systemctl --user restart sagara-mission-control.service
    echo "[$(date)] Auto-deployment to https://office.alkaralintas.site completed successfully!"
fi
