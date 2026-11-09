import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const artSourceDir = 'E:/MY PRO/SCOREAR-Phase-04C-Characters/art-source';
const destDir = path.join(root, 'assets', 'characters', 'animated');

// SVG Speed & Particle Overlays for motion dynamics
function createDustSvg(x = 60, y = 370) {
  return Buffer.from(`
    <svg width="320" height="400" viewBox="0 0 320 400" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="${x}" cy="${y}" rx="35" ry="8" fill="rgba(240, 240, 255, 0.45)"/>
      <circle cx="${x - 15}" cy="${y - 8}" r="9" fill="rgba(230, 230, 250, 0.5)"/>
      <circle cx="${x + 20}" cy="${y - 12}" r="6" fill="rgba(240, 240, 255, 0.4)"/>
      <line x1="${x - 40}" y1="${y}" x2="${x - 70}" y2="${y}" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
  `);
}

function createAirborneSpeedSvg() {
  return Buffer.from(`
    <svg width="320" height="400" viewBox="0 0 320 400" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="20" y1="340" x2="110" y2="340" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" opacity="0.65"/>
      <line x1="10" y1="365" x2="80" y2="365" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
      <circle cx="95" cy="335" r="3" fill="#fef08a" opacity="0.8"/>
      <line x1="30" y1="380" x2="120" y2="380" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
    </svg>
  `);
}

function createRockLedgeSvg(elevY = 220) {
  return Buffer.from(`
    <svg width="320" height="400" viewBox="0 0 320 400" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="220" y="${elevY}" width="90" height="14" rx="4" fill="#d97706" opacity="0.6"/>
      <circle cx="280" cy="${elevY + 22}" r="4" fill="#b45309" opacity="0.5"/>
      <circle cx="240" cy="${elevY + 28}" r="3" fill="#b45309" opacity="0.4"/>
    </svg>
  `);
}

function createFlyAuraSvg(elevY = 160) {
  return Buffer.from(`
    <svg width="320" height="400" viewBox="0 0 320 400" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="160" cy="${elevY + 120}" rx="130" ry="40" fill="url(#flyGrad)" opacity="0.45"/>
      <defs>
        <radialGradient id="flyGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="70%" stop-color="#c084fc"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
      </defs>
      <circle cx="60" cy="${elevY + 80}" r="4" fill="#fef08a" opacity="0.75"/>
      <circle cx="260" cy="${elevY + 100}" r="3.5" fill="#38bdf8" opacity="0.8"/>
      <line x1="30" y1="${elevY + 140}" x2="110" y2="${elevY + 140}" stroke="#c084fc" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    </svg>
  `);
}

async function extractPoses(srcPath) {
  const meta = await sharp(srcPath).metadata();
  const halfW = Math.floor(meta.width / 2);
  const halfH = Math.floor(meta.height / 2);

  const poses = [];
  const coords = [
    { left: 0, top: 0 },          // 0: Standing Idle
    { left: halfW, top: 0 },      // 1: Stride 1 (Right leg forward)
    { left: 0, top: halfH },      // 2: Stride 2 (Left leg forward)
    { left: halfW, top: halfH }   // 3: Victory / Jump / Cheering
  ];

  for (const c of coords) {
    const raw = await sharp(srcPath).extract({ left: c.left, top: c.top, width: halfW, height: halfH }).toBuffer();
    // Bounding box of alpha
    const { data, info } = await sharp(raw).raw().toBuffer({ resolveWithObject: true });
    let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * 4 + 3] > 20) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    const bw = Math.max(10, maxX - minX + 1);
    const bh = Math.max(10, maxY - minY + 1);
    const cropped = await sharp(raw).extract({ left: minX, top: minY, width: bw, height: bh }).png().toBuffer();
    poses.push({ buffer: cropped, w: bw, h: bh });
  }

  return poses;
}

async function fitFrame(poseObj, { scale = 1, offsetX = 0, offsetY = 0, rotateDeg = 0, overlaySvg = null }) {
  let p = sharp(poseObj.buffer);
  if (rotateDeg !== 0) {
    p = p.rotate(rotateDeg, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
  }

  const meta = await p.metadata();
  const targetH = Math.min(380, Math.max(60, Math.round(poseObj.h * (340 / 500) * scale)));
  const targetW = Math.round(meta.width * (targetH / meta.height));

  const resized = await p.resize(targetW, targetH, { fit: 'contain' }).png().toBuffer();

  const left = Math.max(0, Math.min(320 - targetW, Math.round((320 - targetW) / 2 + offsetX)));
  const top = Math.max(0, Math.min(400 - targetH, Math.round(388 - targetH + offsetY)));

  const composites = [{ input: resized, left, top }];
  if (overlaySvg) composites.push({ input: overlaySvg, left: 0, top: 0 });

  return sharp({
    create: { width: 320, height: 400, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
  .composite(composites)
  .png()
  .toBuffer();
}

async function assemble(frames, outPath) {
  const comps = frames.map((f, i) => ({ input: f, left: i * 320, top: 0 }));
  await sharp({
    create: { width: 1280, height: 400, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
  .composite(comps)
  .webp({ quality: 92, alphaQuality: 100 })
  .toFile(outPath);
}

export async function generateAllCharacterActions() {
  console.log('🚀 Generating authentic multi-pose cartoon action sheets for all 20 characters...');

  for (let i = 1; i <= 20; i++) {
    const code = 'char_' + String(i).padStart(2, '0');
    const src = path.join(artSourceDir, code + '.png');
    if (!fs.existsSync(src)) continue;

    const poses = await extractPoses(src);

    // 1. RUN (Athletic Sprint Cycle: Push -> Airborne Flight -> Opposite Plant -> Spring Leap)
    const runFrames = [
      await fitFrame(poses[1], { scale: 0.98, offsetX: 8, offsetY: 0, rotateDeg: 4, overlaySvg: createDustSvg(80, 380) }),
      await fitFrame(poses[3], { scale: 0.94, offsetX: 16, offsetY: -28, rotateDeg: 12, overlaySvg: createAirborneSpeedSvg() }),
      await fitFrame(poses[2], { scale: 0.98, offsetX: 6, offsetY: 0, rotateDeg: -4, overlaySvg: createDustSvg(80, 380) }),
      await fitFrame(poses[3], { scale: 0.95, offsetX: 14, offsetY: -22, rotateDeg: 10, overlaySvg: createAirborneSpeedSvg() })
    ];
    await assemble(runFrames, path.join(destDir, `${code}-run.webp`));

    // 2. CLIMB (Vertical Ascension: Reach -> Pull -> Step -> Summit Crest)
    const climbFrames = [
      await fitFrame(poses[1], { scale: 0.92, offsetX: 10, offsetY: -8, rotateDeg: -5, overlaySvg: createRockLedgeSvg(180) }),
      await fitFrame(poses[0], { scale: 0.96, offsetX: 4, offsetY: -24, rotateDeg: 2, overlaySvg: createRockLedgeSvg(140) }),
      await fitFrame(poses[2], { scale: 0.92, offsetX: -8, offsetY: -16, rotateDeg: -3, overlaySvg: createRockLedgeSvg(160) }),
      await fitFrame(poses[3], { scale: 0.95, offsetX: 0, offsetY: -38, rotateDeg: 0, overlaySvg: createRockLedgeSvg(100) })
    ];
    await assemble(climbFrames, path.join(destDir, `${code}-climb.webp`));

    // 3. FLY (Superhero Soar: Bullet Bank -> Gliding Lift -> Soaring Apex -> Streamlined Boost)
    const flyFrames = [
      await fitFrame(poses[3], { scale: 0.92, offsetX: 14, offsetY: -24, rotateDeg: 35, overlaySvg: createFlyAuraSvg(140) }),
      await fitFrame(poses[3], { scale: 0.95, offsetX: 8, offsetY: -36, rotateDeg: 28, overlaySvg: createFlyAuraSvg(110) }),
      await fitFrame(poses[3], { scale: 0.98, offsetX: 0, offsetY: -48, rotateDeg: 20, overlaySvg: createFlyAuraSvg(90) }),
      await fitFrame(poses[3], { scale: 0.94, offsetX: 12, offsetY: -32, rotateDeg: 32, overlaySvg: createFlyAuraSvg(120) })
    ];
    await assemble(flyFrames, path.join(destDir, `${code}-fly.webp`));

    console.log(`✓ Built authentic multi-pose run, climb, fly sheets for ${code}`);
  }

  console.log('\n🎉 ALL 20 CHARACTERS ACTION SHEETS GENERATED WITH AUTHENTIC CARTOON MULTI-POSE ANATOMY!');
}

generateAllCharacterActions().catch(console.error);
