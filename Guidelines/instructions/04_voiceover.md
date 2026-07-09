---
name: voice-over
description: Generates the voice-over audio from the approved script and automatically trims dead air/silences to maintain a fast pace.
---

# Script → Voice-over

## Purpose

To turn the finalized script into a high-quality audio file for the video, and to remove unnecessary pauses so the viewer's attention is retained.

## Tools

We use a Text-to-Speech (TTS) AI API (e.g., ElevenLabs) to generate the raw audio. We then use a processing script (e.g., Python `pydub` or ffmpeg) to detect and remove silences.

## Input

- The finalized, approved script text from Stage 1.

## Process

1. **Generate Raw Audio**: Feed the entire script text into the TTS engine to generate a raw `.mp3` or `.wav` file.
2. **Remove Silences**: Pass the raw audio through a silence-removal script.
   - Detect periods of audio where the volume drops below a specific threshold (e.g., -40dB) for more than 300ms.
   - Slice out these silent periods to tighten the pacing.
3. **Export Processed Audio**: Save the final trimmed audio file to be used in the final video assembly.

## Output Format

Return a link or file path to the final, processed audio file.

```json
{
  "audio_url": "path/to/final_voiceover.mp3"
}
```

## Where this fits in the pipeline

The generated audio file is directly required for the next stage (Captions), where we will generate timestamped `.srt` files based on the spoken audio, matching it back to the scene text.
