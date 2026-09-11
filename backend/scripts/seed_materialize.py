#!/usr/bin/env python3
"""
Seed Materialize Tool.
Safely materializes seed blueprint into a temporary or specified staging directory.
DO NOT target live production directory. Production application is disabled in Prompt 14.1.
Usage:
    python scripts/seed_materialize.py [--output PATH] [--seed-dir PATH] [--soul-dir PATH]
"""
import argparse
import os
from pathlib import Path
import sys
import tempfile

# Ensure backend app is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../sagara-mission-control/backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.seeder.materializer import SeedMaterializer


def main():
    parser = argparse.ArgumentParser(description="Materialize Sagara Seed Blueprint to Staging Directory")
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Target output staging directory (defaults to a safe temporary staging folder)",
    )
    parser.add_argument("--seed-dir", type=str, default=None, help="Path to config/seeds directory")
    parser.add_argument("--soul-dir", type=str, default=None, help="Path to profiles/templates/soul directory")
    parser.add_argument("--project-root", type=str, default=None, help="Path to Sagara project root")
    args = parser.parse_args()

    if not args.output:
        # Generate safe temporary staging directory
        staging_dir = Path(tempfile.gettempdir()) / "sagara_materialized_staging"
        print(f"[*] No --output specified. Defaulting to safe temporary staging directory: {staging_dir}")
    else:
        staging_dir = Path(args.output).resolve()

    materializer = SeedMaterializer(
        seed_dir=args.seed_dir,
        soul_dir=args.soul_dir,
        project_root=args.project_root,
    )

    print(f"[*] Materializing canonical profiles to: {staging_dir}")
    try:
        res = materializer.materialize(output_dir=staging_dir)
        print("\n=======================================================")
        print("  SAGARA SEED MATERIALIZATION COMPLETE (STAGING ONLY)")
        print("=======================================================")
        print(f"  Output Directory:     {res['output_dir']}")
        print(f"  Semantic Seed Hash:   {res['seed_hash']}")
        print(f"  Total Profiles:       {res['total_materialized']}")
        print(f"  Manifest Generated:   {res['manifest_path']}")
        print("-------------------------------------------------------")
        print(f"  Profiles Materialized: {', '.join(res['materialized_profiles'])}")
        print("\n[+] Verification: Run ProfileRegistry.load() against this output directory to inspect.")
        print("[!] Safety Note: Production live directories were NOT modified.\n")
    except Exception as e:
        print(f"\n[X] Materialization failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
