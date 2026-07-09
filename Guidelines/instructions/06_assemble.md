---
name: assemble
description: Takes the selected images, the processed voice-over audio, and the timestamped .srt captions to assemble the final video file.
---

# Assemble → Final Video

## Purpose

Combine every output from the previous stages into a single video file ready for upload. Each scene's selected image is displayed for the exact duration specified by its corresponding `.srt` timestamp block, layered over the processed voice-over audio with burned-in captions.

## Tools

We use **FFmpeg** (via a Node or Python script) to stitch everything together programmatically.

## Input

- The selected image for each scene (from Stage 3).
- The processed voice-over audio file (from Stage 4).
- The `.srt` caption file with exact timestamps (from Stage 5).

## Process

1. **Map Images to Timestamps**: For each `.srt` block, look up the `scene_id` it corresponds to. Pull the `selected_image` for that scene.
2. **Build Image Sequence**: Using FFmpeg, create a video track where each image is displayed for the duration of its `.srt` timestamp range (start → end). Use a simple crossfade or hard cut between images.
3. **Add Audio Track**: Layer the processed voice-over audio file as the video's audio track.
4. **Burn In Captions**: Use the `.srt` file to render captions directly onto the video (FFmpeg subtitle filter).
5. **Export**: Output the final `.mp4` file.

## Output Format

```json
{
  "video_url": "path/to/final_video.mp4"
}
```

## Where this fits in the pipeline

This is the **final stage**. The output video is ready to be reviewed and uploaded to YouTube.
