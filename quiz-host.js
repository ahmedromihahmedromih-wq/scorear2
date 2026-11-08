/**
 * ScoreAR Quiz Host Controller (Teacher Projector View)
 * Manages Room Lifecycle, Question Progression, Anti-Cheat Server Timestamps, and Evaluation.
 * Strictly Rule 7 Compliant (<300 lines, margin > 100 lines).
 */
(function(global) {
  'use strict';

  let currentRoom = null, currentQIndex = 0, qTimerInterval = null, readingTimerInterval = null;
  let lobbyTimerInterval = null, autoAdvanceTimer = null, lobbyElapsedSeconds = 0;
  let timeRemaining = 0, readingTimeRemaining = 10, isRoomLocked = false;
  let activeQuestions = [], lastFastestStudent = null, questionStartTime = 0;

  function sfx(t) { if (global.ScoreARAudio) global.ScoreARAudio.playSfx(t); }
  function music(tr, vol) { if (global.ScoreARAudio) global.ScoreARAudio.playMusic(tr, vol); }
  function ev() { return global.ScoreARHostEvents || null; }
  function view() { return global.ScoreARQuizHostView || null; }

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

    if (view()) view().renderHostLobby(getOrCreateStage(), currentRoom, isRoomLocked);
    try {
      const liveBg = document.getElementById('hostLiveVideoBg');
      if (liveBg && liveBg.paused) liveBg.play().catch(() => {});
    } catch(e){}

    if (ev()) ev().publishRoomOpen(pin, w.id);
    music('magic', 0.28);

    lobbyTimerInterval = setInterval(() => {
      lobbyElapsedSeconds++;
      const el = document.getElementById('hostLobbyTimerText');
      if (el) { const m = Math.floor(lobbyElapsedSeconds / 60), s = lobbyElapsedSeconds % 60; el.textContent = `${m}:${s < 10 ? '0' : ''}${s}`; }
    }, 1000);
  }

  function refreshLobbyUi() {
    if (view() && currentRoom) view().refreshLobbyUi(currentRoom);
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

  function launchQuestion(idx = 0) {
    if (!currentRoom) return;
    [lobbyTimerInterval, autoAdvanceTimer, qTimerInterval, readingTimerInterval].forEach(t => { if (t) clearInterval(t); });
    currentQIndex = idx;
    currentRoom.status = 'question';
    if (!currentRoom.answers[idx]) currentRoom.answers[idx] = {};
    const qData = activeQuestions[idx];
    if (!qData) { renderHostPodium(); return; }

    music('treasure', 0.32);
    readingTimeRemaining = 10;
    if (view()) view().renderHostQuestionView(getOrCreateStage(), 'reading', qData, idx, activeQuestions.length, (currentRoom?.world?.id || 'royal'), 0, readingTimeRemaining);
    sfx('reveal');

    // Secure RTDB Listener for Student Answers (Anti-Cheat Server Timestamps)
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
            currentRoom.answers[idx][pId] = {
              playerId: pId,
              playerName: p?.name || val.playerName || '',
              optionIndex: Number(val.optionIndex),
              ts: Number(val.ts) || Date.now(),
              answeredAt: Number(val.ts) || Date.now()
            };
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
      if (ring) ring.style.strokeDashoffset = (314.16 - (314.16 * (10 - readingTimeRemaining) / 10));
      if (readingTimeRemaining <= 3 && readingTimeRemaining > 0) sfx('tick');
      if (readingTimeRemaining <= 0) {
        clearInterval(readingTimerInterval);
        revealQuestionOptionsNow();
      }
    }, 1000);
  }

  function revealQuestionOptionsNow() {
    if (readingTimerInterval) clearInterval(readingTimerInterval);
    const qData = activeQuestions[currentQIndex];
    if (!qData) return;
    timeRemaining = qData.timeLimit || 20;
    questionStartTime = Date.now(); // Authoritative host question start time (Item 2)

    const worldId = (currentRoom?.world?.id || 'royal');
    const stage = getOrCreateStage();
    if (view() && view().animateToAnswering) {
      view().animateToAnswering(stage, qData, currentQIndex, activeQuestions.length, worldId, timeRemaining);
    } else if (view()) {
      view().renderHostQuestionView(stage, 'answering', qData, currentQIndex, activeQuestions.length, worldId, timeRemaining, 0);
    }
    sfx('reveal');
    try { const d=(global.ScoreARAuth?.getDb?.())||global.firebase?.database?.(); if(d&&currentRoom?.pin) d.ref('rooms/'+currentRoom.pin).update({status:'answering'}).catch(()=>{}); } catch(e){}

    if (ev()) ev().publishQuestionStart(currentQIndex, activeQuestions.length, qData, timeRemaining, worldId);
    if (global.ScoreARBots) global.ScoreARBots.onQuestionStart(currentQIndex, qData, timeRemaining);
    startAnsweringCountdown();
  }

  function startAnsweringCountdown() {
    if (qTimerInterval) clearInterval(qTimerInterval);
    const totalTime = timeRemaining;
    const totalEl = document.getElementById('hostTotalStudentsCount');
    if (totalEl && currentRoom) totalEl.textContent = currentRoom.players.length;

    qTimerInterval = setInterval(() => {
      timeRemaining--;
      const el = document.getElementById('hostQuestionTimerNum');
      if (el) el.textContent = timeRemaining;
      const ring = document.getElementById('hostQuestionTimerRing');
      if (ring) {
        const circumference = 257.6;
        const progress = Math.max(0, timeRemaining) / totalTime;
        ring.style.strokeDashoffset = circumference * (1 - progress);
      }
      const timerBox = document.getElementById('hostWorldTimerContainer');
      if (timeRemaining <= 5 && timeRemaining > 0) {
        if (timerBox) timerBox.classList.add('timer-hurry-pulse');
        sfx('tick');
      }
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

  function finishCurrentQuestion() {
    [qTimerInterval, readingTimerInterval, autoAdvanceTimer].forEach(t => { if (t) clearInterval(t); });
    try { const d=(global.ScoreARAuth?.getDb?.())||global.firebase?.database?.(); if(d&&currentRoom?.pin) d.ref(`rooms/${currentRoom.pin}/answers/${currentQIndex}`).off('child_added'); } catch(e){}
    if (global.ScoreARBots) global.ScoreARBots.clearPendingAnswers();
    const qIndex = currentQIndex, qData = activeQuestions[qIndex];
    if (!qData) return;
    const answers = currentRoom.answers[qIndex] || {}, totalTime = qData.timeLimit || 20;

    // Anti-Cheat Evaluation: Pass questionStartTime so scoring is calculated strictly from server ts
    const evalResult = ev()
      ? ev().evaluateQuestionResults(qData, answers, currentRoom.players, totalTime, questionStartTime)
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
      const b = document.getElementById(`hostOptionCountBadge_${i}`);
      if (b) { b.textContent = c; b.style.display = 'block'; }
    });

    // Reveal animation: wrong options dim down instead of vanishing
    for (let i = 0; i < 4; i++) {
      const card = document.getElementById(`hostOptionCard_${i}`);
      const txt = document.getElementById(`hostOptionText_${i}`);
      if (!card) continue;
      const isCorrect = correctIndices.includes(i) || (i === correctIdx);
      if (isCorrect) {
        card.className = 'host-option-card correct-revealed';
        card.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        card.style.border = '3px solid #34d399';
        card.style.boxShadow = '0 0 35px rgba(16,185,129,0.85), inset 0 0 20px rgba(255,255,255,0.3)';
        card.style.transform = 'scale(1.04)';
        card.style.zIndex = '10';
        if (txt && !txt.innerHTML.includes('✓')) txt.innerHTML = `✓ ${txt.innerHTML}`;
      } else {
        card.className = 'host-option-card wrong-dimmed';
        card.style.opacity = '0.32';
        card.style.filter = 'grayscale(65%) brightness(0.65)';
        card.style.transform = 'scale(0.96)';
        card.style.pointerEvents = 'none';
        card.style.transition = 'opacity 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), filter 0.6s ease, transform 0.6s ease';
      }
    }

    let autoSec = 5;
    autoAdvanceTimer = setInterval(() => {
      autoSec--;
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
    toggleRoomLock, refreshLobbyUi, handleHostIncomingMessage,
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
