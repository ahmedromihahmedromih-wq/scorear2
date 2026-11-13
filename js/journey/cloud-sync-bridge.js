/**
 * ScoreAR Cloud Sync Bridge & Live Quiz Journey Connector
 * Phase 2: Connects live contests (rooms) with Mistake Notebook, Streak, and Journey XP.
 * Provides bidirectional cloud sync between Firebase RTDB (scorear_students/<uid>/progress)
 * and local storage (scorear_student_guest_v1).
 * Strictly Rule 7 Compliant (<500 lines).
 */
(function(global) {
  'use strict';

  const GUEST_STORAGE_KEY = 'scorear_student_guest_v1';
  const GUEST_CONTEST_CACHE_KEY = 'scorear_guest_contest_summary';

  let currentLiveQuestion = null;
  let currentChosenOptionIndex = null;
  let isInitialized = false;

  function getStudentSession() {
    try {
      const raw = sessionStorage.getItem('scorear_student_session');
      return raw ? JSON.parse(raw) : null;
    } catch(e) {
      return null;
    }
  }

  function getActiveQuizSession() {
    try {
      const raw = sessionStorage.getItem('scorear_active_quiz_session');
      return raw ? JSON.parse(raw) : null;
    } catch(e) {
      return null;
    }
  }

  function getDb() {
    return (global.firebase && global.firebase.database) ? global.firebase.database() : null;
  }

  function getAuth() {
    return (global.firebase && global.firebase.auth) ? global.firebase.auth() : null;
  }

  // --- 1. Live Contest Event Hooks (Realtime Pub-Sub Listener) ---
  function setupLiveContestListeners() {
    if (!global.ScoreARRealtime || typeof global.ScoreARRealtime.subscribe !== 'function') {
      setTimeout(setupLiveContestListeners, 500);
      return;
    }

    // Capture Question Start details
    global.ScoreARRealtime.subscribe('QUESTION_START', (payload) => {
      currentLiveQuestion = payload || null;
      currentChosenOptionIndex = null;
    });

    // Capture Student Answer Selection
    global.ScoreARRealtime.subscribe('STUDENT_ANSWERED', (payload) => {
      const activeSession = getActiveQuizSession();
      if (!activeSession) return;
      if (payload && (String(payload.playerId) === String(activeSession.uid) || payload.playerName === activeSession.name)) {
        currentChosenOptionIndex = Number(payload.optionIndex);
      }
    });

    // Capture Question Result & Route Mistakes
    global.ScoreARRealtime.subscribe('QUESTION_RESULT', (payload) => {
      handleQuestionResult(payload);
    });

    // Capture Contest Completion
    global.ScoreARRealtime.subscribe('CONTEST_COMPLETED', (payload) => {
      handleContestCompleted(payload);
    });
  }

  function handleQuestionResult(resultPayload) {
    if (!currentLiveQuestion || !resultPayload) return;

    const activeSession = getActiveQuizSession();
    if (!activeSession) return;

    const correctIdx = Number(resultPayload.correctIndex);
    const chosenIdx = (currentChosenOptionIndex !== null) ? currentChosenOptionIndex : -1;
    const isCorrect = (chosenIdx === correctIdx);

    const questionText = currentLiveQuestion.q || currentLiveQuestion.text || 'سؤال مسابقة';
    const opts = currentLiveQuestion.opts || [];
    const questionId = currentLiveQuestion.id || ('quiz_q_' + (currentLiveQuestion.qIndex || Date.now()));
    const chosenText = (chosenIdx >= 0 && opts[chosenIdx]) ? opts[chosenIdx] : 'لم تتم الإجابة في الوقت المحدد';
    const skill = currentLiveQuestion.skill || 'مسابقات تفاعلية';

    // Record Streak activity for active participation
    if (global.ScoreARStreak && typeof global.ScoreARStreak.recordQuestionAnswered === 'function') {
      try {
        global.ScoreARStreak.recordQuestionAnswered(questionId);
      } catch(e) {
        console.warn('[CloudSync] Streak record error:', e);
      }
    }

    if (!isCorrect) {
      const mistakeItem = {
        id: questionId,
        q: questionText,
        opts: opts,
        answer: correctIdx,
        why: currentLiveQuestion.explain || '',
        skill: skill,
        pathId: currentLiveQuestion.worldId || 'room_contests'
      };

      const student = getStudentSession();
      if (student && student.uid) {
        // Registered Student: Feed directly into local and cloud Mistake Notebook
        if (global.ScoreARMistakeNotebook && typeof global.ScoreARMistakeNotebook.recordMistake === 'function') {
          try {
            global.ScoreARMistakeNotebook.recordMistake(mistakeItem, chosenText);
            console.log('[CloudSync] Recorded mistake for registered student:', questionText);
          } catch(e) {
            console.warn('[CloudSync] Mistake record error:', e);
          }
        }
      } else {
        // Guest Student: Cache mistake locally in pending contest summary
        cacheGuestMistake(mistakeItem, chosenText);
      }
    }
  }

  function cacheGuestMistake(mistakeItem, chosenText) {
    try {
      const raw = sessionStorage.getItem(GUEST_CONTEST_CACHE_KEY);
      const cache = raw ? JSON.parse(raw) : { mistakes: [], score: 0, completedAt: Date.now() };
      cache.mistakes.push({ ...mistakeItem, chosenText, recordedAt: Date.now() });
      sessionStorage.setItem(GUEST_CONTEST_CACHE_KEY, JSON.stringify(cache));
    } catch(e) {}
  }

  function handleContestCompleted(contestPayload) {
    const activeSession = getActiveQuizSession();
    if (!activeSession) return;

    const student = getStudentSession();
    const finalScore = Number(activeSession.score) || 0;
    const gainedXp = Math.max(10, Math.round(finalScore / 10));

    if (student && student.uid) {
      // Award XP to registered student's journey
      if (global.ScoreARJourney && typeof global.ScoreARJourney.saveProgress === 'function') {
        try {
          const current = (typeof global.ScoreARJourney.getProgress === 'function')
            ? global.ScoreARJourney.getProgress()
            : {};
          const updatedXp = (Number(current.totalXp) || 0) + gainedXp;
          global.ScoreARJourney.saveProgress({ totalXp: updatedXp });
        } catch(e) {}
      }

      // Sync updated progress to Firebase RTDB
      syncStudentProfile(student.uid);
    } else {
      // Guest Student: Record summary and render conversion prompt after podium
      try {
        const raw = sessionStorage.getItem(GUEST_CONTEST_CACHE_KEY);
        const cache = raw ? JSON.parse(raw) : { mistakes: [] };
        cache.score = finalScore;
        cache.gainedXp = gainedXp;
        cache.rank = activeSession.rank || '-';
        cache.pin = activeSession.pin || '';
        cache.completedAt = Date.now();
        sessionStorage.setItem(GUEST_CONTEST_CACHE_KEY, JSON.stringify(cache));
      } catch(e) {}

      setTimeout(renderGuestSavePrompt, 3500);
    }
  }

  // --- 2. Guest-to-Registered Account Conversion Prompt ---
  function renderGuestSavePrompt() {
    let rawCache = null;
    try {
      rawCache = sessionStorage.getItem(GUEST_CONTEST_CACHE_KEY);
    } catch(e) {}
    if (!rawCache) return;

    const data = JSON.parse(rawCache);
    const mistakesCount = (data.mistakes && Array.isArray(data.mistakes)) ? data.mistakes.length : 0;
    const xp = data.gainedXp || Math.round((data.score || 0) / 10);

    const existingEl = document.getElementById('scorearGuestSaveBanner');
    if (existingEl) existingEl.remove();

    const banner = document.createElement('div');
    banner.id = 'scorearGuestSaveBanner';
    banner.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;max-width:520px;width:92%;background:linear-gradient(135deg, rgba(26,20,54,0.98), rgba(12,14,30,0.98));border:2px solid #8e64ef;box-shadow:0 12px 35px rgba(0,0,0,0.7), 0 0 25px rgba(142,100,239,0.3);border-radius:18px;padding:16px 20px;color:#fff;direction:rtl;text-align:right;font-family:Cairo,Tajawal,sans-serif;animation:slideUp 0.4s ease;';

    banner.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:26px;">🌟</span>
          <div>
            <h4 style="margin:0;font-size:16px;font-weight:900;color:#ffffff;">أداء رائع! هل ترغب في حفظ نقاطك وأخطائك؟</h4>
            <p style="margin:2px 0 0;font-size:12px;color:#cbd5e1;">لديك <b>+${xp} نقطة خبرة (XP)</b> ${mistakesCount > 0 ? `و <b>${mistakesCount} أسئلة</b> يمكنك مراجعتها وتثبيتها لاحقاً في دفتر الأخطاء.` : 'يمكنك ترحيلها فوراً لسجلك الدائم.'}</p>
          </div>
        </div>
        <button type="button" onclick="document.getElementById('scorearGuestSaveBanner')?.remove()" style="background:transparent;border:none;color:#94a3b8;font-size:16px;cursor:pointer;padding:2px 6px;">✕</button>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button type="button" onclick="ScoreARCloudSync.triggerStudentRegister()" style="background:linear-gradient(135deg, #10b981, #059669);color:#fff;border:none;border-radius:10px;padding:8px 16px;font-size:12.5px;font-weight:900;cursor:pointer;box-shadow:0 4px 12px rgba(16,185,129,0.4);">إنشاء حساب طالب وحفظ التقدم 🚀</button>
        <button type="button" onclick="ScoreARCloudSync.triggerStudentLogin()" style="background:rgba(255,255,255,0.08);color:#e2e8f0;border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:8px 14px;font-size:12.5px;font-weight:800;cursor:pointer;">تسجيل دخول</button>
      </div>
    `;

    document.body.appendChild(banner);
  }

  // --- 3. Bidirectional Cloud Sync for Registered Students ---
  async function syncStudentProfile(explicitUid = null) {
    const student = getStudentSession();
    const uid = explicitUid || (student ? student.uid : null);
    if (!uid) return;

    const db = getDb();
    if (!db) return;

    try {
      // 1. Read local state
      let localState = {};
      try {
        const rawLocal = localStorage.getItem(GUEST_STORAGE_KEY);
        localState = rawLocal ? JSON.parse(rawLocal) : {};
      } catch(e) {}

      // 2. Read cloud state from RTDB: scorear_students/<uid>/progress
      let cloudState = null;
      try {
        const snap = await db.ref(`scorear_students/${uid}/progress`).once('value');
        cloudState = snap.val();
      } catch(e) {
        console.warn('[CloudSync] RTDB read error:', e.message);
      }

      // 3. Smart Merge
      const merged = smartMergeProgress(localState.data || {}, cloudState || {});

      // 4. Update local storage
      const updatedLocal = {
        schemaVersion: 'scorear_v2',
        data: merged
      };
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updatedLocal));

      // 5. Update RTDB cloud record
      await db.ref(`scorear_students/${uid}/progress`).set({
        ...merged,
        lastSyncedAt: Date.now()
      });

      console.log('✅ [ScoreAR CloudSync] Student progress synchronized successfully for:', uid);
    } catch(err) {
      console.warn('[ScoreAR CloudSync] Sync error:', err);
    }
  }

  function smartMergeProgress(local, cloud) {
    const merged = { ...cloud, ...local };

    // Max XP
    merged.totalXp = Math.max(Number(local.totalXp) || 0, Number(cloud.totalXp) || 0);

    // Merge completed journey nodes
    const localNodes = Array.isArray(local.completedNodes) ? local.completedNodes : [];
    const cloudNodes = Array.isArray(cloud.completedNodes) ? cloud.completedNodes : [];
    merged.completedNodes = Array.from(new Set([...localNodes, ...cloudNodes]));

    // Merge mistake notebook items
    const localMistakes = Array.isArray(local.mistakes) ? local.mistakes : [];
    const cloudMistakes = Array.isArray(cloud.mistakes) ? cloud.mistakes : [];
    const mistakeMap = new Map();

    cloudMistakes.forEach(m => { if (m && m.questionId) mistakeMap.set(m.questionId, m); });
    localMistakes.forEach(m => {
      if (!m || !m.questionId) return;
      const prev = mistakeMap.get(m.questionId);
      if (!prev) {
        mistakeMap.set(m.questionId, m);
      } else {
        // Keep higher attempt count or latest review time
        mistakeMap.set(m.questionId, {
          ...prev,
          ...m,
          attemptCount: Math.max(prev.attemptCount || 1, m.attemptCount || 1),
          consecutiveCorrect: Math.max(prev.consecutiveCorrect || 0, m.consecutiveCorrect || 0),
          mastered: Boolean(prev.mastered || m.mastered)
        });
      }
    });

    merged.mistakes = Array.from(mistakeMap.values());

    // Merge streaks
    if (cloud.streak || local.streak) {
      const ls = local.streak || {};
      const cs = cloud.streak || {};
      merged.streak = {
        count: Math.max(Number(ls.count) || 0, Number(cs.count) || 0),
        best: Math.max(Number(ls.best) || 0, Number(cs.best) || 0),
        lastDate: (ls.lastDate && ls.lastDate > (cs.lastDate || '')) ? ls.lastDate : (cs.lastDate || ls.lastDate || '')
      };
    }

    merged.lastUpdated = Math.max(Number(local.lastUpdated) || 0, Number(cloud.lastUpdated) || 0, Date.now());
    return merged;
  }

  // --- 4. Claim Pending Guest Data after Login or Registration ---
  function claimGuestContestSummary() {
    let rawCache = null;
    try {
      rawCache = sessionStorage.getItem(GUEST_CONTEST_CACHE_KEY);
    } catch(e) {}
    if (!rawCache) return;

    try {
      const cache = JSON.parse(rawCache);
      const student = getStudentSession();
      if (!student || !student.uid) return;

      // Migrate cached mistakes into Mistake Notebook
      if (Array.isArray(cache.mistakes) && cache.mistakes.length > 0 && global.ScoreARMistakeNotebook?.recordMistake) {
        cache.mistakes.forEach(m => {
          try {
            global.ScoreARMistakeNotebook.recordMistake(m, m.chosenText || '');
          } catch(e) {}
        });
      }

      // Add cached XP
      if (cache.gainedXp && global.ScoreARJourney?.saveProgress) {
        try {
          const cur = global.ScoreARJourney.getProgress ? global.ScoreARJourney.getProgress() : {};
          const newXp = (Number(cur.totalXp) || 0) + Number(cache.gainedXp);
          global.ScoreARJourney.saveProgress({ totalXp: newXp });
        } catch(e) {}
      }

      // Clear cache and remove banner
      sessionStorage.removeItem(GUEST_CONTEST_CACHE_KEY);
      const banner = document.getElementById('scorearGuestSaveBanner');
      if (banner) banner.remove();

      if (global.toast) {
        global.toast(`تم ترحيل وحفظ ${cache.gainedXp || 0} نقطة ونتائج مسابقتك في حسابك الدائم بنجاح 🌟`);
      }

      // Sync to cloud
      syncStudentProfile(student.uid);
    } catch(e) {
      console.warn('[CloudSync] Claim error:', e);
    }
  }

  function init() {
    if (isInitialized) return;
    isInitialized = true;
    setupLiveContestListeners();

    // Listen for Auth changes to sync profile and claim guest contest data immediately on login
    if (global.ScoreARAuth && typeof global.ScoreARAuth.onAuthStateChange === 'function') {
      global.ScoreARAuth.onAuthStateChange((user) => {
        if (user && user.role === 'student' && user.uid) {
          syncStudentProfile(user.uid);
          claimGuestContestSummary();
        }
      });
    }

    // Trigger profile sync on page load if student session exists
    const student = getStudentSession();
    if (student && student.uid) {
      syncStudentProfile(student.uid);
      claimGuestContestSummary();
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  global.ScoreARCloudSync = {
    init,
    syncStudentProfile,
    claimGuestContestSummary,
    triggerStudentLogin: () => {
      if (global.ScoreARAuthRegisterUI && typeof global.ScoreARAuthRegisterUI.openModal === 'function') {
        global.ScoreARAuthRegisterUI.openModal('login');
      } else if (global.ScoreARAuthUI && typeof global.ScoreARAuthUI.openModal === 'function') {
        global.ScoreARAuthUI.openModal('student-login');
      }
    },
    triggerStudentRegister: () => {
      if (global.ScoreARAuthRegisterUI && typeof global.ScoreARAuthRegisterUI.openModal === 'function') {
        global.ScoreARAuthRegisterUI.openModal('register');
      } else if (global.ScoreARAuthUI && typeof global.ScoreARAuthUI.openModal === 'function') {
        global.ScoreARAuthUI.openModal('student-register');
      }
    }
  };

})(typeof window !== 'undefined' ? window : globalThis);
