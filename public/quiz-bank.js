/**
 * ScoreAR Quiz Bank & Quizzes Library Module (Item 2 Compliant)
 * Teacher Private Question Bank & Quizzes Library
 * Strict ownerUid security & ownership isolation
 * Live Search & Multi-criteria Filtering (Subject, Grade, Tag, Folder)
 * Folder Management, Quiz Duplication, Deletion, and Moving
 * Seamless Integration with Quiz Builder (Import to Quiz & Save to Bank)
 * Rule 7 Compliant (<500 lines)
 */
(function(global) {
  'use strict';
  let currentTab = 'quizzes'; // 'quizzes' | 'bank' | 'folders'
  let cachedQuizzes = [], cachedQuestions = [], cachedFolders = [];
  let activeFilter = { search: '', subject: 'all', grade: 'all', folderId: 'all', tag: 'all' };
  let currentUid = null, importTargetCallback = null;
  function getDb() {
    return (global.ScoreARAuth && global.ScoreARAuth.getDb) ? global.ScoreARAuth.getDb() : (global.firebase ? global.firebase.database() : null);
  }
  async function ensureAuthUser() {
    const auth = global.firebase && global.firebase.auth ? global.firebase.auth() : null;
    if (!auth) return null;
    if (!auth.currentUser) {
      try { await auth.signInAnonymously(); } catch(e){}
    }
    currentUid = auth.currentUser ? auth.currentUser.uid : 'anon_teacher';
    return currentUid;
  }
  function getOrCreateBankStage() {
    let stage = document.getElementById('scorearQuizBankStage');
    if (!stage) {
      stage = document.createElement('div');
      stage.id = 'scorearQuizBankStage';
      stage.style.cssText = 'position:fixed;inset:0;z-index:99998;background:#0c0d1e;overflow:hidden;font-family:Cairo,Tajawal,sans-serif;direction:rtl;display:flex;flex-direction:column;';
      document.body.appendChild(stage);
    }
    stage.style.display = 'flex';
    return stage;
  }
  async function openBankHub(defaultTab = 'quizzes') {
    currentTab = defaultTab;
    await ensureAuthUser();
    await refreshAllData();
    renderBankHubView();
  }
  function closeBankHub() {
    const stage = document.getElementById('scorearQuizBankStage');
    if (stage) stage.style.display = 'none';
  }
  async function refreshAllData() {
    await ensureAuthUser();
    const db = getDb();
    if (!db || !currentUid) return;
    try {
      const snapQ = await db.ref('scorear_quizzes').orderByChild('ownerUid').equalTo(currentUid).once('value');
      const qVal = snapQ.val() || {};
      cachedQuizzes = Object.keys(qVal).map(k => ({ ...qVal[k], id: k })).sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      const snapB = await db.ref('scorear_question_bank').orderByChild('ownerUid').equalTo(currentUid).once('value');
      const bVal = snapB.val() || {};
      cachedQuestions = Object.keys(bVal).map(k => ({ ...bVal[k], id: k })).sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
      const snapF = await db.ref('scorear_folders').orderByChild('ownerUid').equalTo(currentUid).once('value');
      const fVal = snapF.val() || {};
      cachedFolders = Object.keys(fVal).map(k => ({ ...fVal[k], id: k }));
    } catch(err) {
      console.warn('[ScoreAR QuizBank] Data fetch notice:', err.message);
    }
  }
  async function duplicateQuiz(quizId) {
    const original = cachedQuizzes.find(x => x.id === quizId);
    if (!original) return;
    await ensureAuthUser();
    const db = getDb();
    if (!db) return;
    const newId = 'quiz_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const clone = JSON.parse(JSON.stringify(original));
    clone.id = newId;
    clone.title = (original.title || 'مسابقة') + ' (نسخة)';
    clone.ownerUid = currentUid;
    clone.createdAt = Date.now();
    clone.updatedAt = Date.now();
    await db.ref('scorear_quizzes/' + newId).set(clone);
    if (global.toast) global.toast('تم تكرار المسابقة بنجاح ✓');
    await refreshAllData();
    renderBankHubView();
  }
  async function deleteQuiz(quizId) {
    if (!confirm('هل أنت متأكد من حذف هذه المسابقة نهائياً؟')) return;
    const db = getDb();
    if (!db) return;
    await db.ref('scorear_quizzes/' + quizId).remove();
    if (global.toast) global.toast('تم حذف المسابقة.');
    await refreshAllData();
    renderBankHubView();
  }
  function editQuiz(quizId) {
    const qz = cachedQuizzes.find(x => x.id === quizId);
    if (!qz) return;
    closeBankHub();
    if (global.ScoreARQuizBuilder && global.ScoreARQuizBuilder.openBuilder) {
      global.ScoreARQuizBuilder.openBuilder(qz);
    }
  }
  function launchQuizToRoom(quizId) {
    const qz = cachedQuizzes.find(x => x.id === quizId);
    if (!qz || !qz.questions || !qz.questions.length) {
      if (global.toast) global.toast('المسابقة لا تحتوي على أسئلة جاهزة للإطلاق.');
      return;
    }
    global.contestQuestions = JSON.parse(JSON.stringify(qz.questions));
    closeBankHub();
    if (global.toast) global.toast('تم تحميل المسابقة! اختر عالم المنافسة 🚀');
    if (global.ScoreARWorldFlow && typeof global.ScoreARWorldFlow.openWorldPicker === 'function') {
      global.ScoreARWorldFlow.openWorldPicker({
        defaultWorldId: 'royal',
        quizTitle: qz.title || 'مسابقة بنك الأسئلة',
        onConfirm: (chosenWorld) => {
          if (global.ScoreARQuizHost && global.ScoreARQuizHost.startHostLobby) {
            global.ScoreARQuizHost.startHostLobby(chosenWorld, null, true);
          } else if (global.renderLiveLobby) {
            global.renderLiveLobby(chosenWorld, null, true);
          }
        }
      });
    } else if (global.renderLiveLobby) {
      global.renderLiveLobby('royal', null);
    } else if (global.ScoreARQuizHost && global.ScoreARQuizHost.startHostLobby) {
      global.ScoreARQuizHost.startHostLobby('royal', null);
    }
  }
  async function saveQuestionToBank(qData, meta = {}) {
    await ensureAuthUser();
    const db = getDb();
    if (!db || !qData) return null;

    const evaluator = global.ScoreAREvaluator;
    const canonical = evaluator ? evaluator.normalizeQuestion(qData) : qData;
    const val = evaluator ? evaluator.validateQuestion(canonical) : { valid: true };
    if (!val.valid) {
      if (global.toast) global.toast(`تعذر حفظ السؤال: ${val.error}`);
      return null;
    }

    const qId = 'qb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const entry = {
      id: qId,
      ownerUid: currentUid,
      text: canonical.text,
      options: canonical.options,
      correct: canonical.correct,
      explanation: canonical.explanation,
      q: canonical.text,
      opts: canonical.options,
      ans: canonical.correct[0] ?? 0,
      explain: canonical.explanation,
      timeLimit: canonical.timeLimit || 20,
      points: canonical.points || 1000,
      subject: meta.subject || 'لغة عربية - نحو',
      grade: meta.grade || 'المرحلة الإعدادية',
      tags: meta.tags || ['نحو', 'لغة عربية'],
      folderId: meta.folderId || 'root',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await db.ref('scorear_question_bank/' + qId).set(entry);
    if (global.toast) global.toast('تم حفظ السؤال في بنك الأسئلة بنجاح ✓');
    await refreshAllData();
    return entry;
  }
  async function deleteQuestionFromBank(qId) {
    if (!confirm('هل تريد بالتأكيد حذف هذا السؤال من بنك الأسئلة؟')) return;
    const db = getDb();
    if (!db) return;
    await db.ref('scorear_question_bank/' + qId).remove();
    if (global.toast) global.toast('تم حذف السؤال من البنك.');
    await refreshAllData();
    renderBankHubView();
  }
  async function createFolder(name, type = 'all') {
    const fName = (name || '').trim();
    if (!fName) return;
    await ensureAuthUser();
    const db = getDb();
    if (!db) return;
    const fId = 'fld_' + Date.now();
    const fld = { id: fId, ownerUid: currentUid, name: fName, type: type, createdAt: Date.now() };
    await db.ref('scorear_folders/' + fId).set(fld);
    if (global.toast) global.toast('تم إنشاء المجلد: ' + fName);
    await refreshAllData();
    renderBankHubView();
  }
  async function moveItemToFolder(itemType, itemId, folderId) {
    const db = getDb();
    if (!db) return;
    const path = (itemType === 'quiz') ? 'scorear_quizzes/' : 'scorear_question_bank/';
    await db.ref(path + itemId + '/folderId').set(folderId);
    if (global.toast) global.toast('تم نقل العنصر إلى المجلد بنجاح ✓');
    await refreshAllData();
    renderBankHubView();
  }
  function getFilteredItems() {
    const qStr = (activeFilter.search || '').trim().toLowerCase();
    if (currentTab === 'quizzes') {
      return cachedQuizzes.filter(qz => {
        const mSearch = !qStr || (qz.title && qz.title.toLowerCase().includes(qStr));
        const mFolder = (activeFilter.folderId === 'all') || (qz.folderId === activeFilter.folderId);
        return mSearch && mFolder;
      });
    } else {
      return cachedQuestions.filter(item => {
        const mSearch = !qStr || (item.q && item.q.toLowerCase().includes(qStr)) || (item.opts && item.opts.some(o => o.toLowerCase().includes(qStr)));
        const mSubj = (activeFilter.subject === 'all') || (item.subject === activeFilter.subject);
        const mGrade = (activeFilter.grade === 'all') || (item.grade === activeFilter.grade);
        const mFolder = (activeFilter.folderId === 'all') || (item.folderId === activeFilter.folderId);
        const mTag = (activeFilter.tag === 'all') || (item.tags && (Array.isArray(item.tags) ? item.tags.includes(activeFilter.tag) : item.tags === activeFilter.tag));
        return mSearch && mSubj && mGrade && mFolder && mTag;
      });
    }
  }
  function openSaveQuestionModal(qData) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    if (!modal || !body) return;
    if (title) title.textContent = 'حفظ السؤال في بنك الأسئلة';
    body.innerHTML = `
      <div class="modal-body-pad" style="text-align:right;">
        <p style="color:#ffffff;font-weight:800;font-size:14px;margin-bottom:12px;">«${qData.q || 'سؤال جديد'}»</p>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <label style="color:#ddd8ff;font-size:12px;font-weight:700;display:block;margin-bottom:4px;">المادة والتخصص:</label>
            <select id="saveBankSubject" class="field" style="background:#111426;border-radius:10px;width:100%;font-weight:800;">
              <option value="لغة عربية - نحو">لغة عربية - نحو</option>
              <option value="لغة عربية - بلاغة">لغة عربية - بلاغة</option>
              <option value="لغة عربية - نصوص">لغة عربية - نصوص</option>
              <option value="تربية إسلامية">تربية إسلامية</option>
              <option value="عام">عام</option>
            </select>
          </div>
          <div>
            <label style="color:#ddd8ff;font-size:12px;font-weight:700;display:block;margin-bottom:4px;">الصف الدراسي:</label>
            <select id="saveBankGrade" class="field" style="background:#111426;border-radius:10px;width:100%;font-weight:800;">
              <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
              <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
              <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
              <option value="المرحلة الثانوية">المرحلة الثانوية</option>
            </select>
          </div>
          <div>
            <label style="color:#ddd8ff;font-size:12px;font-weight:700;display:block;margin-bottom:4px;">الوسوم (مفصولة بفواصل):</label>
            <input id="saveBankTags" class="field" value="نحو, مراجعة, إعراب" style="background:#111426;border-radius:10px;width:100%;font-weight:800;">
          </div>
          <div style="display:flex;gap:10px;margin-top:8px;">
            <button class="btn dark full" onclick="ScoreARQuizBank.submitSaveQuestionModal()" style="font-weight:900;padding:12px;">💾 حفظ في بنك الأسئلة الآن</button>
            <button class="btn light" onclick="closeModal()">إلغاء</button>
          </div>
        </div>
      </div>
    `;
    global._pendingBankQuestion = qData;
    if (!modal.open) modal.showModal();
  }
  async function submitSaveQuestionModal() {
    const qData = global._pendingBankQuestion;
    if (!qData) return;
    const subj = document.getElementById('saveBankSubject')?.value || 'لغة عربية - نحو';
    const gr = document.getElementById('saveBankGrade')?.value || 'الصف الأول الإعدادي';
    const rawTags = document.getElementById('saveBankTags')?.value || 'نحو';
    const tags = rawTags.split(',').map(t => t.trim()).filter(Boolean);
    await saveQuestionToBank(qData, { subject: subj, grade: gr, tags: tags });
    if (global.closeModal) global.closeModal();
    global._pendingBankQuestion = null;
  }
  function openImportModal(callback) {
    importTargetCallback = callback;
    openBankHub('bank');
  }
  function importQuestionToActiveQuiz(qId) {
    const q = cachedQuestions.find(x => x.id === qId);
    if (!q) return;
    const clone = {
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      q: q.q,
      opts: [...q.opts],
      ans: q.ans,
      explain: q.explain || '',
      timeLimit: q.timeLimit || 20,
      points: q.points || 1000
    };
    if (importTargetCallback) {
      importTargetCallback(clone);
      if (global.toast) global.toast('تم استيراد السؤال إلى المسابقة بنجاح ✓');
    } else if (global.ScoreARQuizBuilder && global.ScoreARQuizBuilder.addImportedQuestion) {
      global.ScoreARQuizBuilder.addImportedQuestion(clone);
      if (global.toast) global.toast('تمت إضافة السؤال لمسابقتك الحالية ✓');
    }
  }
  function renderBankHubView() {
    const stage = getOrCreateBankStage();
    const items = getFilteredItems();
    const subjects = ['لغة عربية - نحو', 'لغة عربية - بلاغة', 'لغة عربية - نصوص', 'تربية إسلامية'];
    const grades = ['الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي', 'المرحلة الثانوية'];
    const allTags = Array.from(new Set(cachedQuestions.flatMap(q => Array.isArray(q.tags) ? q.tags : [q.tags]).filter(Boolean)));
    stage.innerHTML = `
      <header style="background:#101124;border-bottom:1px solid rgba(142,100,239,0.3);padding:12px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;z-index:20;">
        <div style="display:flex;background:#181938;padding:4px;border-radius:12px;border:1px solid rgba(142,100,239,0.3);">
          <button onclick="ScoreARQuizBank.switchTab('quizzes')" style="background:${currentTab==='quizzes'?'#7550ef':'transparent'};color:${currentTab==='quizzes'?'#fff':'#a1a4be'};border:none;padding:6px 14px;border-radius:8px;font-weight:900;font-size:12px;cursor:pointer;">📚 مسابقاتي (${cachedQuizzes.length})</button>
          <button onclick="ScoreARQuizBank.switchTab('bank')" style="background:${currentTab==='bank'?'#7550ef':'transparent'};color:${currentTab==='bank'?'#fff':'#a1a4be'};border:none;padding:6px 14px;border-radius:8px;font-weight:900;font-size:12px;cursor:pointer;">💡 بنك الأسئلة (${cachedQuestions.length})</button>
          <button onclick="ScoreARQuizBank.switchTab('folders')" style="background:${currentTab==='folders'?'#7550ef':'transparent'};color:${currentTab==='folders'?'#fff':'#a1a4be'};border:none;padding:6px 14px;border-radius:8px;font-weight:900;font-size:12px;cursor:pointer;">📁 المجلدات (${cachedFolders.length})</button>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <button onclick="ScoreARQuizReports.openReportsHub()" style="background:#192038;color:#a89bff;border:1px solid #7550ef;padding:8px 14px;border-radius:10px;font-size:12px;font-weight:900;cursor:pointer;">📊 التقارير</button>
          <button onclick="ScoreARQuizAI.openAiStudio({mode:'hub'})" style="background:#2a1b4e;color:#c084fc;border:1px solid #a855f7;padding:8px 14px;border-radius:10px;font-size:12px;font-weight:900;cursor:pointer;">✨ توليد AI</button>
          <button onclick="ScoreARQuizImporter.openImporter({mode:'hub'})" style="background:#1e3a29;color:#34d399;border:1px solid #10b981;padding:8px 14px;border-radius:10px;font-size:12px;font-weight:900;cursor:pointer;">📥 استيراد Excel</button>
          ${currentTab === 'quizzes' ? `<button onclick="ScoreARQuizBank.createNewQuizInBuilder()" style="background:linear-gradient(135deg, #7550ef, #582cd1);color:#fff;border:none;padding:8px 16px;border-radius:10px;font-size:12px;font-weight:900;cursor:pointer;">+ مسابقة جديدة 🚀</button>` : currentTab === 'bank' ? `<button onclick="ScoreARQuizBank.promptAddQuickQuestion()" style="background:linear-gradient(135deg, #10b981, #047857);color:#fff;border:none;padding:8px 16px;border-radius:10px;font-size:12px;font-weight:900;cursor:pointer;">+ سؤال جديد للبنك</button>` : `<button onclick="ScoreARQuizBank.promptCreateFolder()" style="background:#7550ef;color:#fff;border:none;padding:8px 16px;border-radius:10px;font-size:12px;font-weight:900;cursor:pointer;">+ إنشاء مجلد جديد</button>`}
          <button onclick="ScoreARQuizBank.closeBankHub()" style="background:rgba(255,255,255,0.08);color:#d1d5db;border:1px solid rgba(255,255,255,0.15);padding:8px 14px;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;">إغلاق ✕</button>
        </div>
      </header>
      ${currentTab !== 'folders' ? `
        <div style="background:#13142e;border-bottom:1px solid rgba(142,100,239,0.2);padding:10px 24px;display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
          <input type="text" value="${activeFilter.search}" oninput="ScoreARQuizBank.setSearchFilter(this.value)" placeholder="🔍 بحث في ${currentTab==='quizzes'?'المسابقات':'الأسئلة'}..." style="background:#1c1e42;border:1px solid rgba(142,100,239,0.3);color:#fff;padding:6px 12px;border-radius:10px;font-size:12px;width:220px;font-family:inherit;">
          ${currentTab === 'bank' ? `
            <select onchange="ScoreARQuizBank.setSubjectFilter(this.value)" style="background:#1c1e42;border:1px solid rgba(142,100,239,0.3);color:#fff;padding:6px 10px;border-radius:10px;font-size:11px;font-weight:800;font-family:inherit;"><option value="all">كل المواد</option>${subjects.map(s=>`<option value="${s}" ${activeFilter.subject===s?'selected':''}>${s}</option>`).join('')}</select>
            <select onchange="ScoreARQuizBank.setGradeFilter(this.value)" style="background:#1c1e42;border:1px solid rgba(142,100,239,0.3);color:#fff;padding:6px 10px;border-radius:10px;font-size:11px;font-weight:800;font-family:inherit;"><option value="all">كل المراحل</option>${grades.map(g=>`<option value="${g}" ${activeFilter.grade===g?'selected':''}>${g}</option>`).join('')}</select>
          ` : ''}
          <select onchange="ScoreARQuizBank.setFolderFilter(this.value)" style="background:#1c1e42;border:1px solid rgba(142,100,239,0.3);color:#fff;padding:6px 10px;border-radius:10px;font-size:11px;font-weight:800;font-family:inherit;"><option value="all">كل المجلدات</option>${cachedFolders.map(f=>`<option value="${f.id}" ${activeFilter.folderId===f.id?'selected':''}>📁 ${f.name}</option>`).join('')}</select>
          ${allTags.length > 0 && currentTab === 'bank' ? `
            <div style="display:flex;align-items:center;gap:4px;">
              ${allTags.slice(0, 5).map(t => `<button onclick="ScoreARQuizBank.setTagFilter('${t}')" style="background:${activeFilter.tag===t?'#7550ef':'rgba(142,100,239,0.15)'};color:${activeFilter.tag===t?'#fff':'#c4b5fd'};border:1px solid rgba(142,100,239,0.3);padding:3px 8px;border-radius:10px;font-size:10px;font-weight:800;cursor:pointer;">#${t}</button>`).join('')}
              ${activeFilter.tag !== 'all' ? `<button onclick="ScoreARQuizBank.setTagFilter('all')" style="background:none;border:none;color:#ff8a8a;font-size:10px;cursor:pointer;">✕ إلغاء</button>` : ''}
            </div>
          ` : ''}
        </div>
      ` : ''}
      <main style="flex:1;padding:20px;overflow-y:auto;">
        ${currentTab === 'quizzes' ? renderQuizzesGridHtml(items) : currentTab === 'bank' ? renderQuestionsGridHtml(items) : renderFoldersGridHtml()}
      </main>
    `;
  }
  function renderQuizzesGridHtml(items) {
    if (!items.length) return `<div style="text-align:center;padding:50px 20px;color:#a1a4be;"><div style="font-size:42px;margin-bottom:8px;">📚</div><h3 style="color:#fff;font-size:16px;">لا توجد مسابقات تطابق البحث</h3></div>`;
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));gap:14px;">
        ${items.map(qz => {
          const count = qz.questions ? qz.questions.length : 0;
          const folder = cachedFolders.find(f => f.id === qz.folderId);
          return `
            <div style="background:#13142e;border:1px solid rgba(142,100,239,0.25);border-radius:14px;padding:14px;display:flex;flex-direction:column;justify-content:space-between;gap:10px;">
              <div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                  <span style="background:${qz.status==='published'?'rgba(16,185,129,0.2)':'rgba(245,158,11,0.2)'};color:${qz.status==='published'?'#34d399':'#fcd34d'};border:1px solid currentColor;font-size:10px;font-weight:900;padding:2px 8px;border-radius:6px;">${qz.status === 'published' ? 'منشورة ✓' : 'مسودة 📝'}</span>
                  ${folder ? `<span style="font-size:11px;color:#c4b5fd;">📁 ${folder.name}</span>` : ''}
                </div>
                <h3 style="color:#ffffff;font-size:15px;font-weight:900;margin:0 0 4px 0;">${qz.title || 'مسابقة بدون عنوان'}</h3>
                <small style="color:#a1a4be;font-size:11px;">عدد الأسئلة: <b style="color:#52d9ed;">${count} أسئلة</b></small>
              </div>
              <div style="display:flex;gap:5px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,0.08);padding-top:10px;">
                <button onclick="ScoreARQuizBank.launchQuizToRoom('${qz.id}')" style="flex:2;background:linear-gradient(135deg, #7550ef, #582cd1);color:#fff;border:none;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:900;cursor:pointer;">🚀 إطلاق القاعة</button>
                <button onclick="ScoreARQuizBank.editQuiz('${qz.id}')" style="flex:1;background:#231f45;border:1px solid #7550ef;color:#c4b5fd;padding:6px 8px;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;">✏️ تعديل</button>
                <button onclick="ScoreARQuizBank.duplicateQuiz('${qz.id}')" style="background:rgba(255,255,255,0.08);color:#ddd;border:none;padding:6px 8px;border-radius:8px;font-size:11px;cursor:pointer;" title="تكرار">📋</button>
                <button onclick="ScoreARQuizBank.promptMoveQuiz('${qz.id}')" style="background:rgba(255,255,255,0.08);color:#ddd;border:none;padding:6px 8px;border-radius:8px;font-size:11px;cursor:pointer;" title="نقل لمجلد">📁</button>
                <button onclick="ScoreARQuizBank.deleteQuiz('${qz.id}')" style="background:rgba(239,68,68,0.2);color:#ff8a8a;border:none;padding:6px 8px;border-radius:8px;font-size:11px;cursor:pointer;" title="حذف">✕</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
  function renderQuestionsGridHtml(items) {
    if (!items.length) return `<div style="text-align:center;padding:50px 20px;color:#a1a4be;"><div style="font-size:42px;margin-bottom:8px;">💡</div><h3 style="color:#fff;font-size:16px;">لا توجد أسئلة تطابق التصفية</h3></div>`;
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));gap:14px;">
        ${items.map(q => `
          <div style="background:#13142e;border:1px solid rgba(142,100,239,0.25);border-radius:14px;padding:14px;display:flex;flex-direction:column;justify-content:space-between;gap:10px;">
            <div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <span style="background:#221e42;color:#52d9ed;font-size:10px;font-weight:900;padding:2px 8px;border-radius:6px;">${q.subject || 'عام'}</span>
                <span style="font-size:11px;color:#a1a4be;">${q.grade || ''}</span>
              </div>
              <h4 style="color:#ffffff;font-size:14px;font-weight:900;margin:0 0 6px 0;line-height:1.4;">${q.q}</h4>
              <div style="font-size:11px;color:#34d399;font-weight:800;margin-bottom:2px;">الإجابة: «${q.opts[q.ans] || ''}»</div>
              ${q.explain ? `<div style="font-size:10px;color:#a89bff;">💡 ${q.explain}</div>` : ''}
            </div>
            <div style="display:flex;gap:6px;border-top:1px solid rgba(255,255,255,0.08);padding-top:8px;">
              <button onclick="ScoreARQuizBank.importQuestionToActiveQuiz('${q.id}')" style="flex:1;background:linear-gradient(135deg, #10b981, #047857);color:#fff;border:none;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:900;cursor:pointer;">+ إضافة لمسابقتي</button>
              <button onclick="ScoreARQuizBank.deleteQuestionFromBank('${q.id}')" style="background:rgba(239,68,68,0.2);color:#ff8a8a;border:none;padding:6px 8px;border-radius:8px;font-size:11px;cursor:pointer;" title="حذف">✕</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  function renderFoldersGridHtml() {
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:14px;">
        ${cachedFolders.map(f => {
          const qCount = cachedQuizzes.filter(q => q.folderId === f.id).length;
          const bCount = cachedQuestions.filter(q => q.folderId === f.id).length;
          return `
            <div style="background:#13142e;border:1px solid rgba(142,100,239,0.3);border-radius:12px;padding:14px;display:flex;align-items:center;justify-content:space-between;">
              <div>
                <h4 style="color:#ffffff;font-size:14px;font-weight:900;margin:0 0 2px 0;">📁 ${f.name}</h4>
                <small style="color:#a1a4be;font-size:10px;">${qCount} مسابقات • ${bCount} أسئلة</small>
              </div>
              <button onclick="ScoreARQuizBank.deleteFolder('${f.id}')" style="background:none;border:none;color:#ff8a8a;cursor:pointer;font-size:12px;" title="حذف المجلد">✕</button>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
  function createNewQuizInBuilder() {
    closeBankHub();
    if (global.ScoreARQuizBuilder && global.ScoreARQuizBuilder.openBuilder) global.ScoreARQuizBuilder.openBuilder(null);
  }
  function promptCreateFolder() {
    const name = prompt('اكتب اسم المجلد الجديد (مثال: مراجعة نحو، الصف الثاني الإعدادي):');
    if (name) createFolder(name);
  }
  function promptMoveQuiz(quizId) {
    if (!cachedFolders.length) {
      if (global.toast) global.toast('لا توجد مجلدات بعد. أنشئ مجلداً أولاً من تبويب المجلدات.');
      return;
    }
    const opts = cachedFolders.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
    const choice = prompt('اختر رقم المجلد لنقل المسابقة إليه:\n' + opts);
    const idx = Number(choice) - 1;
    if (cachedFolders[idx]) moveItemToFolder('quiz', quizId, cachedFolders[idx].id);
  }
  async function deleteFolder(folderId) {
    if (!confirm('هل تريد حذف هذا المجلد؟ (لن تُحذف الأسئلة والمسابقات)')) return;
    const db = getDb();
    if (!db) return;
    await db.ref('scorear_folders/' + folderId).remove();
    await refreshAllData();
    renderBankHubView();
  }
  function promptAddQuickQuestion() {
    const qText = prompt('اكتب نص السؤال الجديد لإضافته للبنك:');
    if (!qText || !qText.trim()) return;
    const ansText = prompt('اكتب الإجابة الصحيحة:');
    if (!ansText || !ansText.trim()) return;
    const w1 = prompt('اكتب خياراً خاطئاً (1):') || 'خيار غير صحيح';
    const w2 = prompt('اكتب خياراً خاطئاً (2):') || 'خيار آخر';
    saveQuestionToBank({
      q: qText.trim(),
      opts: [ansText.trim(), w1.trim(), w2.trim()],
      ans: 0,
      explain: 'سؤال مدخل في بنك الأسئلة المعتمد.'
    });
  }
  global.ScoreARQuizBank = {
    openBankHub,
    closeBankHub,
    switchTab: (t) => { currentTab = t; renderBankHubView(); },
    setSearchFilter: (s) => { activeFilter.search = s; renderBankHubView(); },
    setSubjectFilter: (s) => { activeFilter.subject = s; renderBankHubView(); },
    setGradeFilter: (g) => { activeFilter.grade = g; renderBankHubView(); },
    setFolderFilter: (f) => { activeFilter.folderId = f; renderBankHubView(); },
    setTagFilter: (t) => { activeFilter.tag = t; renderBankHubView(); },
    duplicateQuiz,
    deleteQuiz,
    editQuiz,
    launchQuizToRoom,
    saveQuestionToBank,
    deleteQuestionFromBank,
    createFolder,
    deleteFolder,
    moveItemToFolder,
    promptCreateFolder,
    promptMoveQuiz,
    promptAddQuickQuestion,
    createNewQuizInBuilder,
    openSaveQuestionModal,
    submitSaveQuestionModal,
    openImportModal,
    importQuestionToActiveQuiz
  };
})(typeof window !== 'undefined' ? window : this);
