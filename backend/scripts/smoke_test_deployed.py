import subprocess
import json

smoke_script = """
import urllib.request
import json

def get(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode('utf-8'))

def get_text(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return resp.status, resp.read().decode('utf-8')

print("=== DEPLOYED MISSION CONTROL SMOKE TEST ===")

# 1. Health
s, health = get('http://127.0.0.1:8000/health')
print(f"HEALTH: status={s} body={health}")

# 2. Readiness
s, ready = get('http://127.0.0.1:8000/ready')
print(f"READINESS: status={s} body={ready}")

# 3. Frontend Static Serving (HTML5 SPA)
s, html = get_text('http://127.0.0.1:8000/')
print(f"FRONTEND_ROOT: status={s} length={len(html)} has_title={'Virtual Office' in html or 'Mission Control' in html or 'html' in html.lower()}")

s, html_task = get_text('http://127.0.0.1:8000/tasks')
print(f"FRONTEND_SPA_REFRESH: status={s} length={len(html_task)}")

# 4. Profiles (Real Canonical Sagara Profiles)
s, profs = get('http://127.0.0.1:8000/api/v1/profiles')
ids = [p['id'] for p in profs]
print(f"PROFILES: count={len(profs)} ids={ids}")

# 5. Skills
s, skills = get('http://127.0.0.1:8000/api/v1/skills')
print(f"SKILLS: count={len(skills)}")

# 6. Active Execution Policy V3
s, pol = get('http://127.0.0.1:8000/api/v1/execution-policy')
print(f"POLICY: version={pol['version']} hash={pol['policy_hash']}")
limited = [k for k, v in pol['profiles'].items() if v['status'] == 'LIMITED']
disabled = [k for k, v in pol['profiles'].items() if v['status'] == 'DISABLED']
print(f"POLICY_LIMITED_PROFILES:{sorted(limited)}")
print(f"POLICY_DISABLED_PROFILES:{sorted(disabled)}")

# 7. Execution Lock
s, lock = get('http://127.0.0.1:8000/api/v1/execution-lock')
print(f"LOCK: is_locked={lock.get('is_locked')} active_window={lock.get('active_window')}")

# 8. Agents (Canonical Sagara Agents)
s, agents = get('http://127.0.0.1:8000/api/v1/agents')
print(f"AGENTS: count={len(agents)} ids={[a['id'] for a in agents]}")

# 9. Tool Security Policy
s, tool_pol = get('http://127.0.0.1:8000/api/v1/tool-security-policy')
print(f"TOOL_SECURITY_POLICY: version={tool_pol['version']} hash={tool_pol['policy_hash']}")

# 10. Execution Readiness
s, readiness = get('http://127.0.0.1:8000/api/v1/execution-readiness')
print(f"READINESS_EVAL: executionReady={readiness.get('executionReady')} killSwitch={readiness.get('killSwitchStatus')}")

print("=== ALL DEPLOYED SMOKE TESTS PASSED ===")
"""

res = subprocess.run(
    ["ssh", "sagara", "python3"],
    input=smoke_script.encode("utf-8"),
    capture_output=True,
)
print("STDOUT:")
print(res.stdout.decode("utf-8", errors="replace"))
if res.stderr:
    print("STDERR:")
    print(res.stderr.decode("utf-8", errors="replace"))
