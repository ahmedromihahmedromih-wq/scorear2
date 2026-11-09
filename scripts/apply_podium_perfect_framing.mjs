import fs from 'fs';

// 1. Update podium.html
const podiumHtmlPath = 'E:\\MY PRO\\New folder (4)\\SCOREAR_FINAL_RELEASE\\podium.html';
let html = fs.readFileSync(podiumHtmlPath, 'utf8');

// Replace tester-bar styles & structure with ultra-compact single-row toolbar
const oldTesterBar = html.substring(html.indexOf('<div class="podium-tester-bar">'), html.indexOf('<div class="podium-stage-viewport"') );
const newTesterBar = `<div class="podium-tester-bar" style="background:rgba(18,20,42,0.98);border-bottom:1px solid rgba(142,100,239,0.3);padding:2px 12px;height:38px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:nowrap;overflow-x:auto;z-index:50;flex-shrink:0;">
  <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
    <a href="characters.html" class="test-btn" style="text-decoration:none;padding:3px 8px;font-size:11px;">⬅ الأبطال</a>
    <a href="index.html#home" class="test-btn" style="text-decoration:none;padding:3px 8px;font-size:11px;">🏠 الرئيسية</a>
    <span style="font-weight:900;color:#fef08a;font-size:12px;white-space:nowrap;">👑 منصة التتويج</span>
  </div>

  <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
    <select id="worldSelect" onchange="changeWorld(this.value)" style="background:#1f1d38;border:1px solid rgba(255,255,255,0.2);color:#fff;padding:2px 6px;border-radius:6px;font-weight:800;font-size:11px;cursor:pointer;">
      <option value="royal">👑 Royal</option>
      <option value="cosmic">🚀 Cosmic</option>
      <option value="treasure">💎 Treasure</option>
      <option value="stadium">🏟️ Stadium</option>
      <option value="oasis">🌴 Oasis</option>
      <option value="magic">🔮 Magic</option>
    </select>
    <button type="button" class="test-btn primary" onclick="ScoreARPodiumEffects.startCinematicShow()" style="padding:3px 10px;font-size:11px;">🎬 عرض سينمائي</button>
    <button type="button" class="test-btn" onclick="ScoreARPodiumEffects.advanceReveal()" style="padding:3px 8px;font-size:11px;">▶️ التالي</button>
    <button type="button" class="test-btn" onclick="ScoreARPodiumEffects.revealAll()" style="padding:3px 8px;font-size:11px;">⚡ كشف الكل</button>
    <button type="button" class="test-btn" onclick="initDemoPodium()" style="padding:3px 8px;font-size:11px;">🔄 إعادة</button>
  </div>
</div>\n\n`;

html = html.replace(oldTesterBar, newTesterBar);
fs.writeFileSync(podiumHtmlPath, html, 'utf8');
console.log('podium.html toolbar compacted to 38px');

// 2. Update quiz-podium-effects.js
const effectsPath = 'E:\\MY PRO\\New folder (4)\\SCOREAR_FINAL_RELEASE\\quiz-podium-effects.js';
let js = fs.readFileSync(effectsPath, 'utf8');

// Pedestal dimensions
js = js.replace(
  "const P1=pedestal(1,95,210,'linear-gradient(175deg,#f59e0b,#92400e)','rgba(80,35,0,0.95)','#fcd34d','rgba(252,211,77,0.55)');",
  "const P1=pedestal(1,82,200,'linear-gradient(175deg,#f59e0b,#92400e)','rgba(80,35,0,0.95)','#fcd34d','rgba(252,211,77,0.55)');"
);
js = js.replace(
  "const P2=pedestal(2,70,185,'linear-gradient(175deg,#94a3b8,#1e3a5f)','rgba(30,50,80,0.95)','#cbd5e1','rgba(203,213,225,0.45)');",
  "const P2=pedestal(2,60,178,'linear-gradient(175deg,#94a3b8,#1e3a5f)','rgba(30,50,80,0.95)','#cbd5e1','rgba(203,213,225,0.45)');"
);
js = js.replace(
  "const P3=pedestal(3,50,170,'linear-gradient(175deg,#c2793c,#431407)','rgba(68,32,8,0.95)','#fca87e','rgba(252,168,126,0.4)');",
  "const P3=pedestal(3,44,165,'linear-gradient(175deg,#c2793c,#431407)','rgba(68,32,8,0.95)','#fca87e','rgba(252,168,126,0.4)');"
);

// Hero container dimensions
js = js.replace('height:160px;width:135px;', 'height:148px;width:125px;');
js = js.replace('height:140px;width:120px;', 'height:130px;width:110px;');
js = js.replace('height:125px;width:105px;', 'height:116px;width:98px;');

// Crown position
js = js.replace('top:-42px;font-size:34px;', 'top:-38px;font-size:30px;');

fs.writeFileSync(effectsPath, js, 'utf8');
console.log('quiz-podium-effects.js tuned, line count:', js.split('\n').length);
