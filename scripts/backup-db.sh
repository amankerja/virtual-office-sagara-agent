#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/home/ubuntu/backups/sagara-hermes"
DATE_STAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "${BACKUP_DIR}"

HERMES_DB="/home/ubuntu/.hermes/state.db"
MC_DB="/home/ubuntu/sagara-mission-control/data/mission-control.db"

if [ -f "${HERMES_DB}" ]; then
  python3 -c "
import sqlite3
src = sqlite3.connect('${HERMES_DB}')
dst = sqlite3.connect('${BACKUP_DIR}/hermes_state_${DATE_STAMP}.sqlite3')
src.backup(dst)
dst.close()
src.close()
"
  echo "[$(date)] Backup of Hermes state.db created successfully."
fi

if [ -f "${MC_DB}" ]; then
  python3 -c "
import sqlite3
src = sqlite3.connect('${MC_DB}')
dst = sqlite3.connect('${BACKUP_DIR}/mission_control_${DATE_STAMP}.sqlite3')
src.backup(dst)
dst.close()
src.close()
"
  echo "[$(date)] Backup of Mission Control DB created successfully."
fi

# Prune backups older than 7 days
find "${BACKUP_DIR}" -type f -name "*.sqlite3" -mtime +7 -delete
echo "[$(date)] Old backups older than 7 days pruned."
