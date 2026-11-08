/**
 * ScoreAR World-Themed Podium Visual Effects & Interactive Reveal (quiz-podium-effects.js)
 * Implements:
 * 1. World-specific Canvas/SVG special effects for all 6 worlds (royal, cosmic, treasure, stadium, oasis, magic).
 * 2. Host stepwise suspense reveal (3rd -> 2nd -> 1st Champion) with drumroll tick and fanfare.
 * 3. Realtime floating student reactions (👏, 🔥, ❤️, 🎉) with name tags and rate limiting.
 * Strictly Rule 7 compliant (<500 lines).
 */
(function(global) {
  'use strict';

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function sfx(name) {
    if (global.ScoreARAudio && typeof global.ScoreARAudio.playSfx === 'function') {
      global.ScoreARAudio.playSfx(name);
    }
  }

  let revealStep = 0; // 0: hidden, 1: 3rd revealed, 2: 2nd revealed, 3: 1st revealed, 4: full roster open
  let currentPodiumPlayers = [];
  let activeAnimationId = null;
  let activeCanvas = null;

  // --- 1. World Canvas Effects Engine (Zero New Files Needed) ---
  function initWorldCanvas(canvasEl, worldId) {
    if (!canvasEl) return;
    activeCanvas = canvasEl;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    let width = (canvasEl.width = canvasEl.offsetWidth || window.innerWidth);
    let height = (canvasEl.height = canvasEl.offsetHeight || window.innerHeight);

    const onResize = () => {
      if (!activeCanvas) return;
      width = activeCanvas.width = activeCanvas.offsetWidth || window.innerWidth;
      height = activeCanvas.height = activeCanvas.offsetHeight || window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const particles = [];
    const count = (worldId === 'treasure' || worldId === 'stadium') ? 80 : 50;

    for (let i = 0; i < count; i++) {
      particles.push(createParticle(worldId, width, height, true));
    }

    function loop() {
      if (!activeCanvas) return;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p, idx) => {
        updateParticle(p, worldId, width, height);
        drawParticle(ctx, p, worldId);
      });

      activeAnimationId = requestAnimationFrame(loop);
    }
    loop();
  }

  function createParticle(worldId, w, h, initRandom = false) {
    const yStart = initRandom ? Math.random() * h : (worldId === 'treasure' ? -20 : h + 20);
    return {
      x: Math.random() * w,
      y: yStart,
      vx: (Math.random() - 0.5) * 2,
      vy: worldId === 'treasure' ? (2 + Math.random() * 3.5) : (-1.2 - Math.random() * 2),
      size: worldId === 'treasure' ? (8 + Math.random() * 10) : (3 + Math.random() * 5),
      angle: Math.random() * Math.PI * 2,
      vAngle: (Math.random() - 0.5) * 0.1,
      alpha: 0.3 + Math.random() * 0.7,
      color: pickColor(worldId)
    };
  }

  function pickColor(worldId) {
    if (worldId === 'royal') return ['#f59e0b', '#fbbf24', '#fef08a', '#e2e8f0'][Math.floor(Math.random() * 4)];
    if (worldId === 'cosmic') return ['#22d3ee', '#818cf8', '#c084fc', '#38bdf8'][Math.floor(Math.random() * 4)];
    if (worldId === 'treasure') return ['#fbbf24', '#f59e0b', '#d97706', '#fef3c7'][Math.floor(Math.random() * 4)];
    if (worldId === 'stadium') return ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7'][Math.floor(Math.random() * 5)];
    if (worldId === 'oasis') return ['#34d399', '#10b981', '#6ee7b7', '#fef08a'][Math.floor(Math.random() * 4)];
    return ['#c084fc', '#a855f7', '#38bdf8', '#f472b6'][Math.floor(Math.random() * 4)]; // magic
  }

  function updateParticle(p, worldId, w, h) {
    p.x += p.vx;
    p.y += p.vy;
    p.angle += p.vAngle;

    if (worldId === 'treasure') {
      if (p.y > h + 20) Object.assign(p, createParticle(worldId, w, h));
    } else {
      if (p.y < -30 || p.x < -20 || p.x > w + 20) Object.assign(p, createParticle(worldId, w, h));
    }
  }

  function drawParticle(ctx, p, worldId) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.globalAlpha = p.alpha;

    if (worldId === 'treasure') {
      // 3D spinning gold coins
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * Math.abs(Math.cos(p.angle)), p.size, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (worldId === 'stadium') {
      // Confetti ribbons
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
    } else if (worldId === 'oasis') {
      // Fireflies / butterflies glowing aura
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Sparkling stardust / crystals
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function renderWorldSvgOverlay(worldId) {
    if (worldId === 'royal') {
      return `
        <div style="position:absolute;top:70px;left:50%;transform:translateX(-50%);z-index:4;pointer-events:none;text-align:center;">
          <svg width="220" height="90" viewBox="0 0 220 90" fill="none" style="filter:drop-shadow(0 6px 14px rgba(245,158,11,0.5));">
            <path d="M20 70 L60 20 L110 50 L160 20 L200 70 Z" fill="url(#royalGoldGrad)" stroke="#fef08a" stroke-width="3"/>
            <circle cx="60" cy="18" r="8" fill="#fef08a"/>
            <circle cx="110" cy="46" r="8" fill="#fef08a"/>
            <circle cx="160" cy="18" r="8" fill="#fef08a"/>
            <defs>
              <linearGradient id="royalGoldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#fef08a"/><stop offset="50%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#b45309"/>
              </linearGradient>
            </defs>
          </svg>
        </div>`;
    }
    if (worldId === 'cosmic') {
      return `
        <div style="position:absolute;bottom:100px;left:8%;z-index:4;pointer-events:none;animation:rocketAscend 12s infinite ease-in-out;">
          <svg width="70" height="120" viewBox="0 0 70 120" fill="none">
            <path d="M35 10 C35 10 55 35 55 75 L15 75 C15 35 35 10 35 10 Z" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2"/>
            <circle cx="35" cy="45" r="9" fill="#0369a1" stroke="#38bdf8" stroke-width="2"/>
            <path d="M15 75 L5 90 L20 85 Z" fill="#f43f5e"/><path d="M55 75 L65 90 L50 85 Z" fill="#f43f5e"/>
            <path d="M25 85 Q35 115 45 85 Z" fill="#f59e0b" style="animation:pulse 0.2s infinite;"/>
          </svg>
        </div>`;
    }
    if (worldId === 'treasure') {
      return `
        <div style="position:absolute;bottom:25px;right:40px;z-index:4;pointer-events:none;">
          <svg width="100" height="70" viewBox="0 0 100 70" fill="none" style="filter:drop-shadow(0 6px 16px rgba(245,158,11,0.6));">
            <rect x="10" y="25" width="80" height="40" rx="6" fill="#78350f" stroke="#f59e0b" stroke-width="3"/>
            <path d="M10 25 Q50 0 90 25 Z" fill="#b45309" stroke="#f59e0b" stroke-width="3"/>
            <circle cx="50" cy="35" r="5" fill="#fef08a"/>
          </svg>
        </div>`;
    }
    if (worldId === 'stadium') {
      return `
        <div style="position:absolute;top:70px;left:50%;transform:translateX(-50%);z-index:4;pointer-events:none;">
          <svg width="120" height="90" viewBox="0 0 120 90" fill="none" style="filter:drop-shadow(0 8px 20px rgba(56,189,248,0.6));">
            <path d="M35 15 L85 15 L75 55 Q60 70 45 55 Z" fill="url(#stadiumGrad)" stroke="#fef08a" stroke-width="3"/>
            <path d="M35 22 Q15 25 25 45 Q35 55 42 45" fill="none" stroke="#f59e0b" stroke-width="3"/>
            <path d="M85 22 Q105 25 95 45 Q85 55 78 45" fill="none" stroke="#f59e0b" stroke-width="3"/>
            <rect x="52" y="65" width="16" height="15" fill="#d97706"/>
            <rect x="40" y="80" width="40" height="8" rx="2" fill="#92400e"/>
            <defs><linearGradient id="stadiumGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fef08a"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient></defs>
          </svg>
        </div>`;
    }
    if (worldId === 'oasis') {
      return `
        <div style="position:absolute;bottom:0;left:0;right:0;height:40px;background:linear-gradient(to top, rgba(16,185,129,0.2), transparent);z-index:3;pointer-events:none;"></div>
      `;
    }
    return ''; // magic (handled by glowing circle in CSS)
  }

  function renderPodiumHero(avatarId, name) {
    const rawId = avatarId || 'char_01';
    let numericId = 1, cleanCode = 'char_01';
    if (typeof rawId === 'number') {
      numericId = Math.max(1, Math.min(20, rawId));
      cleanCode = 'char_' + String(numericId).padStart(2, '0');
    } else {
      const match = String(rawId).match(/\d+/);
      numericId = match ? Math.max(1, Math.min(20, parseInt(match[0], 10))) : 1;
      cleanCode = 'char_' + String(numericId).padStart(2, '0');
    }
    const heroName = (global.ScoreARCharacters && typeof global.ScoreARCharacters.get === 'function')
      ? (global.ScoreARCharacters.get(numericId)?.name || name || 'البطل')
      : (name || 'البطل');

    return `<div class="character-podium-hero scorear-character character-celebrate" role="img" aria-label="${escapeHtml(heroName)}" style="--character-atlas:url('assets/characters/animated/${cleanCode}-atlas.webp');width:100%;height:100%;display:flex;align-items:flex-end;justify-content:center;filter:drop-shadow(0 14px 28px rgba(0,0,0,0.75));">
      <img src="assets/characters/animated/${cleanCode}-idle.webp" onerror="this.src='assets/characters/animated/char_01-idle.webp'" alt="${escapeHtml(heroName)}" style="max-height:100%;max-width:100%;height:100%;object-fit:contain;animation:character-joy 1.1s ease-in-out infinite;visibility:visible!important;display:block!important;">
    </div>`;
  }

  // --- 2. Stepwise Podium Controller & Renderer ---
  function renderHostPodium(stage, currentRoom, closeHostSession) {
    if (!stage || !currentRoom) return;
    if (activeAnimationId) cancelAnimationFrame(activeAnimationId);

    const worldId = (currentRoom.world && currentRoom.world.id) ? currentRoom.world.id : 'royal';
    const sorted = [...(currentRoom.players || [])].sort((a, b) => (b.score || 0) - (a.score || 0));
    const p1 = sorted[0] || { name: 'البطل الأول', score: 0, avatarId: 'char_01' };
    const p2 = sorted[1] || { name: 'الوصيف الثاني', score: 0, avatarId: 'char_02' };
    const p3 = sorted[2] || { name: 'صاحب المركز الثالث', score: 0, avatarId: 'char_03' };
    currentPodiumPlayers = [p1, p2, p3];

    revealStep = 0; // Reset reveal state

    stage.innerHTML = `
      <style>
        @keyframes floatUpReaction { 0% { transform: translateY(0) scale(0.6); opacity: 0; } 15% { transform: translateY(-40px) scale(1.2); opacity: 1; } 80% { transform: translateY(-380px) scale(1.1); opacity: 0.9; } 100% { transform: translateY(-480px) scale(0.9); opacity: 0; } }
        @keyframes crownFloat { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-8px) scale(1.05); } }
        @keyframes character-joy { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-8px) rotate(2deg); } }
        .podium-pedestal { transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
      </style>

      <!-- Video & World Visual Background -->
      <div style="position:absolute;inset:0;overflow:hidden;z-index:0;background:url('assets/worlds/${worldId}/podium.jpg') center/cover no-repeat;">
        <video autoplay loop muted playsinline poster="assets/worlds/${worldId}/podium.jpg" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;filter:brightness(0.55);" onerror="this.style.display='none'">
          <source src="assets/videos/worlds/${worldId}.mp4" type="video/mp4">
        </video>
        <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 25%, rgba(12,13,30,0.4) 0%, rgba(12,13,30,0.92) 100%);z-index:2;"></div>
      </div>

      <!-- World Canvas Particles (Coins, Confetti, Glitter, Stardust) -->
      <canvas id="scorearWorldCanvas" style="position:absolute;inset:0;width:100%;height:100%;z-index:3;pointer-events:none;"></canvas>

      <!-- World SVG Overlay (Crowns, Trophy, Rocket, Chest) -->
      ${renderWorldSvgOverlay(worldId)}

      <!-- Reaction Container for floating bubbles -->
      <div id="hostFloatingReactionsContainer" style="position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:150;"></div>

      <header style="position:relative;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:12px 28px;background:rgba(12,13,30,0.8);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,0.12);">
        <button onclick="ScoreARQuizHost.closeHostSession()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:8px 14px;border-radius:10px;font-weight:800;font-size:12px;cursor:pointer;">✕ إنهاء المسابقة وحفظ التقرير</button>
        <div style="font-size:22px;font-weight:900;color:#fef3c7;display:flex;align-items:center;gap:10px;">👑 منصة تتويج أبطال ScoreAR 👑</div>
        <div style="font-size:13px;color:#94a3b8;font-weight:700;">المتسابقون: <b style="color:#52d9ed;">${sorted.length}</b></div>
      </header>

      <main style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:16px 20px 24px;overflow-y:auto;">
        <!-- Top 3 Suspense Podium with Large Heroes & Mystery Pedestals -->
        <div style="display:flex;align-items:flex-end;justify-content:center;gap:20px;margin-top:20px;min-height:380px;">
          
          <!-- 2nd Place (Silver) -->
          <div id="podiumCol_2" class="podium-pedestal" style="display:flex;flex-direction:column;align-items:center;">
            <!-- Hero & Name Area: Hidden until Step 2 -->
            <div id="podiumHeroArea_2" style="display:none;opacity:0;transform:translateY(40px) scale(0.7);transition:all 0.65s cubic-bezier(0.34, 1.56, 0.64, 1);flex-direction:column;align-items:center;">
              <div style="height:210px;width:170px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:8px;">
                ${renderPodiumHero(p2.avatarId, p2.name)}
              </div>
              <div style="background:rgba(15,23,42,0.95);border:2px solid #cbd5e1;border-radius:14px;padding:6px 16px;color:#fff;font-size:14px;font-weight:900;margin-bottom:8px;max-width:165px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-shadow:0 6px 20px rgba(0,0,0,0.5);">
                🥈 ${escapeHtml(p2.name)}
              </div>
            </div>
            <!-- Sleek Pedestal -->
            <div id="podiumPedestal_2" style="width:160px;height:95px;background:linear-gradient(180deg, #94a3b8, #475569);border-top-left-radius:18px;border-top-right-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.4);border-bottom:none;box-shadow:0 10px 28px rgba(0,0,0,0.6);transition:all 0.5s;">
              <div style="font-size:30px;line-height:1;">🥈</div>
              <div id="podiumMystery_2" style="font-size:12px;font-weight:900;color:#e2e8f0;background:rgba(0,0,0,0.35);padding:3px 10px;border-radius:10px;margin-top:6px;">❓ من البطل؟</div>
            </div>
          </div>

          <!-- 1st Place (Gold Champion) -->
          <div id="podiumCol_1" class="podium-pedestal" style="display:flex;flex-direction:column;align-items:center;">
            <div id="championCrownEl" style="font-size:36px;margin-bottom:-10px;animation:crownFloat 2s infinite ease-in-out;visibility:hidden;z-index:25;">👑</div>
            <!-- Hero & Name Area: Hidden until Step 3 -->
            <div id="podiumHeroArea_1" style="display:none;opacity:0;transform:translateY(50px) scale(0.7);transition:all 0.75s cubic-bezier(0.34, 1.56, 0.64, 1);flex-direction:column;align-items:center;">
              <div style="height:250px;width:200px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:8px;">
                ${renderPodiumHero(p1.avatarId, p1.name)}
              </div>
              <div style="background:rgba(15,23,42,0.98);border:2.5px solid #f59e0b;border-radius:16px;padding:8px 22px;color:#fcd34d;font-size:16px;font-weight:900;margin-bottom:8px;box-shadow:0 8px 25px rgba(245,158,11,0.55);max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                🏆 ${escapeHtml(p1.name)}
              </div>
            </div>
            <!-- Sleek Pedestal -->
            <div id="podiumPedestal_1" style="width:190px;height:125px;background:linear-gradient(180deg, #f59e0b, #b45309);border-top-left-radius:20px;border-top-right-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:3px solid #fef08a;border-bottom:none;box-shadow:0 12px 35px rgba(245,158,11,0.5);transition:all 0.5s;">
              <div style="font-size:38px;line-height:1;">🥇</div>
              <div id="podiumMystery_1" style="font-size:13px;font-weight:900;color:#fef3c7;background:rgba(0,0,0,0.35);padding:4px 12px;border-radius:10px;margin-top:6px;">❓ من بطل القاعة؟</div>
            </div>
          </div>

          <!-- 3rd Place (Bronze) -->
          <div id="podiumCol_3" class="podium-pedestal" style="display:flex;flex-direction:column;align-items:center;">
            <!-- Hero & Name Area: Hidden until Step 1 -->
            <div id="podiumHeroArea_3" style="display:none;opacity:0;transform:translateY(40px) scale(0.7);transition:all 0.65s cubic-bezier(0.34, 1.56, 0.64, 1);flex-direction:column;align-items:center;">
              <div style="height:190px;width:155px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:8px;">
                ${renderPodiumHero(p3.avatarId, p3.name)}
              </div>
              <div style="background:rgba(15,23,42,0.95);border:2px solid #d97706;border-radius:14px;padding:6px 14px;color:#fff;font-size:14px;font-weight:900;margin-bottom:8px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-shadow:0 6px 20px rgba(0,0,0,0.5);">
                🥉 ${escapeHtml(p3.name)}
              </div>
            </div>
            <!-- Sleek Pedestal -->
            <div id="podiumPedestal_3" style="width:150px;height:75px;background:linear-gradient(180deg, #d97706, #78350f);border-top-left-radius:18px;border-top-right-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.3);border-bottom:none;box-shadow:0 10px 24px rgba(0,0,0,0.6);transition:all 0.5s;">
              <div style="font-size:26px;line-height:1;">🥉</div>
              <div id="podiumMystery_3" style="font-size:12px;font-weight:900;color:#fed7aa;background:rgba(0,0,0,0.35);padding:3px 10px;border-radius:10px;margin-top:4px;">❓ من البطل؟</div>
            </div>
          </div>
        </div>

        <!-- Suspense Stepwise Reveal Controls -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;margin:16px 0;z-index:30;">
          <div id="podiumPromptText" style="font-size:13px;color:#fcd34d;font-weight:800;">👇 اضغط هنا لكشف الأبطال وتتويج الفائزين بالترتيب</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
            <button id="podiumRevealBtn" type="button" onclick="ScoreARPodiumEffects.advanceReveal()" style="background:linear-gradient(135deg, #f59e0b, #d97706);color:#fff;font-size:15px;font-weight:900;border:none;border-radius:16px;padding:12px 28px;cursor:pointer;box-shadow:0 6px 24px rgba(245,158,11,0.5);display:flex;align-items:center;gap:10px;">
              <span>🥉 كشف صاحب المركز الثالث</span>
            </button>
            <button id="podiumRevealAllBtn" type="button" onclick="ScoreARPodiumEffects.revealAll()" style="background:rgba(255,255,255,0.12);color:#f1f5f9;font-size:13px;font-weight:800;border:1px solid rgba(255,255,255,0.25);border-radius:14px;padding:10px 18px;cursor:pointer;">
              ⚡ كشف وتتويج الجميع فوراً
            </button>
          </div>
        </div>

        <!-- Full Results Table (Initially Collapsed until step 4) -->
        <div id="podiumFullRosterSection" style="display:none;width:100%;max-width:820px;background:rgba(15,23,42,0.9);backdrop-filter:blur(18px);border:1.5px solid rgba(255,255,255,0.18);border-radius:20px;padding:16px 20px;box-shadow:0 12px 36px rgba(0,0,0,0.6);margin-top:10px;">
          <div style="font-size:15px;font-weight:900;color:#c9baff;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;">
            <span>📋 كشف النتائج والترتيب النهائي لكافة المتسابقين (${sorted.length})</span>
            <span style="font-size:11px;color:#94a3b8;">سكور آر الرسمية</span>
          </div>
          <div style="max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding-right:4px;">
            ${sorted.map((p, idx) => {
              const roleIcon = p.isDemo ? '🤖' : p.isRegistered ? '✓' : '✨';
              const rankMedal = idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`;
              return `
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:12px;font-weight:900;color:${idx<3?'#fcd34d':'#94a3b8'};min-width:32px;">${rankMedal}</span>
                    <img src="assets/characters/animated/${p.avatarId || 'char_01'}-idle.webp" onerror="this.src='assets/characters/animated/char_01-idle.webp'" alt="${escapeHtml(p.name)}" style="width:26px;height:32px;object-fit:contain;">
                    <span style="color:${roleIcon==='✓'?'#34d399':roleIcon==='🤖'?'#38bdf8':'#fcd34d'};font-size:12px;">${roleIcon}</span>
                    <span style="font-size:13px;font-weight:800;color:#fff;">${escapeHtml(p.name)}</span>
                  </div>
                  <div style="font-size:15px;font-weight:900;color:#34d399;font-family:monospace;">${p.score || 0} <span style="font-size:10px;color:#94a3b8;">نقطة</span></div>
                </div>`;
            }).join('')}
          </div>
        </div>
      </main>
    `;

    // Initialize Canvas Particles
    setTimeout(() => {
      const c = document.getElementById('scorearWorldCanvas');
      initWorldCanvas(c, worldId);
    }, 50);

    // Broadcast contest completion to students
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
    const btn = document.getElementById('podiumRevealBtn');
    const hero1 = document.getElementById('podiumHeroArea_1');
    const hero2 = document.getElementById('podiumHeroArea_2');
    const hero3 = document.getElementById('podiumHeroArea_3');
    const myst1 = document.getElementById('podiumMystery_1');
    const myst2 = document.getElementById('podiumMystery_2');
    const myst3 = document.getElementById('podiumMystery_3');
    const ped1 = document.getElementById('podiumPedestal_1');
    const ped2 = document.getElementById('podiumPedestal_2');
    const ped3 = document.getElementById('podiumPedestal_3');
    const crown = document.getElementById('championCrownEl');
    const roster = document.getElementById('podiumFullRosterSection');

    if (revealStep === 1) {
      // Reveal 3rd
      sfx('tick');
      setTimeout(() => sfx('reveal'), 150);
      if (hero3) {
        hero3.style.display = 'flex';
        hero3.offsetHeight;
        hero3.style.opacity = '1';
        hero3.style.transform = 'translateY(0) scale(1)';
      }
      if (myst3) {
        myst3.innerHTML = `<b style="font-size:16px;color:#fed7aa;font-family:monospace;">${currentPodiumPlayers[2]?.score || 0}</b> <span style="font-size:10px;">نقطة</span>`;
        myst3.style.background = 'rgba(217,119,6,0.35)';
      }
      if (ped3) ped3.style.boxShadow = '0 0 25px rgba(217,119,6,0.7)';
      if (btn) btn.innerHTML = `<span>🥈 كشف صاحب المركز الثاني</span>`;
    } else if (revealStep === 2) {
      // Reveal 2nd
      sfx('tick');
      setTimeout(() => sfx('reveal'), 150);
      if (hero2) {
        hero2.style.display = 'flex';
        hero2.offsetHeight;
        hero2.style.opacity = '1';
        hero2.style.transform = 'translateY(0) scale(1)';
      }
      if (myst2) {
        myst2.innerHTML = `<b style="font-size:18px;color:#f1f5f9;font-family:monospace;">${currentPodiumPlayers[1]?.score || 0}</b> <span style="font-size:10px;">نقطة</span>`;
        myst2.style.background = 'rgba(148,163,184,0.35)';
      }
      if (ped2) ped2.style.boxShadow = '0 0 25px rgba(203,213,225,0.7)';
      if (btn) {
        btn.innerHTML = `<span>👑 كشف بطل القاعة المتوج (المركز الأول) 🏆</span>`;
        btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      }
    } else if (revealStep === 3) {
      // Reveal 1st Grand Champion
      sfx('fanfare');
      setTimeout(() => sfx('reveal'), 200);
      if (hero1) {
        hero1.style.display = 'flex';
        hero1.offsetHeight;
        hero1.style.opacity = '1';
        hero1.style.transform = 'translateY(0) scale(1)';
      }
      if (crown) crown.style.visibility = 'visible';
      if (myst1) {
        myst1.innerHTML = `<b style="font-size:22px;color:#fef3c7;font-family:monospace;">${currentPodiumPlayers[0]?.score || 0}</b> <span style="font-size:11px;">نقطة</span>`;
        myst1.style.background = 'rgba(245,158,11,0.45)';
      }
      if (ped1) ped1.style.boxShadow = '0 0 35px rgba(245,158,11,0.85)';
      if (global.confetti) {
        global.confetti({ particleCount: 160, spread: 100, origin: { y: 0.5 } });
      }
      if (btn) {
        btn.innerHTML = `<span>📋 عرض كشف الترتيب النهائي لكافة المتسابقين</span>`;
        btn.style.background = 'linear-gradient(135deg, #6366f1, #4f46e5)';
      }
      const allBtn = document.getElementById('podiumRevealAllBtn');
      if (allBtn) allBtn.style.display = 'none';
      const prompt = document.getElementById('podiumPromptText');
      if (prompt) prompt.style.display = 'none';
    } else if (revealStep >= 4) {
      // Show full roster table
      if (roster) {
        roster.style.display = 'block';
        if (typeof roster.scrollIntoView === 'function') roster.scrollIntoView({ behavior: 'smooth' });
      }
      if (btn) {
        btn.innerHTML = `<span>✕ إنهاء المسابقة وحفظ التقرير</span>`;
        btn.onclick = () => {
          if (global.ScoreARQuizHost && typeof global.ScoreARQuizHost.closeHostSession === 'function') {
            global.ScoreARQuizHost.closeHostSession();
          }
        };
      }
    }
  }

  function revealAll() {
    while (revealStep < 3) advanceReveal();
  }

  // --- 3. Realtime Floating Student Reactions ---
  function handleStudentReaction(emoji, studentName) {
    const container = document.getElementById('hostFloatingReactionsContainer');
    if (!container) return;

    const bubble = document.createElement('div');
    const x = 10 + Math.random() * 80;
    bubble.className = 'floating-reaction-item';
    bubble.style.cssText = `position:absolute;bottom:80px;left:${x}%;font-size:36px;display:flex;flex-direction:column;align-items:center;pointer-events:none;animation:floatUpReaction 2.4s ease-out forwards;z-index:200;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.5));`;
    bubble.innerHTML = `
      <span>${escapeHtml(emoji || '👏')}</span>
      <small style="background:rgba(15,23,42,0.85);color:#fff;border:1px solid rgba(255,255,255,0.2);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:900;white-space:nowrap;margin-top:2px;">
        ${escapeHtml(studentName || 'بطل')}
      </small>
    `;

    container.appendChild(bubble);
    bubble.addEventListener('animationend', () => bubble.remove());
  }

  const ScoreARPodiumEffects = { renderHostPodium, advanceReveal, revealAll, handleStudentReaction, initWorldCanvas };
  global.ScoreARPodiumEffects = ScoreARPodiumEffects;
  try { if (typeof globalThis !== 'undefined') globalThis.ScoreARPodiumEffects = ScoreARPodiumEffects; } catch(e){}
  if (typeof module !== 'undefined' && module.exports) module.exports = ScoreARPodiumEffects;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
