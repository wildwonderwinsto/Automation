---
name: image-generator
description: Generates Microsoft Paint-style illustrations for each scene using Google Whisk. This step takes the simple descriptions from the scene breakdown and produces 2 image variations per scene.
---

# Scene → Images

## Purpose

Take the scene breakdown (specifically the `simple_description` of each scene) and generate 2 simple, static Microsoft Paint-style images for each scene. This allows the creator to pick the best image variation before moving on to voice-over and assembly.

## Tool 

We use **Google Whisk** (or an automated Chrome extension connected to it) to generate the images. Whisk allows uploading a style reference image to ensure absolute consistency.

## Input

- The JSON array of scenes from the previous step (which includes `scene_id` and `simple_description`).
- A reference image drawn in MS Paint containing the exact character and style.

## Process

1. **Setup Whisk**: Upload your master MS Paint style reference image and subject image into Google Whisk.
2. **Generate Images**: For each scene in your breakdown, feed the `simple_description` (e.g., "character using a megaphone", "character standing next to two trees") directly into the prompt box.
3. **Generate Variations**: Produce exactly **2 image variations** for every scene prompt.
4. **Accept Imperfections**: The generated images might have slight anti-aliasing (blurry edges instead of sharp pixels). **Ignore this.** 98% of people will not notice. Do not waste time trying to fix it in Photoshop.
5. **Output**: Save the images linked to their `scene_id` for the review step.

## Output Format

Return a JSON array that pairs the original scene data with the generated image paths/links.

```json
[
  {
    "scene_id": 1,
    "simple_description": "character standing with arms crossed",
    "images": [
      "path/to/scene_1_v1.png",
      "path/to/scene_1_v2.png"
    ]
  },
  {
    "scene_id": 2,
    "simple_description": "character arranging his desk",
    "images": [
      "path/to/scene_2_v1.png",
      "path/to/scene_2_v2.png"
    ]
  }
]
```

## Where this fits in the pipeline

This step feeds directly into the "Choose the best image" stage. Once the best image is selected for each scene, the pipeline moves on to voice-over generation and final assembly.
