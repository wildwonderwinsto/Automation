import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export async function POST(req: Request) {
  let projectDir = '';
  try {
    const { scenes, audioUrl } = await req.json();

    if (!scenes || scenes.length === 0) {
      return NextResponse.json({ error: "No scenes provided" }, { status: 400 });
    }

    // Create a temporary working directory
    const id = `temp_${Date.now()}`;
    const publicOutput = path.join(process.cwd(), 'public', 'output');
    projectDir = path.join(publicOutput, id);

    if (!fs.existsSync(publicOutput)) {
      fs.mkdirSync(publicOutput, { recursive: true });
    }
    fs.mkdirSync(projectDir, { recursive: true });

    // Write scenes.json
    fs.writeFileSync(path.join(projectDir, 'scenes.json'), JSON.stringify(scenes, null, 2));

    // Resolve audio file
    const localAudioPath = path.join(projectDir, 'voiceover.mp3');
    if (audioUrl) {
      if (audioUrl.startsWith('http')) {
        const res = await fetch(audioUrl);
        const buffer = await res.arrayBuffer();
        fs.writeFileSync(localAudioPath, new Uint8Array(buffer));
      } else {
        const cleanAudioUrl = audioUrl.split('?')[0];
        const srcAudio = path.join(process.cwd(), 'public', cleanAudioUrl.replace(/^\//, ''));
        if (fs.existsSync(srcAudio)) {
          fs.copyFileSync(srcAudio, localAudioPath);
        } else {
          fs.copyFileSync(path.join(process.cwd(), 'public', 'voiceover.mp3'), localAudioPath);
        }
      }
    } else {
      fs.copyFileSync(path.join(process.cwd(), 'public', 'voiceover.mp3'), localAudioPath);
    }

    // Run the caption generation script
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate-captions.mjs');
    execSync(`node "${scriptPath}" "${projectDir}"`, { stdio: 'inherit' });

    // Read and parse the output SRT
    const srtPath = path.join(projectDir, 'captions.srt');
    if (!fs.existsSync(srtPath)) {
      throw new Error("SRT file was not generated.");
    }

    const rawSrt = fs.readFileSync(srtPath, 'utf-8');
    
    // Parse into srtBlocks
    const blocks = [];
    const chunks = rawSrt.trim().split('\n\n');
    for (const chunk of chunks) {
      const lines = chunk.split('\n');
      if (lines.length >= 3) {
        const index = parseInt(lines[0], 10);
        const [start, end] = lines[1].split(' --> ');
        const text = lines.slice(2).join(' ');
        blocks.push({ index, start, end, text });
      }
    }

    return NextResponse.json({ srtBlocks: blocks });

  } catch (error: any) {
    console.error("Caption generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    // Cleanup temp directory
    if (projectDir && fs.existsSync(projectDir)) {
      try {
        fs.rmSync(projectDir, { recursive: true, force: true });
      } catch (e) {
        console.error("Failed to cleanup temp dir:", e);
      }
    }
  }
}
