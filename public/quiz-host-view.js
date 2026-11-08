/**
 * ScoreAR Quiz Host View Module
 * Renders Host Projector UI: Atmosphere Video, 3D White PIN Box, Animated Fullbody Characters & Question Arena.
 * Strictly Rule 7 Compliant (<300 lines).
 */
(function(global) {
  'use strict';

  const OPTION_THEMES = [
    { bg: '#e21b3c', border: '#ff5c77', shape: '▲' },
    { bg: '#1368ce', border: '#4f9fff', shape: '◆' },
    { bg: '#d89e00', border: '#ffd24d', shape: '●' },
    { bg: '#26890c', border: '#5cdb3b', shape: '■' }
  ];

  function escapeHtml(str) {
    return typeof str !== 'string' ? String(str || '') : str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function renderHostLobby(stage, currentRoom, isRoomLocked) {
    const worldId = (currentRoom && currentRoom.world && currentRoom.world.id) ? currentRoom.world.id : 'royal';
    const w = currentRoom.world || { name: 'المنافسة', tag: 'جاهز' };
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + window.location.pathname + '?pin=' + currentRoom.pin)}`;

    stage.innerHTML = `
      <div style="position:absolute;inset:0;background:url('assets/worlds/${worldId}/lobby.jpg') center/cover no-repeat;z-index:1;"></div>
      <video id="hostLiveVideoBg" autoplay loop muted playsinline poster="assets/worlds/${worldId}/lobby.jpg" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2;opacity:0.95;"><source src="assets/videos/worlds/${worldId}.mp4" type="video/mp4"></video>
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center, rgba(12,13,29,0.2) 0%, rgba(12,13,29,0.72) 100%);z-index:3;"></div>
      <div style="position:absolute;top:18px;left:24px;right:24px;display:flex;justify-content:space-between;align-items:center;z-index:20;">
        <div style="display:flex;align-items:center;gap:12px;background:rgba(17,18,37,0.85);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,0.15);padding:8px 18px;border-radius:16px;">
          <span style="font-size:22px;">🌍</span>
          <div><b style="color:#ffffff;font-size:15px;display:block;">عالم ${w.name}</b><small style="color:#52d9ed;font-size:11px;">${w.tag || 'جاهز للمنافسة'} · مباشر</small></div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
          <button id="hostStartQuizBtn" class="btn dark" onclick="ScoreARQuizHost.launchQuestion(0)" style="font-size:14px;padding:10px 22px;font-weight:900;border-radius:14px;box-shadow:0 0 25px rgba(117,80,239,0.75);">🚀 بدء المنافسة فوراً (<span id="hostPlayerCount">${currentRoom.players.length}</span>)</button>
          <button class="btn light" onclick="ScoreARBots ? ScoreARBots.openModal() : ScoreARQuizHost.addDemoPlayer()" style="font-size:12px;padding:9px 15px;border-radius:12px;">🤖 الطلاب التجريبيون (<span id="hostBotCount">${currentRoom.players.filter(p=>p.isBot).length}</span>)</button>
          <button id="hostLockBtn" class="btn light" onclick="ScoreARQuizHost.toggleRoomLock()" style="font-size:12px;padding:9px 15px;border-radius:12px;color:${isRoomLocked?'#ef4444':'#34d399'};">${isRoomLocked ? '🔒 القاعة مقفلة' : '🔓 القاعة مفتوحة'}</button>
          <button class="btn outline" onclick="ScoreARQuizHost.closeHostSession()" style="background:rgba(0,0,0,0.5);border-radius:12px;padding:9px 15px;color:#fff;">✕ مغادرة القاعة</button>
        </div>
      </div>
      <div style="position:absolute;top:82px;left:50%;transform:translateX(-50%);z-index:20;">
        <div class="lobby-white-3d-box" style="padding:14px 34px;display:flex;align-items:center;gap:24px;text-align:right;">
          <div id="lobbyQrCodeHolder" style="width:72px;height:72px;background:#fff;border-radius:12px;padding:3px;box-shadow:0 4px 12px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;">
            <img src="${qrUrl}" alt="QR" style="width:66px;height:66px;border-radius:8px;display:block;">
          </div>
          <div>
            <span style="font-size:11px;font-weight:900;letter-spacing:1px;color:#7550ef;text-transform:uppercase;display:block;">رمز القاعة المباشر (PIN)</span>
            <div style="font-size:40px;font-weight:900;letter-spacing:10px;line-height:1.1;color:#0c0d1d;font-family:Arial,monospace,sans-serif;margin:3px 0;">${currentRoom.pin}</div>
            <small style="color:#4b5563;font-size:12px;font-weight:700;">ادخل واكتب الرمز لبدء التحدي</small>
          </div>
          <button onclick="navigator.clipboard?.writeText('${currentRoom.pin}'); if(window.toast) window.toast('تم نسخ رمز القاعة: ' + '${currentRoom.pin}');" style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:12px;padding:10px 14px;font-size:12px;font-weight:800;color:#1f2937;cursor:pointer;">نسخ 📋</button>
        </div>
      </div>
      <div id="hostCharactersArena" style="position:absolute;bottom:0;left:0;right:0;height:52vh;display:flex;align-items:flex-end;justify-content:center;gap:26px;padding:0 35px 24px;z-index:15;pointer-events:none;overflow-x:auto;">
        ${renderFullbodyCharactersHtml(currentRoom)}
      </div>
      <div style="position:absolute;bottom:12px;left:24px;display:flex;gap:14px;align-items:center;z-index:20;">
        <span style="background:rgba(17,18,37,0.85);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);padding:5px 14px;border-radius:12px;color:#ddd8ff;font-size:12px;font-weight:700;">👥 المتسابقون المتصلون: <b id="hostConnectedPlayersPill" style="color:#52d9ed;">${currentRoom.players.length}</b></span>
        <span style="background:rgba(17,18,37,0.85);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);padding:5px 14px;border-radius:12px;color:#ddd8ff;font-size:12px;font-weight:700;">⏱️ وقت الانتظار: <b id="hostLobbyTimerText" style="color:#fff;">0:00</b></span>
      </div>`;
  }

  function refreshLobbyUi(currentRoom) {
    if (!currentRoom) return;
    const arena = document.getElementById('hostCharactersArena');
    if (arena) arena.innerHTML = renderFullbodyCharactersHtml(currentRoom);
    const countEl = document.getElementById('hostPlayerCount'), countPill = document.getElementById('hostConnectedPlayersPill');
    if (countEl) countEl.textContent = currentRoom.players.length;
    if (countPill) countPill.textContent = currentRoom.players.length;
    const botCount = document.getElementById('hostBotCount');
    if (botCount) botCount.textContent = currentRoom.players.filter(p => p.isBot).length;
  }

  function renderFullbodyCharactersHtml(currentRoom) {
    if (!currentRoom || !currentRoom.players.length) {
      return `<div style="background:rgba(17,18,37,0.82);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.15);border-radius:24px;padding:22px 34px;text-align:center;pointer-events:auto;margin-bottom:50px;">
        <div style="font-size:40px;margin-bottom:6px;">⏳</div>
        <h3 style="color:#ffffff;font-size:19px;font-weight:900;margin:0 0 6px;">في انتظار انضمام الطلاب والأبطال...</h3>
        <p style="color:#b1a2e9;font-size:12px;margin:0 0 14px;">شارك رمز القاعة الموضح بالأعلى، أو أضف طلاباً تجريبيين للمنافسة</p>
        <button class="btn dark small" onclick="ScoreARBots ? ScoreARBots.openModal() : ScoreARQuizHost.addDemoPlayer()" style="margin:0 auto;display:inline-flex;">🤖 إضافة طلاب تجريبيين للقاعة</button>
      </div>`;
    }
    return currentRoom.players.map((p, idx) => {
      const isBot = Boolean(p.isBot || p.isDemo);
      const roleIcon = isBot ? '🤖' : p.isRegistered ? '✓' : '✨';
      const roleColor = p.isRegistered ? '#34d399' : isBot ? '#38bdf8' : '#fcd34d';
      const safeName = escapeHtml(p.name);
      const delAction = p.isBot ? `ScoreARBots && ScoreARBots.removeBot('${escapeHtml(p.id)}')` : `ScoreARQuizHost.kickPlayer('${escapeHtml(p.id)}')`;
      return `<div class="animate-enter-fullbody" style="position:relative;display:flex;flex-direction:column;align-items:center;pointer-events:auto;animation-delay:${idx*0.06}s;min-width:125px;">
        <div class="player-name-floating-pill" style="margin-bottom:10px;" title="${safeName}">
          <span style="color:${roleColor};font-size:12px;">${roleIcon}</span>
          <span style="max-width:110px;overflow:hidden;text-overflow:ellipsis;display:inline-block;">${safeName}</span>
          <button onclick="${delAction}" style="background:none;border:0;color:#ef4444;font-size:12px;cursor:pointer;padding:0 0 0 3px;" title="حذف">✕</button>
        </div>
        <div style="position:relative;width:140px;height:220px;display:flex;align-items:flex-end;justify-content:center;">
          <span class="scorear-character character-walk" style="--character-atlas:url('assets/characters/animated/${p.avatarId || 'char_01'}-atlas.webp');width:130px;height:180px;">
            <img src="assets/characters/animated/${p.avatarId || 'char_01'}-idle.webp" onerror="this.src='assets/characters/animated/char_01-idle.webp'" alt="${safeName}" style="object-fit:contain;filter:drop-shadow(0 15px 25px rgba(0,0,0,0.6));">
            <span class="character-frames" aria-hidden="true"></span>
          </span>
          <div style="position:absolute;bottom:0;width:115px;height:16px;background:radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 70%);border-radius:50%;z-index:-1;"></div>
        </div>
      </div>`;
    }).join('');
  }

  function renderHostQuestionView(stage, phase, qData, currentQIndex, total, worldId, timeRemaining, readingTimeRemaining) {
    const isReading = (phase === 'reading'), opts = qData.options || qData.opts || [];
    stage.innerHTML = `
      <div style="position:absolute;inset:0;overflow:hidden;z-index:0;background:url('assets/worlds/${worldId}/question.jpg') center/cover no-repeat;">
        <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 30%, rgba(15,23,42,0.65) 0%, rgba(12,13,30,0.92) 100%);"></div>
      </div>
      <header style="position:relative;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:12px 28px;background:rgba(12,13,30,0.7);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,0.1);">
        <div style="display:flex;align-items:center;gap:12px;">
          <button onclick="ScoreARQuizHost.closeHostSession()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 12px;border-radius:8px;font-weight:800;font-size:11px;cursor:pointer;">✕ إنهاء</button>
          <span style="background:rgba(117,80,239,0.3);border:1px solid #8e64ef;color:#d8b4fe;padding:4px 12px;border-radius:10px;font-size:12px;font-weight:900;">${escapeHtml(qData.skill || 'سؤال')}</span>
          <span style="font-size:14px;color:#fff;font-weight:900;">السؤال ${currentQIndex + 1} من ${total}</span>
          ${(qData.isDouble || qData.multiplier === 2) ? `<span style="background:linear-gradient(135deg, #f59e0b, #d97706);color:#fff;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:900;box-shadow:0 0 12px rgba(245,158,11,0.5);">⚡ نقاط ×2</span>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:16px;">
          <div id="hostLiveAnswerStats" style="display:${isReading ? 'none' : 'flex'};align-items:center;gap:8px;background:rgba(255,255,255,0.08);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.15);padding:6px 16px;border-radius:14px;font-size:13px;font-weight:800;color:#fff;">
            <span>أجاب:</span>
            <b id="hostAnsweredCount" style="color:#38bdf8;font-size:18px;font-family:monospace;">0</b>
            <span style="color:#94a3b8;">/</span>
            <b id="hostTotalStudentsCount" style="color:#fff;font-size:16px;font-family:monospace;">0</b>
          </div>
          <button onclick="ScoreARQuizHost.finishCurrentQuestion()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 14px;border-radius:10px;font-weight:800;font-size:12px;cursor:pointer;">تخطي ⏭</button>
        </div>
      </header>
      <main style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:16px 36px 24px;gap:14px;">
        <div style="background:rgba(18,20,44,0.85);backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,0.12);border-radius:22px;padding:18px 28px;text-align:center;box-shadow:0 10px 35px rgba(0,0,0,0.4);position:relative;">
          <h2 style="font-size:24px;font-weight:900;color:#ffffff;line-height:1.4;margin:0 0 6px 0;">${qData.text || qData.q || ''}</h2>
          ${(qData.imageUrl || qData.img) ? `
            <div style="display:flex;justify-content:center;margin:10px 0;max-height:170px;">
              <img src="${qData.imageUrl || qData.img}" alt="${escapeHtml(qData.imageAlt || '')}" style="max-height:170px;max-width:100%;object-fit:contain;border-radius:12px;border:1px solid rgba(255,255,255,0.2);box-shadow:0 8px 24px rgba(0,0,0,0.5);">
            </div>
          ` : ''}
        </div>
        ${isReading ? `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;">
            <div style="position:relative;width:120px;height:120px;display:flex;align-items:center;justify-content:center;">
              <svg width="120" height="120" style="transform:rotate(-90deg);">
                <circle cx="60" cy="60" r="45" stroke="rgba(255,255,255,0.1)" stroke-width="8" fill="none"/>
                <circle id="hostReadingProgressCircle" cx="60" cy="60" r="45" stroke="#f59e0b" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="283" stroke-dashoffset="0" style="transition:stroke-dashoffset 1s linear;"/>
              </svg>
              <div id="hostReadingCountdownNum" style="position:absolute;font-size:36px;font-weight:900;color:#fcd34d;font-family:monospace;">${readingTimeRemaining}</div>
            </div>
            <div style="background:rgba(245,158,11,0.15);border:1px solid #f59e0b;padding:8px 22px;border-radius:14px;color:#fcd34d;font-size:14px;font-weight:900;">
              📖 مرحلة قراءة وفهم السؤال (تفتح الخيارات تلقائياً بعد انتهاء العد)
            </div>
          </div>
        ` : `
          <div style="display:flex;align-items:center;justify-content:center;gap:18px;">
            <div style="width:70px;height:70px;border-radius:50%;background:#ef4444;display:flex;align-items:center;justify-content:center;box-shadow:0 0 25px rgba(239,68,68,0.5);">
              <span id="hostQuestionTimerNum" style="font-size:28px;font-weight:900;color:#fff;font-family:monospace;">${timeRemaining}</span>
            </div>
          </div>
          <div id="hostOptionsGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;max-width:960px;margin:0 auto;width:100%;">
            ${opts.slice(0, 4).map((optText, idx) => {
              const theme = OPTION_THEMES[idx % 4];
              return `
                <div id="hostOptionCard_${idx}" class="host-option-card" style="background:${theme.bg};border:2px solid ${theme.border};border-radius:18px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 8px 24px rgba(0,0,0,0.3);min-height:76px;transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);position:relative;">
                  <div style="display:flex;align-items:center;gap:14px;">
                    <span style="font-size:24px;color:#ffffff;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">${theme.shape}</span>
                    <span id="hostOptionText_${idx}" style="font-size:17px;font-weight:900;color:#ffffff;line-height:1.35;">${escapeHtml(optText)}</span>
                  </div>
                  <div id="hostOptionCountBadge_${idx}" style="display:none;background:rgba(0,0,0,0.45);backdrop-filter:blur(8px);border:1.5px solid rgba(255,255,255,0.3);border-radius:12px;padding:4px 12px;font-size:15px;font-weight:900;color:#fff;">0</div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </main>`;
  }

  const ScoreARQuizHostView = {
    renderHostLobby,
    refreshLobbyUi,
    renderFullbodyCharactersHtml,
    renderHostQuestionView
  };

  global.ScoreARQuizHostView = ScoreARQuizHostView;
  try { if (typeof globalThis !== 'undefined') globalThis.ScoreARQuizHostView = ScoreARQuizHostView; } catch(e){}
  if (typeof module !== 'undefined' && module.exports) module.exports = ScoreARQuizHostView;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
