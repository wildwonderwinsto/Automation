#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import ffmpegStatic from 'ffmpeg-static';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_DIR = process.argv[2] || '.';
const WORDS_PER_CAPTION = process.argv[3] || 'max'; // 'max' or a number like '1', '2', '3', etc.

const SCENES_FILE = path.join(PROJECT_DIR, 'scenes.json');
const AUDIO_FILE = path.join(PROJECT_DIR, 'voiceover.mp3');
const WAV_FILE = path.join(PROJECT_DIR, 'voiceover.wav');
const SRT_FILE = path.join(PROJECT_DIR, 'voiceover.wav.srt');
const OUTPUT_SRT = path.join(PROJECT_DIR, 'captions.srt');
const WORD_TIMINGS_FILE = path.join(PROJECT_DIR, 'word_timings.json');
const SCENE_TIMINGS_FILE = path.join(PROJECT_DIR, 'scene_timings.json');

const WHISPER_BIN = path.join(__dirname, '..', 'bin', 'whisper.cpp', 'main');
const WHISPER_MODEL = path.join(__dirname, '..', 'bin', 'whisper.cpp', 'models', 'ggml-base.en.bin');

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

/**
 * Clean up a word from Whisper output.
 * Removes brackets, extra spaces, leading/trailing punctuation artifacts.
 * This is a common issue with whisper.cpp -sow output.
 */
function cleanWord(word) {
  return word
    .replace(/^\[.*?\]\s*/, '')    // Remove [BLANK_AUDIO] etc.
    .replace(/\s*\[.*?\]$/, '')    // Remove trailing brackets
    .replace(/^\s+|\s+$/g, '')     // Trim whitespace
    .replace(/^[^\w'"¿¡]+/, '')    // Remove leading non-word chars (except quotes)
    .replace(/[^\w.,!?;:'"…\-¿¡]+$/, ''); // Remove trailing non-word chars (except punctuation)
}

/**
 * Determines if a word is a short function word that should stay attached
 * to the next content word (Premiere Pro / CapCut style grouping).
 * These are never shown alone as a caption.
 */
function isFunctionWord(word) {
  const functionWords = new Set([
    'a', 'an', 'the', 'is', 'am', 'are', 'was', 'were', 'be', 'been',
    'to', 'of', 'in', 'on', 'at', 'by', 'for', 'or', 'and', 'but',
    'if', 'so', 'no', 'do', 'it', 'he', 'we', 'my', 'me', 'us',
    'i', 'as', 'up', 'its'
  ]);
  return functionWords.has(word.toLowerCase());
}

try {
  console.log("── Generate Captions ──");
  console.log(`   Words per caption: ${WORDS_PER_CAPTION}`);
  
  // 1. Convert MP3 to 16kHz WAV
  console.log("1. Converting audio to 16kHz WAV...");
  execSync(`"${ffmpegStatic}" -y -i "${AUDIO_FILE}" -ar 16000 -ac 1 -c:a pcm_s16le "${WAV_FILE}"`, { stdio: 'pipe' });

  // 2. Run Whisper.cpp
  // -ml 1 -sow: max segment length 1 + split on word boundaries
  // This gives us word-level timestamps — the same core technique
  // Premiere Pro and CapCut use (speech-to-text → forced alignment).
  console.log("2. Transcribing with whisper.cpp (-ml 1 -sow for perfect word timings)...");
  execSync(`"${WHISPER_BIN}" -m "${WHISPER_MODEL}" -f "${WAV_FILE}" -osrt -ml 1 -sow`, { stdio: 'inherit' });

  // 3. Parse Whisper SRT to get exact word-level timestamps
  console.log("3. Parsing Whisper output for word timestamps...");
  
  const scenes = JSON.parse(readFileSync(SCENES_FILE, 'utf-8'));
  const rawSrt = readFileSync(SRT_FILE, 'utf-8');

  // Parse Whisper SRT blocks. Since we used -ml 1 -sow, each block is exactly one word.
  // Split by 2 or more newlines to avoid issues with extra blank lines
  const allWords = rawSrt.trim().split(/(?:\r?\n){2,}/).map(block => {
    const lines = block.trim().split(/\r?\n/);
    if (lines.length < 3) return null;
    const timeLine = lines[1];
    if (!timeLine.includes(' --> ')) return null;
    const [start, end] = timeLine.split(' --> ');
    let text = lines.slice(2).join(' ').trim();
    
    // Clean up Whisper artifacts
    text = cleanWord(text);
    if (!text) return null;
    
    return { word: text, start: parseTime(start), end: parseTime(end) };
  }).filter(Boolean);

  // 3b. Save word-level timings for the video assembler (used for karaoke/typewriter mode)
  // This is the key data that CapCut uses for word-by-word highlighting.
  writeFileSync(WORD_TIMINGS_FILE, JSON.stringify(allWords, null, 2));
  console.log(`   ✓ Wrote word_timings.json (${allWords.length} words)`);

  // 4. Build scene timings by consuming words per scene
  console.log("4. Building scene timings...");
  const sceneTimings = [];
  let wordIndex = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const sceneWords = scene.script_text.split(/\s+/).filter(w => w.length > 0);
    const consumedWords = allWords.slice(wordIndex, wordIndex + sceneWords.length);

    let startSec = 0;
    let endSec = 1;

    if (consumedWords.length > 0) {
      startSec = consumedWords[0].start;
      endSec = consumedWords[consumedWords.length - 1].end;
    } else if (i > 0 && allWords[wordIndex - 1]) {
      startSec = allWords[wordIndex - 1].end;
      endSec = allWords[wordIndex - 1].end + 1;
    }

    sceneTimings.push({
      sceneIndex: i,
      start: startSec,
      end: endSec,
    });

    wordIndex += sceneWords.length;
  }

  // Write scene_timings.json (used by the video assembler for image durations)
  writeFileSync(SCENE_TIMINGS_FILE, JSON.stringify(sceneTimings, null, 2));
  console.log(`   ✓ Wrote scene_timings.json (${sceneTimings.length} scenes)`);

  // 5. Build captions SRT based on wordsPerCaption setting
  console.log("5. Building captions SRT...");
  
  const wpc = WORDS_PER_CAPTION === 'max' ? Infinity : parseInt(WORDS_PER_CAPTION, 10);
  let finalSrt = '';
  let captionIndex = 1;

  if (wpc >= Infinity) {
    // "max" mode: one caption per scene (original behavior)
    wordIndex = 0;
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const sceneWords = scene.script_text.split(/\s+/).filter(w => w.length > 0);
      const consumedWords = allWords.slice(wordIndex, wordIndex + sceneWords.length);

      let startTimestamp = "00:00:00,000";
      let endTimestamp = "00:00:01,000";

      if (consumedWords.length > 0) {
        startTimestamp = formatTime(consumedWords[0].start);
        endTimestamp = formatTime(consumedWords[consumedWords.length - 1].end);
      }

      finalSrt += `${captionIndex}\n`;
      finalSrt += `${startTimestamp} --> ${endTimestamp}\n`;
      finalSrt += `${scene.script_text}\n\n`;
      captionIndex++;
      wordIndex += sceneWords.length;
    }
  } else {
    // Chunked mode: group every N words into a caption block.
    // Improved grouping logic inspired by Premiere Pro and CapCut:
    // - Don't leave a lone function word at the end of a group
    // - Keep short words attached to the next content word
    let i = 0;
    while (i < allWords.length) {
      let chunkEnd = Math.min(i + wpc, allWords.length);

      // Smart boundary: if the last word in the chunk is a function word
      // and there are more words, extend the chunk to include the next content word
      if (chunkEnd < allWords.length && chunkEnd > i) {
        const lastWord = allWords[chunkEnd - 1];
        if (isFunctionWord(lastWord.word) && chunkEnd < allWords.length) {
          chunkEnd = Math.min(chunkEnd + 1, allWords.length);
        }
      }

      const chunk = allWords.slice(i, chunkEnd);
      if (chunk.length === 0) break;

      const startTimestamp = formatTime(chunk[0].start);
      const endTimestamp = formatTime(chunk[chunk.length - 1].end);
      const text = chunk.map(w => w.word).join(' ');

      finalSrt += `${captionIndex}\n`;
      finalSrt += `${startTimestamp} --> ${endTimestamp}\n`;
      finalSrt += `${text}\n\n`;
      captionIndex++;
      i = chunkEnd;
    }
  }

  writeFileSync(OUTPUT_SRT, finalSrt.trim() + '\n');
  console.log(`✓ Done! Generated ${captionIndex - 1} caption blocks at ${OUTPUT_SRT}`);
  
} catch (e) {
  console.error("Error generating captions:", e.message);
  process.exit(1);
}
