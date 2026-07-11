// Cross-platform replacement for assemble-video.sh.
// No bash, jq, awk, or bc required — pure Node + a direct ffmpeg call.

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

function parseTimeToSeconds(timeStr) {
  const [hms, ms] = timeStr.trim().split(',');
  const [h, m, s] = hms.split(':').map(Number);
  return h * 3600 + m * 60 + s + Number(ms) / 1000;
}

// Finds the start/end time for a given SRT block number (1-indexed),
// same job the old awk one-liner was doing.
function parseSrtBlockTimes(srtContent, blockNumber) {
  const blocks = srtContent.trim().split(/\r?\n\r?\n/);
  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    if (parseInt(lines[0], 10) === blockNumber) {
      const [startStr, endStr] = lines[1].split('-->');
      return {
        start: parseTimeToSeconds(startStr),
        end: parseTimeToSeconds(endStr),
      };
    }
  }
  return null;
}

/**
 * Assembles final_video.mp4 inside projectDir from scenes.json,
 * voiceover.mp3, and captions.srt.
 *
 * @param {string} projectDir
 * @param {string} ffmpegPath - resolved path to the ffmpeg binary (e.g. from ffmpeg-static)
 * @returns {string} path to the generated final_video.mp4
 */
export function assembleVideo(projectDir, ffmpegPath, resolution = "1080p", fps = 30, captionStyle = null) {
  const scenesJsonPath = path.join(projectDir, 'scenes.json');
  const audioPath = path.join(projectDir, 'voiceover.mp3');
  const srtPath = path.join(projectDir, 'captions.srt');
  const outputPath = path.join(projectDir, 'final_video.mp4');

  for (const f of [scenesJsonPath, audioPath, srtPath]) {
    if (!fs.existsSync(f)) {
      throw new Error(`Missing required file: ${f}`);
    }
  }

  const scenes = JSON.parse(fs.readFileSync(scenesJsonPath, 'utf-8'));
  const srtContent = fs.readFileSync(srtPath, 'utf-8');

  if (scenes.length === 0) {
    throw new Error('scenes.json has no scenes');
  }

  const inputArgs = [];
  const filterParts = [];
  const concatLabels = [];
  
  const is4K = resolution === "4k";
  const targetWidth = is4K ? 3840 : 1920;
  const targetHeight = is4K ? 2160 : 1080;

  // Map caption style to ASS force_style values
  const fontName = captionStyle?.fontFamily || 'Arial';
  
  const fontSizeMap = {
    small: is4K ? 32 : 16,
    medium: is4K ? 44 : 22,
    large: is4K ? 60 : 30,
  };
  const fontSize = fontSizeMap[captionStyle?.fontSize] || fontSizeMap.medium;

  // ASS Alignment values:
  // 8 = top-center, 5 = middle-center, 2 = bottom-center
  const alignmentMap = { top: 8, center: 5, bottom: 2 };
  const alignment = alignmentMap[captionStyle?.position] || 2;

  // MarginV adjusts distance from edge
  const marginVMap = {
    top: 40,
    center: 10,
    bottom: 40,
  };
  const marginV = marginVMap[captionStyle?.position] || 40;

  scenes.forEach((scene, i) => {
    const imagePath = scene.selected_image;
    if (!imagePath || !fs.existsSync(imagePath)) {
      throw new Error(`Image not found for scene ${i + 1}: ${imagePath}`);
    }

    const times = parseSrtBlockTimes(srtContent, i + 1);
    if (!times) {
      throw new Error(`No caption timing found for scene ${i + 1} (block ${i + 1} in captions.srt)`);
    }
    const duration = Math.max(0.1, times.end - times.start);

    inputArgs.push('-loop', '1', '-t', String(duration), '-i', imagePath);
    filterParts.push(
      `[${i}:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=${fps}[v${i}]`
    );
    concatLabels.push(`[v${i}]`);
  });

  const audioIndex = scenes.length;

  // ffmpeg's subtitles filter treats ':' as an option separator, which breaks
  // on Windows paths like C:\Users\... — escape the drive-letter colon and
  // flip backslashes to forward slashes to keep it working cross-platform.
  const safeSrtPath = srtPath.replace(/\\/g, '/').replace(/:/g, '\\\\:');

  // Build the full filter_complex graph:
  // 1. Scale/pad each image → [v0], [v1], ...
  // 2. Concat all segments  → [raw]
  // 3. Burn in subtitles    → [video]
  // Using a single -filter_complex avoids the illegal -vf + -filter_complex combo.
  const forceStyle = `FontName=${fontName},FontSize=${fontSize},PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,Alignment=${alignment},MarginV=${marginV}`;
  
  const filterComplex =
    filterParts.join(';') +
    `;${concatLabels.join('')}concat=n=${scenes.length}:v=1:a=0[raw]` +
    `;[raw]subtitles='${safeSrtPath}':force_style='${forceStyle}'[video]`;

  const args = [
    '-y',
    ...inputArgs,
    '-i', audioPath,
    '-filter_complex', filterComplex,
    '-map', '[video]',
    '-map', `${audioIndex}:a`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k',
    '-shortest',
    outputPath,
  ];

  execFileSync(ffmpegPath, args, { stdio: 'inherit' });

  return outputPath;
}