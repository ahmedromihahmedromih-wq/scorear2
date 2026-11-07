/**
 * ScoreAR Quiz Host Events & Realtime Authoritative Networking
 * Sub-module of quiz-host.js.
 * Manages Authoritative Scoring, Leaderboard with World Background & FLIP motion, Podium & Full Results Roster.
 * Strictly Rule 7 compliant (<500 lines).
 */
(function(global) {
  'use strict';

  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function rt() { return global.ScoreARRealtime; }
  function sfx(name) { if (global.ScoreARAudio) global.ScoreARAudio.playSfx(name); }
  function music(name, vol) { if (global.ScoreARAudio) global.ScoreARAudio.playMusic(name, vol); }

  const previousRanks = new Map();

  function publishRoomOpen(pin, world, questionCount) {
    const pStr = String(pin);
    if (rt()) {
      const wid = (typeof world === 'object' && world) ? (world.id || 'royal') : (world || 'royal');
      const wname = (typeof world === 'object' && world) ? (world.name || 'عالم المنافسة') : 'عالم المنافسة';
      rt().publish('ROOM_OPENED', { pin: pStr, worldId: wid, worldName: wname, totalQuestions: questionCount });
    }
    try {
      const db = (global.ScoreARAuth && global.ScoreARAuth.getDb) ? global.ScoreARAuth.getDb() : (global.firebase && global.firebase.database ? global.firebase.database() : null);
      if (db) {
        db.ref('rooms/' + pStr).set({ pin: pStr, status: 'lobby', isLocked: false, createdAt: Date.now() });
        db.ref('rooms/' + pStr).onDisconnect().update({ status: 'closed', closedAt: Date.now() });
      }
    } catch(e){}
  }

  function publishQuestionReading(qIndex, total, qData, worldId = 'royal') {
    if (rt()) {
      rt().publish('QUESTION_READING', { qIndex, totalQuestions: total, q: qData.text || qData.q, skill: qData.skill || 'عام', readingDuration: 10, worldId });
    }
  }

  function publishQuestionStart(qIndex, total, qData, timeRemaining, worldId = 'royal') {
    if (rt()) {
      rt().publish('QUESTION_START', { qIndex, totalQuestions: total, q: qData.text || qData.q, opts: qData.options || qData.opts, timeLimit: timeRemaining, skill: qData.skill || 'عام', worldId });
    }
  }

  function publishQuestionResult(payload) {
    if (rt()) rt().publish('QUESTION_RESULT', payload);
  }

  function publishContestCompleted(podium, totalPlayers, fullLeaderboard = []) {
    if (rt()) {
      rt().publish('CONTEST_COMPLETED', {
        podium,
        totalPlayers,
        leaderboard: fullLeaderboard
      });
    }
  }

  function publishStudentKicked(studentId, studentName) {
    if (rt()) rt().publish('STUDENT_KICKED', { studentId, studentName });
  }

  function publishRoomLockState(isLocked) {
    if (rt()) rt().publish(isLocked ? 'ROOM_LOCKED' : 'ROOM_UNLOCKED');
    try {
      const p = (global.ScoreARQuizHost && global.ScoreARQuizHost.getPin) ? global.ScoreARQuizHost.getPin() : null;
      const db = (global.ScoreARAuth && global.ScoreARAuth.getDb) ? global.ScoreARAuth.getDb() : (global.firebase && global.firebase.database ? global.firebase.database() : null);
      if (db && p) db.ref('rooms/' + p + '/isLocked').set(!!isLocked);
    } catch(e){}
  }

  function publishRoomClosed(pin, reason = 'انتهت المسابقة بواسطة المعلم') {
    const pStr = String(pin);
    if (rt()) rt().publish('ROOM_CLOSED', { pin: pStr, reason });
    try {
      const db = (global.ScoreARAuth && global.ScoreARAuth.getDb) ? global.ScoreARAuth.getDb() : (global.firebase && global.firebase.database ? global.firebase.database() : null);
      if (db && pStr) db.ref('rooms/' + pStr).update({ status: 'closed', closedAt: Date.now() });
    } catch(e){}
  }

  function deduplicatePlayerName(players, candidateName) {
    if (!players || !players.length) return candidateName;
    const base = candidateName.replace(/\s*\(\d+\)$/, '').trim();
    let candidate = candidateName.trim();
    let count = 2;
    const isTaken = (n) => players.some(p => p && p.name && p.name.trim() === n);
    if (isTaken(candidate)) {
      while (isTaken(`${base} (${count})`)) {
        count++;
      }
      candidate = `${base} (${count})`;
    }
    return candidate;
  }

  /**
   * Authoritative Host Evaluation for all players for the current question
   */
  function evaluateQuestionResults(qData, answers = {}, players = [], totalTime = 20) {
    let fastest = null, minTimeSec = Infinity;
    const playerResults = {};
    const evaluator = global.ScoreAREvaluator;

    players.forEach(p => {
      const pIdStr = String(p.id);
      const ans = answers[pIdStr] || answers[p.id] ||
        Object.values(answers).find(a => String(a.playerId) === pIdStr || (a.playerName && a.playerName.trim() === p.name.trim()));

      const chosen = ans ? (ans.chosenIndices !== undefined ? ans.chosenIndices : ans.optionIndex) : -1;
      const optionOrder = ans ? ans.optionOrder : null;

      const isAnsCorrect = (evaluator && typeof evaluator.isCorrect === 'function')
        ? evaluator.isCorrect(qData, chosen, optionOrder)
        : (ans && Array.isArray(qData.correct) && qData.correct.includes(Number(ans.optionIndex)));

      let earned = 0, respTime = null;
      if (isAnsCorrect) {
        const timeRemaining = (ans && typeof ans.timeRemaining === 'number') ? ans.timeRemaining : 0;
        respTime = Math.max(0, totalTime - timeRemaining).toFixed(1);
        earned = Math.round(500 + (500 * (Math.max(0, timeRemaining) / totalTime)));
        p.score = (p.score || 0) + earned;
        p.streak = (p.streak || 0) + 1;
        p.lastPointsGained = earned;
        if (Number(respTime) < minTimeSec) {
          minTimeSec = Number(respTime);
          fastest = { name: p.name, timeSec: respTime, points: earned, id: p.id };
        }
      } else {
        p.streak = 0;
        p.lastPointsGained = 0;
        if (ans && typeof ans.timeRemaining === 'number') {
          respTime = Math.max(0, totalTime - ans.timeRemaining).toFixed(1);
        }
      }

      const chosenIdx = ans ? (ans.optionIndex !== undefined ? Number(ans.optionIndex) : (Array.isArray(chosen) ? chosen[0] : -1)) : -1;
      playerResults[p.id] = {
        isCorrect: Boolean(isAnsCorrect),
        correct: Boolean(isAnsCorrect),
        pointsEarned: earned,
        totalScore: p.score,
        streak: p.streak,
        chosenIndex: chosenIdx,
        chosenIndices: Array.isArray(chosen) ? chosen : (chosenIdx >= 0 ? [chosenIdx] : []),
        respTime: respTime
      };
    });

    const correctIndices = Array.isArray(qData.correct) ? qData.correct : [0];
    const firstCorrectIdx = correctIndices[0] ?? 0;
    const opts = qData.options || qData.opts || [];

    return {
      playerResults,
      fastest,
      correct: correctIndices,
      correctAnswer: firstCorrectIdx,
      correctAnswerText: opts[firstCorrectIdx] || 'الإجابة النموذجية'
    };
  }

  function handleHostIncomingMessage(msg, ctx) {
    if (!ctx || !ctx.currentRoom || !msg) return;
    const room = ctx.currentRoom;

    if (msg.type === 'STUDENT_JOIN' && msg.player) {
      const p = msg.player;
      const rawName = (p.name || '').trim();
      const isExplicitReconnect = Boolean(p.isReconnect || msg.isReconnect);
      const existing = room.players.find(x => String(x.id) === String(p.id) || (isExplicitReconnect && rawName && x.name.trim() === rawName));
      if (existing) {
        existing.id = String(p.id);
        if (p.avatarId) existing.avatarId = p.avatarId;
        if (rt()) {
          rt().publish('JOIN_ACCEPTED', {
            studentId: p.id,
            studentName: existing.name,
            player: existing,
            pin: room.pin,
            worldId: room.world?.id || 'royal',
            playerCount: room.players.length,
            score: existing.score || 0,
            streak: existing.streak || 0,
            roomStatus: room.status,
            currentQIndex: ctx.currentQIndex,
            isReconnected: true
          });
        }
        if (typeof ctx.onPlayerReconnected === 'function') ctx.onPlayerReconnected(existing);
        return;
      }
      if (ctx.isRoomLocked) return;
      p.name = deduplicatePlayerName(room.players, p.name || 'بطل جديد');
      const isRegistered = !!(p.isRegistered || (!p.isAnonymous && p.role === 'student'));
      const isDemo = !!(p.isDemo || p.isBot || String(p.id).startsWith('demo-'));
      room.players.push({
        id: String(p.id),
        name: p.name,
        avatarId: p.avatarId || 'char_01',
        isRegistered,
        isDemo,
        score: 0,
        streak: 0,
        lastPointsGained: 0
      });
      if (typeof ctx.onPlayerJoined === 'function') ctx.onPlayerJoined(p);
      if (rt()) {
        rt().publish('JOIN_ACCEPTED', {
          studentId: p.id,
          studentName: p.name,
          player: p,
          pin: room.pin,
          worldId: room.world?.id || 'royal',
          playerCount: room.players.length,
          score: 0,
          streak: 0,
          roomStatus: room.status,
          currentQIndex: ctx.currentQIndex
        });
      }
    } else if (msg.type === 'STUDENT_ANSWER') {
      const qIndex = ctx.currentQIndex;
      if (!room.answers[qIndex]) room.answers[qIndex] = {};
      const senderKey = String(msg.playerId || msg.playerName || Math.random());
      if (room.answers[qIndex][senderKey]) return;

      room.answers[qIndex][senderKey] = {
        playerId: String(msg.playerId || ''),
        playerName: msg.playerName || '',
        optionIndex: Number(msg.optionIndex),
        chosenIndices: Array.isArray(msg.chosenIndices) ? msg.chosenIndices : [Number(msg.optionIndex)],
        optionOrder: Array.isArray(msg.optionOrder) ? msg.optionOrder : null,
        timeRemaining: Number(msg.timeRemaining) || 0,
        answeredAt: Date.now()
      };

      if (typeof ctx.onPlayerAnswered === 'function') ctx.onPlayerAnswered(msg);

      const ansCount = Object.keys(room.answers[qIndex]).length;
      if (room.players.length > 0 && ansCount >= room.players.length) {
        if (typeof ctx.onAllAnswered === 'function') ctx.onAllAnswered();
      }
    }
  }

  // PHASE 4: Leaderboard with World Background, Staggered Reveal, FLIP Shifts & Audio
  function renderHostLeaderboard(stage, currentRoom, activeQuestions, currentQIndex, onNext, onPodium, onClose) {
    const sorted = [...currentRoom.players].sort((a, b) => b.score - a.score);
    const hasNext = (currentQIndex + 1 < activeQuestions.length);
    const worldId = (currentRoom.world && currentRoom.world.id) ? currentRoom.world.id : (currentRoom.worldId || 'royal');
    const totalCount = Math.min(sorted.length, 5);

    // Compute rank shifts (FLIP transition) and biggest jumper badge
    let maxJump = 0, biggestJumperId = null;
    sorted.forEach((p, idx) => {
      const curRank = idx + 1;
      const prevRank = previousRanks.has(p.id) ? previousRanks.get(p.id) : curRank;
      const jump = prevRank - curRank;
      p._rankDelta = jump;
      p._prevRank = prevRank;
      p._currentRank = curRank;
      if (jump >= 2 && jump > maxJump) {
        maxJump = jump;
        biggestJumperId = p.id;
      }
    });

    // Update previous ranks for next question comparison
    sorted.forEach(p => previousRanks.set(p.id, p._currentRank));

    sfx('whoosh');
    setTimeout(() => { sfx('reveal'); }, 400 + (totalCount * 260));

    stage.innerHTML = `
      <style>
        @keyframes staggeredRowIn {
          0% { opacity: 0; transform: translateY(18px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .scorear-leaderboard-row { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      </style>
      <div style="position:absolute;inset:0;overflow:hidden;z-index:0;background:url('assets/worlds/${worldId}/results.jpg') center/cover no-repeat;">
        <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 25%, rgba(15,23,42,0.65) 0%, rgba(10,11,24,0.94) 100%);"></div>
      </div>
      <header style="position:relative;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:14px 28px;background:rgba(12,13,30,0.75);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,0.12);">
        <button onclick="ScoreARQuizHost.closeHostSession()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 12px;border-radius:8px;font-weight:800;font-size:11px;cursor:pointer;">✕ إنهاء القاعة</button>
        <h2 style="font-size:22px;font-weight:900;color:#ffffff;margin:0;display:flex;align-items:center;gap:10px;">🏆 لوحة الصدارة بعد السؤال (${currentQIndex + 1})</h2>
        <button onclick="${hasNext ? `ScoreARQuizHost.launchQuestion(${currentQIndex + 1})` : 'ScoreARQuizHost.renderHostPodium()'}" style="background:linear-gradient(135deg, #6366f1, #8b5cf6);border:none;color:#fff;padding:10px 22px;border-radius:12px;font-weight:900;font-size:13px;cursor:pointer;box-shadow:0 4px 16px rgba(99,102,241,0.4);">
          ${hasNext ? 'السؤال التالي ➔' : 'تتويج الأبطال 👑'}
        </button>
      </header>
      <main style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;">
        <div class="leaderboard-container" style="width:100%;max-width:780px;display:flex;flex-direction:column;gap:12px;">
          ${sorted.slice(0, 5).map((p, idx) => {
            const isTop1 = (idx === 0), isTop2 = (idx === 1), isTop3 = (idx === 2);
            const roleIcon = p.isDemo ? '🤖' : p.isRegistered ? '✓' : '✨';
            const roleTitle = p.isDemo ? 'طالب تجريبي' : p.isRegistered ? 'طالب مسجل' : 'ضيف';

            let arrowHtml = '<span style="color:#94a3b8;font-size:13px;font-weight:900;">—</span>';
            if (p._rankDelta > 0) {
              arrowHtml = `<span style="color:#34d399;font-size:13px;font-weight:900;" title="صعد ${p._rankDelta} مراكز">▲ ${p._rankDelta}</span>`;
            } else if (p._rankDelta < 0) {
              arrowHtml = `<span style="color:#f87171;font-size:13px;font-weight:900;" title="تراجع ${Math.abs(p._rankDelta)} مراكز">▼ ${Math.abs(p._rankDelta)}</span>`;
            }

            const badges = [];
            if (p.id === biggestJumperId) badges.push('<span style="background:rgba(168,85,247,0.25);border:1px solid #a855f7;color:#d8b4fe;font-size:10px;font-weight:900;padding:2px 8px;border-radius:10px;">🚀 قفزة كبرى</span>');
            if (p.streak >= 3) badges.push(`<span style="background:rgba(245,158,11,0.25);border:1px solid #f59e0b;color:#fcd34d;font-size:10px;font-weight:900;padding:2px 8px;border-radius:10px;">🔥 ${p.streak} متتالية</span>`);
            if (p.lastPointsGained && p.lastPointsGained >= 850) badges.push('<span style="background:rgba(52,211,153,0.25);border:1px solid #10b981;color:#34d399;font-size:10px;font-weight:900;padding:2px 8px;border-radius:10px;">⚡ سرعة فائقة</span>');

            // Staggered reveal delay: lowest rank appears first, Rank 1 champion appears last!
            const delaySec = ((totalCount - 1 - idx) * 0.26).toFixed(2);
            const borderStyle = isTop1 ? '2px solid #f59e0b;box-shadow:0 0 24px rgba(245,158,11,0.45);background:linear-gradient(135deg, rgba(245,158,11,0.25), rgba(15,23,42,0.85))'
              : isTop2 ? '2px solid #94a3b8;box-shadow:0 0 16px rgba(148,163,184,0.3);background:rgba(15,23,42,0.85)'
              : isTop3 ? '2px solid #d97706;box-shadow:0 0 14px rgba(217,119,6,0.25);background:rgba(15,23,42,0.85)'
              : '1px solid rgba(255,255,255,0.12);background:rgba(15,23,42,0.75)';

            const ptsGained = p.lastPointsGained || 0;
            const startScore = Math.max(0, (p.score || 0) - ptsGained);

            return `
              <div class="scorear-leaderboard-row" style="animation:staggeredRowIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) ${delaySec}s both;border-radius:18px;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;border:${borderStyle};backdrop-filter:blur(16px);transition:transform 0.25s ease;">
                <div style="display:flex;align-items:center;gap:12px;">
                  <div style="display:flex;flex-direction:column;align-items:center;min-width:38px;">
                    <div style="width:34px;height:34px;border-radius:10px;background:${isTop1?'#f59e0b':isTop2?'#94a3b8':isTop3?'#d97706':'rgba(255,255,255,0.1)'};color:${isTop1?'#000':'#fff'};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;">
                      ${isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : (idx + 1)}
                    </div>
                    <div style="margin-top:2px;">${arrowHtml}</div>
                  </div>
                  <div style="width:40px;height:52px;display:flex;align-items:flex-end;justify-content:center;">
                    <img src="assets/characters/animated/${p.avatarId || 'char_01'}-idle.webp" onerror="this.src='assets/characters/animated/char_01-idle.webp'" alt="${escapeHtml(p.name)}" style="height:48px;object-fit:contain;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5));">
                  </div>
                  <div>
                    <div style="display:flex;align-items:center;gap:6px;">
                      <span title="${roleTitle}" style="color:${roleIcon==='✓'?'#34d399':roleIcon==='🤖'?'#38bdf8':'#fcd34d'};font-size:13px;">${roleIcon}</span>
                      <span class="player-name-text" style="font-size:16px;font-weight:900;color:#ffffff;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:inline-block;" title="${escapeHtml(p.name)}" onclick="this.classList.toggle('expanded');">${escapeHtml(p.name)}</span>
                      ${isTop1 ? '<span style="font-size:16px;">👑</span>' : ''}
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
                      ${badges.join('')}
                    </div>
                  </div>
                </div>
                <div style="text-align:left;display:flex;flex-direction:column;align-items:flex-end;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    ${ptsGained > 0 ? `<span style="background:rgba(16,185,129,0.25);border:1px solid #10b981;color:#34d399;font-size:11px;font-weight:900;padding:2px 6px;border-radius:6px;">+${ptsGained}</span>` : ''}
                    <span class="scorear-count-up" data-start="${startScore}" data-target="${p.score || 0}" style="font-size:22px;font-weight:900;color:${isTop1?'#fbbf24':'#34d399'};font-family:monospace;">${p.score || 0}</span>
                  </div>
                  <span style="font-size:10px;color:#94a3b8;font-weight:700;">نقطة</span>
                </div>
              </div>`;
          }).join('')}
        </div>
      </main>`;

    // Counting-up score animation
    setTimeout(() => {
      const countEls = stage.querySelectorAll('.scorear-count-up');
      countEls.forEach(el => {
        const start = Number(el.getAttribute('data-start')) || 0;
        const target = Number(el.getAttribute('data-target')) || 0;
        if (start === target) return;
        const duration = 750, startTime = performance.now();
        function tick(now) {
          const progress = Math.min(1, (now - startTime) / duration);
          el.textContent = Math.round(start + (target - start) * progress);
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, 450);
  }

  // PHASE 5: Crowning Ceremony, 3D Champions Podium & Full Contest Results Roster
  function renderHostPodium(stage, currentRoom, onClose) {
    const sorted = [...currentRoom.players].sort((a, b) => b.score - a.score);
    const p1 = sorted[0] || { name: 'البطل الأول', score: 0, avatarId: 'char_01' };
    const p2 = sorted[1] || { name: 'الوصيف الثاني', score: 0, avatarId: 'char_02' };
    const p3 = sorted[2] || { name: 'الثالث', score: 0, avatarId: 'char_03' };
    const worldId = (currentRoom.world && currentRoom.world.id) ? currentRoom.world.id : (currentRoom.worldId || 'royal');

    sfx('reveal');
    music('magic', 0.28);

    try {
      if (global.confetti) {
        global.confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
        setTimeout(() => global.confetti({ particleCount: 180, spread: 110, origin: { y: 0.5 } }), 800);
      }
    } catch(e){}

    publishContestCompleted([p1, p2, p3].filter(Boolean), currentRoom.players.length, sorted);

    const podiums = [
      { p: p2, medal: '🥈', h: '160px', bg: 'linear-gradient(180deg, #94a3b8, #475569)', tc: '#e2e8f0', w: '160px', fs: '26px', sz: '80px' },
      { p: p1, medal: '🥇', h: '220px', bg: 'linear-gradient(180deg, #f59e0b, #b45309)', tc: '#fef3c7', w: '190px', fs: '36px', sz: '110px', main: true },
      { p: p3, medal: '🥉', h: '130px', bg: 'linear-gradient(180deg, #d97706, #78350f)', tc: '#fed7aa', w: '160px', fs: '24px', sz: '70px' }
    ];

    stage.innerHTML = `
      <div style="position:absolute;inset:0;overflow:hidden;z-index:0;background:url('assets/worlds/${worldId}/podium.jpg') center/cover no-repeat;">
        <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 15%, rgba(245,158,11,0.25) 0%, rgba(12,13,30,0.94) 100%);"></div>
      </div>
      <header style="position:relative;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:14px 28px;background:rgba(12,13,30,0.75);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,0.12);">
        <button onclick="ScoreARQuizHost.closeHostSession()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:8px 14px;border-radius:10px;font-weight:800;font-size:12px;cursor:pointer;">✕ إغلاق التتويج والعودة</button>
        <div style="font-size:22px;font-weight:900;color:#fef3c7;display:flex;align-items:center;gap:10px;">👑 منصة تتويج أبطال ScoreAR 👑</div>
        <div style="font-size:13px;color:#94a3b8;font-weight:700;">إجمالي الأبطال: <b style="color:#fff;">${currentRoom.players.length}</b></div>
      </header>
      <main style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:20px;overflow-y:auto;">
        <!-- Top 3 Podium -->
        <div style="display:flex;align-items:flex-end;justify-content:center;gap:16px;margin-bottom:20px;margin-top:10px;">
          ${podiums.map(item => `
            <div style="display:flex;flex-direction:column;align-items:center;animation:enterFullBody 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);">
              <div style="height:${item.sz};display:flex;align-items:flex-end;justify-content:center;margin-bottom:6px;">
                <img src="assets/characters/animated/${item.p.avatarId || 'char_01'}-idle.webp" onerror="this.src='assets/characters/animated/char_01-idle.webp'" alt="${escapeHtml(item.p.name)}" style="height:${item.sz};object-fit:contain;filter:drop-shadow(0 8px 16px rgba(0,0,0,0.7));">
              </div>
              <div style="background:rgba(15,23,42,0.92);border:2px solid ${item.main ? '#f59e0b' : 'rgba(255,255,255,0.2)'};border-radius:12px;padding:4px 12px;color:#fff;font-size:12px;font-weight:900;margin-bottom:6px;box-shadow:0 6px 18px rgba(0,0,0,0.5);white-space:nowrap;max-width:150px;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(item.p.name)}</div>
              <div style="width:${item.w};height:${item.h};background:${item.bg};border-top-left-radius:16px;border-top-right-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:10px;box-shadow:0 12px 30px rgba(0,0,0,0.6);border:2px solid rgba(255,255,255,0.3);border-bottom:none;">
                <div style="font-size:${item.fs};">${item.medal}</div>
                <div style="font-size:18px;font-weight:900;color:${item.tc};font-family:monospace;margin-top:4px;">${item.p.score || 0}</div>
                <div style="font-size:10px;font-weight:800;color:${item.tc};opacity:0.85;">نقطة</div>
              </div>
            </div>`).join('')}
        </div>

        <!-- Full Results Table for ALL Contest Participants -->
        <div style="width:100%;max-width:780px;background:rgba(15,23,42,0.85);backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,0.15);border-radius:18px;padding:14px 18px;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
          <div style="font-size:14px;font-weight:900;color:#c9baff;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;">
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
      </main>`;
  }

  const ScoreARHostEvents = {
    publishRoomOpen,
    publishRoomClosed,
    publishQuestionReading,
    publishQuestionStart,
    publishQuestionResult,
    publishContestCompleted,
    publishStudentKicked,
    publishRoomLockState,
    evaluateQuestionResults,
    handleHostIncomingMessage,
    renderHostLeaderboard,
    renderHostPodium
  };

  global.ScoreARHostEvents = ScoreARHostEvents;
  try { if (typeof globalThis !== 'undefined') globalThis.ScoreARHostEvents = ScoreARHostEvents; } catch(e){}
  if (typeof module !== 'undefined' && module.exports) module.exports = ScoreARHostEvents;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
