import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const p = path.join(root, 'quiz-podium-effects.js');
let code = fs.readFileSync(p, 'utf8');

// Ensure renderHero is defined
const renderHeroDef = `  function renderHero(avatarId, name, pose = 'celebrate') {
    const num = Math.max(1, Math.min(20, parseInt(String(avatarId || '1').replace(/\\D/g, '') || '1', 10)));
    const code = 'char_' + String(num).padStart(2, '0');
    const atlas = \`assets/characters/animated/\${code}-atlas.webp\`;
    const actionAtlas = pose === 'climb' ? \`assets/characters/animated/\${code}-climb.webp\`
      : pose === 'fly' ? \`assets/characters/animated/\${code}-fly.webp\`
      : pose === 'run' ? \`assets/characters/animated/\${code}-run.webp\`
      : atlas;
    const charName = (global.ScoreARCharacters && global.ScoreARCharacters.get) ? global.ScoreARCharacters.get(num)?.name : (name || 'البطل');
    return \`<div class="character-podium-hero" style="width:100%;height:100%;display:flex;align-items:flex-end;justify-content:center;filter:drop-shadow(0 16px 28px rgba(0,0,0,0.75));">
      <div class="scorear-character character-\${pose}" role="img" aria-label="\${esc(charName)}" style="--character-atlas:url('\${atlas}');--character-action-atlas:url('\${actionAtlas}');width:100%;height:100%;">
        <span class="character-frames" aria-hidden="true"></span>
        <img src="assets/characters/animated/\${code}-idle.webp" onerror="this.src='assets/characters/animated/char_01-idle.webp'" alt="\${esc(charName)}" style="max-height:100%;max-width:100%;object-fit:contain;">
      </div>
    </div>\`;
  }`;

// Replace mountHeroMotion with renderHero + mountHeroMotion
code = code.replace(/\/\/ Mount live 60FPS ScoreARMotionEngine[\s\S]*?mountHeroMotion\(containerEl, avatarId, pose = 'celebrate'\) \{[\s\S]*?\n  \}/, `${renderHeroDef}

  function mountHeroMotion(containerEl, avatarId, pose = 'celebrate') {
    if (!containerEl) return;
    const num = Math.max(1, Math.min(20, parseInt(String(avatarId || '1').replace(/\\D/g, '') || '1', 10)));
    const code = 'char_' + String(num).padStart(2, '0');
    if (global.ScoreARMotionEngine && typeof global.ScoreARMotionEngine.mount === 'function') {
      global.ScoreARMotionEngine.mount(containerEl, code, pose);
    } else {
      containerEl.innerHTML = renderHero(avatarId, '', pose);
    }
  }`);

// Make sure podiumHeroMotion containers have initial renderHero
code = code.replace(/id="podiumHeroMotion_2" style="([^"]*?)"><\/div>/, 'id="podiumHeroMotion_2" style="$1">${renderHero(p2.avatarId, p2.name, currentHeroPose)}</div>');
code = code.replace(/id="podiumHeroMotion_1" style="([^"]*?)"><\/div>/, 'id="podiumHeroMotion_1" style="$1">${renderHero(p1.avatarId, p1.name, currentHeroPose)}</div>');
code = code.replace(/id="podiumHeroMotion_3" style="([^"]*?)"><\/div>/, 'id="podiumHeroMotion_3" style="$1">${renderHero(p3.avatarId, p3.name, currentHeroPose)}</div>');

// Export renderHero in ScoreARPodiumEffects
code = code.replace(/renderHostPodium, advanceReveal, startCinematicShow/, 'renderHostPodium, renderHero, advanceReveal, startCinematicShow');

fs.writeFileSync(p, code, 'utf8');
const lines = code.split(/\r?\n/).length;
console.log('✓ quiz-podium-effects.js updated! Lines:', lines);
