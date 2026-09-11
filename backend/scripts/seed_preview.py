#!/usr/bin/env python3
"""
Seed Preview Tool.
Performs idempotent, read-only preview comparison of recommended seeds against current canonical configuration.
Usage:
    python scripts/seed_preview.py [--seed-dir PATH] [--soul-dir PATH] [--project-root PATH]
"""
import argparse
import os
import sys

# Ensure backend app is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../sagara-mission-control/backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.seeder.previewer import SeedPreviewer


def main():
    parser = argparse.ArgumentParser(description="Preview Sagara Seed Recommendations vs Canonical State")
    parser.add_argument("--seed-dir", type=str, default=None, help="Path to config/seeds directory")
    parser.add_argument("--soul-dir", type=str, default=None, help="Path to profiles/templates/soul directory")
    parser.add_argument("--project-root", type=str, default=None, help="Path to Sagara project root")
    args = parser.parse_args()

    previewer = SeedPreviewer(
        seed_dir=args.seed_dir,
        soul_dir=args.soul_dir,
        project_root=args.project_root,
    )

    report = previewer.generate_preview()

    print("\n==================================================================")
    print(f"  SAGARA SEED PREVIEW (Version {report.seed_version})")
    print(f"  Semantic Hash: {report.seed_hash}")
    print("==================================================================")
    print(f"  Total Profiles in Preview: {len(report.profiles)}")
    print(f"  WOULD CREATE:              {report.total_would_create}")
    print(f"  WOULD UPDATE:              {report.total_would_update}")
    print(f"  WOULD REMOVE:              {report.total_would_remove}")
    print(f"  UNCHANGED:                 {report.total_unchanged}")
    print("------------------------------------------------------------------")
    print(f"{'Profile ID':<16} {'Action':<14} {'Current Role':<24} {'Recommended Role':<30}")
    print("-" * 88)

    for p in report.profiles:
        c_role = (p.current_role or "—")[:22]
        r_role = (p.recommended_role or "—")[:28]
        print(f"{p.profile_id:<16} {p.action:<14} {c_role:<24} {r_role:<30}")
        if p.skills_to_add or p.skills_to_remove:
            changes = []
            for a in p.skills_to_add:
                changes.append(f"+{a}")
            for r in p.skills_to_remove:
                changes.append(f"-{r}")
            print(f"                 Skills Diff: {' '.join(changes)}")
        if p.warnings:
            for w in p.warnings:
                print(f"                 [!] {w}")

    print("\n[+] Preview completed. No production manifests modified (Read-Only Guaranteed).\n")


if __name__ == "__main__":
    main()
