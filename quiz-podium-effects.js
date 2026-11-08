/**
 * ScoreAR World-Themed Podium Visual Effects & Suspense Ceremony (quiz-podium-effects.js)
 * Implements:
 * 1. World-specific Canvas/SVG climax effects (royal, cosmic, treasure, stadium, oasis, magic).
 * 2. Suspenseful step-by-step camera zoom/pan rig (3rd -> 2nd -> 1st Grand Champion) with drumroll ticking & fanfare.
 * 3. Top 3 points display & interactive capture / certificate download triggers.
 * 4. Audio mute toggle and realtime floating student reaction bubbles.
 * Hardware-accelerated transforms, strictly Rule 7 compliant (<350 lines).
 */
(function(global) {
  'use strict';

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  }
  function sfx(name) {
    if (global.ScoreARAudio?.playSfx) global.ScoreARAudio.playSfx(name);
  }

  let revealStep = 0; // 0: hidden, 1: 3rd, 2: 2nd, 3: 1st, 4: full roster
  let currentPodiumPlayers = [], currentPodiumRoom = null;
  let activeAnimationId = null, activeCanvas = null;

  // --- 1. World Canvas Particles Engine ---
  function initWorldCanvas(canvasEl, worldId) {
    if (!canvasEl) return;
    activeCanvas = canvasEl;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    let w = (canvasEl.width = canvasEl.offsetWidth || window.innerWidth);
    let h = (canvasEl.height = canvasEl.offsetHeight || window.innerHeight);
    window.addEventListener('resize', () => {
      if (!activeCanvas) return;
      w = activeCanvas.width = activeCanvas.offsetWidth || window.innerWidth;
      h = activeCanvas.height = activeCanvas.offsetHeight || window.innerHeight;
    });

    const isReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const count = isReduced ? 15 : ((worldId === 'treasure' || worldId === 'stadium') ? 55 : 35);
    const colors = {
      royal: ['#f59e0b', '#fbbf24', '#fef08a'],
      cosmic: ['#22d3ee', '#818cf8', '#c084fc'],
      treasure: ['#fbbf24', '#f59e0b', '#d97706'],
      stadium: ['#ef4444', '#3b82f6', '#10b981'],
      oasis: ['#34d399', '#10b981', '#6ee7b7'],
      magic: ['#c084fc', '#a855f7', '#38bdf8']
    };
    const pal = colors[worldId] || colors.royal;
    const createP = (init) => ({
      x: Math.random() * w, y: init ? Math.random() * h : (worldId === 'treasure' ? -15 : h + 15),
      vx: (Math.random() - 0.5) * 1.6, vy: worldId === 'treasure' ? (2 + Math.random() * 2.5) : (-1.2 - Math.random() * 1.8),
      size: worldId === 'treasure' ? (7 + Math.random() * 7) : (3 + Math.random() * 4),
      angle: Math.random() * 6.28, vAngle: (Math.random() - 0.5) * 0.08,
      alpha: 0.35 + Math.random() * 0.65, color: pal[Math.floor(Math.random() * pal.length)]
    });

    const particles = Array.from({ length: count }, () => createP(true));
    function loop() {
      if (!activeCanvas) return;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.angle += p.vAngle;
        if (worldId === 'treasure') { if (p.y > h + 15) Object.assign(p, createP(false)); }
        else { if (p.y < -25 || p.x < -20 || p.x > w + 20) Object.assign(p, createP(false)); }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
        ctx.beginPath();
        if (worldId === 'treasure') ctx.ellipse(0, 0, p.size * Math.abs(Math.cos(p.angle)), p.size, 0, 0, 6.28);
        else ctx.arc(0, 0, p.size, 0, 6.28);
        ctx.fill(); ctx.restore();
      }
      activeAnimationId = requestAnimationFrame(loop);
    }
    loop();
  }

  // --- 2. World Climax SVG Overlays ---
  const CLIMAX_SVGS = {
    royal: `<div id="climaxRoyalThrone" style="position:absolute;top:65px;left:50%;transform:translateX(-50%);z-index:15;pointer-events:none;opacity:0;transition:opacity 0.6s;"><svg width="220" height="90" viewBox="0 0 220 90"><path d="M20 70 L60 20 L110 50 L160 20 L200 70 Z" fill="#f59e0b" stroke="#fef08a" stroke-width="3"/><circle cx="60" cy="18" r="8" fill="#fef08a"/><circle cx="110" cy="48" r="8" fill="#fef08a"/><circle cx="160" cy="18" r="8" fill="#fef08a"/></svg></div>`,
    cosmic: `<div id="climaxCosmicLaunch" style="position:absolute;bottom:80px;left:50%;transform:translateX(-50%);z-index:5;pointer-events:none;opacity:0;transition:opacity 0.6s;"><svg width="160" height="120" viewBox="0 0 160 120"><ellipse cx="80" cy="95" rx="65" ry="20" fill="rgba(6,182,212,0.4)"/><path d="M65 95 L80 20 L95 95 Z" fill="#38bdf8"/></svg></div>`,
    treasure: `<div id="climaxTreasureChest" style="position:absolute;bottom:40px;right:5%;z-index:15;pointer-events:none;opacity:0;transition:opacity 0.6s;"><svg width="120" height="80" viewBox="0 0 120 80"><rect x="15" y="30" width="90" height="45" rx="6" fill="#78350f" stroke="#fbbf24" stroke-width="3"/><path id="treasureChestLid" d="M15 30 Q60 5 105 30 Z" fill="#b45309" stroke="#fbbf24" stroke-width="3" style="transform-origin:15px 30px;"/><circle cx="60" cy="42" r="5" fill="#fef08a"/></svg></div>`,
    stadium: `<div id="climaxStadiumTrophy" style="position:absolute;top:60px;left:50%;transform:translateX(-50%);z-index:15;pointer-events:none;opacity:0;transition:opacity 0.6s;"><div style="position:absolute;top:-10px;left:-140px;width:100px;height:200px;background:linear-gradient(135deg,rgba(255,255,255,0.4),transparent);animation:floodlightSweep 2.8s infinite alternate;"></div><div style="position:absolute;top:-10px;right:-140px;width:100px;height:200px;background:linear-gradient(225deg,rgba(255,255,255,0.4),transparent);animation:floodlightSweep 2.8s infinite alternate-reverse;"></div><svg width="110" height="85" viewBox="0 0 110 85"><path d="M35 15 L75 15 L68 50 Q55 62 42 50 Z" fill="#f59e0b" stroke="#fef08a" stroke-width="2.5"/><rect x="47" y="58" width="16" height="14" fill="#d97706"/><rect x="38" y="72" width="34" height="8" rx="2" fill="#92400e"/></svg></div>`,
    oasis: `<div id="climaxOasisJets" style="position:absolute;bottom:0;inset-x:0;height:100px;pointer-events:none;z-index:15;opacity:0;transition:opacity 0.6s;display:flex;justify-content:space-around;"><div style="width:14px;height:80px;background:linear-gradient(to top,#34d399,transparent);border-radius:7px;animation:fountainJetRise 1.4s infinite alternate;"></div><div style="width:18px;height:100px;background:linear-gradient(to top,#6ee7b7,transparent);border-radius:9px;animation:fountainJetRise 1.2s infinite alternate 0.3s;"></div><div style="width:14px;height:80px;background:linear-gradient(to top,#34d399,transparent);border-radius:7px;animation:fountainJetRise 1.4s infinite alternate 0.6s;"></div></div>`,
    magic: `<div id="climaxMagicCircle" style="position:absolute;top:60%;left:50%;transform:translate(-50%,-50%);z-index:5;pointer-events:none;opacity:0;transition:opacity 0.6s;"><svg width="280" height="280" viewBox="0 0 280 280" style="animation:spellCircleSpin 8s linear infinite;"><circle cx="140" cy="140" r="120" stroke="#c084fc" stroke-width="2" stroke-dasharray="8 6"/><polygon points="140,30 240,200 40,200" stroke="#fef08a" stroke-width="2" fill="none"/><polygon points="140,250 40,80 240,80" stroke="#38bdf8" stroke-width="2" fill="none"/></svg></div>`
  };

  function renderHero(avatarId, name) {
    const num = Math.max(1, Math.min(20, parseInt(String(avatarId || '1').replace(/\D/g, '') || '1', 10)));
    const code = 'char_' + String(num).padStart(2, '0');
    return `<div class="character-podium-hero" style="width:100%;height:100%;display:flex;align-items:flex-end;justify-content:center;filter:drop-shadow(0 14px 24px rgba(0,0,0,0.7));">
      <img src="assets/characters/animated/${code}-idle.webp" onerror="this.src='assets/characters/animated/char_01-idle.webp'" alt="${escapeHtml(name||'البطل')}" style="max-height:100%;max-width:100%;object-fit:contain;animation:character-joy 1.1s ease-in-out infinite;">
    </div>`;
  }

  // --- 3. Stepwise Podium Controller & Renderer ---
  function renderHostPodium(stage, currentRoom, closeHostSession) {
    if (!stage || !currentRoom) return;
    if (activeAnimationId) cancelAnimationFrame(activeAnimationId);

    const worldId = currentRoom.world?.id || currentRoom.worldId || 'royal';
    const sorted = [...(currentRoom.players || [])].sort((a, b) => (b.score || 0) - (a.score || 0));
    const p1 = sorted[0] || { name: 'البطل الأول', score: 0, avatarId: 'char_01' };
    const p2 = sorted[1] || { name: 'الوصيف الثاني', score: 0, avatarId: 'char_02' };
    const p3 = sorted[2] || { name: 'المركز الثالث', score: 0, avatarId: 'char_03' };
    currentPodiumPlayers = [p1, p2, p3];
    currentPodiumRoom = currentRoom;
    revealStep = 0;
    const isMuted = global.ScoreARAudio?.isMuted?.() || false;

    stage.innerHTML = `
      <div style="position:absolute;inset:0;overflow:hidden;z-index:0;background:url('assets/worlds/${worldId}/podium.jpg') center/cover no-repeat;">
        <video autoplay loop muted playsinline poster="assets/worlds/${worldId}/podium.jpg" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;filter:brightness(0.52);" onerror="this.style.display='none'">
          <source src="assets/videos/worlds/${worldId}.mp4" type="video/mp4">
        </video>
        <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 25%, rgba(12,13,30,0.35) 0%, rgba(12,13,30,0.92) 100%);z-index:2;"></div>
      </div>
      <canvas id="scorearWorldCanvas" style="position:absolute;inset:0;width:100%;height:100%;z-index:3;pointer-events:none;"></canvas>
      ${CLIMAX_SVGS[worldId] || CLIMAX_SVGS.royal}
      <div id="hostFloatingReactionsContainer" style="position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:150;"></div>

      <header style="position:relative;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:12px 24px;background:rgba(12,13,30,0.85);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,0.12);">
        <div style="display:flex;align-items:center;gap:10px;">
          <button onclick="ScoreARQuizHost.closeHostSession()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:8px 14px;border-radius:10px;font-weight:800;font-size:12px;cursor:pointer;">✕ إنهاء القاعة</button>
          <button id="podiumAudioToggleBtn" onclick="ScoreARPodiumEffects.toggleAudioMute()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:8px 12px;border-radius:10px;font-size:13px;cursor:pointer;">${isMuted ? '🔇 كتم الصوت' : '🔊 الصوت نشط'}</button>
        </div>
        <div style="font-size:22px;font-weight:900;color:#fef3c7;display:flex;align-items:center;gap:10px;">👑 منصة تتويج ScoreAR 👑</div>
        <div style="font-size:13px;color:#94a3b8;font-weight:700;">المتسابقون: <b style="color:#52d9ed;">${sorted.length}</b></div>
      </header>

      <main style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:14px 20px 20px;overflow-y:auto;overflow-x:hidden;">
        <div id="podiumCameraRig" style="width:100%;display:flex;justify-content:center;transition:transform 0.85s cubic-bezier(0.25, 1, 0.5, 1);transform-origin:50% 65%;transform:scale(1) translate(0,0);">
          <div style="display:flex;align-items:flex-end;justify-content:center;gap:18px;margin-top:15px;min-height:360px;">
            <!-- 2nd (Silver) -->
            <div id="podiumCol_2" style="display:flex;flex-direction:column;align-items:center;">
              <div id="podiumHeroArea_2" style="display:none;opacity:0;transform:translateY(35px) scale(0.7);transition:all 0.65s cubic-bezier(0.34, 1.56, 0.64, 1);flex-direction:column;align-items:center;">
                <div style="height:195px;width:155px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:8px;">${renderHero(p2.avatarId, p2.name)}</div>
                <div style="background:rgba(15,23,42,0.95);border:2px solid #cbd5e1;border-radius:14px;padding:6px 16px;color:#fff;font-size:14px;font-weight:900;margin-bottom:8px;max-width:155px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">🥈 ${escapeHtml(p2.name)}</div>
              </div>
              <div id="podiumPedestal_2" style="width:155px;height:95px;background:linear-gradient(180deg, #94a3b8, #475569);border-top-left-radius:18px;border-top-right-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.3);border-bottom:none;box-shadow:0 10px 24px rgba(0,0,0,0.6);">
                <div style="font-size:28px;">🥈</div><div id="podiumMystery_2" style="font-size:12px;font-weight:900;color:#e2e8f0;background:rgba(0,0,0,0.35);padding:3px 10px;border-radius:10px;margin-top:4px;">❓ من البطل؟</div>
              </div>
            </div>
            <!-- 1st (Gold) -->
            <div id="podiumCol_1" style="display:flex;flex-direction:column;align-items:center;">
              <div id="podiumHeroArea_1" style="display:none;opacity:0;transform:translateY(45px) scale(0.7);transition:all 0.75s cubic-bezier(0.34, 1.56, 0.64, 1);flex-direction:column;align-items:center;">
                <div id="championCrownEl" style="font-size:36px;margin-bottom:-10px;z-index:2;animation:crownDescend 0.8s ease-out;">👑</div>
                <div style="height:225px;width:175px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:8px;">${renderHero(p1.avatarId, p1.name)}</div>
                <div style="background:rgba(15,23,42,0.95);border:2px solid #f59e0b;border-radius:14px;padding:8px 18px;color:#fff;font-size:16px;font-weight:900;margin-bottom:8px;max-width:175px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">🥇 ${escapeHtml(p1.name)}</div>
              </div>
              <div id="podiumPedestal_1" style="width:175px;height:125px;background:linear-gradient(180deg, #f59e0b, #b45309);border-top-left-radius:20px;border-top-right-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:2.5px solid #fef08a;border-bottom:none;box-shadow:0 12px 30px rgba(0,0,0,0.7);">
                <div style="font-size:34px;">🥇</div><div id="podiumMystery_1" style="font-size:13px;font-weight:900;color:#fef3c7;background:rgba(0,0,0,0.35);padding:4px 12px;border-radius:10px;margin-top:4px;">❓ بطل الأبطال</div>
              </div>
            </div>
            <!-- 3rd (Bronze) -->
            <div id="podiumCol_3" style="display:flex;flex-direction:column;align-items:center;">
              <div id="podiumHeroArea_3" style="display:none;opacity:0;transform:translateY(35px) scale(0.7);transition:all 0.65s cubic-bezier(0.34, 1.56, 0.64, 1);flex-direction:column;align-items:center;">
                <div style="height:175px;width:145px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:8px;">${renderHero(p3.avatarId, p3.name)}</div>
                <div style="background:rgba(15,23,42,0.95);border:2px solid #d97706;border-radius:14px;padding:6px 14px;color:#fff;font-size:14px;font-weight:900;margin-bottom:8px;max-width:145px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">🥉 ${escapeHtml(p3.name)}</div>
              </div>
              <div id="podiumPedestal_3" style="width:145px;height:75px;background:linear-gradient(180deg, #d97706, #78350f);border-top-left-radius:18px;border-top-right-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.3);border-bottom:none;box-shadow:0 10px 24px rgba(0,0,0,0.6);">
                <div style="font-size:26px;">🥉</div><div id="podiumMystery_3" style="font-size:12px;font-weight:900;color:#fed7aa;background:rgba(0,0,0,0.35);padding:3px 10px;border-radius:10px;margin-top:4px;">❓ من البطل؟</div>
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;align-items:center;gap:10px;margin:12px 0;z-index:30;">
          <div id="podiumPromptText" style="font-size:13px;color:#fcd34d;font-weight:800;">👇 اضغط هنا لكشف الأبطال وتتويج الفائزين بالترتيب</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
            <button id="podiumRevealBtn" type="button" onclick="ScoreARPodiumEffects.advanceReveal()" style="background:linear-gradient(135deg, #f59e0b, #d97706);color:#fff;font-size:15px;font-weight:900;border:none;border-radius:16px;padding:12px 28px;cursor:pointer;box-shadow:0 6px 24px rgba(245,158,11,0.5);"><span>🥉 كشف صاحب المركز الثالث</span></button>
            <button id="podiumRevealAllBtn" type="button" onclick="ScoreARPodiumEffects.revealAll()" style="background:rgba(255,255,255,0.12);color:#f1f5f9;font-size:13px;font-weight:800;border:1px solid rgba(255,255,255,0.25);border-radius:14px;padding:10px 18px;cursor:pointer;">⚡ كشف وتتويج الجميع فوراً</button>
            <div id="podiumExportButtonsGroup" style="display:none;gap:10px;">
              <button onclick="ScoreARPodiumEffects.triggerSnapshot()" style="background:linear-gradient(135deg, #0ea5e9, #0284c7);color:#fff;font-size:13px;font-weight:900;border:none;border-radius:14px;padding:10px 16px;cursor:pointer;">📸 التقط الصورة</button>
              <button onclick="ScoreARPodiumEffects.triggerCertificates()" style="background:linear-gradient(135deg, #8b5cf6, #7c3aed);color:#fff;font-size:13px;font-weight:900;border:none;border-radius:14px;padding:10px 16px;cursor:pointer;">🎓 شهادات التقدير</button>
            </div>
          </div>
        </div>

        <div id="podiumFullRosterSection" style="display:none;width:100%;max-width:820px;background:rgba(15,23,42,0.92);backdrop-filter:blur(18px);border:1.5px solid rgba(255,255,255,0.18);border-radius:20px;padding:16px 20px;box-shadow:0 12px 36px rgba(0,0,0,0.6);margin-top:10px;">
          <div style="font-size:15px;font-weight:900;color:#c9baff;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;">
            <span>📋 كشف النتائج والترتيب النهائي لكافة المتسابقين (${sorted.length})</span><span style="font-size:11px;color:#94a3b8;">سكور آر الرسمية</span>
          </div>
          <div style="max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding-right:4px;">
            ${sorted.map((p, idx) => `
              <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <span style="font-size:12px;font-weight:900;color:${idx<3?'#fcd34d':'#94a3b8'};min-width:32px;">${idx===0?'🥇 1':idx===1?'🥈 2':idx===2?'🥉 3':'#'+(idx+1)}</span>
                  <img src="assets/characters/animated/${p.avatarId || 'char_01'}-idle.webp" onerror="this.src='assets/characters/animated/char_01-idle.webp'" alt="${escapeHtml(p.name)}" style="width:26px;height:32px;object-fit:contain;">
                  <span style="font-size:13px;font-weight:800;color:#fff;">${escapeHtml(p.name)}</span>
                </div>
                <div style="font-size:15px;font-weight:900;color:#34d399;font-family:monospace;">${p.score || 0} <span style="font-size:10px;color:#94a3b8;">نقطة</span></div>
              </div>`).join('')}
          </div>
        </div>
      </main>
    `;

    setTimeout(() => {
      const c = document.getElementById('scorearWorldCanvas');
      initWorldCanvas(c, worldId);
    }, 50);

    if (global.ScoreARRealtime) {
      global.ScoreARRealtime.publish('CONTEST_COMPLETED', {
        podium: [p1, p2, p3].filter(Boolean),
        top3: [p1, p2, p3].filter(Boolean),
        totalPlayers: sorted.length,
        leaderboard: sorted
      });
    }
  }

  function advanceReveal() {
    revealStep++;
    const rig = document.getElementById('podiumCameraRig');
    const btn = document.getElementById('podiumRevealBtn');
    const isRed = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const playTicking = (cb) => {
      sfx('tick'); setTimeout(() => { sfx('tick'); setTimeout(() => { sfx('tick'); setTimeout(cb, 100); }, 120); }, 140);
    };

    if (revealStep === 1) {
      if (rig && !isRed) rig.style.transform = 'scale(1.15) translate(-10%, 4%)';
      playTicking(() => {
        sfx('reveal');
        const h3 = document.getElementById('podiumHeroArea_3'), m3 = document.getElementById('podiumMystery_3');
        if (h3) { h3.style.display = 'flex'; h3.offsetHeight; h3.style.opacity = '1'; h3.style.transform = 'translateY(0) scale(1)'; }
        if (m3) { m3.innerHTML = `<b style="font-size:17px;color:#fed7aa;font-family:monospace;">${currentPodiumPlayers[2]?.score || 0}</b> <span style="font-size:10px;">نقطة</span>`; m3.style.background = 'rgba(217,119,6,0.45)'; }
        if (btn) btn.innerHTML = `<span>🥈 كشف صاحب المركز الثاني</span>`;
      });
    } else if (revealStep === 2) {
      if (rig && !isRed) rig.style.transform = 'scale(1.15) translate(10%, 4%)';
      playTicking(() => {
        sfx('reveal');
        const h2 = document.getElementById('podiumHeroArea_2'), m2 = document.getElementById('podiumMystery_2');
        if (h2) { h2.style.display = 'flex'; h2.offsetHeight; h2.style.opacity = '1'; h2.style.transform = 'translateY(0) scale(1)'; }
        if (m2) { m2.innerHTML = `<b style="font-size:19px;color:#f1f5f9;font-family:monospace;">${currentPodiumPlayers[1]?.score || 0}</b> <span style="font-size:10px;">نقطة</span>`; m2.style.background = 'rgba(148,163,184,0.45)'; }
        if (btn) { btn.innerHTML = `<span>👑 كشف بطل القاعة المتوج (المركز الأول) 🏆</span>`; btn.style.background = 'linear-gradient(135deg, #10b981, #059669)'; }
      });
    } else if (revealStep === 3) {
      if (rig && !isRed) rig.style.transform = 'scale(1.22) translate(0, -3%)';
      playTicking(() => {
        sfx('fanfare'); setTimeout(() => sfx('reveal'), 200);
        const h1 = document.getElementById('podiumHeroArea_1'), m1 = document.getElementById('podiumMystery_1');
        if (h1) { h1.style.display = 'flex'; h1.offsetHeight; h1.style.opacity = '1'; h1.style.transform = 'translateY(0) scale(1)'; }
        if (m1) { m1.innerHTML = `<b style="font-size:24px;color:#fef3c7;font-family:monospace;">${currentPodiumPlayers[0]?.score || 0}</b> <span style="font-size:11px;">نقطة</span>`; m1.style.background = 'rgba(245,158,11,0.55)'; }
        const worldId = currentPodiumRoom?.world?.id || currentPodiumRoom?.worldId || 'royal';
        triggerWorldClimax(worldId);
        if (global.confetti) global.confetti({ particleCount: 180, spread: 120, origin: { y: 0.55 } });
        document.getElementById('podiumExportButtonsGroup')?.style.setProperty('display', 'flex');
        document.getElementById('podiumRevealAllBtn')?.style.setProperty('display', 'none');
        document.getElementById('podiumPromptText')?.style.setProperty('display', 'none');
        if (btn) { btn.innerHTML = `<span>📋 كشف الترتيب النهائي</span>`; btn.style.background = 'linear-gradient(135deg, #6366f1, #4f46e5)'; }
      });
    } else if (revealStep >= 4) {
      if (rig) rig.style.transform = 'scale(1) translate(0, 0)';
      const roster = document.getElementById('podiumFullRosterSection');
      if (roster) { roster.style.display = 'block'; roster.scrollIntoView({ behavior: 'smooth' }); }
      if (btn) {
        btn.innerHTML = `<span>✕ إنهاء المسابقة وحفظ التقرير</span>`;
        btn.onclick = () => { if (global.ScoreARQuizHost?.closeHostSession) global.ScoreARQuizHost.closeHostSession(); };
      }
    }
  }

  function triggerWorldClimax(worldId) {
    const el = document.getElementById('climaxRoyalThrone') ||
               document.getElementById('climaxCosmicLaunch') ||
               document.getElementById('climaxTreasureChest') ||
               document.getElementById('climaxStadiumTrophy') ||
               document.getElementById('climaxOasisJets') ||
               document.getElementById('climaxMagicCircle');
    if (el) el.style.opacity = '1';
    if (worldId === 'treasure') {
      const lid = document.getElementById('treasureChestLid');
      if (lid) lid.style.transform = 'rotate(-35deg)';
    }
  }

  function revealAll() {
    while (revealStep < 3) advanceReveal();
  }

  function toggleAudioMute() {
    if (global.ScoreARAudio?.toggleMute) {
      const muted = global.ScoreARAudio.toggleMute();
      const btn = document.getElementById('podiumAudioToggleBtn');
      if (btn) btn.textContent = muted ? '🔇 كتم الصوت' : '🔊 الصوت نشط';
    }
  }

  function triggerSnapshot() {
    const stage = document.getElementById('scorearQuizHostStage') || document.body;
    if (global.ScoreARPodiumCapture?.capturePodiumSnapshot) {
      global.ScoreARPodiumCapture.capturePodiumSnapshot(stage, currentPodiumRoom, currentPodiumPlayers);
    }
  }

  function triggerCertificates() {
    const worldId = currentPodiumRoom?.world?.id || currentPodiumRoom?.worldId || 'royal';
    if (global.ScoreARPodiumCapture?.downloadAllTop3Certificates) {
      global.ScoreARPodiumCapture.downloadAllTop3Certificates(currentPodiumPlayers, worldId);
    }
  }

  function handleStudentReaction(emoji, studentName) {
    const c = document.getElementById('hostFloatingReactionsContainer');
    if (!c) return;
    const b = document.createElement('div');
    b.style.cssText = `position:absolute;bottom:80px;left:${10 + Math.random() * 80}%;font-size:36px;display:flex;flex-direction:column;align-items:center;pointer-events:none;animation:floatUpReaction 2.4s ease-out forwards;z-index:200;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.5));`;
    b.innerHTML = `<span>${escapeHtml(emoji || '👏')}</span><small style="background:rgba(15,23,42,0.85);color:#fff;border:1px solid rgba(255,255,255,0.2);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:900;white-space:nowrap;">${escapeHtml(studentName || 'بطل')}</small>`;
    c.appendChild(b);
    b.addEventListener('animationend', () => b.remove());
  }

  const ScoreARPodiumEffects = {
    renderHostPodium, advanceReveal, revealAll, toggleAudioMute, triggerSnapshot, triggerCertificates, handleStudentReaction, initWorldCanvas
  };

  global.ScoreARPodiumEffects = ScoreARPodiumEffects;
  try { if (typeof globalThis !== 'undefined') globalThis.ScoreARPodiumEffects = ScoreARPodiumEffects; } catch(e){}
  if (typeof module !== 'undefined' && module.exports) module.exports = ScoreARPodiumEffects;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
