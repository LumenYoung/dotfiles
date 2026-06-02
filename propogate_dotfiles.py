# pylint: disable=invalid-name, line-too-long, missing-docstring, redefined-outer-name
"""Propogate my dotfiles in the repo,
they are symlinked to destinations defined in destinations.yaml"""

import argparse
from typing import Dict, List, Any
from pathlib import Path
import shutil
import yaml

wkdir = Path.cwd()
user = Path.home().name

repo = wkdir
home = Path.home()
dot_config = home / ".config"

to_ignore = [
    ".git",
    "dotflie.py",
    "confsync",
    "destination.yaml",
    ".gitignore",
    "README.md",
    "propogate_dotfiles.py",
    "mise.toml",
    "AGENTS.md",
    ".session",
    "kde_backup.py",
    ".gitconfig",
]

# Core configs that will be propagated with --core flag
core_configs = [
    "nvim",
    "zellij",
    "herdr/config.toml",
    "herdr-workspace-cycle",
    "fish",
    "btop",
    "yazi",
    "lazygit",
]

# Agent configs propagated during setup after the core shell/tooling exists.
agent_configs = [
    "codex",
    "codex-t3",
    "claude/skills",
    "claude/settings.json",
    "opencode",
    "t3-code",
    "systemd",
    "codex-session-stream",
    "pi-agent/skills",
    "pi-agent/extensions",
    "pi-agent/pi-codex-conversion.json",
    "pi-agent/models.json",
    "pi-agent/settings.json",
]


# Read the destinations from the destination.yaml file
def read_destinations(file: str) -> Dict[str, str]:
    with open(file, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


destinations = read_destinations("destination.yaml")

all_configs = [config.name for config in repo.iterdir() if config.name not in to_ignore]


def remove(path):
    path = Path(path)
    if path.is_file() or path.is_symlink():
        path.unlink()
    elif path.is_dir():
        shutil.rmtree(path)
    else:
        raise ValueError(f"file {path} is not a file or dir.")


def create_link(
    config_dir: str, target_dir: str, configs: List[str], safe_mode: Any = True
) -> Dict[str, List[str]]:
    """Returns a dict with 'success', 'warnings', 'errors' keys containing lists of messages"""
    results = {"success": [], "warnings": [], "errors": []}

    config_dir = Path(config_dir)

    for cfg in configs:
        target_path = Path(target_dir).expanduser()
        source_path = config_dir / cfg

        try:
            # Check if target already exists
            if target_path.is_symlink():
                results["warnings"].append(f"{cfg}: already linked at {target_path}")
                continue
            elif target_path.is_dir() or target_path.is_file():
                if safe_mode:
                    results["errors"].append(f"{cfg}: target exists at {target_path}")
                    continue
                else:
                    remove(target_path)
                    results["warnings"].append(
                        f"{cfg}: removed existing file/dir at {target_path}"
                    )

            # Create parent directory if needed
            parent_dir = target_path.parent
            if not parent_dir.exists():
                parent_dir.mkdir(parents=True, exist_ok=True)
                results["warnings"].append(f"Created parent directory: {parent_dir}")

            # Create the symlink
            target_path.symlink_to(source_path)
            results["success"].append(f"{cfg} → {target_path}")

        except FileExistsError:
            results["warnings"].append(f"{cfg}: already exists at {target_path}")
        except Exception as e:
            results["errors"].append(f"{cfg}: failed to link - {str(e)}")

    return results


# def scan_for_unknown(config_dir: str, configs: List) -> None:
#     config_dir = Path(config_dir)
#     for item in config_dir.iterdir():
#         if item.is_symlink() and item.name not in configs:
#             print(
#                 f"Warning: {item.name} in ~/.config is a symlink but not in config file. Please check if this is a discarded config."
#             )


def print_summary(all_results: List[Dict[str, List[str]]]):
    """Print a clean summary of all operations"""
    total_success = sum(len(r["success"]) for r in all_results)
    total_warnings = sum(len(r["warnings"]) for r in all_results)
    total_errors = sum(len(r["errors"]) for r in all_results)

    print("\n" + "=" * 50)
    print("PROPAGATION SUMMARY")
    print("=" * 50)

    if total_success > 0:
        print(f"✅ Successfully linked: {total_success} configs")

    if total_warnings > 0:
        print(f"⚠️  Warnings: {total_warnings}")
        for results in all_results:
            for warning in results["warnings"]:
                print(f"   • {warning}")

    if total_errors > 0:
        print(f"❌ Errors: {total_errors}")
        for results in all_results:
            for error in results["errors"]:
                print(f"   • {error}")

    if total_errors == 0:
        print("🎉 All configurations propagated successfully!")

    print("=" * 50)


def main():
    parser = argparse.ArgumentParser(
        description="Propagate dotfiles from repo to destinations"
    )
    parser.add_argument(
        "configs", nargs="*", help="Specific configs to propagate (leave empty for all)"
    )
    parser.add_argument(
        "--core", action="store_true", help="Propagate only core configs"
    )
    parser.add_argument(
        "--agents", action="store_true", help="Propagate agent configs"
    )
    args = parser.parse_args()

    if args.core:
        # Propagate only core configs
        configs_to_propagate = core_configs
    elif args.agents:
        # Propagate agent configs
        configs_to_propagate = agent_configs
    elif args.configs:
        # Only propagate specified configs
        configs_to_propagate = []
        for config in args.configs:
            if config in destinations:
                configs_to_propagate.append(config)
            else:
                print(f"Warning: {config} not found in destination.yaml, skipping")

        if not configs_to_propagate:
            print("No valid configs specified, nothing to do")
            return
    else:
        # Propagate all configs (original behavior)
        configs_to_propagate = all_configs

    all_results = []

    for config in configs_to_propagate:
        target_dir = destinations.get(config)
        if target_dir:
            results = create_link(repo, target_dir, [config], safe_mode=False)
            all_results.append(results)
        else:
            # Handle missing destination
            all_results.append(
                {
                    "success": [],
                    "warnings": [],
                    "errors": [f"{config}: not found in destination.yaml"],
                }
            )

    print_summary(all_results)


if __name__ == "__main__":
    main()
