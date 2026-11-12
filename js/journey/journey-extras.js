(function (global) {
  'use strict';

  const GUEST_KEY = 'scorear_student_guest_v1';
  const DAILY_XP_REWARD = 20;
  const MAX_ATTEMPTS = 50;
  const VISIBLE_ATTEMPTS = 5;
  const COMPANIONS = [
    { id: 'char_01', name: 'زياد', title: 'المستكشف' },
    { id: 'char_02', name: 'ليان', title: 'باحثة النجوم' },
    { id: 'char_03', name: 'راشد', title: 'حارس المعرفة' },
    { id: 'char_04', name: 'نور', title: 'رائدة البلاغة' }
  ];

  let activeDaily = null;
  const ui = () => global.ScoreARUI || { icon: () => '', iconBox: () => '', escapeHtml: s => String(s ?? '') };

  function getCairoDayKey(now = Date.now()) {
    try {
      const out = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(new Date(now));
      if (/^\d{4}-\d{2}-\d{2}$/.test(out)) return out;
    } catch {}
    return new Date(Number(now) + 7200000).toISOString().slice(0, 10);
  }

  function readPayload() {
    try {
      const raw = global.localStorage ? global.localStorage.getItem(GUEST_KEY) : null;
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object' && parsed.data && typeof parsed.data === 'object') return parsed;
    } catch {}
    return { schemaVersion: 'scorear_v2', data: {} };
  }

  function writePayload(payload) {
    try {
      if (!global.localStorage) return false;
      payload.data.lastUpdated = Date.now();
      global.localStorage.setItem(GUEST_KEY, JSON.stringify(payload));
      return true;
    } catch { return false; }
  }

  function getExtrasState(now = Date.now()) {
    const p = readPayload().data || {};
    const daily = p.dailyChallenge && typeof p.dailyChallenge === 'object' ? p.dailyChallenge : {};
    const todayKey = getCairoDayKey(now);
    return {
      todayKey,
      daily,
      todayCompleted: daily.lastRewardedDate === todayKey,
      dailyCompletedCount: Number(daily.completedCount) || (daily.lastRewardedDate ? 1 : 0),
      attempts: Array.isArray(p.attempts) ? p.attempts : [],
      companionId: p.companionId || 'char_01',
      xp: Math.max(0, Number(p.xp) || 0),
      completedPaths: p.completedPaths && typeof p.completedPaths === 'object' ? p.completedPaths : {},
      stationsProgress: p.stationsProgress && typeof p.stationsProgress === 'object' ? p.stationsProgress : {},
      mistakes: Array.isArray(p.mistakes) ? p.mistakes : [],
      streak: p.streak && typeof p.streak === 'object' ? p.streak : { count: 0, bestStreak: 0 }
    };
  }

  function collectQuestionPool(extraTracks = []) {
    const pool = [], seen = new Set();
    const pushQ = (q, trackTitle, skillFallback) => {
      if (!q) return;
      const opts = Array.isArray(q.options) ? q.options : (Array.isArray(q.opts) ? q.opts : []);
      const ans = q.correct !== undefined ? q.correct : (q.answer !== undefined ? q.answer : q.ans);
      const id = q.id || `${trackTitle}_${pool.length}`;
      if (seen.has(id) || opts.length < 2 || ans === undefined) return;
      seen.add(id);
      pool.push({
        id, text: q.text || q.q || '', opts, ans: Number(ans),
        explain: q.explanation || q.why || '', skill: q.skill || skillFallback || trackTitle || 'مهارات اللغة العربية'
      });
    };
    (global.ScoreARJourney?.PRACTICE_TRACKS || []).forEach(t => (t.questions || []).forEach(q => pushQ(q, t.title, t.badge)));
    (extraTracks || []).forEach(t => (t.stations || []).forEach(st => (st.questions || []).forEach(q => pushQ(q, t.trackTitle || t.title, st.title))));
    return pool;
  }

  function hashStr(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  }

  function getDailyQuestions(dateKey = getCairoDayKey(), extraTracks = []) {
    const pool = collectQuestionPool(extraTracks);
    if (pool.length <= 3) return pool;
    const ranked = pool.map(item => ({ item, score: hashStr(`${dateKey}::${item.id}`) }))
      .sort((a, b) => a.score - b.score).map(e => e.item);
    const chosen = [], usedSkills = new Set();
    for (const q of ranked) {
      if (!usedSkills.has(q.skill)) { chosen.push(q); usedSkills.add(q.skill); }
      if (chosen.length === 3) break;
    }
    for (const q of ranked) { if (chosen.length >= 3) break; if (!chosen.includes(q)) chosen.push(q); }
    return chosen;
  }

  function recordAttempt(entry) {
    const payload = readPayload();
    const list = Array.isArray(payload.data.attempts) ? payload.data.attempts : [];
    const total = Math.max(1, Number(entry.total) || 1);
    const correct = Math.max(0, Number(entry.correct) || 0);
    const item = {
      id: entry.id || `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: String(entry.title || 'تدريب هادئ'), mode: String(entry.mode || 'practice'),
      correct, total,
      percentage: entry.percentage !== undefined ? Number(entry.percentage) : Math.round((correct / total) * 100),
      xpEarned: Math.max(0, Number(entry.xpEarned) || 0),
      cairoDate: entry.cairoDate || getCairoDayKey(), timestamp: entry.timestamp || Date.now()
    };
    payload.data.attempts = [item, ...list].slice(0, MAX_ATTEMPTS);
    writePayload(payload);
    return payload.data.attempts;
  }

  function completeDailyChallenge(score, total, now = Date.now()) {
    const todayKey = getCairoDayKey(now);
    const payload = readPayload();
    const prev = payload.data.dailyChallenge && typeof payload.data.dailyChallenge === 'object' ? payload.data.dailyChallenge : {};
    const alreadyRewarded = prev.lastRewardedDate === todayKey;
    const xpGain = alreadyRewarded ? 0 : DAILY_XP_REWARD;
    payload.data.xp = Math.max(0, Number(payload.data.xp) || 0) + xpGain;
    payload.data.dailyChallenge = {
      lastRewardedDate: todayKey, lastScore: score, lastTotal: total,
      completedCount: (Number(prev.completedCount) || 0) + (alreadyRewarded ? 0 : 1)
    };
    const list = Array.isArray(payload.data.attempts) ? payload.data.attempts : [];
    payload.data.attempts = [{
      id: `daily_${todayKey}_${Date.now()}`, title: `تحدي اليوم (${todayKey})`, mode: 'daily',
      correct: score, total: Math.max(1, total), percentage: Math.round((score / Math.max(1, total)) * 100),
      xpEarned: xpGain, cairoDate: todayKey, timestamp: now
    }, ...list].slice(0, MAX_ATTEMPTS);
    writePayload(payload);
    return { xpGain, alreadyRewarded, state: getExtrasState(now) };
  }

  function computeBadges(state = getExtrasState()) {
    const masteredCount = state.mistakes.filter(m => m.mastered && !m.archived).length;
    const donePaths = Object.keys(state.completedPaths || {}).length;
    const doneStations = Object.keys(state.stationsProgress || {}).length;
    const bestStreak = Math.max(Number(state.streak?.bestStreak) || 0, Number(state.streak?.count) || 0);
    return [
      { id: 'first_step', title: 'أول خطوة', desc: 'أكملت أول تدريب أو محطة بنجاح', icon: 'target', earned: state.attempts.length >= 1 || donePaths >= 1 || doneStations >= 1 },
      { id: 'daily_hero', title: 'بطل تحدي اليوم', desc: 'أنجزت تحدي اليوم بتوقيت القاهرة', icon: 'calendarCheck', earned: state.todayCompleted || state.dailyCompletedCount >= 1 },
      { id: 'streak_keeper', title: 'شعلة الاستمرار', desc: 'حافظت على سلسلة تعلم لمدة 3 أيام', icon: 'flame', earned: bestStreak >= 3 },
      { id: 'master_scholar', title: 'نجم الإتقان', desc: 'بلغت 100 نقطة خبرة أو أتقنت مساراً', icon: 'crown', earned: state.xp >= 100 || donePaths >= 1 || masteredCount >= 1 }
    ];
  }

  function setCompanionId(charId) {
    const payload = readPayload();
    payload.data.companionId = charId;
    writePayload(payload);
    mount();
  }

  function getOrCreateDailyStage() {
    let el = document.getElementById('scorearDailyStage');
    if (!el) {
      el = document.createElement('div');
      el.id = 'scorearDailyStage';
      el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:radial-gradient(circle at 50% 15%, #181938 0%, #090a16 100%);color:#eceeff;font-family:Cairo,Tajawal,sans-serif;direction:rtl;display:flex;flex-direction:column;overflow-y:auto;';
      document.body.appendChild(el);
    }
    el.style.display = 'flex';
    return el;
  }

  function closeDailyStage() {
    activeDaily = null;
    const el = document.getElementById('scorearDailyStage');
    if (el) el.style.display = 'none';
    if (global.location?.hash === '#journey') {
      const m = document.getElementById('main');
      if (m && global.ScoreARJourney) {
        m.innerHTML = global.ScoreARJourney.renderJourneyPage();
        global.ScoreARJourney.bindJourneyEvents?.();
        global.ScoreARSkillMap?.mount?.();
        mount();
      }
    }
  }

  async function startDailyChallenge() {
    let mapTracks = [];
    if (global.ScoreARSkillMap?.fetchTracksData) { try { mapTracks = await global.ScoreARSkillMap.fetchTracksData(); } catch {} }
    const todayKey = getCairoDayKey();
    const questions = getDailyQuestions(todayKey, mapTracks);
    if (!questions.length) return;
    activeDaily = { todayKey, questions, index: 0, correctCount: 0, answered: false };
    renderDailyQuestion();
  }

  function renderDailyQuestion() {
    const s = activeDaily;
    if (!s) return;
    const stage = getOrCreateDailyStage();
    const { icon, iconBox, escapeHtml } = ui();
    const q = s.questions[s.index];
    if (!q) {
      const res = completeDailyChallenge(s.correctCount, s.questions.length);
      stage.innerHTML = `
        <main style="max-width:580px;width:100%;margin:auto;padding:28px 18px;text-align:center;">
          <div class="scorear-spotlight-card" style="padding:32px 24px;">
            <div style="margin-bottom:16px;">${iconBox('trophy', { size: 'lg', tone: 'cyan' })}</div>
            <h2 style="color:#f6f3ff;font-size:24px;font-weight:900;margin-bottom:6px;">أتممت تحدي اليوم بنجاح</h2>
            <p style="color:#aaa9c1;font-size:14px;margin-bottom:18px;">أصبت في ${s.correctCount} من ${s.questions.length} أسئلة بتوقيت القاهرة (${s.todayKey})</p>
            <div style="display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:999px;background:#1d5c52;border:1px solid #44b8a5;color:#befff2;font-weight:800;font-size:14px;margin-bottom:22px;">
              ${res.xpGain > 0 ? `+${res.xpGain} نقطة خبرة جديدة` : 'مكافأة اليوم مُنحت مسبقاً'}
            </div>
            <div><button type="button" class="btn launch-primary" id="dailyDoneCloseBtn">${icon('arrow', { size: 16 })} العودة إلى رحلتي</button></div>
          </div>
        </main>`;
      stage.querySelector('#dailyDoneCloseBtn').onclick = closeDailyStage;
      return;
    }

    stage.innerHTML = `
      <header style="padding:16px 22px;border-bottom:1px solid #ffffff14;display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <div><span class="launch-pill"><span class="live-dot"></span> تحدي اليوم • ${escapeHtml(q.skill)}</span>
          <h2 style="font-size:17px;font-weight:900;color:#f6f3ff;margin:8px 0 0;">السؤال ${s.index + 1} من ${s.questions.length}</h2></div>
        <button type="button" class="btn launch-outline" id="dailyQuitBtn">${icon('close', { size: 15 })} خروج</button>
      </header>
      <main style="max-width:740px;width:100%;margin:0 auto;padding:24px 18px;display:flex;flex-direction:column;gap:16px;">
        <div class="scorear-spotlight-card" style="padding:24px;"><p style="font-size:19px;font-weight:800;color:#f6f3ff;line-height:1.8;margin:0;">${escapeHtml(q.text)}</p></div>
        <div style="display:grid;gap:10px;" id="dailyOptionsWrap">
          ${q.opts.map((opt, idx) => `<button type="button" class="daily-opt-btn" data-opt="${idx}" style="display:flex;align-items:center;gap:12px;padding:15px 18px;border-radius:14px;background:#18172e;border:1px solid #ffffff1a;color:#eceeff;font-size:15px;font-weight:700;text-align:right;cursor:pointer;"><span style="width:28px;height:28px;border-radius:9px;background:#2b2543;color:#c9baff;display:grid;place-items:center;font-size:12px;font-weight:800;flex-shrink:0;">${idx + 1}</span><span>${escapeHtml(opt)}</span></button>`).join('')}
        </div>
        <div id="dailyFeedbackArea"></div>
      </main>`;

    stage.querySelector('#dailyQuitBtn').onclick = closeDailyStage;
    stage.querySelectorAll('.daily-opt-btn').forEach(btn => {
      btn.onclick = () => {
        if (s.answered) return;
        s.answered = true;
        const chosen = Number(btn.getAttribute('data-opt'));
        const ok = chosen === q.ans;
        if (ok) s.correctCount++;
        global.ScoreARStreak?.recordQuestionAnswered?.(q.id);
        stage.querySelectorAll('.daily-opt-btn').forEach((b, i) => {
          b.disabled = true;
          if (i === q.ans) Object.assign(b.style, { background: '#1d5c52', borderColor: '#44b8a5', color: '#befff2' });
          else if (i === chosen && !ok) Object.assign(b.style, { background: '#6a364e', borderColor: '#c38498', color: '#ffd3e5' });
          else b.style.opacity = '0.45';
        });
        const fb = stage.querySelector('#dailyFeedbackArea');
        fb.innerHTML = `<div class="scorear-spotlight-card" style="padding:18px;border-color:${ok ? '#44b8a5' : '#c38498'};">
          <strong style="display:block;color:${ok ? '#7fe7ce' : '#ffd3e5'};font-size:15px;margin-bottom:6px;">${ok ? 'إجابة صحيحة — استمر!' : 'إجابة قريبة من الصواب، راجع القاعدة:'}</strong>
          <p style="color:#d7ccea;font-size:13px;line-height:1.8;margin:0 0 14px;">${escapeHtml(q.explain)}</p>
          <button type="button" class="btn launch-primary" id="dailyNextBtn">${s.index + 1 < s.questions.length ? 'السؤال التالي' : 'إنهاء تحدي اليوم'} ${icon('arrow', { size: 15 })}</button>
        </div>`;
        fb.querySelector('#dailyNextBtn').onclick = () => { s.index++; s.answered = false; renderDailyQuestion(); };
      };
    });
  }

  function renderExtrasTopHtml(state = getExtrasState()) {
    const u = ui();
    const { icon, iconBox, escapeHtml } = u;
    const badges = computeBadges(state);
    const earnedCount = badges.filter(b => b.earned).length;
    const dueMistakes = state.mistakes.filter(m => !m.archived && !m.mastered).length;
    const activeComp = COMPANIONS.find(c => c.id === state.companionId) || COMPANIONS[0];
    const orbDaily = u.orbShowcase ? u.orbShowcase('calendarCheck', { tone: 'cyan', compact: true }) : iconBox('calendarCheck', { size: 'lg', tone: 'cyan' });
    const orbBook = u.orbShowcase ? u.orbShowcase('bookMarked', { tone: 'violet', compact: true }) : iconBox('bookMarked', { size: 'lg', tone: 'violet' });
    const metrics = [
      { icon: 'zap', tone: 'violet', val: `${state.xp} XP`, lbl: 'رصيد الخبرة الهادئة' },
      { icon: 'flame', tone: 'cyan', val: `${state.streak?.count || 0} أيام`, lbl: 'سلسلة التعلّم النشطة' },
      { icon: 'bookMarked', tone: 'violet', val: `${dueMistakes}`, lbl: 'أخطاء قيد المراجعة' },
      { icon: 'award', tone: 'cyan', val: `${earnedCount} / 4`, lbl: 'أوسمة الرحلة' }
    ];
    return `
      <header class="scorear-editorial-head" style="margin-bottom:8px;">
        <div class="scorear-editorial-copy">
          <span class="launch-pill"><span class="live-dot"></span> رحلة الطالب والتدريب الهادئ</span>
          <h1>مسارك الشخصي نحو <span class="gradient-text">الإتقان اللغوي</span></h1>
          <p>تحدٍ يومي بتوقيت القاهرة، خريطة محطات متدرجة، ودفتر ذكي يرسّخ أخطاءك السابقة بلا ضغط وقت.</p>
        </div>
        <div class="scorear-floating-companion">
          <div class="scorear-hero-avatar"><img src="assets/characters/${escapeHtml(activeComp.id)}.webp" alt="${escapeHtml(activeComp.name)}" onerror="this.src='assets/characters/char_01.webp'"></div>
          <div>
            <div style="font-size:10px;color:#58dce3;font-weight:800;">رفيق الرحلة</div>
            <strong style="display:block;color:#f6f3ff;font-size:14.5px;font-weight:900;">${escapeHtml(activeComp.name)} — ${escapeHtml(activeComp.title)}</strong>
            <div style="display:flex;gap:5px;margin-top:7px;flex-wrap:wrap;">
              ${COMPANIONS.map(c => `<button type="button" data-companion-pick="${escapeHtml(c.id)}" style="padding:2px 8px;border-radius:999px;font-size:10px;font-weight:800;cursor:pointer;border:1px solid ${c.id === activeComp.id ? '#9665ff' : '#ffffff1e'};background:${c.id === activeComp.id ? '#7550ef44' : '#0c0d1d'};color:${c.id === activeComp.id ? '#fff' : '#a1a4be'};">${escapeHtml(c.name)}</button>`).join('')}
            </div>
          </div>
        </div>
      </header>
      <div class="scorear-stat-ribbon">
        ${metrics.map(m => `<div class="scorear-ribbon-item scorear-metric-card" style="background:transparent;border:none;">${iconBox(m.icon, { size: 'sm', tone: m.tone })}<div><b>${m.val}</b><span>${m.lbl}</span></div></div>`).join('')}
      </div>
      <div class="scorear-bento-two">
        <section class="scorear-experience-panel tone-cyan spotlight" style="display:flex;flex-direction:column;justify-content:space-between;gap:14px;">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;"><span class="scorear-panel-index">01 / DAILY CHALLENGE</span><span class="launch-pill" style="padding:3px 10px;font-size:10px;"><span class="live-dot"></span> ${escapeHtml(state.todayKey)}</span></div>
            ${orbDaily}
            <h3 style="color:#f6f3ff;font-size:19px;font-weight:900;margin:4px 0 6px;">تحدي اليوم بتوقيت القاهرة</h3>
            <p style="color:#aaa9c1;font-size:13px;margin:0;line-height:1.75;">${state.todayCompleted ? 'أحسنت! أنجزت تحدي اليوم وحصلت على +20 XP. يمكنك إعادته للمران.' : '3 أسئلة مركّزة في النحو والبلاغة والإملاء لتحصد +20 نقطة خبرة يومية.'}</p>
          </div>
          <div><button type="button" class="btn launch-primary" id="startDailyChallengeBtn" style="width:100%;padding:11px 18px;">${icon('play', { size: 15 })} ${state.todayCompleted ? 'إعادة تحدي اليوم' : 'ابدأ تحدي اليوم'}</button></div>
        </section>
        <section class="scorear-experience-panel spotlight" style="display:flex;flex-direction:column;justify-content:space-between;gap:14px;">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;"><span class="scorear-panel-index">02 / SPACED REVIEW</span><span class="launch-pill" style="padding:3px 10px;font-size:10px;">${dueMistakes} قيد المراجعة</span></div>
            ${orbBook}
            <h3 style="color:#f6f3ff;font-size:19px;font-weight:900;margin:4px 0 6px;">دفتر أخطائي الذكي</h3>
            <p style="color:#aaa9c1;font-size:13px;margin:0;line-height:1.75;">يعيد لك الأسئلة التي أخطأت فيها بجدولة متباعدة حتى تتقنها وتكسب +10 XP.</p>
          </div>
          <div><button type="button" class="btn launch-outline" id="openJourneyNotebookBtn" style="width:100%;padding:11px 18px;border-color:#9665ff66;">${icon('bookMarked', { size: 15 })} افتح دفتر أخطائي</button></div>
        </section>
      </div>`;
  }

  function renderExtrasBottomHtml(state = getExtrasState()) {
    const { iconBox, escapeHtml } = ui();
    const badges = computeBadges(state);
    const recent = state.attempts.slice(0, VISIBLE_ATTEMPTS);
    return `
      <section class="scorear-experience-panel spotlight" style="margin-top:26px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:10px;">${iconBox('award', { size: 'sm', tone: 'violet', tilted: true })}<div><h3 style="color:#f6f3ff;font-size:17px;font-weight:900;margin:0;">الأوسمة المكتسبة</h3><small style="color:#a1a4be;font-size:11px;">تُفتح تلقائياً مع تقدمك الحقيقي</small></div></div>
          <span class="scorear-panel-index">ACHIEVEMENTS</span>
        </div>
        <div class="scorear-badges-grid">
          ${badges.map(b => `<div class="scorear-badge-card ${b.earned ? 'earned' : 'locked'}">${iconBox(b.icon, { size: 'md', tone: b.earned ? 'cyan' : 'muted', tilted: b.earned })}<div style="min-width:0;"><strong style="display:block;color:#f6f3ff;font-size:13px;font-weight:800;">${escapeHtml(b.title)}</strong><small style="display:block;color:#a1a4be;font-size:11px;line-height:1.5;">${escapeHtml(b.desc)}</small></div></div>`).join('')}
        </div>
      </section>
      <section class="scorear-experience-panel tone-cyan spotlight" style="margin-top:18px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:10px;">${iconBox('history', { size: 'sm', tone: 'cyan' })}<div><h3 style="color:#f6f3ff;font-size:17px;font-weight:900;margin:0;">أحدث محاولاتك (${recent.length})</h3><small style="color:#a1a4be;font-size:11px;">يحتفظ النظام بآخر 50 محاولة ويعرض أحدث 5 محاولات</small></div></div>
          <span class="scorear-panel-index">RECENT LOG</span>
        </div>
        ${recent.length ? `<div class="scorear-attempts-list">${recent.map(a => `<div class="scorear-attempt-row"><div style="min-width:0;"><strong style="display:block;color:#f6f3ff;font-size:13px;font-weight:800;">${escapeHtml(a.title)}</strong><small style="color:#a1a4be;font-size:11px;">${escapeHtml(a.cairoDate || '')} • ${a.correct}/${a.total} إجابات صحيحة</small></div><div style="display:flex;align-items:center;gap:8px;"><span style="padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800;background:#1d5c52;color:#befff2;border:1px solid #44b8a544;">${a.percentage}%</span>${a.xpEarned ? `<span style="padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800;background:#2b234d;color:#d7ccea;">+${a.xpEarned} XP</span>` : ''}</div></div>`).join('')}</div>`
        : `<p style="color:#a1a4be;font-size:13px;margin:0;line-height:1.8;">لم تسجّل محاولات بعد — ابدأ تحدي اليوم أو أي مسار تدريبي لتظهر نتائجك هنا.</p>`}
      </section>`;
  }

  function polishLegacyJourneyIcons(page) {
    const { iconBox, icon } = ui();
    const map = [[/📖/, 'book'], [/✨|🌟/, 'spark'], [/✍️|📝/, 'edit'], [/🏆/, 'trophy'], [/🔥/, 'flame'], [/🌿|🎯/, 'target'], [/🔒/, 'lock'], [/⚠️/, 'alert']];
    page.querySelectorAll('#practiceTracksSection span, #scorearSkillMapSection span, #practiceTracksSection h3').forEach(el => {
      if (el.children.length > 0) return;
      const txt = String(el.textContent || '').trim();
      if (!txt || txt.length > 6) return;
      for (const [re, name] of map) {
        if (re.test(txt)) {
          el.innerHTML = el.tagName === 'SPAN' && parseInt(el.style.fontSize || '0', 10) >= 20 ? iconBox(name, { size: 'md', tone: 'violet' }) : icon(name, { size: 15 });
          break;
        }
      }
    });
  }

  function mount() {
    const page = document.querySelector('#main .page');
    if (!page) return;
    const legacyHeader = page.querySelector('.page-title');
    if (legacyHeader) legacyHeader.style.display = 'none';
    const legacyStats = page.querySelector('.scorear-legacy-stats');
    if (legacyStats) legacyStats.style.display = 'none';
    if (!page.querySelector('.aurora') && ui().cosmicBackdrop) {
      page.insertAdjacentHTML('afterbegin', ui().cosmicBackdrop());
    }
    const state = getExtrasState();
    let topSlot = document.getElementById('journeyExtrasTop');
    if (!topSlot) { topSlot = document.createElement('div'); topSlot.id = 'journeyExtrasTop'; page.prepend(topSlot); }
    topSlot.innerHTML = renderExtrasTopHtml(state);
    const startBtn = document.getElementById('startDailyChallengeBtn');
    if (startBtn) startBtn.onclick = startDailyChallenge;
    const nbBtn = document.getElementById('openJourneyNotebookBtn');
    if (nbBtn) nbBtn.onclick = () => global.ScoreARMistakeNotebook?.openNotebook?.();
    topSlot.querySelectorAll('[data-companion-pick]').forEach(btn => { btn.onclick = () => setCompanionId(btn.getAttribute('data-companion-pick')); });
    let bottomSlot = document.getElementById('journeyExtrasBottom');
    if (!bottomSlot) { bottomSlot = document.createElement('div'); bottomSlot.id = 'journeyExtrasBottom'; page.appendChild(bottomSlot); }
    bottomSlot.innerHTML = renderExtrasBottomHtml(state);
    polishLegacyJourneyIcons(page);
  }

  const API = {
    getCairoDayKey, getDailyQuestions, completeDailyChallenge, recordAttempt, computeBadges,
    getExtrasState, setCompanionId, startDailyChallenge, closeDailyStage, renderExtrasTopHtml, renderExtrasBottomHtml, mount
  };
  global.ScoreARJourneyExtras = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
