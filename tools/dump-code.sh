#!/usr/bin/env bash
set -euo pipefail

OUT="${1:-sato-code-dump.txt}"

rm -f "$OUT"

{
    echo "SATO code dump"
    echo "Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    echo ""
} >> "$OUT"

find . \
  -type f \
  \( \
    -name "*.go" \
    -o -name "go.mod" \
    -o -name "go.sum" \
    -o -name "*.sh" \
    -o -name "Makefile" \
    -o -name "*.yml" \
    -o -name "*.yaml" \
    -o -name "*.ts" \
  \) \
  -not -path "./node_modules/*" \
  -not -path "./Dockerfile" \
  -not -path "./.gitignore" \
  -not -path "./.dockerignore" \
  -not -path "./.git/*" \
  -not -path "./COPYING" \
  -not -path "./LICENSE" \
  -not -path "./bin/*" \
  -not -path "./dist/*" \
  -not -path "./tmp/*" \
  -not -path "./vendor/*" \
  -not -path "./$OUT" \
  -not -path "./playground/docker-compose.yml" \
  -not -path "./playground/.env" \
  -not -path "./playground/secrets.kdbx" \
  -not -path "./changelog/release_*" \
  | sort \
  | while read -r file; do
    {
        echo "================================================================================"
        echo "FILE: $file"
        echo "================================================================================"
        echo ""
        cat "$file"
        echo ""
        echo ""
    } >> "$OUT"
  done

echo "Written to: $OUT"
