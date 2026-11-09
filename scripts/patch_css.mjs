import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const cssPath = path.join(root, 'characters-v4.css');
let css = fs.readFileSync(cssPath, 'utf8');

const additions = `
.character-card .scorear-character { animation: character-card-breathe 2.5s ease-in-out infinite; transform-origin: bottom center; }
@keyframes character-card-breathe { 0%, 100% { transform: translateY(0) scale(1,1); } 50% { transform: translateY(-4px) scale(0.98,1.02); } }
.character-card:hover .scorear-character>img { visibility: hidden !important; }
.character-card:hover .character-frames { display: block !important; animation: character-walk-frames 1.0s steps(1,end) infinite !important; }
.character-card[aria-pressed=true] .scorear-character>img { visibility: hidden !important; }
.character-card[aria-pressed=true] .character-frames { display: block !important; animation: character-walk-frames 1.2s steps(1,end) infinite !important; }
`;

if (!css.includes('character-card-breathe')) {
  css += additions;
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log('✓ Added live hover & breathe animations to characters-v4.css!');
} else {
  console.log('Already patched.');
}
