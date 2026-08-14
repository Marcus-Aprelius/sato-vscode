#!/usr/bin/env bash
set -euo pipefail

DUMP_FILE="${1:-sato-code-dump.txt}"
TARGET_DIR="${2:-restored}"

if [ ! -f "$DUMP_FILE" ]; then
    echo "ERROR: dump file not found: $DUMP_FILE" >&2
    exit 1
fi

mkdir -p "$TARGET_DIR"

python3 - "$DUMP_FILE" "$TARGET_DIR" <<'PY'
import sys
from pathlib import Path

dump_file = Path(sys.argv[1])
target_dir = Path(sys.argv[2])

separator = "=" * 80

lines = dump_file.read_text(encoding="utf-8", errors="replace").splitlines(keepends=True)

i = 0
created = 0


def is_separator(line: str) -> bool:
    return line.rstrip("\r\n") == separator


def safe_target_path(rel_path: str) -> Path:
    rel_path = rel_path.strip()

    if rel_path.startswith("./"):
        rel_path = rel_path[2:]

    path = Path(rel_path)

    if path.is_absolute():
        raise ValueError(f"absolute path is not allowed: {rel_path}")

    if ".." in path.parts:
        raise ValueError(f"path traversal is not allowed: {rel_path}")

    return target_dir / path


while i < len(lines):
    line = lines[i]

    if not line.startswith("FILE: "):
        i += 1
        continue

    rel_path = line[len("FILE: "):].strip()
    out_path = safe_target_path(rel_path)

    i += 1

    if i < len(lines) and is_separator(lines[i]):
        i += 1

    if i < len(lines) and lines[i] in ("\n", "\r\n"):
        i += 1

    content = []

    while i < len(lines):
        if is_separator(lines[i]) and i + 1 < len(lines) and lines[i + 1].startswith("FILE: "):
            break

        content.append(lines[i])
        i += 1

    removed = 0
    while content and content[-1] in ("\n", "\r\n") and removed < 2:
        content.pop()
        removed += 1

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("".join(content), encoding="utf-8")

    if out_path.suffix == ".sh":
        mode = out_path.stat().st_mode
        out_path.chmod(mode | 0o755)

    created += 1

print(f"Restored files: {created}")
print(f"Target directory: {target_dir}")
PY
