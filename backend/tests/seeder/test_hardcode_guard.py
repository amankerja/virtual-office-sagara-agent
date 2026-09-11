"""
Static Hardcode Guard Tests (Prompt 14.1 Section 122).
Enforces architectural invariant that core runtime, routing, execution,
and authorization logic NEVER hardcode profile identity branching.
"""
import ast
from pathlib import Path
import pytest

APP_ROOT = Path(__file__).parent.parent.parent / "app"

CRITICAL_DIRS = [
    APP_ROOT / "services",
    APP_ROOT / "api",
    APP_ROOT / "domain",
    APP_ROOT / "repositories" / "sqlite",
]

FORBIDDEN_PROFILE_LITERALS = {
    "lead",
    "personal",
    "business",
    "marketing",
    "cs",
    "it-support",
    "it-coding",
    "sagara-lab",
}


def test_no_profile_id_branching_in_critical_modules():
    """
    Scans Python AST for comparison nodes checking `profile_id == 'marketing'`
    or `profile == 'lead'` in critical production modules.
    """
    violations = []

    for d in CRITICAL_DIRS:
        if not d.is_dir():
            continue
        for py_file in d.glob("**/*.py"):
            # Exclude mock fixtures or test helpers
            if "fixtures" in str(py_file) or "mock" in str(py_file):
                continue

            try:
                tree = ast.parse(py_file.read_text(encoding="utf-8"), filename=str(py_file))
            except Exception:
                continue

            for node in ast.walk(tree):
                if isinstance(node, ast.Compare):
                    # Check left and right comparators
                    for comp in [node.left] + node.comparators:
                        if isinstance(comp, ast.Constant) and isinstance(comp.value, str):
                            val = comp.value.lower()
                            if val in FORBIDDEN_PROFILE_LITERALS:
                                violations.append(
                                    f"{py_file.name}:{node.lineno} - Hardcoded profile literal comparison: '{val}'"
                                )

    assert len(violations) == 0, f"Found hardcoded profile branching in critical modules:\n" + "\n".join(violations)
