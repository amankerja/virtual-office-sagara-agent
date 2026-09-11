#!/usr/bin/env python3
"""
Seed Validate Tool.
Executes the comprehensive validation pipeline for canonical Sagara profile seeds.
Usage:
    python scripts/seed_validate.py [--seed-dir PATH] [--soul-dir PATH] [--project-root PATH]
"""
import argparse
import os
from pathlib import Path
import sys

# Ensure backend app is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../sagara-mission-control/backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.seeder.validator import SeedValidator


def main():
    parser = argparse.ArgumentParser(description="Validate Sagara Canonical Seeds & SOUL Templates")
    parser.add_argument("--seed-dir", type=str, default=None, help="Path to config/seeds directory")
    parser.add_argument("--soul-dir", type=str, default=None, help="Path to profiles/templates/soul directory")
    parser.add_argument("--project-root", type=str, default=None, help="Path to Sagara project root")
    args = parser.parse_args()

    validator = SeedValidator(
        seed_dir=args.seed_dir,
        soul_dir=args.soul_dir,
        project_root=args.project_root,
    )

    print(f"[*] Validating seeds from: {validator.seed_dir}")
    print(f"[*] Validating SOUL templates from: {validator.soul_dir}")

    report = validator.validate()

    print("\n=======================================================")
    print(f"  SAGARA SEED VALIDATION REPORT (Schema v{report.schema_version})")
    print(f"  Seed ID: sagara-default-profile-blueprint | Version: {report.seed_version}")
    print(f"  Semantic Hash: {report.seed_hash}")
    print("=======================================================")
    print(f"  Validation Status:      {'PASS' if report.is_valid else 'FAIL'}")
    print(f"  Total Profiles Defined: {report.total_profiles}")
    print(f"  Total Routes Validated: {report.total_routes}")
    print(f"  Total Resources Mapped: {report.total_resources}")
    print(f"  Total SOUL Templates:   {report.total_soul_templates}")
    print(f"  Total Errors:           {len(report.errors)}")
    print(f"  Total Warnings:         {len(report.warnings)}")
    print("-------------------------------------------------------")

    if report.skill_summaries:
        print("\n[+] Skill Resolution Summary per Profile:")
        for pid, s in sorted(report.skill_summaries.items()):
            print(f"    - {pid:<12} | Assigned: {s.recommended_count:<2} | Unresolved: {s.unresolved_count:<2} | Domain Warns: {s.domain_warning_count:<2}")

    if report.warnings:
        print("\n[!] Warnings:")
        for w in report.warnings:
            print(f"    - {w}")

    if report.errors:
        print("\n[X] Errors:")
        for err in report.errors:
            print(f"    - {err}")
        sys.exit(1)

    print("\n[+] All seed components, schemas, SOUL templates, and policies verified successfully.\n")
    sys.exit(0)


if __name__ == "__main__":
    main()
