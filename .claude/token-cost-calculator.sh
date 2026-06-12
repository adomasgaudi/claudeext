#!/bin/bash
# Token cost calculator with model multiplier
# Used by statusLine and Stop hook

# Model pricing: input_cost, output_cost (per million tokens), multiplier_vs_sonnet
declare -A MODELS=(
  ["claude-haiku-4-5-20251001"]="0.80,2.40,0.27"
  ["claude-sonnet-4-6-20250514"]="3.00,15.00,1.00"
  ["claude-opus-4-8-20250514"]="15.00,60.00,5.00"
  ["claude-opus-4-7-20250219"]="15.00,60.00,5.00"
  ["claude-opus-4-6-20250514"]="15.00,60.00,5.00"
  ["claude-sonnet"]="3.00,15.00,1.00"
  ["claude-opus"]="15.00,60.00,5.00"
  ["claude-haiku"]="0.80,2.40,0.27"
)

# Get current model - try environment, then settings, then default
MODEL="${CLAUDE_MODEL:-${ANTHROPIC_MODEL:-claude-haiku-4-5-20251001}}"

# Extract pricing for this model
PRICING="${MODELS[$MODEL]:-0.80,2.40,0.27}"
IFS=',' read INPUT_COST OUTPUT_COST MULTIPLIER <<< "$PRICING"

# Read from stdin (Stop hook provides JSON)
if [ -t 0 ]; then
  # Interactive: calculate from session
  PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
  SESSION_FILE="$PROJECT_DIR/.claude/session.jsonl"

  if [ ! -f "$SESSION_FILE" ]; then
    echo "Session file not found"
    exit 0
  fi

  # Get last line with usage info
  LAST_LINE=$(tail -1 "$SESSION_FILE")
  INPUT_TOKENS=$(echo "$LAST_LINE" | jq -r '.inputTokens // 0' 2>/dev/null || echo 0)
  OUTPUT_TOKENS=$(echo "$LAST_LINE" | jq -r '.outputTokens // 0' 2>/dev/null || echo 0)
  TOTAL_TOKENS=$(( INPUT_TOKENS + OUTPUT_TOKENS ))
else
  # From hook JSON (Stop hook)
  INPUT=$(cat)
  INPUT_TOKENS=$(echo "$INPUT" | jq -r '.inputTokens // 0' 2>/dev/null || echo 0)
  OUTPUT_TOKENS=$(echo "$INPUT" | jq -r '.outputTokens // 0' 2>/dev/null || echo 0)
  TOTAL_TOKENS=$(( INPUT_TOKENS + OUTPUT_TOKENS ))
fi

# Calculate costs (use bc for arithmetic)
INPUT_COST_USD=$(echo "scale=6; $INPUT_TOKENS * $INPUT_COST / 1000000" | bc 2>/dev/null || echo "0.000000")
OUTPUT_COST_USD=$(echo "scale=6; $OUTPUT_TOKENS * $OUTPUT_COST / 1000000" | bc 2>/dev/null || echo "0.000000")
TOTAL_COST=$(echo "scale=6; $INPUT_COST_USD + $OUTPUT_COST_USD" | bc 2>/dev/null || echo "0.000000")

# Format output for statusLine (one-liner)
if [ "$1" = "--status" ]; then
  printf "📊 %s tokens | \$%.4f | %s (%.2f×)" \
    "$TOTAL_TOKENS" "$TOTAL_COST" "$(basename $MODEL | cut -d- -f3-)" "$MULTIPLIER"
  exit 0
fi

# Format output for Stop hook (formatted message)
cat << EOF
---
**📊 Token Usage & Cost**
- **Model**: $MODEL (${MULTIPLIER}× Sonnet)
- **Input tokens**: $INPUT_TOKENS @ \$$INPUT_COST/M = \$$INPUT_COST_USD
- **Output tokens**: $OUTPUT_TOKENS @ \$$OUTPUT_COST/M = \$$OUTPUT_COST_USD
- **Total**: $TOTAL_TOKENS tokens = **\$$TOTAL_COST**
---
EOF
