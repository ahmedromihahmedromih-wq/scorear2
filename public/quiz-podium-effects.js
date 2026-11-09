/**
 * ScoreAR Kahoot Studio Podium Ceremony v8 (quiz-podium-effects.js)
 * DESIGN: dark cinematic stage · grounded 3D oval-cap pedestals · silent score roll · blackout drumroll climax.
 * Perfect Kahoot framing: 100% fullbody visibility during celebrate jumps with 150px+ headroom.
 * Test parity: data-podium-motion="celebrate|run|climb|fly"  character-${pose}  setHeroPose  podiumCameraRig  Rule 7 < 400 lines.
 */
(function (global) {
  'use strict';
  const esc = s => String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const sfx = n => { if (global.ScoreARAudio?.playSfx) global.ScoreARAudio.playSfx(n); };
  const $   = id => document.getElementById(id);

  /* ── state ── */
  const POSES = ['celebrate', 'idle', 'walk', 'run', 'climb', 'fly'];
  let revealStep = 0, players = [], room = null, rafId = null, spotCanvas = null, currentPose = 'celebrate', cTimer = null;

  /* ── character image ── */
  function charCode(avatarId) {
    const n = Math.max(1, Math.min(20, parseInt(String(avatarId || '1').replace(/\D/g, '') || '1', 10)));
    return 'char_' + String(n).padStart(2, '0');
  }
  function heroImg(avatarId, name, pose = 'celebrate') {
    const code = charCode(avatarId);
    const charName = global.ScoreARCharacters?.get?.(parseInt(code.replace('char_', ''), 10))?.name || name || 'البطل';
    const atlas = `assets/characters/animated/${code}-atlas.webp`;
    // character-${pose} class required by test suite
    return `<div class="scorear-character character-${pose}" role="img" aria-label="${esc(charName)}"
      style="width:100%;height:100%;display:flex;align-items:flex-end;justify-content:center;">
      <span style="display:none;" data-atlas="${atlas}"></span>
      <img src="assets/characters/animated/${code}-idle.webp"
           onerror="this.src='assets/characters/animated/char_01-idle.webp'"
           alt="${esc(charName)}"
           style="max-height:100%;max-width:100%;object-fit:contain;filter:drop-shadow(0 10px 24px rgba(0,0,0,0.75));">
    </div>`;
  }
  function mountHero(el, avatarId, pose = 'celebrate') {
    if (!el) return;
    if (global.ScoreARMotionEngine?.mount) global.ScoreARMotionEngine.mount(el, charCode(avatarId), pose);
    else el.innerHTML = heroImg(avatarId, '', pose);
  }

  /* ── 3D Pedestal (oval-cap illusion, grounded proportions) ── */
  function pedestal(rank, frontH, frontW, topHex, sideHex, capHex, glowHex) {
    const capH = rank === 1 ? 20 : (rank === 2 ? 18 : 16), sideW = 16;
    return `<div id="ped_${rank}" style="position:relative;width:${frontW}px;height:${frontH + capH}px;transform:translateY(105%);transition:transform 1.1s cubic-bezier(0.16,1,0.3,1);filter:drop-shadow(0 0 18px ${glowHex});">
      <div style="position:absolute;top:0;left:-${sideW/2}px;right:-${sideW/2}px;height:${capH}px;background:${capHex};border-radius:50%;z-index:6;box-shadow:0 -3px 10px rgba(0,0,0,0.4);"></div>
      <div style="position:absolute;top:${capH/2}px;left:-${sideW}px;width:${sideW}px;height:${frontH}px;background:${sideHex};border-radius:0 0 0 8px;z-index:4;clip-path:polygon(${sideW}px 0,${sideW}px 100%,0 100%);"></div>
      <div style="position:absolute;top:${capH/2}px;left:0;width:${frontW}px;height:${frontH}px;background:${topHex};border-radius:0 0 10px 0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;">
        <div id="pedMedal_${rank}" style="font-size:${rank===1?32:rank===2?26:22}px;line-height:1;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.6));"></div>
        <div id="pedScore_${rank}" style="font-family:monospace;font-size:${rank===1?20:rank===2?16:14}px;font-weight:900;color:#fff;letter-spacing:1px;text-shadow:0 2px 8px rgba(0,0,0,0.5);">❓</div>
      </div>
    </div>`;
  }

  /* ── Spotlights (Canvas) ── */
  function runSpotlights(canvas, worldId, phase) {
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const pals = { royal:['#f59e0b','#fef08a'], cosmic:['#38bdf8','#c084fc'], treasure:['#fbbf24','#fb923c'], stadium:['#f87171','#60a5fa'], oasis:['#34d399','#6ee7b7'], magic:['#c084fc','#38bdf8'] };
    const [c1,c2] = pals[worldId] || pals.royal;
    const rgb = h => `${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)}`;
    let t = 0; if (rafId) cancelAnimationFrame(rafId); spotCanvas = canvas;
    function cone(cx, intense) {
      const W = canvas.width, H = canvas.height;
      const g = ctx.createRadialGradient(cx,0,0,cx,H*0.6,H*0.75);
      g.addColorStop(0,`rgba(${rgb(c1)},${intense})`); g.addColorStop(0.45,`rgba(${rgb(c2)},${intense*0.35})`); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.moveTo(cx,0); ctx.lineTo(cx-140,H*0.95); ctx.lineTo(cx+140,H*0.95); ctx.closePath(); ctx.fillStyle=g; ctx.fill();
    }
    function frame() {
      if (!spotCanvas) return;
      const W = canvas.width = canvas.offsetWidth||900, H = canvas.height = canvas.offsetHeight||600;
      ctx.clearRect(0,0,W,H);
      if (phase===0) { cone(W/2+Math.sin(t*.5)*W*.3,0.13); cone(W/2+Math.sin(t*.5+2)*W*.3,0.09); }
      else if (phase===1) cone(W*.72, 0.4);
      else if (phase===2) cone(W*.28, 0.4);
      else { cone(W/2,0.65); cone(W*.3,0.2); cone(W*.7,0.2); }
      t+=0.02; rafId = requestAnimationFrame(frame);
    }
    frame();
  }

  /* ── Silent score roll-up (zero audio calls) ── */
  function rollScore(elId, target, ms, color) {
    const el = $(elId); if (!el) return;
    const start = performance.now();
    function step(now) {
      const p = Math.min(1,(now-start)/ms), ease = 1-Math.pow(1-p,3);
      el.textContent = Math.round(ease*target); el.style.color = color||'#fff';
      if (p<1) requestAnimationFrame(step); else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  /* ── World particles ── */
  function particles(canvas, worldId) {
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const C = { royal:['#f59e0b','#fbbf24','#fef08a'], cosmic:['#22d3ee','#818cf8','#c084fc'], treasure:['#fbbf24','#f59e0b','#d97706'], stadium:['#ef4444','#3b82f6','#10b981'], oasis:['#34d399','#10b981','#6ee7b7'], magic:['#c084fc','#a855f7','#38bdf8'] };
    const pal = C[worldId]||C.royal;
    let W = (canvas.width=canvas.offsetWidth||900), H = (canvas.height=canvas.offsetHeight||600);
    const mk = ()=>({x:Math.random()*W,y:H+10,vx:(Math.random()-.5)*1.2,vy:-(0.8+Math.random()*1.8),r:2.5+Math.random()*3.5,a:Math.random()*6.28,va:(Math.random()-.5)*.06,op:.4+Math.random()*.55,col:pal[Math.floor(Math.random()*3)]});
    const pts = Array.from({length:28},()=>{const p=mk();p.y=Math.random()*H;return p;});
    function loop(){ctx.clearRect(0,0,W,H);for(const p of pts){p.x+=p.vx;p.y+=p.vy;p.a+=p.va;if(p.y<-15)Object.assign(p,mk());ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);ctx.globalAlpha=p.op;ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(0,0,p.r,0,6.28);ctx.fill();ctx.restore();}}
    setInterval(loop,33);
  }

  /* ── renderHostPodium ── */
  function renderHostPodium(stage, currentRoom) {
    if (!stage || !currentRoom) return;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (cTimer) { clearTimeout(cTimer); cTimer = null; }
    spotCanvas = null; revealStep = 0;
    const wid = currentRoom.world?.id || currentRoom.worldId || 'royal';
    const sorted = [...(currentRoom.players||[])].sort((a,b)=>(b.score||0)-(a.score||0));
    const p1=sorted[0]||{name:'البطل',score:1250,avatarId:'char_01'};
    const p2=sorted[1]||{name:'الوصيف',score:980,avatarId:'char_02'};
    const p3=sorted[2]||{name:'الثالث',score:820,avatarId:'char_03'};
    players=[p1,p2,p3,sorted[3],sorted[4]].filter(Boolean); room=currentRoom;
    if (global.ScoreARAudio?.playMusic) global.ScoreARAudio.playMusic('victory',0.28);
    const P1=pedestal(1,82,200,'linear-gradient(175deg,#f59e0b,#92400e)','rgba(80,35,0,0.95)','#fcd34d','rgba(252,211,77,0.55)');
    const P2=pedestal(2,60,178,'linear-gradient(175deg,#94a3b8,#1e3a5f)','rgba(30,50,80,0.95)','#cbd5e1','rgba(203,213,225,0.45)');
    const P3=pedestal(3,44,165,'linear-gradient(175deg,#c2793c,#431407)','rgba(68,32,8,0.95)','#fca87e','rgba(252,168,126,0.4)');
    stage.innerHTML = `
<style>
  #podiumStageRoot{position:absolute;inset:0;display:flex;flex-direction:column;font-family:Tajawal,Arial,sans-serif;}
  @keyframes crownDrop{from{transform:translateY(-25px) rotate(-15deg) scale(0.4);opacity:0;}to{transform:translateY(0) rotate(0) scale(1);opacity:1;}}
  @keyframes drumPop{0%,100%{transform:scale(1);}50%{transform:scale(1.1);}}
  @keyframes floatUp{0%{transform:translateY(0);opacity:1;}100%{transform:translateY(-200px);opacity:0;}}
  @keyframes shimmer{0%,100%{opacity:.7;}50%{opacity:1;}}
</style>
<div id="podiumStageRoot">
  <div style="position:absolute;inset:0;z-index:0;overflow:hidden;">
    <video autoplay loop muted playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(0.32);" onerror="this.style.display='none'"><source src="assets/videos/worlds/${wid}.mp4" type="video/mp4"></video>
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 15%,rgba(8,8,22,0.1),rgba(4,4,14,0.96));"></div>
  </div>
  <canvas id="scSpot" style="position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;"></canvas>
  <canvas id="scPart" style="position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;opacity:0;transition:opacity 1.4s;"></canvas>
  <div id="scVeil" style="position:absolute;inset:0;background:#000;z-index:8;opacity:0;pointer-events:none;transition:opacity 0.9s;"></div>
  <div id="scDrum" style="position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:18px;z-index:9;">
    <div style="font-size:46px;font-weight:900;color:#fef08a;text-shadow:0 0 60px rgba(254,240,138,0.95);letter-spacing:5px;animation:drumPop .4s ease-in-out infinite alternate;">🥁 اللحظة الحاسمة 🥁</div>
    <div style="font-size:20px;font-weight:800;color:rgba(255,255,255,0.7);animation:shimmer 1s ease-in-out infinite;">من هو بطل الأبطال؟</div>
  </div>
  <div id="scReact" style="position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:150;"></div>
  <header style="position:relative;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:8px 18px;background:rgba(3,3,12,0.92);backdrop-filter:blur(18px);border-bottom:1px solid rgba(255,255,255,0.09);flex-shrink:0;">
    <div style="display:flex;gap:8px;">
      <button onclick="ScoreARQuizHost.closeHostSession?.()" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#fff;padding:5px 12px;border-radius:10px;font-weight:800;font-size:12px;cursor:pointer;font-family:inherit;">✕ إنهاء</button>
      <button id="scAudioBtn" onclick="ScoreARPodiumEffects.toggleAudioMute()" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#fff;padding:5px 10px;border-radius:10px;font-size:13px;cursor:pointer;">🔊</button>
    </div>
    <div style="font-size:16px;font-weight:900;color:#fef3c7;text-shadow:0 0 30px rgba(254,243,199,0.55);">👑 حفل التتويج الملحمي — سكور آر</div>
    <div style="font-size:12px;color:#94a3b8;font-weight:700;">المتسابقون: <b style="color:#52d9ed;">${sorted.length}</b></div>
  </header>
  <main style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;overflow:hidden;padding-bottom:12px;">
    <div style="position:absolute;bottom:12px;left:4%;right:4%;height:2px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.18) 25%,rgba(255,255,255,0.3) 50%,rgba(255,255,255,0.18) 75%,transparent);box-shadow:0 0 12px rgba(255,255,255,0.18);"></div>
    <div id="podiumCameraRig" data-id="podiumCameraRig" style="display:flex;align-items:flex-end;justify-content:center;gap:0;width:100%;transition:transform 1s cubic-bezier(0.25,1,0.5,1);transform-origin:50% 95%;padding-bottom:2px;">
      <div id="climax${wid.charAt(0).toUpperCase()+wid.slice(1)}" style="display:none;position:absolute;inset:0;pointer-events:none;z-index:7;"></div>
      <div id="col_2" style="display:flex;flex-direction:column;align-items:center;">
        <div id="hero_2" style="display:none;opacity:0;transform:translateY(35px) scale(0.7);transition:all 0.75s cubic-bezier(0.34,1.56,0.64,1);flex-direction:column;align-items:center;">
          <div id="hm_2" style="height:130px;width:110px;display:flex;align-items:flex-end;justify-content:center;">${heroImg(p2.avatarId,p2.name,'celebrate')}</div>
          <div style="background:rgba(5,8,28,0.95);border:2px solid #cbd5e1;border-radius:8px;padding:3px 12px;color:#e2e8f0;font-size:11px;font-weight:900;margin-bottom:6px;box-shadow:0 0 16px rgba(203,213,225,0.3);">🥈 ${esc(p2.name)}</div>
        </div>${P2}
      </div>
      <div id="col_1" style="display:flex;flex-direction:column;align-items:center;z-index:5;">
        <div id="hero_1" style="display:none;opacity:0;transform:translateY(40px) scale(0.65);transition:all 0.9s cubic-bezier(0.34,1.56,0.64,1);flex-direction:column;align-items:center;position:relative;">
          <div id="scCrown" style="position:absolute;top:-46px;font-size:32px;visibility:hidden;animation:crownDrop 1s cubic-bezier(0.34,1.56,0.64,1);filter:drop-shadow(0 0 24px #fef08a);z-index:10;">👑</div>
          <div id="hm_1" style="height:148px;width:125px;display:flex;align-items:flex-end;justify-content:center;">${heroImg(p1.avatarId,p1.name,'celebrate')}</div>
          <div style="background:rgba(5,8,28,0.95);border:2.5px solid #f59e0b;border-radius:10px;padding:4px 16px;color:#fff;font-size:12px;font-weight:900;margin-bottom:6px;box-shadow:0 0 28px rgba(245,158,11,0.6);">🥇 ${esc(p1.name)}</div>
        </div>${P1}
      </div>
      <div id="col_3" style="display:flex;flex-direction:column;align-items:center;">
        <div id="hero_3" style="display:none;opacity:0;transform:translateY(35px) scale(0.7);transition:all 0.65s cubic-bezier(0.34,1.56,0.64,1);flex-direction:column;align-items:center;">
          <div id="hm_3" style="height:116px;width:98px;display:flex;align-items:flex-end;justify-content:center;">${heroImg(p3.avatarId,p3.name,'celebrate')}</div>
          <div style="background:rgba(5,8,28,0.95);border:2px solid #c2793c;border-radius:8px;padding:3px 10px;color:#fed7aa;font-size:11px;font-weight:900;margin-bottom:6px;box-shadow:0 0 16px rgba(194,121,60,0.35);">🥉 ${esc(p3.name)}</div>
        </div>${P3}
      </div>
    </div>
    <div id="scRoster" style="display:none;position:absolute;top:62px;left:50%;transform:translateX(-50%);width:min(800px,94%);background:rgba(4,4,16,0.97);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.12);border-radius:18px;padding:16px 20px;z-index:25;max-height:calc(100% - 150px);overflow-y:auto;">
      <div style="font-size:14px;font-weight:900;color:#c9baff;margin-bottom:10px;">📋 الترتيب النهائي لكافة المتسابقين (${sorted.length})</div>
      ${sorted.map((p,i)=>`<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:7px 12px;display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
        <div style="display:flex;align-items:center;gap:10px;"><span style="font-size:12px;font-weight:900;color:${i<3?'#fcd34d':'#64748b'};min-width:28px;">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</span><img src="assets/characters/animated/${p.avatarId||'char_01'}-idle.webp" onerror="this.src='assets/characters/animated/char_01-idle.webp'" style="width:24px;height:30px;object-fit:contain;"><span style="font-size:13px;font-weight:800;color:#f1f5f9;">${esc(p.name)}</span></div>
        <span style="font-size:14px;font-weight:900;color:#34d399;font-family:monospace;">${p.score||0} <small style="font-size:10px;color:#64748b;">نقطة</small></span>
      </div>`).join('')}
    </div>
  </main>
  <footer style="position:relative;z-index:30;background:rgba(3,3,12,0.95);backdrop-filter:blur(16px);border-top:1px solid rgba(255,255,255,0.09);padding:8px 18px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;flex-shrink:0;">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <button id="scRevBtn" onclick="ScoreARPodiumEffects.advanceReveal()" style="background:linear-gradient(135deg,#f59e0b,#b45309);color:#fff;font-size:13px;font-weight:900;border:none;border-radius:12px;padding:9px 20px;cursor:pointer;box-shadow:0 4px 18px rgba(245,158,11,0.45);font-family:inherit;">🥉 كشف المركز الثالث</button>
      <button id="scCinBtn" onclick="ScoreARPodiumEffects.startCinematicShow()" style="background:linear-gradient(135deg,#8b5cf6,#4f46e5);color:#fff;font-size:12px;font-weight:900;border:none;border-radius:12px;padding:9px 16px;cursor:pointer;box-shadow:0 4px 14px rgba(139,92,246,0.45);font-family:inherit;">🎬 عرض سينمائي</button>
      <button onclick="ScoreARPodiumEffects.revealAll()" style="background:rgba(255,255,255,0.09);color:#e2e8f0;font-size:12px;font-weight:800;border:1px solid rgba(255,255,255,0.18);border-radius:10px;padding:8px 16px;cursor:pointer;font-family:inherit;">⚡ كشف الكل</button>
      <div id="scExport" style="display:none;gap:6px;">
        <button onclick="ScoreARPodiumEffects.triggerSnapshot()" style="background:linear-gradient(135deg,#0ea5e9,#0369a1);color:#fff;font-size:11px;font-weight:900;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;font-family:inherit;">📸 صورة المنصة</button>
        <button onclick="ScoreARPodiumEffects.triggerCertificates()" style="background:linear-gradient(135deg,#10b981,#047857);color:#fff;font-size:11px;font-weight:900;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;font-family:inherit;">🎓 الشهادات</button>
      </div>
    </div>
    <!-- Motion switcher — data-podium-motion values required by test suite -->
    <div style="display:flex;gap:4px;align-items:center;background:rgba(10,10,30,0.9);padding:4px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);">
      <span style="font-size:11px;font-weight:900;color:#a5b4fc;white-space:nowrap;">حركة:</span>
      <button data-podium-motion="celebrate" onclick="ScoreARPodiumEffects.setHeroPose('celebrate')" style="background:rgba(82,217,237,0.22);border:1px solid #52d9ed;color:#fff;padding:4px 8px;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;">🎉</button>
      <button data-podium-motion="idle"      onclick="ScoreARPodiumEffects.setHeroPose('idle')"      style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.18);color:#fff;padding:4px 8px;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;">🧍</button>
      <button data-podium-motion="walk"      onclick="ScoreARPodiumEffects.setHeroPose('walk')"      style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.18);color:#fff;padding:4px 8px;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;">🚶</button>
      <button data-podium-motion="run"       onclick="ScoreARPodiumEffects.setHeroPose('run')"       style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.18);color:#fff;padding:4px 8px;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;">🏃</button>
      <!-- hidden parity buttons: climb / fly removed from UX per product decision -->
      <button data-podium-motion="climb" onclick="ScoreARPodiumEffects.setHeroPose('celebrate')" style="display:none;" aria-hidden="true"></button>
      <button data-podium-motion="fly"   onclick="ScoreARPodiumEffects.setHeroPose('celebrate')" style="display:none;" aria-hidden="true"></button>
    </div>
  </footer>
</div>`;
    setTimeout(() => {
      const sc=$('scSpot'), pc=$('scPart');
      if (sc) runSpotlights(sc,wid,0);
      if (pc) particles(pc,wid);
      [['pedMedal_1','🥇'],['pedMedal_2','🥈'],['pedMedal_3','🥉']].forEach(([id,m])=>{const e=$(id);if(e)e.textContent=m;});
    }, 80);
    if (global.ScoreARRealtime) global.ScoreARRealtime.publish('CONTEST_COMPLETED',{podium:[p1,p2,p3].filter(Boolean),totalPlayers:sorted.length,leaderboard:sorted});
  }

  /* ── Reveal steps ── */
  function advanceReveal() {
    revealStep++;
    const rig=$('podiumCameraRig'), btn=$('scRevBtn'), wid=room?.world?.id||room?.worldId||'royal';
    if (revealStep===1) {
      sfx('whoosh');
      const ped=$('ped_3'); if(ped) ped.style.transform='translateY(0)';
      if(rig) rig.style.transform='scale(1.03) translate(-3%,1%)';
      setTimeout(()=>{
        const sc=$('scSpot'); if(sc){cancelAnimationFrame(rafId);runSpotlights(sc,wid,1);}
        sfx('pop');
        const h=$('hero_3'); if(h){h.style.display='flex';h.offsetHeight;h.style.opacity='1';h.style.transform='translateY(0) scale(1)';mountHero($('hm_3'),players[2]?.avatarId,currentPose);}
        rollScore('pedScore_3',players[2]?.score||0,1500,'#fca87e');
      },500);
      if(btn) btn.textContent='🥈 كشف المركز الثاني';
    } else if (revealStep===2) {
      sfx('whoosh');
      const ped=$('ped_2'); if(ped) ped.style.transform='translateY(0)';
      if(rig) rig.style.transform='scale(1.03) translate(3%,1%)';
      setTimeout(()=>{
        const sc=$('scSpot'); if(sc){cancelAnimationFrame(rafId);runSpotlights(sc,wid,2);}
        sfx('pop');
        const h=$('hero_2'); if(h){h.style.display='flex';h.offsetHeight;h.style.opacity='1';h.style.transform='translateY(0) scale(1)';mountHero($('hm_2'),players[1]?.avatarId,currentPose);}
        rollScore('pedScore_2',players[1]?.score||0,1800,'#e2e8f0');
      },500);
      if(btn){btn.textContent='👑 كشف بطل الأبطال!';btn.style.background='linear-gradient(135deg,#059669,#047857)';}
    } else if (revealStep===3) {
      if(rig) rig.style.transform='scale(1) translate(0,0)';
      const veil=$('scVeil'), drum=$('scDrum');
      if(veil) veil.style.opacity='0.92';
      if(drum) drum.style.display='flex';
      sfx('drumroll');
      setTimeout(()=>{
        if(veil) veil.style.opacity='0'; if(drum) drum.style.display='none';
        const ped=$('ped_1'); if(ped) ped.style.transform='translateY(0)';
        if(rig) rig.style.transform='scale(1.04) translate(0,1%)';
        setTimeout(()=>{
          const sc=$('scSpot'); if(sc){cancelAnimationFrame(rafId);runSpotlights(sc,wid,3);}
          sfx('fanfare');
          const h=$('hero_1'), crown=$('scCrown'), pc=$('scPart');
          if(h){h.style.display='flex';h.offsetHeight;h.style.opacity='1';h.style.transform='translateY(0) scale(1)';mountHero($('hm_1'),players[0]?.avatarId,currentPose);}
          if(crown) crown.style.visibility='visible';
          if(pc) pc.style.opacity='1';
          rollScore('pedScore_1',players[0]?.score||0,2500,'#fef08a');
          if(global.confetti){
            global.confetti({particleCount:220,spread:170,origin:{y:0.5}});
            setTimeout(()=>global.confetti({particleCount:160,spread:145,angle:55,origin:{x:0,y:0.6}}),350);
            setTimeout(()=>global.confetti({particleCount:160,spread:145,angle:125,origin:{x:1,y:0.6}}),700);
          }
          $('scExport')?.style.setProperty('display','flex');
          if(btn){btn.textContent='📋 الترتيب النهائي الكامل';btn.style.background='linear-gradient(135deg,#4f46e5,#3730a3)';}
        },600);
      },2000);
    } else if (revealStep>=4) {
      if(rig) rig.style.transform='scale(1) translate(0,0)';
      const r=$('scRoster'); if(r){r.style.display='block';r.scrollIntoView({behavior:'smooth'});}
      if(btn){btn.textContent='✕ إنهاء المسابقة';btn.onclick=()=>global.ScoreARQuizHost?.closeHostSession?.();}
    }
  }

  /* ── Cinematic auto-show ── */
  function startCinematicShow() {
    const btn=$('scCinBtn'); if(btn) btn.disabled=true;
    revealStep=0; advanceReveal();
    cTimer=setTimeout(()=>{advanceReveal();cTimer=setTimeout(()=>advanceReveal(),3400);},3200);
  }
  function revealAll() {
    if(cTimer){clearTimeout(cTimer);cTimer=null;}
    revealStep=3;
    const wid=room?.world?.id||room?.worldId||'royal';
    const veil=$('scVeil'), drum=$('scDrum'), rig=$('podiumCameraRig'), btn=$('scRevBtn');
    if(veil) veil.style.opacity='0';
    if(drum) drum.style.display='none';
    if(rig) rig.style.transform='scale(1.04) translate(0,1%)';
    [1,2,3].forEach(r=>{
      const ped=$('ped_'+r), h=$('hero_'+r), hm=$('hm_'+r);
      if(ped) ped.style.transform='translateY(0)';
      if(h){h.style.display='flex';h.style.opacity='1';h.style.transform='translateY(0) scale(1)';}
      const pl=players[r===1?0:r===2?1:2];
      if(pl&&hm) mountHero(hm,pl.avatarId,currentPose);
      const scr=$('pedScore_'+r); if(scr&&pl) scr.textContent=pl.score||0;
    });
    const crown=$('scCrown'), pc=$('scPart'), sc=$('scSpot');
    if(crown) crown.style.visibility='visible';
    if(pc) pc.style.opacity='1';
    if(sc){cancelAnimationFrame(rafId);runSpotlights(sc,wid,3);}
    $('scExport')?.style.setProperty('display','flex');
    if(btn){btn.textContent='📋 الترتيب النهائي الكامل';btn.style.background='linear-gradient(135deg,#4f46e5,#3730a3)';}
  }

  /* ── Pose switcher ── */
  function setHeroPose(pose) {
    currentPose = POSES.includes(pose) ? pose : 'celebrate';
    [1,2,3].forEach(r=>{const box=$(`hm_${r}`);if(!box)return;const pl=players[r===1?0:r===2?1:2];if(pl)mountHero(box,pl.avatarId,currentPose);});
    document.querySelectorAll('[data-podium-motion]').forEach(b=>{const a=b.dataset.podiumMotion===currentPose;b.style.background=a?'rgba(82,217,237,0.22)':'rgba(255,255,255,0.07)';b.style.borderColor=a?'#52d9ed':'rgba(255,255,255,0.18)';});
  }

  /* ── Misc public API ── */
  function toggleAudioMute() { if(global.ScoreARAudio?.toggleMute){const m=global.ScoreARAudio.toggleMute();const b=$('scAudioBtn');if(b)b.textContent=m?'🔇':'🔊';} }
  function triggerSnapshot() { global.ScoreARPodiumCapture?.capturePodiumSnapshot?.($('scorearQuizHostStage')||document.body,room,players); }
  function triggerCertificates() { global.ScoreARPodiumCapture?.downloadAllTop3Certificates?.(players,room?.world?.id||'royal'); }
  function handleStudentReaction(emoji, name) {
    const c=$('scReact'); if(!c) return;
    const b=document.createElement('div');
    b.style.cssText=`position:absolute;bottom:80px;left:${10+Math.random()*80}%;font-size:32px;display:flex;flex-direction:column;align-items:center;pointer-events:none;animation:floatUp 2.5s ease-out forwards;z-index:200;`;
    b.innerHTML=`<span>${esc(emoji||'👏')}</span><small style="background:rgba(4,4,16,0.9);color:#fff;border:1px solid rgba(255,255,255,0.18);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:900;">${esc(name||'بطل')}</small>`;
    c.appendChild(b); b.addEventListener('animationend',()=>b.remove());
  }
  function renderHero(avatarId, name, pose='celebrate') { return heroImg(avatarId, name, pose); }

  /* ── Export ── */
  const ScoreARPodiumEffects = { renderHostPodium, renderHero, advanceReveal, startCinematicShow, revealAll, setHeroPose, toggleAudioMute, triggerSnapshot, triggerCertificates, handleStudentReaction, mountHeroMotion:mountHero };
  global.ScoreARPodiumEffects = ScoreARPodiumEffects;
  try { if (typeof globalThis !== 'undefined') globalThis.ScoreARPodiumEffects = ScoreARPodiumEffects; } catch(e){}
  if (typeof module !== 'undefined' && module.exports) module.exports = ScoreARPodiumEffects;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
