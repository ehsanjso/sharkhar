#!/bin/bash
#
# cron-optimize.sh - Smart cron job cost optimizer
#
# Combines audit + optimization in one script.
# Detects which jobs can safely use Haiku and applies changes.
#
# Usage:
#   ./cron-optimize.sh              # Dry run (preview changes)
#   ./cron-optimize.sh --apply      # Apply changes
#   ./cron-optimize.sh --help       # Show this help
#
# Must be run from main session (not from within a cron job).
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JOBS_FILE="$HOME/.clawdbot/cron/jobs.json"
BACKUP_FILE="$JOBS_FILE.optimize-backup"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[0;90m'
NC='\033[0m'

# Flags
APPLY_MODE=false
VERBOSE=false

usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS]

Smart cron job cost optimizer. Detects jobs that can safely use Haiku
model instead of default (Sonnet) for significant cost savings.

Options:
  --apply      Apply changes (default: dry run)
  --verbose    Show detection reasoning
  --help       Show this help message

Detection Rules:
  SAFE for Haiku (simple tasks):
    - Reminders, notifications, alerts
    - Backups, pruning, cleanup
    - Simple status checks, monitors
    - Jobs with "status", "check", "backup", "prune" in name

  KEEP on Default (complex tasks):
    - Analysis, research, reports
    - Code generation, reviews
    - Jobs with "analyze", "report", "code", "review" in name

Examples:
  $(basename "$0")              # Preview what would change
  $(basename "$0") --apply      # Apply optimizations
  $(basename "$0") --verbose    # See detection reasoning

Note: Must be run from main Telegram session, not from within a cron job.
EOF
}

# Parse args
while [[ $# -gt 0 ]]; do
    case $1 in
        --apply)
            APPLY_MODE=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

# Check jobs file exists
if [[ ! -f "$JOBS_FILE" ]]; then
    echo -e "${RED}❌ Jobs file not found: $JOBS_FILE${NC}"
    exit 1
fi

echo -e "${BOLD}🔍 Cron Job Cost Optimizer${NC}"
echo -e "${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Use jq to classify and output all info in one go
# Classification logic in jq:
# - Already haiku = keep-haiku
# - Name contains complex patterns = keep-complex  
# - Name contains simple patterns = switch-haiku
# - Otherwise = review

ANALYSIS=$(jq -r '
def is_simple:
  . as $n | $n | ascii_downcase |
  (contains("reminder") or 
   contains("backup") or 
   contains("prune") or 
   contains("pruning") or 
   contains("cleanup") or 
   contains("status") or 
   contains("check") or 
   contains("monitor") or 
   contains("alert") or 
   contains("notification") or 
   contains("ping") or 
   contains("health") or
   contains("morning brief") or
   contains("nft price") or
   contains("quota"));

def is_complex:
  . as $n | $n | ascii_downcase |
  (contains("report") or 
   contains("analysis") or 
   contains("analyze") or 
   contains("research") or 
   contains("digest") or 
   contains("code") or 
   contains("review") or 
   contains("proactive") or 
   contains("strategy") or 
   contains("trading") or 
   contains("market") or 
   contains("polymarket") or 
   contains("airdrop") or 
   contains("spare capacity"));

def classify:
  .model as $model | .name as $name |
  if $model == "haiku" then "keep-haiku"
  elif ($name | is_complex) then "keep-complex"
  elif ($name | is_simple) then "switch-haiku"
  else "review"
  end;

.jobs | map({
  id: .id,
  name: .name,
  model: (.model // "default"),
  enabled: (.enabled // true),
  classification: classify
})
' "$JOBS_FILE")

# Count by classification
TOTAL=$(echo "$ANALYSIS" | jq 'length')
SWITCH_COUNT=$(echo "$ANALYSIS" | jq '[.[] | select(.classification == "switch-haiku")] | length')
ALREADY_OPTIMIZED=$(echo "$ANALYSIS" | jq '[.[] | select(.classification == "keep-haiku")] | length')
KEEP_COMPLEX=$(echo "$ANALYSIS" | jq '[.[] | select(.classification == "keep-complex")] | length')
NEEDS_REVIEW=$(echo "$ANALYSIS" | jq '[.[] | select(.classification == "review")] | length')

echo -e "${BOLD}Analysis${NC}"
echo -e "${DIM}Status   Job Name                              Current  → Recommendation${NC}"
echo -e "${DIM}──────────────────────────────────────────────────────────────────────────${NC}"

# Print each job
echo "$ANALYSIS" | jq -r '.[] | [.classification, .name, .model, .id] | @tsv' | while IFS=$'\t' read -r class name model id; do
    case "$class" in
        "switch-haiku")
            icon="${GREEN}●${NC}"
            status="→ switch to haiku"
            ;;
        "keep-haiku")
            icon="${BLUE}✓${NC}"
            status="already optimal"
            ;;
        "keep-complex")
            icon="${YELLOW}○${NC}"
            status="keep (complex task)"
            ;;
        "review")
            icon="${DIM}?${NC}"
            status="needs review"
            ;;
    esac
    printf "${icon} %-40s ${DIM}%-8s${NC} %s\n" "$name" "$model" "$status"
done

echo
echo -e "${BOLD}Summary${NC}"
echo -e "  Total jobs:        ${CYAN}$TOTAL${NC}"
echo -e "  Already optimized: ${BLUE}$ALREADY_OPTIMIZED${NC}"
echo -e "  Can switch:        ${GREEN}$SWITCH_COUNT${NC}"
echo -e "  Keep complex:      ${YELLOW}$KEEP_COMPLEX${NC}"
echo -e "  Needs review:      ${DIM}$NEEDS_REVIEW${NC}"
echo

# Nothing to switch?
if [[ $SWITCH_COUNT -eq 0 ]]; then
    echo -e "${GREEN}✅ All jobs already optimized!${NC}"
    exit 0
fi

# Get IDs to switch
TO_SWITCH=$(echo "$ANALYSIS" | jq -r '.[] | select(.classification == "switch-haiku") | "\(.id)|\(.name)"')

echo -e "${BOLD}Jobs to optimize:${NC}"
echo "$TO_SWITCH" | while IFS='|' read -r id name; do
    echo -e "  ${GREEN}•${NC} $name ${DIM}($id)${NC}"
done
echo

# Dry run mode
if [[ "$APPLY_MODE" != "true" ]]; then
    echo -e "${YELLOW}🔍 DRY RUN${NC} - No changes applied"
    echo
    echo -e "To apply these changes, run:"
    echo -e "  ${CYAN}./cron-optimize.sh --apply${NC}"
    echo
    echo -e "Or manually via clawdbot CLI:"
    echo "$TO_SWITCH" | while IFS='|' read -r id name; do
        echo -e "  ${DIM}clawdbot cron edit $id --model haiku${NC}  # $name"
    done
    exit 0
fi

# Apply mode
echo -e "${BOLD}Applying changes...${NC}"

# Backup first
echo -e "  ${DIM}Creating backup...${NC}"
cp "$JOBS_FILE" "$BACKUP_FILE"

# Get just the IDs
IDS_TO_SWITCH=$(echo "$ANALYSIS" | jq -r '.[] | select(.classification == "switch-haiku") | .id')

# Update each job
tmp_file=$(mktemp)
cp "$JOBS_FILE" "$tmp_file"

for id in $IDS_TO_SWITCH; do
    name=$(echo "$ANALYSIS" | jq -r --arg id "$id" '.[] | select(.id == $id) | .name')
    
    jq --arg id "$id" '
        .jobs = [.jobs[] | if .id == $id then .model = "haiku" else . end]
    ' "$tmp_file" > "$tmp_file.new" && mv "$tmp_file.new" "$tmp_file"
    
    echo -e "  ${GREEN}✓${NC} $name → haiku"
done

# Write final
mv "$tmp_file" "$JOBS_FILE"

echo
echo -e "${GREEN}✅ Changes applied!${NC}"
echo
echo -e "${BOLD}Next steps:${NC}"
echo -e "  1. Restart gateway: ${CYAN}clawdbot gateway restart${NC}"
echo -e "  2. Verify changes:  ${CYAN}clawdbot cron list${NC}"
echo -e "  3. If issues:       ${CYAN}cp $BACKUP_FILE $JOBS_FILE${NC}"
