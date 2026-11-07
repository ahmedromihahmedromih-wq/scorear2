/**
 * ScoreAR Daily Streak Engine (streak.js)
 * Item 3: Daily Streak Built on Real Educational Activity
 * Rules:
 *   1. Active day: >= 5 questions answered (practice or review) OR completing a path.
 *   2. Compassion: 1 grace day per week (auto-renewed). When broken: warm welcome with no blame.
 *   3. UI: 7-day current week dots, streak count, best streak, rotating warm messages, no intrusive popups.
 *   4. Zero XP: Moral and motivational gamification only.
 *   5. Clock safety: Local dates; ignores backward clock jumps.
 *   6. Pure logic taking clock parameter (now = Date.now()) for full testability.
 * Strictly Rule 7 Compliant (<500 lines).
 */
(function(global) {
  'use strict';

  const GUEST_STORAGE_KEY = 'scorear_student_guest_v1';
  const MIN_DAILY_QUESTIONS = 5;

  const WARM_MESSAGES = [
    'همتك تزداد رسوخاً؛ خطوة اليوم تضيء مسارك التعليمي! 🌿',
    'العلم يُبنى بالمواظبة الهادئة؛ استمر في رحلتك الرائعة! 📖',
    'كل مسألة تفهمها هي لبنة ثابتة في تفوقك المعرفي! ⭐️',
    'بوركت جهودك المتواصلة؛ شغفك باللغة العربية فخر لنا! 🌸'
  ];

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function getLocalDateKey(now = Date.now()) {
    const d = new Date(now);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function getWeekStartKey(now = Date.now()) {
    const d = new Date(now);
    const day = d.getDay(); // 0 is Sunday, 6 is Saturday
    // In Arab world, week starts on Saturday (day 6): distance = (day + 1) % 7
    const diff = d.getDate() - ((day + 1) % 7);
    const start = new Date(d.setDate(diff));
    return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
  }

  function getCleanStreakState(now = Date.now()) {
    const today = getLocalDateKey(now);
    return {
      count: 0,
      bestStreak: 0,
      lastActiveDate: null,
      lastActivityTimestamp: 0,
      graceUsedThisWeek: false,
      weekStartKey: getWeekStartKey(now),
      dailyQuestionsCount: 0,
      dailyQuestionIds: {},
      dailyPathsCompleted: 0,
      history: {},
      brokenRecently: false
    };
  }

  function sanitizeStreak(raw, now = Date.now()) {
    const def = getCleanStreakState(now);
    if (!raw || typeof raw !== 'object') return def;
    const historyObj = {};
    if (Array.isArray(raw.history)) {
      raw.history.forEach(d => { if (typeof d === 'string') historyObj[d] = true; });
    } else if (raw.history && typeof raw.history === 'object') {
      Object.assign(historyObj, raw.history);
    }
    const questionIdsObj = {};
    if (raw.dailyQuestionIds && typeof raw.dailyQuestionIds === 'object') {
      Object.assign(questionIdsObj, raw.dailyQuestionIds);
    }
    const countFromIds = Object.keys(questionIdsObj).length;
    return {
      count: Math.max(0, Number(raw.count) || 0),
      bestStreak: Math.max(0, Number(raw.bestStreak) || Number(raw.count) || 0),
      lastActiveDate: typeof raw.lastActiveDate === 'string' ? raw.lastActiveDate : null,
      lastActivityTimestamp: Number(raw.lastActivityTimestamp) || 0,
      graceUsedThisWeek: Boolean(raw.graceUsedThisWeek),
      weekStartKey: typeof raw.weekStartKey === 'string' ? raw.weekStartKey : getWeekStartKey(now),
      dailyQuestionIds: questionIdsObj,
      dailyQuestionsCount: countFromIds > 0 ? countFromIds : Math.max(0, Number(raw.dailyQuestionsCount) || 0),
      dailyPathsCompleted: Math.max(0, Number(raw.dailyPathsCompleted) || 0),
      history: historyObj,
      brokenRecently: Boolean(raw.brokenRecently)
    };
  }

  function getDaysDifference(dateStr1, dateStr2) {
    if (!dateStr1 || !dateStr2) return Infinity;
    const [y1, m1, d1] = dateStr1.split('-').map(Number);
    const [y2, m2, d2] = dateStr2.split('-').map(Number);
    const utc1 = Date.UTC(y1, m1 - 1, d1);
    const utc2 = Date.UTC(y2, m2 - 1, d2);
    return Math.round((utc2 - utc1) / (24 * 60 * 60 * 1000));
  }

  function calculateStreakProgress(currentStreak, activityType, targetOrCount = 1, now = Date.now()) {
    const s = sanitizeStreak(currentStreak, now);
    const today = getLocalDateKey(now);

    // Safeguard 1: Ignore backward clock jumps
    if (s.lastActivityTimestamp && now < s.lastActivityTimestamp) {
      console.warn('[ScoreARStreak] Clock jumped backwards; ignoring update.');
      return s;
    }
    if (s.lastActiveDate && getDaysDifference(s.lastActiveDate, today) < 0) {
      console.warn('[ScoreARStreak] Current date earlier than last active date; ignoring update.');
      return s;
    }

    // Weekly reset for grace credit
    const curWeek = getWeekStartKey(now);
    if (s.weekStartKey !== curWeek) {
      s.weekStartKey = curWeek;
      s.graceUsedThisWeek = false;
    }

    // Check if new calendar day: reset daily counters
    const lastActionDate = s.lastActivityTimestamp ? getLocalDateKey(s.lastActivityTimestamp) : null;
    if (lastActionDate && lastActionDate !== today) {
      s.dailyQuestionsCount = 0;
      s.dailyQuestionIds = {};
      s.dailyPathsCompleted = 0;
    }

    // Record activity
    s.lastActivityTimestamp = now;
    if (activityType === 'question') {
      if (typeof targetOrCount === 'string' && targetOrCount.trim()) {
        const qId = targetOrCount.trim();
        s.dailyQuestionIds[qId] = true;
        s.dailyQuestionsCount = Object.keys(s.dailyQuestionIds).length;
      } else if (typeof targetOrCount === 'number') {
        const addCount = Math.max(0, Math.floor(targetOrCount));
        for (let i = 0; i < addCount; i++) {
          const autoKey = `_q_${now}_${s.dailyQuestionsCount + i + 1}`;
          s.dailyQuestionIds[autoKey] = true;
        }
        s.dailyQuestionsCount = Object.keys(s.dailyQuestionIds).length;
      }
    } else if (activityType === 'path') {
      const pCount = (typeof targetOrCount === 'number') ? targetOrCount : 1;
      s.dailyPathsCompleted += pCount;
    }

    // Check if today meets active day criteria
    const isActiveToday = (s.dailyQuestionsCount >= MIN_DAILY_QUESTIONS) || (s.dailyPathsCompleted >= 1);

    if (isActiveToday) {
      // If already recorded today, keep streak stable
      if (s.lastActiveDate === today) {
        s.history[today] = true;
        return s;
      }

      // First time hitting active status today:
      s.history[today] = true;
      if (!s.lastActiveDate) {
        // First active day ever
        s.count = 1;
        s.brokenRecently = false;
      } else {
        const gap = getDaysDifference(s.lastActiveDate, today);
        if (gap === 1) {
          // Exactly consecutive day
          s.count += 1;
          s.brokenRecently = false;
        } else if (gap === 2) {
          // Missed exactly 1 day: check grace credit
          if (!s.graceUsedThisWeek) {
            s.graceUsedThisWeek = true;
            s.count += 1; // Grace protected the streak!
            s.brokenRecently = false;
          } else {
            // Grace already spent this week: streak resets to 1
            s.count = 1;
            s.brokenRecently = true;
          }
        } else if (gap > 2) {
          // Missed 2 or more days: streak breaks with warm welcome
          s.count = 1;
          s.brokenRecently = true;
        }
      }

      s.lastActiveDate = today;
      s.bestStreak = Math.max(s.bestStreak, s.count);
    }

    return s;
  }

  function loadStreakFromStorage(now = Date.now()) {
    try {
      const raw = localStorage.getItem(GUEST_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.data && parsed.data.streak) {
          return sanitizeStreak(parsed.data.streak, now);
        }
      }
    } catch (e) {
      console.warn('[ScoreARStreak] Storage read failed:', e);
    }
    return getCleanStreakState(now);
  }

  function saveStreakToStorage(updatedStreak, now = Date.now()) {
    const sanitized = sanitizeStreak(updatedStreak, now);
    try {
      const raw = localStorage.getItem(GUEST_STORAGE_KEY);
      let payload = raw ? JSON.parse(raw) : { schemaVersion: 'scorear_v2', data: {} };
      if (!payload.data) payload.data = {};
      payload.data.streak = sanitized;
      payload.data.lastUpdated = now;
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('[ScoreARStreak] Storage write failed:', e);
    }
    return sanitized;
  }

  function recordQuestionAnswered(questionIdOrNow = null, maybeNow = null) {
    let questionId = null;
    let now = Date.now();
    if (typeof questionIdOrNow === 'string') {
      questionId = questionIdOrNow;
      now = (typeof maybeNow === 'number') ? maybeNow : Date.now();
    } else if (typeof questionIdOrNow === 'number') {
      now = questionIdOrNow;
    }
    const cur = loadStreakFromStorage(now);
    const updated = calculateStreakProgress(cur, 'question', questionId || 1, now);
    saveStreakToStorage(updated, now);
    return updated;
  }

  function recordPathCompleted(pathId, now = Date.now()) {
    const cur = loadStreakFromStorage(now);
    const updated = calculateStreakProgress(cur, 'path', 1, now);
    saveStreakToStorage(updated, now);
    return updated;
  }

  function getWeekCalendarDays(now = Date.now()) {
    const today = getLocalDateKey(now);
    const d = new Date(now);
    const dayOfWeek = d.getDay(); // 0: Sun, 6: Sat
    // Arab week starts Saturday
    const distToSat = ((dayOfWeek + 1) % 7);
    const sat = new Date(d);
    sat.setDate(d.getDate() - distToSat);

    const DAY_NAMES = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const cur = new Date(sat);
      cur.setDate(sat.getDate() + i);
      const key = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
      days.push({
        name: DAY_NAMES[i],
        dateKey: key,
        isToday: key === today,
        isPast: key < today
      });
    }
    return days;
  }

  function renderStreakCard(now = Date.now()) {
    const s = loadStreakFromStorage(now);
    const today = getLocalDateKey(now);
    const weekDays = getWeekCalendarDays(now);
    const isTodayActive = s.lastActiveDate === today;

    // Pick warm message
    let warmMsg;
    if (s.brokenRecently) {
      warmMsg = 'أهلاً بعودتك! بداية جديدة واعدة، خطوة اليوم تبني سلسلتك القادمة. 🌿';
    } else if (s.count >= 7) {
      warmMsg = 'ما شاء الله! أسبوع كامل أو أكثر من الانضباط والتألق المعرفي. 🔥';
    } else if (isTodayActive) {
      warmMsg = WARM_MESSAGES[s.count % WARM_MESSAGES.length];
    } else {
      const remaining = Math.max(0, MIN_DAILY_QUESTIONS - (s.dailyQuestionsCount || 0));
      warmMsg = remaining > 0
        ? `أكمل ${remaining} أسئلة أو أتمم مساراً لتثبيت نشاط اليوم والحفاظ على سلسلتك! ⏳`
        : 'أتممت متطلبات اليوم! واصل الاستمتاع بالتعلم. 🌟';
    }

    return `
      <div class="scorear-streak-card" style="background:radial-gradient(circle at top right, rgba(142,100,239,0.18), rgba(21,23,49,0.92));border:2px solid rgba(142,100,239,0.3);border-radius:22px;padding:22px 24px;margin-bottom:28px;direction:rtl;text-align:right;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:32px;">🔥</span>
            <div>
              <div style="display:flex;align-items:center;gap:8px;">
                <h3 style="font-size:20px;font-weight:900;color:#ffffff;margin:0;">سلسلة الأيام التعليمية</h3>
                <span style="background:rgba(245,158,11,0.2);color:#fcd34d;font-size:12px;font-weight:800;padding:2px 10px;border-radius:8px;">نشاط حقيقي</span>
              </div>
              <p style="font-size:13px;color:#c9baff;margin:2px 0 0 0;">${warmMsg}</p>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="background:rgba(21,23,49,0.85);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:8px 16px;text-align:center;">
              <div style="font-size:11px;color:#a89bff;">السلسلة الحالية</div>
              <div style="font-size:22px;font-weight:900;color:#fcd34d;">${s.count} <span style="font-size:13px;font-weight:700;">أيام</span></div>
            </div>
            <div style="background:rgba(21,23,49,0.85);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:8px 16px;text-align:center;">
              <div style="font-size:11px;color:#a89bff;">أفضل سلسلة 🏆</div>
              <div style="font-size:22px;font-weight:900;color:#52d9ed;">${s.bestStreak} <span style="font-size:13px;font-weight:700;">أيام</span></div>
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(7, 1fr);gap:8px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);">
          ${weekDays.map(w => {
            const hasActivity = Boolean(s.history[w.dateKey]);
            let bg = 'rgba(255,255,255,0.05)';
            let borderColor = 'rgba(255,255,255,0.1)';
            let icon = '⚪';
            let textColor = '#8e8ca8';

            if (hasActivity) {
              bg = 'rgba(16,185,129,0.22)';
              borderColor = '#10b981';
              icon = '✓';
              textColor = '#34d399';
            } else if (w.isToday) {
              bg = 'rgba(245,158,11,0.18)';
              borderColor = '#f59e0b';
              icon = '⏳';
              textColor = '#fcd34d';
            }

            return `
              <div class="scorear-streak-dot" style="background:${bg};border:1.5px solid ${borderColor};border-radius:14px;padding:10px 4px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px;">
                <span style="font-size:11px;color:${textColor};font-weight:700;">${w.name}</span>
                <span style="font-size:15px;font-weight:900;color:${textColor};">${icon}</span>
              </div>
            `;
          }).join('')}
        </div>
        <div style="margin-top:12px;font-size:11px;color:#a89bff;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <span>🛡️ رصيد إجازة أسبوعي: ${s.graceUsedThisWeek ? 'استُهلك هذا الأسبوع (يتجدد السبت)' : 'متاح (يحميك من انقطاع يوم واحد)'}</span>
          <span style="color:#7ee787;">⚡ السلسلة معنوية تحفيزية (0 XP لمنع استغلال النقاط)</span>
        </div>
      </div>
    `;
  }

  const StreakAPI = {
    MIN_DAILY_QUESTIONS,
    getLocalDateKey,
    getWeekStartKey,
    getDaysDifference,
    getCleanStreakState,
    sanitizeStreak,
    calculateStreakProgress,
    loadStreakFromStorage,
    saveStreakToStorage,
    recordQuestionAnswered,
    recordPathCompleted,
    getWeekCalendarDays,
    renderStreakCard
  };

  global.ScoreARStreak = StreakAPI;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = StreakAPI;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
