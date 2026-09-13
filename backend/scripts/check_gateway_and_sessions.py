import subprocess

def check():
    # 1. Gateway status
    gw = subprocess.run(
        ["ssh", "sagara", "systemctl --user show hermes-gateway.service --property=ActiveState,SubState,MainPID,NRestarts,ActiveEnterTimestamp,UnitFileState"],
        capture_output=True,
        text=True,
    )
    print("--- GATEWAY SERVICE ---")
    print(gw.stdout.strip())

    # 2. Session counts
    script = """import sqlite3
c1 = sqlite3.connect('/home/ubuntu/.hermes/state.db')
g = c1.execute('SELECT count(1) FROM sessions').fetchone()[0]
c2 = sqlite3.connect('/home/ubuntu/.hermes/profiles/sagara-lab/state.db')
p = c2.execute('SELECT count(1) FROM sessions').fetchone()[0]
print(f"global={g}, sagara_lab={p}")
"""
    res = subprocess.run(
        ["ssh", "sagara", "python3"],
        input=script,
        capture_output=True,
        text=True,
    )
    print("--- SESSIONS ---")
    print(res.stdout.strip())

if __name__ == "__main__":
    check()
