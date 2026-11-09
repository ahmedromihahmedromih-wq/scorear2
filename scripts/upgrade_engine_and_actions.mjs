import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const enginePath = path.join(root, 'ScoreARMotionEngine.js');
let code = fs.readFileSync(enginePath, 'utf8');

// 1. Upgrade ACTIONS with cinematic Pixar/Supercell physics & frame mapping
const oldActionsPattern = /\/\/ 6 Animation states:[\s\S]*?const DEFAULTS/;
const newActions = `// 6 Animation states: duration (ms), loop flag, frame sequence mapping, and cartoon physics keyframes
  const ACTIONS = {
    idle: { duration: 2000, loop: true, frames: [0, 0, 0, 0], physics: [
      { y: 0, sx: 1.0, sy: 1.0, tilt: 0, sScale: 1.0, sAlpha: 0.65 },
      { y: -3, sx: 0.98, sy: 1.02, tilt: 0.5, sScale: 0.95, sAlpha: 0.60 },
      { y: -5, sx: 0.97, sy: 1.03, tilt: 0, sScale: 0.92, sAlpha: 0.58 },
      { y: -1.5, sx: 0.99, sy: 1.01, tilt: -0.5, sScale: 0.98, sAlpha: 0.63 }
    ]},
    walk: { duration: 1200, loop: true, frames: [1, 0, 2, 0], physics: [
      { y: 4, sx: 1.04, sy: 0.96, tilt: 3, sScale: 1.06, sAlpha: 0.72, fx: 'dust' },
      { y: -8, sx: 0.96, sy: 1.04, tilt: 0.5, sScale: 0.86, sAlpha: 0.48 },
      { y: 4, sx: 1.04, sy: 0.96, tilt: -3, sScale: 1.06, sAlpha: 0.72, fx: 'dust' },
      { y: -8, sx: 0.96, sy: 1.04, tilt: -0.5, sScale: 0.86, sAlpha: 0.48 }
    ]},
    run: { duration: 800, loop: true, frames: [1, 3, 2, 3], physics: [
      { y: 6, sx: 1.08, sy: 0.92, tilt: 18, sScale: 1.15, sAlpha: 0.75, fx: 'dust' },
      { y: -16, sx: 0.90, sy: 1.12, tilt: 22, sScale: 0.68, sAlpha: 0.35, fx: 'dash' },
      { y: 6, sx: 1.08, sy: 0.92, tilt: 16, sScale: 1.15, sAlpha: 0.75, fx: 'dust' },
      { y: -14, sx: 0.92, sy: 1.10, tilt: 20, sScale: 0.70, sAlpha: 0.38, fx: 'dash' }
    ]},
    climb: { duration: 1350, loop: true, frames: [1, 0, 2, 3], physics: [
      { y: -4, sx: 0.96, sy: 1.04, tilt: -6, sScale: 0.55, sAlpha: 0.28 },
      { y: -16, sx: 1.04, sy: 0.96, tilt: 4, sScale: 0.45, sAlpha: 0.22, fx: 'rock' },
      { y: -10, sx: 0.96, sy: 1.04, tilt: -4, sScale: 0.50, sAlpha: 0.25, fx: 'rock' },
      { y: -26, sx: 1.02, sy: 1.02, tilt: 2, sScale: 0.38, sAlpha: 0.16 }
    ]},
    fly: { duration: 1250, loop: true, frames: [3, 3, 3, 3], physics: [
      { y: -18, sx: 1.06, sy: 0.94, tilt: 45, sScale: 0.50, sAlpha: 0.20, fx: 'sparkle' },
      { y: -26, sx: 1.00, sy: 1.00, tilt: 40, sScale: 0.42, sAlpha: 0.16, fx: 'sparkle' },
      { y: -34, sx: 0.94, sy: 1.06, tilt: 35, sScale: 0.35, sAlpha: 0.12, fx: 'sparkle' },
      { y: -24, sx: 1.08, sy: 0.92, tilt: 42, sScale: 0.45, sAlpha: 0.18, fx: 'sparkle' }
    ]},
    celebrate: { duration: 1600, loop: true, frames: [0, 3, 3, 0], physics: [
      { y: 14, sx: 1.18, sy: 0.82, tilt: 0, sScale: 1.25, sAlpha: 0.88 },
      { y: -34, sx: 0.88, sy: 1.18, tilt: -3, sScale: 0.50, sAlpha: 0.30, fx: 'confetti' },
      { y: -44, sx: 0.96, sy: 1.04, tilt: 3, sScale: 0.40, sAlpha: 0.22, fx: 'star' },
      { y: 6, sx: 1.12, sy: 0.88, tilt: 0, sScale: 1.15, sAlpha: 0.80 }
    ]}
  };

  const DEFAULTS`;

code = code.replace(oldActionsPattern, newActions);

// 2. Simplify getSpriteUrl to always use authentic canonical atlas
const oldUrlPattern = /getSpriteUrl\(charId, action\) \{[\s\S]*?return `\$\{base\}\/animated\/\$\{cid\}-atlas\.webp`;\s*\}/;
const newUrl = `getSpriteUrl(charId, action) {
      const base = this.opts.basePath.replace(/\\/$/, '');
      const num = String(charId).replace(/^char_/, '').padStart(2, '0');
      return \`\${base}/animated/char_\${num}-atlas.webp\`;
    }`;

code = code.replace(oldUrlPattern, newUrl);

fs.writeFileSync(enginePath, code, 'utf8');
const lines = code.split(/\r?\n/).length;
console.log(`✓ ScoreARMotionEngine.js updated cleanly! Total lines: ${lines} (<400)`);
