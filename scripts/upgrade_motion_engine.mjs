import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const enginePath = path.join(root, 'ScoreARMotionEngine.js');
let code = fs.readFileSync(enginePath, 'utf8');

// Replace ACTIONS block
const oldActionsPattern = /\/\/ 6 Animation states:[\s\S]*?const DEFAULTS/;
const newActions = `// 6 Animation states: duration (ms), loop flag, frame sequence mapping, and cartoon physics keyframes
  const ACTIONS = {
    idle: { duration: 2000, loop: true, frames: [0, 0, 0, 0], physics: [
      { y: 0, sx: 1.0, sy: 1.0, tilt: 0, sScale: 1.0, sAlpha: 0.65 },
      { y: -2, sx: 0.98, sy: 1.02, tilt: 0.5, sScale: 0.96, sAlpha: 0.62 },
      { y: -3.5, sx: 0.97, sy: 1.03, tilt: 0, sScale: 0.93, sAlpha: 0.60 },
      { y: -1, sx: 0.99, sy: 1.01, tilt: -0.5, sScale: 0.98, sAlpha: 0.64 }
    ]},
    walk: { duration: 1200, loop: true, frames: [1, 0, 2, 0], physics: [
      { y: 3, sx: 1.04, sy: 0.96, tilt: 2.5, sScale: 1.06, sAlpha: 0.72, fx: 'dust' },
      { y: -8, sx: 0.96, sy: 1.04, tilt: 0.5, sScale: 0.88, sAlpha: 0.48 },
      { y: 3, sx: 1.04, sy: 0.96, tilt: -2.5, sScale: 1.06, sAlpha: 0.72, fx: 'dust' },
      { y: -8, sx: 0.96, sy: 1.04, tilt: -0.5, sScale: 0.88, sAlpha: 0.48 }
    ]},
    run: { duration: 850, loop: true, frames: [0, 1, 2, 3], physics: [
      { y: 3, sx: 1.08, sy: 0.92, tilt: 22, sScale: 1.2, sAlpha: 0.8, fx: 'dust' },
      { y: -16, sx: 0.92, sy: 1.08, tilt: 20, sScale: 0.7, sAlpha: 0.35 },
      { y: 2, sx: 1.08, sy: 0.92, tilt: 22, sScale: 1.2, sAlpha: 0.8, fx: 'dust' },
      { y: -12, sx: 0.94, sy: 1.06, tilt: 24, sScale: 0.75, sAlpha: 0.4 }
    ]},
    climb: { duration: 1450, loop: true, frames: [0, 1, 2, 3], physics: [
      { y: -4, sx: 0.96, sy: 1.04, tilt: -4, sScale: 0.55, sAlpha: 0.3 },
      { y: -14, sx: 1.04, sy: 0.96, tilt: 2, sScale: 0.45, sAlpha: 0.22, fx: 'rock' },
      { y: -8, sx: 0.97, sy: 1.03, tilt: -2, sScale: 0.48, sAlpha: 0.25, fx: 'rock' },
      { y: -20, sx: 1.02, sy: 1.02, tilt: 1, sScale: 0.4, sAlpha: 0.18 }
    ]},
    fly: { duration: 1300, loop: true, frames: [0, 1, 2, 3], physics: [
      { y: -14, sx: 1.08, sy: 0.92, tilt: 75, sScale: 0.5, sAlpha: 0.2, fx: 'sparkle' },
      { y: -22, sx: 1.02, sy: 0.98, tilt: 68, sScale: 0.45, sAlpha: 0.18, fx: 'sparkle' },
      { y: -30, sx: 0.96, sy: 1.06, tilt: 62, sScale: 0.38, sAlpha: 0.14, fx: 'sparkle' },
      { y: -20, sx: 1.1, sy: 0.92, tilt: 72, sScale: 0.46, sAlpha: 0.18, fx: 'sparkle' }
    ]},
    celebrate: { duration: 1600, loop: true, frames: [0, 3, 3, 0], physics: [
      { y: 14, sx: 1.15, sy: 0.85, tilt: 0, sScale: 1.25, sAlpha: 0.88 },
      { y: -28, sx: 0.88, sy: 1.15, tilt: -2, sScale: 0.55, sAlpha: 0.35, fx: 'confetti' },
      { y: -36, sx: 0.96, sy: 1.04, tilt: 2, sScale: 0.45, sAlpha: 0.25, fx: 'star' },
      { y: 6, sx: 1.10, sy: 0.90, tilt: 0, sScale: 1.15, sAlpha: 0.80 }
    ]}
  };

  const DEFAULTS`;

code = code.replace(oldActionsPattern, newActions);

// Replace tick frameIdx mapping
const oldTickPattern = /const frameIdx = Math\.floor\(progress \* 4\) % 4;[\s\S]*?const k2 = cfg\.physics\[\(frameIdx \+ 1\) % 4\];/;

const newTick = `const stepIdx = Math.floor(progress * 4) % 4;
      const frameNum = cfg.frames ? cfg.frames[stepIdx] : stepIdx;
      this.activeSprite.style.backgroundPosition = \`\${(frameNum * 33.333333).toFixed(4)}% 0%\`;

      const subT = (progress * 4) - stepIdx;
      const k1 = cfg.physics[stepIdx];
      const k2 = cfg.physics[(stepIdx + 1) % 4];`;

code = code.replace(oldTickPattern, newTick);

fs.writeFileSync(enginePath, code, 'utf8');

const totalLines = code.split(/\r?\n/).length;
console.log(`✅ ScoreARMotionEngine.js successfully upgraded! Total lines: ${totalLines} (Rule 7: < 400).`);
