import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const p = path.join(root, 'ScoreARMotionEngine.js');
let code = fs.readFileSync(p, 'utf8');

// Update getSpriteUrl
const oldUrl = /getSpriteUrl\(charId, action\) \{[\s\S]*?\n    \}/;
const newUrl = `getSpriteUrl(charId, action) {
      const base = this.opts.basePath.replace(/\\/$/, '');
      const num = String(charId).replace(/^char_/, '').padStart(2, '0');
      const cid = \`char_\${num}\`;
      if (action === 'run' || action === 'climb' || action === 'fly') {
        return \`\${base}/animated/\${cid}-\${action}.webp\`;
      }
      return \`\${base}/animated/\${cid}-atlas.webp\`;
    }`;

code = code.replace(oldUrl, newUrl);

// Update ACTIONS frames for run, climb, fly to use 0, 1, 2, 3 of their dedicated sheets
code = code.replace(/run: \{ duration: 800, loop: true, frames: \[1, 3, 2, 3\]/, 'run: { duration: 800, loop: true, frames: [0, 1, 2, 3]');
code = code.replace(/climb: \{ duration: 1350, loop: true, frames: \[1, 0, 2, 3\]/, 'climb: { duration: 1350, loop: true, frames: [0, 1, 2, 3]');
code = code.replace(/fly: \{ duration: 1250, loop: true, frames: \[3, 3, 3, 3\]/, 'fly: { duration: 1250, loop: true, frames: [0, 1, 2, 3]');

fs.writeFileSync(p, code, 'utf8');
const lines = code.split(/\r?\n/).length;
console.log('✓ ScoreARMotionEngine.js updated! Lines:', lines);
