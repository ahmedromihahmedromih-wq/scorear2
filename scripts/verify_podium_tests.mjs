import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const vm = require('vm');

const code = fs.readFileSync('quiz-podium-effects.js', 'utf8');
console.log('Lines:', code.split('\n').length);
try { new vm.Script(code); console.log('Syntax: OK'); } catch(e) { console.log('Syntax ERROR:', e.message); }
console.log('Has data-podium-motion="celebrate":', code.includes('data-podium-motion="celebrate"'));
console.log('Has data-podium-motion="run":', code.includes('data-podium-motion="run"'));
console.log('Has data-podium-motion="climb":', code.includes('data-podium-motion="climb"'));
console.log('Has data-podium-motion="fly":', code.includes('data-podium-motion="fly"'));
console.log('Has character-${pose}:', code.includes('character-${pose}'));
console.log('Has -atlas.webp:', code.includes('-atlas.webp'));
console.log('Has aria-label:', code.includes('aria-label'));
