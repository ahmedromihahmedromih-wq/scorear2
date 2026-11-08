/**
 * ScoreAR Quiz Student (Mobile Device View)
 * 100dvh Single Column (Zero Scroll, No Text Blur, High Contrast)
 * Instant Multi-Device Sync over ScoreARRealtime
 * Rule 7 Compliant (<500 lines)
 */
(function(global) {
  'use strict';

  let currentPin = null, currentStudent = null, currentQIndex = 0;
  let qTimerInterval = null, timeRemaining = 0, hasAnsweredCurrentQ = false;
  let selectedOptionIndex = null, currentScore = 0, lastRank = null, currentStreak = 0;
  let currentQData = null, currentWorldId = 'royal';

  const OPTION_THEMES = [
    { bg: '#e21b3c', border: '#ff5c77', shape: '▲' }, { bg: '#1368ce', border: '#4f9fff', shape: '◆' },
    { bg: '#d89e00', border: '#ffd24d', shape: '●' }, { bg: '#26890c', border: '#5cdb3b', shape: '■' }
  ];
  function escapeHtml(str) { return typeof str !== 'string' ? String(str || '') : str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

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
      avatarId: isObj ? (student.avatarId || 'char_01') : (optionalAvatar || 'char_01'),
      isJoinedConfirmed: false
    };
    currentScore = 0; lastRank = null; currentStreak = 0;

    try {
      const saved = JSON.parse(sessionStorage.getItem('scorear_active_quiz_session') || '{}');
      if (saved && String(saved.pin) === currentPin && (saved.name === currentStudent.name || saved.uid === currentStudent.uid)) {
        currentStudent.uid = saved.uid || currentStudent.uid;
        currentStudent.avatarId = saved.avatarId || currentStudent.avatarId;
        currentScore = Number(saved.score) || 0;
        currentStreak = Number(saved.streak) || 0;
        lastRank = saved.rank || null;
        currentStudent.isReconnect = true;
      }
    } catch(e){}
    saveActiveSession();

    if (global.ScoreARRealtime) {
      global.ScoreARRealtime.init('student', currentPin, handleStudentIncomingMessage);
      const sendJoin = () => global.ScoreARRealtime.publish('STUDENT_JOIN', { player: { id: currentStudent.uid, name: currentStudent.name, avatarId: currentStudent.avatarId, isReconnect: Boolean(currentStudent.isReconnect) }, pin: currentPin });
      sendJoin();
      if (window._studentHandshakeInterval) clearInterval(window._studentHandshakeInterval);
      let attempts = 0;
      window._studentHandshakeInterval = setInterval(() => {
        attempts++;
        if (currentStudent && !currentStudent.isJoinedConfirmed && attempts < 8) sendJoin();
        else clearInterval(window._studentHandshakeInterval);
      }, 1400);
    }
    renderStudentWaitingLobby();
  }

  function renderStudentWaitingLobby() {
    const stage = getOrCreateStudentStage();
    const isConf = currentStudent && currentStudent.isJoinedConfirmed;
    const roleIcon = (currentStudent && currentStudent.isRegistered) ? '✓' : '✨';
    const roleTitle = (currentStudent && currentStudent.isRegistered) ? 'طالب مسجل ✓' : 'ضيف ✨';
    const safeName = escapeHtml(currentStudent ? currentStudent.name : 'بطل');

    stage.innerHTML = `
      <div id="studentLobbyBgImg" style="position:absolute;inset:0;background:url('assets/worlds/${currentWorldId}/waiting.jpg') center/cover no-repeat;filter:brightness(0.35);z-index:1;"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 30%, rgba(30,24,63,0.7) 0%, rgba(12,13,30,0.92) 100%);z-index:2;"></div>
      <header style="position:relative;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:rgba(15,16,33,0.85);border-bottom:1px solid rgba(142,100,239,0.3);">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:12px;color:#a89bff;font-weight:700;">القاعة:</span>
          <span style="font-size:16px;color:#fcd34d;font-weight:900;letter-spacing:2px;font-family:monospace;">${currentPin}</span>
        </div>
        <button onclick="ScoreARQuizStudent.closeStudentSession()" style="background:rgba(239,68,68,0.2);color:#ff8a8a;border:1px solid rgba(239,68,68,0.4);padding:4px 12px;border-radius:10px;font-weight:800;font-size:11px;cursor:pointer;">خروج ✕</button>
      </header>
      <main style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;">
        <div style="background:rgba(21,23,49,0.9);border:2px solid #8e64ef;border-radius:24px;padding:28px 24px;width:100%;max-width:360px;box-shadow:0 12px 30px rgba(0,0,0,0.5);display:flex;flex-direction:column;align-items:center;">
          <img src="assets/characters/animated/${currentStudent.avatarId || 'char_01'}-idle.webp" onerror="this.src='assets/characters/animated/char_01-idle.webp'" alt="${safeName}" style="width:110px;height:130px;object-fit:contain;margin-bottom:12px;filter:drop-shadow(0 6px 12px rgba(0,0,0,0.6));">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
            <span title="${roleTitle}" style="color:${roleIcon==='✓'?'#34d399':'#fcd34d'};font-size:16px;">${roleIcon}</span>
            <h2 style="font-size:22px;font-weight:900;color:#ffffff;margin:0;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${safeName}</h2>
          </div>
          <div id="studentConnectionStatus" style="display:inline-flex;align-items:center;gap:6px;background:${isConf?'rgba(16,185,129,0.2)':'rgba(245,158,11,0.2)'};border:1px solid ${isConf?'#10b981':'#f59e0b'};color:${isConf?'#34d399':'#fcd34d'};font-size:12px;font-weight:800;padding:6px 14px;border-radius:20px;margin-bottom:18px;">
            <span style="display:inline-block;width:8px;height:8px;background:${isConf?'#34d399':'#fcd34d'};border-radius:50%;"></span>
            ${isConf ? 'أنت متصل بالقاعة ومسجل عند المعلم 🎉' : 'جارٍ تأكيد الاتصال بالمعلم...'}
          </div>
          <div style="background:#131428;border:1px dashed rgba(142,100,239,0.5);border-radius:16px;padding:14px;width:100%;">
            <div style="font-size:13px;font-weight:800;color:#c9baff;">شاشتك متصلة بشاشة المعلم</div>
            <div style="font-size:11px;color:#857aa8;margin-top:4px;">انتظر حتى يبدأ المعلم السؤال الأول 🚀</div>
          </div>
        </div>
      </main>
    `;
  }

  function handleStudentIncomingMessage(msg) {
    if (!msg) return;
    if (msg.worldId) currentWorldId = msg.worldId;
    if (msg.type === 'JOIN_ACCEPTED') {
      if (!currentStudent) return;
      if (String(msg.studentId) === String(currentStudent.uid) || msg.studentName === currentStudent.name) {
        currentStudent.isJoinedConfirmed = true;
        if (msg.score !== undefined) currentScore = Number(msg.score) || 0;
        if (msg.streak !== undefined) currentStreak = Number(msg.streak) || 0;
        saveActiveSession();
        if (msg.worldId) {
          currentWorldId = msg.worldId;
          const bgImg = document.getElementById('studentLobbyBgImg');
          if (bgImg) bgImg.style.backgroundImage = `url('assets/worlds/${currentWorldId}/waiting.jpg')`;
        }
        if (window._studentHandshakeInterval) clearInterval(window._studentHandshakeInterval);
        const statusEl = document.getElementById('studentConnectionStatus');
        if (statusEl) {
          statusEl.innerHTML = '<span style="display:inline-block;width:8px;height:8px;background:#34d399;border-radius:50%;margin-inline-end:6px;"></span> أنت متصل ومسجل على شاشة المعلم 🎉';
          statusEl.style.background = 'rgba(16,185,129,0.25)'; statusEl.style.color = '#34d399'; statusEl.style.borderColor = '#10b981';
        }
      }
    } else if (msg.type === 'QUESTION_READING') { currentQData = msg; renderStudentReading(msg);
    } else if (msg.type === 'QUESTION_START') { currentQData = msg; renderStudentQuestion(msg);
    } else if (msg.type === 'QUESTION_RESULT') { renderStudentResult(msg);
    } else if (msg.type === 'QUESTION_SKIPPED') {
      if (qTimerInterval) clearInterval(qTimerInterval);
      const infoBox = document.getElementById('studentFeedbackBox');
      if (infoBox) infoBox.innerHTML = '⏭️ قام المعلم بتخطي هذا السؤال.';
    } else if (msg.type === 'ROOM_LOCKED') {
      disableAllOptionButtons('🔒 تم قفل استقبال الإجابات');
    } else if (msg.type === 'STUDENT_KICKED' && String(msg.studentId) === String(currentStudent.uid)) {
      if (global.toast) global.toast('تم إخراجك من القاعة بواسطة المعلم.');
      closeStudentSession();
    } else if (msg.type === 'CONTEST_COMPLETED') {
      renderStudentFinalPodium(msg);
    } else if (msg.type === 'ROOM_CLOSED') {
      renderStudentRoomClosed(msg.reason);
    }
  }

  function renderStudentReading(qData) {
    if (qTimerInterval) clearInterval(qTimerInterval);
    currentQIndex = qData.qIndex || 0;
    timeRemaining = qData.readingTime || 10;
    hasAnsweredCurrentQ = false;
    selectedOptionIndex = null;

    if (global.ScoreARAudio) global.ScoreARAudio.playSfx('whoosh');

    const stage = getOrCreateStudentStage();
    stage.innerHTML = `
      <div style="position:absolute;inset:0;background:url('assets/worlds/${currentWorldId}/question.jpg') center/cover no-repeat;filter:brightness(0.35);z-index:1;"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 25%, rgba(31,27,66,0.75) 0%, rgba(10,11,22,0.92) 100%);z-index:2;"></div>
      <header style="position:relative;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:rgba(15,16,33,0.92);border-bottom:1px solid rgba(142,100,239,0.3);">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="background:#28244d;color:#52d9ed;padding:3px 10px;border-radius:8px;font-size:11px;font-weight:900;">${qData.skill || 'سؤال'}</span>
          <span style="color:#ffffff;font-size:12px;font-weight:800;">السؤال ${(qData.qIndex || 0) + 1} من ${qData.totalQuestions || 5}</span>
        </div>
        <div style="background:rgba(245,158,11,0.25);border:1.5px solid #f59e0b;color:#fcd34d;font-size:13px;font-weight:900;padding:3px 12px;border-radius:12px;">
          📖 قراءة: <span id="studentReadingCountdown">${timeRemaining}</span>s
        </div>
      </header>
      <main style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:20px 16px;gap:20px;text-align:center;">
        <div style="background:rgba(21,23,49,0.95);border:2px solid #8e64ef;border-radius:20px;padding:24px 18px;width:100%;max-width:360px;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
          <div style="font-size:12px;font-weight:800;color:#fcd34d;margin-bottom:8px;">👀 اقرأ السؤال وافهم المطلوب بتركيز:</div>
          <h2 style="font-size:20px;font-weight:900;color:#ffffff;line-height:1.5;margin:0;">${qData.q || ''}</h2>
        </div>
        <div style="background:rgba(15,16,33,0.85);border:1.5px dashed rgba(142,100,239,0.6);border-radius:16px;padding:16px 20px;width:100%;max-width:360px;text-align:center;">
          <div style="font-size:24px;margin-bottom:6px;">🔒</div>
          <div style="font-size:14px;font-weight:800;color:#ddd8ff;">الخيارات ستفتح تلقائياً فور انتهاء ثواني القراءة...</div>
          <div style="font-size:11px;color:#a89bff;margin-top:4px;">استعد لاختيار الإجابة الصحيحة بأسرع وقت! ⚡</div>
        </div>
      </main>`;

    qTimerInterval = setInterval(() => {
      timeRemaining--;
      const txt = document.getElementById('studentReadingCountdown');
      if (txt) txt.textContent = timeRemaining;
      if (timeRemaining <= 3 && timeRemaining > 0 && global.ScoreARAudio) global.ScoreARAudio.playSfx('tick');
      if (timeRemaining <= 0) clearInterval(qTimerInterval);
    }, 1000);
  }

  function renderStudentQuestion(qData) {
    if (qTimerInterval) clearInterval(qTimerInterval);
    if (global.ScoreARAudio) global.ScoreARAudio.playSfx('reveal');
    currentQIndex = qData.qIndex || 0;
    timeRemaining = qData.timeLimit || 20;
    const totalTime = timeRemaining;
    hasAnsweredCurrentQ = false;
    selectedOptionIndex = null;

    const stage = getOrCreateStudentStage(), opts = qData.opts || ['الخيار 1', 'الخيار 2', 'الخيار 3', 'الخيار 4'];

    stage.innerHTML = `
      <div style="position:absolute;inset:0;background:url('assets/worlds/${currentWorldId}/question.jpg') center/cover no-repeat;filter:brightness(0.35);z-index:1;"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 20%, rgba(23,24,56,0.75) 0%, rgba(10,11,22,0.92) 100%);z-index:2;"></div>
      <header style="position:relative;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:rgba(15,16,33,0.9);border-bottom:1px solid rgba(142,100,239,0.3);">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="background:#28244d;color:#52d9ed;padding:3px 10px;border-radius:8px;font-size:11px;font-weight:900;">${qData.skill || 'سؤال'}</span>
          <span style="color:#ffffff;font-size:12px;font-weight:800;">السؤال ${(qData.qIndex || 0) + 1} من ${qData.totalQuestions || 5}</span>
          ${(qData.isDouble || qData.multiplier === 2) ? `<span style="background:linear-gradient(135deg, #f59e0b, #d97706);color:#fff;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:900;">⚡ نقاط ×2</span>` : ''}
        </div>
        <div id="studentTimerPill" style="background:#ef4444;color:#fff;font-size:14px;font-weight:900;padding:3px 12px;border-radius:12px;">
          <span id="studentTimerText">${timeRemaining}</span>s
        </div>
      </header>
      <div style="position:relative;z-index:10;width:100%;height:4px;background:#1b1d38;">
        <div id="studentProgressBar" style="width:100%;height:100%;background:#52d9ed;transition:width 1s linear;"></div>
      </div>
      <main style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:12px 14px;gap:10px;overflow:hidden;">
        <div style="background:rgba(21,23,49,0.9);border:1px solid rgba(142,100,239,0.4);border-radius:14px;padding:10px 14px;text-align:center;">
          <div style="font-size:15px;font-weight:900;color:#ffffff;line-height:1.35;">${qData.q || 'اختر الإجابة الصحيحة'}</div>
          ${(qData.imageUrl || qData.img) ? `
            <div style="display:flex;justify-content:center;margin:6px 0;max-height:110px;">
              <img src="${qData.imageUrl || qData.img}" alt="${escapeHtml(qData.imageAlt || '')}" style="max-height:110px;max-width:100%;object-fit:contain;border-radius:8px;border:1px solid rgba(255,255,255,0.15);">
            </div>
          ` : ''}
        </div>
        <div id="studentOptionsContainer" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;max-width:390px;margin:0 auto;flex:1;align-content:center;">
          ${opts.slice(0, 4).map((optText, idx) => {
            const theme = OPTION_THEMES[idx % 4];
            return `<button class="student-opt-btn" onclick="ScoreARQuizStudent.submitAnswer(${idx})" id="studentOptBtn_${idx}" style="min-height:76px;background:${theme.bg};border:2px solid ${theme.border};border-radius:14px;color:#ffffff;font-family:inherit;padding:8px 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.3);text-align:center;"><span style="font-size:22px;line-height:1;">${theme.shape}</span><span style="font-size:14px;font-weight:900;line-height:1.2;max-width:100%;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escapeHtml(optText)}</span><span id="studentOptIndicator_${idx}" style="font-size:9px;opacity:0.8;font-weight:700;">اضغط للاختيار</span></button>`;
          }).join('')}
        </div>
        <div id="studentFeedbackBox" style="min-height:36px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:13px;font-weight:800;color:#a89bff;">
          اختر إجابتك بأسرع وقت لتحصيل أعلى النقاط! ⚡
        </div>
      </main>
    `;

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

    try {
      const db = (window.ScoreARAuth?.getDb?.()) || (window.firebase?.database?.());
      if (db && currentPin && currentStudent?.uid) {
        db.ref(`rooms/${currentPin}/answers/${currentQIndex}/${currentStudent.uid}`).set({ optionIndex: idx, ts: Date.now() }).catch(()=>{});
      }
    } catch(e) {}

    if (global.ScoreARRealtime) {
      global.ScoreARRealtime.publish('STUDENT_ANSWER', {
        playerId: currentStudent.uid, playerName: currentStudent.name,
        optionIndex: idx, timeRemaining: Math.max(0, timeRemaining), answeredAt: Date.now()
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
    const stage = getOrCreateStudentStage(), myId = String(currentStudent.uid);
    let myResult = (resData.playerResults && resData.playerResults[myId]) ? resData.playerResults[myId] : null;
    if (!myResult && resData.playerResults && currentStudent.name) {
      const match = (resData.topLeaderboard || []).find(p => p.name === currentStudent.name);
      if (match && resData.playerResults[match.id]) myResult = resData.playerResults[match.id];
    }
    if (!myResult && resData.playerResults) {
      const byName = Object.values(resData.playerResults).find(r => r && (r.playerName === currentStudent.name || (r.id && String(r.id) === myId)));
      if (byName) myResult = byName;
    }

    const correctIdx = Number(resData.correctAnswer);
    const correctText = resData.correctAnswerText || (resData.options && resData.options[correctIdx]) || 'الإجابة النموذجية';
    const myChoiceIdx = (myResult && myResult.chosenIndex !== undefined && myResult.chosenIndex !== -1) ? Number(myResult.chosenIndex) : (selectedOptionIndex !== null ? Number(selectedOptionIndex) : -1);

    // Authoritative Host Results Only: Student displays host verdict and never recalculates or evaluates locally
    const isCorrect = myResult ? Boolean(myResult.isCorrect ?? myResult.correct) : false;
    const earned = myResult ? Number(myResult.pointsEarned || 0) : 0;
    const respTime = myResult ? myResult.respTime : null;
    const isFastest = (resData.fastestStudent && (String(resData.fastestStudent.id) === myId || resData.fastestStudent.name === currentStudent.name));

    currentScore = myResult ? Number(myResult.totalScore ?? currentScore) : currentScore;
    currentStreak = myResult ? Number(myResult.streak ?? (isCorrect ? currentStreak + 1 : 0)) : 0;
    saveActiveSession();

    let currentRank = '-';
    if (resData.topLeaderboard && Array.isArray(resData.topLeaderboard)) {
      const foundIdx = resData.topLeaderboard.findIndex(p => String(p.id) === myId || p.name === currentStudent.name);
      if (foundIdx !== -1) currentRank = foundIdx + 1;
    }

    let deltaIcon = '—', deltaText = 'حافظت على موقعك';
    if (lastRank !== null && currentRank !== '-') {
      if (currentRank < lastRank) { deltaIcon = `▲ ${lastRank - currentRank}`; deltaText = `صعدت ${lastRank - currentRank} مراكز!`; }
      else if (currentRank > lastRank) { deltaIcon = `▼ ${currentRank - lastRank}`; deltaText = `تراجعت ${currentRank - lastRank} مراكز`; }
    }
    if (currentRank !== '-') lastRank = currentRank;

    const opts = resData.options || (currentQData && currentQData.opts) || [];
    if (global.ScoreARAudio) global.ScoreARAudio.playSfx(isCorrect ? 'correct' : 'wrong');

    stage.innerHTML = `
      <div style="position:absolute;inset:0;background:url('assets/worlds/${currentWorldId}/results.jpg') center/cover no-repeat;filter:brightness(0.35);z-index:1;"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 25%, ${isCorrect ? 'rgba(20,56,37,0.78)' : 'rgba(56,22,22,0.78)'} 0%, rgba(10,11,22,0.94) 100%);z-index:2;"></div>
      <header style="position:relative;z-index:10;padding:10px 16px;background:rgba(15,16,33,0.92);border-bottom:1px solid rgba(255,255,255,0.1);text-align:center;">
        <span style="font-size:13px;font-weight:900;color:#ffffff;">نتيجة السؤال ${currentQIndex + 1}</span>
      </header>

      <main style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:14px;text-align:center;gap:10px;overflow-y:auto;">
        <!-- Status Notification Banner -->
        <div style="background:rgba(21,23,49,0.92);border:2px solid ${isCorrect ? '#10b981' : '#ef4444'};border-radius:20px;padding:14px 16px;width:100%;max-width:360px;box-shadow:0 8px 25px rgba(0,0,0,0.5);">
          <div style="font-size:38px;line-height:1;margin-bottom:4px;">${isCorrect ? '🎉' : '❌'}</div>
          <h2 style="font-size:19px;font-weight:900;color:${isCorrect ? '#34d399' : '#f87171'};margin:0 0 4px 0;">${isCorrect ? 'إجابة صحيحة وممتازة!' : (myChoiceIdx === -1 ? 'انتهى الوقت ولم تُجب!' : 'إجابة خاطئة!')}</h2>
          <div style="font-size:18px;font-weight:900;color:#fcd34d;margin:2px 0;">+${earned} <span style="font-size:12px;color:#c9baff;">نقطة</span>${respTime ? `<span style="font-size:11px;color:#6ee7b7;font-weight:700;margin-inline-start:6px;">(⚡ ${respTime}ث)</span>` : ''}</div>
          ${isFastest ? `<div style="background:rgba(245,158,11,0.25);border:1px solid #f59e0b;color:#fcd34d;padding:3px 10px;border-radius:10px;font-size:11px;font-weight:900;margin-top:4px;">⚡ بطل السرعة: كنت أسرع إجابة صحيحة!</div>` : ''}
          ${currentStreak > 1 ? `<div style="font-size:11px;color:#f97316;font-weight:800;margin-top:3px;">🔥 سلسلة ${currentStreak} إجابات متتالية!</div>` : ''}
          <div style="background:#0e2a1d;border:2px solid #10b981;border-radius:12px;padding:8px 12px;margin-top:8px;text-align:center;">
            <span style="color:#6ee7b7;font-size:11px;font-weight:800;display:block;">✓ الإجابة النموذجية الصحيحة:</span>
            <b style="color:#ffffff;font-size:15px;display:block;margin-top:2px;">${correctText}</b>
          </div>
          ${(!isCorrect && myChoiceIdx !== null && myChoiceIdx >= 0 && opts[myChoiceIdx]) ? `<div style="font-size:11px;color:#fca5a5;margin-top:4px;font-weight:700;">إجابتك التي اخترتها: <b style="color:#fff;">${opts[myChoiceIdx]}</b></div>` : ''}
        </div>

        ${opts.length ? `<div style="width:100%;max-width:360px;display:flex;flex-direction:column;gap:5px;">${opts.map((opt, i) => {
          const isThisCorrect = (i === correctIdx), isThisChosen = (i === myChoiceIdx);
          let bg = '#161833', border = 'rgba(255,255,255,0.15)', badge = '';
          if (isThisCorrect) { bg = 'rgba(16,185,129,0.3)'; border = '#10b981'; badge = '<span style="background:#10b981;color:#fff;font-size:10px;padding:2px 6px;border-radius:6px;font-weight:900;">✓ الصحيحة</span>'; }
          else if (isThisChosen) { bg = 'rgba(239,68,68,0.3)'; border = '#ef4444'; badge = '<span style="background:#ef4444;color:#fff;font-size:10px;padding:2px 6px;border-radius:6px;font-weight:900;">✕ اختيارك</span>'; }
          return `<div style="background:${bg};border:1.5px solid ${border};border-radius:10px;padding:6px 12px;display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:800;color:#fff;"><span>${opt}</span>${badge}</div>`;
        }).join('')}</div>` : ''}

        ${resData.why ? `<div style="background:rgba(16,185,129,0.12);border:1px dashed #10b981;border-radius:10px;padding:6px 12px;width:100%;max-width:360px;text-align:right;font-size:11px;color:#d1fae5;font-weight:700;">💡 <b>التفسير:</b> ${resData.why}</div>` : ''}

        <div style="background:rgba(18,19,41,0.85);border:1px solid rgba(142,100,239,0.3);border-radius:14px;padding:10px 16px;width:100%;max-width:360px;display:flex;justify-content:space-around;align-items:center;">
          <div><div style="font-size:11px;color:#a89bff;font-weight:700;">مجموع نقاطك</div><div style="font-size:17px;font-weight:900;color:#52d9ed;">${currentScore}</div></div>
          <div style="width:1px;height:24px;background:rgba(255,255,255,0.15);"></div>
          <div><div style="font-size:11px;color:#a89bff;font-weight:700;">ترتيبك الحالي</div><div style="font-size:17px;font-weight:900;color:#fcd34d;">المركز ${currentRank}</div></div>
        </div>
        <div style="font-size:11px;color:#c9baff;font-weight:800;">${deltaIcon} ${deltaText} • انتظر السؤال التالي من المعلم 🚀</div>
      </main>
    `;
  }

  let lastReactionTime = 0;
  function sendReaction(emoji) {
    const now = Date.now();
    if (now - lastReactionTime < 400) return;
    lastReactionTime = now;
    if (global.ScoreARAudio) global.ScoreARAudio.playSfx('pop');
    if (global.ScoreARRealtime && currentPin) {
      global.ScoreARRealtime.publish('STUDENT_REACTION', {
        emoji: emoji,
        studentName: currentStudent?.name || 'طالب',
        studentId: currentStudent?.uid || 'anon',
        pin: currentPin
      });
    }
  }

  function renderStudentFinalPodium(data) {
    clearActiveSession();
    const stage = getOrCreateStudentStage(), myId = String(currentStudent.uid);
    let myFinalRank = '-';
    if (data.top3 && Array.isArray(data.top3)) {
      const idx = data.top3.findIndex(p => String(p.id) === myId || p.name === currentStudent.name);
      if (idx !== -1) myFinalRank = idx + 1;
    }

    if (window.confetti) window.confetti({ particleCount: 80, spread: 65 });
    if (global.ScoreARAudio) global.ScoreARAudio.playSfx('fanfare');

    stage.innerHTML = `
      <div style="position:absolute;inset:0;background:url('assets/worlds/${currentWorldId}/podium.jpg') center/cover no-repeat;filter:brightness(0.35);z-index:1;"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 25%, rgba(42,34,84,0.78) 0%, rgba(10,11,22,0.94) 100%);z-index:2;"></div>
      <header style="position:relative;z-index:10;padding:12px;background:rgba(15,16,33,0.9);border-bottom:1px solid rgba(255,255,255,0.1);text-align:center;"><span style="font-size:16px;font-weight:900;color:#fcd34d;">🏆 نهاية التحدي والتتويج</span></header>
      <main style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;text-align:center;gap:10px;">
        <img src="assets/characters/animated/${currentStudent?.avatarId || 'char_01'}-idle.webp" onerror="this.src='assets/characters/animated/char_01-idle.webp'" alt="${escapeHtml(currentStudent?.name || 'البطل')}" style="width:100px;height:120px;object-fit:contain;animation:character-joy 1.1s ease-in-out infinite;filter:drop-shadow(0 8px 18px rgba(0,0,0,0.6));">
        <h2 style="font-size:19px;font-weight:900;color:#ffffff;margin:0;">أحسنت يا ${currentStudent.name}! 🌟</h2>
        <div style="background:rgba(21,23,49,0.9);border:2px solid #f59e0b;border-radius:18px;padding:12px;width:100%;max-width:300px;">
          <div style="font-size:11px;color:#a89bff;">مجموع نقاطك النهائي:</div>
          <div style="font-size:26px;font-weight:900;color:#f5c518;margin:2px 0;">${currentScore} نقطة</div>
          ${myFinalRank !== '-' ? `<div style="font-size:12px;font-weight:900;color:#34d399;">👑 بطل في منصة التتويج (المركز ${myFinalRank})</div>` : ''}
        </div>
        <!-- Floating Reactions Bar -->
        <div style="display:flex;gap:12px;margin:4px 0;background:rgba(255,255,255,0.08);backdrop-filter:blur(10px);padding:6px 16px;border-radius:24px;border:1px solid rgba(255,255,255,0.15);">
          <button type="button" onclick="ScoreARQuizStudent.sendReaction('👏')" style="background:none;border:none;font-size:22px;cursor:pointer;padding:2px 4px;">👏</button>
          <button type="button" onclick="ScoreARQuizStudent.sendReaction('🔥')" style="background:none;border:none;font-size:22px;cursor:pointer;padding:2px 4px;">🔥</button>
          <button type="button" onclick="ScoreARQuizStudent.sendReaction('❤️')" style="background:none;border:none;font-size:22px;cursor:pointer;padding:2px 4px;">❤️</button>
          <button type="button" onclick="ScoreARQuizStudent.sendReaction('🎉')" style="background:none;border:none;font-size:22px;cursor:pointer;padding:2px 4px;">🎉</button>
        </div>
        <button onclick="ScoreARQuizStudent.closeStudentSession()" style="background:linear-gradient(135deg, #8e64ef, #6a34e8);color:#fff;font-weight:900;font-size:13px;border:none;border-radius:12px;padding:9px 22px;cursor:pointer;">العودة للرئيسية 🏠</button>
      </main>`;
  }

  function renderStudentRoomClosed(reason) {
    if (qTimerInterval) clearInterval(qTimerInterval);
    if (window._studentHandshakeInterval) clearInterval(window._studentHandshakeInterval);
    clearActiveSession();
    if (global.ScoreARAudio) { global.ScoreARAudio.stopMusic(); global.ScoreARAudio.playSfx('whoosh'); }
    const stage = getOrCreateStudentStage(), charAvatarId = currentStudent?.avatarId || 'char_01';
    stage.innerHTML = `
      <div style="position:absolute;inset:0;background:url('assets/worlds/${currentWorldId}/waiting.jpg') center/cover no-repeat;filter:brightness(0.35);z-index:1;"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 30%, rgba(15,23,42,0.85) 0%, rgba(10,11,22,0.95) 100%);z-index:2;"></div>
      <main style="position:relative;z-index:10;width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:20px;text-align:center;">
        <div style="width:100%;max-width:390px;background:rgba(21,23,49,0.94);border:2px solid rgba(142,100,239,0.4);border-radius:22px;padding:22px 18px;display:flex;flex-direction:column;align-items:center;gap:12px;box-shadow:0 12px 36px rgba(0,0,0,0.6);">
          <div style="font-size:32px;">🏁</div>
          <div><h2 style="font-size:18px;font-weight:900;color:#fff;margin:0 0 4px 0;">انتهت المسابقة بواسطة المعلم</h2><p style="font-size:11px;color:#94a3b8;margin:0;">${escapeHtml(reason || 'قام المعلم بإنهاء أو إغلاق قاعة المسابقة')}</p></div>
          <div style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:8px;"><img src="assets/characters/animated/${charAvatarId}-idle.webp" onerror="this.src='assets/avatars/${charAvatarId}.png'" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid #a855f7;"><b style="font-size:12px;color:#fff;">${escapeHtml(currentStudent?.name || 'البطل')}</b></div>
            <div><span style="font-size:11px;color:#94a3b8;">مجموع نقاطك: </span><b style="font-size:16px;color:#38bdf8;">${currentScore || 0}</b></div>
          </div>
          <button onclick="ScoreARQuizStudent.closeStudentSession()" style="width:100%;background:linear-gradient(135deg, #7550ef, #906ffa);color:#fff;border:none;border-radius:12px;padding:10px;font-size:13px;font-weight:900;cursor:pointer;">العودة للصفحة الرئيسية 🏠</button>
        </div>
      </main>`;
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('online', () => {
      if (currentPin && currentStudent && global.ScoreARRealtime) {
        if (global.toast) global.toast('تمت استعادة الاتصال بالإنترنت 🌐');
        global.ScoreARRealtime.publish('STUDENT_JOIN', { player: { id: currentStudent.uid, name: currentStudent.name, avatarId: currentStudent.avatarId }, pin: currentPin, isReconnect: true });
      }
    });
    window.addEventListener('offline', () => {
      const el = document.getElementById('studentConnectionStatus');
      if (el) { el.innerHTML = '● انقطع الاتصال... جارٍ محاولة إعادة الاتصال 🔄'; el.style.background = 'rgba(239,68,68,0.2)'; el.style.color = '#fca5a5'; }
    });
  }

  global.ScoreARQuizStudent = {
    startStudentSession, submitAnswer, renderStudentQuestion, renderStudentResult,
    closeStudentSession, renderStudentRoomClosed, saveActiveSession, clearActiveSession,
    sendReaction, getPin: () => currentPin, get state() { return currentStudent; }
  };
  global.ScoreARStudent = global.ScoreARQuizStudent;
})(typeof window !== 'undefined' ? window : this);
