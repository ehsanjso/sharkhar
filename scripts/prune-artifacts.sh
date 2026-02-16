#!/usr/bin/env bash
#
# prune-artifacts.sh - Clean up old artifact files
#
# Usage:
#   ./prune-artifacts.sh           # Dry run (show what would be deleted)
#   ./prune-artifacts.sh --delete  # Actually delete old files
#   ./prune-artifacts.sh --days 3  # Set age threshold (default: 7)

set -euo pipefail

ARTIFACTS_DIR="${HOME}/clawd/artifacts"
DRY_RUN=true
DAYS=7

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --delete|-d)
      DRY_RUN=false
      shift
      ;;
    --days)
      DAYS="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [--delete] [--days N]"
      echo ""
      echo "Options:"
      echo "  --delete, -d    Actually delete files (default: dry run)"
      echo "  --days N        Delete files older than N days (default: 7)"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Check directory exists
if [[ ! -d "$ARTIFACTS_DIR" ]]; then
  echo "Artifacts directory not found: $ARTIFACTS_DIR"
  exit 1
fi

# Find old files (excluding README and .gitkeep)
OLD_FILES=$(find "$ARTIFACTS_DIR" -type f -mtime +${DAYS} \
  -not -name "README.md" \
  -not -name ".gitkeep" \
  2>/dev/null || true)

if [[ -z "$OLD_FILES" ]]; then
  echo "No files older than $DAYS days found in artifacts/"
  exit 0
fi

# Count and list
COUNT=$(echo "$OLD_FILES" | wc -l)
TOTAL_SIZE=$(echo "$OLD_FILES" | xargs du -ch 2>/dev/null | tail -1 | cut -f1)

echo "Found $COUNT file(s) older than $DAYS days ($TOTAL_SIZE):"
echo ""
echo "$OLD_FILES" | while read -r file; do
  AGE=$(( ( $(date +%s) - $(stat -c %Y "$file") ) / 86400 ))
  SIZE=$(du -h "$file" | cut -f1)
  echo "  [$AGE days] $SIZE  $(basename "$file")"
done

echo ""

if $DRY_RUN; then
  echo "DRY RUN - no files deleted. Use --delete to remove."
else
  echo "$OLD_FILES" | xargs rm -f
  echo "Deleted $COUNT file(s), freed $TOTAL_SIZE"
fi
