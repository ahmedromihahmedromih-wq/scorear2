import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

/**
 * ScoreAR AI Motion Studio & Sheet Processor
 * Converts any AI video/gif/frames (from Runway, Kling, AnimatedDrawings, Luma)
 * into standard 1280x400 transparent WebP 4-frame sprite sheets.
 */
export async function processVideoToSpriteSheet({
  videoPath,
  characterId,
  action = 'walk',
  frameCount = 4,
  removeBackground = 'chroma_auto',
  targetWidth = 1280,
  targetHeight = 400
}) {
  const charCode = 'char_' + String(characterId).replace(/^char_/, '').padStart(2, '0');
  const tempDir = path.join(root, 'tools', 'temp_frames_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  console.log(`\n🚀 [AI Motion Studio] Processing "${action}" for ${charCode}...`);
  console.log(`Input: ${videoPath}`);

  try {
    // 1. Extract frames using system FFmpeg
    const framePattern = path.join(tempDir, 'frame_%03d.png');
    // Determine duration and extract frameCount evenly spaced frames
    const probeCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
    let duration = 1.0;
    try {
      duration = parseFloat(execSync(probeCmd, { encoding: 'utf8' }).trim()) || 1.0;
    } catch (e) {
      duration = 1.0;
    }

    const fps = (frameCount / duration).toFixed(3);
    const ffmpegCmd = `ffmpeg -y -i "${videoPath}" -vf "fps=${fps},scale=400:500:force_original_aspect_ratio=decrease" -vframes ${frameCount} "${framePattern}"`;
    execSync(ffmpegCmd, { stdio: 'pipe' });

    const extractedFiles = fs.readdirSync(tempDir).filter(f => f.endsWith('.png')).sort();
    if (extractedFiles.length === 0) {
      throw new Error('FFmpeg failed to extract frames from: ' + videoPath);
    }

    console.log(`✓ Extracted ${extractedFiles.length} frames.`);

    // 2. Process each frame: crop bounds, remove background, center in 320x400 canvas
    const processedFrames = [];
    for (let i = 0; i < Math.min(frameCount, extractedFiles.length); i++) {
      const filePath = path.join(tempDir, extractedFiles[i]);
      let img = sharp(filePath).ensureAlpha();

      // Simple auto-background removal if requested (white or solid corner color)
      if (removeBackground === 'chroma_auto') {
        const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
        // Sample top-left corner
        const bgR = data[0], bgG = data[1], bgB = data[2];
        const isWhite = bgR > 235 && bgG > 235 && bgB > 235;
        const isGreen = bgG > 180 && bgR < 100 && bgB < 100;

        if (isWhite || isGreen) {
          for (let p = 0; p < data.length; p += 4) {
            const r = data[p], g = data[p + 1], b = data[p + 2];
            if (isWhite && r > 225 && g > 225 && b > 225) {
              data[p + 3] = 0;
            } else if (isGreen && g > 150 && r < 120 && b < 120) {
              data[p + 3] = 0;
            }
          }
          img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
        }
      }

      // Find alpha bounding box
      const { data: aData, info: aInfo } = await img.raw().toBuffer({ resolveWithObject: true });
      let minX = aInfo.width, maxX = 0, minY = aInfo.height, maxY = 0;
      for (let y = 0; y < aInfo.height; y++) {
        for (let x = 0; x < aInfo.width; x++) {
          const a = aData[(y * aInfo.width + x) * 4 + 3];
          if (a > 20) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      const bboxW = Math.max(10, maxX - minX + 1);
      const bboxH = Math.max(10, maxY - minY + 1);

      const cropped = await img.extract({ left: minX, top: minY, width: bboxW, height: bboxH }).png().toBuffer();

      // Fit into 320 x 400
      const targetFrameW = 320;
      const targetFrameH = 400;
      const fitH = Math.min(370, Math.round(bboxH * (360 / bboxH)));
      const fitW = Math.round(bboxW * (fitH / bboxH));
      const offsetX = Math.round((targetFrameW - fitW) / 2);
      const offsetY = Math.round(385 - fitH);

      const frameCanvas = await sharp({
        create: {
          width: targetFrameW,
          height: targetFrameH,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      })
      .composite([{
        input: await sharp(cropped).resize(fitW, fitH, { fit: 'contain' }).png().toBuffer(),
        left: Math.max(0, offsetX),
        top: Math.max(0, offsetY)
      }])
      .png()
      .toBuffer();

      processedFrames.push(frameCanvas);
    }

    // 3. Assemble composite 1280x400 atlas
    const compositeOps = processedFrames.map((buf, idx) => ({
      input: buf,
      left: idx * 320,
      top: 0
    }));

    const finalAtlas = await sharp({
      create: {
        width: targetWidth,
        height: targetHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite(compositeOps)
    .webp({ quality: 95, alphaQuality: 100 })
    .toBuffer();

    // 4. Save to destination
    const outFileName = action === 'walk' || action === 'idle' || action === 'celebrate'
      ? `${charCode}-atlas.webp`
      : `${charCode}-${action}.webp`;

    const destPath = path.join(root, 'assets', 'characters', 'animated', outFileName);
    fs.writeFileSync(destPath, finalAtlas);
    console.log(`✅ Success! Created studio sprite sheet: assets/characters/animated/${outFileName}`);

    return destPath;
  } finally {
    // Cleanup temp
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

// CLI usage support
if (process.argv[2] && process.argv[3]) {
  const vid = process.argv[2];
  const cid = process.argv[3];
  const act = process.argv[4] || 'walk';
  processVideoToSpriteSheet({ videoPath: vid, characterId: cid, action: act })
    .then(() => console.log('Done!'))
    .catch(console.error);
}
