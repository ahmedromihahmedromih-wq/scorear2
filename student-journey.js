/**
 * ScoreAR Student Journey Engine (student-journey.js) - Refactored Item 1
 * Dual Mode: Quiet Practice (Untimed) vs Room Contest (PIN-based)
 * Storage: Local-First (localStorage with schema versioning & corruption recovery)
 * Cloud Sync: Tagged as [قريباً] until student accounts are officially approved.
 * Anti-farming: XP awarded once per question + Daily Quiet XP Cap (150 XP).
 * Stable IDs: q_naat_01..05, q_rhetoric_01..04, q_spelling_01..04 (Deduplicated mistakes).
 * Architectural Note: XP is purely motivational client-side gamification.
 * Strictly Rule 7 Compliant (<500 lines).
 */
(function(global) {
  'use strict';

  const SCHEMA_VERSION = 'scorear_v2';
  const GUEST_STORAGE_KEY = 'scorear_student_guest_v1';
  const DAILY_QUIET_XP_CAP = 150;
  let memoryProgress = null;
  let activeQuietSession = null;

  const PRACTICE_TRACKS = [
    {
      id: 'grammar_naat',
      title: 'مسار النعت وأقسامه (المفرد والجملة)',
      skill: 'النحو العربي',
      icon: '📘',
      desc: 'تدريب هادئ على شروط النعت وتطابقه مع المنعوت، مع تطبيق عملي على الجمل بعد النكرات.',
      questions: [
        { id: 'q_naat_01', skill: 'النحو العربي', q: '«قرأتُ كتابًا ممتعًا». ما إعراب كلمة «ممتعًا» في الجملة؟', opts: ['نعت منصوب وعلامة نصبه الفتحة', 'حال منصوب وعلامة نصبه الفتحة', 'مفعول به ثانٍ منصوب', 'تمييز منصوب وعلامة نصبه الفتحة'], answer: 0, why: '«ممتعًا» اسم نكرة يصف اسماً نكرة قبله «كتابًا» ويتبعه في الإعراب (النصب) والتنكير والتذكير، فهو نعت حقيقي منصوب.' },
        { id: 'q_naat_02', skill: 'النحو العربي', q: 'أيّ من الجمل الآتية تشتمل على «نعت جملة فعلية»؟', opts: ['هذا بطلٌ تاريخيٌّ عظيم', 'قرأتُ قصةً تُثيرُ الخيالَ والتفكير', 'رأيتُ الطالبَ مسرعاً إلى فصله', 'إنّ الامتحانَ سهلٌ وميسور'], answer: 1, why: 'القاعدة الذهبية: الجمل بعد النكرات صفات. جملة «تُثير الخيال» جاءت بعد نكرة «قصةً» وفيها رابط يعود عليها.' },
        { id: 'q_naat_03', skill: 'النحو العربي', q: '«سكنتُ في بيتٍ حديقتُهُ واسعةٌ». ما المحل الإعرابي لجملة «حديقتُهُ واسعةٌ»؟', opts: ['في محل رفع خبر مبتدأ', 'في محل نصب حال', 'في محل جر نعت', 'في محل جزم جواب شرط'], answer: 2, why: 'المنعوت «بيتٍ» اسم مجرور نكرة، وجملة المبتدأ والخبر «حديقته واسعة» جاءت وصفاً له؛ لذا فهي في محل جر نعت.' },
        { id: 'q_naat_04', skill: 'النحو العربي', q: '«كرّمت المدرسةُ الطالبتينِ ...». اختر النعت المناسب لإكمال الجملة:', opts: ['المجتهدتانِ', 'المجتهدتينِ', 'المجتهداتِ', 'المجتهدونَ'], answer: 1, why: 'المنعوت «الطالبتين» مفعول به منصوب بالياء لأنه مثنى، والنعت يتبع المنعوت في الإعراب؛ لذا الصواب «المجتهدتينِ».' },
        { id: 'q_naat_05', skill: 'النحو العربي', q: '«العصفورُ فوقَ الشجرةِ يغرّدُ بجمالٍ». النعت شبه الجملة في هذه العبارة:', opts: ['فوقَ الشجرةِ', 'يغرّدُ', 'بجمالٍ', 'لا يوجد نعت في العبارة (شبه الجملة هنا خبر)'], answer: 3, why: 'دقة نحوية: «العصفور» معرفة وليس نكرة، وشبه الجملة «فوق الشجرة» وقع خبراً للمبتدأ وليس نعتاً؛ فالنعت يتبع منعوتاً نكرة.' }
      ]
    },
    {
      id: 'rhetoric_intro',
      title: 'مسار التشبيه والاستعارة (الجمال البلاغي)',
      skill: 'البلاغة والبيان',
      icon: '🎨',
      desc: 'استكشف الفروق الدقيقة بين التشبيه البليغ والاستعارات بنوعيها المكنية والتصريحية.',
      questions: [
        { id: 'q_rhetoric_01', skill: 'البلاغة والبيان', q: '«العلم نور يضيء الدروب». ما نوع الصورة البيانية في «العلم نور»؟', opts: ['تشبيه بليغ (مبتدأ وخبر)', 'استعارة تصريحية', 'تشبيه تمثيلي', 'كناية عن موصوف'], answer: 0, why: 'حُذفت أداة التشبيه ووجه الشبه، وبقي الطرفان الأساسيان (المشبه: العلم، والمشبه به: نور)؛ لذا فهو تشبيه بليغ.' },
        { id: 'q_rhetoric_02', skill: 'البلاغة والبيان', q: '«أقبلَ البحرُ يوزّع الهدايا على المتفوقين». ما نوع الاستعارة في كلمة «البحر»؟', opts: ['استعارة مكنية', 'استعارة تصريحية', 'تشبيه مجمل', 'مجاز مرسل'], answer: 1, why: 'شُبِّه الرجل الكريم بالبحر، وحُذف المشبه وصُرِّح بلفظ المشبه به؛ لذا فهي استعارة تصريحية.' },
        { id: 'q_rhetoric_03', skill: 'البلاغة والبيان', q: '«فلا تكن كالقوسِ يرمي بسهمِهِ ...». نوع التشبيه عند حذف وجه الشبه وبقاء الأداة:', opts: ['تشبيه مؤكد', 'تشبيه مجمل', 'تشبيه بليغ', 'تشبيه مقلوب'], answer: 1, why: 'التشبيه المجمل هو ما حُذف منه وجه الشبه مع بقاء أداة التشبيه.' },
        { id: 'q_rhetoric_04', skill: 'البلاغة والبيان', q: '«ابتسمت لنا الأيامُ بعد طولِ عناءٍ». سر الجمال البلاغي في الاستعارة المكنية هنا:', opts: ['التجسيم والتوضيح', 'التشخيص', 'التفخيم والمبالغة', 'الإيجاز بالحذف'], answer: 1, why: 'شُبّهت الأيام بإنسان يبتسم، ومنح الصفات البشرية لغير العاقل سر جماله التشخيص.' }
      ]
    },
    {
      id: 'spelling_rules',
      title: 'مسار قواعد الإملاء والرسم الكتابي',
      skill: 'الإملاء والرسم',
      icon: '✍️',
      desc: 'قواعد الهمزات المتطرفة والمتوسطة والألف اللينة مع تدريبات ترسيخ الفهم.',
      questions: [
        { id: 'q_spelling_01', skill: 'الإملاء والرسم', q: 'اختر الرسم الإملائي الصحيح: «إنّ ... يعتزون بلغتهم العربية».', opts: ['علمائنا', 'علماؤنا', 'علماءَنا', 'علماءُنا'], answer: 2, why: 'اسم «إنّ» يكون منصوباً، والهمزة المتطرفة إذا اتصل بها ضمير وكانت منصوبة كُتبت على السطر (علماءَنا).' },
        { id: 'q_spelling_02', skill: 'الإملاء والرسم', q: '«استمعَ الطالبُ لنصيحةِ معلّمه». نوع الهمزة في الفعل «استمعَ»:', opts: ['همزة وصل لأنه ماضٍ خماسي', 'همزة قطع لأنه ماضٍ سداسي', 'همزة وصل لأنه أمر ثلاثي', 'همزة قطع لأنه مضارع'], answer: 0, why: 'الفعل «استَمَعَ» ماضٍ خماسي (5 أحرف)، وماضي الخماسي وأمره ومصدره همزتها دائماً همزة وصل.' },
        { id: 'q_spelling_03', skill: 'الإملاء والرسم', q: 'اختر الكتابة الصحيحة لكلمة «...» في جملة: «قضى القاضي بالعدل بين الخصوم».', opts: ['قضى بالألف المقصورة (الياء المهملة)', 'قضا بالألف القائمة', 'قظى بالظاء', 'قضِ بحذف حرف العلة'], answer: 0, why: 'الفعل ثلاثي وأصل ألفه ياء (قضى - يقضي)؛ لذا تُكتب الألف اللينة مقصورة على صورة الياء.' },
        { id: 'q_spelling_04', skill: 'الإملاء والرسم', q: 'ما كتابة الهمزة في كلمة «دفء» عند تنوينها بالفتح؟', opts: ['دفءً (على السطر مع ألف)', 'دفئاً (على نبرة)', 'دفؤاً (على واو)', 'دفاءً'], answer: 1, why: 'الحرف الذي قبل الهمزة (الفاء) يتصل بما بعده؛ لذا تُكتب الهمزة عند التنوين بالفتح على نبرة (دفئاً).' }
      ]
    }
  ];

  function getTodayKey() { return new Date().toISOString().slice(0, 10); }

  function getCleanDefaultState() {
    const today = getTodayKey();
    return {
      xp: 0, solvedQuestionIds: {}, dailyQuietXp: { date: today, earned: 0 },
      completedPaths: {}, mistakes: [], streak: { count: 1, lastActiveDate: today, history: [today] },
      quietSessionsCount: 0, contestSessionsCount: 0, lastUpdated: Date.now()
    };
  }

  function sanitizeProgress(rawObj) {
    const def = getCleanDefaultState();
    if (!rawObj || typeof rawObj !== 'object') return def;
    const today = getTodayKey();
    const xpVal = Number(rawObj.xp);
    const daily = rawObj.dailyQuietXp && rawObj.dailyQuietXp.date === today ? rawObj.dailyQuietXp : { date: today, earned: 0 };
    return {
      xp: (!isNaN(xpVal) && xpVal >= 0) ? xpVal : 0,
      solvedQuestionIds: (rawObj.solvedQuestionIds && typeof rawObj.solvedQuestionIds === 'object') ? rawObj.solvedQuestionIds : {},
      dailyQuietXp: { date: today, earned: Number(daily.earned) || 0 },
      completedPaths: (rawObj.completedPaths && typeof rawObj.completedPaths === 'object') ? rawObj.completedPaths : {},
      mistakes: Array.isArray(rawObj.mistakes) ? rawObj.mistakes : [],
      streak: (rawObj.streak && typeof rawObj.streak === 'object') ? rawObj.streak : def.streak,
      quietSessionsCount: Number(rawObj.quietSessionsCount) || 0,
      contestSessionsCount: Number(rawObj.contestSessionsCount) || 0,
      lastUpdated: Number(rawObj.lastUpdated) || Date.now()
    };
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(GUEST_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          if (parsed.schemaVersion === SCHEMA_VERSION && parsed.data) {
            memoryProgress = sanitizeProgress(parsed.data);
            return memoryProgress;
          }
          if (parsed.schemaVersion === 'scorear_v1') {
            if (global.ScoreARMistakeNotebook && global.ScoreARMistakeNotebook.migrateV1ToV2) {
              const migrated = global.ScoreARMistakeNotebook.migrateV1ToV2(parsed);
              memoryProgress = sanitizeProgress(migrated);
              saveProgress(memoryProgress);
              return memoryProgress;
            }
          }
        }
      }
    } catch (err) { console.warn('[ScoreARJourney] Corrupt storage reset:', err); }
    memoryProgress = getCleanDefaultState();
    return memoryProgress;
  }

  function saveProgress(patch = {}) {
    if (!memoryProgress) memoryProgress = getCleanDefaultState();
    memoryProgress = sanitizeProgress({ ...memoryProgress, ...patch, lastUpdated: Date.now() });
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, data: memoryProgress }));
    } catch (err) { console.error('[ScoreARJourney] Local write failed:', err); }
    return memoryProgress;
  }

  function recordContestSession() {
    // Zero XP from room contests at this stage - strictly reserved for future multiplayer milestones
    return null;
  }

  function startQuietPractice(trackId) {
    const track = PRACTICE_TRACKS.find(t => t.id === trackId) || PRACTICE_TRACKS[0];
    activeQuietSession = {
      trackId: track.id, trackTitle: track.title, questions: track.questions,
      currentIndex: 0, correctCount: 0, xpGained: 0, hasAnswered: false, newMistakes: []
    };
    renderQuietSessionStage();
  }

  function getOrCreateQuietStage() {
    let el = document.getElementById('scorearQuietPracticeStage');
    if (!el) {
      el = document.createElement('div');
      el.id = 'scorearQuietPracticeStage';
      el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:radial-gradient(circle at 50% 15%, #181938 0%, #090a16 100%);color:#fff;font-family:Cairo,Tajawal,sans-serif;direction:rtl;display:flex;flex-direction:column;overflow-y:auto;';
      document.body.appendChild(el);
    }
    el.style.display = 'flex';
    return el;
  }

  function closeQuietPractice() {
    activeQuietSession = null;
    const el = document.getElementById('scorearQuietPracticeStage');
    if (el) el.style.display = 'none';
    if (typeof window !== 'undefined' && window.location && window.location.hash === '#journey') {
      const mainEl = document.getElementById('main');
      if (mainEl) mainEl.innerHTML = renderJourneyPage();
    }
  }

  function renderQuietSessionStage() {
    const s = activeQuietSession;
    if (!s) return;
    const stage = getOrCreateQuietStage();
    const q = s.questions[s.currentIndex];
    if (!q) { renderQuietSummary(stage); return; }

    const SHAPES = ['▲', '◆', '●', '■'];
    const BG_STYLES = [
      'background:linear-gradient(135deg,rgba(239,68,68,0.2),rgba(185,28,28,0.3));border-color:#ef4444;',
      'background:linear-gradient(135deg,rgba(59,130,246,0.2),rgba(29,78,216,0.3));border-color:#3b82f6;',
      'background:linear-gradient(135deg,rgba(245,158,11,0.2),rgba(180,83,9,0.3));border-color:#f59e0b;',
      'background:linear-gradient(135deg,rgba(16,185,129,0.2),rgba(4,120,87,0.3));border-color:#10b981;'
    ];

    stage.innerHTML = `
      <header style="padding:14px 22px;background:rgba(15,16,33,0.92);border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="background:rgba(142,100,239,0.2);color:#c9baff;border:1px solid #7550ef;border-radius:12px;padding:6px 14px;font-size:13px;font-weight:900;">🌿 تدريب هادئ (دون مؤقت)</span>
          <span style="font-size:15px;font-weight:800;color:#ffffff;">${s.trackTitle}</span>
        </div>
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="background:#13152c;border:1px solid rgba(255,255,255,0.12);padding:6px 14px;border-radius:12px;font-size:14px;font-weight:800;color:#52d9ed;">السؤال ${s.currentIndex + 1} من ${s.questions.length}</div>
          <div style="background:#13152c;border:1px solid #f59e0b;padding:6px 14px;border-radius:12px;font-size:14px;font-weight:900;color:#fcd34d;">⭐ +${s.xpGained} XP</div>
          <button onclick="ScoreARJourney.closeQuietPractice()" style="background:transparent;border:1px solid rgba(255,255,255,0.2);color:#ddd;padding:6px 14px;border-radius:10px;cursor:pointer;font-weight:700;">✕ خروج</button>
        </div>
      </header>
      <main style="max-width:860px;width:100%;margin:0 auto;padding:24px 20px;flex:1;display:flex;flex-direction:column;gap:18px;">
        <div style="background:rgba(117,80,239,0.12);border:1px solid rgba(142,100,239,0.3);border-radius:14px;padding:10px 18px;font-size:13px;color:#c9baff;">
          🕊️ <strong>خُذ كامل وقتك:</strong> لا يوجد عداد تنازلي هنا. فكّر بتأنٍّ واقرأ السؤال جيداً، فالهدف هو الفهم والاستيعاب.
        </div>
        <div style="background:rgba(21,23,49,0.85);border:2px solid rgba(255,255,255,0.1);border-radius:22px;padding:26px 22px;">
          <div style="display:inline-block;background:#272044;color:#52d9ed;padding:4px 14px;border-radius:10px;font-size:12px;font-weight:800;margin-bottom:12px;">${q.skill}</div>
          <h2 style="font-size:22px;line-height:1.6;font-weight:900;color:#ffffff;margin:0;">${q.q}</h2>
        </div>
        <div id="quietOptionsGrid" style="display:grid;grid-template-columns:1fr;gap:12px;">
          ${q.opts.map((opt, i) => `
            <button class="quiet-opt-btn" onclick="ScoreARJourney.handleOptionClick(${i})" style="display:flex;align-items:center;gap:14px;padding:18px 20px;border-radius:16px;${BG_STYLES[i % 4]};border-width:2px;border-style:solid;color:#ffffff;font-size:16px;font-weight:800;cursor:pointer;text-align:right;">
              <span style="font-size:18px;width:34px;height:34px;border-radius:10px;background:rgba(0,0,0,0.35);display:grid;place-items:center;">${SHAPES[i % 4]}</span>
              <span style="flex:1;">${opt}</span>
            </button>
          `).join('')}
        </div>
        <div id="quietFeedbackArea" style="display:none;margin-top:4px;"></div>
      </main>
    `;
  }

  function handleOptionClick(chosenIdx) {
    const s = activeQuietSession;
    if (!s || s.hasAnswered) return;
    s.hasAnswered = true;
    const q = s.questions[s.currentIndex];
    const isCorrect = (global.ScoreAREvaluator && global.ScoreAREvaluator.isCorrect)
      ? global.ScoreAREvaluator.isCorrect(q, chosenIdx)
      : (chosenIdx === q.answer);
    if (global.ScoreARStreak) global.ScoreARStreak.recordQuestionAnswered(q.id);

    const cur = memoryProgress || loadProgress();
    const alreadySolved = Boolean(cur.solvedQuestionIds && cur.solvedQuestionIds[q.id]);
    const dailyEarned = (cur.dailyQuietXp && cur.dailyQuietXp.earned) || 0;
    const isUnderCap = dailyEarned < DAILY_QUIET_XP_CAP;

    let xpNote = '';
    if (isCorrect) {
      s.correctCount++;
      if (!alreadySolved && isUnderCap) {
        s.xpGained += 15;
        xpNote = '👏 أحسنت صنعاً! إجابة دقيقة (+15 XP)';
      } else if (alreadySolved) {
        xpNote = '👏 أحسنت! إجابة صحيحة (سؤال مُتقن سابقاً — للمراجعة 0 XP)';
      } else {
        xpNote = '👏 أحسنت! إجابة صحيحة (وصلت للسقف اليومي 150 XP)';
      }
    } else {
      if (global.ScoreARMistakeNotebook && global.ScoreARMistakeNotebook.recordMistake) {
        global.ScoreARMistakeNotebook.recordMistake({
          id: q.id, q: q.q, skill: q.skill, pathId: s.trackId, opts: q.opts, answer: q.answer, why: q.why
        }, q.opts[chosenIdx]);
      }
      s.newMistakes.push({ questionId: q.id });
      xpNote = '💡 محاولة طيبة! تعلّم من الخطأ واقرأ الشرح أدناه (حُفظ السؤال في دفتر أخطائك)';
    }

    document.querySelectorAll('.quiet-opt-btn').forEach((b, i) => {
      b.style.pointerEvents = 'none';
      if (i === q.answer) {
        b.style.background = '#10b981'; b.style.borderColor = '#34d399'; b.style.boxShadow = '0 0 25px rgba(16,185,129,0.5)';
      } else if (i === chosenIdx && !isCorrect) {
        b.style.background = '#ef4444'; b.style.borderColor = '#f87171'; b.style.opacity = '0.7';
      } else { b.style.opacity = '0.35'; }
    });

    const fb = document.getElementById('quietFeedbackArea');
    if (fb) {
      fb.style.display = 'block';
      fb.innerHTML = `
        <div style="background:rgba(21,23,49,0.95);border:2px solid ${isCorrect ? '#10b981' : '#f59e0b'};border-radius:20px;padding:22px;display:flex;flex-direction:column;gap:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
            <div style="font-size:17px;font-weight:900;color:${isCorrect ? '#34d399' : '#fcd34d'};">${xpNote}</div>
            <button onclick="ScoreARJourney.nextQuestion()" style="background:linear-gradient(135deg, #8e64ef, #6a34e8);color:#fff;border:none;border-radius:12px;padding:10px 24px;font-size:15px;font-weight:900;cursor:pointer;box-shadow:0 6px 18px rgba(117,80,239,0.4);">
              ${s.currentIndex + 1 < s.questions.length ? 'السؤال التالي ⬅' : 'إتمام التدريب وعرض النتيجة ✨'}
            </button>
          </div>
          <div style="background:#13152a;border-radius:12px;padding:14px 18px;border-right:4px solid #7550ef;">
            <div style="font-size:13px;font-weight:900;color:#c9baff;margin-bottom:4px;">🔍 لماذا هذه هي الإجابة الصحيحة؟</div>
            <div style="font-size:14px;color:#e2e0f0;line-height:1.7;">${q.why}</div>
          </div>
        </div>
      `;
    }
  }

  function nextQuestion() {
    const s = activeQuietSession;
    if (!s) return;
    s.currentIndex++;
    s.hasAnswered = false;
    renderQuietSessionStage();
  }

  function renderQuietSummary(stage) {
    const s = activeQuietSession;
    const cur = memoryProgress || loadProgress();
    const isFirstTimePath = !cur.completedPaths || !cur.completedPaths[s.trackId];
    const pathBonus = isFirstTimePath ? ((s.correctCount === s.questions.length) ? 30 : 15) : 0;
    const sessionTotalXp = s.xpGained + pathBonus;

    const solvedMap = { ...(cur.solvedQuestionIds || {}) };
    s.questions.forEach((q, idx) => { if (idx < s.correctCount) solvedMap[q.id] = true; });

    const completedPaths = { ...(cur.completedPaths || {}) };
    completedPaths[s.trackId] = { completedAt: Date.now(), score: s.correctCount, total: s.questions.length, trackTitle: s.trackTitle };

    const today = getTodayKey();
    const curDaily = cur.dailyQuietXp && cur.dailyQuietXp.date === today ? cur.dailyQuietXp.earned : 0;

    if (global.ScoreARStreak) global.ScoreARStreak.recordPathCompleted(s.trackId);

    saveProgress({
      xp: cur.xp + sessionTotalXp,
      solvedQuestionIds: solvedMap,
      dailyQuietXp: { date: today, earned: curDaily + sessionTotalXp },
      completedPaths,
      quietSessionsCount: cur.quietSessionsCount + 1
    });

    if (typeof window !== 'undefined' && window.confetti) window.confetti({ particleCount: 60, spread: 70 });

    stage.innerHTML = `
      <main style="max-width:620px;width:100%;margin:auto;padding:30px 20px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:18px;">
        <div style="font-size:54px;">🎉</div>
        <h2 style="font-size:26px;font-weight:900;color:#ffffff;margin:0;">بارك الله في همتك! أتممت المسار</h2>
        <p style="color:#c9baff;font-size:15px;margin:0;">أتممت تدريب <strong>«${s.trackTitle}»</strong> بهدوء وتركيز.</p>
        <div style="background:rgba(21,23,49,0.9);border:2px solid #7550ef;border-radius:22px;padding:24px;width:100%;display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div style="background:#13152c;padding:16px;border-radius:14px;">
            <div style="font-size:12px;color:#a89bff;">الإجابات الصحيحة</div>
            <div style="font-size:28px;font-weight:900;color:#34d399;">${s.correctCount} / ${s.questions.length}</div>
          </div>
          <div style="background:#13152c;padding:16px;border-radius:14px;">
            <div style="font-size:12px;color:#a89bff;">نقاط الخبرة التحفيزية</div>
            <div style="font-size:28px;font-weight:900;color:#fcd34d;">+${sessionTotalXp} XP</div>
          </div>
        </div>
        ${s.newMistakes.length > 0 ? `
          <div style="background:rgba(245,158,11,0.12);border:1px solid #f59e0b;border-radius:14px;padding:12px 18px;font-size:13px;color:#fcd34d;text-align:right;width:100%;">
            📖 تم توثيق <strong>${s.newMistakes.length}</strong> سؤال في «دفتر أخطائي» بمعرفات معتمدة لمراجعتها لاحقاً.
          </div>
        ` : `
          <div style="background:rgba(16,185,129,0.12);border:1px solid #10b981;border-radius:14px;padding:12px 18px;font-size:13px;color:#34d399;width:100%;">
            🌟 أداء متقن! لا توجد أخطاء مسجلة، استمر في تفوقك!
          </div>
        `}
        <div style="display:flex;gap:12px;margin-top:10px;flex-wrap:wrap;justify-content:center;">
          <button onclick="ScoreARJourney.startQuietPractice('${s.trackId}')" style="background:#272044;color:#ddd8ff;border:1px solid #8e64ef;padding:12px 24px;border-radius:14px;font-size:15px;font-weight:800;cursor:pointer;">إعادة التدريب 🔄</button>
          <button onclick="ScoreARJourney.closeQuietPractice()" style="background:linear-gradient(135deg, #8e64ef, #6a34e8);color:#fff;border:none;padding:12px 28px;border-radius:14px;font-size:15px;font-weight:900;cursor:pointer;">العودة لرحلتي التعليمية 🗺️</button>
        </div>
      </main>
    `;
  }

  function renderJourneyPage() {
    const p = memoryProgress || loadProgress();
    const donePathsCount = Object.keys(p.completedPaths || {}).length;
    const mistakesCount = (p.mistakes || []).filter(m => !m.archived && !m.mastered).length;

    return `
      <div class="page" style="max-width:1080px;margin:0 auto;padding-bottom:50px;">
        <div class="page-title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:28px;">
          <div>
            <div class="eyebrow" style="color:#52d9ed;font-weight:900;font-size:13px;">مساحة الطالب التعليمية</div>
            <h1 style="font-size:32px;font-weight:900;color:#ffffff;margin:6px 0;">رحلتي التعليمية: تعلّم بعمق ونافس بشغف</h1>
            <p style="color:#a89bff;font-size:14px;margin:0;">فصل تام بين التدريب الهادئ المتأني ومنافسة القاعة الحية مع رصد حقيقي ودائم لتقدمك.</p>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <span style="background:rgba(142,100,239,0.15);color:#c9baff;border:1px solid #7550ef;border-radius:14px;padding:8px 16px;font-size:13px;font-weight:800;display:inline-flex;align-items:center;gap:8px;">
              📱 التخزين المحلي النشط (وضع الضيف)
            </span>
            <span style="background:rgba(255,255,255,0.05);color:#8e8ca8;border:1px dashed rgba(255,255,255,0.18);border-radius:14px;padding:8px 14px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
              ☁️ المزامنة السحابية <small style="background:#272044;color:#ffb74d;padding:2px 8px;border-radius:6px;font-weight:800;">قريباً</small>
            </span>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(210px, 1fr));gap:16px;margin-bottom:34px;">
          <div style="background:rgba(21,23,49,0.85);border:2px solid rgba(255,255,255,0.08);border-radius:18px;padding:20px;text-align:right;">
            <div style="font-size:12px;color:#a89bff;font-weight:700;">نقاط الخبرة التحفيزية (XP)</div>
            <div style="font-size:34px;font-weight:900;color:#fcd34d;margin:4px 0;">${p.xp}</div>
            <div style="font-size:11px;color:#a89bff;">نقاط تحفيزية محلية لتشجيعك على الممارسة</div>
          </div>
          <div style="background:rgba(21,23,49,0.85);border:2px solid rgba(255,255,255,0.08);border-radius:18px;padding:20px;text-align:right;">
            <div style="font-size:12px;color:#a89bff;font-weight:700;">المسارات المكتملة</div>
            <div style="font-size:34px;font-weight:900;color:#52d9ed;margin:4px 0;">${donePathsCount} / ${PRACTICE_TRACKS.length}</div>
            <div style="font-size:12px;color:#c9baff;">مسارات أتقنتها بالتدريب الهادئ</div>
          </div>
          <div onclick="if(window.ScoreARMistakeNotebook) ScoreARMistakeNotebook.openNotebook()" style="background:rgba(21,23,49,0.85);border:2px solid rgba(255,255,255,0.08);border-radius:18px;padding:20px;text-align:right;cursor:pointer;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div style="font-size:12px;color:#a89bff;font-weight:700;">دفتر أخطائي</div>
              <span style="font-size:11px;background:#272044;color:#52d9ed;padding:2px 8px;border-radius:6px;font-weight:800;">فتح الدفتر 📖</span>
            </div>
            <div style="font-size:34px;font-weight:900;color:#f87171;margin:4px 0;">${mistakesCount}</div>
            <div style="font-size:12px;color:#fcd34d;">أسئلة تحتاج مراجعة وإعادة حل (اضغط للمراجعة)</div>
          </div>
        </div>

        <div id="scorearStreakContainer">
          ${global.ScoreARStreak ? global.ScoreARStreak.renderStreakCard() : ''}
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 275px), 1fr));gap:20px;margin-bottom:38px;">
          <div style="background:radial-gradient(circle at top right, rgba(16,185,129,0.12), rgba(21,23,49,0.95));border:2px solid #10b981;border-radius:24px;padding:28px;display:flex;flex-direction:column;justify-content:space-between;gap:20px;">
            <div>
              <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(16,185,129,0.2);color:#34d399;padding:6px 14px;border-radius:12px;font-size:13px;font-weight:900;margin-bottom:12px;">
                🌿 ركن التدريب الهادئ (بدون مؤقت)
              </div>
              <h3 style="font-size:22px;font-weight:900;color:#ffffff;margin:0 0 8px 0;">تعلّم بتأنٍّ وافهم بعمق</h3>
              <p style="color:#c9baff;font-size:14px;line-height:1.7;margin:0;">مساحة هادئة بدون أي ضغط زمني. اقرأ السؤال، فكّر بحرية، واطلع على الشروحات النحوية والبلاغية الفورية لكل إجابة لترسيخ المفاهيم.</p>
            </div>
            <div>
              <button onclick="ScoreARJourney.scrollToTracks()" style="background:#10b981;color:#090a16;font-weight:900;font-size:15px;border:none;border-radius:14px;padding:12px 24px;cursor:pointer;">
                استكشف المسارات وابدأ 🌿
              </button>
            </div>
          </div>
          <div style="background:radial-gradient(circle at top right, rgba(142,100,239,0.18), rgba(21,23,49,0.95));border:2px solid #8e64ef;border-radius:24px;padding:28px;display:flex;flex-direction:column;justify-content:space-between;gap:20px;">
            <div>
              <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(142,100,239,0.25);color:#d4baff;padding:6px 14px;border-radius:12px;font-size:13px;font-weight:900;margin-bottom:12px;">
                ⚡ ركن منافسة القاعة الحية
              </div>
              <h3 style="font-size:22px;font-weight:900;color:#ffffff;margin:0 0 8px 0;">تحدَّ زملاءك بالسرعة والنقاط</h3>
              <p style="color:#c9baff;font-size:14px;line-height:1.7;margin:0;">أجواء حماسية في قاعة معلمك. أجب بسرعة قبل انتهاء العداد وتنافس للوصول لمنصة التتويج مع حفظ نقاطك في سجلك.</p>
            </div>
            <div>
              <button onclick="document.querySelector('[data-action=join]').click()" style="background:linear-gradient(135deg, #8e64ef, #6a34e8);color:#fff;font-weight:900;font-size:15px;border:none;border-radius:14px;padding:12px 24px;cursor:pointer;">
                أدخل رمز القاعة (PIN) ⚡
              </button>
            </div>
          </div>
        </div>

        <div id="practiceTracksSection" style="margin-top:20px;">
          <h2 style="font-size:22px;font-weight:900;color:#ffffff;margin-bottom:16px;display:flex;align-items:center;gap:10px;">
            <span>📚 مسارات التدريب الهادئ المتاحة</span>
            <span style="font-size:13px;color:#a89bff;font-weight:600;">(اختر مساراً وابدأ دون أي مؤقت)</span>
          </h2>
          <div style="display:flex;flex-direction:column;gap:14px;">
            ${PRACTICE_TRACKS.map(t => {
              const comp = p.completedPaths && p.completedPaths[t.id];
              return `
                <div style="background:rgba(21,23,49,0.9);border:1.5px solid ${comp ? '#10b981' : 'rgba(255,255,255,0.1)'};border-radius:18px;padding:22px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
                  <div style="display:flex;align-items:center;gap:16px;max-width:680px;">
                    <span style="width:48px;height:48px;border-radius:14px;background:#262044;color:#c9baff;display:grid;place-items:center;font-size:22px;">${t.icon}</span>
                    <div>
                      <div style="display:flex;align-items:center;gap:10px;">
                        <h3 style="color:#ffffff;font-size:17px;font-weight:800;margin:0;">${t.title}</h3>
                        ${comp ? '<span style="background:rgba(16,185,129,0.2);color:#34d399;padding:2px 10px;border-radius:8px;font-size:11px;font-weight:800;">مكتمل ✓</span>' : ''}
                      </div>
                      <p style="color:#a1a4be;font-size:13px;margin:4px 0 0 0;">${t.desc}</p>
                    </div>
                  </div>
                  <div style="display:flex;align-items:center;gap:12px;">
                    <span style="font-size:12px;color:#a89bff;font-weight:700;">${t.questions.length} أسئلة</span>
                    <button onclick="ScoreARJourney.startQuietPractice('${t.id}')" style="background:${comp ? '#272044' : '#10b981'};color:${comp ? '#ddd8ff' : '#090a16'};font-weight:900;font-size:14px;border:${comp ? '1px solid #8e64ef' : 'none'};border-radius:12px;padding:10px 20px;cursor:pointer;">
                      ${comp ? 'إعادة التدريب 🔄' : 'بدء التدريب الهادئ 🌿'}
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function scrollToTracks() {
    const el = document.getElementById('practiceTracksSection');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  if (typeof window !== 'undefined') {
    loadProgress();
  }

  global.ScoreARJourney = {
    loadProgress,
    saveProgress,
    getProgress: () => (memoryProgress || loadProgress()),
    recordContestSession,
    startQuietPractice,
    closeQuietPractice,
    handleOptionClick,
    nextQuestion,
    renderJourneyPage,
    scrollToTracks,
    PRACTICE_TRACKS
  };

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
