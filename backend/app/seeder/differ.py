"""
Seed Diff Engine.
Generates human-readable and structured diffs comparing Current Canonical State
vs Recommended Seed Blueprint vs Final Projected Result.
Format adheres strictly to Prompt 14.1 Section 65 & 129.
"""
from typing import Optional

from app.seeder.previewer import SeedPreviewer
from app.seeder.models import PreviewReport


class SeedDiffer:
    """Generates matrix reports and visual diffs of configuration state."""

    def __init__(self, previewer: Optional[SeedPreviewer] = None) -> None:
        self.previewer = previewer or SeedPreviewer()

    def generate_diff_matrix(self, preview_report: Optional[PreviewReport] = None) -> str:
        report = preview_report or self.previewer.generate_preview()

        lines = [
            "# Sagara Configuration Diff: Current vs Recommended vs Result",
            f"Seed Version: {report.seed_version} | Hash: {report.seed_hash[:16]}...",
            f"Summary: {report.total_would_create} Would Create, {report.total_would_update} Would Update, "
            f"{report.total_would_remove} Would Remove, {report.total_unchanged} Unchanged\n",
            "| Profile | Action | Current Role | Recommended Role | Current Skills | Recommended Skills | Skill Diff | SOUL | Model Policy | Channels |",
            "|---|---|---|---|---|---|---|---|---|---|",
        ]

        for p in report.profiles:
            cur_role = p.current_role or "-"
            rec_role = p.recommended_role or "-"
            cur_sk_count = len(p.current_skills)
            rec_sk_count = len(p.recommended_skills)

            diff_parts = []
            for a in p.skills_to_add:
                diff_parts.append(f"+{a}")
            for r in p.skills_to_remove:
                diff_parts.append(f"-{r}")
            diff_str = " ".join(diff_parts) if diff_parts else "Identical"

            channels_str = f"{len(p.channel_routes)} mapped" if p.channel_routes else "none"

            lines.append(
                f"| `{p.profile_id}` | `{p.action}` | {cur_role} | {rec_role} | "
                f"{cur_sk_count} skills | {rec_sk_count} skills | {diff_str} | "
                f"`{p.soul_status}` | {p.model_policy or '-'} | {channels_str} |"
            )

        lines.append("\n## Detailed Profile Diff Breakdown\n")

        for p in report.profiles:
            if p.action == "WOULD_REMOVE":
                lines.append(f"### Profile: `{p.profile_id}` [DECOMMISSIONED/OMITTED]")
                lines.append(f"- Current Role: {p.current_role}")
                lines.append(f"- Current Skills ({len(p.current_skills)}): {', '.join(p.current_skills) or 'none'}")
                lines.append("- Recommended Status: OMITTED FROM BLUEPRINT\n")
                continue

            lines.append(f"### Profile: `{p.profile_id}` [{p.action}]")
            lines.append(f"- **Role**: {p.current_role or '(none)'} -> **{p.recommended_role}**")
            lines.append(f"- **Skills**: Current: {len(p.current_skills)}, Recommended: {len(p.recommended_skills)}")
            for a in p.skills_to_add:
                lines.append(f"  + `{a}`")
            for r in p.skills_to_remove:
                lines.append(f"  - `{r}`")
            if not p.skills_to_add and not p.skills_to_remove:
                lines.append("  (skills unchanged)")
            lines.append(f"- **Model**: {p.model_policy}")
            lines.append(f"- **Channels ({len(p.channel_routes)})**: {', '.join(p.channel_routes) or 'none'}")
            lines.append(f"- **Workspace**: {p.workspace_policy}")
            if p.warnings:
                lines.append(f"- **Warnings**: {', '.join(p.warnings)}")
            lines.append("")

        return "\n".join(lines)
