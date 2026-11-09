import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const p = path.join(root, 'quiz-podium-effects.js');
let code = fs.readFileSync(p, 'utf8');

const condensedRenderHero = `  function renderHero(avatarId, name, pose = 'celebrate') {
    const num = Math.max(1, Math.min(20, parseInt(String(avatarId || '1').replace(/\\D/g, '') || '1', 10))), code = 'char_' + String(num).padStart(2, '0');
    const atlas = \`assets/characters/animated/\${code}-atlas.webp\`, actionAtlas = (pose === 'climb' || pose === 'fly' || pose === 'run') ? \`assets/characters/animated/\${code}-\${pose}.webp\` : atlas;
    const charName = (global.ScoreARCharacters && global.ScoreARCharacters.get) ? global.ScoreARCharacters.get(num)?.name : (name || 'البطل');
    return \`<div class="character-podium-hero" style="width:100%;height:100%;display:flex;align-items:flex-end;justify-content:center;filter:drop-shadow(0 16px 28px rgba(0,0,0,0.75));"><div class="scorear-character character-\${pose}" role="img" aria-label="\${esc(charName)}" style="--character-atlas:url('\${atlas}');--character-action-atlas:url('\${actionAtlas}');width:100%;height:100%;"><span class="character-frames" aria-hidden="true"></span><img src="assets/characters/animated/\${code}-idle.webp" onerror="this.src='assets/characters/animated/char_01-idle.webp'" alt="\${esc(charName)}" style="max-height:100%;max-width:100%;object-fit:contain;"></div></div>\`;
  }`;

code = code.replace(/function renderHero\(avatarId, name, pose = 'celebrate'\) \{[\s\S]*?\n  \}/, condensedRenderHero);

fs.writeFileSync(p, code, 'utf8');
const lines = code.split(/\r?\n/).length;
console.log('Cleaned lines of quiz-podium-effects.js:', lines);
