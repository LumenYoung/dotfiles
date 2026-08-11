# Upstream provenance and local adaptation

This skill is adapted from:

- Project: [mattpocock/skills](https://github.com/mattpocock/skills)
- Skill: [skills/engineering/wayfinder/SKILL.md](https://github.com/mattpocock/skills/blob/main/skills/engineering/wayfinder/SKILL.md)
- Source commit used for this adaptation: `84fdeffd12f2ee307994d1eb6feb48173b6e0502`
- License: MIT, reproduced in [LICENSE](LICENSE)

## Local differences

The upstream Wayfinder assumes a companion Matt Pocock skill suite, including `/grilling`, `/domain-modeling`, `/research`, `/prototype`, and `/setup-matt-pocock-skills`.

This dotfiles adaptation intentionally exposes only Wayfinder and integrates with the existing local ecosystem:

- all HITL grilling and domain documentation are delegated to the already-installed `grill-with-docs` skill;
- research and prototype tickets use whichever equivalent repo-native skills or subagents are available;
- issue-tracker guidance is read from the target repo when present;
- repositories without tracker guidance use the bundled local Markdown convention;
- no separate setup skill is required before creating a local map.

The destination/map/ticket/frontier/fog-of-war model remains derived from upstream Wayfinder.
