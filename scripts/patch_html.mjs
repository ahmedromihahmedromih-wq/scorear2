import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

// 1. Patch characters.html
const charHtmlPath = path.join(root, 'characters.html');
let charHtml = fs.readFileSync(charHtmlPath, 'utf8');
if (!charHtml.includes('cartoon-motion.css')) {
  charHtml = charHtml.replace(
    '<link rel="stylesheet" href="characters-v4.css?v=20261108_b4_motion">',
    '<link rel="stylesheet" href="characters-v4.css?v=20261108_b4_motion">\n<link rel="stylesheet" href="cartoon-motion.css?v=20261109_engine">\n<script src="ScoreARMotionEngine.js?v=20261109_engine"></script>'
  );
  fs.writeFileSync(charHtmlPath, charHtml, 'utf8');
  console.log('characters.html patched!');
} else {
  console.log('characters.html already has cartoon-motion.css');
}

// 2. Patch index.html
const indexHtmlPath = path.join(root, 'index.html');
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
if (!indexHtml.includes('cartoon-motion.css')) {
  indexHtml = indexHtml.replace(
    '<link rel="stylesheet" href="characters-v4.css?v=20261108_b4_motion">',
    '<link rel="stylesheet" href="characters-v4.css?v=20261108_b4_motion">\n<link rel="stylesheet" href="cartoon-motion.css?v=20261109_engine">'
  );
  indexHtml = indexHtml.replace(
    '<script src="characters-v4.js?v=20261108_b4_motion" defer></script>',
    '<script src="ScoreARMotionEngine.js?v=20261109_engine" defer></script>\n<script src="characters-v4.js?v=20261108_b4_motion" defer></script>'
  );
  fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
  console.log('index.html patched!');
} else {
  console.log('index.html already has cartoon-motion.css');
}
