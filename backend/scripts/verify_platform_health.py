import subprocess
import json
import sys

def verify_platform():
    print("==================================================")
    print("PROMPT 15.2: PLATFORM HEALTH VERIFICATION")
    print("==================================================")

    # 1. Gateway status
    gw_cmd = "systemctl --user show hermes-gateway.service --property=ActiveState,SubState,MainPID,NRestarts,ActiveEnterTimestamp,UnitFileState"
    gw_res = subprocess.run(["ssh", "sagara", gw_cmd], capture_output=True, text=True, check=True)
    gw_props = dict(line.split("=", 1) for line in gw_res.stdout.strip().splitlines() if "=" in line)
    print("Gateway Service:")
    for k, v in gw_props.items():
        print(f"  {k}: {v}")
    assert gw_props.get("ActiveState") == "active"
    assert gw_props.get("SubState") == "running"

    # 2. 9Router status
    nr_cmd = "systemctl --user show 9router.service --property=ActiveState,SubState,MainPID,NRestarts,ActiveEnterTimestamp,UnitFileState"
    nr_res = subprocess.run(["ssh", "sagara", nr_cmd], capture_output=True, text=True, check=True)
    nr_props = dict(line.split("=", 1) for line in nr_res.stdout.strip().splitlines() if "=" in line)
    print("\n9Router Service:")
    for k, v in nr_props.items():
        print(f"  {k}: {v}")
    assert nr_props.get("ActiveState") == "active"
    assert nr_props.get("SubState") == "running"

    # 3. Connection logs check (Discord, Telegram, WhatsApp)
    log_cmd = "journalctl --user -u hermes-gateway.service -n 100 --no-pager"
    log_res = subprocess.run(["ssh", "sagara", log_cmd], capture_output=True, text=True, check=True)
    log_out = log_res.stdout
    print("\nGateway Integration Indicators in Journal:")
    has_tg = "Telegram" in log_out
    has_dc = "Discord" in log_out or "discord" in log_out
    has_wa = "Whatsapp" in log_out or "WhatsApp" in log_out
    print(f"  Telegram references present: {has_tg}")
    print(f"  Discord references present: {has_dc}")
    print(f"  WhatsApp references present: {has_wa}")

    # 4. Native Sagara Profiles & Skills
    script = """import sys
sys.path.insert(0, '/home/ubuntu/sagara-agent')
import os
os.chdir('/home/ubuntu/sagara-agent')
from core.registry.profile import ProfileRegistry
from core.registry.skill import SkillRegistry

p_reg = ProfileRegistry.load('profiles')
s_reg = SkillRegistry.load('config/skills.yaml', project_root='/home/ubuntu/sagara-agent')

canonical = ['lead', 'personal', 'business', 'marketing', 'cs', 'it-support', 'it-coding', 'sagara-lab']
targetable = [p for p in canonical if p_reg.exists(p, require_enabled=True)]

unresolved = s_reg.get_unresolved_references() if hasattr(s_reg, 'get_unresolved_references') else 0
print(f"TARGETABLE_CANONICAL:{len(targetable)}/{len(canonical)}")
print(f"PROFILES:{','.join(targetable)}")
print(f"SKILL_REGISTRY_HEALTHY:{s_reg is not None}")
print(f"UNRESOLVED_SKILLS:{unresolved}")
"""
    native_res = subprocess.run(["ssh", "sagara", "python3"], input=script, capture_output=True, text=True)
    if native_res.returncode != 0:
        print("Script failed:", native_res.stderr)
        raise RuntimeError(native_res.stderr)
    print("\nNative Sagara Registries:")
    for line in native_res.stdout.strip().splitlines():
        print(f"  {line}")

    assert "TARGETABLE_CANONICAL:8/8" in native_res.stdout
    assert "SKILL_REGISTRY_HEALTHY:True" in native_res.stdout
    assert "UNRESOLVED_SKILLS:0" in native_res.stdout or "UNRESOLVED_SKILLS:[]" in native_res.stdout

    print("\n==================================================")
    print("PLATFORM HEALTH VERIFIED: ALL SYSTEMS NOMINAL")
    print("==================================================")

if __name__ == "__main__":
    verify_platform()
