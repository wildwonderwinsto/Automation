#!/bin/bash
# ──────────────────────────────────────────────
# remove-silence.sh
# Removes silent gaps from a voice-over audio file using FFmpeg.
#
# Usage:
#   ./scripts/remove-silence.sh input.mp3 output.mp3
#
# Requires: ffmpeg
# ──────────────────────────────────────────────

set -euo pipefail

INPUT="${1:?Usage: remove-silence.sh <input> <output>}"
OUTPUT="${2:?Usage: remove-silence.sh <input> <output>}"

# Silence detection parameters
NOISE_THRESHOLD="-35dB"   # Audio below this level counts as silence
MIN_SILENCE_DUR="0.3"     # Minimum silence duration (seconds) to trim

echo "── Remove Silence ──"
echo "Input:  $INPUT"
echo "Output: $OUTPUT"
echo "Threshold: $NOISE_THRESHOLD | Min silence: ${MIN_SILENCE_DUR}s"
echo ""

# Step 1: Detect silent intervals
echo "Detecting silences..."
SILENCE_LOG=$(mktemp)
ffmpeg -i "$INPUT" \
  -af "silencedetect=noise=$NOISE_THRESHOLD:d=$MIN_SILENCE_DUR" \
  -f null - 2>&1 | grep "silence_" > "$SILENCE_LOG" || true

SILENCE_COUNT=$(grep -c "silence_start" "$SILENCE_LOG" || echo "0")
echo "Found $SILENCE_COUNT silent segments."

if [ "$SILENCE_COUNT" -eq 0 ]; then
  echo "No silence detected. Copying input as-is."
  cp "$INPUT" "$OUTPUT"
  rm "$SILENCE_LOG"
  echo "Done: $OUTPUT"
  exit 0
fi

# Step 2: Build a filter that keeps only non-silent sections
# Parse silence_start and silence_end into an array
STARTS=()
ENDS=()

while IFS= read -r line; do
  if echo "$line" | grep -q "silence_start"; then
    val=$(echo "$line" | grep -oE "silence_start: [0-9.]+" | awk '{print $2}')
    STARTS+=("$val")
  fi
  if echo "$line" | grep -q "silence_end"; then
    val=$(echo "$line" | grep -oE "silence_end: [0-9.]+" | awk '{print $2}')
    ENDS+=("$val")
  fi
done < "$SILENCE_LOG"
rm "$SILENCE_LOG"

# Step 3: Build ffmpeg trim + concat filter
FILTER=""
SEGMENT_COUNT=0

# Get total duration
DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$INPUT")

# Before first silence
if (( $(echo "${STARTS[0]} > 0.01" | bc -l) )); then
  FILTER+="[0:a]atrim=start=0:end=${STARTS[0]},asetpts=PTS-STARTPTS[s${SEGMENT_COUNT}];"
  SEGMENT_COUNT=$((SEGMENT_COUNT + 1))
fi

# Between silences
for i in "${!ENDS[@]}"; do
  END_OF_SILENCE="${ENDS[$i]}"
  if [ $((i + 1)) -lt ${#STARTS[@]} ]; then
    START_OF_NEXT_SILENCE="${STARTS[$((i + 1))]}"
  else
    START_OF_NEXT_SILENCE="$DURATION"
  fi

  if (( $(echo "$START_OF_NEXT_SILENCE > $END_OF_SILENCE" | bc -l) )); then
    FILTER+="[0:a]atrim=start=${END_OF_SILENCE}:end=${START_OF_NEXT_SILENCE},asetpts=PTS-STARTPTS[s${SEGMENT_COUNT}];"
    SEGMENT_COUNT=$((SEGMENT_COUNT + 1))
  fi
done

# Build concat inputs
CONCAT_INPUTS=""
for ((i = 0; i < SEGMENT_COUNT; i++)); do
  CONCAT_INPUTS+="[s${i}]"
done

FILTER+="${CONCAT_INPUTS}concat=n=${SEGMENT_COUNT}:v=0:a=1[out]"

echo "Trimming ${SILENCE_COUNT} silences across ${SEGMENT_COUNT} segments..."
ffmpeg -y -i "$INPUT" -filter_complex "$FILTER" -map "[out]" "$OUTPUT" 2>/dev/null

# Report results
ORIG_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$INPUT")
NEW_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUTPUT")
SAVED=$(echo "$ORIG_DUR - $NEW_DUR" | bc -l)

echo ""
echo "✓ Done!"
echo "  Original: ${ORIG_DUR}s"
echo "  Trimmed:  ${NEW_DUR}s"
echo "  Saved:    ${SAVED}s"
echo "  Output:   $OUTPUT"
