import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const vStr = 'v=20261109_v3_live';

// 1. characters.html
const charHtmlPath = path.join(root, 'characters.html');
let charHtml = fs.readFileSync(charHtmlPath, 'utf8');
charHtml = charHtml.replace(/characters-v4\.css\?v=[^"'\s]+/g, `characters-v4.css?${vStr}`);
charHtml = charHtml.replace(/cartoon-motion\.css\?v=[^"'\s]+/g, `cartoon-motion.css?${vStr}`);
charHtml = charHtml.replace(/ScoreARMotionEngine\.js\?v=[^"'\s]+/g, `ScoreARMotionEngine.js?${vStr}`);
charHtml = charHtml.replace(/characters-v4\.js\?v=[^"'\s]+/g, `characters-v4.js?${vStr}`);
fs.writeFileSync(charHtmlPath, charHtml, 'utf8');

// 2. index.html
const idxHtmlPath = path.join(root, 'index.html');
let idxHtml = fs.readFileSync(idxHtmlPath, 'utf8');
idxHtml = idxHtml.replace(/characters-v4\.css\?v=[^"'\s]+/g, `characters-v4.css?${vStr}`);
idxHtml = idxHtml.replace(/cartoon-motion\.css\?v=[^"'\s]+/g, `cartoon-motion.css?${vStr}`);
idxHtml = idxHtml.replace(/ScoreARMotionEngine\.js\?v=[^"'\s]+/g, `ScoreARMotionEngine.js?${vStr}`);
idxHtml = idxHtml.replace(/characters-v4\.js\?v=[^"'\s]+/g, `characters-v4.js?${vStr}`);
fs.writeFileSync(idxHtmlPath, idxHtml, 'utf8');

console.log('✓ Successfully bumped asset cache-busters in characters.html and index.html!');
