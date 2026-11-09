import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const artSourceDir = 'E:/MY PRO/SCOREAR-Phase-04C-Characters/art-source';

async function restoreTrueArtSource() {
  console.log('--- Restoring TRUE Original Characters from Phase-04C art-source ---');
  if (!fs.existsSync(artSourceDir)) {
    throw new Error('art-source directory not found at: ' + artSourceDir);
  }

  for (let i = 1; i <= 20; i++) {
    const code = 'char_' + String(i).padStart(2, '0');
    const src = path.join(artSourceDir, code + '.png');
    const meta = await sharp(src).metadata();
    const halfW = Math.floor(meta.width / 2);
    const halfH = Math.floor(meta.height / 2);

    // Top-left quarter is Pose 1 (Standing Fullbody)
    const rawCrop = await sharp(src)
      .extract({ left: 0, top: 0, width: halfW, height: halfH })
      .toBuffer();

    // Find bounding box of alpha
    const { data, info } = await sharp(rawCrop).raw().toBuffer({ resolveWithObject: true });
    let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const a = data[(y * info.width + x) * 4 + 3];
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

    // Crop to tight bounding box
    const cropped = await sharp(rawCrop)
      .extract({ left: minX, top: minY, width: bboxW, height: bboxH })
      .toBuffer();

    // Scale to fit inside 448x600 canvas
    const targetH = Math.min(560, Math.round(bboxH * (540 / bboxH)));
    const targetW = Math.round(bboxW * (targetH / bboxH));
    const offsetX = Math.round((448 - targetW) / 2);
    const offsetY = Math.round(580 - targetH);

    const fullBuffer = await sharp({
      create: {
        width: 448,
        height: 600,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([{
      input: await sharp(cropped).resize(targetW, targetH, { fit: 'contain' }).png().toBuffer(),
      left: Math.max(0, offsetX),
      top: Math.max(0, offsetY)
    }])
    .webp({ quality: 95, alphaQuality: 100 })
    .toBuffer();

    const destPath = path.join(root, 'assets', 'characters', code + '_full.webp');
    fs.writeFileSync(destPath, fullBuffer);
    console.log(`✓ Restored authentic ${code}_full.webp from art-source/${code}.png`);
  }

  console.log('\nAll 20 canonical full-body characters successfully restored from Phase-04C art-source!');
}

restoreTrueArtSource().catch(console.error);
