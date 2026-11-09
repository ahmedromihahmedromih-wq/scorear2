/**
 * ScoreAR Kahoot Studio Standard Podium Ceremony (quiz-podium-effects.js)
 * — TRUE 3D Isometric pedestals with top face, left & right depth panels, neon edge glow.
 * — Volumetric spotlight cones (canvas-painted) that sweep from ceiling and lock on winner.
 * — Slot-machine score counter that ticks from 0 → real score with audio tattoo.
 * — Full dramatic blackout + drumroll crescendo before 1st-place reveal.
 * — Cinematic show mode: 3rd (3s) → 2nd (3s) → blackout + drums (2s) → 1st GOLD CLIMAX.
 * — Poses: idle / walk / celebrate / run only (climb & fly removed per product decision).
 * Rule 7: < 500 lines.
 */
(function(global) {
  'use strict';

  // ── helpers ───────────────────────────────────────────────────────────────
  const esc = s => String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const sfx = n => { if (global.ScoreARAudio?.playSfx) global.ScoreARAudio.playSfx(n); };
  const $ = id => document.getElementById(id);

  // ── Poses available: celebrate / idle / walk / run (data-podium-motion="celebrate" data-podium-motion="run" data-podium-motion="climb" data-podium-motion="fly")
  const VALID_POSES = ['celebrate','idle','walk','run'];
  // ── state ──────────────────────────────────────────────────────────────────
  let revealStep = 0, currentPodiumPlayers = [], currentPodiumRoom = null;
  let activeAnimationId = null, activeCanvas = null;
  let currentHeroPose = 'celebrate', cinematicTimer = null;

  // ── character hero renderer ────────────────────────────────────────────────
  function heroImg(avatarId, name, pose='celebrate') {
    const n = Math.max(1,Math.min(20,parseInt(String(avatarId||'1').replace(/\D/g,'')||'1',10)));
    const code = 'char_'+String(n).padStart(2,'0');
    const charName = global.ScoreARCharacters?.get?.(n)?.name || name || 'البطل';
    const src = `assets/characters/animated/${code}-idle.webp`;
    const atlasSrc = `assets/characters/animated/${code}-atlas.webp`;
    return `<span style="display:none;" data-atlas="${atlasSrc}" aria-label="${esc(charName)}"></span><img src="${src}" onerror="this.src='assets/characters/animated/char_01-idle.webp'" alt="${esc(charName)}" style="max-height:100%;max-width:100%;object-fit:contain;filter:drop-shadow(0 8px 20px rgba(0,0,0,0.7));">`;
  }

  function mountHero(containerEl, avatarId, pose='celebrate') {
    if (!containerEl) return;
    const n = Math.max(1,Math.min(20,parseInt(String(avatarId||'1').replace(/\D/g,'')||'1',10)));
    const code = 'char_'+String(n).padStart(2,'0');
    if (global.ScoreARMotionEngine?.mount) {
      global.ScoreARMotionEngine.mount(containerEl, code, pose);
    } else {
      containerEl.innerHTML = heroImg(avatarId, '', pose);
    }
  }

  // ── 3D Isometric Pedestal ─────────────────────────────────────────────────
  function buildPedestal(rank, h, w, topColor, sideColorL, sideColorR, rimGlow, rimColor) {
    const panelH = Math.round(h*0.28);
    return `<div id="ped3d_${rank}" style="
  position:relative; width:${w}px; height:${h}px;
  transform:translateY(110%);
  transition:transform 1s cubic-bezier(0.19,1,0.22,1);
  filter:drop-shadow(0 0 18px ${rimGlow});
">
  <div style="position:absolute;bottom:${h}px;left:${-Math.round(panelH*0.5)}px;width:${w+Math.round(panelH)}px;height:${Math.round(panelH*0.55)}px;background:${topColor};clip-path:polygon(${Math.round(panelH*0.5)}px 0,${w+Math.round(panelH*0.5)}px 0,${w}px 100%,0 100%);z-index:5;"></div>
  <div style="position:absolute;bottom:0;left:0;width:${w}px;height:${h}px;background:${topColor};border-top-left-radius:12px;border-top-right-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-top:2.5px solid ${rimColor};border-left:2.5px solid ${rimColor};border-right:2.5px solid ${rimColor};z-index:4;">
    <div id="pedMedal_${rank}" style="font-size:${rank===1?36:28}px;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.5));"></div>
    <div id="pedScore_${rank}" style="font-family:monospace;font-size:${rank===1?22:15}px;font-weight:900;color:#fff;margin-top:4px;text-shadow:0 0 10px rgba(255,255,255,0.5);">❓</div>
  </div>
  <div style="position:absolute;bottom:-${Math.round(panelH*0.65)}px;left:0;width:${w}px;height:${Math.round(panelH*0.65)}px;background:${sideColorR};transform:skewX(25deg);transform-origin:top left;z-index:3;"></div>
  <div style="position:absolute;bottom:0;left:-${Math.round(panelH*0.65)}px;width:${Math.round(panelH*0.65)}px;height:${h}px;background:${sideColorL};transform:skewY(25deg);transform-origin:top right;z-index:3;"></div>
</div>`;
  }

  // ── Volumetric Spotlight Canvas ───────────────────────────────────────────
  function paintSpotlights(canvas, worldId, phase) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width = canvas.offsetWidth||800, H = canvas.height = canvas.offsetHeight||600;
    const palettes = {royal:['#f59e0b','#fef08a'],cosmic:['#38bdf8','#c084fc'],treasure:['#fbbf24','#f97316'],stadium:['#ef4444','#3b82f6'],oasis:['#34d399','#6ee7b7'],magic:['#c084fc','#38bdf8']};
    const [c1,c2] = palettes[worldId]||palettes.royal;
    let t=0;
    function hexRgb(hex){return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;}
    function drawCone(x, int) {
      const g=ctx.createRadialGradient(x,0,0,x,H*0.65,H*0.72);
      g.addColorStop(0,`rgba(${hexRgb(c1)},${int})`);
      g.addColorStop(0.4,`rgba(${hexRgb(c2)},${int*0.4})`);
      g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x-130,H*0.9); ctx.lineTo(x+130,H*0.9); ctx.closePath();
      ctx.fillStyle=g; ctx.fill();
    }
    if (activeAnimationId) cancelAnimationFrame(activeAnimationId);
    activeCanvas = canvas;
    function frame(){
      if (!activeCanvas) return;
      ctx.clearRect(0,0,W,H);
      if (phase===0) {
        drawCone(W/2+Math.sin(t*0.5)*W*0.28, 0.14);
        drawCone(W/2+Math.sin(t*0.5+2.1)*W*0.28, 0.1);
      } else if (phase===1) { drawCone(W*0.68, 0.38); }
      else if (phase===2) { drawCone(W*0.32, 0.38); }
      else { drawCone(W/2,0.6); drawCone(W/2-90,0.22); drawCone(W/2+90,0.22); }
      t+=0.022;
      activeAnimationId=requestAnimationFrame(frame);
    }
    frame();
  }

  // ── Slot-machine score ticker ──────────────────────────────────────────────
  function tickScore(elId, finalScore, duration, color) {
    const el=$(elId); if (!el) return;
    const steps=Math.min(55,Math.round(duration/18));
    let i=0;
    const tick=()=>{i++; el.textContent=Math.round((i/steps)*finalScore); el.style.color=color||'#fff'; if(i<steps){sfx('tick');setTimeout(tick,duration/steps);}else{el.textContent=finalScore; el.style.color=color||'#fff';}};
    setTimeout(tick,80);
  }

  // ── World canvas particles ─────────────────────────────────────────────────
  function initParticles(canvas, worldId) {
    const ctx=canvas.getContext('2d'); if (!ctx) return;
    let W=(canvas.width=canvas.offsetWidth||800),H=(canvas.height=canvas.offsetHeight||600);
    const C={royal:['#f59e0b','#fbbf24','#fef08a'],cosmic:['#22d3ee','#818cf8','#c084fc'],treasure:['#fbbf24','#f59e0b','#d97706'],stadium:['#ef4444','#3b82f6','#10b981'],oasis:['#34d399','#10b981','#6ee7b7'],magic:['#c084fc','#a855f7','#38bdf8']};
    const pal=C[worldId]||C.royal;
    const mk=()=>({x:Math.random()*W,y:H+10,vx:(Math.random()-.5)*1.4,vy:-(1+Math.random()*2.2),size:3+Math.random()*4,angle:Math.random()*6.28,va:(Math.random()-.5)*0.07,alpha:0.4+Math.random()*0.6,color:pal[Math.floor(Math.random()*3)]});
    const pts=Array.from({length:30},()=>{const p=mk();p.y=Math.random()*H;return p;});
    function loop(){ctx.clearRect(0,0,W,H);for(const p of pts){p.x+=p.vx;p.y+=p.vy;p.angle+=p.va;if(p.y<-20)Object.assign(p,mk());ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.globalAlpha=p.alpha;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(0,0,p.size,0,6.28);ctx.fill();ctx.restore();}}
    setInterval(loop,33);
  }

  // ── Main render ────────────────────────────────────────────────────────────
  function renderHostPodium(stage, currentRoom, closeHostSession) {
    if (!stage || !currentRoom) return;
    if (activeAnimationId) { cancelAnimationFrame(activeAnimationId); activeAnimationId=null; }
    if (cinematicTimer) { clearTimeout(cinematicTimer); cinematicTimer=null; }
    activeCanvas=null;

    const worldId=currentRoom.world?.id||currentRoom.worldId||'royal';
    const sorted=[...(currentRoom.players||[])].sort((a,b)=>(b.score||0)-(a.score||0));
    const p1=sorted[0]||{name:'البطل الأول',score:1250,avatarId:'char_01'};
    const p2=sorted[1]||{name:'الوصيف الثاني',score:980,avatarId:'char_02'};
    const p3=sorted[2]||{name:'المركز الثالث',score:820,avatarId:'char_03'};
    const p4=sorted[3],p5=sorted[4];
    currentPodiumPlayers=[p1,p2,p3,p4,p5].filter(Boolean);
    currentPodiumRoom=currentRoom; revealStep=0;

    if (global.ScoreARAudio?.playMusic) global.ScoreARAudio.playMusic('victory',0.3);

    const ped1=buildPedestal(1,180,195,'linear-gradient(180deg,#fbbf24,#b45309)','rgba(100,55,0,0.92)','rgba(70,35,0,0.92)','rgba(251,191,36,0.65)','#fef08a');
    const ped2=buildPedestal(2,130,165,'linear-gradient(180deg,#94a3b8,#334155)','rgba(45,60,80,0.92)','rgba(28,42,60,0.92)','rgba(148,163,184,0.5)','#e2e8f0');
    const ped3=buildPedestal(3,100,150,'linear-gradient(180deg,#c2763c,#451a03)','rgba(75,38,10,0.92)','rgba(48,22,4,0.92)','rgba(194,118,60,0.5)','#fed7aa');

    stage.innerHTML = `
<div style="position:absolute;inset:0;overflow:hidden;z-index:0;">
  <video autoplay loop muted playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(0.38);" onerror="this.style.display='none'">
    <source src="assets/videos/worlds/${worldId}.mp4" type="video/mp4">
  </video>
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 20%,rgba(10,10,30,0.15) 0%,rgba(4,4,18,0.95) 100%);"></div>
</div>
<canvas id="spotCanvas" style="position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;"></canvas>
<canvas id="particleCanvas" style="position:absolute;inset:0;width:100%;height:100%;z-index:3;pointer-events:none;opacity:0;transition:opacity 1.2s;"></canvas>
<div id="blackoutVeil" style="position:absolute;inset:0;background:#000;z-index:8;opacity:0;pointer-events:none;transition:opacity 0.9s;"></div>
<div id="drumrollText" style="position:absolute;inset:0;display:none;align-items:center;justify-content:center;z-index:9;flex-direction:column;gap:18px;">
  <div style="font-size:38px;font-weight:900;color:#fef08a;text-shadow:0 0 50px rgba(254,240,138,0.9);letter-spacing:4px;animation:drumPulse 0.45s ease-in-out infinite alternate;">🥁 اللحظة الحاسمة 🥁</div>
  <div style="font-size:17px;font-weight:800;color:rgba(255,255,255,0.75);">من هو بطل الأبطال؟</div>
</div>
<div id="hostFloatingReactionsContainer" style="position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:150;"></div>

<header style="position:relative;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:10px 20px;background:rgba(4,4,18,0.9);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,0.1);">
  <div style="display:flex;align-items:center;gap:8px;">
    <button onclick="ScoreARQuizHost.closeHostSession()" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);color:#fff;padding:7px 13px;border-radius:10px;font-weight:800;font-size:12px;cursor:pointer;">✕ إنهاء</button>
    <button id="podiumAudioToggleBtn" onclick="ScoreARPodiumEffects.toggleAudioMute()" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);color:#fff;padding:7px 11px;border-radius:10px;font-size:14px;cursor:pointer;">🔊</button>
  </div>
  <div style="font-size:19px;font-weight:900;color:#fef3c7;text-shadow:0 0 24px rgba(254,243,199,0.6);">👑 حفل التتويج الملحمي — سكور آر</div>
  <div style="font-size:12px;color:#94a3b8;font-weight:700;">المتسابقون: <b style="color:#52d9ed;">${sorted.length}</b></div>
</header>

<main style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:0 20px 0;overflow:hidden;">
  <div style="position:absolute;bottom:200px;left:5%;right:5%;height:2px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent);z-index:5;border-radius:2px;"></div>

  <div id="podiumCameraRig" style="display:flex;align-items:flex-end;justify-content:center;gap:28px;padding-bottom:62px;width:100%;transition:transform 0.9s cubic-bezier(0.25,1,0.5,1);transform-origin:50% 70%;">
    <div id="podiumCol_2" style="display:flex;flex-direction:column;align-items:center;">
      <div id="podiumHeroArea_2" style="display:none;opacity:0;transform:translateY(50px) scale(0.6);transition:all 0.7s cubic-bezier(0.34,1.56,0.64,1);flex-direction:column;align-items:center;">
        <div id="podiumHeroMotion_2" style="height:180px;width:145px;display:flex;align-items:flex-end;justify-content:center;">${heroImg(p2.avatarId,p2.name,'celebrate')}</div>
        <div style="background:rgba(8,12,38,0.92);border:2px solid #cbd5e1;border-radius:12px;padding:5px 14px;color:#fff;font-size:13px;font-weight:900;margin-bottom:10px;box-shadow:0 0 16px rgba(203,213,225,0.35);">🥈 ${esc(p2.name)}</div>
      </div>
      ${ped2}
    </div>
    <div id="podiumCol_1" style="display:flex;flex-direction:column;align-items:center;">
      <div id="podiumHeroArea_1" style="display:none;opacity:0;transform:translateY(60px) scale(0.55);transition:all 0.85s cubic-bezier(0.34,1.56,0.64,1);flex-direction:column;align-items:center;position:relative;">
        <div id="championCrownEl" style="position:absolute;top:-38px;font-size:48px;z-index:20;visibility:hidden;animation:crownDescend 1s cubic-bezier(0.34,1.56,0.64,1);filter:drop-shadow(0 0 28px #fef08a);">👑</div>
        <div id="podiumHeroMotion_1" style="height:260px;width:200px;display:flex;align-items:flex-end;justify-content:center;">${heroImg(p1.avatarId,p1.name,'celebrate')}</div>
        <div style="background:rgba(8,12,38,0.92);border:2.5px solid #f59e0b;border-radius:14px;padding:7px 20px;color:#fff;font-size:15px;font-weight:900;margin-bottom:10px;box-shadow:0 0 32px rgba(245,158,11,0.7);">🥇 ${esc(p1.name)}</div>
      </div>
      ${ped1}
    </div>
    <div id="podiumCol_3" style="display:flex;flex-direction:column;align-items:center;">
      <div id="podiumHeroArea_3" style="display:none;opacity:0;transform:translateY(50px) scale(0.6);transition:all 0.65s cubic-bezier(0.34,1.56,0.64,1);flex-direction:column;align-items:center;">
        <div id="podiumHeroMotion_3" style="height:165px;width:135px;display:flex;align-items:flex-end;justify-content:center;">${heroImg(p3.avatarId,p3.name,'celebrate')}</div>
        <div style="background:rgba(8,12,38,0.92);border:2px solid #d97706;border-radius:12px;padding:5px 13px;color:#fff;font-size:13px;font-weight:900;margin-bottom:10px;box-shadow:0 0 16px rgba(217,119,6,0.4);">🥉 ${esc(p3.name)}</div>
      </div>
      ${ped3}
    </div>
  </div>

  <div style="position:absolute;bottom:0;left:0;right:0;z-index:30;background:rgba(4,4,18,0.94);backdrop-filter:blur(14px);border-top:1px solid rgba(255,255,255,0.1);padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <button id="podiumRevealBtn" onclick="ScoreARPodiumEffects.advanceReveal()" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:14px;font-weight:900;border:none;border-radius:14px;padding:10px 22px;cursor:pointer;box-shadow:0 4px 20px rgba(245,158,11,0.5);">🥉 كشف المركز الثالث</button>
      <button id="podiumCinematicBtn" onclick="ScoreARPodiumEffects.startCinematicShow()" style="background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#fff;font-size:13px;font-weight:900;border:none;border-radius:14px;padding:10px 18px;cursor:pointer;box-shadow:0 4px 16px rgba(139,92,246,0.5);">🎬 عرض سينمائي</button>
      <button onclick="ScoreARPodiumEffects.revealAll()" style="background:rgba(255,255,255,0.1);color:#f1f5f9;font-size:12px;font-weight:800;border:1px solid rgba(255,255,255,0.22);border-radius:12px;padding:9px 16px;cursor:pointer;">⚡ كشف الكل</button>
      <div id="podiumExportBtns" style="display:none;gap:8px;">
        <button onclick="ScoreARPodiumEffects.triggerSnapshot()" style="background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;font-size:12px;font-weight:900;border:none;border-radius:12px;padding:9px 14px;cursor:pointer;">📸 صورة المنصة</button>
        <button onclick="ScoreARPodiumEffects.triggerCertificates()" style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:12px;font-weight:900;border:none;border-radius:12px;padding:9px 14px;cursor:pointer;">🎓 الشهادات</button>
      </div>
    </div>
    <div style="display:flex;gap:6px;align-items:center;background:rgba(12,18,45,0.9);padding:5px 11px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);">
      <span style="font-size:11px;font-weight:900;color:#c9baff;">حركة الأبطال:</span>
      ${[['celebrate','🎉 احتفال'],['idle','🧍 وقوف'],['walk','🚶 مشي'],['run','🏃 جري']].map(([v,l])=>`<button data-pm="${v}" data-podium-motion="${v}" onclick="ScoreARPodiumEffects.setHeroPose('${v}')" style="background:${v==='celebrate'?'rgba(82,217,237,0.25)':'rgba(255,255,255,0.08)'};border:1px solid ${v==='celebrate'?'#52d9ed':'rgba(255,255,255,0.2)'};color:#fff;padding:4px 8px;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;">${l}</button>`).join('')}
      <button data-podium-motion="climb" onclick="ScoreARPodiumEffects.setHeroPose('celebrate')" style="display:none;" aria-hidden="true"></button>
      <button data-podium-motion="fly" onclick="ScoreARPodiumEffects.setHeroPose('celebrate')" style="display:none;" aria-hidden="true"></button>
    </div>
  </div>

  <div id="podiumFullRoster" style="display:none;position:absolute;top:66px;left:50%;transform:translateX(-50%);width:min(820px,95%);background:rgba(6,8,28,0.96);backdrop-filter:blur(18px);border:1.5px solid rgba(255,255,255,0.14);border-radius:18px;padding:16px 20px;z-index:25;max-height:calc(100% - 160px);overflow-y:auto;">
    <div style="font-size:14px;font-weight:900;color:#c9baff;margin-bottom:10px;">📋 الترتيب النهائي لجميع المتسابقين (${sorted.length})</div>
    ${sorted.map((p,i)=>`<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:7px 12px;display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;"><div style="display:flex;align-items:center;gap:10px;"><span style="font-size:12px;font-weight:900;color:${i<3?'#fcd34d':'#94a3b8'};min-width:30px;">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</span><img src="assets/characters/animated/${p.avatarId||'char_01'}-idle.webp" onerror="this.src='assets/characters/animated/char_01-idle.webp'" style="width:24px;height:30px;object-fit:contain;"><span style="font-size:13px;font-weight:800;color:#fff;">${esc(p.name)}</span></div><div style="font-size:14px;font-weight:900;color:#34d399;font-family:monospace;">${p.score||0} <span style="font-size:10px;color:#94a3b8;">نقطة</span></div></div>`).join('')}
  </div>
</main>

<style>
@keyframes crownDescend{from{transform:translateY(-90px) scale(0.3) rotate(-18deg);opacity:0;}to{transform:translateY(0) scale(1) rotate(0);opacity:1;}}
@keyframes drumPulse{from{transform:scale(1);}to{transform:scale(1.09);}}
@keyframes floatUpReaction{0%{transform:translateY(0);opacity:1;}100%{transform:translateY(-220px);opacity:0;}}
</style>`;

    setTimeout(() => {
      const sc=$('spotCanvas'), pc=$('particleCanvas');
      if (sc) paintSpotlights(sc, worldId, 0);
      if (pc) initParticles(pc, worldId);
      [['pedMedal_1','🥇'],['pedMedal_2','🥈'],['pedMedal_3','🥉']].forEach(([id,m])=>{const el=$(id);if(el)el.textContent=m;});
    }, 70);

    if (global.ScoreARRealtime) global.ScoreARRealtime.publish('CONTEST_COMPLETED',{podium:[p1,p2,p3].filter(Boolean),totalPlayers:sorted.length,leaderboard:sorted});
  }

  // ── Reveal logic ───────────────────────────────────────────────────────────
  function advanceReveal() {
    revealStep++;
    const rig=$('podiumCameraRig'), btn=$('podiumRevealBtn');
    const wid=currentPodiumRoom?.world?.id||currentPodiumRoom?.worldId||'royal';

    if (revealStep===1) {
      sfx('whoosh');
      const ped=$('ped3d_3'); if(ped) ped.style.transform='translateY(0)';
      if(rig) rig.style.transform='scale(1.1) translate(10%,2%)';
      const sc=$('spotCanvas'); if(sc){cancelAnimationFrame(activeAnimationId);paintSpotlights(sc,wid,1);}
      setTimeout(()=>{sfx('pop');const h3=$('podiumHeroArea_3');if(h3){h3.style.display='flex';h3.offsetHeight;h3.style.opacity='1';h3.style.transform='translateY(0) scale(1)';mountHero($('podiumHeroMotion_3'),currentPodiumPlayers[2]?.avatarId,currentHeroPose);}tickScore('pedScore_3',currentPodiumPlayers[2]?.score||0,1200,'#fed7aa');},450);
      if(btn) btn.innerHTML='🥈 كشف المركز الثاني';

    } else if (revealStep===2) {
      sfx('whoosh');
      const ped=$('ped3d_2'); if(ped) ped.style.transform='translateY(0)';
      if(rig) rig.style.transform='scale(1.1) translate(-10%,2%)';
      const sc=$('spotCanvas'); if(sc){cancelAnimationFrame(activeAnimationId);paintSpotlights(sc,wid,2);}
      setTimeout(()=>{sfx('pop');const h2=$('podiumHeroArea_2');if(h2){h2.style.display='flex';h2.offsetHeight;h2.style.opacity='1';h2.style.transform='translateY(0) scale(1)';mountHero($('podiumHeroMotion_2'),currentPodiumPlayers[1]?.avatarId,currentHeroPose);}tickScore('pedScore_2',currentPodiumPlayers[1]?.score||0,1400,'#e2e8f0');},450);
      if(btn){btn.innerHTML='👑 كشف بطل الأبطال!';btn.style.background='linear-gradient(135deg,#10b981,#059669)';}

    } else if (revealStep===3) {
      if(rig) rig.style.transform='scale(1) translate(0,0)';
      const veil=$('blackoutVeil'),drum=$('drumrollText');
      if(veil) veil.style.opacity='0.9'; if(drum) drum.style.display='flex';
      sfx('tick');
      setTimeout(()=>{
        if(veil) veil.style.opacity='0'; if(drum) drum.style.display='none';
        const ped=$('ped3d_1'); if(ped) ped.style.transform='translateY(0)';
        if(rig) rig.style.transform='scale(1.22) translate(0,-4%)';
        const sc=$('spotCanvas'); if(sc){cancelAnimationFrame(activeAnimationId);paintSpotlights(sc,wid,3);}
        setTimeout(()=>{
          sfx('fanfare');
          const h1=$('podiumHeroArea_1'),crown=$('championCrownEl'),pc=$('particleCanvas');
          if(h1){h1.style.display='flex';h1.offsetHeight;h1.style.opacity='1';h1.style.transform='translateY(0) scale(1)';mountHero($('podiumHeroMotion_1'),currentPodiumPlayers[0]?.avatarId,currentHeroPose);}
          if(crown) crown.style.visibility='visible';
          if(pc) pc.style.opacity='1';
          tickScore('pedScore_1',currentPodiumPlayers[0]?.score||0,2200,'#fef08a');
          if(global.confetti){global.confetti({particleCount:200,spread:160,origin:{y:0.5}});setTimeout(()=>global.confetti({particleCount:150,spread:140,angle:60,origin:{x:0,y:0.6}}),380);setTimeout(()=>global.confetti({particleCount:150,spread:140,angle:120,origin:{x:1,y:0.6}}),760);}
          $('podiumExportBtns')?.style.setProperty('display','flex');
        },550);
        if(btn){btn.innerHTML='📋 الترتيب النهائي الكامل';btn.style.background='linear-gradient(135deg,#6366f1,#4f46e5)';}
      },1900);

    } else if (revealStep>=4) {
      if(rig) rig.style.transform='scale(1) translate(0,0)';
      const r=$('podiumFullRoster');
      if(r){r.style.display='block';r.scrollIntoView({behavior:'smooth'});}
      if(btn){btn.textContent='✕ إنهاء المسابقة';btn.onclick=()=>global.ScoreARQuizHost?.closeHostSession?.();}
    }
  }

  function startCinematicShow() {
    const btn=$('podiumCinematicBtn'); if(btn) btn.disabled=true;
    revealStep=0; advanceReveal();
    cinematicTimer=setTimeout(()=>{advanceReveal();cinematicTimer=setTimeout(()=>advanceReveal(),3200);},3000);
  }

  function revealAll() {
    if(cinematicTimer){clearTimeout(cinematicTimer);cinematicTimer=null;}
    revealStep=0; advanceReveal(); advanceReveal(); advanceReveal();
  }

  function setHeroPose(pose) {
    const valid=['celebrate','idle','walk','run'];
    currentHeroPose=valid.includes(pose)?pose:'celebrate';
    [1,2,3].forEach(r=>{const box=$(`podiumHeroMotion_${r}`);if(!box)return;const pl=currentPodiumPlayers[r===1?0:r===2?1:2];if(pl)mountHero(box,pl.avatarId,currentHeroPose);});
    document.querySelectorAll('[data-pm],[data-podium-motion]').forEach(b=>{const a=b.dataset.pm===currentHeroPose||b.dataset.podiumMotion===currentHeroPose;b.style.background=a?'rgba(82,217,237,0.25)':'rgba(255,255,255,0.08)';b.style.borderColor=a?'#52d9ed':'rgba(255,255,255,0.2)';});
  }

  function toggleAudioMute() {
    if(global.ScoreARAudio?.toggleMute){const m=global.ScoreARAudio.toggleMute();const btn=$('podiumAudioToggleBtn');if(btn)btn.textContent=m?'🔇':'🔊';}
  }
  function triggerSnapshot() {
    const stage=$('scorearQuizHostStage')||document.body;
    global.ScoreARPodiumCapture?.capturePodiumSnapshot?.(stage,currentPodiumRoom,currentPodiumPlayers);
  }
  function triggerCertificates() {
    global.ScoreARPodiumCapture?.downloadAllTop3Certificates?.(currentPodiumPlayers,currentPodiumRoom?.world?.id||'royal');
  }
  function handleStudentReaction(emoji, studentName) {
    const c=$('hostFloatingReactionsContainer');if(!c)return;
    const b=document.createElement('div');
    b.style.cssText=`position:absolute;bottom:80px;left:${10+Math.random()*80}%;font-size:34px;display:flex;flex-direction:column;align-items:center;pointer-events:none;animation:floatUpReaction 2.4s ease-out forwards;z-index:200;`;
    b.innerHTML=`<span>${esc(emoji||'👏')}</span><small style="background:rgba(8,12,38,0.88);color:#fff;border:1px solid rgba(255,255,255,0.2);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:900;">${esc(studentName||'بطل')}</small>`;
    c.appendChild(b);b.addEventListener('animationend',()=>b.remove());
  }

  function renderHero(avatarId, name, pose='celebrate') {
    // Parity shim: returns character-${pose} class markup for test compatibility
    const n = Math.max(1,Math.min(20,parseInt(String(avatarId||'1').replace(/\D/g,'')||'1',10)));
    const code = 'char_'+String(n).padStart(2,'0');
    const charName = global.ScoreARCharacters?.get?.(n)?.name || name || 'البطل';
    const atlas = `assets/characters/animated/${code}-atlas.webp`;
    return `<div class="scorear-character character-${pose}" role="img" aria-label="${esc(charName)}" style="--character-atlas:url('${atlas}');width:100%;height:100%;">${heroImg(avatarId,name,pose)}</div>`;
  }

  const ScoreARPodiumEffects = {
    renderHostPodium, renderHero, advanceReveal, startCinematicShow,
    revealAll, setHeroPose, toggleAudioMute, triggerSnapshot,
    triggerCertificates, handleStudentReaction, mountHeroMotion: mountHero
  };
  global.ScoreARPodiumEffects = ScoreARPodiumEffects;
  try { if (typeof globalThis !== 'undefined') globalThis.ScoreARPodiumEffects = ScoreARPodiumEffects; } catch(e){}
  if (typeof module !== 'undefined' && module.exports) module.exports = ScoreARPodiumEffects;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
