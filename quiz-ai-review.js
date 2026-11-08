/**
 * ScoreAR AI Review & Draft Table (quiz-ai-review.js)
 * Item 5: Editable draft review table with Bloom badges, Source citation quotes,
 * Single-question regeneration, and explicit teacher approval before save.
 * Strictly Rule 7 Compliant (<500 lines).
 */
(function (global) {
  'use strict';

  let draftQuestions = [];
  let reviewContext = { mode: 'hub', onCommit: null };

  function sanitize(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getOrCreateReviewModal() {
    let m = document.getElementById('scorearAiReviewModal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'scorearAiReviewModal';
      m.style.cssText = 'position:fixed;inset:0;background:rgba(5,6,15,0.94);backdrop-filter:blur(12px);z-index:999999;display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;direction:rtl;font-family:inherit;';
      document.body.appendChild(m);
    }
    return m;
  }

  function openReviewTable(questions = [], context = {}) {
    draftQuestions = JSON.parse(JSON.stringify(questions));
    reviewContext = context;
    const m = getOrCreateReviewModal();
    m.style.display = 'flex';
    renderTable();
  }

  function closeReviewTable() {
    const m = document.getElementById('scorearAiReviewModal');
    if (m) m.style.display = 'none';
  }

  function renderTable() {
    const m = getOrCreateReviewModal();
    const count = draftQuestions.length;

    m.innerHTML = `
      <div style="background:#101124;border:2px solid #7550ef;box-shadow:0 0 60px rgba(117,80,239,0.35);border-radius:24px;width:100%;max-width:1050px;display:flex;flex-direction:column;max-height:92vh;overflow:hidden;">
        <!-- Header -->
        <header style="background:#171836;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(142,100,239,0.3);">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg, #7550ef, #10b981);display:flex;align-items:center;justify-content:center;font-size:20px;">📋</div>
            <div>
              <h2 style="color:#ffffff;font-size:18px;font-weight:900;margin:0;">جدول مراجعة واعتماد الأسئلة المولدة (${count} أسئلة)</h2>
              <p style="color:#a1a4be;font-size:12px;margin:2px 0 0 0;">دقق الأسئلة واقتباسات المصدر، وعدّل أي خيار، أو أعد توليد أي سؤال منفرد قبل الاعتماد.</p>
            </div>
          </div>
          <button onclick="ScoreARQuizAIReview.closeReviewTable()" style="background:none;border:none;color:#9ca3af;font-size:24px;cursor:pointer;">✕</button>
        </header>

        <!-- Body Questions List -->
        <div style="padding:20px 24px;overflow-y:auto;display:flex;flex-direction:column;gap:16px;flex:1;">
          ${!count ? `
            <div style="text-align:center;padding:40px;color:#9ca3af;">
              <p style="font-size:16px;">لا توجد أسئلة في المسودة الحالية.</p>
            </div>
          ` : draftQuestions.map((q, idx) => `
            <div id="draftCard_${idx}" style="background:#14152e;border:1px solid ${q.isVerified === false ? '#f59e0b' : 'rgba(142,100,239,0.3)'};border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:12px;transition:all 0.3s;">
              <!-- Card Top Row: Badges & Controls -->
              <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="background:#7550ef;color:#fff;border-radius:8px;padding:3px 10px;font-size:12px;font-weight:900;">سؤال ${idx + 1}</span>
                  <span style="background:rgba(59,130,246,0.2);color:#93c5fd;border:1px solid #3b82f6;border-radius:8px;padding:3px 8px;font-size:11px;font-weight:800;">
                    ${q.type === 'tf' ? '⚖️ صح / خطأ' : '🔘 اختيار متعدد'}
                  </span>
                  <span style="background:rgba(168,85,247,0.2);color:#d8b4fe;border:1px solid #a855f7;border-radius:8px;padding:3px 8px;font-size:11px;font-weight:800;">
                    مستوى بلوم: ${sanitize(q.cognitiveLevel || 'فهم')}
                  </span>
                  ${q.isVerified !== false ? `
                    <span style="background:rgba(16,185,129,0.2);color:#34d399;border:1px solid #10b981;border-radius:8px;padding:3px 8px;font-size:11px;font-weight:800;">✓ موثق من المصدر</span>
                  ` : `
                    <span style="background:rgba(245,158,11,0.2);color:#fbbf24;border:1px solid #f59e0b;border-radius:8px;padding:3px 8px;font-size:11px;font-weight:800;">⚠️ ${sanitize(q.warning || 'يحتاج مراجعة')}</span>
                  `}
                </div>
                <div style="display:flex;gap:8px;">
                  <button onclick="ScoreARQuizAIReview.regenerateQuestion(${idx})" style="background:rgba(142,100,239,0.2);color:#c4b5fd;border:1px solid rgba(142,100,239,0.4);border-radius:8px;padding:4px 10px;font-size:11px;font-weight:800;cursor:pointer;">
                    🔄 أعد توليد هذا السؤال
                  </button>
                  <button onclick="ScoreARQuizAIReview.deleteQuestion(${idx})" style="background:rgba(239,68,68,0.15);color:#fca5a5;border:1px solid rgba(239,68,68,0.4);border-radius:8px;padding:4px 10px;font-size:11px;font-weight:800;cursor:pointer;">
                    🗑️ حذف
                  </button>
                </div>
              </div>

              <!-- Question Textarea -->
              <div>
                <label style="display:block;color:#cbd5e1;font-size:12px;font-weight:800;margin-bottom:4px;">نص السؤال:</label>
                <textarea onchange="ScoreARQuizAIReview.updateQuestionText(${idx}, this.value)" style="width:100%;height:50px;background:#1a1c3d;border:1px solid rgba(142,100,239,0.3);border-radius:10px;color:#fff;font-size:13px;padding:8px 12px;box-sizing:border-box;font-family:inherit;resize:vertical;">${sanitize(q.q)}</textarea>
              </div>

              <!-- Options Grid -->
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:8px;">
                ${q.opts.map((opt, optIdx) => `
                  <div style="display:flex;align-items:center;gap:6px;background:#1a1c3d;padding:6px 10px;border-radius:10px;border:1px solid ${q.ans === optIdx ? '#10b981' : 'rgba(255,255,255,0.08)'};">
                    <input type="radio" name="correctRadio_${idx}" ${q.ans === optIdx ? 'checked' : ''} onchange="ScoreARQuizAIReview.updateCorrectAnswer(${idx}, ${optIdx})" style="cursor:pointer;accent-color:#10b981;">
                    <input type="text" value="${sanitize(opt)}" onchange="ScoreARQuizAIReview.updateOptionText(${idx}, ${optIdx}, this.value)" style="flex:1;background:transparent;border:none;color:#fff;font-size:12px;outline:none;font-family:inherit;">
                  </div>
                `).join('')}
              </div>

              <!-- Source Citation & Quote -->
              <div style="background:rgba(15,23,42,0.6);border-left:3px solid #7550ef;border-radius:8px;padding:8px 12px;display:flex;flex-direction:column;gap:4px;">
                <div style="display:flex;align-items:center;gap:6px;">
                  <span style="color:#a89bff;font-size:11px;font-weight:800;">📖 المرجع: ${sanitize(q.sourceRef || 'المستند الأصلي')}</span>
                </div>
                ${q.sourceQuote ? `
                  <p style="color:#94a3b8;font-size:11px;margin:0;font-style:italic;">"${sanitize(q.sourceQuote)}"</p>
                ` : ''}
                ${q.explain ? `
                  <span style="color:#6ee7b7;font-size:11px;">💡 التعليل التربوي: ${sanitize(q.explain)}</span>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Footer Actions -->
        <footer style="background:#171836;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(142,100,239,0.3);">
          <span style="color:#94a3b8;font-size:11px;">لن يتم حفظ أي سؤال في المسابقة حتى تضغط زر «اعتماد وإضافة إلى المسابقة».</span>
          <div style="display:flex;gap:12px;">
            <button onclick="ScoreARQuizAIReview.closeReviewTable()" style="background:rgba(255,255,255,0.08);color:#d1d5db;border:1px solid rgba(255,255,255,0.15);padding:8px 16px;border-radius:10px;font-size:12px;cursor:pointer;">إلغاء</button>
            <button onclick="ScoreARQuizAIReview.commitQuestions()" style="background:linear-gradient(135deg, #10b981, #059669);color:#fff;border:none;padding:10px 22px;border-radius:12px;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 0 20px rgba(16,185,129,0.3);">
              اعتماد وإضافة إلى المسابقة (${count}) ✓
            </button>
          </div>
        </footer>
      </div>
    `;
  }

  // Edit Handlers
  function updateQuestionText(idx, val) {
    if (draftQuestions[idx]) draftQuestions[idx].q = val.trim();
  }
  function updateOptionText(qIdx, optIdx, val) {
    if (draftQuestions[qIdx] && draftQuestions[qIdx].opts[optIdx] !== undefined) {
      draftQuestions[qIdx].opts[optIdx] = val.trim();
    }
  }
  function updateCorrectAnswer(qIdx, optIdx) {
    if (draftQuestions[qIdx]) draftQuestions[qIdx].ans = optIdx;
    renderTable();
  }
  function deleteQuestion(idx) {
    draftQuestions.splice(idx, 1);
    renderTable();
  }

  // Single Question Regeneration
  async function regenerateQuestion(idx) {
    const targetQ = draftQuestions[idx];
    if (!targetQ) return;
    const cardEl = document.getElementById(`draftCard_${idx}`);
    if (cardEl) {
      cardEl.style.opacity = '0.5';
      cardEl.style.pointerEvents = 'none';
    }

    try {
      const user = (global.firebase && global.firebase.auth) ? global.firebase.auth().currentUser : null;
      if (!user) throw new Error('يرجى تسجيل الدخول أولاً.');
      const idToken = await user.getIdToken(true);

      const resp = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
        body: JSON.stringify({
          content: targetQ.sourceQuote || targetQ.q,
          count: 1,
          difficulty: 'متوسط',
          format: targetQ.type || 'mcq',
          instructions: `صغ بديلاً تربوياً جديداً ومختلفاً للسؤال التالي مستنداً للاقتباس:\nالسؤال السابق: ${targetQ.q}`
        })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `خطأ في الخادم (رمز ${resp.status})`);
      }

      const resJson = await resp.json();
      const newQuestions = resJson.questions || [];
      if (newQuestions.length > 0) {
        const fresh = newQuestions[0];
        draftQuestions[idx] = {
          ...targetQ,
          id: 'q_ai_regen_' + Date.now(),
          q: fresh.q || fresh.text,
          opts: fresh.opts || fresh.options,
          ans: Number(fresh.ans) || 0,
          explain: fresh.explain || targetQ.explain,
          sourceQuote: fresh.sourceQuote || targetQ.sourceQuote,
          isVerified: true,
          warning: null
        };
        if (global.toast) global.toast(`تم إعادة صياغة السؤال ${idx + 1} بنجاح ✓`);
      }
    } catch (e) {
      alert('تعذر إعادة التوليد: ' + e.message);
    } finally {
      renderTable();
    }
  }

  // Commit Questions to Target
  function commitQuestions() {
    if (!draftQuestions.length) {
      alert('لا توجد أسئلة لاعتمادها.');
      return;
    }

    // Validate that all questions have non-empty text and at least 2 options
    for (let i = 0; i < draftQuestions.length; i++) {
      const q = draftQuestions[i];
      if (!q.q || q.q.trim().length < 5) {
        alert(`السؤال رقم ${i + 1} نصه غير مكتمل.`);
        return;
      }
      if (!q.opts || q.opts.length < 2 || q.opts.some(o => !o.trim())) {
        alert(`خيارات السؤال رقم ${i + 1} غير مكتملة.`);
        return;
      }
    }

    closeReviewTable();

    if (typeof reviewContext.onCommit === 'function') {
      reviewContext.onCommit(draftQuestions);
    } else if (global.ScoreARQuizBuilder && global.ScoreARQuizBuilder.importQuestions) {
      global.ScoreARQuizBuilder.importQuestions(draftQuestions);
    } else if (global.ScoreARQuizImporter && global.ScoreARQuizImporter.handlePreloadedQuestions) {
      global.ScoreARQuizImporter.handlePreloadedQuestions(draftQuestions, 'توليد ذكي (AI)');
    }

    if (global.toast) global.toast(`تم اعتماد وإضافة (${draftQuestions.length}) سؤالاً إلى المسابقة بنجاح ✓`);
  }

  global.ScoreARQuizAIReview = {
    openReviewTable,
    closeReviewTable,
    updateQuestionText,
    updateOptionText,
    updateCorrectAnswer,
    deleteQuestion,
    regenerateQuestion,
    commitQuestions
  };

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
