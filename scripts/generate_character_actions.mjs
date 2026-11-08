import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, '..');
const animDir = path.join(baseDir, 'assets', 'characters', 'animated');

// SVG Speed & Particle Overlays for motion dynamics
function createSpeedStreakSvg(color = '#38bdf8', opacity = 0.6) {
  return Buffer.from(`
    <svg width="320" height="400" viewBox="0 0 320 400" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="20" y1="365" x2="110" y2="365" stroke="${color}" stroke-width="3" stroke-linecap="round" opacity="${opacity}"/>
      <line x1="10" y1="380" x2="80" y2="380" stroke="${color}" stroke-width="2" stroke-linecap="round" opacity="${opacity * 0.7}"/>
      <circle cx="85" cy="360" r="3" fill="${color}" opacity="${opacity}"/>
    </svg>
  `);
}

function createClimbLedgeSvg(color = '#f59e0b', opacity = 0.45) {
  return Buffer.from(`
    <svg width="320" height="400" viewBox="0 0 320 400" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="230" y="80" width="80" height="12" rx="4" fill="${color}" opacity="${opacity}"/>
      <rect x="10" y="240" width="70" height="10" rx="3" fill="${color}" opacity="${opacity * 0.8}"/>
    </svg>
  `);
}

function createFlyMagicSparklesSvg(color = '#c084fc', opacity = 0.7) {
  return Buffer.from(`
    <svg width="320" height="400" viewBox="0 0 320 400" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="45" cy="220" r="4" fill="${color}" opacity="${opacity}"/>
      <circle cx="280" cy="180" r="3.5" fill="#fef08a" opacity="${opacity}"/>
      <circle cx="60" cy="310" r="2.5" fill="#38bdf8" opacity="${opacity * 0.8}"/>
      <path d="M50 190 Q90 200 130 195" stroke="${color}" stroke-width="2" stroke-dasharray="4 6" opacity="${opacity * 0.5}"/>
    </svg>
  `);
}

// Generate an action frame on a 320x400 transparent canvas
async function buildFrame(baseImgBuffer, {
  affine = null,
  scaleX = 1,
  scaleY = 1,
  translateX = 0,
  translateY = 0,
  overlaySvg = null
}) {
  let pipeline = sharp(baseImgBuffer);

  if (affine) {
    pipeline = sharp(await pipeline.affine(affine, { background: [0, 0, 0, 0], interpolator: 'bicubic' }).toBuffer());
  }

  // Base character normalized inside 280x350 box to allow generous motion headroom
  const targetW = Math.min(316, Math.max(80, Math.round(270 * scaleX)));
  const targetH = Math.min(396, Math.max(80, Math.round(340 * scaleY)));
  
  const scaled = await pipeline
    .resize(targetW, targetH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .toBuffer();

  const leftPos = Math.max(0, Math.min(320 - targetW, Math.round((320 - targetW) / 2 + translateX)));
  const topPos = Math.max(0, Math.min(400 - targetH, Math.round((400 - targetH) / 2 + translateY)));

  const composites = [
    { input: scaled, left: leftPos, top: topPos }
  ];

  if (overlaySvg) {
    composites.push({ input: overlaySvg, left: 0, top: 0 });
  }

  return sharp({
    create: {
      width: 320,
      height: 400,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite(composites)
  .webp({ quality: 92, alphaQuality: 100 })
  .toBuffer();
}

// Assemble 4 frames into a 1280x400 horizontal atlas
async function assembleAtlas(frameBuffers, outputPath) {
  const composites = frameBuffers.map((buf, i) => ({
    input: buf,
    left: i * 320,
    top: 0
  }));

  await sharp({
    create: {
      width: 1280,
      height: 400,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite(composites)
  .webp({ quality: 90, alphaQuality: 100, lossless: false })
  .toFile(outputPath);
}

// Generate all 3 action atlases for a single character
export async function generateCharacterActions(charNum) {
  const code = 'char_' + String(charNum).padStart(2, '0');
  const idlePath = path.join(animDir, `${code}-idle.webp`);
  if (!fs.existsSync(idlePath)) {
    console.warn(`Idle asset not found for ${code}`);
    return;
  }

  const baseBuf = await sharp(idlePath).toBuffer();

  // -------------------------------------------------------------
  // 1. RUN ATLAS: 4-frame dynamic run cycle
  // -------------------------------------------------------------
  const runF0 = await buildFrame(baseBuf, {
    affine: [1, 0.12, 0, 1],
    scaleX: 0.98,
    scaleY: 1.02,
    translateX: 8,
    translateY: -4,
    overlaySvg: createSpeedStreakSvg('#38bdf8', 0.5)
  });
  const runF1 = await buildFrame(baseBuf, {
    scaleX: 1.05,
    scaleY: 0.94,
    translateX: 0,
    translateY: 8,
    overlaySvg: createSpeedStreakSvg('#4ade80', 0.6)
  });
  const runF2 = await buildFrame(baseBuf, {
    affine: [1, -0.10, 0, 1],
    scaleX: 0.98,
    scaleY: 1.02,
    translateX: -6,
    translateY: -4,
    overlaySvg: createSpeedStreakSvg('#f59e0b', 0.5)
  });
  const runF3 = await buildFrame(baseBuf, {
    affine: [1, 0.08, 0, 1],
    scaleX: 0.96,
    scaleY: 1.06,
    translateX: 6,
    translateY: -16,
    overlaySvg: createSpeedStreakSvg('#38bdf8', 0.75)
  });
  const runPath = path.join(animDir, `${code}-run.webp`);
  await assembleAtlas([runF0, runF1, runF2, runF3], runPath);

  // -------------------------------------------------------------
  // 2. CLIMB ATLAS: 4-frame rock ledge ascension cycle
  // -------------------------------------------------------------
  const climbF0 = await buildFrame(baseBuf, {
    affine: [0.98, -0.14, 0.14, 0.98],
    scaleX: 0.96,
    scaleY: 1.03,
    translateX: -8,
    translateY: 4,
    overlaySvg: createClimbLedgeSvg('#d97706', 0.5)
  });
  const climbF1 = await buildFrame(baseBuf, {
    scaleX: 1.03,
    scaleY: 0.97,
    translateX: 0,
    translateY: -12,
    overlaySvg: createClimbLedgeSvg('#fbbf24', 0.6)
  });
  const climbF2 = await buildFrame(baseBuf, {
    affine: [0.98, 0.14, -0.14, 0.98],
    scaleX: 0.96,
    scaleY: 1.03,
    translateX: 8,
    translateY: -6,
    overlaySvg: createClimbLedgeSvg('#d97706', 0.5)
  });
  const climbF3 = await buildFrame(baseBuf, {
    scaleX: 0.98,
    scaleY: 1.05,
    translateX: 0,
    translateY: -22,
    overlaySvg: createClimbLedgeSvg('#fef3c7', 0.7)
  });
  const climbPath = path.join(animDir, `${code}-climb.webp`);
  await assembleAtlas([climbF0, climbF1, climbF2, climbF3], climbPath);

  // -------------------------------------------------------------
  // 3. FLY ATLAS: 4-frame horizontal soaring & arcane lift cycle
  // -------------------------------------------------------------
  const flyF0 = await buildFrame(baseBuf, {
    affine: [0.95, 0.22, -0.22, 0.95],
    scaleX: 1.03,
    scaleY: 0.97,
    translateX: 10,
    translateY: -8,
    overlaySvg: createFlyMagicSparklesSvg('#c084fc', 0.6)
  });
  const flyF1 = await buildFrame(baseBuf, {
    affine: [0.97, 0.12, -0.12, 0.97],
    scaleX: 1.05,
    scaleY: 0.95,
    translateX: 6,
    translateY: -18,
    overlaySvg: createFlyMagicSparklesSvg('#f472b6', 0.7)
  });
  const flyF2 = await buildFrame(baseBuf, {
    affine: [0.94, 0.26, -0.26, 0.94],
    scaleX: 1.06,
    scaleY: 0.94,
    translateX: 14,
    translateY: -10,
    overlaySvg: createFlyMagicSparklesSvg('#38bdf8', 0.65)
  });
  const flyF3 = await buildFrame(baseBuf, {
    affine: [0.98, 0.06, -0.06, 0.98],
    scaleX: 1.02,
    scaleY: 0.98,
    translateX: 0,
    translateY: -26,
    overlaySvg: createFlyMagicSparklesSvg('#fef08a', 0.8)
  });
  const flyPath = path.join(animDir, `${code}-fly.webp`);
  await assembleAtlas([flyF0, flyF1, flyF2, flyF3], flyPath);

  console.log(`✅ [${code}] Generated run, climb, and fly atlases successfully`);
}

// Run for all 20 characters if executed directly
if (process.argv[1] && process.argv[1].endsWith('generate_character_actions.mjs')) {
  console.log('🚀 Starting Kinematic Generation of Action Atlases for all 20 characters...');
  (async () => {
    for (let i = 1; i <= 20; i++) {
      await generateCharacterActions(i);
    }
    console.log('🎉 All 20 characters (60 action sprite atlases) created with 100% style consistency!');
  })();
}
