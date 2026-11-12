/**
 * ScoreAR Quiz Student View Module
 * Renders Student UI: Reading, Question Answering, Result Feedback, Podium, Room Closed.
 * 100% Original Mobile Design Preserved (Full-color buttons, high contrast, zero scroll).
 * Strictly Rule 7 Compliant (<350 lines).
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

  function renderStudentReading(stage, qData, currentWorldId, timeRemaining) {
    const wid = String(currentWorldId || 'royal').trim() || 'royal';
    stage.innerHTML = `
      <div style="position:absolute;inset:0;background:url('assets/worlds/${wid}/question.jpg') center/cover no-repeat;filter:brightness(0.84) saturate(1.08);z-index:1;"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 25%, rgba(20,22,52,0.22) 0%, rgba(10,11,22,0.58) 100%);z-index:2;"></div>
      <header style="position:relative;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:rgba(15,16,33,0.88);border-bottom:1px solid rgba(142,100,239,0.3);gap:6px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="background:#28244d;color:#52d9ed;padding:3px 10px;border-radius:8px;font-size:11px;font-weight:900;">${escapeHtml(qData.skill || 'سؤال')}</span>
          <span style="color:#ffffff;font-size:12px;font-weight:800;">السؤال ${(qData.qIndex || 0) + 1} من ${qData.totalQuestions || 5}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <button class="scorear-audio-btn" onclick="ScoreARAudio?.toggleMute?.()" style="background:rgba(12,13,30,0.72);border:1px solid rgba(82,217,237,0.45);color:#52d9ed;padding:3px 9px;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;">🔊 الصوت: يعمل</button>
          <div style="background:rgba(245,158,11,0.25);border:1.5px solid #f59e0b;color:#fcd34d;font-size:13px;font-weight:900;padding:3px 12px;border-radius:12px;">
            📖 قراءة: <span id="studentReadingCountdown">${timeRemaining}</span>s
          </div>
        </div>
      </header>
      <main style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:20px 16px;gap:20px;text-align:center;">
        <div style="background:rgba(21,23,49,0.95);border:2px solid #8e64ef;border-radius:20px;padding:24px 18px;width:100%;max-width:360px;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
          <div style="font-size:12px;font-weight:800;color:#fcd34d;margin-bottom:8px;">👀 اقرأ السؤال وافهم المطلوب بتركيز:</div>
          <h2 style="font-size:20px;font-weight:900;color:#ffffff;line-height:1.5;margin:0;">${escapeHtml(qData.q || '')}</h2>
        </div>
        <div style="background:rgba(15,16,33,0.85);border:1.5px dashed rgba(142,100,239,0.6);border-radius:16px;padding:16px 20px;width:100%;max-width:360px;text-align:center;">
          <div style="font-size:24px;margin-bottom:6px;">🔒</div>
          <div style="font-size:14px;font-weight:800;color:#ddd8ff;">الخيارات ستفتح تلقائياً فور انتهاء ثواني القراءة...</div>
          <div style="font-size:11px;color:#a89bff;margin-top:4px;">استعد لاختيار الإجابة الصحيحة بأسرع وقت! ⚡</div>
        </div>
      </main>`;
  }

  function renderStudentQuestion(stage, qData, currentWorldId, timeRemaining) {
    const opts = qData.opts || ['الخيار 1', 'الخيار 2', 'الخيار 3', 'الخيار 4'];
    const wid = String(currentWorldId || 'royal').trim() || 'royal';
    stage.innerHTML = `
      <div style="position:absolute;inset:0;background:url('assets/worlds/${wid}/question.jpg') center/cover no-repeat;filter:brightness(0.84) saturate(1.08);z-index:1;"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 20%, rgba(20,22,52,0.2) 0%, rgba(10,11,22,0.56) 100%);z-index:2;"></div>
      <header style="position:relative;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:rgba(15,16,33,0.88);border-bottom:1px solid rgba(142,100,239,0.3);gap:6px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="background:#28244d;color:#52d9ed;padding:3px 10px;border-radius:8px;font-size:11px;font-weight:900;">${escapeHtml(qData.skill || 'سؤال')}</span>
          <span style="color:#ffffff;font-size:12px;font-weight:800;">السؤال ${(qData.qIndex || 0) + 1} من ${qData.totalQuestions || 5}</span>
          ${(qData.isDouble || qData.multiplier === 2) ? `<span style="background:linear-gradient(135deg, #f59e0b, #d97706);color:#fff;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:900;">⚡ نقاط ×2</span>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <button class="scorear-audio-btn" onclick="ScoreARAudio?.toggleMute?.()" style="background:rgba(12,13,30,0.72);border:1px solid rgba(82,217,237,0.45);color:#52d9ed;padding:3px 9px;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;">🔊 الصوت: يعمل</button>
          <div id="studentTimerPill" style="background:#ef4444;color:#fff;font-size:14px;font-weight:900;padding:3px 12px;border-radius:12px;">
            <span id="studentTimerText">${timeRemaining}</span>s
          </div>
        </div>
      </header>
      <div style="position:relative;z-index:10;width:100%;height:4px;background:#1b1d38;">
        <div id="studentProgressBar" style="width:100%;height:100%;background:#52d9ed;transition:width 1s linear;"></div>
      </div>
      <main style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:12px 14px 46px;gap:10px;overflow-y:auto;">
        <div style="background:rgba(21,23,49,0.9);border:1px solid rgba(142,100,239,0.4);border-radius:14px;padding:10px 14px;text-align:center;">
          <div style="font-size:15px;font-weight:900;color:#ffffff;line-height:1.35;">${escapeHtml(qData.q || 'اختر الإجابة الصحيحة')}</div>
          ${(qData.imageUrl || qData.img) ? `
            <div style="display:flex;justify-content:center;margin:6px 0;max-height:110px;">
              <img src="${qData.imageUrl || qData.img}" alt="${escapeHtml(qData.imageAlt || '')}" style="max-height:110px;max-width:100%;object-fit:contain;border-radius:8px;border:1px solid rgba(255,255,255,0.15);">
            </div>
          ` : ''}
        </div>
        <div id="studentOptionsContainer" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;max-width:390px;margin:0 auto;flex:1;align-content:center;">
          ${opts.slice(0, 4).map((optText, idx) => {
            const theme = OPTION_THEMES[idx % 4];
            return `<button class="student-opt-btn" onclick="ScoreARQuizStudent.submitAnswer(${idx})" id="studentOptBtn_${idx}" style="min-height:76px;background:${theme.bg};border:2px solid ${theme.border};border-radius:14px;color:#ffffff;font-family:inherit;padding:8px 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.3);text-align:center;"><span style="font-size:22px;line-height:1;color:#ffffff;">${theme.shape}</span><span style="font-size:14px;font-weight:900;line-height:1.2;max-width:100%;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;color:#ffffff;">${escapeHtml(optText)}</span><span id="studentOptIndicator_${idx}" style="font-size:9px;opacity:0.85;font-weight:700;color:#ffffff;">اضغط للاختيار</span></button>`;
          }).join('')}
        </div>
        <div id="studentFeedbackBox" style="min-height:36px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:13px;font-weight:800;color:#a89bff;">
          اختر إجابتك بأسرع وقت لتحصيل أعلى النقاط! ⚡
        </div>
      </main>`;
  }

  function renderStudentResult(stage, resData, state) {
    const { currentStudent, currentWorldId, currentQIndex, selectedOptionIndex, currentScore, currentStreak, lastRank } = state;
    const myId = String(currentStudent.uid);
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

    const isCorrect = myResult ? Boolean(myResult.isCorrect ?? myResult.correct) : false;
    const earned = myResult ? Number(myResult.pointsEarned || 0) : 0;
    const respTime = myResult ? myResult.respTime : null;
    const myName = (currentStudent.name || '').trim();
    const isFastest = (resData.fastestStudent && (String(resData.fastestStudent.id) === myId || (resData.fastestStudent.name && resData.fastestStudent.name.trim() === myName)));
    const myFastRank = (resData.fastestTop2 && Array.isArray(resData.fastestTop2))
      ? (resData.fastestTop2.findIndex(f => String(f.id) === myId || (f.name && f.name.trim() === myName)) + 1)
      : (isFastest ? 1 : 0);
    const isCardArena = (typeof window !== 'undefined' && window.ScoreARCardArena && typeof window.ScoreARCardArena.isModeActive === 'function')
      ? window.ScoreARCardArena.isModeActive()
      : (resData.gameMode === 'CARD_ARENA' || resData.mode === 'CARD_ARENA');

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

    const opts = resData.options || [];
    stage.innerHTML = `
      <div style="position:absolute;inset:0;background:url('assets/worlds/${currentWorldId}/results.jpg') center/cover no-repeat;filter:brightness(0.8) saturate(1.08);z-index:1;"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 25%, ${isCorrect ? 'rgba(20,56,37,0.38)' : 'rgba(56,22,22,0.38)'} 0%, rgba(10,11,22,0.68) 100%);z-index:2;"></div>
      <header style="position:relative;z-index:10;padding:10px 16px;background:rgba(15,16,33,0.92);border-bottom:1px solid rgba(255,255,255,0.1);text-align:center;">
        <span style="font-size:13px;font-weight:900;color:#ffffff;">نتيجة السؤال ${currentQIndex + 1}</span>
      </header>
      <main style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:14px;text-align:center;gap:10px;overflow-y:auto;">
        <div style="background:rgba(21,23,49,0.92);border:2px solid ${isCorrect ? '#10b981' : '#ef4444'};border-radius:20px;padding:14px 16px;width:100%;max-width:360px;box-shadow:0 8px 25px rgba(0,0,0,0.5);">
          <div style="font-size:38px;line-height:1;margin-bottom:4px;">${isCorrect ? '🎉' : '❌'}</div>
          <h2 style="font-size:19px;font-weight:900;color:${isCorrect ? '#34d399' : '#f87171'};margin:0 0 4px 0;">${isCorrect ? 'إجابة صحيحة وممتازة!' : (myChoiceIdx === -1 ? 'انتهى الوقت ولم تُجب!' : 'إجابة خاطئة!')}</h2>
          <div style="font-size:18px;font-weight:900;color:#fcd34d;margin:2px 0;">+${earned} <span style="font-size:12px;color:#c9baff;">نقطة</span>${respTime ? `<span style="font-size:11px;color:#6ee7b7;font-weight:700;margin-inline-start:6px;">(⚡ ${respTime}ث)</span>` : ''}</div>
          ${isCardArena && (myFastRank === 1 || myFastRank === 2) ? `<div style="background:rgba(142,100,239,0.25);border:1px solid #8e64ef;color:#e9d5ff;padding:4px 10px;border-radius:10px;font-size:11px;font-weight:900;margin-top:4px;">🏆 المركز ${myFastRank === 1 ? 'الأول' : 'الثاني'} في السرعة! كسبت كارت تكتيكي 🃏</div>` : (isCardArena && isCorrect ? `<div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);color:#c9baff;padding:3px 10px;border-radius:10px;font-size:10px;font-weight:700;margin-top:4px;">💡 أسرع في السؤال القادم لتكون من الأول أو الثاني وتكسب كارت!</div>` : (isFastest ? `<div style="background:rgba(245,158,11,0.25);border:1px solid #f59e0b;color:#fcd34d;padding:3px 10px;border-radius:10px;font-size:11px;font-weight:900;margin-top:4px;">⚡ بطل السرعة: كنت أسرع إجابة صحيحة!</div>` : ''))}
          ${currentStreak > 1 ? `<div style="font-size:11px;color:#f97316;font-weight:800;margin-top:3px;">🔥 سلسلة ${currentStreak} إجابات متتالية!</div>` : ''}
          <div style="background:#0e2a1d;border:2px solid #10b981;border-radius:12px;padding:8px 12px;margin-top:8px;text-align:center;">
            <span style="color:#6ee7b7;font-size:11px;font-weight:800;display:block;">✓ الإجابة النموذجية الصحيحة:</span>
            <b style="color:#ffffff;font-size:15px;display:block;margin-top:2px;">${correctText}</b>
          </div>
          ${(!isCorrect && myChoiceIdx !== null && myChoiceIdx >= 0 && opts[myChoiceIdx]) ? `<div style="font-size:11px;color:#fca5a5;margin-top:4px;font-weight:700;">إجابتك التي اخترتها: <b style="color:#fff;">${escapeHtml(opts[myChoiceIdx])}</b></div>` : ''}
        </div>
        ${opts.length ? `<div style="width:100%;max-width:360px;display:flex;flex-direction:column;gap:5px;">${opts.map((opt, i) => {
          const isThisCorrect = (i === correctIdx), isThisChosen = (i === myChoiceIdx);
          let bg = '#161833', border = 'rgba(255,255,255,0.15)', badge = '';
          if (isThisCorrect) { bg = 'rgba(16,185,129,0.3)'; border = '#10b981'; badge = '<span style="background:#10b981;color:#fff;font-size:10px;padding:2px 6px;border-radius:6px;font-weight:900;">✓ الصحيحة</span>'; }
          else if (isThisChosen) { bg = 'rgba(239,68,68,0.3)'; border = '#ef4444'; badge = '<span style="background:#ef4444;color:#fff;font-size:10px;padding:2px 6px;border-radius:6px;font-weight:900;">✕ اختيارك</span>'; }
          return `<div style="background:${bg};border:1.5px solid ${border};border-radius:10px;padding:6px 12px;display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:800;color:#fff;"><span>${escapeHtml(opt)}</span>${badge}</div>`;
        }).join('')}</div>` : ''}
        ${resData.why ? `<div style="background:rgba(16,185,129,0.12);border:1px dashed #10b981;border-radius:10px;padding:6px 12px;width:100%;max-width:360px;text-align:right;font-size:11px;color:#d1fae5;font-weight:700;">💡 <b>التفسير:</b> ${escapeHtml(resData.why)}</div>` : ''}
        <div style="background:rgba(18,19,41,0.85);border:1px solid rgba(142,100,239,0.3);border-radius:14px;padding:10px 16px;width:100%;max-width:360px;display:flex;justify-content:space-around;align-items:center;">
          <div><div style="font-size:11px;color:#a89bff;font-weight:700;">مجموع نقاطك</div><div class="student-live-score-val" style="font-size:17px;font-weight:900;color:#52d9ed;">${Number(myResult?.totalScore ?? currentScore)}</div></div>
          <div style="width:1px;height:24px;background:rgba(255,255,255,0.15);"></div>
          <div><div style="font-size:11px;color:#a89bff;font-weight:700;">ترتيبك الحالي</div><div style="font-size:17px;font-weight:900;color:#fcd34d;">المركز ${currentRank}</div></div>
        </div>
        <div style="font-size:11px;color:#c9baff;font-weight:800;">${deltaIcon} ${deltaText} • انتظر السؤال التالي من المعلم 🚀</div>
      </main>`;

    return { isCorrect, earned, currentRank, updatedScore: Number(myResult?.totalScore ?? currentScore) };
  }

  function renderStudentFinalPodium(stage, data, currentStudent, currentScore, currentWorldId) {
    const myId = String(currentStudent.uid);
    let myFinalRank = '-';
    if (data.top3 && Array.isArray(data.top3)) {
      const idx = data.top3.findIndex(p => String(p.id) === myId || p.name === currentStudent.name);
      if (idx !== -1) myFinalRank = idx + 1;
    }
    stage.innerHTML = `
      <div style="position:absolute;inset:0;background:url('assets/worlds/${currentWorldId}/podium.jpg') center/cover no-repeat;filter:brightness(0.8) saturate(1.1);z-index:1;"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 25%, rgba(42,34,84,0.3) 0%, rgba(10,11,22,0.65) 100%);z-index:2;"></div>
      <header style="position:relative;z-index:10;padding:12px;background:rgba(15,16,33,0.9);border-bottom:1px solid rgba(255,255,255,0.1);text-align:center;"><span style="font-size:16px;font-weight:900;color:#fcd34d;">🏆 نهاية التحدي والتتويج</span></header>
      <main style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;text-align:center;gap:10px;">
        <img src="assets/characters/animated/${currentStudent?.avatarId || 'char_01'}-idle.webp" onerror="this.src='assets/characters/animated/char_01-idle.webp'" alt="${escapeHtml(currentStudent?.name || 'البطل')}" style="width:100px;height:120px;object-fit:contain;animation:character-joy 1.1s ease-in-out infinite;filter:drop-shadow(0 8px 18px rgba(0,0,0,0.6));">
        <h2 style="font-size:19px;font-weight:900;color:#ffffff;margin:0;">أحسنت يا ${escapeHtml(currentStudent?.name || 'البطل')}! 🌟</h2>
        <div style="background:rgba(21,23,49,0.9);border:2px solid #f59e0b;border-radius:18px;padding:12px;width:100%;max-width:300px;">
          <div style="font-size:11px;color:#a89bff;">مجموع نقاطك النهائي:</div>
          <div style="font-size:26px;font-weight:900;color:#f5c518;margin:2px 0;">${currentScore} نقطة</div>
          ${myFinalRank !== '-' ? `<div style="font-size:12px;font-weight:900;color:#34d399;">👑 بطل في منصة التتويج (المركز ${myFinalRank})</div>` : ''}
        </div>
        <div style="display:flex;gap:12px;margin:4px 0;background:rgba(255,255,255,0.08);backdrop-filter:blur(10px);padding:6px 16px;border-radius:24px;border:1px solid rgba(255,255,255,0.15);">
          <button type="button" onclick="ScoreARQuizStudent.sendReaction('👏')" style="background:none;border:none;font-size:22px;cursor:pointer;padding:2px 4px;">👏</button>
          <button type="button" onclick="ScoreARQuizStudent.sendReaction('🔥')" style="background:none;border:none;font-size:22px;cursor:pointer;padding:2px 4px;">🔥</button>
          <button type="button" onclick="ScoreARQuizStudent.sendReaction('❤️')" style="background:none;border:none;font-size:22px;cursor:pointer;padding:2px 4px;">❤️</button>
          <button type="button" onclick="ScoreARQuizStudent.sendReaction('🎉')" style="background:none;border:none;font-size:22px;cursor:pointer;padding:2px 4px;">🎉</button>
        </div>
        ${(myFinalRank !== '-' && myFinalRank <= 3) ? `<button onclick="if(global.ScoreARPodiumCapture?.downloadCertificate){global.ScoreARPodiumCapture.downloadCertificate({name:'${escapeHtml(currentStudent?.name||'البطل')}',score:${currentScore}},${myFinalRank},${currentScore},'${currentWorldId}');}" style="background:linear-gradient(135deg, #10b981, #059669);color:#fff;font-weight:900;font-size:13px;border:none;border-radius:12px;padding:9px 20px;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 4px 14px rgba(16,185,129,0.4);">🎓 تحميل شهادتي التقديرية (PNG)</button>` : ''}
        <button onclick="ScoreARQuizStudent.closeStudentSession()" style="background:linear-gradient(135deg, #8e64ef, #6a34e8);color:#fff;font-weight:900;font-size:13px;border:none;border-radius:12px;padding:9px 22px;cursor:pointer;">العودة للرئيسية 🏠</button>
      </main>`;
  }

  function renderStudentLeaderboardCard(stage, msg, currentStudent, currentScore, currentWorldId) {
    const myId = String(currentStudent?.uid || '');
    const myName = currentStudent?.name || '';
    const myInfo = (msg.allRanks || []).find(r => String(r.id) === myId || r.name === myName) || {
      rank: '-', score: currentScore, delta: 0, streak: 0, gapToAbove: 0
    };
    const rankNum = typeof myInfo.rank === 'number' ? myInfo.rank : '-';
    const total = msg.totalPlayers || (msg.allRanks ? msg.allRanks.length : 1);

    let deltaHtml = '<span style="color:#94a3b8;font-weight:800;">➖ ثابت</span>';
    if (myInfo.delta > 0) {
      deltaHtml = `<span style="color:#34d399;font-weight:900;">▲ صعدت ${myInfo.delta} ${myInfo.delta === 1 ? 'مركز' : 'مراكز'}</span>`;
    } else if (myInfo.delta < 0) {
      deltaHtml = `<span style="color:#f59e0b;font-weight:900;">▼ تراجعت ${Math.abs(myInfo.delta)}</span>`;
    }

    const gapText = (rankNum === 1)
      ? '👑 أنت في صدارة المركز الأول!'
      : (myInfo.gapToAbove > 0 ? `تفصلك ${myInfo.gapToAbove} نقطة عن المركز الأعلى` : 'أداء رائع، استمر في التحدي!');

    const charAvatarId = currentStudent?.avatarId || 'char_01';

    stage.innerHTML = `
      <div style="position:absolute;inset:0;background:url('assets/worlds/${currentWorldId}/results.jpg') center/cover no-repeat;filter:brightness(0.8) saturate(1.08);z-index:1;"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 25%, rgba(42,34,84,0.3) 0%, rgba(10,11,22,0.65) 100%);z-index:2;"></div>
      <header style="position:relative;z-index:10;padding:12px 18px;background:rgba(15,16,33,0.92);border-bottom:1px solid rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:15px;font-weight:900;color:#fcd34d;">🏁 لوحة الترتيب بعد السؤال</span>
        <span style="font-size:12px;color:#94a3b8;">إجمالي المتسابقين: <b style="color:#52d9ed;">${total}</b></span>
      </header>
      <main style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;text-align:center;gap:12px;">
        <img src="assets/characters/animated/${charAvatarId}-idle.webp" onerror="this.src='assets/characters/animated/char_01-idle.webp'" alt="${escapeHtml(myName)}" style="width:90px;height:105px;object-fit:contain;animation:character-joy 1.1s ease-in-out infinite;filter:drop-shadow(0 8px 18px rgba(0,0,0,0.6));">
        <h3 style="font-size:18px;font-weight:900;color:#ffffff;margin:0;">يا ${escapeHtml(myName)}! 🚀</h3>
        
        <div style="width:100%;max-width:340px;background:rgba(21,23,49,0.92);border:2px solid rgba(142,100,239,0.4);border-radius:20px;padding:16px;display:flex;flex-direction:column;gap:10px;box-shadow:0 12px 30px rgba(0,0,0,0.5);">
          <div style="display:flex;justify-content:space-around;align-items:center;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:10px;">
            <div>
              <div style="font-size:11px;color:#a89bff;font-weight:700;">ترتيبي الشخصي</div>
              <div style="font-size:24px;font-weight:900;color:#fcd34d;">المركز ${rankNum}</div>
            </div>
            <div style="width:1px;height:32px;background:rgba(255,255,255,0.15);"></div>
            <div>
              <div style="font-size:11px;color:#a89bff;font-weight:700;">حركة الترتيب</div>
              <div style="font-size:14px;margin-top:4px;">${deltaHtml}</div>
            </div>
          </div>
          
          <div style="display:flex;justify-content:space-around;align-items:center;">
            <div>
              <div style="font-size:11px;color:#a89bff;font-weight:700;">مجموع نقاطي</div>
              <div class="student-live-score-val" style="font-size:20px;font-weight:900;color:#38bdf8;font-family:monospace;">${myInfo.score ?? currentScore}</div>
            </div>
            <div style="width:1px;height:28px;background:rgba(255,255,255,0.15);"></div>
            <div>
              <div style="font-size:11px;color:#a89bff;font-weight:700;">سلسلة الإجابات</div>
              <div style="font-size:14px;font-weight:900;color:#fbbf24;">${myInfo.streak > 0 ? `🔥 ${myInfo.streak} متتالية` : '💪 ابدأ السلسلة!'}</div>
            </div>
          </div>

          <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:8px 12px;font-size:12px;font-weight:800;color:#e2e8f0;">
            ${gapText}
          </div>
        </div>

        <div style="font-size:12px;color:#c9baff;font-weight:800;">
          ⏳ المعلم يراجع النتائج ويستعد للسؤال التالي...
        </div>
      </main>`;
  }

  function renderStudentRoomClosed(stage, reason, currentStudent, currentScore, currentWorldId) {
    const charAvatarId = currentStudent?.avatarId || 'char_01';
    stage.innerHTML = `
      <div style="position:absolute;inset:0;background:url('assets/worlds/${currentWorldId}/waiting.jpg') center/cover no-repeat;filter:brightness(0.75) saturate(1.05);z-index:1;"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 30%, rgba(15,23,42,0.35) 0%, rgba(10,11,22,0.7) 100%);z-index:2;"></div>
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

  const ScoreARQuizStudentView = {
    renderStudentReading,
    renderStudentQuestion,
    renderStudentResult,
    renderStudentLeaderboardCard,
    renderStudentFinalPodium,
    renderStudentRoomClosed
  };

  global.ScoreARQuizStudentView = ScoreARQuizStudentView;
  try { if (typeof globalThis !== 'undefined') globalThis.ScoreARQuizStudentView = ScoreARQuizStudentView; } catch(e){}
  if (typeof module !== 'undefined' && module.exports) module.exports = ScoreARQuizStudentView;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));