#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import ffmpegStatic from 'ffmpeg-static';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_DIR = process.argv[2] || '.';

const SCENES_FILE = path.join(PROJECT_DIR, 'scenes.json');
const AUDIO_FILE = path.join(PROJECT_DIR, 'voiceover.mp3');
const WAV_FILE = path.join(PROJECT_DIR, 'voiceover.wav');
const SRT_FILE = path.join(PROJECT_DIR, 'voiceover.wav.srt');
const OUTPUT_SRT = path.join(PROJECT_DIR, 'captions.srt');

const WHISPER_BIN = path.join(__dirname, '..', 'bin', 'whisper.cpp', 'main');
const WHISPER_MODEL = path.join(__dirname, '..', 'bin', 'whisper.cpp', 'models', 'ggml-base.en.bin');

try {
  console.log("── Generate Captions ──");
  
  // 1. Convert MP3 to 16kHz WAV
  console.log("1. Converting audio to 16kHz WAV...");
  execSync(`"${ffmpegStatic}" -y -i "${AUDIO_FILE}" -ar 16000 -ac 1 -c:a pcm_s16le "${WAV_FILE}"`, { stdio: 'pipe' });

  // 2. Run Whisper.cpp
  console.log("2. Transcribing with whisper.cpp...");
  execSync(`"${WHISPER_BIN}" -m "${WHISPER_MODEL}" -f "${WAV_FILE}" -osrt`, { stdio: 'inherit' });

  // 3. Align with scenes
  console.log("3. Aligning timestamps to scenes...");
  
  const scenes = JSON.parse(readFileSync(SCENES_FILE, 'utf-8'));
  const rawSrt = readFileSync(SRT_FILE, 'utf-8');

  // Parse Whisper SRT blocks
  const blocks = rawSrt.trim().split('\n\n').map(block => {
    const lines = block.split('\n');
    const [start, end] = lines[1].split(' --> ');
    const text = lines.slice(2).join(' ');
    return { start, end, text };
  });

  // Interpolate word-level timestamps within each block
  const allWords = [];
  
  function parseTime(timeStr) {
    const [hms, ms] = timeStr.split(',');
    const [h, m, s] = hms.split(':');
    return parseInt(h)*3600 + parseInt(m)*60 + parseInt(s) + parseInt(ms)/1000;
  }
  
  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  for (const block of blocks) {
    if (!block.start || !block.end) continue;
    const words = block.text.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) continue;

    const blockStart = parseTime(block.start);
    const blockEnd = parseTime(block.end);
    const duration = blockEnd - blockStart;
    const timePerWord = duration / words.length;

    words.forEach((w, i) => {
      allWords.push({
        word: w,
        start: blockStart + (i * timePerWord),
        end: blockStart + ((i + 1) * timePerWord)
      });
    });
  }

  let finalSrt = '';
  let wordIndex = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const sceneWords = scene.script_text.split(/\s+/).filter(w => w.length > 0);
    
    // Consume sceneWords.length words
    const consumedWords = allWords.slice(wordIndex, wordIndex + sceneWords.length);
    
    let startTimestamp = "00:00:00,000";
    let endTimestamp = "00:00:01,000";

    if (consumedWords.length > 0) {
      startTimestamp = formatTime(consumedWords[0].start);
      endTimestamp = formatTime(consumedWords[consumedWords.length - 1].end);
    } else if (i > 0 && allWords[wordIndex - 1]) {
      startTimestamp = formatTime(allWords[wordIndex - 1].end);
      endTimestamp = formatTime(allWords[wordIndex - 1].end + 1);
    }
    
    finalSrt += `${i + 1}\n`;
    finalSrt += `${startTimestamp} --> ${endTimestamp}\n`;
    finalSrt += `${scene.script_text}\n\n`;

    wordIndex += sceneWords.length;
  }

  writeFileSync(OUTPUT_SRT, finalSrt.trim() + '\n');
  console.log(`✓ Done! Generated exact scene-aligned captions at ${OUTPUT_SRT}`);
  
} catch (e) {
  console.error("Error generating captions:", e.message);
  process.exit(1);
}
