#!/usr/bin/env python3
"""Validate an Agent Skills-style skill directory."""

from __future__ import annotations

import re
import sys
from pathlib import Path

MAX_NAME_LENGTH = 64
MAX_DESCRIPTION_LENGTH = 1024


def parse_frontmatter(text: str) -> tuple[bool, str, dict[str, str] | None]:
    if not text.startswith("---\n"):
        return False, "No YAML frontmatter found", None
    end = text.find("\n---", 4)
    if end == -1:
        return False, "Invalid frontmatter terminator", None

    data: dict[str, str] = {}
    for line in text[4:end].splitlines():
        if not line.strip():
            continue
        if ":" not in line:
            return False, f"Invalid frontmatter line: {line}", None
        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        data[key] = value
    return True, "ok", data


def validate_skill(path: str) -> tuple[bool, str]:
    skill_dir = Path(path)
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        return False, f"SKILL.md not found: {skill_md}"

    ok, message, frontmatter = parse_frontmatter(skill_md.read_text(encoding="utf-8"))
    if not ok or frontmatter is None:
        return False, message

    allowed = {"name", "description", "license", "compatibility", "metadata", "allowed-tools", "disable-model-invocation"}
    unexpected = sorted(set(frontmatter) - allowed)
    if unexpected:
        return False, f"Unexpected frontmatter keys: {', '.join(unexpected)}"

    name = frontmatter.get("name", "").strip()
    description = frontmatter.get("description", "").strip()
    if not name:
        return False, "Missing required frontmatter field: name"
    if not description:
        return False, "Missing required frontmatter field: description"
    if len(name) > MAX_NAME_LENGTH:
        return False, f"Name is too long: {len(name)} > {MAX_NAME_LENGTH}"
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name):
        return False, "Name must be lowercase hyphen-case with no leading/trailing/consecutive hyphens"
    if len(description) > MAX_DESCRIPTION_LENGTH:
        return False, f"Description is too long: {len(description)} > {MAX_DESCRIPTION_LENGTH}"
    if "<" in description or ">" in description:
        return False, "Description must not contain angle brackets"

    return True, "Skill is valid"


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: quick_validate.py <skill-directory>", file=sys.stderr)
        return 2
    ok, message = validate_skill(sys.argv[1])
    print(message)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
