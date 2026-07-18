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

const WHISPER_BIN = path.join(__dirname, '..', 'bin', 'whisper.cpp', process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli');
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
 * Normalizes a word for comparison purposes only (matching), never for display.
 * Lowercases and strips punctuation so "Word." and "word" are treated as equal.
 */
function normalizeForMatch(word) {
  return word.toLowerCase().replace(/[^\w']/g, '');
}

/**
 * Small Levenshtein distance for short strings — used to tolerate minor
 * ASR mishears (e.g. "for"/"four") without treating them as a full mismatch.
 */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Aligns the KNOWN script words against Whisper's raw (and sometimes wrong)
 * transcript, using a Needleman-Wunsch style edit-distance alignment instead
 * of assuming the two word lists line up position-for-position.
 *
 * This is the core fix for voice-changes / mis-transcriptions: rather than
 * assuming "script word N === whisper word N" (which breaks permanently the
 * moment Whisper splits, drops, or mishears a single word), we find the best
 * global alignment between the two sequences. Script words that Whisper
 * skipped or mangled are left unmatched here and get their timestamps filled
 * in afterward by interpolation (see `fillTimingGaps`).
 *
 * Returns an array the same length as scriptWords, each entry either
 * { start, end } (Whisper matched it) or null (needs interpolation).
 */
function alignScriptToAsr(scriptWords, asrWords) {
  const n = scriptWords.length;
  const m = asrWords.length;
  const norm = (w) => normalizeForMatch(w);
  const scriptNorm = scriptWords.map(norm);
  const asrNorm = asrWords.map((w) => norm(w.word));

  const GAP_COST = 0.9; // cost of skipping a word on either side

  function subCost(a, b) {
    if (a === b) return 0;
    if (a.length === 0 || b.length === 0) return 1;
    const dist = levenshtein(a, b);
    const ratio = dist / Math.max(a.length, b.length);
    return ratio <= 0.34 ? 0.4 : 1; // tolerate a 1-2 char mishear
  }

  // dp[i][j] = min cost aligning first i script words with first j asr words
  const dp = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  for (let i = 1; i <= n; i++) dp[i][0] = i * GAP_COST;
  for (let j = 1; j <= m; j++) dp[0][j] = j * GAP_COST;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const matchCost = dp[i - 1][j - 1] + subCost(scriptNorm[i - 1], asrNorm[j - 1]);
      const skipScript = dp[i - 1][j] + GAP_COST; // script word unmatched (ASR missed it)
      const skipAsr = dp[i][j - 1] + GAP_COST;    // asr word unmatched (extra/hallucinated)
      dp[i][j] = Math.min(matchCost, skipScript, skipAsr);
    }
  }

  // Backtrack to recover the alignment
  const result = new Array(n).fill(null);
  let i = n, j = m;
  while (i > 0 && j > 0) {
    const matchCost = dp[i - 1][j - 1] + subCost(scriptNorm[i - 1], asrNorm[j - 1]);
    if (dp[i][j] === matchCost) {
      result[i - 1] = { start: asrWords[j - 1].start, end: asrWords[j - 1].end };
      i--; j--;
    } else if (dp[i][j] === dp[i - 1][j] + GAP_COST) {
      i--; // this script word has no ASR match — filled in later
    } else {
      j--; // extra ASR word, ignore
    }
  }

  return result;
}

/**
 * Fills in timestamps for script words Whisper didn't match, by evenly
 * interpolating across the nearest matched neighbors on either side.
 * Mutates and returns `aligned` with every entry now {start, end}.
 */
function fillTimingGaps(aligned) {
  const n = aligned.length;
  let gapStart = -1;
  for (let i = 0; i <= n; i++) {
    const hasMatch = i < n && aligned[i] !== null;
    if (!hasMatch) {
      if (gapStart === -1) gapStart = i;
      continue;
    }
    if (gapStart !== -1) {
      const prevEnd = gapStart > 0 ? aligned[gapStart - 1].end : aligned[i] ? aligned[i].start - (i - gapStart) * 0.3 : 0;
      const nextStart = aligned[i].start;
      const gapLen = i - gapStart;
      const span = Math.max(nextStart - prevEnd, 0.05 * gapLen);
      for (let k = 0; k < gapLen; k++) {
        const t0 = prevEnd + (span * k) / gapLen;
        const t1 = prevEnd + (span * (k + 1)) / gapLen;
        aligned[gapStart + k] = { start: t0, end: t1 };
      }
      gapStart = -1;
    }
  }
  // Trailing gap with no right-hand anchor (Whisper missed the very last word(s))
  if (gapStart !== -1) {
    const prevEnd = gapStart > 0 ? aligned[gapStart - 1].end : 0;
    for (let k = gapStart; k < n; k++) {
      aligned[k] = { start: prevEnd + (k - gapStart) * 0.3, end: prevEnd + (k - gapStart + 1) * 0.3 };
    }
  }
  return aligned;
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

  // 3b. Build the known script word list (with scene attribution) and align
  // it against Whisper's transcript. This replaces position-based slicing —
  // it survives Whisper dropping, mishearing, or splitting words differently,
  // which is exactly what changes when you swap TTS voices.
  console.log("3b. Aligning script words to ASR transcript...");
  const scriptWordEntries = [];
  scenes.forEach((scene, sceneIndex) => {
    const words = scene.script_text.split(/\s+/).filter((w) => w.length > 0);
    words.forEach((text) => scriptWordEntries.push({ text, sceneIndex }));
  });

  const aligned = fillTimingGaps(
    alignScriptToAsr(scriptWordEntries.map((w) => w.text), allWords)
  );
  const scriptWordTimings = scriptWordEntries.map((w, idx) => ({
    word: w.text,
    sceneIndex: w.sceneIndex,
    start: aligned[idx].start,
    end: aligned[idx].end,
  }));

  // 3c. Save word-level timings for the video assembler (used for karaoke/typewriter mode).
  // These are your clean script words with aligned timestamps — not Whisper's raw transcript —
  // so on-screen text is always correctly spelled/punctuated regardless of ASR mistakes.
  writeFileSync(
    WORD_TIMINGS_FILE,
    JSON.stringify(scriptWordTimings.map(({ word, start, end }) => ({ word, start, end })), null, 2)
  );
  console.log(`   ✓ Wrote word_timings.json (${scriptWordTimings.length} words)`);

  // 4. Build scene timings from the aligned script words (grouped by scene)
  console.log("4. Building scene timings...");
  const sceneTimings = scenes.map((_, i) => {
    const wordsInScene = scriptWordTimings.filter((w) => w.sceneIndex === i);
    if (wordsInScene.length === 0) return { sceneIndex: i, start: 0, end: 1 };
    return {
      sceneIndex: i,
      start: wordsInScene[0].start,
      end: wordsInScene[wordsInScene.length - 1].end,
    };
  });

  // Write scene_timings.json (used by the video assembler for image durations)
  writeFileSync(SCENE_TIMINGS_FILE, JSON.stringify(sceneTimings, null, 2));
  console.log(`   ✓ Wrote scene_timings.json (${sceneTimings.length} scenes)`);

  // 5. Build captions SRT based on wordsPerCaption setting.
  // Both modes now read from scriptWordTimings — the caption text is always
  // your clean script, only the grouping (how many words per block) changes.
  console.log("5. Building captions SRT...");

  const wpc = WORDS_PER_CAPTION === 'max' ? Infinity : parseInt(WORDS_PER_CAPTION, 10);
  let finalSrt = '';
  let captionIndex = 1;

  if (wpc >= Infinity) {
    // "max" mode: one caption per scene
    for (let i = 0; i < scenes.length; i++) {
      const timing = sceneTimings[i];
      finalSrt += `${captionIndex}\n`;
      finalSrt += `${formatTime(timing.start)} --> ${formatTime(timing.end)}\n`;
      finalSrt += `${scenes[i].script_text.replace(/\s+/g, ' ')}\n\n`;
      captionIndex++;
    }
  } else {
    // Chunked mode: group every N words into a caption block.
    // Improved grouping logic inspired by Premiere Pro and CapCut:
    // - Don't leave a lone function word at the end of a group
    // - Keep short words attached to the next content word
    let i = 0;
    while (i < scriptWordTimings.length) {
      let chunkEnd = Math.min(i + wpc, scriptWordTimings.length);

      // Smart boundary: if the last word in the chunk is a function word
      // and there are more words, extend the chunk to include the next content word
      if (chunkEnd < scriptWordTimings.length && chunkEnd > i) {
        const lastWord = scriptWordTimings[chunkEnd - 1];
        if (isFunctionWord(lastWord.word) && chunkEnd < scriptWordTimings.length) {
          chunkEnd = Math.min(chunkEnd + 1, scriptWordTimings.length);
        }
      }

      const chunk = scriptWordTimings.slice(i, chunkEnd);
      if (chunk.length === 0) break;

      const startTimestamp = formatTime(chunk[0].start);
      const endTimestamp = formatTime(chunk[chunk.length - 1].end);
      const text = chunk.map((w) => w.word).join(' ');

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
