import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import ffmpegStatic from 'ffmpeg-static';
import { assembleVideo } from '../../../scripts/assemble-video-node.mjs';

export async function POST(req: Request) {
  try {
    const { scenes, srtBlocks, audioUrl, resolution = "1080p", captionStyle } = await req.json();

    // Create unique project dir
    const id = Date.now().toString();
    const publicOutput = path.join(process.cwd(), 'public', 'output');
    const projectDir = path.join(publicOutput, id);

    if (!fs.existsSync(publicOutput)) {
      fs.mkdirSync(publicOutput, { recursive: true });
    }
    fs.mkdirSync(projectDir, { recursive: true });

    // 1. Download images and update scenes
    const localScenes = [];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      let localImagePath = "";
      if (scene.selected_image) {
        if (scene.selected_image.startsWith('http')) {
          const ext = scene.selected_image.includes('.png') ? '.png' : '.jpg';
          localImagePath = path.join(projectDir, `image_${i}${ext}`);
          const res = await fetch(scene.selected_image);
          if (!res.ok) throw new Error(`Failed to fetch image: ${scene.selected_image}`);
          const buffer = await res.arrayBuffer();
          fs.writeFileSync(localImagePath, new Uint8Array(buffer));
        } else {
          // If it's already a local path relative to public
          localImagePath = path.join(process.cwd(), 'public', scene.selected_image);
        }
      }
      localScenes.push({
        ...scene,
        selected_image: localImagePath
      });
    }

    // Write scenes.json
    fs.writeFileSync(path.join(projectDir, 'scenes.json'), JSON.stringify(localScenes, null, 2));

    // 2. Format SRT and save
    const srtContent = srtBlocks.map((b: any) => `${b.index}\n${b.start} --> ${b.end}\n${b.text}`).join('\n\n') + '\n';
    fs.writeFileSync(path.join(projectDir, 'captions.srt'), srtContent);

    // 3. Handle audioUrl
    const localAudioPath = path.join(projectDir, 'voiceover.mp3');
    if (audioUrl) {
      if (audioUrl.startsWith('http')) {
        const res = await fetch(audioUrl);
        const buffer = await res.arrayBuffer();
        fs.writeFileSync(localAudioPath, new Uint8Array(buffer));
      } else {
        // Assume it's a relative path in public/
        const cleanAudioUrl = audioUrl.split('?')[0];
        const srcAudio = path.join(process.cwd(), 'public', cleanAudioUrl.replace(/^\//, ''));
        if (fs.existsSync(srcAudio)) {
          fs.copyFileSync(srcAudio, localAudioPath);
        } else {
          // Fallback to the default voiceover.mp3
          fs.copyFileSync(path.join(process.cwd(), 'public', 'voiceover.mp3'), localAudioPath);
        }
      }
    } else {
      // Fallback to default
      fs.copyFileSync(path.join(process.cwd(), 'public', 'voiceover.mp3'), localAudioPath);
    }

    // 4. Run assembly (pure Node now — works on macOS, Windows, and Linux)
    if (!ffmpegStatic) {
      throw new Error('ffmpeg-static did not resolve a binary for this platform');
    }
    assembleVideo(projectDir, ffmpegStatic, resolution, 60, captionStyle);

    // Return relative URL for frontend
    const finalVideoUrl = `/output/${id}/final_video.mp4`;
    return NextResponse.json({ videoUrl: finalVideoUrl });

  } catch (error: any) {
    console.error("Assembly error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}