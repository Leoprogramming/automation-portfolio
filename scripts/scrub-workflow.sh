#!/usr/bin/env bash
set -euo pipefail

SRC="$1"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$REPO_DIR/workflows/job-tracker.json"

[ -f "$SRC" ] || { echo "Source file not found: $SRC"; exit 1; }
[ -s "$SRC" ] || { echo "Source file is empty: $SRC"; exit 1; }

sed -E 's/app[A-Za-z0-9]{14}/appREPLACE_ME/g; s/tbl[A-Za-z0-9]{14}/tblREPLACE_ME/g' "$SRC" > "$DEST"

if grep -qE '(app|tbl)[A-Za-z0-9]{14}' "$DEST"; then
  echo "WARNING: possible unscrubbed ID still in $DEST — check manually before committing"
  grep -oE '(app|tbl)[A-Za-z0-9]{14}' "$DEST" | sort -u
  exit 1
fi

echo "Scrub looks clean. Diff:"
cd "$REPO_DIR"
git diff workflows/job-tracker.json
echo ""
echo "Review the diff above. Commit manually if it looks correct:"
echo "  git add workflows/job-tracker.json && git commit -m 'chore: update workflow json from n8n export'"
