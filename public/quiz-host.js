/**
 * ScoreAR Quiz Host (Teacher Projector View)
 * Fullscreen Video Atmosphere, Top-Center 3D White PIN Box, Large Animated Characters,
 * 10-Second Reading Preview Phase, Kahoot-style Cards, Magic & Treasure Soundtracks
 * Modular & Rule 7 Compliant (<450 lines)
 */
(function(global) {
  'use strict';

  let currentRoom = null, currentQIndex = 0, qTimerInterval = null, readingTimerInterval = null;
  let lobbyTimerInterval = null, autoAdvanceTimer = null, lobbyElapsedSeconds = 0;
  let timeRemaining = 0, readingTimeRemaining = 10, isRoomLocked = false;
  let activeQuestions = [], lastFastestStudent = null;

  const OPTION_THEMES = [
    { bg: '#e21b3c', border: '#ff5c77', shape: '▲' }, { bg: '#1368ce', border: '#4f9fff', shape: '◆' },
    { bg: '#d89e00', border: '#ffd24d', shape: '●' }, { bg: '#26890c', border: '#5cdb3b', shape: '■' }
  ];

  function escapeHtml(str) { return typeof str !== 'string' ? String(str || '') : str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function sfx(t) { if (global.ScoreARAudio) global.ScoreARAudio.playSfx(t); }
  function music(tr, vol) { if (global.ScoreARAudio) global.ScoreARAudio.playMusic(tr, vol); }
  function ev() { return global.ScoreARHostEvents || null; }
  function getOrCreateStage() {
    let stage = document.getElementById('scorearHostStage');
    if (!stage) {
      stage = document.createElement('div');
      stage.id = 'scorearHostStage';
      stage.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0c0d1e;overflow:hidden;font-family:Cairo,Tajawal,sans-serif;direction:rtl;display:flex;flex-direction:column;';
      document.body.appendChild(stage);
    }
    stage.style.display = 'flex';
    return stage;
  }

  function closeHostSession() {
    [qTimerInterval, readingTimerInterval, lobbyTimerInterval, autoAdvanceTimer].forEach(t => { if (t) clearInterval(t); });
    if (currentRoom?.pin && ev()) ev().publishRoomClosed(currentRoom.pin, 'انتهت المسابقة بواسطة المعلم');
    if (global.ScoreARAudio) global.ScoreARAudio.stopMusic();
    const stage = document.getElementById('scorearHostStage');
    if (stage) stage.style.display = 'none';
    currentRoom = null;
    setTimeout(() => { if (global.ScoreARRealtime) global.ScoreARRealtime.cleanup(); }, 150);
  }
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('beforeunload', () => {
      if (currentRoom?.pin && ev()) ev().publishRoomClosed(currentRoom.pin, 'انتهت المسابقة بسبب خروج المعلم');
    });
  }

  async function startHostLobby(worldId = 'royal', customPin = null, bypassPicker = false) {
    if (!bypassPicker && global.ScoreARWorldFlow && typeof global.ScoreARWorldFlow.openWorldPicker === 'function') {
      return global.ScoreARWorldFlow.openWorldPicker({
        defaultWorldId: worldId,
        pin: customPin,
        onConfirm: (chosenWorld) => startHostLobby(chosenWorld, customPin, true)
      });
    }
    [lobbyTimerInterval, autoAdvanceTimer, readingTimerInterval].forEach(t => { if (t) clearInterval(t); });
    lobbyElapsedSeconds = 0;
    const pin = (typeof customPin === 'string' && /^\d{6}$/.test(customPin)) ? customPin : (global.ScoreARRealtime ? global.ScoreARRealtime.generatePin() : '849201');
    const defaultWorlds = [{ id: 'royal', name: 'القصر الملكي' }, { id: 'treasure', name: 'جزيرة الكنز' }, { id: 'cosmic', name: 'المحطة الكونية' }, { id: 'oasis', name: 'واحة المعرفة' }, { id: 'stadium', name: 'استاد التحدي' }, { id: 'magic', name: 'غابة الأسرار' }];
    const worlds = (global.worlds && global.worlds.length) ? global.worlds : defaultWorlds;
    const w = worlds.find(x => x.id === worldId) || { id: worldId, name: 'العالم' };
    const rawQs = (global.contestQuestions && global.contestQuestions.length) ? global.contestQuestions : [
      { skill: 'النحو العربي', q: '«قرأتُ كتابًا ممتعًا». ما إعراب كلمة «ممتعًا»؟', opts: ['حال منصوب', 'نعت منصوب وعلامة نصبه الفتحة', 'مفعول به ثانٍ', 'تمييز منصوب'], ans: 1, why: 'نعت حقيقي منصوب.' },
      { skill: 'البلاغة والبيان', q: '«العلم نور يضيء الدروب». ما نوع التشبيه؟', opts: ['استعارة تصريحية', 'تشبيه تمثيلي', 'تشبيه بليغ (مبتدأ وخبر)', 'كناية عن موصوف'], ans: 2, why: 'تشبيه بليغ.' },
      { skill: 'النحو العربي', q: 'أيّ جملة تشتمل على «نعت جملة فعلية»؟', opts: ['شاهدتُ الطالبَ مسرعاً', 'هذا بطلٌ عظيم', 'قرأتُ لغةً تُبهرُ العقول', 'الامتحانُ سهلٌ'], ans: 2, why: 'الجمل بعد النكرات صفات.' }
    ];
    const evaluator = global.ScoreAREvaluator;
    const migrated = (evaluator && typeof evaluator.migrateQuestions === 'function') ? evaluator.migrateQuestions(rawQs) : rawQs;

    for (let i = 0; i < migrated.length; i++) {
      const val = (evaluator && typeof evaluator.validateQuestion === 'function') ? evaluator.validateQuestion(migrated[i]) : { valid: true };
      if (!val.valid) {
        const errMsg = `لا يمكن بدء القاعة: السؤال رقم (${i + 1}) غير صالح (${val.error}).`;
        if (global.toast) global.toast(errMsg);
        alert(errMsg);
        return;
      }
    }
    if (!migrated.length) { if (global.toast) global.toast('لا توجد أسئلة صالحة'); alert('لا توجد أسئلة صالحة'); return; }

    activeQuestions = migrated;
    currentRoom = { pin, world: w, players: [], answers: {}, isLocked: false, status: 'lobby' };

    if (global.ScoreARRealtime) {
      global.ScoreARRealtime.init('host', pin, handleHostIncomingMessage);
      global.ScoreARRealtime.subscribe(handleHostIncomingMessage);
    }

    renderHostLobby();
    try {
      const liveBg = document.getElementById('hostLiveVideoBg');
      if (liveBg && liveBg.paused) liveBg.play().catch(() => {});
    } catch(e){}

    if (ev()) ev().publishRoomOpen(pin, w.id);
    music('magic', 0.28); // Standard lobby soundtrack: magic

    lobbyTimerInterval = setInterval(() => {
      lobbyElapsedSeconds++;
      const el = document.getElementById('hostLobbyTimerText');
      if (el) { const m = Math.floor(lobbyElapsedSeconds / 60), s = lobbyElapsedSeconds % 60; el.textContent = `${m}:${s < 10 ? '0' : ''}${s}`; }
    }, 1000);
  }

  function renderHostLobby() {
    const stage = getOrCreateStage();
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
            <small style="color:#4b5563;font-size:12px;font-weight:700;">ادخل على <b>scorear2.web.app</b> واكتب الرمز</small>
          </div>
          <button onclick="navigator.clipboard?.writeText('${currentRoom.pin}'); if(window.toast) window.toast('تم نسخ رمز القاعة: ' + '${currentRoom.pin}');" style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:12px;padding:10px 14px;font-size:12px;font-weight:800;color:#1f2937;cursor:pointer;">نسخ 📋</button>
        </div>
      </div>
      <div id="hostCharactersArena" style="position:absolute;bottom:0;left:0;right:0;height:52vh;display:flex;align-items:flex-end;justify-content:center;gap:26px;padding:0 35px 24px;z-index:15;pointer-events:none;overflow-x:auto;">
        ${renderFullbodyCharactersHtml()}
      </div>
      <div style="position:absolute;bottom:12px;left:24px;display:flex;gap:14px;align-items:center;z-index:20;">
        <span style="background:rgba(17,18,37,0.85);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);padding:5px 14px;border-radius:12px;color:#ddd8ff;font-size:12px;font-weight:700;">👥 المتسابقون المتصلون: <b id="hostConnectedPlayersPill" style="color:#52d9ed;">${currentRoom.players.length}</b></span>
        <span style="background:rgba(17,18,37,0.85);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);padding:5px 14px;border-radius:12px;color:#ddd8ff;font-size:12px;font-weight:700;">⏱️ وقت الانتظار: <b id="hostLobbyTimerText" style="color:#fff;">0:00</b></span>
      </div>`;
  }

  function refreshLobbyUi() {
    if (!currentRoom) return;
    const arena = document.getElementById('hostCharactersArena');
    if (arena) arena.innerHTML = renderFullbodyCharactersHtml();
    const countEl = document.getElementById('hostPlayerCount'), countPill = document.getElementById('hostConnectedPlayersPill');
    if (countEl) countEl.textContent = currentRoom.players.length;
    if (countPill) countPill.textContent = currentRoom.players.length;
    const botCount = document.getElementById('hostBotCount');
    if (botCount) botCount.textContent = currentRoom.players.filter(p => p.isBot).length;
  }

  function renderFullbodyCharactersHtml() {
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

  function addDemoPlayer(name = null, avatarId = null) {
    if (!currentRoom) return;
    const count = currentRoom.players.length + 1;
    const demoNames = ['فريق النسور', 'فريق الفرسان', 'أبطال المستقبل', 'صقور المعرفة', 'نجوم التحدي'];
    const pName = name || (demoNames[(count - 1) % demoNames.length] + ' ' + count);
    const chars = ['char_01', 'char_02', 'char_03', 'char_04', 'char_05', 'char_06'];
    currentRoom.players.push({
      id: 'demo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: pName, avatarId: avatarId || chars[(count - 1) % chars.length], score: 0, streak: 0, isDemo: true, isBot: true, accuracy: 0.65, speed: 'medium', isRegistered: false
    });
    sfx('pop');
    if (currentRoom.status === 'lobby') refreshLobbyUi();
    if (global.toast) global.toast(`تم انضمام: ${pName} 🤖`);
  }

  function kickPlayer(playerId) {
    if (!currentRoom) return;
    const pIdStr = String(playerId), idx = currentRoom.players.findIndex(x => String(x.id) === pIdStr);
    if (idx === -1) return;
    const kicked = currentRoom.players.splice(idx, 1)[0];
    sfx('wrong');
    if (ev()) ev().publishStudentKicked(pIdStr, kicked.name);
    if (global.toast) global.toast(`تم طرد المتسابق: ${kicked.name}`);
    if (currentRoom.status === 'lobby') refreshLobbyUi();
  }

  function handleHostIncomingMessage(msg) {
    if (!currentRoom || !msg) return;
    if (msg.type === 'STUDENT_REACTION') {
      if (global.ScoreARPodiumEffects && typeof global.ScoreARPodiumEffects.handleStudentReaction === 'function') {
        global.ScoreARPodiumEffects.handleStudentReaction(msg.emoji, msg.studentName, msg.studentId);
      }
      return;
    }
    const ctx = {
      currentRoom, currentQIndex, isRoomLocked,
      onPlayerJoined: () => { sfx('pop'); if (currentRoom.status === 'lobby') refreshLobbyUi(); },
      onPlayerReconnected: () => { if (currentRoom.status === 'question' && activeQuestions[currentQIndex] && ev()) ev().publishQuestionStart(currentQIndex, activeQuestions.length, activeQuestions[currentQIndex], timeRemaining, (currentRoom?.world?.id || 'royal')); },
      onPlayerAnswered: () => { sfx('pop'); updateLiveAnswerStats(); },
      onAllAnswered: () => { finishCurrentQuestion(); }
    };
    if (ev()) ev().handleHostIncomingMessage(msg, ctx);
  }

  // PHASE 1: Launch Question with 10-Second Reading Preview (No Options)
  function launchQuestion(idx = 0) {
    if (!currentRoom) return;
    [lobbyTimerInterval, autoAdvanceTimer, qTimerInterval, readingTimerInterval].forEach(t => { if (t) clearInterval(t); });
    currentQIndex = idx;
    currentRoom.status = 'question';
    if (!currentRoom.answers[idx]) currentRoom.answers[idx] = {};
    const qData = activeQuestions[idx];
    if (!qData) { renderHostPodium(); return; }

    music('treasure', 0.32); // Standard quiz questions soundtrack: treasure
    readingTimeRemaining = 10;
    renderHostQuestionView('reading');
    sfx('reveal');
    try {
      const d = (global.ScoreARAuth?.getDb?.()) || global.firebase?.database?.();
      if (d && currentRoom?.pin) {
        d.ref('rooms/' + currentRoom.pin).update({ status: 'question', currentQuestion: idx }).catch(()=>{});
        const ansRef = d.ref(`rooms/${currentRoom.pin}/answers/${idx}`);
        ansRef.off('child_added');
        ansRef.on('child_added', (snap) => {
          const pId = snap.key, val = snap.val() || {};
          if (currentRoom?.answers) {
            if (!currentRoom.answers[idx]) currentRoom.answers[idx] = {};
            const p = currentRoom.players.find(x => x.id === pId);
            currentRoom.answers[idx][pId] = { playerId: pId, playerName: p?.name || val.playerName || '', optionIndex: Number(val.optionIndex), timeRemaining: Number(val.timeRemaining) || 0, answeredAt: val.ts || Date.now() };
            sfx('pop');
            updateLiveAnswerStats();
            if (currentRoom.players.length > 0 && Object.keys(currentRoom.answers[idx]).length >= currentRoom.players.length) finishCurrentQuestion();
          }
        });
      }
    } catch(e){}

    if (ev()) ev().publishQuestionReading(idx, activeQuestions.length, qData, (currentRoom?.world?.id || 'royal'));

    readingTimerInterval = setInterval(() => {
      readingTimeRemaining--;
      const el = document.getElementById('hostReadingCountdownNum'), ring = document.getElementById('hostReadingProgressCircle');
      if (el) el.textContent = readingTimeRemaining;
      if (ring) ring.style.strokeDashoffset = (283 - (283 * (10 - readingTimeRemaining) / 10));
      if (readingTimeRemaining <= 3 && readingTimeRemaining > 0) sfx('tick');
      if (readingTimeRemaining <= 0) {
        clearInterval(readingTimerInterval);
        revealQuestionOptionsNow();
      }
    }, 1000);
  }

  // PHASE 2: Reveal Options and Start Active Timer
  function revealQuestionOptionsNow() {
    if (readingTimerInterval) clearInterval(readingTimerInterval);
    const qData = activeQuestions[currentQIndex];
    if (!qData) return;
    timeRemaining = qData.timeLimit || 20;
    renderHostQuestionView('answering');
    sfx('reveal');
    try { const d=(global.ScoreARAuth?.getDb?.())||global.firebase?.database?.(); if(d&&currentRoom?.pin) d.ref('rooms/'+currentRoom.pin).update({status:'answering'}).catch(()=>{}); } catch(e){}

    if (ev()) ev().publishQuestionStart(currentQIndex, activeQuestions.length, qData, timeRemaining, (currentRoom?.world?.id || 'royal'));
    if (global.ScoreARBots) global.ScoreARBots.onQuestionStart(currentQIndex, qData, timeRemaining);
    startAnsweringCountdown();
  }

  function renderHostQuestionView(phase = 'reading') {
    const stage = getOrCreateStage(), qData = activeQuestions[currentQIndex], total = activeQuestions.length;
    const isReading = (phase === 'reading'), opts = qData.options || qData.opts || [];
    const worldId = (currentRoom && currentRoom.world && currentRoom.world.id) ? currentRoom.world.id : 'royal';

    stage.innerHTML = `
      <div style="position:absolute;inset:0;overflow:hidden;z-index:0;background:url('assets/worlds/${worldId}/question.jpg') center/cover no-repeat;">
        <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 30%, rgba(15,23,42,0.65) 0%, rgba(12,13,30,0.92) 100%);"></div>
      </div>
      <header style="position:relative;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:12px 28px;background:rgba(12,13,30,0.7);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,0.1);">
        <div style="display:flex;align-items:center;gap:12px;">
          <button onclick="ScoreARQuizHost.closeHostSession()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 12px;border-radius:8px;font-weight:800;font-size:11px;cursor:pointer;">✕ إنهاء</button>
          <div style="background:rgba(99,102,241,0.25);border:1px solid rgba(99,102,241,0.4);color:#c7d2fe;padding:4px 12px;border-radius:16px;font-size:12px;font-weight:800;">السؤال ${currentQIndex + 1} من ${total} • ${qData.skill || 'لغة عربية'}</div>
          ${(qData.isDouble || qData.multiplier === 2) ? `<span style="background:linear-gradient(135deg, #f59e0b, #d97706);color:#fff;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:900;box-shadow:0 0 12px rgba(245,158,11,0.5);">⚡ نقاط ×2</span>` : ''}
        </div>
        <div style="background:#ffffff;border:2px solid #6366f1;border-radius:10px;padding:4px 20px;font-size:20px;font-weight:900;letter-spacing:6px;color:#0f172a;font-family:monospace;">${currentRoom.pin}</div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="font-size:12px;color:#94a3b8;font-weight:700;">حالة الإجابات: <span style="background:rgba(52,211,153,0.15);border:1px solid rgba(52,211,153,0.3);color:#34d399;padding:3px 10px;border-radius:12px;font-size:13px;font-weight:900;">أجاب <b id="hostAnsweredCount">0</b> من <b>${currentRoom.players.length}</b></span></div>
          <button onclick="ScoreARQuizHost.toggleExplanation()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fbbf24;padding:6px 12px;border-radius:8px;font-weight:800;font-size:11px;cursor:pointer;">💡 التفسير</button>
        </div>
      </header>
      <main id="hostQuestionMain" style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:16px 28px;">
        <div style="width:100%;max-width:960px;background:rgba(15,23,42,0.85);backdrop-filter:blur(20px);border:2px solid rgba(255,255,255,0.15);border-radius:20px;padding:20px 28px;text-align:center;box-shadow:0 12px 36px rgba(0,0,0,0.5);margin-top:4px;">
          <div style="font-size:11px;font-weight:800;color:#818cf8;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">${isReading ? '📖 اقرأ السؤال بتأمل (مرحلة الاستيعاب)' : '⚡ اختر الإجابة الصحيحة الآن!'}</div>
          <h1 style="font-size:25px;font-weight:900;color:#ffffff;line-height:1.45;margin:0;">${qData.text || qData.q}</h1>
          ${(qData.imageUrl || qData.img) ? `
            <div style="display:flex;justify-content:center;margin:8px 0;max-height:160px;">
              <img src="${qData.imageUrl || qData.img}" alt="${escapeHtml(qData.imageAlt || '')}" style="max-height:160px;max-width:100%;object-fit:contain;border-radius:12px;border:1px solid rgba(255,255,255,0.2);">
            </div>
          ` : ''}
        </div>
        ${isReading ? `
          <div style="display:flex;flex-direction:column;align-items:center;margin:24px 0;">
            <div style="position:relative;width:120px;height:120px;display:flex;align-items:center;justify-content:center;">
              <svg width="120" height="120" style="transform:rotate(-90deg);position:absolute;inset:0;">
                <circle cx="60" cy="60" r="45" stroke="rgba(255,255,255,0.1)" stroke-width="8" fill="none"/>
                <circle id="hostReadingProgressCircle" cx="60" cy="60" r="45" stroke="#f59e0b" stroke-width="8" fill="none" stroke-dasharray="283" stroke-dashoffset="0" style="transition:stroke-dashoffset 1s linear;"/>
              </svg>
              <div style="font-size:42px;font-weight:900;color:#fcd34d;font-family:monospace;" id="hostReadingCountdownNum">${readingTimeRemaining}</div>
            </div>
            <div style="font-size:14px;font-weight:800;color:#e2e8f0;margin-top:14px;background:rgba(0,0,0,0.4);padding:6px 18px;border-radius:20px;">ستظهر خيارات الإجابة فور انتهاء المؤقت...</div>
          </div>
        ` : `
          <div style="display:flex;align-items:center;justify-content:center;gap:18px;margin:8px 0;">
            <div style="font-size:13px;font-weight:800;color:#94a3b8;">المتبقي:</div>
            <div id="hostTimerBadge" style="background:#e11d48;color:#fff;font-size:28px;font-weight:900;padding:4px 22px;border-radius:14px;box-shadow:0 6px 18px rgba(225,29,72,0.4);font-family:monospace;">${timeRemaining}s</div>
          </div>
        `}
        <div id="hostOptionsGrid" style="width:100%;max-width:980px;display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8px;visibility:${isReading ? 'hidden' : 'visible'};">
          ${opts.slice(0, 4).map((opt, i) => {
            const theme = OPTION_THEMES[i % 4];
            return `<div id="hostOptCard_${i}" style="background:${theme.bg};border:2px solid ${theme.border};border-radius:14px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 8px 20px rgba(0,0,0,0.35);transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);position:relative;">
              <div style="display:flex;align-items:center;gap:12px;flex:1;"><span style="font-size:22px;font-weight:900;color:rgba(255,255,255,0.9);">${theme.shape}</span><span style="font-size:18px;font-weight:900;color:#ffffff;line-height:1.3;">${opt}</span></div>
              <div style="display:flex;align-items:center;gap:8px;"><span id="hostOptBadge_${i}" style="display:none;background:#ffffff;color:#065f46;font-size:12px;font-weight:900;padding:3px 10px;border-radius:10px;">الإجابة النموذجية ✓</span><span id="hostOptCount_${i}" style="display:none;background:rgba(0,0,0,0.5);color:#fff;font-size:14px;font-weight:900;padding:4px 10px;border-radius:10px;font-family:monospace;">0</span></div>
            </div>`;
          }).join('')}
        </div>
        <div id="hostExplanationBox" style="display:none;width:100%;max-width:960px;background:rgba(251,191,36,0.15);border:1px solid #fbbf24;border-radius:14px;padding:10px 18px;color:#fef3c7;font-size:13px;font-weight:700;line-height:1.5;text-align:right;">
          💡 <b>تفسير الإجابة:</b> ${qData.explanation || qData.why || 'لا يوجد تفسير متاح لهذا السؤال.'}
        </div>
      </main>`;
  }

  function startAnsweringCountdown() {
    if (qTimerInterval) clearInterval(qTimerInterval);
    qTimerInterval = setInterval(() => {
      timeRemaining--;
      const el = document.getElementById('hostTimerBadge');
      if (el) el.textContent = timeRemaining + 's';
      if (timeRemaining <= 5 && timeRemaining > 0) sfx('tick');
      if (timeRemaining <= 0) {
        clearInterval(qTimerInterval);
        finishCurrentQuestion();
      }
    }, 1000);
  }

  function updateLiveAnswerStats() {
    if (!currentRoom) return;
    const qIndex = currentQIndex, answers = currentRoom.answers[qIndex] || {};
    const countEl = document.getElementById('hostAnsweredCount');
    if (countEl) countEl.textContent = Object.keys(answers).length;
  }

  // PHASE 3: Answer Reveal & Feedback (Mark Correct Answer on Host)
  function finishCurrentQuestion() {
    [qTimerInterval, readingTimerInterval, autoAdvanceTimer].forEach(t => { if (t) clearInterval(t); });
    try { const d=(global.ScoreARAuth?.getDb?.())||global.firebase?.database?.(); if(d&&currentRoom?.pin) d.ref(`rooms/${currentRoom.pin}/answers/${currentQIndex}`).off('child_added'); } catch(e){}
    if (global.ScoreARBots) global.ScoreARBots.clearPendingAnswers();
    const qIndex = currentQIndex, qData = activeQuestions[qIndex];
    if (!qData) return;
    const answers = currentRoom.answers[qIndex] || {}, totalTime = qData.timeLimit || 20;
    const evalResult = ev()
      ? ev().evaluateQuestionResults(qData, answers, currentRoom.players, totalTime)
      : { correct: [0], correctAnswer: 0, correctAnswerText: '', playerResults: {}, fastest: null };

    const correctIndices = evalResult.correct, correctIdx = evalResult.correctAnswer;
    const playerResults = evalResult.playerResults, fastest = evalResult.fastest;
    lastFastestStudent = fastest;
    sfx('correct');

    // Reveal option distribution counts ONLY after answering concludes
    const counts = [0, 0, 0, 0];
    Object.values(answers).forEach(a => {
      if (a.optionIndex >= 0 && a.optionIndex < 4) counts[a.optionIndex]++;
    });
    counts.forEach((c, i) => {
      const el = document.getElementById(`hostOptCount_${i}`);
      if (el) { el.textContent = `${c} طالب`; el.style.display = 'inline-block'; }
    });

    for (let i = 0; i < 4; i++) {
      const card = document.getElementById(`hostOptCard_${i}`), badge = document.getElementById(`hostOptBadge_${i}`);
      if (card) {
        if (correctIndices.includes(i)) {
          card.style.transform = 'scale(1.03)';
          card.style.boxShadow = '0 0 35px #10b981, 0 0 70px rgba(16,185,129,0.5)';
          card.style.border = '3px solid #34d399';
          card.style.background = '#059669';
          card.style.opacity = '1';
          if (badge) { badge.style.display = 'inline-block'; badge.innerHTML = 'الإجابة النموذجية ✓'; }
        } else {
          card.style.opacity = '0';
          card.style.transform = 'scale(0.92)';
          card.style.pointerEvents = 'none';
          card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        }
      }
    }

    const mainEl = document.getElementById('hostQuestionMain');
    let revealBanner = document.getElementById('hostRevealBanner');
    if (!revealBanner && mainEl) {
      revealBanner = document.createElement('div');
      revealBanner.id = 'hostRevealBanner';
      revealBanner.style.cssText = 'width:100%;max-width:820px;background:rgba(16,185,129,0.95);border:2px solid #34d399;border-radius:14px;padding:10px 18px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 8px 24px rgba(16,185,129,0.45);margin-bottom:6px;color:#fff;animation:enterFullBody 0.35s ease;z-index:25;';
      revealBanner.innerHTML = `<div style="display:flex;align-items:center;gap:12px;"><span style="font-size:24px;">✓</span><div><div style="font-size:15px;font-weight:900;">انتهى وقت الإجابة</div>${fastest ? `<div style="font-size:12px;color:#ecfdf5;font-weight:800;margin-top:2px;">⚡ الأسرع: <b>${fastest.name}</b> خلال <b>${fastest.timeSec} ثانية</b> (+${fastest.points} نقطة)</div>` : ''}</div></div>
        <button id="hostGoLeaderboardBtn" onclick="ScoreARQuizHost.renderHostLeaderboard()" style="background:#ffffff;color:#065f46;border:none;padding:8px 16px;border-radius:10px;font-weight:900;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;"><span>عرض لوحة الصدارة</span><span id="hostAutoCountdownPill" style="background:#10b981;color:#fff;padding:2px 6px;border-radius:6px;font-size:11px;">4s</span><span>➔</span></button>`;
      mainEl.insertBefore(revealBanner, mainEl.children[1]);
    }

    const expBox = document.getElementById('hostExplanationBox');
    if (expBox) expBox.style.display = 'block';

    let autoSec = 4;
    autoAdvanceTimer = setInterval(() => {
      autoSec--;
      const pill = document.getElementById('hostAutoCountdownPill');
      if (pill) pill.textContent = autoSec + 's';
      if (autoSec <= 0) { clearInterval(autoAdvanceTimer); renderHostLeaderboard(); }
    }, 1000);

    if (ev()) {
      ev().publishQuestionResult({
        qIndex, questionText: qData.text || qData.q, options: qData.options || qData.opts,
        correct: correctIndices, correctAnswer: correctIdx, correctAnswerText: evalResult.correctAnswerText,
        explanation: qData.explanation || qData.why || '', fastestStudent: fastest,
        topLeaderboard: [...currentRoom.players].sort((a,b) => b.score - a.score).slice(0, 5),
        playerResults, worldId: (currentRoom?.world?.id || 'royal')
      });
    }
  }

  function toggleExplanation() { const b = document.getElementById('hostExplanationBox'); if (b) b.style.display = (b.style.display === 'none' || !b.style.display) ? 'block' : 'none'; }
  function toggleRoomLock() {
    isRoomLocked = !isRoomLocked;
    const btn = document.getElementById('hostLockBtn');
    if (btn) { btn.innerHTML = isRoomLocked ? '🔒 القاعة مقفلة' : '🔓 القاعة مفتوحة'; btn.style.color = isRoomLocked ? '#ef4444' : '#10b981'; }
    if (ev()) ev().publishRoomLockState(isRoomLocked);
  }
  function renderHostLeaderboard() {
    if (autoAdvanceTimer) clearInterval(autoAdvanceTimer);
    if (ev()) ev().renderHostLeaderboard(getOrCreateStage(), currentRoom, activeQuestions, currentQIndex, launchQuestion, renderHostPodium, closeHostSession);
  }
  function renderHostPodium() {
    const s = getOrCreateStage();
    if (global.ScoreARPodiumEffects?.renderHostPodium) global.ScoreARPodiumEffects.renderHostPodium(s, currentRoom, closeHostSession);
    else if (ev()) ev().renderHostPodium(s, currentRoom, closeHostSession);
  }

  const ScoreARQuizHost = {
    startHostLobby, closeHostSession, addDemoPlayer, kickPlayer, launchQuestion,
    revealQuestionOptionsNow, finishCurrentQuestion, renderHostLeaderboard, renderHostPodium,
    toggleExplanation, toggleRoomLock, refreshLobbyUi, handleHostIncomingMessage,
    getCurrentRoom: () => currentRoom,
    getPin: () => currentRoom ? currentRoom.pin : null,
    getPlayers: () => currentRoom ? currentRoom.players : [],
    isLocked: () => !!isRoomLocked,
    getRoomStatus: () => currentRoom ? currentRoom.status : null
  };

  global.ScoreARQuizHost = ScoreARQuizHost;
  try { if (typeof globalThis !== 'undefined') globalThis.ScoreARQuizHost = ScoreARQuizHost; } catch(e){}
  if (typeof module !== 'undefined' && module.exports) module.exports = ScoreARQuizHost;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
