#!/usr/bin/env python3
"""
Hermes Dispatch Bridge for Sagara Mission Control (Prompt 14.5).
Bridge execution adapter connecting local Mission Control executor to the canonical
Hermes instance on the remote host (VM-17-49-ubuntu) via secure SSH transport.
Invariants:
- Passes prompt verbatim via stdin (--query-file -)
- Enforces --safe-mode and --oneshot
- Targets exact canonical profile under /home/ubuntu/.hermes/profiles/<profile_id>
- Streams stdout and stderr verbatim back to HermesTaskDispatchExecutor
"""

import os
import sys
import subprocess


def main():
    args = sys.argv[1:]
    
    # Check for --version or help flags
    if "--version" in args or "-v" in args:
        res = subprocess.run(
            ["ssh", "sagara", "/home/ubuntu/.hermes/hermes-agent/venv/bin/hermes --version"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
        )
        sys.stdout.write(res.stdout)
        sys.stderr.write(res.stderr)
        sys.exit(res.returncode)

    # Parse query file
    query_file_path = None
    if "--query-file" in args:
        idx = args.index("--query-file")
        if idx + 1 < len(args):
            query_file_path = args[idx + 1]

    prompt_text = ""
    if query_file_path and os.path.isfile(query_file_path):
        with open(query_file_path, "r", encoding="utf-8") as f:
            prompt_text = f.read()

    # Determine profile name from args or HERMES_HOME
    hermes_home = os.environ.get("HERMES_HOME", "")
    profile_name = "sagara-lab"
    if "--profile" in args:
        idx = args.index("--profile")
        if idx + 1 < len(args):
            profile_name = args[idx + 1]
    elif "-p" in args:
        idx = args.index("-p")
        if idx + 1 < len(args):
            profile_name = args[idx + 1]
    elif "profiles" in hermes_home:
        profile_name = os.path.basename(hermes_home.rstrip("\\/"))


    remote_cmd = (
        "set -a; [ -f /home/ubuntu/.hermes/.env ] && . /home/ubuntu/.hermes/.env; set +a; "
        f"HERMES_HOME=/home/ubuntu/.hermes/profiles/{profile_name} "
        "/home/ubuntu/.hermes/hermes-agent/venv/bin/hermes chat "
        "--query-file - -Q --oneshot --safe-mode "
        "--provider custom:9router -m gemini/gemini-2.5-flash"
    )

    proc = subprocess.run(
        ["ssh", "sagara", remote_cmd],
        input=prompt_text,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )

    import re
    m = re.search(r"session_id:\s*([a-zA-Z0-9_\-]+)", proc.stderr)
    out = proc.stdout
    if m and "Session:" not in out:
        out = out.rstrip("\r\n") + f"\n\nSession:        {m.group(1)}\n"

    sys.stdout.write(out)
    sys.stderr.write(proc.stderr)
    sys.exit(proc.returncode)


if __name__ == "__main__":
    main()
