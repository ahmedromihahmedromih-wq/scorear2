/**
 * ScoreAR Mistake Notebook UI & Storage (mistake-notebook.js)
 * Item 4: Active Mistakes, Spaced Repetition, Shuffled Reviews, Mastery & +10 XP
 * Delegated Scheduling & Logic: ScoreARMistakeScheduler (mistake-scheduler.js)
 * Local-First, Zero Cloud Sync, Strictly Rule 7 Compliant (<500 lines)
 */
(function(global) {
  'use strict';

  const SCHEMA_VERSION = 'scorear_v2';
  const GUEST_STORAGE_KEY = 'scorear_student_guest_v1';
  let activeReviewSession = null;

  function getScheduler() {
    return global.ScoreARMistakeScheduler || {
      isDueForReview: (m, now = Date.now()) => !m.archived && now >= (Number(m.nextReviewAt) || 0),
      shuffleOptions: (opts, correctIdx) => {
        const wrapped = opts.map((opt, i) => ({ text: opt, isCorrect: i === correctIdx }));
        for (let i = wrapped.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [wrapped[i], wrapped[j]] = [wrapped[j], wrapped[i]];
        }
        return { shuffledOpts: wrapped.map(w => w.text), newCorrectIdx: wrapped.findIndex(w => w.isCorrect) };
      },
      applyReviewOutcome: (target, isCorrect, opts = {}) => ({ updatedMistake: target, xpGain: 0, feedbackMsg: '' })
    };
  }

  function getTodayKey(now = Date.now()) { return new Date(now).toISOString().slice(0, 10); }

  function getCleanDefaultState(now = Date.now()) {
    const today = getTodayKey(now);
    return {
      xp: 0, solvedQuestionIds: {}, dailyQuietXp: { date: today, earned: 0 },
      completedPaths: {}, mistakes: [], streak: { count: 1, lastActiveDate: today, history: [today] },
      quietSessionsCount: 0, contestSessionsCount: 0, lastUpdated: now
    };
  }

  function findQuestionInCurriculum(qId) {
    if (!qId || !global.ScoreARJourney || !global.ScoreARJourney.PRACTICE_TRACKS) return null;
    for (const t of global.ScoreARJourney.PRACTICE_TRACKS) {
      const found = t.questions.find(q => q.id === qId);
      if (found) return { ...found, pathId: t.id };
    }
    return null;
  }

  function migrateV1ToV2(parsed, now = Date.now()) {
    if (!parsed || !parsed.data) return getCleanDefaultState(now);
    const old = parsed.data;
    const def = getCleanDefaultState(now);
    const migratedMistakes = (Array.isArray(old.mistakes) ? old.mistakes : []).map(m => {
      const qLookup = findQuestionInCurriculum(m.questionId);
      const isMissing = !qLookup;
      const opts = qLookup ? qLookup.opts : (Array.isArray(m.opts) ? m.opts : [m.correctOption || 'صواب', m.chosenOption || 'خطأ']);
      const ans = qLookup ? qLookup.answer : (typeof m.answer === 'number' ? m.answer : 0);
      return {
        questionId: m.questionId || ('q_mig_' + Math.random().toString(36).substring(2, 6)),
        questionText: (qLookup ? qLookup.q : m.questionText) || 'سؤال تعليمي',
        skill: (qLookup ? qLookup.skill : m.skill) || 'لغة عربية',
        pathId: (qLookup ? qLookup.pathId : m.pathId) || 'general',
        opts: opts, answer: ans,
        why: (qLookup ? qLookup.why : m.explanation) || 'تعلّم القاعدة من الشرح',
        attemptCount: Number(m.attemptCount) || 1, lastMistakeAt: Number(m.timestamp) || now,
        consecutiveCorrect: 0, lastReviewedAt: null, nextReviewAt: 0,
        mastered: Boolean(m.resolved), masteredAt: m.resolved ? (m.timestamp || now) : null,
        masteryXpAwarded: Boolean(m.resolved), archived: isMissing, archiveReason: isMissing ? 'question_updated' : null
      };
    });

    const oldEarned = old.dailyQuietXp?.earned;
    const safeOldEarned = (typeof oldEarned === 'number' && !isNaN(oldEarned)) ? Math.max(0, oldEarned) : 0;
    return {
      xp: Math.max(0, Number(old.xp) || 0),
      solvedQuestionIds: old.solvedQuestionIds || {},
      dailyQuietXp: { date: old.dailyQuietXp?.date || getTodayKey(now), earned: safeOldEarned },
      completedPaths: old.completedPaths || {},
      mistakes: migratedMistakes, streak: old.streak || def.streak,
      quietSessionsCount: Number(old.quietSessionsCount) || 0,
      contestSessionsCount: 0, lastUpdated: now
    };
  }

  function sanitizeV2(rawObj, now = Date.now()) {
    const def = getCleanDefaultState(now);
    if (!rawObj || typeof rawObj !== 'object') return def;
    const today = getTodayKey(now);
    const rawEarned = rawObj.dailyQuietXp?.earned;
    const safeEarned = (typeof rawEarned === 'number' && !isNaN(rawEarned)) ? Math.max(0, rawEarned) : 0;
    const daily = rawObj.dailyQuietXp && rawObj.dailyQuietXp.date === today ? { date: today, earned: safeEarned } : { date: today, earned: 0 };
    return {
      xp: Math.max(0, Number(rawObj.xp) || 0),
      solvedQuestionIds: (rawObj.solvedQuestionIds && typeof rawObj.solvedQuestionIds === 'object') ? rawObj.solvedQuestionIds : {},
      dailyQuietXp: daily,
      completedPaths: (rawObj.completedPaths && typeof rawObj.completedPaths === 'object') ? rawObj.completedPaths : {},
      mistakes: Array.isArray(rawObj.mistakes) ? rawObj.mistakes : [],
      streak: (rawObj.streak && typeof rawObj.streak === 'object') ? rawObj.streak : def.streak,
      quietSessionsCount: Number(rawObj.quietSessionsCount) || 0,
      contestSessionsCount: 0, lastUpdated: Number(rawObj.lastUpdated) || now
    };
  }

  function loadState(now = Date.now()) {
    try {
      const raw = localStorage.getItem(GUEST_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.schemaVersion === 'scorear_v1') {
          const migrated = migrateV1ToV2(parsed, now);
          saveState(migrated, now);
          return migrated;
        }
        if (parsed.schemaVersion === SCHEMA_VERSION && parsed.data) {
          return sanitizeV2(parsed.data, now);
        }
      }
    } catch (e) { console.warn('[ScoreARMistakeNotebook] Corrupted localStorage reset:', e); }
    const def = getCleanDefaultState(now);
    saveState(def, now);
    return def;
  }

  function saveState(updatedData, now = Date.now()) {
    const sanitized = sanitizeV2(updatedData, now);
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, data: sanitized }));
    } catch (e) { console.error('[ScoreARMistakeNotebook] Storage write failed:', e); }
    if (global.ScoreARJourney && global.ScoreARJourney.loadProgress) global.ScoreARJourney.loadProgress();
    return sanitized;
  }

  function isDueForReview(m, now = Date.now()) {
    return getScheduler().isDueForReview(m, now);
  }

  function getActiveMistakes(now = Date.now()) {
    const state = loadState(now);
    return state.mistakes.filter(m => !m.archived && isDueForReview(m, now));
  }

  function getMasteredMistakes(now = Date.now()) {
    const state = loadState(now);
    return state.mistakes.filter(m => m.mastered && !m.archived);
  }

  function recordMistake(qData, chosenText, now = Date.now()) {
    const state = loadState(now);
    const mistakes = [...state.mistakes];
    const existing = mistakes.find(m => m.questionId === qData.id);
    if (existing) {
      existing.attemptCount = (existing.attemptCount || 1) + 1;
      existing.lastMistakeAt = now;
      existing.consecutiveCorrect = 0;
      existing.nextReviewAt = 0;
      existing.chosenOption = chosenText || existing.chosenOption;
      existing.mastered = false;
      existing.archived = false;
    } else {
      mistakes.push({
        questionId: qData.id, questionText: qData.q, skill: qData.skill || 'لغة عربية',
        pathId: qData.pathId || 'general', opts: qData.opts, answer: qData.answer, why: qData.why,
        attemptCount: 1, lastMistakeAt: now, consecutiveCorrect: 0,
        lastReviewedAt: null, nextReviewAt: 0, mastered: false, masteredAt: null,
        masteryXpAwarded: false, archived: false, archiveReason: null
      });
    }
    state.mistakes = mistakes;
    saveState(state, now);
  }

  function shuffleOptions(opts, correctIdx) {
    return getScheduler().shuffleOptions(opts, correctIdx);
  }

  function getOrCreateNotebookStage() {
    let el = document.getElementById('scorearNotebookStage');
    if (!el) {
      el = document.createElement('div');
      el.id = 'scorearNotebookStage';
      el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:radial-gradient(circle at 50% 15%, #181938 0%, #090a16 100%);color:#fff;font-family:Cairo,Tajawal,sans-serif;direction:rtl;display:flex;flex-direction:column;overflow-y:auto;';
      document.body.appendChild(el);
    }
    el.style.display = 'flex';
    return el;
  }

  function openNotebook(now = Date.now()) {
    getOrCreateNotebookStage().innerHTML = renderNotebookHtml(now);
  }

  function closeNotebook() {
    const el = document.getElementById('scorearNotebookStage');
    if (el) el.style.display = 'none';
    if (typeof window !== 'undefined' && window.location && window.location.hash === '#journey') {
      const m = document.getElementById('main');
      if (m && global.ScoreARJourney) m.innerHTML = global.ScoreARJourney.renderJourneyPage();
    }
  }

  function renderNotebookHtml(now = Date.now()) {
    const state = loadState(now);
    const active = state.mistakes.filter(m => !m.archived && !m.mastered);
    const due = active.filter(m => isDueForReview(m, now));
    const mastered = state.mistakes.filter(m => m.mastered && !m.archived);
    const groups = {};
    active.forEach(m => {
      const s = m.skill || 'مهارات عامة';
      if (!groups[s]) groups[s] = [];
      groups[s].push(m);
    });

    return `
      <header style="padding:14px 22px;background:rgba(15,16,33,0.94);border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="font-size:24px;">📖</span>
          <div>
            <h1 style="font-size:19px;font-weight:900;color:#ffffff;margin:0;">دفتر أخطائي: من المحاولة إلى الإتقان</h1>
            <p style="font-size:12px;color:#c9baff;margin:2px 0 0 0;">مراجعات متباعدة ذكية بدون مؤقت لتثبيت الفهم واكتساب مكافأة الإتقان.</p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          ${due.length > 0 ? `
            <button onclick="ScoreARMistakeNotebook.startReviewSession()" style="background:#10b981;color:#090a16;border:none;border-radius:12px;padding:10px 22px;font-size:14px;font-weight:900;cursor:pointer;">
              راجع أخطائي الآن (${due.length}) 🌿
            </button>
          ` : `
            <button disabled style="background:#272044;color:#8e8ca8;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:10px 20px;font-size:13px;font-weight:800;cursor:not-allowed;">
              لا توجد أخطاء جاهزة للمراجعة ⏳
            </button>
          `}
          <button onclick="ScoreARMistakeNotebook.closeNotebook()" style="background:transparent;border:1px solid rgba(255,255,255,0.2);color:#ddd;padding:8px 16px;border-radius:10px;cursor:pointer;font-weight:700;">✕ إغلاق</button>
        </div>
      </header>
      <main style="max-width:960px;width:100%;margin:0 auto;padding:24px 20px;flex:1;display:flex;flex-direction:column;gap:20px;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:14px;">
          <div style="background:rgba(21,23,49,0.85);border:2px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px;text-align:right;">
            <div style="font-size:12px;color:#a89bff;">الأخطاء النشطة</div>
            <div style="font-size:28px;font-weight:900;color:#f87171;margin:2px 0;">${active.length}</div>
            <div style="font-size:11px;color:#c9baff;">منها ${due.length} جاهزة للمراجعة الآن</div>
          </div>
          <div style="background:rgba(21,23,49,0.85);border:2px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px;text-align:right;">
            <div style="font-size:12px;color:#a89bff;">المفاهيم المتقنة 🏆</div>
            <div style="font-size:28px;font-weight:900;color:#34d399;margin:2px 0;">${mastered.length}</div>
            <div style="font-size:11px;color:#7ee787;">حصلت على +10 XP لكل منها</div>
          </div>
        </div>
        ${active.length === 0 ? `
          <div style="background:rgba(21,23,49,0.8);border:2px dashed #10b981;border-radius:24px;padding:46px 20px;text-align:center;">
            <div style="font-size:50px;margin-bottom:12px;">🌟</div>
            <h2 style="font-size:22px;font-weight:900;color:#ffffff;margin:0 0 8px 0;">دفترك ناصع وخالٍ من الأخطاء!</h2>
            <p style="color:#c9baff;font-size:14px;max-width:520px;margin:0 auto 20px auto;line-height:1.7;">
              لا توجد أخطاء نشطة تحتاج مراجعة حالياً. واصل التدريب الهادئ في المسارات وسيسجل الدفتر أي سؤال يحتاج ترسيخاً تلقائياً.
            </p>
            <button onclick="ScoreARMistakeNotebook.closeNotebook()" style="background:#10b981;color:#090a16;border:none;border-radius:14px;padding:12px 28px;font-size:15px;font-weight:900;cursor:pointer;">
              استكشف مسارات التدريب الهادئ 🌿
            </button>
          </div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:18px;">
            ${Object.entries(groups).map(([skill, items]) => `
              <div style="background:rgba(21,23,49,0.7);border:1.5px solid rgba(255,255,255,0.08);border-radius:20px;padding:20px;">
                <h3 style="font-size:16px;font-weight:900;color:#52d9ed;margin:0 0 14px 0;display:flex;align-items:center;gap:8px;">
                  <span>📌</span><span>${skill}</span><span style="font-size:11px;background:#272044;color:#ddd;padding:2px 10px;border-radius:8px;">${items.length} أخطاء</span>
                </h3>
                <div style="display:flex;flex-direction:column;gap:10px;">
                  ${items.map(m => {
                    const ready = isDueForReview(m, now);
                    const dateStr = new Date(m.lastMistakeAt).toLocaleDateString('ar-EG');
                    return `
                      <div style="background:#13152c;border:1px solid ${ready ? '#7550ef' : 'rgba(255,255,255,0.06)'};border-radius:14px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                        <div style="max-width:620px;">
                          <div style="font-size:15px;font-weight:800;color:#ffffff;line-height:1.6;">${m.questionText}</div>
                          <div style="font-size:11px;color:#a89bff;margin-top:4px;">آخر محاولة: ${dateStr} • أخطأت فيها ${m.attemptCount} مرات</div>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                          <span style="font-size:11px;padding:4px 8px;border-radius:8px;font-weight:800;background:${ready ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'};color:${ready ? '#34d399' : '#fcd34d'};">
                            ${ready ? 'جاهزة للمراجعة 🔔' : 'مؤجلة 24 ساعة ⏳'}
                          </span>
                          <span style="font-size:11px;padding:4px 8px;border-radius:8px;font-weight:800;background:#272044;color:#c9baff;">
                            ${m.consecutiveCorrect === 1 ? 'خطوة 1 من 2 ⭐️' : 'خطوة 0 من 2'}
                          </span>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        `}
        ${mastered.length > 0 ? `
          <div style="background:rgba(21,23,49,0.7);border:1.5px solid rgba(16,185,129,0.25);border-radius:20px;padding:20px;margin-top:10px;">
            <h3 style="font-size:16px;font-weight:900;color:#34d399;margin:0 0 14px 0;display:flex;align-items:center;gap:8px;">
              <span>🏆</span><span>الأرشيف المعرفي (المفاهيم المتقنة)</span><span style="font-size:11px;background:#272044;color:#7ee787;padding:2px 10px;border-radius:8px;">${mastered.length} أتقنتها</span>
            </h3>
            <div style="display:flex;flex-direction:column;gap:10px;">
              ${mastered.map(m => {
                const dueInDays = Math.max(0, Math.ceil(((m.nextReviewAt || 0) - now) / (24*3600*1000)));
                return `
                  <div style="background:#13152c;border:1px solid rgba(16,185,129,0.2);border-radius:14px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                    <div style="max-width:620px;">
                      <div style="font-size:14px;font-weight:700;color:#e2e0f0;">${m.questionText}</div>
                      <div style="font-size:11px;color:#a89bff;margin-top:2px;">${m.skill} • أتقنته بإجابتين متتاليتين (+10 XP)</div>
                    </div>
                    <span style="font-size:11px;padding:4px 8px;border-radius:8px;font-weight:800;background:rgba(16,185,129,0.15);color:#34d399;">
                      ${dueInDays > 0 ? `مستقر في الذاكرة (مراجعة بعد ${dueInDays} أيام)` : 'جاهز للمراجعة الدورية 🌿'}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </main>
    `;
  }

  function startReviewSession(now = Date.now()) {
    const due = getActiveMistakes(now);
    if (due.length === 0) return;
    activeReviewSession = { mistakesQueue: due, currentIndex: 0, hasAnswered: false, currentShuffled: null, sessionTime: now };
    renderReviewQuestionStage();
  }

  function closeReviewSession() {
    activeReviewSession = null;
    openNotebook();
  }

  function renderReviewQuestionStage() {
    const s = activeReviewSession;
    if (!s) return;
    const stage = getOrCreateNotebookStage();
    const curMistake = s.mistakesQueue[s.currentIndex];
    if (!curMistake) { renderReviewCompletion(stage); return; }

    const qLookup = findQuestionInCurriculum(curMistake.questionId);
    if (!qLookup || (!curMistake.opts || curMistake.opts.length < 2)) {
      curMistake.archived = true;
      curMistake.archiveReason = 'question_updated';
      const curState = loadState(s.sessionTime);
      const targetM = curState.mistakes.find(m => m.questionId === curMistake.questionId);
      if (targetM) { targetM.archived = true; targetM.archiveReason = 'question_updated'; }
      saveState(curState, s.sessionTime);
      s.currentIndex++;
      renderReviewQuestionStage();
      return;
    }

    if (!s.currentShuffled) s.currentShuffled = shuffleOptions(curMistake.opts, curMistake.answer);
    const { shuffledOpts, newCorrectIdx } = s.currentShuffled;
    const SHAPES = ['▲', '◆', '●', '■'];

    stage.innerHTML = `
      <header style="padding:14px 22px;background:rgba(15,16,33,0.92);border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="background:rgba(16,185,129,0.2);color:#34d399;border:1px solid #10b981;border-radius:12px;padding:6px 14px;font-size:13px;font-weight:900;">🌿 جلسة مراجعة الأخطاء</span>
          <span style="font-size:14px;color:#c9baff;">السؤال ${s.currentIndex + 1} من ${s.mistakesQueue.length}</span>
        </div>
        <button onclick="ScoreARMistakeNotebook.closeReviewSession()" style="background:transparent;border:1px solid rgba(255,255,255,0.2);color:#ddd;padding:6px 14px;border-radius:10px;cursor:pointer;font-weight:700;">✕ خروج للمفكرة</button>
      </header>
      <main style="max-width:860px;width:100%;margin:0 auto;padding:24px 20px;flex:1;display:flex;flex-direction:column;gap:18px;">
        <div style="background:rgba(21,23,49,0.85);border:2px solid rgba(255,255,255,0.1);border-radius:22px;padding:26px 22px;">
          <div style="display:inline-block;background:#272044;color:#52d9ed;padding:4px 14px;border-radius:10px;font-size:12px;font-weight:800;margin-bottom:12px;">${curMistake.skill}</div>
          <h2 style="font-size:22px;line-height:1.6;font-weight:900;color:#ffffff;margin:0;">${curMistake.questionText}</h2>
        </div>
        <div id="reviewOptsGrid" style="display:grid;grid-template-columns:1fr;gap:12px;">
          ${shuffledOpts.map((opt, i) => `
            <button class="review-opt-btn" onclick="ScoreARMistakeNotebook.handleReviewOptionClick(${i}, ${newCorrectIdx})" style="display:flex;align-items:center;gap:14px;padding:18px 20px;min-height:56px;border-radius:16px;background:rgba(21,23,49,0.9);border:2px solid rgba(255,255,255,0.12);color:#ffffff;font-size:16px;font-weight:800;cursor:pointer;text-align:right;">
              <span style="font-size:18px;width:34px;height:34px;border-radius:10px;background:rgba(0,0,0,0.35);display:grid;place-items:center;">${SHAPES[i % 4]}</span>
              <span style="flex:1;">${opt}</span>
            </button>
          `).join('')}
        </div>
        <div id="reviewFeedbackArea" style="display:none;margin-top:4px;"></div>
      </main>
    `;
  }

  function handleReviewOptionClick(chosenIdx, correctIdx, callTime) {
    const s = activeReviewSession;
    if (!s || s.hasAnswered) return;
    s.hasAnswered = true;

    const now = callTime || s.sessionTime || Date.now();
    const curMistake = s.mistakesQueue[s.currentIndex];
    const isCorrect = (chosenIdx === correctIdx);
    const state = loadState(now);
    if (global.ScoreARStreak) global.ScoreARStreak.recordQuestionAnswered(curMistake.questionId, now);
    const targetIdx = state.mistakes.findIndex(m => m.questionId === curMistake.questionId);
    if (targetIdx === -1) return;

    const rawEarned = state.dailyQuietXp?.earned;
    const dailyEarned = (typeof rawEarned === 'number' && !isNaN(rawEarned)) ? rawEarned : 0;

    const outcome = getScheduler().applyReviewOutcome(state.mistakes[targetIdx], isCorrect, { now, dailyEarned });
    state.mistakes[targetIdx] = outcome.updatedMistake;

    if (outcome.xpGain > 0) {
      state.xp = Math.max(0, Number(state.xp) || 0) + outcome.xpGain;
      state.dailyQuietXp = { date: getTodayKey(now), earned: Math.max(0, dailyEarned) + outcome.xpGain };
    }

    saveState(state, now);

    document.querySelectorAll('.review-opt-btn').forEach((b, i) => {
      b.style.pointerEvents = 'none';
      if (i === correctIdx) {
        b.style.background = '#10b981'; b.style.borderColor = '#34d399';
      } else if (i === chosenIdx && !isCorrect) {
        b.style.background = '#ef4444'; b.style.borderColor = '#f87171'; b.style.opacity = '0.7';
      } else { b.style.opacity = '0.35'; }
    });

    const fb = document.getElementById('reviewFeedbackArea');
    if (fb) {
      fb.style.display = 'block';
      fb.innerHTML = `
        <div style="background:rgba(21,23,49,0.95);border:2px solid ${isCorrect ? '#10b981' : '#f59e0b'};border-radius:20px;padding:22px;display:flex;flex-direction:column;gap:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
            <div style="font-size:16px;font-weight:900;color:${isCorrect ? '#34d399' : '#fcd34d'};">${outcome.feedbackMsg}</div>
            <button onclick="ScoreARMistakeNotebook.nextReviewQuestion()" style="background:linear-gradient(135deg, #8e64ef, #6a34e8);color:#fff;border:none;border-radius:12px;padding:10px 24px;font-size:15px;font-weight:900;cursor:pointer;">
              ${s.currentIndex + 1 < s.mistakesQueue.length ? 'السؤال التالي ⬅' : 'إتمام المراجعة ✨'}
            </button>
          </div>
          <div style="background:#13152a;border-radius:12px;padding:14px 18px;border-right:4px solid #7550ef;">
            <div style="font-size:13px;font-weight:900;color:#c9baff;margin-bottom:4px;">🔍 لماذا هذه هي الإجابة الصحيحة؟</div>
            <div style="font-size:14px;color:#e2e0f0;line-height:1.7;">${curMistake.why}</div>
          </div>
        </div>
      `;
    }
  }

  function nextReviewQuestion() {
    const s = activeReviewSession;
    if (!s) return;
    s.currentIndex++;
    s.hasAnswered = false;
    s.currentShuffled = null;
    renderReviewQuestionStage();
  }

  function renderReviewCompletion(stage) {
    if (typeof window !== 'undefined' && window.confetti) window.confetti({ particleCount: 50, spread: 60 });
    stage.innerHTML = `
      <main style="max-width:620px;width:100%;margin:auto;padding:30px 20px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:18px;">
        <div style="font-size:54px;">🌿</div>
        <h2 style="font-size:26px;font-weight:900;color:#ffffff;margin:0;">أحسنت إتمام المراجعة!</h2>
        <p style="color:#c9baff;font-size:15px;margin:0;">كل خطأ راجعته هو خطوة حقيقية نحو ترسيخ القواعد وتجنب تكرارها.</p>
        <button onclick="ScoreARMistakeNotebook.openNotebook()" style="background:#10b981;color:#090a16;border:none;padding:12px 28px;border-radius:14px;font-size:15px;font-weight:900;cursor:pointer;margin-top:10px;">
          العودة لدفتر أخطائي 📖
        </button>
      </main>
    `;
  }

  if (typeof window !== 'undefined') loadState();

  global.ScoreARMistakeNotebook = {
    loadState, saveState, migrateV1ToV2, recordMistake, getActiveMistakes, getMasteredMistakes,
    isDueForReview, openNotebook, closeNotebook, startReviewSession, closeReviewSession,
    handleReviewOptionClick, nextReviewQuestion, renderNotebookHtml, shuffleOptions
  };

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
