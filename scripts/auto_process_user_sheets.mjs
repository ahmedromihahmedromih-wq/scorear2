import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processSheet } from './process_pixar_sprite_sheets.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const inputDir = path.join(projectRoot, 'input_sheets');
const animatedDir = path.join(projectRoot, 'assets', 'characters', 'animated');

if (!fs.existsSync(inputDir)) {
  fs.mkdirSync(inputDir, { recursive: true });
}

function detectCharId(fileName) {
  const m = fileName.match(/char[_-]?(\d{1,2})/i) || fileName.match(/^(\d{1,2})[_-]/);
  if (m) {
    const num = parseInt(m[1], 10);
    if (num >= 1 && num <= 20) return `char_${String(num).padStart(2, '0')}`;
  }
  const nameMap = {
    'ziyad': 'char_01', 'زياد': 'char_01', 'nour': 'char_02', 'نور': 'char_02',
    'salim': 'char_03', 'سليم': 'char_03', 'farida': 'char_04', 'فريدة': 'char_04',
    'yaseen': 'char_05', 'ياسين': 'char_05', 'malak': 'char_06', 'ملك': 'char_06',
    'omar': 'char_07', 'عمر': 'char_07', 'hana': 'char_08', 'هنا': 'char_08',
    'laith': 'char_09', 'ليث': 'char_09', 'felfel': 'char_10', 'فلفل': 'char_10',
    'qafza': 'char_11', 'قفزة': 'char_11', 'bondoq': 'char_12', 'بندق': 'char_12',
    'mishmish': 'char_13', 'مشمش': 'char_13', 'hakeem': 'char_14', 'حكيم': 'char_14',
    'nabd': 'char_15', 'نبض': 'char_15', 'wameed': 'char_16', 'وميض': 'char_16',
    'sharara': 'char_17', 'شرارة': 'char_17', 'ghaima': 'char_18', 'غيمة': 'char_18',
    'najm': 'char_19', 'نجم': 'char_19', 'ballour': 'char_20', 'بلور': 'char_20'
  };
  const lower = fileName.toLowerCase();
  for (const [k, v] of Object.entries(nameMap)) {
    if (lower.includes(k)) return v;
  }
  return 'char_01';
}

/**
 * Automatically processes incoming sheets for ANY of the 20 characters
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
    const charId = detectCharId(file);
    const outCharDir = path.join(projectRoot, 'assets', 'characters', charId);
    console.log(`\nProcessing ${file} for character: ${charId} (${meta.width}x${meta.height})`);

    // Case 1: 3-Row Master Atlas
    if (meta.height > meta.width * 0.45 && (file.toLowerCase().includes('master') || file.toLowerCase().includes('all') || meta.height > 600)) {
      console.log(`Detected 3-Row Master Atlas in ${file}! Slicing into 3 rows...`);
      const rowH = Math.floor(meta.height / 3);

      const runRow = path.join(inputDir, `temp_${charId}_run.png`);
      const climbRow = path.join(inputDir, `temp_${charId}_climb.png`);
      const flyRow = path.join(inputDir, `temp_${charId}_fly.png`);

      await sharp(fullPath).extract({ left: 0, top: 0, width: meta.width, height: rowH }).png().toFile(runRow);
      await sharp(fullPath).extract({ left: 0, top: rowH, width: meta.width, height: rowH }).png().toFile(climbRow);
      await sharp(fullPath).extract({ left: 0, top: rowH * 2, width: meta.width, height: meta.height - rowH * 2 }).png().toFile(flyRow);

      await processSheet(runRow, 'run', outCharDir, animatedDir, charId);
      await processSheet(climbRow, 'climb', outCharDir, animatedDir, charId);
      await processSheet(flyRow, 'fly', outCharDir, animatedDir, charId);

      try { fs.unlinkSync(runRow); fs.unlinkSync(climbRow); fs.unlinkSync(flyRow); } catch (e) {}
      console.log(`✅ Successfully processed all 3 action states for ${charId}!`);
      continue;
    }

    // Case 2: Individual action sheet
    let action = 'run';
    const lower = file.toLowerCase();
    if (lower.includes('climb')) action = 'climb';
    else if (lower.includes('fly')) action = 'fly';
    else if (lower.includes('run') || lower.includes('sprint')) action = 'run';

    await processSheet(fullPath, action, outCharDir, animatedDir, charId);
  }

  // Synchronize to public and dist
  const runBuild = path.join(projectRoot, 'build.js');
  console.log('\nRunning build.js to synchronize assets across public/ and dist/...');
  const { execSync } = await import('child_process');
  execSync(`node "${runBuild}"`, { stdio: 'inherit', cwd: projectRoot });
  console.log('\n🎉 ALL DONE! Character assets are fully updated and synchronized.');
}

processIncoming().catch(console.error);
