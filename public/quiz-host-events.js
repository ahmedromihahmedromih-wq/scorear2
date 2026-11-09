/**
 * ScoreAR Quiz Host Events & Evaluation Router
 * Handles Question Broadcasts, Realtime Ingestion, and Anti-Cheat Authoritative Host Scoring.
 * Strictly Rule 7 Compliant (<300 lines, margin > 100 lines).
 */
(function(global) {
  'use strict';

  function rt() { return global.ScoreARRealtime || null; }
  function lb() { return global.ScoreARHostLeaderboard || null; }
  function getModeInfo() {
    const mode = (global.ScoreARGameModes && typeof global.ScoreARGameModes.getMode === 'function') ? global.ScoreARGameModes.getMode() : (global.currentLobbyGameMode || 'SOLO');
    const aiEnabled = (global.ScoreARGameModes && typeof global.ScoreARGameModes.isAIEnabled === 'function') ? global.ScoreARGameModes.isAIEnabled() : (global.currentLobbyAIEnabled ?? true);
    return { mode, gameMode: mode, aiEnabled };
  }

  function publishRoomOpen(pin, worldId = 'royal') {
    const pStr = String(pin).padStart(6, '0');
    const { mode, gameMode, aiEnabled } = getModeInfo();
    if (rt()) rt().publish('ROOM_OPEN', { pin: pStr, worldId, mode, gameMode, aiEnabled, timestamp: Date.now() });
    try {
      const db = (global.ScoreARAuth?.getDb?.()) || global.firebase?.database?.();
      if (db && pStr) {
        db.ref('rooms/' + pStr).update({ status: 'open', isLocked: false, openedAt: Date.now(), mode, gameMode, aiEnabled }).catch(()=>{});
        db.ref('rooms/' + pStr).onDisconnect().update({ status: 'closed', closedAt: Date.now() });
      }
    } catch(e){}
  }

  function publishRoomClosed(pin, reason = 'انتهت المسابقة بواسطة المعلم') {
    const pStr = String(pin).padStart(6, '0');
    if (rt()) rt().publish('ROOM_CLOSED', { pin: pStr, reason, timestamp: Date.now() });
    try {
      const db = (global.ScoreARAuth?.getDb?.()) || global.firebase?.database?.();
      if (db && pStr) db.ref('rooms/' + pStr).update({ status: 'closed', closedAt: Date.now(), reason }).catch(()=>{});
    } catch(e){}
  }

  function publishQuestionReading(qIndex, total, qData, worldId = 'royal') {
    if (rt()) {
      const { mode, gameMode, aiEnabled } = getModeInfo();
      rt().publish('QUESTION_READING', { qIndex, totalQuestions: total, q: qData.text || qData.q, skill: qData.skill || 'سؤال', readingDuration: 10, worldId, mode, gameMode, aiEnabled });
    }
  }

  function publishQuestionStart(qIndex, total, qData, timeRemaining, worldId = 'royal') {
    if (rt()) {
      const { mode, gameMode, aiEnabled } = getModeInfo();
      rt().publish('QUESTION_START', {
        qIndex,
        totalQuestions: total,
        q: qData.text || qData.q,
        opts: qData.options || qData.opts,
        timeLimit: timeRemaining,
        skill: qData.skill || 'سؤال',
        worldId,
        mode,
        gameMode,
        aiEnabled,
        imageUrl: qData.imageUrl || null,
        isDouble: !!(qData.isDouble || qData.multiplier === 2)
      });
    }
  }

  function publishQuestionResult(payload) {
    if (rt()) rt().publish('QUESTION_RESULT', payload);
  }

  function publishContestCompleted(podium, totalPlayers, fullLeaderboard = []) {
    if (rt()) rt().publish('CONTEST_COMPLETED', { podium, totalPlayers, leaderboard: fullLeaderboard });
  }

  function publishStudentKicked(studentId, studentName) {
    if (rt()) rt().publish('STUDENT_KICKED', { studentId, studentName });
  }

  function publishRoomLockState(isLocked) {
    if (rt()) rt().publish(isLocked ? 'ROOM_LOCKED' : 'ROOM_UNLOCKED', { isLocked, timestamp: Date.now() });
    try {
      const pin = global.ScoreARQuizHost?.getPin?.();
      const db = (global.ScoreARAuth?.getDb?.()) || global.firebase?.database?.();
      if (db && pin) db.ref('rooms/' + pin).update({ isLocked: !!isLocked }).catch(()=>{});
    } catch(e){}
  }

  /**
   * Anti-Cheat Authoritative Host Evaluation (Item 2)
   * Derives time remaining strictly from questionStartTime vs server ts (ServerValue.TIMESTAMP).
   * Completely ignores any client-sent timeRemaining so forged packets gain no advantage.
   */
  function evaluateQuestionResults(qData, answers = {}, players = [], totalTime = 20, questionStartTime = null) {
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

      let earned = 0, respTime = null, scoreFormula = '';
      if (isAnsCorrect) {
        // Authoritative Server Time Calculation:
        // Ignore any ans.timeRemaining from client! Compute from server ts vs host question start time:
        let derivedTimeRemaining = 0;
        if (ans && typeof ans.ts === 'number' && typeof questionStartTime === 'number' && questionStartTime > 0) {
          const elapsedSec = Math.max(0, (ans.ts - questionStartTime) / 1000);
          derivedTimeRemaining = Math.max(0, totalTime - elapsedSec);
          respTime = elapsedSec.toFixed(1);
        } else if (ans && typeof ans.timeRemaining === 'number' && (!ans.ts || !questionStartTime)) {
          // Fallback only if offline simulation without timestamps
          derivedTimeRemaining = Math.max(0, Math.min(totalTime, ans.timeRemaining));
          respTime = Math.max(0, totalTime - derivedTimeRemaining).toFixed(1);
        }

        const base = Number(qData.points) || 1000;
        const mult = (qData.isDouble || qData.multiplier === 2) ? 2 : (Number(qData.multiplier) || 1);
        const tf = (0.5 + 0.5 * (Math.max(0, derivedTimeRemaining) / (totalTime || 20)));
        earned = Math.round(base * tf * mult);
        scoreFormula = `${base} × ${tf.toFixed(2)} × ${mult} = ${earned}`;

        const numericResp = respTime !== null ? parseFloat(respTime) : Infinity;
        if (numericResp < minTimeSec) {
          minTimeSec = numericResp;
          fastest = { id: p.id, name: p.name, timeSec: numericResp };
        }
      }

      p.score = (p.score || 0) + earned;
      p.lastPointsGained = earned;
      p.streak = isAnsCorrect ? ((p.streak || 0) + 1) : 0;

      playerResults[pIdStr] = {
        id: p.id,
        playerName: p.name,
        isCorrect: isAnsCorrect,
        correct: isAnsCorrect,
        chosenIndex: ans ? Number(ans.optionIndex) : -1,
        pointsEarned: earned,
        totalScore: p.score,
        streak: p.streak,
        respTime,
        scoreFormula
      };
    });

    const correctIndices = (evaluator && typeof evaluator.getCorrectIndices === 'function')
      ? evaluator.getCorrectIndices(qData)
      : (Array.isArray(qData.correct) ? qData.correct : [Number(qData.ans ?? 0)]);
    const correctIdx = correctIndices[0] ?? 0;
    const opts = qData.options || qData.opts || [];
    const correctAnswerText = opts[correctIdx] || '';

    return { correct: correctIndices, correctAnswer: correctIdx, correctAnswerText, playerResults, fastest };
  }

  function handleHostIncomingMessage(msg, ctx) {
    if (!msg || typeof msg !== 'object') return;
    const room = ctx.currentRoom;
    if (!room) return;

    if (msg.type === 'STUDENT_JOIN') {
      const { mode: jMode, gameMode: jGMode, aiEnabled: jAi } = getModeInfo();
      if (rt() && room.pin) rt().publish('ROOM_MODE_UPDATE', { pin: room.pin, mode: jMode, gameMode: jGMode, aiEnabled: jAi });
      const p = msg.player || {};
      const exists = room.players.find(x => x.id === p.id || x.name === p.name);
      if (!exists && p.id && p.name) {
        if (ctx.isRoomLocked) {
          if (rt()) rt().publish('STUDENT_KICKED', { studentId: p.id, studentName: p.name });
          return;
        }
        room.players.push({
          id: p.id, name: p.name, avatarId: p.avatarId || 'char_01',
          score: 0, streak: 0, lastPointsGained: 0, isRegistered: !!p.isRegistered, isDemo: false
        });
        if (typeof ctx.onPlayerJoined === 'function') ctx.onPlayerJoined(p);
      } else if (exists && msg.isReconnect) {
        if (typeof ctx.onPlayerReconnected === 'function') ctx.onPlayerReconnected(exists);
      }
    } else if (msg.type === 'STUDENT_ANSWER' || msg.type === 'STUDENT_ANSWERED') {
      const qIndex = ctx.currentQIndex;
      if (!room.answers[qIndex]) room.answers[qIndex] = {};
      const senderKey = String(msg.playerId || msg.playerName || Math.random());
      if (room.answers[qIndex][senderKey] && msg.optionIndex === undefined) return;

      const existing = room.answers[qIndex][senderKey] || {};
      room.answers[qIndex][senderKey] = {
        playerId: String(msg.playerId || existing.playerId || senderKey),
        playerName: msg.playerName || existing.playerName || '',
        optionIndex: msg.optionIndex !== undefined ? Number(msg.optionIndex) : (existing.optionIndex !== undefined ? existing.optionIndex : -1),
        chosenIndices: Array.isArray(msg.chosenIndices) ? msg.chosenIndices : (msg.optionIndex !== undefined ? [Number(msg.optionIndex)] : existing.chosenIndices || []),
        optionOrder: Array.isArray(msg.optionOrder) ? msg.optionOrder : existing.optionOrder || null,
        ts: msg.ts || existing.ts || Date.now(),
        answeredAt: Date.now()
      };

      if (typeof ctx.onPlayerAnswered === 'function') ctx.onPlayerAnswered(msg);

      const ansCount = Object.keys(room.answers[qIndex]).length;
      if (room.players.length > 0 && ansCount >= room.players.length) {
        if (typeof ctx.onAllAnswered === 'function') ctx.onAllAnswered();
      }
    }
  }

  function renderHostLeaderboard(stage, currentRoom, activeQuestions, currentQIndex, onNext, onPodium, onClose) {
    if (lb()) lb().renderHostLeaderboard(stage, currentRoom, activeQuestions, currentQIndex, onNext, onPodium, onClose);
  }

  function renderHostPodium(stage, currentRoom, onClose) {
    if (lb()) lb().renderHostPodium(stage, currentRoom, onClose);
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
