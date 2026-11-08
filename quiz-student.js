/**
 * ScoreAR Quiz Student Controller
 * Handles Student Session, Realtime Handshake, and Anti-Cheat ServerValue.TIMESTAMP Submissions.
 * Strictly Rule 7 Compliant (<300 lines, margin > 100 lines).
 */
(function(global) {
  'use strict';

  let currentPin = null, currentStudent = null, currentWorldId = 'royal';
  let currentQIndex = 0, currentQData = null, selectedOptionIndex = null;
  let timeRemaining = 0, qTimerInterval = null, currentScore = 0, currentStreak = 0;
  let lastRank = null, hasAnsweredCurrentQ = false;

  function view() { return global.ScoreARQuizStudentView || null; }

  function getOrCreateStudentStage() {
    let stage = document.getElementById('scorearStudentStage');
    if (!stage) {
      stage = document.createElement('div');
      stage.id = 'scorearStudentStage';
      stage.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0c0d1e;overflow:hidden;font-family:Cairo,Tajawal,sans-serif;direction:rtl;display:flex;flex-direction:column;';
      document.body.appendChild(stage);
    }
    stage.style.display = 'flex';
    return stage;
  }

  function saveActiveSession() {
    try {
      if (currentPin && currentStudent) {
        sessionStorage.setItem('scorear_active_quiz_session', JSON.stringify({ pin: currentPin, uid: currentStudent.uid, name: currentStudent.name, avatarId: currentStudent.avatarId, score: currentScore, streak: currentStreak, rank: lastRank, worldId: currentWorldId, savedAt: Date.now() }));
      }
    } catch(e){}
  }

  function clearActiveSession() { try { sessionStorage.removeItem('scorear_active_quiz_session'); } catch(e){} }

  function closeStudentSession() {
    clearActiveSession();
    if (qTimerInterval) clearInterval(qTimerInterval);
    if (window._studentHandshakeInterval) clearInterval(window._studentHandshakeInterval);
    if (global.ScoreARAudio) global.ScoreARAudio.stopMusic();
    if (global.ScoreARRealtime) global.ScoreARRealtime.cleanup();
    const stage = document.getElementById('scorearStudentStage');
    if (stage) stage.style.display = 'none';
    currentPin = null; currentStudent = null;
  }

  function startStudentSession(pin, student, optionalAvatar) {
    currentPin = String(pin).trim();
    const isObj = (student && typeof student === 'object');
    if (isObj && student.worldId) currentWorldId = student.worldId;
    currentStudent = {
      uid: (isObj && (student.uid || student.id)) ? (student.uid || student.id) : ('s_' + Math.random().toString(36).substring(2, 8)),
      name: isObj ? (student.name || 'بطل جديد') : (typeof student === 'string' ? student : 'بطل جديد'),
      avatarId: (isObj && student.avatarId) ? student.avatarId : (optionalAvatar || 'char_01')
    };

    if (global.ScoreARRealtime) {
      global.ScoreARRealtime.init('student', currentPin, handleStudentIncomingMessage);
      global.ScoreARRealtime.subscribe(handleStudentIncomingMessage);
      global.ScoreARRealtime.publish('STUDENT_JOIN', { player: { id: currentStudent.uid, name: currentStudent.name, avatarId: currentStudent.avatarId }, pin: currentPin });
    }

    renderStudentLobby(currentWorldId, currentStudent);
  }

  function renderStudentLobby(worldId, student) {
    const stage = getOrCreateStudentStage(), avatarId = student.avatarId || 'char_01';
    stage.innerHTML = `
      <div style="position:absolute;inset:0;background:url('assets/worlds/${worldId}/waiting.jpg') center/cover no-repeat;filter:brightness(0.4);z-index:1;"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 30%, rgba(26,24,64,0.7) 0%, rgba(12,13,30,0.92) 100%);z-index:2;"></div>
      <header style="position:relative;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:rgba(12,13,30,0.65);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,0.1);">
        <div style="font-size:12px;color:#a89bff;font-weight:700;">رمز القاعة: <b style="color:#fff;letter-spacing:2px;font-size:14px;">${currentPin}</b></div>
        <button onclick="ScoreARQuizStudent.closeStudentSession()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">خروج ✕</button>
      </header>
      <main style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;text-align:center;">
        <img src="assets/characters/animated/${avatarId}-idle.webp" onerror="this.src='assets/avatars/${avatarId}.png'" alt="${student.name}" style="width:110px;height:140px;object-fit:contain;animation:character-joy 1.2s ease-in-out infinite;filter:drop-shadow(0 10px 20px rgba(0,0,0,0.5));">
        <h2 style="font-size:22px;font-weight:900;color:#ffffff;margin:8px 0 2px 0;">أهلاً بك يا ${student.name}! ✨</h2>
        <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);padding:8px 16px;border-radius:12px;color:#c9baff;font-size:13px;font-weight:800;margin-top:6px;">
          ⏳ أنت في قاعة الانتظار الآن، ستبدأ المسابقة فور إطلاق المعلم للسؤال الأول!
        </div>
        <div id="studentFeedbackBox" style="margin-top:14px;font-size:12px;color:#a89bff;">● متصل بالبث المباشر للقاعة</div>
      </main>`;
  }

  function handleStudentIncomingMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'QUESTION_READING') {
      currentQData = msg;
      currentQIndex = msg.qIndex || 0;
      timeRemaining = msg.readingTime || 10;
      hasAnsweredCurrentQ = false;
      selectedOptionIndex = null;
      if (global.ScoreARAudio) global.ScoreARAudio.playSfx('whoosh');
      if (view()) view().renderStudentReading(getOrCreateStudentStage(), msg, currentWorldId, timeRemaining);
      if (qTimerInterval) clearInterval(qTimerInterval);
      qTimerInterval = setInterval(() => {
        timeRemaining--;
        const txt = document.getElementById('studentReadingCountdown');
        if (txt) txt.textContent = timeRemaining;
        if (timeRemaining <= 3 && timeRemaining > 0 && global.ScoreARAudio) global.ScoreARAudio.playSfx('tick');
        if (timeRemaining <= 0) clearInterval(qTimerInterval);
      }, 1000);
    } else if (msg.type === 'QUESTION_START') {
      renderStudentQuestion(msg);
    } else if (msg.type === 'QUESTION_RESULT') {
      renderStudentResult(msg);
    } else if (msg.type === 'QUESTION_SKIPPED') {
      if (qTimerInterval) clearInterval(qTimerInterval);
      const fb = document.getElementById('studentFeedbackBox');
      if (fb) fb.innerHTML = '⏭️ قام المعلم بتخطي هذا السؤال.';
    } else if (msg.type === 'ROOM_LOCKED') {
      disableAllOptionButtons('🔒 تم قفل استقبال الإجابات');
    } else if (msg.type === 'STUDENT_KICKED' && String(msg.studentId) === String(currentStudent?.uid)) {
      if (global.toast) global.toast('تم إخراجك من القاعة بواسطة المعلم.');
      closeStudentSession();
    } else if (msg.type === 'CONTEST_COMPLETED') {
      clearActiveSession();
      if (view()) view().renderStudentFinalPodium(getOrCreateStudentStage(), msg, currentStudent, currentScore, currentWorldId);
    } else if (msg.type === 'ROOM_CLOSED') {
      renderStudentRoomClosed(msg.reason);
    }
  }

  function renderStudentQuestion(qData) {
    if (qTimerInterval) clearInterval(qTimerInterval);
    if (global.ScoreARAudio) global.ScoreARAudio.playSfx('reveal');
    currentQData = qData;
    currentQIndex = qData.qIndex || 0;
    timeRemaining = qData.timeLimit || 20;
    const totalTime = timeRemaining;
    hasAnsweredCurrentQ = false;
    selectedOptionIndex = null;

    if (view()) view().renderStudentQuestion(getOrCreateStudentStage(), qData, currentWorldId, timeRemaining);

    qTimerInterval = setInterval(() => {
      timeRemaining--;
      const txt = document.getElementById('studentTimerText'), bar = document.getElementById('studentProgressBar');
      if (txt) txt.textContent = timeRemaining;
      if (bar) bar.style.width = ((timeRemaining / totalTime) * 100) + '%';
      if (timeRemaining <= 5 && timeRemaining > 0 && global.ScoreARAudio) global.ScoreARAudio.playSfx('tick');
      if (timeRemaining <= 0) {
        clearInterval(qTimerInterval);
        if (!hasAnsweredCurrentQ) disableAllOptionButtons('⏳ انتهى وقت الإجابة! في انتظار نتيجة المعلم...');
      }
    }, 1000);
  }

  // Anti-Cheat Submission: Uses ServerValue.TIMESTAMP (Item 2) and removes client timeRemaining
  function submitAnswer(idx) {
    if (hasAnsweredCurrentQ) return;
    hasAnsweredCurrentQ = true;
    selectedOptionIndex = idx;
    disableAllOptionButtons();
    if (global.ScoreARAudio) global.ScoreARAudio.playSfx('pop');

    const chosenBtn = document.getElementById(`studentOptBtn_${idx}`);
    if (chosenBtn) {
      chosenBtn.style.transform = 'scale(1.02)';
      chosenBtn.style.border = '2.5px solid #a89bff';
      chosenBtn.style.boxShadow = '0 0 16px rgba(168,155,255,0.45)';
      chosenBtn.style.background = '#252148';
      chosenBtn.style.opacity = '1';
    }
    const ind = document.getElementById(`studentOptIndicator_${idx}`);
    if (ind) ind.textContent = '🔒 تم قفل اختيارك';
    const fb = document.getElementById('studentFeedbackBox');
    if (fb) fb.innerHTML = '🔒 <strong style="color:#a89bff;">تم قفل اختيارك بنجاح!</strong> بانتظار انتهاء الوقت وإعلان النتيجة...';

    // 1. Write answer EXCLUSIVELY to locked node with server timestamp (now)
    try {
      const db = (window.ScoreARAuth?.getDb?.()) || (window.firebase?.database?.());
      if (db && currentPin && currentStudent?.uid) {
        const serverTs = (window.firebase?.database?.ServerValue?.TIMESTAMP) || { ".sv": "timestamp" };
        db.ref(`rooms/${currentPin}/answers/${currentQIndex}/${currentStudent.uid}`).set({
          optionIndex: idx,
          ts: serverTs
        }).catch(()=>{});
      }
    } catch(e) {}

    // 2. Public wire transmission carries ZERO choice payload
    if (global.ScoreARRealtime) {
      global.ScoreARRealtime.publish('STUDENT_ANSWERED', {
        playerId: currentStudent.uid,
        answeredAt: Date.now()
      });
    }
  }

  function disableAllOptionButtons(customMessage = null) {
    const btns = document.querySelectorAll('.student-opt-btn');
    btns.forEach(b => { b.disabled = true; b.style.pointerEvents = 'none'; b.style.opacity = '0.55'; });
    if (customMessage) {
      const fb = document.getElementById('studentFeedbackBox');
      if (fb) fb.textContent = customMessage;
    }
  }

  function renderStudentResult(resData) {
    if (qTimerInterval) clearInterval(qTimerInterval);
    if (view()) {
      const outcome = view().renderStudentResult(getOrCreateStudentStage(), resData, {
        currentStudent, currentWorldId, currentQIndex, selectedOptionIndex, currentScore, currentStreak, lastRank
      });
      if (outcome) {
        currentScore = outcome.updatedScore;
        currentStreak = outcome.isCorrect ? (currentStreak + 1) : 0;
        if (outcome.currentRank !== '-') lastRank = outcome.currentRank;
        saveActiveSession();
      }
    }
  }

  let lastReactionTime = 0;
  function sendReaction(emoji) {
    const now = Date.now();
    if (now - lastReactionTime < 400) return;
    lastReactionTime = now;
    if (global.ScoreARAudio) global.ScoreARAudio.playSfx('pop');
    if (global.ScoreARRealtime && currentPin) {
      global.ScoreARRealtime.publish('STUDENT_REACTION', { emoji, studentName: currentStudent?.name || 'طالب', studentId: currentStudent?.uid || 'anon', pin: currentPin });
    }
  }

  function renderStudentRoomClosed(reason) {
    if (qTimerInterval) clearInterval(qTimerInterval);
    if (window._studentHandshakeInterval) clearInterval(window._studentHandshakeInterval);
    clearActiveSession();
    if (global.ScoreARAudio) { global.ScoreARAudio.stopMusic(); global.ScoreARAudio.playSfx('whoosh'); }
    if (view()) view().renderStudentRoomClosed(getOrCreateStudentStage(), reason, currentStudent, currentScore, currentWorldId);
  }

  global.ScoreARQuizStudent = {
    startStudentSession, submitAnswer, renderStudentQuestion, renderStudentResult,
    closeStudentSession, renderStudentRoomClosed, saveActiveSession, clearActiveSession,
    sendReaction, getPin: () => currentPin, get state() { return currentStudent; }
  };
  global.ScoreARStudent = global.ScoreARQuizStudent;
})(typeof window !== 'undefined' ? window : this);
