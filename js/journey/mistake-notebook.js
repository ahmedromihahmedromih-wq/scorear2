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
      if (m && global.ScoreARJourney) {
        m.innerHTML = global.ScoreARJourney.renderJourneyPage();
        global.ScoreARJourney.bindJourneyEvents?.();
        global.ScoreARSkillMap?.mount?.();
        global.ScoreARJourneyExtras?.mount?.();
      }
    }
  }

  function renderNotebookHtml(now = Date.now()) {
    const state = loadState(now);
    const active = state.mistakes.filter(m => !m.archived && !m.mastered);
    const due = active.filter(m => isDueForReview(m, now));
    const mastered = state.mistakes.filter(m => m.mastered && !m.archived);
    const ui = global.ScoreARUI || { icon: () => '', iconBox: () => '' };
    const groups = {};
    active.forEach(m => {
      const s = m.skill || 'مهارات عامة';
      if (!groups[s]) groups[s] = [];
      groups[s].push(m);
    });

    return `
      <header style="padding:14px 22px;background:#0c0d1d;border-bottom:1px solid #ffffff14;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;">
          ${ui.iconBox('bookMarked', { size: 'md', tone: 'violet' })}
          <div>
            <h1 style="font-size:19px;font-weight:900;color:#f6f3ff;margin:0;">دفتر أخطائي: من المحاولة إلى الإتقان</h1>
            <p style="font-size:12px;color:#a1a4be;margin:2px 0 0 0;">مراجعات متباعدة ذكية بدون مؤقت لتثبيت الفهم واكتساب مكافأة الإتقان.</p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          ${active.length > 0 ? `<button onclick="ScoreARMistakeNotebook.trainWithAI()" class="btn launch-outline" style="padding:9px 16px;font-size:13px;border-color:#a855f7;color:#d8b4fe;">${ui.icon('spark', { size: 15 })} درّبني على أخطائي بالذكاء الاصطناعي ⚡</button>` : ''}
          ${due.length > 0 ? `<button onclick="ScoreARMistakeNotebook.startReviewSession()" class="btn launch-primary" style="padding:10px 20px;font-size:13px;">${ui.icon('play', { size: 15 })} راجع أخطائي الآن (${due.length})</button>` : `<button disabled class="btn launch-outline" style="padding:10px 18px;font-size:13px;opacity:0.6;cursor:not-allowed;">${ui.icon('clock', { size: 15 })} لا توجد أخطاء جاهزة للمراجعة</button>`}
          <button onclick="ScoreARMistakeNotebook.closeNotebook()" class="btn launch-outline" style="padding:8px 14px;font-size:13px;">${ui.icon('close', { size: 15 })} إغلاق</button>
        </div>
      </header>
      <main style="max-width:960px;width:100%;margin:0 auto;padding:24px 20px;flex:1;display:flex;flex-direction:column;gap:20px;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:14px;">
          <div class="scorear-spotlight-card" style="padding:18px;display:flex;align-items:center;gap:14px;">
            ${ui.iconBox('alert', { size: 'md', tone: 'danger' })}
            <div>
              <div style="font-size:12px;color:#a1a4be;">الأخطاء النشطة</div>
              <div style="font-size:26px;font-weight:900;color:#ffd3e5;">${active.length}</div>
              <div style="font-size:11px;color:#c9baff;">منها ${due.length} جاهزة للمراجعة الآن</div>
            </div>
          </div>
          <div class="scorear-spotlight-card" style="padding:18px;display:flex;align-items:center;gap:14px;">
            ${ui.iconBox('trophy', { size: 'md', tone: 'cyan' })}
            <div>
              <div style="font-size:12px;color:#a1a4be;">المفاهيم المتقنة</div>
              <div style="font-size:26px;font-weight:900;color:#7fe7ce;">${mastered.length}</div>
              <div style="font-size:11px;color:#85f3d8;">حصلت على +10 XP لكل منها</div>
            </div>
          </div>
        </div>
        ${active.length === 0 ? `
          <div class="scorear-spotlight-card" style="padding:46px 20px;text-align:center;">
            <div style="margin-bottom:14px;">${ui.iconBox('checkCircle', { size: 'lg', tone: 'cyan' })}</div>
            <h2 style="font-size:22px;font-weight:900;color:#f6f3ff;margin:0 0 8px 0;">دفترك ناصع وخالٍ من الأخطاء!</h2>
            <p style="color:#aaa9c1;font-size:14px;max-width:520px;margin:0 auto 20px auto;line-height:1.8;">
              لا توجد أخطاء نشطة تحتاج مراجعة حالياً. واصل التدريب الهادئ في المسارات وسيسجل الدفتر أي سؤال يحتاج ترسيخاً تلقائياً.
            </p>
            <button onclick="ScoreARMistakeNotebook.closeNotebook()" class="btn launch-primary" style="padding:12px 26px;font-size:14px;">
              ${ui.icon('route', { size: 16 })} استكشف مسارات التدريب الهادئ
            </button>
          </div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:18px;">
            ${Object.entries(groups).map(([skill, items]) => `
              <div class="scorear-spotlight-card" style="padding:20px;">
                <h3 style="font-size:16px;font-weight:900;color:#58dce3;margin:0 0 14px 0;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                  ${ui.icon('layers', { size: 17 })}<span>${skill}</span><span class="launch-pill" style="padding:2px 10px;font-size:11px;">${items.length} أخطاء</span>
                </h3>
                <div style="display:flex;flex-direction:column;gap:10px;">
                  ${items.map(m => {
                    const ready = isDueForReview(m, now);
                    const dateStr = new Date(m.lastMistakeAt).toLocaleDateString('ar-EG');
                    return `
                      <div style="background:#0c0d1d;border:1px solid ${ready ? '#9665ff66' : '#ffffff12'};border-radius:14px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                        <div style="max-width:620px;">
                          <div style="font-size:15px;font-weight:800;color:#f6f3ff;line-height:1.6;">${m.questionText}</div>
                          <div style="font-size:11px;color:#a1a4be;margin-top:4px;">آخر محاولة: ${dateStr} • أخطأت فيها ${m.attemptCount} مرات</div>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                          <span style="font-size:11px;padding:4px 10px;border-radius:999px;font-weight:800;background:${ready ? '#1d5c52' : '#272044'};color:${ready ? '#befff2' : '#c9baff'};border:1px solid ${ready ? '#44b8a5' : '#9665ff44'};">
                            ${ready ? 'جاهزة للمراجعة' : 'مؤجلة 24 ساعة'}
                          </span>
                          <span style="font-size:11px;padding:4px 10px;border-radius:999px;font-weight:800;background:#18172e;color:#d7ccea;border:1px solid #ffffff16;">
                            ${m.consecutiveCorrect === 1 ? 'خطوة 1 من 2' : 'خطوة 0 من 2'}
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
          <div class="scorear-spotlight-card" style="padding:20px;margin-top:10px;border-color:#44b8a544;">
            <h3 style="font-size:16px;font-weight:900;color:#7fe7ce;margin:0 0 14px 0;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              ${ui.icon('trophy', { size: 17 })}<span>الأرشيف المعرفي (المفاهيم المتقنة)</span><span style="font-size:11px;background:#1d5c52;color:#befff2;padding:3px 10px;border-radius:999px;">${mastered.length} أتقنتها</span>
            </h3>
            <div style="display:flex;flex-direction:column;gap:10px;">
              ${mastered.map(m => {
                const dueInDays = Math.max(0, Math.ceil(((m.nextReviewAt || 0) - now) / (24*3600*1000)));
                return `
                  <div style="background:#0c0d1d;border:1px solid #44b8a533;border-radius:14px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                    <div style="max-width:620px;">
                      <div style="font-size:14px;font-weight:700;color:#f6f3ff;">${m.questionText}</div>
                      <div style="font-size:11px;color:#a1a4be;margin-top:2px;">${m.skill} • أتقنته بإجابتين متتاليتين (+10 XP)</div>
                    </div>
                    <span style="font-size:11px;padding:4px 10px;border-radius:999px;font-weight:800;background:#1d5c52;color:#befff2;">
                      ${dueInDays > 0 ? `مستقر في الذاكرة (مراجعة بعد ${dueInDays} أيام)` : 'جاهز للمراجعة الدورية'}
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
    const ui = global.ScoreARUI || { icon: () => '', iconBox: () => '' };

    stage.innerHTML = `
      <header style="padding:14px 22px;background:#0c0d1d;border-bottom:1px solid #ffffff14;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <span class="launch-pill" style="padding:5px 12px;font-size:12px;"><span class="live-dot"></span> جلسة مراجعة الأخطاء</span>
          <span style="font-size:14px;color:#c9baff;">السؤال ${s.currentIndex + 1} من ${s.mistakesQueue.length}</span>
        </div>
        <button onclick="ScoreARMistakeNotebook.closeReviewSession()" class="btn launch-outline" style="padding:7px 14px;font-size:13px;">${ui.icon('close', { size: 15 })} خروج للمفكرة</button>
      </header>
      <main style="max-width:860px;width:100%;margin:0 auto;padding:24px 20px;flex:1;display:flex;flex-direction:column;gap:18px;">
        <div class="scorear-spotlight-card" style="padding:26px 22px;">
          <div style="display:inline-block;background:#272044;color:#58dce3;padding:4px 14px;border-radius:999px;font-size:12px;font-weight:800;margin-bottom:12px;">${curMistake.skill}</div>
          <h2 style="font-size:21px;line-height:1.65;font-weight:900;color:#f6f3ff;margin:0;">${curMistake.questionText}</h2>
        </div>
        <div id="reviewOptsGrid" style="display:grid;grid-template-columns:1fr;gap:12px;">
          ${shuffledOpts.map((opt, i) => `
            <button class="review-opt-btn" onclick="ScoreARMistakeNotebook.handleReviewOptionClick(${i}, ${newCorrectIdx})" style="display:flex;align-items:center;gap:14px;padding:16px 18px;min-height:54px;border-radius:16px;background:#18172e;border:1px solid #ffffff1a;color:#eceeff;font-size:15px;font-weight:800;cursor:pointer;text-align:right;">
              <span style="font-size:16px;width:32px;height:32px;border-radius:10px;background:#2b2543;color:#c9baff;display:grid;place-items:center;">${SHAPES[i % 4]}</span>
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
        b.style.background = '#1d5c52'; b.style.borderColor = '#44b8a5'; b.style.color = '#befff2';
      } else if (i === chosenIdx && !isCorrect) {
        b.style.background = '#6a364e'; b.style.borderColor = '#c38498'; b.style.color = '#ffd3e5'; b.style.opacity = '0.85';
      } else { b.style.opacity = '0.4'; }
    });

    const ui = global.ScoreARUI || { icon: () => '' };
    const fb = document.getElementById('reviewFeedbackArea');
    if (fb) {
      fb.style.display = 'block';
      fb.innerHTML = `
        <div class="scorear-spotlight-card" style="padding:20px;border-color:${isCorrect ? '#44b8a5' : '#9665ff55'};display:flex;flex-direction:column;gap:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
            <div style="font-size:15px;font-weight:900;color:${isCorrect ? '#7fe7ce' : '#ffd3e5'};display:flex;align-items:center;gap:8px;">
              ${ui.icon(isCorrect ? 'checkCircle' : 'alert', { size: 17 })}
              <span>${outcome.feedbackMsg}</span>
            </div>
            <button onclick="ScoreARMistakeNotebook.nextReviewQuestion()" class="btn launch-primary" style="padding:10px 22px;font-size:14px;">
              ${s.currentIndex + 1 < s.mistakesQueue.length ? 'السؤال التالي' : 'إتمام المراجعة'} ${ui.icon('arrow', { size: 15 })}
            </button>
          </div>
          <div style="background:#0c0d1d;border-radius:12px;padding:14px 18px;border-right:4px solid #8e64ef;">
            <div style="font-size:13px;font-weight:900;color:#c9baff;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
              ${ui.icon('info', { size: 14 })} لماذا هذه هي الإجابة الصحيحة؟
            </div>
            <div style="font-size:14px;color:#d7ccea;line-height:1.7;">${curMistake.why}</div>
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
    const ui = global.ScoreARUI || { icon: () => '', iconBox: () => '' };
    stage.innerHTML = `
      <main style="max-width:620px;width:100%;margin:auto;padding:30px 20px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px;">
        <div class="scorear-spotlight-card" style="padding:32px 24px;width:100%;">
          <div style="margin-bottom:14px;">${ui.iconBox('award', { size: 'lg', tone: 'cyan' })}</div>
          <h2 style="font-size:24px;font-weight:900;color:#f6f3ff;margin:0 0 8px 0;">أحسنت إتمام المراجعة!</h2>
          <p style="color:#aaa9c1;font-size:14px;margin:0 0 20px 0;line-height:1.8;">كل خطأ راجعته هو خطوة حقيقية نحو ترسيخ القواعد وتجنب تكرارها.</p>
          <button onclick="ScoreARMistakeNotebook.openNotebook()" class="btn launch-primary" style="padding:12px 26px;font-size:14px;">
            ${ui.icon('bookMarked', { size: 16 })} العودة لدفتر أخطائي
          </button>
        </div>
      </main>
    `;
  }

  function trainWithAI() {
    const state = loadState();
    const active = state.mistakes.filter(m => !m.archived && !m.mastered);
    if (!active.length) { if (global.toast) global.toast('لا توجد أخطاء نشطة حالياً للتدريب عليها.'); return; }
    const remedialText = active.slice(0, 5).map((m, idx) =>
      `[مسألة ${idx + 1} - مهارة: ${m.skill || 'عام'}]\nالسؤال: ${m.questionText}\nخطأ الطالب: ${m.chosenOption || 'لم يجب'}\nالإجابة الصحيحة: ${m.opts ? m.opts[m.answer] : ''}`
    ).join('\n\n');
    closeNotebook();
    if (global.ScoreARQuizAI?.openAiStudio) {
      global.ScoreARQuizAI.openAiStudio({
        mode: 'remedial', initialTitle: 'اختبار علاجي مخصص لمعالجة الأخطاء ⚡',
        initialText: `صغ اختباراً علاجياً تفاعلياً جديداً لتقوية الفهم في المسائل والمفاهيم التالية وفق أخطاء الطالب الفعلية:\n\n${remedialText}`
      });
      if (global.toast) global.toast('تم فتح أستوديو الذكاء الاصطناعي لاختبارك العلاجي 🌟');
    }
  }

  if (typeof window !== 'undefined') loadState();

  global.ScoreARMistakeNotebook = {
    loadState, saveState, migrateV1ToV2, recordMistake, getActiveMistakes, getMasteredMistakes,
    isDueForReview, openNotebook, closeNotebook, startReviewSession, closeReviewSession,
    handleReviewOptionClick, nextReviewQuestion, renderNotebookHtml, shuffleOptions, trainWithAI
  };

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
