---
name: captions
description: Generates an SRT caption file with exact timestamps from the processed voice-over audio, matching each caption line back to the corresponding scene.
---

# Voice-over → Captions (.srt)

## Purpose

Take the processed voice-over audio and generate a precisely-timed `.srt` subtitle file. Each caption block must align with the spoken words so that the final video can display text at exactly the right moment.

## Tools

We use an AI speech-to-text transcription service (e.g., OpenAI Whisper, AssemblyAI) that returns word-level timestamps. We then group words into caption lines that match the original scene boundaries.

## Input

- The processed voice-over audio file (from Stage 4).
- The scene breakdown JSON (from Stage 2), specifically each scene's `script_text`.

## Process

1. **Transcribe with Timestamps**: Run the audio file through a speech-to-text model that returns word-level timestamps.
2. **Align to Scenes**: Use string matching to map each scene's `script_text` to its corresponding timestamp range in the transcription. Because `script_text` is verbatim from the original script, this is a direct substring search.
3. **Generate SRT Blocks**: For each scene, create an `.srt` entry with:
   - A sequential index number.
   - The start and end timestamps (in `HH:MM:SS,mmm` format).
   - The caption text (the `script_text`).
4. **Output the `.srt` File**: Write the complete `.srt` file.

## Output Format

A standard `.srt` file:

```srt
1
00:00:00,000 --> 00:00:02,450
Most people think it comes down to willpower.

2
00:00:02,500 --> 00:00:03,200
It doesn't.

3
00:00:03,300 --> 00:00:07,100
It's actually about designing your environment so you don't need any.
```

## Where this fits in the pipeline

The `.srt` file provides the exact timestamp ranges needed for the next and final stage (Assemble), where each scene's selected image is displayed for the duration of its corresponding caption block.
