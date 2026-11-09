import { processSheet } from './process_pixar_sprite_sheets.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const outCharDir = path.join(projectRoot, 'assets', 'characters', 'char_01');
const outAnimatedDir = path.join(projectRoot, 'assets', 'characters', 'animated');

const runImg = 'C:/Users/Ahmed Romih/.gemini/antigravity/brain/37cfadfe-728c-4d48-aa00-5433ce9cb355/char_01_run_sheet_1794207591206.jpg';
const climbImg = 'C:/Users/Ahmed Romih/.gemini/antigravity/brain/37cfadfe-728c-4d48-aa00-5433ce9cb355/char_01_climb_sheet_1794207659215.jpg';
const flyImg = 'C:/Users/Ahmed Romih/.gemini/antigravity/brain/37cfadfe-728c-4d48-aa00-5433ce9cb355/char_01_fly_sheet_1794207703778.jpg';

async function main() {
  console.log('--- Processing Run Sheet ---');
  await processSheet(runImg, 'run', outCharDir, outAnimatedDir, 'char_01');

  console.log('--- Processing Climb Sheet ---');
  await processSheet(climbImg, 'climb', outCharDir, outAnimatedDir, 'char_01');

  console.log('--- Processing Fly Sheet ---');
  await processSheet(flyImg, 'fly', outCharDir, outAnimatedDir, 'char_01');

  console.log('\nAll 3 Character 1 Action Sheets successfully processed!');
}

main().catch(err => {
  console.error('Error processing sheets:', err);
  process.exit(1);
});
