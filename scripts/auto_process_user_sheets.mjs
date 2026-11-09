import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processSheet } from './process_pixar_sprite_sheets.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const inputDir = path.join(projectRoot, 'input_sheets');
const outCharDir = path.join(projectRoot, 'assets', 'characters', 'char_01');
const outAnimatedDir = path.join(projectRoot, 'assets', 'characters', 'animated');

if (!fs.existsSync(inputDir)) {
  fs.mkdirSync(inputDir, { recursive: true });
}

/**
 * Automatically detects whether an image is a 3-row Master Atlas (Run + Climb + Fly)
 * or individual action sheets, and compiles them to 1280x400 transparent WebP.
 */
async function processIncoming() {
  const files = fs.readdirSync(inputDir).filter(f => /\.(png|jpe?g|webp)$/i.test(f));
  if (files.length === 0) {
    console.log(`[ScoreAR] No image files found in ${inputDir}.`);
    console.log(`Please place your ChatGPT generated sheet(s) into this directory!`);
    return;
  }

  console.log(`Found ${files.length} file(s) in ${inputDir}:`, files);

  for (const file of files) {
    const fullPath = path.join(inputDir, file);
    const meta = await sharp(fullPath).metadata();
    console.log(`\nInspecting ${file}: ${meta.width}x${meta.height}`);

    // Case 1: 3-Row Grid (Height significantly tall, aspect ratio ~ 16:9 or taller)
    // If aspect ratio is close to 4:3, 1:1, or 16:12 (3 stacked rows of 4 frames)
    if (meta.height > meta.width * 0.45 && file.toLowerCase().includes('master')) {
      console.log(`Detected 3-Row Master Atlas in ${file}! Slicing into 3 rows...`);
      const rowH = Math.floor(meta.height / 3);

      const runRow = path.join(inputDir, 'temp_run.png');
      const climbRow = path.join(inputDir, 'temp_climb.png');
      const flyRow = path.join(inputDir, 'temp_fly.png');

      await sharp(fullPath).extract({ left: 0, top: 0, width: meta.width, height: rowH }).png().toFile(runRow);
      await sharp(fullPath).extract({ left: 0, top: rowH, width: meta.width, height: rowH }).png().toFile(climbRow);
      await sharp(fullPath).extract({ left: 0, top: rowH * 2, width: meta.width, height: meta.height - rowH * 2 }).png().toFile(flyRow);

      await processSheet(runRow, 'run', outCharDir, outAnimatedDir, 'char_01');
      await processSheet(climbRow, 'climb', outCharDir, outAnimatedDir, 'char_01');
      await processSheet(flyRow, 'fly', outCharDir, outAnimatedDir, 'char_01');

      try { fs.unlinkSync(runRow); fs.unlinkSync(climbRow); fs.unlinkSync(flyRow); } catch (e) {}
      console.log('✅ Successfully sliced and processed Master 3-Row Atlas!');
      continue;
    }

    // Case 2: Individual action sheets based on file name or single 4-panel sheet
    let action = 'run';
    const lower = file.toLowerCase();
    if (lower.includes('climb')) action = 'climb';
    else if (lower.includes('fly')) action = 'fly';
    else if (lower.includes('run') || lower.includes('sprint')) action = 'run';

    await processSheet(fullPath, action, outCharDir, outAnimatedDir, 'char_01');
  }

  // Synchronize to public and dist
  const runBuild = path.join(projectRoot, 'build.js');
  console.log('\nRunning build.js to synchronize assets across public/ and dist/...');
  const { execSync } = await import('child_process');
  execSync(`node "${runBuild}"`, { stdio: 'inherit', cwd: projectRoot });
  console.log('\n🎉 ALL DONE! Character 1 assets are fully updated and synchronized.');
}

processIncoming().catch(console.error);
