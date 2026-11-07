/**
 * ScoreAR Quiz Builder Module
 * Real Quiz Builder for Teacher Studio (Item 1 Compliant)
 * Multi-question support (2-6 options, arbitrary correct answer, explanation, per-question timer/points)
 * Reordering (Up/Down), Duplication, Deletion
 * Strict Debounced Auto-Save with Promise Verification & LocalStorage Fallback
 * Comprehensive Validation before Publish
 * Rule 7 Compliant (<500 lines)
 */
(function(global) {
  'use strict';

  const STORAGE_KEY_PREFIX = 'scorear_draft_backup_';
  const LAST_DRAFT_KEY = 'scorear_last_draft_id';

  let currentQuiz = null;
  let activeQIndex = 0;
  let saveState = 'saved'; // 'saving' | 'saved' | 'error'
  let debounceTimer = null;
  let lastSavedAt = null;

  function createNewQuestion(index = 1) {
    return {
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      q: index === 1 ? 'ما إعراب كلمة «مفيداً» في جملة: «قرأتُ كتاباً مفيداً»؟' : '',
      opts: index === 1 ? ['نعت منصوب', 'مفعول به ثانٍ', 'حال منصوبة', 'تمييز منصوب'] : ['الخيار 1', 'الخيار 2', 'الخيار 3', 'الخيار 4'],
      ans: 0,
      explain: index === 1 ? '«مفيداً» تصف الكتاب وتطابقه في الإعراب والتنكير، فهي نعت منصوب.' : '',
      timeLimit: 20,
      points: 1000
    };
  }

  function createDefaultQuiz() {
    return {
      id: 'quiz_' + Date.now(),
      title: 'مسابقة لغة عربية جديدة',
      description: 'مسابقة تفاعلية صُنعت في استوديو المعلم',
      ownerUid: null,
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      questions: [createNewQuestion(1)]
    };
  }

  function getOrCreateBuilderStage() {
    let stage = document.getElementById('scorearQuizBuilderStage');
    if (!stage) {
      stage = document.createElement('div');
      stage.id = 'scorearQuizBuilderStage';
      stage.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0c0d1e;overflow:hidden;font-family:Cairo,Tajawal,sans-serif;direction:rtl;display:flex;flex-direction:column;';
      document.body.appendChild(stage);
    }
    stage.style.display = 'flex';
    return stage;
  }

  function openBuilder(quizData = null) {
    if (quizData) {
      currentQuiz = JSON.parse(JSON.stringify(quizData));
    } else {
      const lastId = localStorage.getItem(LAST_DRAFT_KEY);
      if (lastId) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY_PREFIX + lastId);
          if (raw) currentQuiz = JSON.parse(raw);
        } catch(e){}
      }
      if (!currentQuiz) currentQuiz = createDefaultQuiz();
    }
    activeQIndex = 0;
    saveState = 'saved';
    renderBuilderView();
    performSave(true);
  }

  function closeBuilder() {
    if (debounceTimer) clearTimeout(debounceTimer);
    const stage = document.getElementById('scorearQuizBuilderStage');
    if (stage) stage.style.display = 'none';
  }

  function scheduleAutoSave() {
    saveState = 'saving';
    updateSaveIndicatorUI();
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => performSave(), 750);
  }

  async function performSave(isSilent = false) {
    if (!currentQuiz) return;
    saveState = 'saving';
    updateSaveIndicatorUI();

    const timestamp = Date.now();
    currentQuiz.updatedAt = timestamp;

    if (global.ScoreAREvaluator && Array.isArray(currentQuiz.questions)) {
      currentQuiz.questions = currentQuiz.questions.map(q => global.ScoreAREvaluator.normalizeQuestion(q));
    }

    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + currentQuiz.id, JSON.stringify(currentQuiz));
      localStorage.setItem(LAST_DRAFT_KEY, currentQuiz.id);
    } catch(e) {}

    try {
      const auth = window.firebase && window.firebase.auth ? window.firebase.auth() : null;
      if (auth && !auth.currentUser) await auth.signInAnonymously();
      if (auth && auth.currentUser) currentQuiz.ownerUid = auth.currentUser.uid;

      const db = (window.ScoreARAuth && window.ScoreARAuth.getDb) ? window.ScoreARAuth.getDb() : (window.firebase && window.firebase.database ? window.firebase.database() : null);
      if (!db) throw new Error('NO_DATABASE_INSTANCE');

      await db.ref('scorear_quizzes/' + currentQuiz.id).set(currentQuiz);
      const verifySnap = await db.ref('scorear_quizzes/' + currentQuiz.id + '/updatedAt').once('value');
      if (verifySnap.val() === timestamp) {
        saveState = 'saved';
        lastSavedAt = new Date();
      } else {
        throw new Error('VERIFICATION_MISMATCH');
      }
    } catch(err) {
      console.warn('[ScoreAR QuizBuilder] Server auto-save failed, backed up locally:', err.message);
      saveState = 'error';
    }
    updateSaveIndicatorUI();
  }

  function retrySave() { performSave(); }

  function updateSaveIndicatorUI() {
    const el = document.getElementById('builderSaveIndicator');
    if (!el) return;
    if (saveState === 'saving') {
      el.innerHTML = `<span style="display:inline-block;animation:spin 1s linear infinite;">⏳</span> جارٍ الحفظ…`;
      el.style.color = '#fcd34d';
      el.style.background = 'rgba(245,158,11,0.15)';
      el.style.borderColor = 'rgba(245,158,11,0.3)';
    } else if (saveState === 'saved') {
      const timeStr = lastSavedAt ? lastSavedAt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : 'الآن';
      el.innerHTML = `✓ تم الحفظ (${timeStr})`;
      el.style.color = '#34d399';
      el.style.background = 'rgba(16,185,129,0.15)';
      el.style.borderColor = 'rgba(16,185,129,0.3)';
    } else {
      el.innerHTML = `⚠️ لم يُحفظ (محفوظ محلياً) <button onclick="ScoreARQuizBuilder.retrySave()" style="background:#ef4444;color:#fff;border:none;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:900;cursor:pointer;margin-inline-start:4px;">إعادة المحاولة 🔄</button>`;
      el.style.color = '#ff8a8a';
      el.style.background = 'rgba(239,68,68,0.15)';
      el.style.borderColor = 'rgba(239,68,68,0.3)';
    }
  }

  function addQuestion() {
    if (!currentQuiz) return;
    currentQuiz.questions.push(createNewQuestion(currentQuiz.questions.length + 1));
    activeQIndex = currentQuiz.questions.length - 1;
    scheduleAutoSave();
    renderBuilderView();
  }

  function duplicateQuestion(idx) {
    if (!currentQuiz || !currentQuiz.questions[idx]) return;
    const clone = JSON.parse(JSON.stringify(currentQuiz.questions[idx]));
    clone.id = 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    clone.q = clone.q ? (clone.q + ' (نسخة)') : '';
    currentQuiz.questions.splice(idx + 1, 0, clone);
    activeQIndex = idx + 1;
    if (global.toast) global.toast('تم تكرار السؤال بنجاح ✓');
    scheduleAutoSave();
    renderBuilderView();
  }

  function deleteQuestion(idx) {
    if (!currentQuiz) return;
    if (currentQuiz.questions.length <= 1) {
      if (global.toast) global.toast('يجب أن تحتوي المسابقة على سؤال واحد على الأقل.');
      return;
    }
    currentQuiz.questions.splice(idx, 1);
    if (activeQIndex >= currentQuiz.questions.length) activeQIndex = currentQuiz.questions.length - 1;
    scheduleAutoSave();
    renderBuilderView();
  }

  function moveQuestion(idx, direction) {
    if (!currentQuiz) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= currentQuiz.questions.length) return;
    const temp = currentQuiz.questions[idx];
    currentQuiz.questions[idx] = currentQuiz.questions[targetIdx];
    currentQuiz.questions[targetIdx] = temp;
    activeQIndex = targetIdx;
    scheduleAutoSave();
    renderBuilderView();
  }

  function selectQuestion(idx) {
    if (!currentQuiz || !currentQuiz.questions[idx]) return;
    activeQIndex = idx;
    renderBuilderView();
  }

  function updateQuizTitle(title) {
    if (!currentQuiz) return;
    currentQuiz.title = title;
    scheduleAutoSave();
  }

  function updateQuestionText(text) {
    if (!currentQuiz || !currentQuiz.questions[activeQIndex]) return;
    currentQuiz.questions[activeQIndex].q = text;
    scheduleAutoSave();
    const listSnippet = document.getElementById('qSnippet_' + activeQIndex);
    if (listSnippet) listSnippet.textContent = text.trim() || 'سؤال بدون نص...';
  }

  function updateQuestionExplain(explain) {
    if (!currentQuiz || !currentQuiz.questions[activeQIndex]) return;
    currentQuiz.questions[activeQIndex].explain = explain;
    scheduleAutoSave();
  }

  function updateOptionText(optIdx, text) {
    if (!currentQuiz || !currentQuiz.questions[activeQIndex]) return;
    currentQuiz.questions[activeQIndex].opts[optIdx] = text;
    scheduleAutoSave();
  }

  function setCorrectAnswer(optIdx) {
    if (!currentQuiz || !currentQuiz.questions[activeQIndex]) return;
    currentQuiz.questions[activeQIndex].ans = optIdx;
    scheduleAutoSave();
    renderBuilderView();
  }

  function addOption() {
    if (!currentQuiz || !currentQuiz.questions[activeQIndex]) return;
    const q = currentQuiz.questions[activeQIndex];
    if (q.opts.length >= 6) {
      if (global.toast) global.toast('الحد الأقصى هو 6 اختيارات للسؤال الواحد.');
      return;
    }
    q.opts.push('الخيار ' + (q.opts.length + 1));
    scheduleAutoSave();
    renderBuilderView();
  }

  function removeOption(optIdx) {
    if (!currentQuiz || !currentQuiz.questions[activeQIndex]) return;
    const q = currentQuiz.questions[activeQIndex];
    if (q.opts.length <= 2) {
      if (global.toast) global.toast('يجب أن يحتوي السؤال على خيارين على الأقل.');
      return;
    }
    q.opts.splice(optIdx, 1);
    if (q.ans === optIdx) q.ans = 0;
    else if (q.ans > optIdx) q.ans--;
    scheduleAutoSave();
    renderBuilderView();
  }

  function setQuestionTime(seconds) {
    if (!currentQuiz || !currentQuiz.questions[activeQIndex]) return;
    currentQuiz.questions[activeQIndex].timeLimit = Number(seconds);
    scheduleAutoSave();
    renderBuilderView();
  }

  function setQuestionPoints(pts) {
    if (!currentQuiz || !currentQuiz.questions[activeQIndex]) return;
    currentQuiz.questions[activeQIndex].points = Number(pts);
    scheduleAutoSave();
    renderBuilderView();
  }

  function validateQuiz() {
    const errors = [];
    if (!currentQuiz) return { valid: false, errors: ['لا توجد مسابقة مفتوحة.'] };
    if (!currentQuiz.title || !currentQuiz.title.trim()) errors.push('عنوان المسابقة فارغ، يرجى كتابة عنوان مناسب.');
    if (!currentQuiz.questions || !currentQuiz.questions.length) return { valid: false, errors: ['المسابقة لا تحتوي على أي أسئلة.'] };

    currentQuiz.questions.forEach((q, qIdx) => {
      const qNum = qIdx + 1;
      const evaluator = global.ScoreAREvaluator;
      if (evaluator) {
        const canonical = evaluator.normalizeQuestion(q);
        const val = evaluator.validateQuestion(canonical);
        if (!val.valid) {
          errors.push(`السؤال (${qNum}): ${val.error}`);
        }
      } else {
        if (!q.q || !q.q.trim()) errors.push(`السؤال (${qNum}): نص السؤال فارغ.`);
        if (!q.opts || q.opts.length < 2) errors.push(`السؤال (${qNum}): يجب أن يحتوي على خيارين على الأقل.`);
        if (typeof q.ans !== 'number' || q.ans < 0 || q.ans >= q.opts.length) errors.push(`السؤال (${qNum}): لم يتم تحديد الإجابة الصحيحة.`);
      }
    });

    return { valid: errors.length === 0, errors };
  }

  async function publishAndLaunchContest() {
    const validation = validateQuiz();
    const alertBox = document.getElementById('builderValidationAlert');

    if (!validation.valid) {
      if (alertBox) {
        alertBox.innerHTML = `
          <div style="font-weight:900;margin-bottom:6px;font-size:14px;">⚠️ لا يمكن النشر قبل إصلاح الأخطاء التالية:</div>
          <ul style="margin:0;padding-right:18px;font-size:12px;line-height:1.6;">${validation.errors.map(e => `<li>${e}</li>`).join('')}</ul>
        `;
        alertBox.style.display = 'block';
      }
      if (global.toast) global.toast('يرجى تصحيح أخطاء الأسئلة قبل النشر.');
      return;
    }

    if (alertBox) alertBox.style.display = 'none';
    currentQuiz.status = 'published';
    await performSave();
    global.contestQuestions = JSON.parse(JSON.stringify(currentQuiz.questions));
    closeBuilder();
    if (global.toast) global.toast('تم اعتماد ونشر المسابقة بنجاح! اختر عالم المنافسة 🚀');
    if (global.ScoreARWorldFlow && typeof global.ScoreARWorldFlow.openWorldPicker === 'function') {
      global.ScoreARWorldFlow.openWorldPicker({
        defaultWorldId: 'royal',
        quizTitle: currentQuiz.title || 'مسابقة جديدة',
        onConfirm: (chosenWorld) => {
          if (global.ScoreARQuizHost && global.ScoreARQuizHost.startHostLobby) {
            global.ScoreARQuizHost.startHostLobby(chosenWorld, null, true);
          } else if (global.renderLiveLobby) {
            global.renderLiveLobby(chosenWorld, null, true);
          }
        }
      });
    } else if (global.ScoreARQuizHost && global.ScoreARQuizHost.startHostLobby) {
      global.ScoreARQuizHost.startHostLobby('royal', null);
    } else if (global.renderLiveLobby) {
      global.renderLiveLobby('royal', null);
    }
  }

  function renderBuilderView() {
    if (!currentQuiz) return;
    const stage = getOrCreateBuilderStage();
    const q = currentQuiz.questions[activeQIndex] || currentQuiz.questions[0];
    const totalQ = currentQuiz.questions.length;

    stage.innerHTML = `
      <header style="background:#101124;border-bottom:1px solid rgba(142,100,239,0.3);padding:10px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;z-index:20;">
        <div style="display:flex;align-items:center;gap:12px;flex:1;max-width:550px;">
          <span style="font-size:20px;">📝</span>
          <input type="text" value="${currentQuiz.title}" oninput="ScoreARQuizBuilder.updateQuizTitle(this.value)" placeholder="عنوان المسابقة..." style="background:#191b35;border:1px solid rgba(142,100,239,0.3);color:#ffffff;font-size:15px;font-weight:900;padding:6px 14px;border-radius:10px;width:100%;font-family:inherit;">
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div id="builderSaveIndicator" style="border:1px solid rgba(16,185,129,0.3);background:rgba(16,185,129,0.12);padding:6px 14px;border-radius:10px;font-size:12px;font-weight:800;display:flex;align-items:center;gap:6px;">✓ تم الحفظ</div>
          <button onclick="ScoreARQuizBuilder.publishAndLaunchContest()" style="background:linear-gradient(135deg, #7550ef, #582cd1);color:#ffffff;border:none;padding:8px 20px;border-radius:10px;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 0 18px rgba(117,80,239,0.5);">🚀 نشر وبدء التحدي</button>
          <button onclick="ScoreARQuizBuilder.closeBuilder()" style="background:rgba(255,255,255,0.08);color:#d1d5db;border:1px solid rgba(255,255,255,0.15);padding:8px 14px;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;">إغلاق ✕</button>
        </div>
      </header>

      <div id="builderValidationAlert" style="display:none;background:rgba(239,68,68,0.18);border-bottom:1px solid #ef4444;color:#ff8a8a;padding:12px 24px;z-index:15;"></div>

      <div style="flex:1;display:flex;overflow:hidden;">
        <aside style="width:280px;background:#0d0e21;border-left:1px solid rgba(142,100,239,0.25);display:flex;flex-direction:column;justify-content:space-between;padding:14px;overflow-y:auto;">
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:6px;">
              <span style="color:#ddd8ff;font-size:12px;font-weight:900;">الأسئلة (${totalQ})</span>
              <div style="display:flex;gap:4px;">
                <button onclick="ScoreARQuizBuilder.addQuestion()" style="background:#241d4c;color:#a89bff;border:1px solid #7550ef;border-radius:8px;padding:3px 8px;font-size:10px;font-weight:800;cursor:pointer;">+ سؤال</button>
                <button onclick="ScoreARQuizBank.openImportModal(ScoreARQuizBuilder.addImportedQuestion)" style="background:#132938;color:#52d9ed;border:1px solid #52d9ed;border-radius:8px;padding:3px 8px;font-size:10px;font-weight:800;cursor:pointer;">📚 استيراد</button>
                <button onclick="ScoreARQuizImporter.openImporter({mode:'builder',onImport:ScoreARQuizBuilder.addImportedQuestionsBatch})" style="background:#132e22;color:#34d399;border:1px solid #10b981;border-radius:8px;padding:3px 7px;font-size:10px;font-weight:800;cursor:pointer;">📥 Excel</button>
                <button onclick="ScoreARQuizAI.openAiStudio({mode:'builder',onImport:ScoreARQuizBuilder.addImportedQuestionsBatch})" style="background:#2a1b4e;color:#c084fc;border:1px solid #a855f7;border-radius:8px;padding:3px 7px;font-size:10px;font-weight:800;cursor:pointer;">✨ AI</button>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${currentQuiz.questions.map((item, idx) => `
                <div onclick="ScoreARQuizBuilder.selectQuestion(${idx})" style="background:${idx === activeQIndex ? '#251b54' : '#14152e'};border:1px solid ${idx === activeQIndex ? '#8e64ef' : 'rgba(255,255,255,0.08)'};border-radius:12px;padding:8px 10px;cursor:pointer;transition:all 0.15s;position:relative;">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                    <span style="font-size:11px;font-weight:900;color:${idx === activeQIndex ? '#52d9ed' : '#a1a4be'};">سؤال ${idx + 1} (${item.opts.length} خيارات)</span>
                    <div style="display:flex;gap:4px;" onclick="event.stopPropagation();">
                      <button onclick="ScoreARQuizBuilder.moveQuestion(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} style="background:none;border:none;color:#9ca3af;cursor:pointer;padding:2px;font-size:10px;opacity:${idx === 0 ? 0.3 : 1};" title="تحريك لأعلى">▲</button>
                      <button onclick="ScoreARQuizBuilder.moveQuestion(${idx}, 1)" ${idx === totalQ - 1 ? 'disabled' : ''} style="background:none;border:none;color:#9ca3af;cursor:pointer;padding:2px;font-size:10px;opacity:${idx === totalQ - 1 ? 0.3 : 1};" title="تحريك لأسفل">▼</button>
                      <button onclick="ScoreARQuizBuilder.duplicateQuestion(${idx})" style="background:none;border:none;color:#52d9ed;cursor:pointer;padding:2px;font-size:11px;" title="تكرار السؤال">📋</button>
                      <button onclick="ScoreARQuizBuilder.deleteQuestion(${idx})" style="background:none;border:none;color:#ff8a8a;cursor:pointer;padding:2px;font-size:11px;" title="حذف السؤال">✕</button>
                    </div>
                  </div>
                  <div id="qSnippet_${idx}" style="font-size:12px;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:700;">${item.q ? item.q : '<i style="color:#6b7280;">اكتب نص السؤال...</i>'}</div>
                </div>
              `).join('')}
            </div>
          </div>
          <button onclick="ScoreARQuizBuilder.addQuestion()" style="margin-top:14px;background:#1e183d;border:1px dashed #8e64ef;color:#ffffff;border-radius:10px;padding:10px;font-size:12px;font-weight:800;cursor:pointer;">+ إضافة سؤال آخر</button>
        </aside>

        <main style="flex:1;display:flex;flex-direction:column;padding:20px 32px;overflow-y:auto;gap:18px;">
          <div style="display:flex;align-items:center;justify-content:space-between;background:#111228;padding:12px 18px;border-radius:14px;border:1px solid rgba(142,100,239,0.25);">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="background:#7550ef;color:#fff;border-radius:8px;padding:4px 10px;font-size:12px;font-weight:900;">السؤال ${activeQIndex + 1} من ${totalQ}</span>
              <button onclick="ScoreARQuizBank.openSaveQuestionModal(ScoreARQuizBuilder.getCurrentQuestion())" style="background:rgba(16,185,129,0.15);color:#34d399;border:1px solid #10b981;padding:3px 10px;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;">💾 حفظ السؤال في بنك الأسئلة</button>
            </div>
            <div style="display:flex;align-items:center;gap:14px;">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="color:#ddd8ff;font-size:12px;font-weight:700;">⏱️ وقت الإجابة:</span>
                <select onchange="ScoreARQuizBuilder.setQuestionTime(this.value)" style="background:#1c1d3b;border:1px solid #7550ef;color:#ffffff;font-size:12px;font-weight:800;padding:4px 8px;border-radius:8px;font-family:inherit;">
                  ${[5, 10, 15, 20, 30, 45, 60, 90].map(s => `<option value="${s}" ${q.timeLimit === s ? 'selected' : ''}>${s} ثوانٍ</option>`).join('')}
                </select>
              </div>
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="color:#ddd8ff;font-size:12px;font-weight:700;">⚡ النقاط:</span>
                <select onchange="ScoreARQuizBuilder.setQuestionPoints(this.value)" style="background:#1c1d3b;border:1px solid #7550ef;color:#ffffff;font-size:12px;font-weight:800;padding:4px 8px;border-radius:8px;font-family:inherit;">
                  <option value="1000" ${q.points === 1000 ? 'selected' : ''}>1000 نقطة (قياسي)</option>
                  <option value="2000" ${q.points === 2000 ? 'selected' : ''}>2000 نقطة (مضاعف)</option>
                  <option value="0" ${q.points === 0 ? 'selected' : ''}>0 (بلا نقاط)</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label style="display:block;color:#ddd8ff;font-size:13px;font-weight:800;margin-bottom:6px;">نص السؤال:</label>
            <textarea oninput="ScoreARQuizBuilder.updateQuestionText(this.value)" placeholder="اكتب صيغة السؤال هنا..." style="width:100%;height:80px;background:#13142c;border:2px solid #8e64ef;border-radius:14px;color:#ffffff;font-size:15px;font-weight:800;padding:12px 16px;font-family:inherit;line-height:1.4;resize:vertical;">${q.q}</textarea>
          </div>

          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <label style="color:#ddd8ff;font-size:13px;font-weight:800;">الاختيارات (اضغط الدائرة لتحديد الإجابة الصحيحة):</label>
              ${q.opts.length < 6 ? `
                <button onclick="ScoreARQuizBuilder.addOption()" style="background:#1f1c3d;color:#52d9ed;border:1px solid #52d9ed;border-radius:8px;padding:4px 10px;font-size:11px;font-weight:800;cursor:pointer;">+ إضافة خيار (${q.opts.length}/6)</button>
              ` : ''}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              ${q.opts.map((optText, oIdx) => {
                const isCorrect = (q.ans === oIdx);
                return `
                  <div style="display:flex;align-items:center;gap:10px;background:${isCorrect ? 'rgba(16,185,129,0.12)' : '#13142c'};border:2px solid ${isCorrect ? '#10b981' : 'rgba(142,100,239,0.3)'};border-radius:14px;padding:10px 14px;transition:border-color 0.2s;">
                    <button type="button" onclick="ScoreARQuizBuilder.setCorrectAnswer(${oIdx})" style="width:28px;height:28px;border-radius:50%;background:${isCorrect ? '#10b981' : 'transparent'};border:2px solid ${isCorrect ? '#10b981' : '#6b7280'};color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;cursor:pointer;flex-shrink:0;" title="${isCorrect ? 'الإجابة الصحيحة' : 'تحديد كإجابة صحيحة'}">${isCorrect ? '✓' : ''}</button>
                    <input type="text" value="${optText}" oninput="ScoreARQuizBuilder.updateOptionText(${oIdx}, this.value)" placeholder="نص الخيار ${oIdx + 1}..." style="flex:1;background:transparent;border:none;color:#ffffff;font-size:14px;font-weight:800;font-family:inherit;outline:none;">
                    ${q.opts.length > 2 ? `<button type="button" onclick="ScoreARQuizBuilder.removeOption(${oIdx})" style="background:none;border:none;color:#ff8a8a;cursor:pointer;font-size:13px;padding:4px;" title="حذف الخيار">✕</button>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div>
            <label style="display:block;color:#ddd8ff;font-size:13px;font-weight:800;margin-bottom:6px;">💡 شرح وتوضيح الإجابة (يظهر للطلاب بعد انتهاء السؤال):</label>
            <textarea oninput="ScoreARQuizBuilder.updateQuestionExplain(this.value)" placeholder="اكتب هنا التوضيح التعليمي أو القاعدة التي تظهر في شاشة النتيجة..." style="width:100%;height:68px;background:#13142c;border:1px solid rgba(142,100,239,0.3);border-radius:14px;color:#c9baff;font-size:13px;font-weight:700;padding:10px 14px;font-family:inherit;line-height:1.4;resize:vertical;">${q.explain}</textarea>
          </div>
        </main>
      </div>
    `;
    updateSaveIndicatorUI();
  }

  function addImportedQuestion(q) {
    if (!currentQuiz || !q) return;
    currentQuiz.questions.push(q);
    activeQIndex = currentQuiz.questions.length - 1;
    scheduleAutoSave();
    renderBuilderView();
  }

  function addImportedQuestionsBatch(questions) {
    if (!currentQuiz || !Array.isArray(questions) || !questions.length) return;
    questions.forEach(q => currentQuiz.questions.push(q));
    activeQIndex = currentQuiz.questions.length - 1;
    scheduleAutoSave();
    renderBuilderView();
    if (global.toast) global.toast(`تمت إضافة ${questions.length} سؤالاً بنجاح للمسابقة ✓`);
  }

  function getCurrentQuestion() {
    if (!currentQuiz || !currentQuiz.questions[activeQIndex]) return null;
    return currentQuiz.questions[activeQIndex];
  }

  global.ScoreARQuizBuilder = {
    openBuilder, closeBuilder, addQuestion, addImportedQuestion,
    addImportedQuestionsBatch, getCurrentQuestion, duplicateQuestion,
    deleteQuestion, moveQuestion, selectQuestion, updateQuizTitle,
    updateQuestionText, updateQuestionExplain, updateOptionText,
    setCorrectAnswer, addOption, removeOption, setQuestionTime,
    setQuestionPoints, retrySave, publishAndLaunchContest, validateQuiz
  };
})(typeof window !== 'undefined' ? window : this);
