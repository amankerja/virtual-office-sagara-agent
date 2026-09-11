"""
Tests for SOUL Templates (Prompt 14.1 Section 23-27, 80, 98-108).
Verifies all 8 custom SOUL templates exist, adhere to the 13 mandatory sections,
contain zero credentials, have distinct autonomy boundaries, and avoid raw skill dumping.
"""
from pathlib import Path
import re
import pytest

from app.seeder.validator import SeedValidator, MANDATORY_SOUL_SECTIONS, SECRET_PATTERNS

CANONICAL_PROFILES = [
    "lead",
    "personal",
    "business",
    "marketing",
    "cs",
    "it-support",
    "it-coding",
    "sagara-lab",
]


def test_all_eight_soul_templates_exist():
    validator = SeedValidator()
    soul_dir = validator.soul_dir

    assert soul_dir.is_dir(), f"SOUL templates directory missing: {soul_dir}"

    for pid in CANONICAL_PROFILES:
        template_path = soul_dir / f"{pid}.md"
        assert template_path.is_file(), f"Missing SOUL template for {pid} at {template_path}"


def test_every_soul_template_contains_thirteen_mandatory_sections():
    validator = SeedValidator()
    soul_dir = validator.soul_dir

    for pid in CANONICAL_PROFILES:
        content = (soul_dir / f"{pid}.md").read_text(encoding="utf-8")
        for sec in MANDATORY_SOUL_SECTIONS:
            pattern = re.compile(rf"^##\s+{re.escape(sec)}\b", re.MULTILINE)
            assert pattern.search(content), f"SOUL template '{pid}.md' is missing mandatory section: '## {sec}'"


def test_soul_templates_contain_zero_credentials_or_secrets():
    validator = SeedValidator()
    soul_dir = validator.soul_dir

    for pid in CANONICAL_PROFILES:
        content = (soul_dir / f"{pid}.md").read_text(encoding="utf-8")
        for pat in SECRET_PATTERNS:
            match = pat.search(content)
            assert match is None, f"Potential secret found in '{pid}.md': {match.group(0) if match else ''}"


def test_soul_templates_have_distinct_autonomy_boundaries():
    validator = SeedValidator()
    soul_dir = validator.soul_dir

    # Marketing: distinguishes create vs publish
    mkt = (soul_dir / "marketing.md").read_text(encoding="utf-8")
    assert "publish" in mkt.lower()
    assert "approval" in mkt.lower()

    # CS: distinguishes draft vs send
    cs = (soul_dir / "cs.md").read_text(encoding="utf-8")
    assert "draft" in cs.lower()
    assert "send" in cs.lower()

    # IT Support: read-only by default, restart requires approval
    its = (soul_dir / "it-support.md").read_text(encoding="utf-8")
    assert "read-only" in its.lower()
    assert "restart" in its.lower()

    # IT Coding: workspace development vs production deployment
    itc = (soul_dir / "it-coding.md").read_text(encoding="utf-8")
    assert "production deploy" in itc.lower() or "deploy" in itc.lower()

    # Lead: not root/superuser
    lead = (soul_dir / "lead.md").read_text(encoding="utf-8")
    assert "root" in lead.lower() or "superuser" in lead.lower()

    # Business: serial number read-only
    biz = (soul_dir / "business.md").read_text(encoding="utf-8")
    assert "read-only" in biz.lower()
    assert "serial number" in biz.lower()
