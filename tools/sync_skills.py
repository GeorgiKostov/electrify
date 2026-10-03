#!/usr/bin/env python3
"""Mirror the engine-agnostic skills from .agents/skills (Codex, source of truth) to .claude/skills (Claude Code).

The Codex workflow skills (opus-loop, feature-loop, opus-review) stay Codex-only: they rely on Codex native subagents.
Claude-only skills (e.g. codex-consult) live in .claude/skills and are never touched here.

Usage: python3 tools/sync_skills.py [--check]
"""
import filecmp
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / ".agents" / "skills"
DST = ROOT / ".claude" / "skills"
SHARED = ["game-feel", "game-ui-ux", "input-systems", "science-copy"]


def differs(a: Path, b: Path) -> bool:
    if not b.exists():
        return True
    cmp = filecmp.dircmp(a, b)
    stack = [cmp]
    while stack:
        c = stack.pop()
        if c.left_only or c.right_only or c.diff_files or c.funny_files:
            return True
        stack.extend(c.subdirs.values())
    return False


def main() -> int:
    check = "--check" in sys.argv
    stale = [name for name in SHARED if differs(SRC / name, DST / name)]
    if check:
        for name in stale:
            print(f"out of sync: {name}")
        return 1 if stale else 0
    DST.mkdir(parents=True, exist_ok=True)
    for name in stale:
        target = DST / name
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(SRC / name, target)
        print(f"synced {name}")
    if not stale:
        print("all shared skills in sync")
    return 0


if __name__ == "__main__":
    sys.exit(main())
