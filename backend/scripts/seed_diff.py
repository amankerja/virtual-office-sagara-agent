#!/usr/bin/env python3
"""
Seed Diff Tool.
Generates comprehensive unified diff matrix of Current vs Recommended vs Result configuration.
Usage:
    python scripts/seed_diff.py [--seed-dir PATH] [--soul-dir PATH] [--project-root PATH]
"""
import argparse
import os
import sys

# Ensure backend app is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../sagara-mission-control/backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.seeder.differ import SeedDiffer
from app.seeder.previewer import SeedPreviewer


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description="Generate Diff Matrix of Sagara Configuration")
    parser.add_argument("--seed-dir", type=str, default=None, help="Path to config/seeds directory")
    parser.add_argument("--soul-dir", type=str, default=None, help="Path to profiles/templates/soul directory")
    parser.add_argument("--project-root", type=str, default=None, help="Path to Sagara project root")
    args = parser.parse_args()

    previewer = SeedPreviewer(
        seed_dir=args.seed_dir,
        soul_dir=args.soul_dir,
        project_root=args.project_root,
    )
    differ = SeedDiffer(previewer=previewer)

    diff_matrix = differ.generate_diff_matrix()
    print(diff_matrix)


if __name__ == "__main__":
    main()
