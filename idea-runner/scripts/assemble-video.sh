#!/bin/bash
# ──────────────────────────────────────────────
# assemble-video.sh
# Stitches selected scene images + voice-over audio + SRT captions
# into a final MP4 video using FFmpeg.
#
# Usage:
#   ./scripts/assemble-video.sh <project_dir>
#
# Expected project_dir structure:
#   project_dir/
#     scenes.json        ← scene data with selected_image paths
#     voiceover.mp3      ← processed audio (silences already removed)
#     captions.srt       ← timestamped subtitle file
#
# Output:
#   project_dir/final_video.mp4
#
# Requires: ffmpeg, jq
# ──────────────────────────────────────────────

set -euo pipefail

PROJECT_DIR="${1:?Usage: assemble-video.sh <project_dir>}"
FFMPEG="${FFMPEG:-ffmpeg}"
FFPROBE="${FFPROBE:-ffprobe}"

SCENES_JSON="$PROJECT_DIR/scenes.json"
AUDIO="$PROJECT_DIR/voiceover.mp3"
SRT="$PROJECT_DIR/captions.srt"
OUTPUT="$PROJECT_DIR/final_video.mp4"

# Validate inputs exist
for f in "$SCENES_JSON" "$AUDIO" "$SRT"; do
  if [ ! -f "$f" ]; then
    echo "Error: Missing required file: $f"
    exit 1
  fi
done

echo "── Assemble Video ──"
echo "Project:  $PROJECT_DIR"

# Get audio duration
AUDIO_DURATION=$("$FFPROBE" -v error -show_entries format=duration -of csv=p=0 "$AUDIO")
echo "Audio:    ${AUDIO_DURATION}s"

# Read scene count
SCENE_COUNT=$(jq length "$SCENES_JSON")
echo "Scenes:   $SCENE_COUNT"

# Step 1: Build FFmpeg input list and filter graph
INPUTS=""
FILTER=""
CONCAT=""

for i in $(seq 0 $((SCENE_COUNT - 1))); do
  IMAGE=$(jq -r ".[$i].selected_image" "$SCENES_JSON")
  
  if [ ! -f "$IMAGE" ]; then
    echo "Error: Image not found: $IMAGE"
    exit 1
  fi

  # Get this scene's duration from the SRT (block index = i+1)
  # Parse start/end timestamps for this block
  BLOCK_NUM=$((i + 1))
  
  # Extract timestamps from the SRT file for this block
  # SRT format: index \n start --> end \n text \n\n
  TIMESTAMPS=$(awk -v block="$BLOCK_NUM" '
    /^[0-9]+$/ { idx=$1 }
    idx == block && /-->/ {
      split($1, s, /[:,]/);
      split($3, e, /[:,]/);
      start = s[1]*3600 + s[2]*60 + s[3] + s[4]/1000;
      end = e[1]*3600 + e[2]*60 + e[3] + e[4]/1000;
      printf "%.3f %.3f", start, end;
      exit;
    }
  ' "$SRT")

  START=$(echo "$TIMESTAMPS" | awk '{print $1}')
  END=$(echo "$TIMESTAMPS" | awk '{print $2}')
  DURATION=$(echo "$END - $START" | bc -l)

  INPUTS+=" -loop 1 -t $DURATION -i $IMAGE"
  
  # Scale each image to 1920x1080 with padding to maintain aspect ratio
  FILTER+="[$i:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=30[v$i];"
  CONCAT+="[v$i]"
done

# Add audio input
AUDIO_IDX=$SCENE_COUNT

# Concat all video segments
FILTER+="${CONCAT}concat=n=${SCENE_COUNT}:v=1:a=0[video]"

echo ""
echo "Assembling video..."

# Step 2: Run FFmpeg
# - Concat image segments into video
# - Add audio track
# - Burn in subtitles
"$FFMPEG" -y \
  $INPUTS \
  -i "$AUDIO" \
  -filter_complex "$FILTER" \
  -map "[video]" \
  -map "${AUDIO_IDX}:a" \
  -vf "subtitles=$SRT:force_style='FontName=Arial,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,Alignment=2,MarginV=40'" \
  -c:v libx264 -preset medium -crf 23 \
  -c:a aac -b:a 192k \
  -shortest \
  "$OUTPUT"

echo ""
echo "✓ Done!"
echo "  Output: $OUTPUT"
FINAL_DUR=$("$FFPROBE" -v error -show_entries format=duration -of csv=p=0 "$OUTPUT")
echo "  Duration: ${FINAL_DUR}s"
echo "  Scenes: $SCENE_COUNT"
