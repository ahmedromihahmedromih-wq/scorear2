/**
 * ScoreAR Kahoot Studio 3D Podium Ceremony v10 (quiz-podium-effects.js)
 * DESIGN: Kahoot-grade 3D architectural stage · volumetric concert beams · glowing perspective arena floor
 * · tall 3D beveled metallic pedestals · large 248px animated heroes · instant & cinematic reveal modes.
 * Strictly Rule 7 compliant (< 400 lines).
 */
(function (global) {
  'use strict';
  const esc = s => String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const sfx = n => { if (global.ScoreARAudio?.playSfx) global.ScoreARAudio.playSfx(n); };
  const $   = id => document.getElementById(id);

  const POSES = ['celebrate', 'idle', 'walk', 'run', 'climb', 'fly'];
  let revealStep = 0, players = [], room = null, rafId = null, partTimer = null, spotCanvas = null, currentPose = 'celebrate', cTimer = null;

  function charCode(avatarId) {
    const n = Math.max(1, Math.min(20, parseInt(String(avatarId || '1').replace(/\D/g, '') || '1', 10)));
    return 'char_' + String(n).padStart(2, '0');
  }

  function heroImg(avatarId, name, pose = 'celebrate') {
    const code = charCode(avatarId);
    const charName = global.ScoreARCharacters?.get?.(parseInt(code.replace('char_', ''), 10))?.name || name || 'البطل';
    const atlas = `assets/characters/animated/${code}-atlas.webp`;
    return `<div class="scorear-character character-${pose}" role="img" aria-label="${esc(charName)}"
      style="width:100%;height:100%;display:flex;align-items:flex-end;justify-content:center;--character-atlas:url('${atlas}');">
      <span class="character-frames" aria-hidden="true" data-atlas="${atlas}"></span>
      <img src="assets/characters/animated/${code}-idle.webp"
           onerror="this.src='assets/characters/animated/char_01-idle.webp'"
           alt="${esc(charName)}"
           style="max-height:100%;max-width:100%;object-fit:contain;filter:drop-shadow(0 16px 28px rgba(0,0,0,0.82));">
    </div>`;
  }

  function mountHero(el, avatarId, pose = 'celebrate') {
    if (!el) return;
    if (global.ScoreARMotionEngine?.mount) global.ScoreARMotionEngine.mount(el, charCode(avatarId), pose);
    else el.innerHTML = heroImg(avatarId, '', pose);
  }

  /* ── Kahoot-Grade 3D Architectural Pedestal ── */
  function pedestal3D(rank, heightPx, widthPx) {
    const themes = {
      1: { face: 'linear-gradient(180deg, #fbbf24 0%, #d97706 48%, #78350f 100%)', top: 'linear-gradient(135deg, #fef08a 0%, #f59e0b 65%, #b45309 100%)', sideL: 'linear-gradient(180deg, #f59e0b 0%, #92400e 100%)', sideR: 'linear-gradient(180deg, #b45309 0%, #451a03 100%)', border: '#fef08a', glow: 'rgba(251, 191, 36, 0.55)', badgeBg: 'radial-gradient(circle at 35% 30%, #fef08a, #f59e0b 60%, #92400e 100%)', medal: '🥇', label: 'المركز الأول' },
      2: { face: 'linear-gradient(180deg, #94a3b8 0%, #475569 52%, #1e293b 100%)', top: 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 65%, #475569 100%)', sideL: 'linear-gradient(180deg, #cbd5e1 0%, #334155 100%)', sideR: 'linear-gradient(180deg, #475569 0%, #0f172a 100%)', border: '#e2e8f0', glow: 'rgba(148, 163, 184, 0.45)', badgeBg: 'radial-gradient(circle at 35% 30%, #ffffff, #94a3b8 60%, #334155 100%)', medal: '🥈', label: 'المركز الثاني' },
      3: { face: 'linear-gradient(180deg, #fb923c 0%, #b45309 52%, #431407 100%)', top: 'linear-gradient(135deg, #fed7aa 0%, #ea580c 65%, #7c2d12 100%)', sideL: 'linear-gradient(180deg, #fdba74 0%, #9a3412 100%)', sideR: 'linear-gradient(180deg, #9a3412 0%, #270902 100%)', border: '#fed7aa', glow: 'rgba(249, 115, 22, 0.42)', badgeBg: 'radial-gradient(circle at 35% 30%, #ffedd5, #ea580c 60%, #7c2d12 100%)', medal: '🥉', label: 'المركز الثالث' }
    };
    const t = themes[rank], badgeSize = rank === 1 ? 58 : (rank === 2 ? 48 : 44);
    return `<div id="podiumPedestal_${rank}" class="kahoot-3d-pedestal ped-rank-${rank}" style="height:${heightPx}px;width:${widthPx}px;position:relative;transform:translateY(0);transition:all 0.65s cubic-bezier(0.16,1,0.3,1);filter:drop-shadow(0 18px 34px rgba(0,0,0,0.78)) drop-shadow(0 0 24px ${t.glow});">
      <div style="position:absolute;top:-16px;left:6px;right:6px;height:24px;background:${t.top};border:2px solid ${t.border};border-radius:14px 14px 6px 6px;transform:perspective(360px) rotateX(42deg);box-shadow:0 0 25px ${t.glow}, inset 0 2px 10px rgba(255,255,255,0.75);z-index:6;"></div>
      <div style="position:absolute;top:0;bottom:0;left:0;width:14px;background:${t.sideL};border-radius:8px 0 0 12px;border-left:1.5px solid ${t.border};opacity:0.92;z-index:4;"></div>
      <div style="position:absolute;top:0;bottom:0;right:0;width:14px;background:${t.sideR};border-radius:0 8px 12px 0;opacity:0.92;z-index:4;"></div>
      <div style="position:absolute;inset:0 10px 0 10px;background:${t.face};border-top:2.5px solid ${t.border};border-bottom:4px solid rgba(0,0,0,0.6);border-radius:6px 6px 12px 12px;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:${rank===1?'14px 8px 12px':'10px 6px 8px'};overflow:hidden;box-shadow:inset 0 12px 24px rgba(255,255,255,0.22), inset 0 -18px 28px rgba(0,0,0,0.55);">
        <div style="position:absolute;top:-30%;left:-40%;width:85%;height:180%;background:linear-gradient(105deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.18) 45%,rgba(255,255,255,0) 60%);transform:rotate(18deg);pointer-events:none;"></div>
        <div style="position:relative;width:${badgeSize}px;height:${badgeSize}px;border-radius:50%;background:${t.badgeBg};border:2.5px solid ${t.border};box-shadow:0 6px 16px rgba(0,0,0,0.6), 0 0 18px ${t.glow}, inset 0 2px 6px rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center;font-size:${rank===1?28:22}px;font-weight:900;color:#0f172a;"><span id="pedMedal_${rank}">${t.medal}</span></div>
        <div style="font-size:${rank===1?12:10}px;font-weight:900;color:rgba(255,255,255,0.9);letter-spacing:0.6px;text-shadow:0 2px 4px rgba(0,0,0,0.8);">${t.label}</div>
        <div id="podiumMystery_${rank}" style="width:90%;background:rgba(6,8,22,0.78);backdrop-filter:blur(8px);border:1.5px solid ${t.border};border-radius:10px;padding:${rank===1?'5px 10px':'3px 8px'};text-align:center;font-family:monospace,Tajawal,sans-serif;font-size:${rank===1?20:rank===2?16:15}px;font-weight:900;color:#ffffff;letter-spacing:1px;box-shadow:0 4px 12px rgba(0,0,0,0.5);">❓</div>
      </div>
      <div style="position:absolute;bottom:-8px;left:-4px;right:-4px;height:12px;background:linear-gradient(90deg,rgba(255,255,255,0.18),${t.border},rgba(255,255,255,0.18));border-radius:8px;box-shadow:0 0 24px ${t.glow};z-index:6;"></div>
    </div>`;
  }

  /* ── Volumetric Concert Spotlights ── */
  function runSpotlights(canvas, worldId, phase) {
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const pals = { royal:['#fbbf24','#a855f7'], cosmic:['#38bdf8','#c084fc'], treasure:['#fbbf24','#f97316'], stadium:['#34d399','#38bdf8'], oasis:['#34d399','#fbbf24'], magic:['#c084fc','#38bdf8'] };
    const [c1, c2] = pals[worldId] || pals.royal;
    const rgb = h => `${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)}`;
    let t = 0; if (rafId) cancelAnimationFrame(rafId); spotCanvas = canvas;
    function beam(ox, oy, tx, ty, spread, colHex, alpha) {
      const g = ctx.createLinearGradient(ox, oy, tx, ty);
      g.addColorStop(0, `rgba(${rgb(colHex)},${alpha})`); g.addColorStop(0.55, `rgba(${rgb(colHex)},${alpha * 0.45})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.moveTo(ox - 12, oy); ctx.lineTo(ox + 12, oy); ctx.lineTo(tx + spread, ty); ctx.lineTo(tx - spread, ty); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    }

    function frame() {
      if (!spotCanvas) return;
      const W = canvas.width = canvas.offsetWidth || 960, H = canvas.height = canvas.offsetHeight || 640;
      ctx.clearRect(0, 0, W, H);
      const sway1 = Math.sin(t * 0.7) * W * 0.14;
      const sway2 = Math.cos(t * 0.55) * W * 0.14;
      beam(W * 0.18, 0, W * 0.5 + sway1, H * 0.95, 150, c2, 0.18);
      beam(W * 0.82, 0, W * 0.5 + sway2, H * 0.95, 150, c1, 0.18);
      if (phase === 1) beam(W * 0.5, 0, W * 0.70, H * 0.92, 130, '#fb923c', 0.36);
      else if (phase === 2) beam(W * 0.5, 0, W * 0.30, H * 0.92, 135, '#e2e8f0', 0.38);
      else if (phase >= 3) {
        beam(W * 0.5, 0, W * 0.5, H * 0.95, 190, '#fbbf24', 0.48);
        beam(W * 0.25, 0, W * 0.5, H * 0.90, 140, c1, 0.26);
        beam(W * 0.75, 0, W * 0.5, H * 0.90, 140, c2, 0.26);
      }
      t += 0.022;
      rafId = requestAnimationFrame(frame);
    }
    frame();
  }

  /* ── Ambient Golden & World Bokeh Particles ── */
  function particles(canvas, worldId) {
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    if (partTimer) clearInterval(partTimer);
    const C = { royal:['#fbbf24','#fef08a','#c084fc'], cosmic:['#22d3ee','#818cf8','#f472b6'], treasure:['#fbbf24','#f59e0b','#fde047'], stadium:['#34d399','#38bdf8','#fbbf24'], oasis:['#34d399','#6ee7b7','#fde047'], magic:['#c084fc','#f472b6','#38bdf8'] };
    const pal = C[worldId] || C.royal;
    let W = (canvas.width = canvas.offsetWidth || 960), H = (canvas.height = canvas.offsetHeight || 640);
    const mk = () => ({ x: Math.random() * W, y: H + 10, vx: (Math.random() - 0.5) * 1.1, vy: -(0.7 + Math.random() * 1.7), r: 2 + Math.random() * 3.8, op: 0.35 + Math.random() * 0.55, col: pal[Math.floor(Math.random() * 3)] });
    const pts = Array.from({ length: 34 }, () => { const p = mk(); p.y = Math.random() * H; return p; });
    partTimer = setInterval(() => {
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -15) Object.assign(p, mk());
        ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = p.op; ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 6.28); ctx.fill(); ctx.restore();
      }
    }, 33);
  }

  function setMysteryScore(rank, score, color) {
    const el = $(`podiumMystery_${rank}`);
    if (!el) return;
    el.style.color = color || '#fef08a';
    el.textContent = `${score} نقطة`;
  }

  /* ── renderHostPodium ── */
  function renderHostPodium(stage, currentRoom) {
    if (!stage || !currentRoom) return;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (partTimer) { clearInterval(partTimer); partTimer = null; }
    if (cTimer) { clearTimeout(cTimer); cTimer = null; }
    spotCanvas = null; revealStep = 0;

    const wid = currentRoom.world?.id || currentRoom.worldId || 'royal';
    const sorted = [...(currentRoom.players || [])].sort((a, b) => (b.score || 0) - (a.score || 0));
    const p1 = sorted[0] || { name: 'البطل الأول', score: 1250, avatarId: 'char_01' };
    const p2 = sorted[1] || { name: 'الوصيف الثاني', score: 980, avatarId: 'char_02' };
    const p3 = sorted[2] || { name: 'الفائز الثالث', score: 820, avatarId: 'char_03' };
    players = [p1, p2, p3, sorted[3], sorted[4]].filter(Boolean);
    room = currentRoom;

    if (global.ScoreARAudio?.playMusic) global.ScoreARAudio.playMusic('victory', 0.28);

    const P1 = pedestal3D(1, 175, 215);
    const P2 = pedestal3D(2, 132, 185);
    const P3 = pedestal3D(3, 100, 170);

    stage.innerHTML = `
<style>
  #podiumStageRoot{position:absolute;inset:0;display:flex;flex-direction:column;font-family:Cairo,Tajawal,Arial,sans-serif;background:#070514;overflow:hidden;}
  @keyframes crownDrop{0%{transform:translateY(-36px) scale(0.4);opacity:0;}70%{transform:translateY(4px) scale(1.12);opacity:1;}100%{transform:translateY(0) scale(1);opacity:1;}}
  @keyframes floatUp{0%{transform:translateY(0);opacity:1;}100%{transform:translateY(-220px);opacity:0;}}
  @keyframes stageRingPulse{0%,100%{transform:translateX(-50%) rotateX(74deg) scale(1);opacity:0.75;}50%{transform:translateX(-50%) rotateX(74deg) scale(1.05);opacity:1;}}
  @keyframes heroPopIn{0%{opacity:0;transform:translateY(32px) scale(0.72);}100%{opacity:1;transform:translateY(0) scale(1);}}
</style>
<div id="podiumStageRoot">
  <!-- Kahoot Royal Stage Backdrop + World Video -->
  <div style="position:absolute;inset:0;z-index:0;overflow:hidden;">
    <video autoplay loop muted playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(0.35) saturate(1.25);" onerror="this.style.display='none'"><source src="assets/videos/worlds/${wid}.mp4" type="video/mp4"></video>
    <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 22%, rgba(91,33,182,0.52) 0%, rgba(30,27,75,0.78) 48%, rgba(6,5,18,0.96) 100%);"></div>
  </div>
  <canvas id="scSpot" style="position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;"></canvas>
  <canvas id="scPart" style="position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;opacity:0.88;transition:opacity 0.8s;"></canvas>
  <div id="scReact" style="position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:150;"></div>

  <!-- Top Championship Header -->
  <header class="podium-header-bar" style="position:relative;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:10px 20px;background:rgba(10,8,28,0.88);backdrop-filter:blur(18px);border-bottom:1px solid rgba(251,191,36,0.22);flex-shrink:0;gap:10px;flex-wrap:wrap;">
    <div style="display:flex;gap:8px;align-items:center;">
      <button onclick="ScoreARQuizHost.closeHostSession?.()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 14px;border-radius:10px;font-weight:800;font-size:12px;cursor:pointer;font-family:inherit;">✕ إنهاء</button>
      <button id="scAudioBtn" onclick="ScoreARPodiumEffects.toggleAudioMute()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 12px;border-radius:10px;font-size:13px;cursor:pointer;">🔊</button>
    </div>
    <div style="display:flex;align-items:center;gap:10px;background:linear-gradient(90deg,rgba(245,158,11,0.15),rgba(251,191,36,0.32),rgba(245,158,11,0.15));border:1.5px solid rgba(251,191,36,0.55);padding:5px 22px;border-radius:999px;box-shadow:0 0 24px rgba(245,158,11,0.3);">
      <span style="font-size:18px;">🏆</span>
      <span style="font-size:16px;font-weight:900;color:#fef3c7;letter-spacing:0.4px;text-shadow:0 2px 10px rgba(0,0,0,0.8);">منصة التتويج الكبرى — سكور آر</span>
    </div>
    <div style="font-size:13px;color:#cbd5e1;font-weight:800;background:rgba(255,255,255,0.06);padding:5px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);">المتسابقون: <b style="color:#38bdf8;">${sorted.length}</b></div>
  </header>

  <!-- Main 3D Podium Arena -->
  <main style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;overflow:hidden;padding-bottom:18px;">
    <!-- 3D Glowing Perspective Stage Floor Ring -->
    <div id="podiumArenaFloor" style="position:absolute;bottom:-65px;left:50%;width:min(880px,96vw);height:210px;border-radius:50%;background:radial-gradient(ellipse at center, rgba(251,191,36,0.28) 0%, rgba(139,92,246,0.24) 45%, rgba(15,23,42,0) 75%);border:3px solid rgba(251,191,36,0.45);box-shadow:0 0 55px rgba(139,92,246,0.5), inset 0 0 40px rgba(251,191,36,0.35);animation:stageRingPulse 4s ease-in-out infinite;pointer-events:none;z-index:1;"></div>

    <!-- podiumCameraRig: 3D columns with clear separation -->
    <div id="podiumCameraRig" data-id="podiumCameraRig" style="position:relative;z-index:5;display:flex;align-items:flex-end;justify-content:center;gap:26px;width:100%;transition:transform 0.8s cubic-bezier(0.25,1,0.5,1);transform-origin:50% 95%;padding-bottom:6px;">
      <div id="climax${wid.charAt(0).toUpperCase() + wid.slice(1)}" style="display:none;position:absolute;inset:0;pointer-events:none;z-index:7;"></div>

      <!-- 2nd Place Column -->
      <div id="col_2" style="display:flex;flex-direction:column;align-items:center;">
        <div id="podiumHeroArea_2" style="display:none;flex-direction:column;align-items:center;animation:heroPopIn 0.55s cubic-bezier(0.34,1.56,0.64,1) both;">
          <div id="hm_2" style="height:205px;width:160px;display:flex;align-items:flex-end;justify-content:center;">${heroImg(p2.avatarId, p2.name, 'celebrate')}</div>
          <div style="background:linear-gradient(135deg,#1e293b,#0f172a);border:2px solid #e2e8f0;border-radius:12px;padding:5px 16px;margin-bottom:6px;box-shadow:0 6px 20px rgba(0,0,0,0.7),0 0 18px rgba(226,232,240,0.45);display:flex;align-items:center;gap:6px;z-index:8;">
            <span style="font-size:15px;">🥈</span>
            <span style="font-size:14px;font-weight:900;color:#f8fafc;">${esc(p2.name)}</span>
          </div>
        </div>
        ${P2}
      </div>

      <!-- 1st Place Column (Grand Champion) -->
      <div id="col_1" style="display:flex;flex-direction:column;align-items:center;z-index:6;">
        <div id="podiumHeroArea_1" style="display:none;flex-direction:column;align-items:center;position:relative;animation:heroPopIn 0.65s cubic-bezier(0.34,1.56,0.64,1) both;">
          <div id="hm_1" style="height:248px;width:195px;display:flex;align-items:flex-end;justify-content:center;">${heroImg(p1.avatarId, p1.name, 'celebrate')}</div>
          <span id="championCrownEl" style="position:absolute;top:-52px;font-size:40px;visibility:hidden;animation:crownDrop 0.8s cubic-bezier(0.34,1.56,0.64,1);filter:drop-shadow(0 0 24px #fef08a);z-index:12;pointer-events:none;">👑<span id="scCrown" style="display:none;"></span></span>
          <div style="background:linear-gradient(135deg,#78350f,#451a03);border:2.5px solid #fef08a;border-radius:14px;padding:6px 22px;margin-bottom:8px;box-shadow:0 8px 25px rgba(0,0,0,0.8),0 0 28px rgba(251,191,36,0.65);display:flex;align-items:center;gap:8px;z-index:8;">
            <span style="font-size:18px;">🥇</span>
            <span style="font-size:16px;font-weight:900;color:#fef08a;letter-spacing:0.4px;">${esc(p1.name)}</span>
          </div>
        </div>
        ${P1}
      </div>

      <!-- 3rd Place Column -->
      <div id="col_3" style="display:flex;flex-direction:column;align-items:center;">
        <div id="podiumHeroArea_3" style="display:none;flex-direction:column;align-items:center;animation:heroPopIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both;">
          <div id="hm_3" style="height:182px;width:145px;display:flex;align-items:flex-end;justify-content:center;">${heroImg(p3.avatarId, p3.name, 'celebrate')}</div>
          <div style="background:linear-gradient(135deg,#431407,#270902);border:2px solid #fed7aa;border-radius:12px;padding:5px 14px;margin-bottom:6px;box-shadow:0 6px 18px rgba(0,0,0,0.7),0 0 16px rgba(251,146,60,0.4);display:flex;align-items:center;gap:6px;z-index:8;">
            <span style="font-size:15px;">🥉</span>
            <span style="font-size:13px;font-weight:900;color:#ffedd5;">${esc(p3.name)}</span>
          </div>
        </div>
        ${P3}
      </div>
    </div>

    <!-- Full Contestants Roster Modal -->
    <div id="scRoster" style="display:none;position:absolute;top:56px;left:50%;transform:translateX(-50%);width:min(820px,94%);background:rgba(8,8,24,0.97);backdrop-filter:blur(22px);border:1.5px solid rgba(251,191,36,0.35);border-radius:20px;padding:18px 22px;z-index:35;max-height:calc(100% - 140px);overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,0.85);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="font-size:15px;font-weight:900;color:#fef08a;">📋 الترتيب النهائي لكافة المتسابقين (${sorted.length})</div>
        <button onclick="document.getElementById('scRoster').style.display='none'" style="background:rgba(255,255,255,0.1);border:0;color:#fff;border-radius:8px;padding:4px 10px;cursor:pointer;font-weight:800;">✕ إغلاق</button>
      </div>
      ${sorted.map((p, i) => `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <div style="display:flex;align-items:center;gap:10px;"><span style="font-size:13px;font-weight:900;color:${i<3?'#fcd34d':'#94a3b8'};min-width:28px;">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</span><img src="assets/characters/animated/${p.avatarId||'char_01'}-idle.webp" onerror="this.src='assets/characters/animated/char_01-idle.webp'" style="width:26px;height:32px;object-fit:contain;"><span style="font-size:14px;font-weight:800;color:#f8fafc;">${esc(p.name)}</span></div>
        <span style="font-size:15px;font-weight:900;color:#34d399;font-family:monospace;">${p.score||0} <small style="font-size:11px;color:#94a3b8;">نقطة</small></span>
      </div>`).join('')}
    </div>
  </main>

  <!-- Control & Motion Bar -->
  <footer class="podium-footer-bar" style="position:relative;z-index:30;background:rgba(8,8,24,0.94);backdrop-filter:blur(16px);border-top:1px solid rgba(255,255,255,0.1);padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;flex-shrink:0;">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <button id="scRevBtn" onclick="ScoreARPodiumEffects.advanceReveal()" style="background:linear-gradient(135deg,#f59e0b,#b45309);color:#fff;font-size:13px;font-weight:900;border:1px solid #fef08a;border-radius:12px;padding:9px 20px;cursor:pointer;box-shadow:0 4px 18px rgba(245,158,11,0.45);font-family:inherit;">🥉 كشف المركز الثالث</button>
      <button id="scCinBtn" onclick="ScoreARPodiumEffects.startCinematicShow()" style="background:linear-gradient(135deg,#8b5cf6,#4f46e5);color:#fff;font-size:12px;font-weight:900;border:1px solid rgba(196,181,253,0.4);border-radius:12px;padding:9px 16px;cursor:pointer;box-shadow:0 4px 14px rgba(139,92,246,0.45);font-family:inherit;">🎬 عرض سينمائي تلقائي</button>
      <button onclick="ScoreARPodiumEffects.revealAll()" style="background:rgba(255,255,255,0.1);color:#f1f5f9;font-size:12px;font-weight:800;border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:8px 16px;cursor:pointer;font-family:inherit;">⚡ كشف الكل فوراً</button>
      <div id="scExport" style="display:none;gap:6px;flex-wrap:wrap;">
        <button onclick="ScoreARPodiumEffects.triggerSnapshot()" style="background:linear-gradient(135deg,#0ea5e9,#0369a1);color:#fff;font-size:11px;font-weight:900;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;font-family:inherit;">📸 صورة المنصة</button>
        <button onclick="ScoreARPodiumEffects.triggerCertificates()" style="background:linear-gradient(135deg,#10b981,#047857);color:#fff;font-size:11px;font-weight:900;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;font-family:inherit;">🎓 الشهادات</button>
      </div>
    </div>
    <div style="display:flex;gap:5px;align-items:center;background:rgba(15,15,38,0.92);padding:4px 10px;border-radius:12px;border:1px solid rgba(255,255,255,0.14);">
      <span style="font-size:11px;font-weight:900;color:#cbd5e1;white-space:nowrap;">حركة الأبطال:</span>
      <button data-podium-motion="celebrate" onclick="ScoreARPodiumEffects.setHeroPose('celebrate')" style="background:rgba(82,217,237,0.22);border:1px solid #52d9ed;color:#fff;padding:4px 9px;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;" title="احتفال وقفز">🎉</button>
      <button data-podium-motion="idle"      onclick="ScoreARPodiumEffects.setHeroPose('idle')"      style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.18);color:#fff;padding:4px 9px;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;" title="وقوف">🧍</button>
      <button data-podium-motion="walk"      onclick="ScoreARPodiumEffects.setHeroPose('walk')"      style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.18);color:#fff;padding:4px 9px;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;" title="مشي">🚶</button>
      <button data-podium-motion="run"       onclick="ScoreARPodiumEffects.setHeroPose('run')"       style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.18);color:#fff;padding:4px 9px;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;" title="جري">🏃</button>
      <button data-podium-motion="climb" onclick="ScoreARPodiumEffects.setHeroPose('celebrate')" style="display:none;" aria-hidden="true"></button>
      <button data-podium-motion="fly"   onclick="ScoreARPodiumEffects.setHeroPose('celebrate')" style="display:none;" aria-hidden="true"></button>
    </div>
  </footer>
</div>`;

    setTimeout(() => {
      const sc = $('scSpot'), pc = $('scPart');
      if (sc) runSpotlights(sc, wid, 0);
      if (pc) particles(pc, wid);
    }, 50);

    if (global.ScoreARRealtime) {
      global.ScoreARRealtime.publish('CONTEST_COMPLETED', { podium: [p1, p2, p3].filter(Boolean), totalPlayers: sorted.length, leaderboard: sorted });
    }
  }

  /* ── Stepwise Kahoot Reveal (Immediate DOM update + Spotlights & Confetti) ── */
  function advanceReveal() {
    revealStep++;
    const rig = $('podiumCameraRig'), btn = $('scRevBtn'), wid = room?.world?.id || room?.worldId || 'royal';
    const sc = $('scSpot');
    if (revealStep === 1) {
      sfx('whoosh'); sfx('pop');
      if (sc) runSpotlights(sc, wid, 1);
      const h3 = $('podiumHeroArea_3');
      if (h3) { h3.style.display = 'flex'; mountHero($('hm_3'), players[2]?.avatarId, currentPose); }
      setMysteryScore(3, players[2]?.score || 0, '#fed7aa');
      if (btn) { btn.textContent = '🥈 كشف المركز الثاني'; btn.style.background = 'linear-gradient(135deg,#64748b,#334155)'; }
    } else if (revealStep === 2) {
      sfx('whoosh'); sfx('pop');
      if (sc) runSpotlights(sc, wid, 2);
      const h2 = $('podiumHeroArea_2');
      if (h2) { h2.style.display = 'flex'; mountHero($('hm_2'), players[1]?.avatarId, currentPose); }
      setMysteryScore(2, players[1]?.score || 0, '#e2e8f0');
      if (btn) { btn.textContent = '👑 كشف بطل الأبطال!'; btn.style.background = 'linear-gradient(135deg,#059669,#047857)'; }
    } else if (revealStep === 3) {
      sfx('drumroll'); sfx('fanfare');
      if (sc) runSpotlights(sc, wid, 3);
      if (rig) rig.style.transform = 'scale(1.02)';
      const h1 = $('podiumHeroArea_1'), crown = $('championCrownEl'), pc = $('scPart');
      if (h1) { h1.style.display = 'flex'; mountHero($('hm_1'), players[0]?.avatarId, currentPose); }
      if (crown) crown.style.visibility = 'visible';
      if (pc) pc.style.opacity = '1';
      setMysteryScore(1, players[0]?.score || 0, '#fef08a');
      if (global.confetti) {
        global.confetti({ particleCount: 200, spread: 165, origin: { y: 0.5 } });
        setTimeout(() => global.confetti && global.confetti({ particleCount: 140, spread: 140, angle: 60, origin: { x: 0, y: 0.6 } }), 300);
        setTimeout(() => global.confetti && global.confetti({ particleCount: 140, spread: 140, angle: 120, origin: { x: 1, y: 0.6 } }), 600);
      }
      $('scExport')?.style.setProperty('display', 'flex');
      if (btn) { btn.textContent = '📋 الترتيب النهائي الكامل'; btn.style.background = 'linear-gradient(135deg,#4f46e5,#3730a3)'; }
    } else if (revealStep >= 4) {
      if (rig) rig.style.transform = 'scale(1)';
      const r = $('scRoster'); if (r) { r.style.display = 'block'; }
      if (btn) { btn.textContent = '✕ إنهاء المسابقة'; btn.onclick = () => global.ScoreARQuizHost?.closeHostSession?.(); }
    }
  }

  function startCinematicShow() {
    if (cTimer) { clearTimeout(cTimer); cTimer = null; }
    const btn = $('scCinBtn'); if (btn) btn.disabled = true;
    revealStep = 0;
    advanceReveal();
    cTimer = setTimeout(() => { advanceReveal(); cTimer = setTimeout(() => advanceReveal(), 1800); }, 1600);
  }

  function revealAll() {
    if (cTimer) { clearTimeout(cTimer); cTimer = null; }
    revealStep = 2;
    [3, 2].forEach(r => {
      const h = $(`podiumHeroArea_${r}`), hm = $(`hm_${r}`), pl = players[r === 2 ? 1 : 2];
      if (h) h.style.display = 'flex';
      if (pl && hm) mountHero(hm, pl.avatarId, currentPose);
      setMysteryScore(r, pl?.score || 0, r === 2 ? '#e2e8f0' : '#fed7aa');
    });
    advanceReveal();
  }

  function setHeroPose(pose) {
    currentPose = POSES.includes(pose) ? pose : 'celebrate';
    [1, 2, 3].forEach(r => { const box = $(`hm_${r}`); if (!box) return; const pl = players[r === 1 ? 0 : r === 2 ? 1 : 2]; if (pl) mountHero(box, pl.avatarId, currentPose); });
    document.querySelectorAll('[data-podium-motion]').forEach(b => { const a = b.dataset.podiumMotion === currentPose; b.style.background = a ? 'rgba(82,217,237,0.22)' : 'rgba(255,255,255,0.07)'; b.style.borderColor = a ? '#52d9ed' : 'rgba(255,255,255,0.18)'; });
  }

  function toggleAudioMute() { if (global.ScoreARAudio?.toggleMute) { const m = global.ScoreARAudio.toggleMute(); const b = $('scAudioBtn'); if (b) b.textContent = m ? '🔇' : '🔊'; } }
  function triggerSnapshot() { global.ScoreARPodiumCapture?.capturePodiumSnapshot?.($('scorearQuizHostStage') || document.body, room, players); }
  function triggerCertificates() { global.ScoreARPodiumCapture?.downloadAllTop3Certificates?.(players, room?.world?.id || 'royal'); }
  function handleStudentReaction(emoji, name) {
    const c = $('scReact'); if (!c) return;
    const b = document.createElement('div');
    b.style.cssText = `position:absolute;bottom:80px;left:${10 + Math.random() * 80}%;font-size:32px;display:flex;flex-direction:column;align-items:center;pointer-events:none;animation:floatUp 2.5s ease-out forwards;z-index:200;`;
    b.innerHTML = `<span>${esc(emoji || '👏')}</span><small style="background:rgba(4,4,16,0.9);color:#fff;border:1px solid rgba(255,255,255,0.18);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:900;">${esc(name || 'بطل')}</small>`;
    c.appendChild(b); b.addEventListener('animationend', () => b.remove());
  }
  function renderHero(avatarId, name, pose = 'celebrate') { return heroImg(avatarId, name, pose); }

  const ScoreARPodiumEffects = { renderHostPodium, renderHero, advanceReveal, startCinematicShow, revealAll, setHeroPose, toggleAudioMute, triggerSnapshot, triggerCertificates, handleStudentReaction, mountHeroMotion: mountHero };
  global.ScoreARPodiumEffects = ScoreARPodiumEffects;
  try { if (typeof globalThis !== 'undefined') globalThis.ScoreARPodiumEffects = ScoreARPodiumEffects; } catch(e){}
  if (typeof module !== 'undefined' && module.exports) module.exports = ScoreARPodiumEffects;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
