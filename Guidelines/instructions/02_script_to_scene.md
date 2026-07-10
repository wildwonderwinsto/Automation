---
name: script-to-scene
description: Splits an approved video script into a scene-by-scene breakdown. Use this immediately after a script has been reviewed and approved, as the second step in the script → scenes → voice-over → captions → final video pipeline.
---

# Script → Scenes

## Purpose

Take an approved script and break it into scenes. This scene list is
what later steps depend on, such as
matching each scene to its exact timestamp in the voice-over by searching
for the scene's script text inside the `.srt` captions.

## Input

The full approved script, as plain text.

## Process

1. Read the whole script first before splitting anything, so scene boundaries
   respect the overall narrative flow rather than being chosen sentence-by-sentence
   in isolation.
2. Split the script into scenes (rules below).
3. For each scene, copy the matching chunk of script text **verbatim** into
   `script_text`.
4. For each scene, write a `simple_description` of what is happening visually.
5. Output the result as a single JSON array — nothing else.

## Critical rules

**script_text must be verbatim.** It has to be an exact, contiguous substring
of the input script — same words, same punctuation, same capitalization. Do
not paraphrase, summarize, or clean up typos. This field only exists so a
later step can locate it inside the timestamped `.srt` file via string search;
if it doesn't match exactly, that step breaks.

**No gaps, no overlaps.** Concatenating every scene's `script_text` in order
must reconstruct the full input script exactly. Every word belongs to exactly
one scene.

**Scene length.** Aim for extremely short, punchy scenes — strictly 2 to 3 words per scene. Do not exceed 4 words in a single scene. This ensures fast-paced visuals and allows the downstream caption generator to display only a couple of words on screen at a time.

**simple_description must be extremely brief and literal.** It should state exactly what the subject is doing in plain terms without any artistic style, complex background details, or abstract concepts (e.g., "character using a megaphone", "man walking next to two trees"). This ensures the scene can be easily mapped to an existing library of simple images.

**When something's genuinely ambiguous** (unclear who's speaking, a claim
that could be interpreted several very different ways), flag it in a `note`
field on that scene instead of guessing, so it surfaces during review.

## Output format

Return only this JSON array — no preamble, no commentary:

```json
[
  {
    "scene_id": 1,
    "script_text": "Most people think discipline is about willpower.",
    "simple_description": "character standing with arms crossed"
  },
  {
    "scene_id": 2,
    "script_text": "It's actually about designing your environment so you don't need any.",
    "simple_description": "character arranging his desk",
    "note": "Optional — only include this field when something needs human review."
  }
]
```

## Sanity check before finishing

Count the scenes against the script's rough narration length (words ÷ ~2.5
words/sec ÷ 3 sec per scene gives a ballpark scene count). If your output is
wildly off from that estimate, re-check for scenes that are too short (single
words split off) or too long (multiple sentences merged).

## Where this fits in the pipeline

This scene list feeds a later step that
searches the `.srt` text for each scene's `script_text` to get its start/end
timestamp and pairs that timestamp with the scene.