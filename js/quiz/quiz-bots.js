/**
 * ScoreAR Demo & Bot Students Simulation Engine (quiz-bots.js)
 * Manages 1-30 simulated demo students for host lobby competitions.
 * Probabilistic answering engine inside teacher's browser (strictly Rule 2: pure JS probability, NOT AI).
 * Accuracy: low (30%), medium (60%), high (85%), mixed (25-90%).
 * Speed: fast (2-5s), medium (5-11s), slow (11-16s), mixed (2-16s).
 * Strictly Rule 7 compliant (<500 lines).
 */
(function(global) {
  'use strict';

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const ARABIC_NAMES_POOL = [
    'عمر السعيد', 'يوسف أحمد', 'فاطمة الزهراء', 'مريم محمود', 'خالد بن وليد',
    'لينا حسام', 'زين مصطفى', 'رنا عادل', 'طارق زياد', 'نور الدين',
    'سارة جمال', 'حمزة علي', 'هدى كريم', 'ياسين عمر', 'شهد ناصر',
    'بسام فهد', 'دانة سامي', 'ماجد فيصل', 'جود إبراهيم', 'ريان كمال',
    'سلمى توفيق', 'زياد شريف', 'تسنيم رضوان', 'أنس حازم', 'آية هاني',
    'بلال رامي', 'لجين ممدوح', 'عمار وائل', 'روان صفوت', 'مالك أسامة'
  ];

  let pendingTimeouts = [];
  let includeBotsInReport = false;

  function getHostRoom() {
    return (global.ScoreARQuizHost && typeof global.ScoreARQuizHost.getCurrentRoom === 'function')
      ? global.ScoreARQuizHost.getCurrentRoom()
      : null;
  }

  function deduplicateName(existingPlayers, candidate) {
    const base = candidate.replace(/\s*\(\d+\)$/, '').trim();
    let name = candidate.trim();
    let counter = 2;
    const exists = n => existingPlayers.some(p => p && p.name && p.name.trim() === n);
    while (exists(name)) {
      name = `${base} (${counter++})`;
    }
    return name;
  }

  // --- 1. Roster Management ---
  function addBots(count = 5, accuracySetting = 'medium', speedSetting = 'medium') {
    const room = getHostRoom();
    if (!room) return;
    const num = Math.max(1, Math.min(30, Number(count) || 5));
    if (!Array.isArray(room.players)) room.players = [];

    const existingNames = new Set(room.players.map(p => p.name));
    const availableNames = ARABIC_NAMES_POOL.filter(n => !existingNames.has(n));
    let nameIdx = 0;

    for (let i = 0; i < num; i++) {
      if (room.players.length >= 60) break; // Safe room ceiling

      let chosenName = availableNames[nameIdx % availableNames.length] || ARABIC_NAMES_POOL[i % ARABIC_NAMES_POOL.length];
      nameIdx++;
      const uniqueName = deduplicateName(room.players, chosenName);
      const avatarNum = ((room.players.length + i) % 20) + 1;
      const avatarId = 'char_' + String(avatarNum).padStart(2, '0');

      let acc = 0.60;
      if (accuracySetting === 'low') acc = 0.30;
      else if (accuracySetting === 'high') acc = 0.85;
      else if (accuracySetting === 'mixed') acc = 0.25 + Math.random() * 0.65;

      room.players.push({
        id: 'bot_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
        name: uniqueName,
        avatarId: avatarId,
        isDemo: true,
        isBot: true,
        accuracy: acc,
        speed: speedSetting,
        score: 0,
        streak: 0,
        lastPointsGained: 0
      });
    }

    if (global.ScoreARQuizHost && typeof global.ScoreARQuizHost.refreshLobbyUi === 'function') {
      global.ScoreARQuizHost.refreshLobbyUi();
    }
    if (global.toast) global.toast(`تمت إضافة ${num} من الأبطال التجريبيين 🤖`);
  }

  function removeBot(botId) {
    const room = getHostRoom();
    if (!room || !Array.isArray(room.players)) return;
    const idx = room.players.findIndex(p => String(p.id) === String(botId));
    if (idx !== -1) {
      const removed = room.players.splice(idx, 1)[0];
      if (global.ScoreARQuizHost && typeof global.ScoreARQuizHost.refreshLobbyUi === 'function') {
        global.ScoreARQuizHost.refreshLobbyUi();
      }
      if (global.toast) global.toast(`تم حذف المتسابق التجريبي: ${removed.name}`);
    }
  }

  function removeAllBots() {
    const room = getHostRoom();
    if (!room || !Array.isArray(room.players)) return;
    const initialLen = room.players.length;
    room.players = room.players.filter(p => !p.isBot);
    const removedCount = initialLen - room.players.length;

    clearPendingAnswers();
    if (global.ScoreARQuizHost && typeof global.ScoreARQuizHost.refreshLobbyUi === 'function') {
      global.ScoreARQuizHost.refreshLobbyUi();
    }
    if (global.toast) global.toast(`تم حذف ${removedCount} من الطلاب التجريبيين 🗑️`);
  }

  // --- 2. Probabilistic Simulation Engine ---
  function clearPendingAnswers() {
    pendingTimeouts.forEach(t => clearTimeout(t));
    pendingTimeouts = [];
  }

  function onQuestionStart(qIndex, qData, timeLimit = 20) {
    clearPendingAnswers();
    const room = getHostRoom();
    if (!room || !Array.isArray(room.players)) return;

    const bots = room.players.filter(p => p && (p.isBot || p.isDemo));
    if (!bots.length) return;

    const opts = qData.options || qData.opts || [];
    const totalOpts = Math.max(2, opts.length || 4);
    const correctIdx = (Array.isArray(qData.correct) && qData.correct.length > 0) ? Number(qData.correct[0]) : 0;

    bots.forEach(bot => {
      const cardP = global.ScoreARCardArena?.getManager?.()?.players?.[bot.id];
      if (cardP?.status?.isPinned || bot.isPinned) {
        if (cardP?.status) cardP.status.isPinned = false;
        bot.isPinned = false;
        return;
      }
      const hasFog = Boolean(cardP?.status?.hasFog || bot.hasFog);
      const isSliced = Boolean(cardP?.status?.timeSliced || bot.timeSliced);
      if (cardP?.status) { cardP.status.hasFog = false; cardP.status.timeSliced = false; }
      bot.hasFog = false; bot.timeSliced = false;

      // 1. Calculate delay in seconds based on bot's speed profile
      let delaySec = 6;
      if (bot.speed === 'fast') {
        delaySec = 2 + Math.random() * 3; // 2s to 5s
      } else if (bot.speed === 'slow') {
        delaySec = 10 + Math.random() * 6; // 10s to 16s
      } else if (bot.speed === 'mixed') {
        delaySec = 2 + Math.random() * (Math.max(4, timeLimit - 4));
      } else { // medium
        delaySec = 5 + Math.random() * 6; // 5s to 11s
      }
      if (hasFog) delaySec += 4;
      const effectiveLimit = isSliced ? Math.max(3, Math.floor(timeLimit / 2)) : timeLimit;
      if (isSliced && delaySec > effectiveLimit) return;
      delaySec = Math.min(delaySec, Math.max(1.5, effectiveLimit - 1.5));

      // 2. Determine chosen option based on accuracy probability
      const effAcc = hasFog ? ((bot.accuracy || 0.6) * 0.4) : (bot.accuracy || 0.6);
      const isCorrect = Math.random() < effAcc;
      let chosenIndex = correctIdx;
      if (!isCorrect) {
        const wrongIndices = [];
        for (let i = 0; i < totalOpts; i++) {
          if (i !== correctIdx) wrongIndices.push(i);
        }
        chosenIndex = wrongIndices.length ? wrongIndices[Math.floor(Math.random() * wrongIndices.length)] : 0;
      }

      // 3. Schedule the answer dispatch
      const tId = setTimeout(() => {
        if (room.status !== 'question') return;
        const cpNow = global.ScoreARCardArena?.getManager?.()?.players?.[bot.id];
        if (cpNow?.status?.isPinned || bot.isPinned) {
          if (cpNow?.status) cpNow.status.isPinned = false;
          bot.isPinned = false;
          return;
        }
        const remaining = Math.max(1, Math.round(timeLimit - delaySec));
        if (global.ScoreARQuizHost && typeof global.ScoreARQuizHost.handleHostIncomingMessage === 'function') {
          global.ScoreARQuizHost.handleHostIncomingMessage({
            type: 'STUDENT_ANSWER',
            playerId: bot.id,
            playerName: bot.name,
            optionIndex: chosenIndex,
            chosenIndices: [chosenIndex],
            timeRemaining: remaining
          });
        }
      }, Math.round(delaySec * 1000));

      pendingTimeouts.push(tId);
    });
  }

  // --- 3. Management UI Modal ---
  function openModal() {
    let modal = document.getElementById('scorearBotsModal');
    if (!modal) {
      modal = document.createElement('dialog');
      modal.id = 'scorearBotsModal';
      modal.style.cssText = 'border:none;background:transparent;padding:0;margin:auto;max-width:480px;width:92%;border-radius:24px;box-shadow:0 20px 60px rgba(0,0,0,0.85);color:#fff;direction:rtl;font-family:Cairo,Tajawal,sans-serif;';
      document.body.appendChild(modal);
      modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });
    }

    const room = getHostRoom();
    const currentBotsCount = (room && room.players) ? room.players.filter(p => p.isBot).length : 0;

    modal.innerHTML = `
      <div style="background:radial-gradient(circle at top right, rgba(142,100,239,0.3), rgba(15,16,33,0.98));border:1.5px solid #8e64ef;border-radius:24px;padding:26px 24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:26px;">🤖</span>
            <div>
              <h3 style="font-size:18px;font-weight:900;color:#fff;margin:0;">إدارة الطلاب التجريبيين (محاكاة)</h3>
              <span style="font-size:11px;color:#a89bff;">للمعلم فقط • محاكاة احتمالية ذكية داخل المتصفح</span>
            </div>
          </div>
          <button onclick="document.getElementById('scorearBotsModal').close()" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);color:#fff;border-radius:10px;padding:4px 10px;cursor:pointer;">✕</button>
        </div>

        <div style="display:flex;flex-direction:column;gap:16px;margin-bottom:20px;">
          <!-- Count Selector -->
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <label style="font-size:13px;font-weight:800;color:#ddd8ff;">عدد الطلاب المراد إضافتهم (1 - 30):</label>
              <b id="botCountDisplay" style="font-size:16px;color:#52d9ed;font-family:monospace;">5</b>
            </div>
            <input id="botCountInput" type="range" min="1" max="30" value="5" oninput="document.getElementById('botCountDisplay').textContent = this.value" style="width:100%;accent-color:#8e64ef;cursor:pointer;">
          </div>

          <!-- Accuracy Selector -->
          <div>
            <label style="display:block;font-size:13px;font-weight:800;color:#ddd8ff;margin-bottom:6px;">مستوى دقة الإجابة (الاحتمالية):</label>
            <select id="botAccuracySelect" style="width:100%;background:#131428;border:1.5px solid rgba(142,100,239,0.5);border-radius:12px;color:#fff;padding:10px 14px;font-size:13px;font-weight:800;outline:none;">
              <option value="medium" selected>متوسط (~60% إجابات صحيحة) - توازن طبيعي</option>
              <option value="high">عالٍ (~85% إجابات صحيحة) - منافسة متفوقة</option>
              <option value="low">منخفض (~30% إجابات صحيحة) - إجابات عادية</option>
              <option value="mixed">مختلط (تفاوت واقعي بين الطلاب)</option>
            </select>
          </div>

          <!-- Speed Selector -->
          <div>
            <label style="display:block;font-size:13px;font-weight:800;color:#ddd8ff;margin-bottom:6px;">سرعة استجابة الطلاب التجريبيين:</label>
            <select id="botSpeedSelect" style="width:100%;background:#131428;border:1.5px solid rgba(142,100,239,0.5);border-radius:12px;color:#fff;padding:10px 14px;font-size:13px;font-weight:800;outline:none;">
              <option value="medium" selected>متوسطة (بين 5 و 11 ثانية)</option>
              <option value="fast">سريعة وحماسية (بين 2 و 5 ثوانٍ)</option>
              <option value="slow">هادئة (بين 10 و 16 ثانية)</option>
              <option value="mixed">مختلطة (استجابات موزعة على الوقت)</option>
            </select>
          </div>

          <!-- Include in Report Toggle -->
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-size:12px;font-weight:800;color:#fcd34d;">ضمهم للإحصاءات والتقرير الرسمي:</div>
              <small style="font-size:10px;color:#857aa8;">الافتراضي مطفأ (لا يؤثرون على السجل)</small>
            </div>
            <input type="checkbox" id="botIncludeReportCheck" ${includeBotsInReport ? 'checked' : ''} onchange="ScoreARBots.setIncludeInReport(this.checked)" style="width:18px;height:18px;accent-color:#10b981;cursor:pointer;">
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;">
          <button type="button" onclick="ScoreARBots.submitAdd()" style="background:linear-gradient(135deg, #8e64ef, #6d28d9);border:none;border-radius:14px;color:#fff;padding:12px;font-size:14px;font-weight:900;cursor:pointer;box-shadow:0 4px 16px rgba(142,100,239,0.4);display:flex;align-items:center;justify-content:center;gap:8px;">
            <span>إضافة الأبطال التجريبيين الآن 🚀</span>
          </button>
          ${currentBotsCount > 0 ? `
            <button type="button" onclick="ScoreARBots.removeAllBots(); document.getElementById('scorearBotsModal').close();" style="background:rgba(239,68,68,0.18);border:1px solid rgba(239,68,68,0.4);border-radius:12px;color:#fca5a5;padding:10px;font-size:12px;font-weight:800;cursor:pointer;">
              حذف جميع الطلاب التجريبيين (${currentBotsCount}) 🗑️
            </button>
          ` : ''}
        </div>
      </div>
    `;
    modal.showModal();
  }

  function submitAdd() {
    const countInp = document.getElementById('botCountInput');
    const accSel = document.getElementById('botAccuracySelect');
    const spdSel = document.getElementById('botSpeedSelect');

    const count = countInp ? parseInt(countInp.value, 10) : 5;
    const accuracy = accSel ? accSel.value : 'medium';
    const speed = spdSel ? spdSel.value : 'medium';

    addBots(count, accuracy, speed);
    const modal = document.getElementById('scorearBotsModal');
    if (modal) modal.close();
  }

  function setIncludeInReport(val) {
    includeBotsInReport = Boolean(val);
  }

  const ScoreARBots = {
    addBots,
    removeBot,
    removeAllBots,
    openModal,
    submitAdd,
    onQuestionStart,
    clearPendingAnswers,
    setIncludeInReport,
    shouldIncludeInReport: () => includeBotsInReport
  };

  global.ScoreARBots = ScoreARBots;
  try { if (typeof globalThis !== 'undefined') globalThis.ScoreARBots = ScoreARBots; } catch(e){}
  if (typeof module !== 'undefined' && module.exports) module.exports = ScoreARBots;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
