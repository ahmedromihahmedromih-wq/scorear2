import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const p = path.join(root, 'quiz-podium-effects.js');
let code = fs.readFileSync(p, 'utf8');

// Compact initWorldCanvas
const oldCanvas = /\/\/ --- 1\. World Canvas Particles Engine ---[\s\S]*?\/\/ --- 2\. World Climax SVG Overlays ---/;
const newCanvas = `// --- 1. World Canvas Particles Engine ---
  function initWorldCanvas(canvasEl, worldId) {
    if (!canvasEl) return;
    activeCanvas = canvasEl;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    let w = (canvasEl.width = canvasEl.offsetWidth || window.innerWidth), h = (canvasEl.height = canvasEl.offsetHeight || window.innerHeight);
    window.addEventListener('resize', () => { if (activeCanvas) { w = activeCanvas.width = activeCanvas.offsetWidth || window.innerWidth; h = activeCanvas.height = activeCanvas.offsetHeight || window.innerHeight; } });
    const isRed = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const colors = { royal: ['#f59e0b', '#fbbf24', '#fef08a'], cosmic: ['#22d3ee', '#818cf8', '#c084fc'], treasure: ['#fbbf24', '#f59e0b', '#d97706'], stadium: ['#ef4444', '#3b82f6', '#10b981'], oasis: ['#34d399', '#10b981', '#6ee7b7'], magic: ['#c084fc', '#a855f7', '#38bdf8'] };
    const pal = colors[worldId] || colors.royal;
    const createP = (init) => ({ x: Math.random() * w, y: init ? Math.random() * h : (worldId === 'treasure' ? -15 : h + 15), vx: (Math.random() - 0.5) * 1.6, vy: worldId === 'treasure' ? (2 + Math.random() * 2.5) : (-1.2 - Math.random() * 1.8), size: worldId === 'treasure' ? (7 + Math.random() * 7) : (3 + Math.random() * 4), angle: Math.random() * 6.28, vAngle: (Math.random() - 0.5) * 0.08, alpha: 0.35 + Math.random() * 0.65, color: pal[Math.floor(Math.random() * pal.length)] });
    const particles = Array.from({ length: isRed ? 15 : ((worldId === 'treasure' || worldId === 'stadium') ? 55 : 35) }, () => createP(true));
    function loop() {
      if (!activeCanvas) return;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i]; pt.x += pt.vx; pt.y += pt.vy; pt.angle += pt.vAngle;
        if (worldId === 'treasure') { if (pt.y > h + 15) Object.assign(pt, createP(false)); } else { if (pt.y < -25 || pt.x < -20 || pt.x > w + 20) Object.assign(pt, createP(false)); }
        ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(pt.angle); ctx.globalAlpha = pt.alpha; ctx.fillStyle = pt.color;
        ctx.beginPath();
        if (worldId === 'treasure') ctx.ellipse(0, 0, pt.size * Math.abs(Math.cos(pt.angle)), pt.size, 0, 0, 6.28); else ctx.arc(0, 0, pt.size, 0, 6.28);
        ctx.fill(); ctx.restore();
      }
      activeAnimationId = requestAnimationFrame(loop);
    }
    loop();
  }

  // --- 2. World Climax SVG Overlays ---`;

code = code.replace(oldCanvas, newCanvas);

fs.writeFileSync(p, code, 'utf8');
const lines = code.split(/\r?\n/).length;
console.log('Cleaned lines:', lines);
