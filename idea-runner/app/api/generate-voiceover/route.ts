import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const FFMPEG = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');

export async function POST(req: Request) {
  try {
    const { script } = await req.json();
    
    if (!script) {
      return NextResponse.json({ error: "Script is required" }, { status: 400 });
    }

    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir);
    }

    const aiffFile = path.join(publicDir, 'voiceover.aiff');
    const mp3File = path.join(publicDir, 'voiceover.mp3');
    const rootMp3File = path.join(process.cwd(), 'voiceover.mp3');

    // Strip any markdown formatting the AI might have left in
    let cleanScript = script
      .replace(/^#{1,6}\s+/gm, '')       // Remove markdown headers
      .replace(/^---+$/gm, '')            // Remove horizontal rules
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold
      .replace(/\*([^*]+)\*/g, '$1')      // Remove italic
      .replace(/^[-*]\s+/gm, '')          // Remove bullet points
      .replace(/\n{3,}/g, '\n\n')         // Collapse excessive newlines
      .trim();

    // Use Mac's native TTS (Daniel is a high-quality British male voice)
    // Write script to a temp file to avoid shell escaping issues with quotes/special chars
    const txtFile = path.join(publicDir, 'voiceover_script.txt');
    fs.writeFileSync(txtFile, cleanScript);
    execSync(`say -o "${aiffFile}" -v Daniel -f "${txtFile}"`);

    // Convert AIFF to MP3 for web playback
    execSync(`"${FFMPEG}" -y -i "${aiffFile}" -b:a 192k "${mp3File}"`);
    
    // Copy to root directory so the bash scripts (which assume '.' is the project dir) can find it
    fs.copyFileSync(mp3File, rootMp3File);

    // Clean up temporary AIFF
    fs.unlinkSync(aiffFile);

    return NextResponse.json({ audioUrl: '/voiceover.mp3' });
  } catch (error: any) {
    console.error("Voiceover generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
