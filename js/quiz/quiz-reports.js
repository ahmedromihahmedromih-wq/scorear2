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

            const ui = global.ScoreARUI || { icon: () => '', iconBox: () => '' };
            return `
              <div class="scorear-spotlight-card" style="padding:16px;overflow:hidden;">
                <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ffffff14;padding-bottom:12px;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
                  <div>
                    <h3 style="color:#f6f3ff;font-size:15px;font-weight:900;margin:0;">${escapeHtml(s.quizTitle || 'مسابقة سكور آر')}</h3>
                    <div style="color:#a1a4be;font-size:11px;margin-top:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                      <span style="display:inline-flex;align-items:center;gap:4px;">${ui.icon('clock', { size: 12 })} ${dateStr}</span>
                      <span>•</span>
                      <span style="color:#58dce3;display:inline-flex;align-items:center;gap:4px;">${ui.icon('key', { size: 12 })} رمز القاعة: ${s.pin || '---'}</span>
                      <span>•</span>
                      <span style="display:inline-flex;align-items:center;gap:4px;">${ui.icon('users', { size: 12 })} ${s.totalStudents || 0} طلاب</span>
                    </div>
                  </div>

                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <button type="button" onclick="ScoreARQuizReports.exportSessionExcel(${sIdx})" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;padding:5px 12px;border-radius:8px;font-size:11px;font-weight:900;cursor:pointer;display:inline-flex;align-items:center;gap:4px;"><span>📊 كشف Excel</span></button>
                    ${top.length > 0 ? `<button type="button" onclick="ScoreARQuizReports.printWinnerCertificate(${sIdx})" style="background:linear-gradient(135deg,#d97706,#f59e0b);color:#000;border:none;padding:5px 12px;border-radius:8px;font-size:11px;font-weight:900;cursor:pointer;display:inline-flex;align-items:center;gap:4px;"><span>🏆 شهادة الفائز</span></button>` : ''}
                    ${top.length > 0 ? `
                      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                        ${top.map((p, pIdx) => `
                          <div style="background:#0c0d1d;border:1px solid ${pIdx === 0 ? '#9665ff88' : '#ffffff16'};padding:4px 10px;border-radius:999px;display:flex;align-items:center;gap:5px;font-size:11px;">
                            <span style="color:#c9baff;font-weight:900;">#${pIdx + 1}</span>
                            <span style="color:#f6f3ff;font-weight:800;">${escapeHtml(p.name)}</span>
                            <span style="color:#58dce3;font-size:10px;">(${p.score || 0}ن)</span>
                          </div>
                        `).join('')}
                      </div>
                    ` : ''}
                  </div>
                </div>

                ${qStats.length > 0 ? `
                  <div style="display:flex;flex-direction:column;gap:8px;">
                    <span style="color:#c9baff;font-size:12px;font-weight:800;">نسبة الصواب لكل سؤال من إجابات الطلاب الفعلية:</span>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:8px;">
                      ${qStats.map((q, qIdx) => {
                        const acc = q.accuracy || 0;
                        const barColor = acc >= 75 ? '#44b8a5' : (acc >= 60 ? '#9665ff' : '#c38498');
                        return `
                          <div style="background:#0c0d1d;border:1px solid ${acc < 60 ? '#c3849866' : '#ffffff12'};border-radius:12px;padding:10px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                              <span style="color:#f6f3ff;font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;" title="${escapeHtml(q.questionText)}">
                                ${qIdx + 1}. ${escapeHtml(q.questionText)}
                              </span>
                              <span style="color:${barColor};font-size:12px;font-weight:900;">${acc}%</span>
                            </div>
                            <div style="background:#18172e;border-radius:6px;height:6px;overflow:hidden;margin-bottom:6px;">
                              <div style="background:${barColor};width:${acc}%;height:100%;"></div>
                            </div>
                            <div style="display:flex;justify-content:space-between;color:#a1a4be;font-size:10px;">
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
                  <div style="color:#a1a4be;font-size:11px;font-style:italic;">تم إنهاء الجلسة دون إجابات مفصلة.</div>
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
    const ui = global.ScoreARUI || { icon: () => '', iconBox: () => '' };
    if (!questions.length) {
      return `
        <div class="scorear-spotlight-card" style="text-align:center;padding:56px 20px;border-style:dashed;border-color:#44b8a555;">
          <div style="margin-bottom:12px;">${ui.iconBox('checkCircle', { size: 'lg', tone: 'cyan' })}</div>
          <h3 style="color:#7fe7ce;font-size:16px;font-weight:800;margin:0 0 8px 0;">رائع جداً! لا توجد أسئلة تحتاج انتباهك حالياً</h3>
          <p style="color:#aaa9c1;font-size:13px;max-width:500px;margin:0 auto;line-height:1.7;">
            كافة الأسئلة التي لعبها الطلاب في جلساتك حققت نسبة صواب 60% فأكثر، أو لم يتم تسجيل إجابات ضعيفة بعد. استمر في هذا التميز!
          </p>
        </div>
      `;
    }

    return `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="background:#422337;border:1px solid #c38498;border-radius:14px;padding:12px 18px;color:#ffd3e5;font-size:12px;font-weight:800;display:flex;align-items:center;gap:10px;">
          ${ui.icon('alert', { size: 15 })}
          <span>ودجت التنبيه: هذه الأسئلة حقق الطلاب فيها نسبة صواب أقل من 60%، مرتبة من الأضعف أولاً لمراجعتها وتعديلها.</span>
        </div>

        <div style="display:grid;grid-template-columns:1fr;gap:12px;">
          ${questions.map(q => `
            <div class="scorear-spotlight-card" style="border-color:#c3849866;padding:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;">
              <div style="flex:1;min-width:260px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap;">
                  <span style="background:#6a364e;color:#ffd3e5;font-size:11px;font-weight:900;padding:3px 10px;border-radius:999px;">
                    نسبة الصواب: ${q.accuracy}%
                  </span>
                  <span style="color:#a1a4be;font-size:11px;">في: ${escapeHtml(q.sessionTitle)} (قاعة ${q.sessionPin || '---'})</span>
                </div>
                <h4 style="color:#f6f3ff;font-size:14px;font-weight:800;margin:0 0 8px 0;">${escapeHtml(q.questionText)}</h4>
                <div style="display:flex;gap:12px;color:#cbd5e1;font-size:11px;">
                  <span>✓ أجاب صواب: <strong style="color:#7fe7ce;">${q.correctAnswers}</strong></span>
                  <span>✕ أخطأ فيه: <strong style="color:#ffd3e5;">${q.wrongAnswers} طلاب</strong></span>
                </div>
              </div>

              <div>
                <button onclick="ScoreARQuizReports.editWeakQuestion('${q.questionId}')" class="btn launch-primary" style="padding:8px 16px;font-size:12px;">
                  ${ui.icon('edit', { size: 14 })} تعديل السؤال
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function getResumeWorkDrafts() {
    return cachedQuizzes.slice(0, 10);
  }

  function renderDraftsTabHtml(drafts) {
    const ui = global.ScoreARUI || { icon: () => '', iconBox: () => '' };
    if (!drafts.length) {
      return `
        <div class="scorear-spotlight-card" style="text-align:center;padding:56px 20px;border-style:dashed;border-color:#9665ff55;">
          <div style="margin-bottom:12px;">${ui.iconBox('folderOpen', { size: 'lg', tone: 'violet' })}</div>
          <h3 style="color:#f6f3ff;font-size:16px;font-weight:800;margin:0 0 8px 0;">لا توجد مسودات غير مكتملة حالياً</h3>
          <p style="color:#a1a4be;font-size:13px;max-width:480px;margin:0 auto 16px auto;">
            يمكنك إنشاء مسابقة جديدة الآن من الصفر أو عبر استيراد Excel أو الذكاء الاصطناعي!
          </p>
          <button onclick="ScoreARQuizReports.closeReportsHub(); openToolModal('builder');" class="btn launch-primary" style="padding:10px 22px;font-size:13px;">
            ${ui.icon('plus', { size: 15 })} أنشئ مسابقة جديدة
          </button>
        </div>
      `;
    }

    return `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="background:#163c39;border:1px solid #44b8a566;border-radius:14px;padding:12px 18px;color:#befff2;font-size:12px;font-weight:800;display:flex;align-items:center;gap:10px;">
          ${ui.icon('edit', { size: 14 })}
          <span>ودجت «أكمل عملك»: تابع تحرير آخر المسابقات والمسودات المفتوحة بنقرة زر واحدة.</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:12px;">
          ${drafts.map(q => {
            const qCount = Array.isArray(q.questions) ? q.questions.length : 0;
            const updatedStr = q.updatedAt ? new Date(q.updatedAt).toLocaleDateString('ar-EG') : 'حديثاً';
            return `
              <div class="scorear-spotlight-card" style="padding:16px;display:flex;flex-direction:column;justify-content:space-between;gap:12px;">
                <div>
                  <h4 style="color:#f6f3ff;font-size:14px;font-weight:900;margin:0 0 6px 0;">${escapeHtml(q.title || 'مسابقة بدون عنوان')}</h4>
                  <div style="color:#a1a4be;font-size:11px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span style="display:inline-flex;align-items:center;gap:4px;">${ui.icon('layers', { size: 12 })} ${qCount} أسئلة</span>
                    <span>•</span>
                    <span style="display:inline-flex;align-items:center;gap:4px;">${ui.icon('clock', { size: 12 })} آخر تعديل: ${updatedStr}</span>
                  </div>
                </div>
                <div style="display:flex;justify-content:flex-end;">
                  <button onclick="ScoreARQuizReports.resumeQuiz('${q.id}')" class="btn launch-primary" style="padding:8px 16px;font-size:12px;">
                    ${ui.icon('edit', { size: 13 })} متابعة العمل
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

  function exportSessionExcel(sessionIndex) {
    const s = cachedSessions[sessionIndex];
    if (!s) return;
    if (!global.XLSX) {
      if (global.toast) global.toast('محرك Excel قيد التحميل، يرجى الانتظار ثانية.');
      return;
    }
    const rows = [
      ['تقرير نتائج مسابقة سكور آر (ScoreAR)'],
      ['عنوان المسابقة:', s.quizTitle || 'مسابقة سكور آر'],
      ['رمز القاعة:', s.pin || '---'],
      ['تاريخ الجلسة:', s.createdAt ? new Date(s.createdAt).toLocaleString('ar-EG') : 'جلسة حديثة'],
      ['إجمالي المشاركين:', s.totalStudents || 0],
      [],
      ['الترتيب', 'اسم الطالب', 'مجموع النقاط', 'المركز']
    ];
    const leaderboard = (s.top3 && s.top3.length) ? s.top3 : (s.leaderboard || []);
    leaderboard.forEach((p, idx) => {
      rows.push([
        idx + 1,
        p.name || 'طالب',
        p.score || 0,
        idx === 0 ? 'الأول 🥇' : idx === 1 ? 'الثاني 🥈' : idx === 2 ? 'الثالث 🥉' : 'مشارك'
      ]);
    });
    if (s.questionStats && s.questionStats.length) {
      rows.push([], ['تحليل أداء الأسئلة ونسب الصواب']);
      rows.push(['رقم السؤال', 'نص السؤال', 'نسبة الصواب', 'صواب', 'خطأ', 'إجمالي']);
      s.questionStats.forEach((q, qIdx) => {
        rows.push([qIdx + 1, q.questionText || '', `${q.accuracy || 0}%`, q.correctAnswers || 0, q.wrongAnswers || 0, q.totalAnswers || 0]);
      });
    }
    const ws = global.XLSX.utils.aoa_to_sheet(rows);
    const wb = global.XLSX.utils.book_new();
    global.XLSX.utils.book_append_sheet(wb, ws, 'كشف الدرجات');
    const safeTitle = (s.quizTitle || 'ScoreAR').replace(/[/\\?%*:|"<>]/g, '_');
    global.XLSX.writeFile(wb, `كشف_درجات_${safeTitle}_${s.pin || ''}.xlsx`);
    if (global.toast) global.toast('تم تصدير كشف الدرجات بصيغة Excel بنجاح 📊');
  }

  function printWinnerCertificate(sessionIndex) {
    const s = cachedSessions[sessionIndex];
    if (!s) return;
    const top1 = (s.top3 && s.top3[0]) || (s.leaderboard && s.leaderboard[0]);
    if (!top1) {
      if (global.toast) global.toast('لا يوجد فائز مسجل لهذه الجلسة.');
      return;
    }
    if (global.ScoreARPodiumCapture && typeof global.ScoreARPodiumCapture.downloadWinnerCertificate === 'function') {
      const winnerData = {
        name: top1.name || 'بطل سكور آر',
        score: top1.score || 0,
        avatarId: top1.avatarId || 'char_01',
        quizTitle: s.quizTitle || 'مسابقة سكور آر'
      };
      global.ScoreARPodiumCapture.downloadWinnerCertificate(winnerData, 1, s.worldId || 'royal');
      if (global.toast) global.toast('جاري تنزيل شهادة التقدير الملكية للبطل الفائز 🌟');
    } else {
      if (global.toast) global.toast('محرك الشهادات غير محمل حالياً.');
    }
  }

  global.ScoreARQuizReports = {
    openReportsHub,
    closeReportsHub,
    switchTab: (t) => { currentTab = t; renderReportsView(); },
    editWeakQuestion,
    resumeQuiz,
    exportSessionExcel,
    printWinnerCertificate
  };

})(typeof window !== 'undefined' ? window : this);
