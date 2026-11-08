/**
 * ScoreAR Reports Studio (Analytics, Accuracy, Attention Needed & Resume Work)
 * Item 5: Question accuracy per session, Attention needed widget (<60% sorted), Resume work draft tracker, Zero mock numbers.
 */
(function (global) {
  'use strict';

  let currentTab = 'sessions'; // 'sessions' | 'attention' | 'drafts'
  let cachedSessions = [];
  let cachedQuizzes = [];
  let currentUid = null;

  function getDb() {
    return (global.firebase && global.firebase.database) ? global.firebase.database() : null;
  }
  function getAuth() {
    return (global.firebase && global.firebase.auth) ? global.firebase.auth() : null;
  }
  function escapeHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function ensureAuthUser() {
    const a = getAuth();
    if (a && a.currentUser) {
      currentUid = a.currentUser.uid;
      return currentUid;
    }
    return null;
  }

  // --- 1. Data Fetching ---
  async function refreshReportsData() {
    await ensureAuthUser();
    const db = getDb();
    if (!db) return;

    try {
      // Fetch completed sessions
      const sSnap = await db.ref('scorear_completed_sessions').limitToLast(50).once('value');
      const sVal = sSnap.val() || {};
      cachedSessions = Object.entries(sVal).map(([k, v]) => ({ id: k, ...v }));
      // Sort newest first
      cachedSessions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      // Filter sessions for this teacher if hostUid is present, or keep all if unassigned
      if (currentUid) {
        cachedSessions = cachedSessions.filter(s => !s.hostUid || s.hostUid === currentUid);
      }

      // Fetch teacher quizzes to find drafts for "Resume Work"
      const qSnap = await db.ref('scorear_quizzes').once('value');
      const qVal = qSnap.val() || {};
      cachedQuizzes = Object.entries(qVal).map(([k, v]) => ({ id: k, ...v }));
      if (currentUid) {
        cachedQuizzes = cachedQuizzes.filter(q => q.ownerUid === currentUid);
      }
      cachedQuizzes.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

    } catch (e) {
      console.warn('Reports data fetch warning:', e);
    }
  }

  // --- 2. Modal Stage Management ---
  function getOrCreateReportsModal() {
    let m = document.getElementById('scorearReportsModal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'scorearReportsModal';
      m.style.cssText = 'position:fixed;inset:0;background:rgba(5,6,15,0.92);backdrop-filter:blur(10px);z-index:99999;display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;direction:rtl;font-family:inherit;';
      document.body.appendChild(m);
    }
    return m;
  }

  async function openReportsHub(tab = 'sessions') {
    currentTab = tab;
    const m = getOrCreateReportsModal();
    m.style.display = 'flex';
    await refreshReportsData();
    renderReportsView();
  }

  function closeReportsHub() {
    const m = document.getElementById('scorearReportsModal');
    if (m) m.style.display = 'none';
  }

  // --- 3. View Renderer ---
  function renderReportsView() {
    const m = getOrCreateReportsModal();
    const attentionQuestions = getAttentionNeededQuestions();
    const draftQuizzes = getResumeWorkDrafts();

    m.innerHTML = `
      <div style="background:#101124;border:2px solid #7550ef;box-shadow:0 0 50px rgba(117,80,239,0.4);border-radius:24px;width:100%;max-width:1100px;overflow:hidden;display:flex;flex-direction:column;max-height:94vh;">
        <!-- Header -->
        <header style="background:#171836;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(142,100,239,0.3);flex-wrap:wrap;gap:12px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg, #7550ef, #4338ca);display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 0 15px rgba(117,80,239,0.4);">📊</div>
            <div>
              <h2 style="color:#ffffff;font-size:18px;font-weight:900;margin:0;">استوديو تقارير القاعة والنتائج</h2>
              <p style="color:#a1a4be;font-size:12px;margin:2px 0 0 0;">نسب الصواب المحسوبة من إجابات الطلاب الفعلية، ومتابعة العمل.</p>
            </div>
          </div>

          <!-- Navigation Tabs -->
          <div style="display:flex;background:#181938;padding:4px;border-radius:12px;border:1px solid rgba(142,100,239,0.3);">
            <button onclick="ScoreARQuizReports.switchTab('sessions')" style="background:${currentTab==='sessions'?'#7550ef':'transparent'};color:${currentTab==='sessions'?'#fff':'#a1a4be'};border:none;padding:6px 14px;border-radius:8px;font-weight:900;font-size:12px;cursor:pointer;">📈 الجلسات (${cachedSessions.length})</button>
            <button onclick="ScoreARQuizReports.switchTab('attention')" style="background:${currentTab==='attention'?'#ef4444':'transparent'};color:${currentTab==='attention'?'#fff':'#a1a4be'};border:none;padding:6px 14px;border-radius:8px;font-weight:900;font-size:12px;cursor:pointer;">⚠️ تحتاج انتباهك (${attentionQuestions.length})</button>
            <button onclick="ScoreARQuizReports.switchTab('drafts')" style="background:${currentTab==='drafts'?'#10b981':'transparent'};color:${currentTab==='drafts'?'#fff':'#a1a4be'};border:none;padding:6px 14px;border-radius:8px;font-weight:900;font-size:12px;cursor:pointer;">📝 أكمل عملك (${draftQuizzes.length})</button>
          </div>

          <button onclick="ScoreARQuizReports.closeReportsHub()" style="background:none;border:none;color:#9ca3af;font-size:22px;cursor:pointer;padding:2px 8px;">✕</button>
        </header>

        <!-- Main Body -->
        <main style="padding:20px;overflow-y:auto;flex:1;background:#0e0f22;">
          ${currentTab === 'sessions' ? renderSessionsTabHtml() : currentTab === 'attention' ? renderAttentionTabHtml(attentionQuestions) : renderDraftsTabHtml(draftQuizzes)}
        </main>
      </div>
    `;
  }

  // --- 4. Tab 1: Sessions & Accuracy Breakdown ---
  function renderSessionsTabHtml() {
    if (!cachedSessions.length) {
      return `
        <div style="text-align:center;padding:60px 20px;background:#14152e;border:1px dashed rgba(142,100,239,0.4);border-radius:20px;">
          <div style="font-size:48px;margin-bottom:12px;">🎮</div>
          <h3 style="color:#fff;font-size:16px;font-weight:800;margin:0 0 8px 0;">لا توجد جلسات لعب مسجلة بعد</h3>
          <p style="color:#94a3b8;font-size:13px;max-width:480px;margin:0 auto 16px auto;line-height:1.6;">
            عند انطلاق أي مسابقة في القاعة وتنافس الطلاب على هواتفهم، ستظهر لك هنا نسب صواب كل سؤال، والأبطال المتوجين، وتحليلات الأداء الفعلية!
          </p>
          <button onclick="ScoreARQuizReports.closeReportsHub(); renderLiveLobby('royal', currentLobbyPin);" style="background:linear-gradient(135deg, #7550ef, #582cd1);color:#fff;border:none;padding:10px 22px;border-radius:12px;font-size:13px;font-weight:900;cursor:pointer;">
            ابدأ قاعة اختبار الآن 🚀
          </button>
        </div>
      `;
    }

    return `
      <div style="display:flex;flex-direction:column;gap:18px;">
        <!-- Global Quick Stats (Strictly calculated, zero mock numbers) -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;">
          <div style="background:#16183a;border:1px solid rgba(142,100,239,0.3);border-radius:16px;padding:14px;text-align:center;">
            <span style="color:#a89bff;font-size:12px;font-weight:800;">إجمالي الجلسات الملعوبة</span>
            <div style="color:#fff;font-size:26px;font-weight:900;margin-top:4px;">${cachedSessions.length}</div>
          </div>
          <div style="background:#16183a;border:1px solid rgba(142,100,239,0.3);border-radius:16px;padding:14px;text-align:center;">
            <span style="color:#a89bff;font-size:12px;font-weight:800;">إجمالي الطلاب المتفاعلين</span>
            <div style="color:#52d9ed;font-size:26px;font-weight:900;margin-top:4px;">${cachedSessions.reduce((acc, s) => acc + (s.totalStudents || 0), 0)}</div>
          </div>
          <div style="background:#16183a;border:1px solid rgba(142,100,239,0.3);border-radius:16px;padding:14px;text-align:center;">
            <span style="color:#a89bff;font-size:12px;font-weight:800;">متوسط دقة الطلاب العام</span>
            <div style="color:#34d399;font-size:26px;font-weight:900;margin-top:4px;">${calculateOverallAccuracy()}%</div>
          </div>
        </div>

        <!-- Formula Documentation Banner -->
        <div style="background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#c7d2fe;flex-wrap:wrap;gap:8px;">
          <span style="font-weight:800;">📐 معادلة احتساب النقاط المعتمدة:</span>
          <code style="background:rgba(0,0,0,0.35);padding:3px 10px;border-radius:6px;color:#fcd34d;font-family:monospace;font-weight:900;">نقاط = الأساس × عامل الزمن × المضاعف</code>
          <span style="font-size:11px;color:#94a3b8;">(عامل الزمن يتراوح بين 0.5 و 1.0 حسب سرعة الإجابة)</span>
        </div>

        <!-- Sessions List -->
        <div style="display:flex;flex-direction:column;gap:14px;">
          ${cachedSessions.map((s, sIdx) => {
            const dateStr = s.createdAt ? new Date(s.createdAt).toLocaleString('ar-EG') : 'جلسة حديثة';
            const top = s.top3 || [];
            const qStats = s.questionStats || [];

            return `
              <div style="background:#14152e;border:1px solid rgba(142,100,239,0.3);border-radius:18px;padding:16px;overflow:hidden;">
                <!-- Session Header -->
                <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:12px;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
                  <div>
                    <h3 style="color:#fff;font-size:15px;font-weight:900;margin:0;">${escapeHtml(s.quizTitle || 'مسابقة سكور آر')}</h3>
                    <div style="color:#94a3b8;font-size:11px;margin-top:3px;">
                      <span>📅 ${dateStr}</span> • <span style="color:#52d9ed;">🔑 رمز القاعة: ${s.pin || '---'}</span> • <span>👥 ${s.totalStudents || 0} طلاب</span>
                    </div>
                  </div>

                  <!-- Podium Pills -->
                  ${top.length > 0 ? `
                    <div style="display:flex;gap:6px;align-items:center;">
                      ${top.map((p, pIdx) => `
                        <div style="background:#1b1d3d;border:1px solid rgba(255,255,255,0.1);padding:3px 8px;border-radius:10px;display:flex;align-items:center;gap:4px;font-size:11px;">
                          <span>${pIdx === 0 ? '🥇' : pIdx === 1 ? '🥈' : '🥉'}</span>
                          <span style="color:#fff;font-weight:800;">${escapeHtml(p.name)}</span>
                          <span style="color:#fcd34d;font-size:10px;">(${p.score || 0}ن)</span>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>

                <!-- Questions Accuracy Breakdown -->
                ${qStats.length > 0 ? `
                  <div style="display:flex;flex-direction:column;gap:8px;">
                    <span style="color:#a89bff;font-size:12px;font-weight:800;">نسبة الصواب لكل سؤال من إجابات الطلاب الفعلية:</span>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:8px;">
                      ${qStats.map((q, qIdx) => {
                        const acc = q.accuracy || 0;
                        const barColor = acc >= 75 ? '#10b981' : (acc >= 60 ? '#f59e0b' : '#ef4444');
                        return `
                          <div style="background:#191b38;border:1px solid ${acc < 60 ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.06)'};border-radius:12px;padding:10px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                              <span style="color:#fff;font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;" title="${escapeHtml(q.questionText)}">
                                ${qIdx + 1}. ${escapeHtml(q.questionText)}
                              </span>
                              <span style="color:${barColor};font-size:12px;font-weight:900;">${acc}%</span>
                            </div>
                            <div style="background:#101124;border-radius:6px;height:6px;overflow:hidden;margin-bottom:6px;">
                              <div style="background:${barColor};width:${acc}%;height:100%;"></div>
                            </div>
                            <div style="display:flex;justify-content:space-between;color:#94a3b8;font-size:10px;">
                              <span>✓ صواب: ${q.correctAnswers || 0}</span>
                              <span>✕ خطأ: ${q.wrongAnswers || 0}</span>
                              <span>المجموع: ${q.totalAnswers || 0}</span>
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                ` : `
                  <div style="color:#94a3b8;font-size:11px;font-style:italic;">تم إنهاء الجلسة دون إجابات مفصلة.</div>
                `}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function calculateOverallAccuracy() {
    let totalAns = 0;
    let correctAns = 0;
    cachedSessions.forEach(s => {
      (s.questionStats || []).forEach(q => {
        totalAns += (q.totalAnswers || 0);
        correctAns += (q.correctAnswers || 0);
      });
    });
    return totalAns > 0 ? Math.round((correctAns / totalAns) * 100) : 100;
  }

  // --- 5. Tab 2: Attention Needed (< 60% Accuracy, Sorted Ascending) ---
  function getAttentionNeededQuestions() {
    const list = [];
    cachedSessions.forEach(s => {
      (s.questionStats || []).forEach(q => {
        if ((q.accuracy || 0) < 60 && (q.totalAnswers || 0) > 0) {
          list.push({
            ...q,
            sessionTitle: s.quizTitle || 'مسابقة بدون عنوان',
            sessionPin: s.pin,
            sessionDate: s.createdAt
          });
        }
      });
    });

    // Sort ascending: weakest accuracy first (e.g. 15% before 45%)
    list.sort((a, b) => (a.accuracy || 0) - (b.accuracy || 0));
    return list;
  }

  function renderAttentionTabHtml(questions) {
    if (!questions.length) {
      return `
        <div style="text-align:center;padding:60px 20px;background:#14152e;border:1px dashed rgba(16,185,129,0.4);border-radius:20px;">
          <div style="font-size:48px;margin-bottom:12px;">🎉</div>
          <h3 style="color:#34d399;font-size:16px;font-weight:800;margin:0 0 8px 0;">رائع جداً! لا توجد أسئلة تحتاج انتباهك حالياً</h3>
          <p style="color:#cbd5e1;font-size:13px;max-width:500px;margin:0 auto;line-height:1.6;">
            كافة الأسئلة التي لعبها الطلاب في جلساتك حققت نسبة صواب 60% فأكثر، أو لم يتم تسجيل إجابات ضعيفة بعد. استمر في هذا التميز!
          </p>
        </div>
      `;
    }

    return `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="background:rgba(239,68,68,0.12);border:1px solid #ef4444;border-radius:14px;padding:12px 18px;color:#fca5a5;font-size:12px;font-weight:800;display:flex;align-items:center;gap:10px;">
          <span>⚠️ ودجت التنبيه:</span>
          <span>هذه الأسئلة حقق الطلاب فيها نسبة صواب أقل من 60%، مرتبة من الأضعف أولاً لمراجعتها وتعديلها.</span>
        </div>

        <div style="display:grid;grid-template-columns:1fr;gap:12px;">
          ${questions.map((q, idx) => `
            <div style="background:#151631;border:2px solid rgba(239,68,68,0.4);border-radius:16px;padding:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;">
              <div style="flex:1;min-width:280px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                  <span style="background:#ef4444;color:#fff;font-size:11px;font-weight:900;padding:2px 8px;border-radius:8px;">
                    نسبة الصواب: ${q.accuracy}% ⚠️
                  </span>
                  <span style="color:#94a3b8;font-size:11px;">في: ${escapeHtml(q.sessionTitle)} (قاعة ${q.sessionPin || '---'})</span>
                </div>
                <h4 style="color:#fff;font-size:14px;font-weight:800;margin:0 0 8px 0;">${escapeHtml(q.questionText)}</h4>
                <div style="display:flex;gap:12px;color:#cbd5e1;font-size:11px;">
                  <span>✓ أجاب صواب: <strong style="color:#34d399;">${q.correctAnswers}</strong></span>
                  <span>✕ أخطأ فيه: <strong style="color:#f87171;">${q.wrongAnswers} طلاب</strong></span>
                </div>
              </div>

              <div>
                <button onclick="ScoreARQuizReports.editWeakQuestion('${q.questionId}')" style="background:#7550ef;color:#fff;border:none;padding:8px 16px;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px;">
                  <span>✏️ تعديل السؤال</span>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // --- 6. Tab 3: Resume Work (Unfinished Drafts) ---
  function getResumeWorkDrafts() {
    // Return recent quizzes or drafts
    return cachedQuizzes.slice(0, 10);
  }

  function renderDraftsTabHtml(drafts) {
    if (!drafts.length) {
      return `
        <div style="text-align:center;padding:60px 20px;background:#14152e;border:1px dashed rgba(142,100,239,0.4);border-radius:20px;">
          <div style="font-size:48px;margin-bottom:12px;">📁</div>
          <h3 style="color:#fff;font-size:16px;font-weight:800;margin:0 0 8px 0;">لا توجد مسودات غير مكتملة حالياً</h3>
          <p style="color:#94a3b8;font-size:13px;max-width:480px;margin:0 auto 16px auto;">
            يمكنك إنشاء مسابقة جديدة الآن من الصفر أو عبر استيراد Excel أو الذكاء الاصطناعي!
          </p>
          <button onclick="ScoreARQuizReports.closeReportsHub(); openToolModal('builder');" style="background:linear-gradient(135deg, #7550ef, #582cd1);color:#fff;border:none;padding:10px 22px;border-radius:12px;font-size:13px;font-weight:900;cursor:pointer;">
            + أنشئ مسابقة جديدة 🚀
          </button>
        </div>
      `;
    }

    return `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="background:rgba(16,185,129,0.12);border:1px solid #10b981;border-radius:14px;padding:12px 18px;color:#a7f3d0;font-size:12px;font-weight:800;display:flex;align-items:center;gap:10px;">
          <span>📝 ودجت «أكمل عملك»:</span>
          <span>تابع تحرير آخر المسابقات والمسودات المفتوحة بنقرة زر واحدة.</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:12px;">
          ${drafts.map(q => {
            const qCount = Array.isArray(q.questions) ? q.questions.length : 0;
            const updatedStr = q.updatedAt ? new Date(q.updatedAt).toLocaleDateString('ar-EG') : 'حديثاً';
            return `
              <div style="background:#151631;border:1px solid rgba(142,100,239,0.3);border-radius:16px;padding:16px;display:flex;flex-direction:column;justify-content:space-between;gap:12px;">
                <div>
                  <h4 style="color:#fff;font-size:14px;font-weight:900;margin:0 0 6px 0;">${escapeHtml(q.title || 'مسابقة بدون عنوان')}</h4>
                  <div style="color:#94a3b8;font-size:11px;">
                    <span>📚 ${qCount} أسئلة</span> • <span>🕒 آخر تعديل: ${updatedStr}</span>
                  </div>
                </div>
                <div style="display:flex;justify-content:flex-end;">
                  <button onclick="ScoreARQuizReports.resumeQuiz('${q.id}')" style="background:linear-gradient(135deg, #10b981, #047857);color:#fff;border:none;padding:8px 16px;border-radius:10px;font-size:12px;font-weight:900;cursor:pointer;display:flex;align-items:center;gap:6px;">
                    <span>متابعة العمل ✏️</span>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // --- 7. Actions ---
  function editWeakQuestion(qId) {
    closeReportsHub();
    if (global.ScoreARQuizBank && global.ScoreARQuizBank.openBankHub) {
      global.ScoreARQuizBank.openBankHub('bank');
      if (global.toast) global.toast('تم فتح بنك الأسئلة لمراجعة وتعديل السؤال ✏️');
    }
  }

  function resumeQuiz(quizId) {
    closeReportsHub();
    if (global.ScoreARQuizBank && global.ScoreARQuizBank.editQuiz) {
      global.ScoreARQuizBank.editQuiz(quizId);
    } else if (global.openToolModal) {
      global.openToolModal('builder');
    }
  }

  global.ScoreARQuizReports = {
    openReportsHub,
    closeReportsHub,
    switchTab: (t) => { currentTab = t; renderReportsView(); },
    editWeakQuestion,
    resumeQuiz
  };

})(typeof window !== 'undefined' ? window : this);
