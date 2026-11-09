import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Remove pure white studio background from an image using BFS Flood Fill
 * so internal white highlights/clothing remain 100% opaque.
 */
function removeWhiteBackground(rawBuffer, width, height, channels, whiteThreshold = 238, edgeFeather = 16) {
  const isBg = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let qHead = 0, qTail = 0;

  const isWhite = (r, g, b) => r >= whiteThreshold && g >= whiteThreshold && b >= whiteThreshold;

  // Add border pixels to queue
  const push = (x, y) => {
    const idx = y * width + x;
    if (isBg[idx] === 0) {
      const pIdx = idx * channels;
      if (isWhite(rawBuffer[pIdx], rawBuffer[pIdx + 1], rawBuffer[pIdx + 2])) {
        isBg[idx] = 1;
        queue[qTail++] = idx;
      }
    }
  };

  for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1); }
  for (let y = 0; y < height; y++) { push(0, y); push(width - 1, y); }

  while (qHead < qTail) {
    const curr = queue[qHead++];
    const cx = curr % width;
    const cy = Math.floor(curr / width);

    const neighbors = [
      cx > 0 ? curr - 1 : -1,
      cx < width - 1 ? curr + 1 : -1,
      cy > 0 ? curr - width : -1,
      cy < height - 1 ? curr + width : -1
    ];

    for (let i = 0; i < 4; i++) {
      const nIdx = neighbors[i];
      if (nIdx !== -1 && isBg[nIdx] === 0) {
        const pIdx = nIdx * channels;
        if (isWhite(rawBuffer[pIdx], rawBuffer[pIdx + 1], rawBuffer[pIdx + 2])) {
          isBg[nIdx] = 1;
          queue[qTail++] = nIdx;
        }
      }
    }
  }

  // Create RGBA output buffer
  const outBuf = Buffer.alloc(width * height * 4);
  const lowThresh = whiteThreshold - edgeFeather;

  for (let i = 0; i < width * height; i++) {
    const srcIdx = i * channels;
    const outIdx = i * 4;
    const r = rawBuffer[srcIdx];
    const g = rawBuffer[srcIdx + 1];
    const b = rawBuffer[srcIdx + 2];

    if (isBg[i] === 1) {
      outBuf[outIdx] = r;
      outBuf[outIdx + 1] = g;
      outBuf[outIdx + 2] = b;
      outBuf[outIdx + 3] = 0; // Transparent
    } else {
      outBuf[outIdx] = r;
      outBuf[outIdx + 1] = g;
      outBuf[outIdx + 2] = b;
      // Soft edge antialiasing for boundary pixels
      const minVal = Math.min(r, g, b);
      if (minVal > lowThresh) {
        const t = (minVal - lowThresh) / (whiteThreshold - lowThresh);
        outBuf[outIdx + 3] = Math.max(20, Math.min(255, Math.round(255 * (1 - t * 0.7))));
      } else {
        outBuf[outIdx + 3] = 255;
      }
    }
  }

  return outBuf;
}

/**
 * Process a 4-panel AI-generated sprite sheet into a standard 1280x400 transparent WebP atlas
 */
export async function processSheet(inputPath, actionType, outCharDir, outAnimatedDir, charId = 'char_01') {
  console.log(`\nProcessing ${actionType} from: ${inputPath}`);
  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, ch = info.channels;

  // 1. Remove background
  const rgbaBuffer = removeWhiteBackground(data, w, h, ch);

  // 2. Extract each of the 4 frames
  const segW = Math.floor(w / 4);
  const frames = [];

  for (let i = 0; i < 4; i++) {
    const startX = i * segW;
    const endX = (i + 1) * segW;

    // Find bounding box in this segment
    let minX = endX, maxX = startX, minY = h, maxY = 0;
    for (let y = 0; y < h; y++) {
      for (let x = startX; x < endX; x++) {
        const idx = (y * w + x) * 4;
        const alpha = rgbaBuffer[idx + 3];
        if (alpha > 30) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const cropW = Math.max(10, maxX - minX + 1);
    const cropH = Math.max(10, maxY - minY + 1);

    // Scale to fit 320x400 frame
    let targetH, targetW, offsetY, offsetX;
    if (actionType === 'fly') {
      targetH = Math.min(320, Math.round(300 * (cropH / Math.max(cropH, cropW))));
      targetW = Math.min(290, Math.round(targetH * (cropW / cropH)));
      offsetY = Math.round((400 - targetH) / 2);
    } else {
      // Anchored to ground
      targetH = Math.min(340, Math.round(cropH * (330 / Math.max(cropH, 1))));
      targetW = Math.min(290, Math.round(targetH * (cropW / cropH)));
      offsetY = Math.max(15, 385 - targetH);
    }
    offsetX = Math.round((320 - targetW) / 2);

    const scaledFrame = await sharp(rgbaBuffer, { raw: { width: w, height: h, channels: 4 } })
      .extract({ left: minX, top: minY, width: cropW, height: cropH })
      .resize(targetW, targetH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    // Place onto transparent 320x400 frame
    const frameBuffer = await sharp({
      create: {
        width: 320,
        height: 400,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([{ input: scaledFrame, left: offsetX, top: offsetY }])
    .png()
    .toBuffer();

    frames.push(frameBuffer);
  }

  // 3. Assemble into 1280x400 horizontal atlas
  const atlas = await sharp({
    create: {
      width: 1280,
      height: 400,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite(frames.map((buf, idx) => ({ input: buf, left: idx * 320, top: 0 })))
  .webp({ quality: 95, alphaQuality: 100 })
  .toBuffer();

  // Save to target locations
  fs.mkdirSync(outCharDir, { recursive: true });
  fs.mkdirSync(outAnimatedDir, { recursive: true });

  const path1 = path.join(outCharDir, `${charId}_${actionType}_sheet.webp`);
  const path2 = path.join(outAnimatedDir, `${charId}-${actionType}.webp`);

  fs.writeFileSync(path1, atlas);
  fs.writeFileSync(path2, atlas);
  console.log(`Saved: ${path1}`);
  console.log(`Saved: ${path2}`);
  return { path1, path2 };
}
