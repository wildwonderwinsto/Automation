import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import ffmpegStatic from 'ffmpeg-static';

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

    const mp3File = path.join(publicDir, 'voiceover.mp3');
    const rootMp3File = path.join(process.cwd(), 'voiceover.mp3');
    const txtFile = path.join(publicDir, 'voiceover_script.txt');

    // Strip any markdown formatting the AI might have left in
    let cleanScript = script
      .replace(/^#{1,6}\s+/gm, '')       // Remove markdown headers
      .replace(/^---+$/gm, '')            // Remove horizontal rules
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold
      .replace(/\*([^*]+)\*/g, '$1')      // Remove italic
      .replace(/^[-*]\s+/gm, '')          // Remove bullet points
      .replace(/\n{3,}/g, '\n\n')         // Collapse excessive newlines
      .trim();

    fs.writeFileSync(txtFile, cleanScript, 'utf-8');

    if (!ffmpegStatic) {
      throw new Error('ffmpeg-static did not resolve a binary for this platform');
    }

    if (process.platform === 'darwin') {
      // macOS — native `say` command (Daniel is a high-quality British male voice)
      const aiffFile = path.join(publicDir, 'voiceover.aiff');
      execSync(`say -o "${aiffFile}" -v Daniel -f "${txtFile}"`);
      execSync(`"${ffmpegStatic}" -y -i "${aiffFile}" -b:a 192k "${mp3File}"`);
      fs.unlinkSync(aiffFile);
    } else if (process.platform === 'win32') {
      // Windows — no `say` equivalent exists. Use the built-in SAPI speech
      // synthesizer via PowerShell (ships with every Windows install, no
      // extra dependency needed). Voice quality is more robotic than macOS
      // `say` — swap in a real TTS API later if quality matters.
      const wavFile = path.join(publicDir, 'voiceover.wav');
      const ps1File = path.join(publicDir, 'voiceover_tts.ps1');

      const escapedWav = wavFile.replace(/\\/g, '\\\\');
      const escapedTxt = txtFile.replace(/\\/g, '\\\\');

      const psScript = [
        'Add-Type -AssemblyName System.Speech',
        '$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer',
        `$synth.SetOutputToWaveFile("${escapedWav}")`,
        `$text = [System.IO.File]::ReadAllText("${escapedTxt}")`,
        '$synth.Speak($text)',
        '$synth.Dispose()',
      ].join('\n');

      fs.writeFileSync(ps1File, psScript, 'utf-8');
      execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${ps1File}"`);
      execSync(`"${ffmpegStatic}" -y -i "${wavFile}" -b:a 192k "${mp3File}"`);
      fs.unlinkSync(wavFile);
      fs.unlinkSync(ps1File);
    } else {
      return NextResponse.json(
        { error: `No TTS method configured for platform: ${process.platform}` },
        { status: 400 }
      );
    }

    // Copy to root directory so the bash/node scripts (which assume '.' is the project dir) can find it
    fs.copyFileSync(mp3File, rootMp3File);
    fs.unlinkSync(txtFile);

    return NextResponse.json({ audioUrl: '/voiceover.mp3' });
  } catch (error: any) {
    console.error("Voiceover generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}