/**
 * ScoreAR Quiz Bank & Library View (quiz-bank.js)
 * Item 2: Redesigned Question Bank matching site aesthetics (World-accented cards, SVG icons,
 * Grid/List switch, Quick Preview drawer, Free optional subject/grade datalists,
 * Source/Type/Date filters, Multi-select batch actions, and 5s Undo Deletions).
 * Strictly Rule 7 Compliant (<500 lines).
 */
(function (global) {
  'use strict';

  let currentTab = 'quizzes'; // 'quizzes' | 'bank' | 'folders'
  let viewMode = 'grid'; // 'grid' | 'list'
  let activePage = 1;
  const pageSize = 12;
  const selectedItemIds = new Set();
  let previewQuestion = null;
  let undoNotification = null;
  let activeUndoHandle = null;

  const filters = { search: '', subject: 'all', grade: 'all', tag: 'all', source: 'all', type: 'all', dateFilter: 'all', folderId: 'all' };

  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  const ICONS = {
    search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
    grid: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,
    list: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>`,
    eye: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
    copy: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
    folder: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`,
    trash: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
    rocket: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>`,
    plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`
  };

  function getOrCreateBankStage() {
    let s = document.getElementById('scorearQuizBankStage');
    if (!s) {
      s = document.createElement('div');
      s.id = 'scorearQuizBankStage';
      s.style.cssText = 'position:fixed;inset:0;z-index:99998;background:#0c0d1e;overflow:hidden;font-family:Cairo,Tajawal,sans-serif;direction:rtl;display:flex;flex-direction:column;';
      document.body.appendChild(s);
    }
    s.style.display = 'flex';
    return s;
  }

  async function openBankHub(defaultTab = 'quizzes') {
    currentTab = defaultTab;
    activePage = 1;
    selectedItemIds.clear();
    previewQuestion = null;
    getOrCreateBankStage();
    if (global.ScoreARQuizBankData) await global.ScoreARQuizBankData.refreshAllData();
    renderBankHubView();
  }

  function closeBankHub() {
    const s = document.getElementById('scorearQuizBankStage');
    if (s) s.style.display = 'none';
  }

  function renderBankHubView() {
    const stage = getOrCreateBankStage();
    const dataMod = global.ScoreARQuizBankData;
    const allQuizzes = dataMod ? dataMod.getQuizzes() : [];
    const allQuestions = dataMod ? dataMod.getQuestions() : [];
    const allFolders = dataMod ? dataMod.getFolders() : [];
    const subjects = dataMod ? dataMod.getUniqueSubjects() : [];
    const grades = dataMod ? dataMod.getUniqueGrades() : [];

    let pData = { items: [], totalItems: 0, totalPages: 1, currentPage: 1 };
    if (dataMod) {
      pData = (currentTab === 'quizzes')
        ? dataMod.getFilteredQuizzes({ ...filters, page: activePage, pageSize })
        : dataMod.getFilteredQuestions({ ...filters, page: activePage, pageSize });
    }

    stage.innerHTML = `
      <!-- Top Bar -->
      <header style="background:#101124;border-bottom:1px solid rgba(142,100,239,0.3);padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;z-index:20;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="display:flex;background:#181938;padding:3px;border-radius:12px;border:1px solid rgba(142,100,239,0.3);">
            <button onclick="ScoreARQuizBank.switchTab('quizzes')" style="background:${currentTab==='quizzes'?'#7550ef':'transparent'};color:${currentTab==='quizzes'?'#fff':'#a1a4be'};border:none;padding:6px 12px;border-radius:8px;font-weight:900;font-size:12px;cursor:pointer;">📚 مسابقاتي (${allQuizzes.length})</button>
            <button onclick="ScoreARQuizBank.switchTab('bank')" style="background:${currentTab==='bank'?'#7550ef':'transparent'};color:${currentTab==='bank'?'#fff':'#a1a4be'};border:none;padding:6px 12px;border-radius:8px;font-weight:900;font-size:12px;cursor:pointer;">💡 بنك الأسئلة (${allQuestions.length})</button>
            <button onclick="ScoreARQuizBank.switchTab('folders')" style="background:${currentTab==='folders'?'#7550ef':'transparent'};color:${currentTab==='folders'?'#fff':'#a1a4be'};border:none;padding:6px 12px;border-radius:8px;font-weight:900;font-size:12px;cursor:pointer;">📁 المجلدات (${allFolders.length})</button>
          </div>
          <div style="display:flex;background:#181938;padding:3px;border-radius:8px;border:1px solid rgba(142,100,239,0.2);">
            <button onclick="ScoreARQuizBank.setViewMode('grid')" style="background:${viewMode==='grid'?'#7550ef':'transparent'};color:#fff;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;" title="عرض شبكي">${ICONS.grid}</button>
            <button onclick="ScoreARQuizBank.setViewMode('list')" style="background:${viewMode==='list'?'#7550ef':'transparent'};color:#fff;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;" title="عرض قائمة">${ICONS.list}</button>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button onclick="ScoreARQuizAI.openAiStudio({mode:'hub'})" style="background:#2a1b4e;color:#c084fc;border:1px solid #a855f7;padding:6px 12px;border-radius:10px;font-size:11px;font-weight:900;cursor:pointer;">✨ توليد AI</button>
          <button onclick="ScoreARQuizImporter.openImporter({mode:'hub'})" style="background:#1e3a29;color:#34d399;border:1px solid #10b981;padding:6px 12px;border-radius:10px;font-size:11px;font-weight:900;cursor:pointer;">📥 استيراد Excel</button>
          ${currentTab === 'quizzes' ? `<button onclick="ScoreARQuizBank.createNewQuiz()" style="background:linear-gradient(135deg, #7550ef, #582cd1);color:#fff;border:none;padding:6px 14px;border-radius:10px;font-size:12px;font-weight:900;cursor:pointer;">+ مسابقة جديدة</button>` : currentTab === 'bank' ? `<button onclick="ScoreARQuizBank.openAddQuestionModal()" style="background:linear-gradient(135deg, #10b981, #047857);color:#fff;border:none;padding:6px 14px;border-radius:10px;font-size:12px;font-weight:900;cursor:pointer;">+ سؤال للبنك</button>` : `<button onclick="ScoreARQuizBank.openCreateFolderModal()" style="background:#7550ef;color:#fff;border:none;padding:6px 14px;border-radius:10px;font-size:12px;font-weight:900;cursor:pointer;">+ إنشاء مجلد</button>`}
          <button onclick="ScoreARQuizBank.closeBankHub()" style="background:rgba(255,255,255,0.08);color:#d1d5db;border:1px solid rgba(255,255,255,0.15);padding:6px 12px;border-radius:10px;font-size:12px;cursor:pointer;">✕</button>
        </div>
      </header>

      <!-- Filter Bar -->
      ${currentTab !== 'folders' ? `
        <div style="background:#13142e;border-bottom:1px solid rgba(142,100,239,0.2);padding:8px 20px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;">
          <input type="text" value="${esc(filters.search)}" oninput="ScoreARQuizBank.setFilter('search', this.value)" placeholder="🔍 بحث بالاسم أو النص..." style="background:#1c1e42;border:1px solid rgba(142,100,239,0.3);color:#fff;padding:5px 10px;border-radius:8px;font-size:11px;width:160px;">
          ${currentTab === 'bank' ? `
            <input list="bankSubjDl" value="${filters.subject === 'all' ? '' : esc(filters.subject)}" onchange="ScoreARQuizBank.setFilter('subject', this.value || 'all')" placeholder="المادة (حرة)..." style="background:#1c1e42;border:1px solid rgba(142,100,239,0.3);color:#fff;padding:5px 8px;border-radius:8px;font-size:11px;width:110px;">
            <datalist id="bankSubjDl">${subjects.map(s => `<option value="${esc(s)}"></option>`).join('')}</datalist>
            <input list="bankGrdDl" value="${filters.grade === 'all' ? '' : esc(filters.grade)}" onchange="ScoreARQuizBank.setFilter('grade', this.value || 'all')" placeholder="الصف (حر)..." style="background:#1c1e42;border:1px solid rgba(142,100,239,0.3);color:#fff;padding:5px 8px;border-radius:8px;font-size:11px;width:100px;">
            <datalist id="bankGrdDl">${grades.map(g => `<option value="${esc(g)}"></option>`).join('')}</datalist>
            <select onchange="ScoreARQuizBank.setFilter('source', this.value)" style="background:#1c1e42;border:1px solid rgba(142,100,239,0.3);color:#c4b5fd;padding:5px 8px;border-radius:8px;font-size:11px;">
              <option value="all" ${filters.source==='all'?'selected':''}>كل المصادر</option>
              <option value="manual" ${filters.source==='manual'?'selected':''}>✍️ يدوي</option>
              <option value="import" ${filters.source==='import'?'selected':''}>📥 استيراد</option>
              <option value="ai" ${filters.source==='ai'?'selected':''}>✨ ذكاء اصطناعي</option>
            </select>
            <select onchange="ScoreARQuizBank.setFilter('type', this.value)" style="background:#1c1e42;border:1px solid rgba(142,100,239,0.3);color:#c4b5fd;padding:5px 8px;border-radius:8px;font-size:11px;">
              <option value="all" ${filters.type==='all'?'selected':''}>كل الأنواع</option>
              <option value="mcq" ${filters.type==='mcq'?'selected':''}>🔘 اختيار متعدد</option>
              <option value="tf" ${filters.type==='tf'?'selected':''}>⚖️ صح أو خطأ</option>
            </select>
          ` : ''}
          <select onchange="ScoreARQuizBank.setFilter('folderId', this.value)" style="background:#1c1e42;border:1px solid rgba(142,100,239,0.3);color:#c4b5fd;padding:5px 8px;border-radius:8px;font-size:11px;">
            <option value="all">كل المجلدات</option>
            ${allFolders.map(f => `<option value="${f.id}" ${filters.folderId===f.id?'selected':''}>📁 ${esc(f.name)}</option>`).join('')}
          </select>
          <select onchange="ScoreARQuizBank.setFilter('dateFilter', this.value)" style="background:#1c1e42;border:1px solid rgba(142,100,239,0.3);color:#c4b5fd;padding:5px 8px;border-radius:8px;font-size:11px;">
            <option value="all" ${filters.dateFilter==='all'?'selected':''}>كل التواريخ</option>
            <option value="today" ${filters.dateFilter==='today'?'selected':''}>اليوم</option>
            <option value="week" ${filters.dateFilter==='week'?'selected':''}>هذا الأسبوع</option>
          </select>
        </div>
      ` : ''}

      <!-- Main Grid/List Container -->
      <main style="flex:1;padding:16px 20px;overflow-y:auto;position:relative;">
        ${currentTab === 'quizzes' ? renderQuizzes(pData.items) : currentTab === 'bank' ? renderQuestions(pData.items) : renderFolders(allFolders)}
        ${pData.totalPages > 1 ? renderPagination(pData) : ''}
      </main>

      <!-- Batch Toolbar -->
      ${selectedItemIds.size > 0 ? `
        <div style="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#171836;border:2px solid #7550ef;border-radius:14px;padding:8px 16px;display:flex;align-items:center;gap:12px;z-index:99999;box-shadow:0 8px 30px rgba(0,0,0,0.7);">
          <span style="color:#fff;font-weight:900;font-size:12px;">تم تحديد <b style="color:#52d9ed;">${selectedItemIds.size}</b> عنصر</span>
          ${currentTab === 'bank' ? `<button onclick="ScoreARQuizBank.batchAddToQuiz()" style="background:#1e3a29;color:#34d399;border:1px solid #10b981;padding:5px 10px;border-radius:6px;font-size:11px;cursor:pointer;">+ إضافة للمسابقة</button>` : ''}
          <button onclick="ScoreARQuizBank.batchDeleteWithUndo()" style="background:rgba(239,68,68,0.2);color:#fca5a5;border:1px solid #ef4444;padding:5px 10px;border-radius:6px;font-size:11px;cursor:pointer;">🗑️ حذف بتراجع</button>
          <button onclick="ScoreARQuizBank.clearSelection()" style="background:none;border:none;color:#9ca3af;font-size:11px;cursor:pointer;">إلغاء ✕</button>
        </div>
      ` : ''}

      <!-- Undo Banner -->
      ${undoNotification ? `
        <div style="position:fixed;top:16px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;border-radius:10px;padding:8px 16px;display:flex;align-items:center;gap:12px;z-index:99999;font-weight:900;font-size:12px;box-shadow:0 4px 16px rgba(0,0,0,0.5);">
          <span>${esc(undoNotification.message)}</span>
          <button onclick="ScoreARQuizBank.triggerUndo()" style="background:#fff;color:#047857;border:none;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:900;cursor:pointer;">↩️ تراجع (${undoNotification.seconds}s)</button>
        </div>
      ` : ''}

      <!-- Preview Drawer -->
      ${previewQuestion ? renderPreviewDrawer(previewQuestion) : ''}
    `;
  }

  function renderQuizzes(items) {
    if (!items.length) return `<div style="text-align:center;padding:40px;color:#9ca3af;">📚 لا توجد مسابقات تطابق البحث.</div>`;
    const layout = viewMode === 'grid' ? 'display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:12px;' : 'display:flex;flex-direction:column;gap:8px;';
    return `
      <div style="${layout}">
        ${items.map(qz => {
          const isSel = selectedItemIds.has(qz.id);
          const count = qz.questions ? qz.questions.length : 0;
          return `
            <div style="background:#14152e;border:1.5px solid ${isSel ? '#7550ef' : 'rgba(142,100,239,0.25)'};border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;justify-content:space-between;gap:8px;">
              <div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <input type="checkbox" ${isSel ? 'checked' : ''} onchange="ScoreARQuizBank.toggleSelectItem('${qz.id}')" style="accent-color:#7550ef;cursor:pointer;">
                    <span style="background:${qz.status==='published'?'rgba(16,185,129,0.2)':'rgba(245,158,11,0.2)'};color:${qz.status==='published'?'#34d399':'#fcd34d'};font-size:10px;font-weight:900;padding:2px 6px;border-radius:6px;">${qz.status === 'published' ? 'منشورة ✓' : 'مسودة'}</span>
                  </div>
                  <span style="color:#52d9ed;font-size:11px;font-weight:800;">${count} أسئلة</span>
                </div>
                <h3 style="color:#fff;font-size:14px;font-weight:900;margin:0;">${esc(qz.title || 'مسابقة')}</h3>
              </div>
              <div style="display:flex;gap:6px;border-top:1px solid rgba(255,255,255,0.08);padding-top:8px;">
                <button onclick="ScoreARQuizBank.launchQuiz('${qz.id}')" style="flex:2;background:linear-gradient(135deg, #7550ef, #582cd1);color:#fff;border:none;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:900;cursor:pointer;">${ICONS.rocket} إطلاق القاعة</button>
                <button onclick="ScoreARQuizBank.editQuiz('${qz.id}')" style="background:#231f45;border:1px solid #7550ef;color:#c4b5fd;padding:6px 10px;border-radius:8px;font-size:11px;cursor:pointer;">تعديل</button>
                <button onclick="ScoreARQuizBank.duplicateQuiz('${qz.id}')" style="background:rgba(255,255,255,0.08);color:#ddd;border:none;padding:6px 8px;border-radius:8px;cursor:pointer;" title="تكرار">${ICONS.copy}</button>
                <button onclick="ScoreARQuizBank.deleteQuizWithUndo('${qz.id}')" style="background:rgba(239,68,68,0.2);color:#ff8a8a;border:none;padding:6px 8px;border-radius:8px;cursor:pointer;" title="حذف">${ICONS.trash}</button>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  function renderQuestions(items) {
    if (!items.length) return `<div style="text-align:center;padding:40px;color:#9ca3af;">💡 لا توجد أسئلة تطابق التصفية.</div>`;
    const layout = viewMode === 'grid' ? 'display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:12px;' : 'display:flex;flex-direction:column;gap:8px;';
    return `
      <div style="${layout}">
        ${items.map(q => {
          const isSel = selectedItemIds.has(q.id);
          const src = q.source === 'ai' ? '✨ AI' : q.source === 'import' ? '📥 استيراد' : '✍️ يدوي';
          return `
            <div style="background:#14152e;border:1.5px solid ${isSel ? '#7550ef' : 'rgba(142,100,239,0.25)'};border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;justify-content:space-between;gap:6px;">
              <div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <input type="checkbox" ${isSel ? 'checked' : ''} onchange="ScoreARQuizBank.toggleSelectItem('${q.id}')" style="accent-color:#7550ef;cursor:pointer;">
                    <span style="background:rgba(142,100,239,0.2);color:#c4b5fd;font-size:10px;font-weight:800;padding:2px 6px;border-radius:6px;">${src}</span>
                    ${q.subject ? `<span style="color:#93c5fd;font-size:10px;">${esc(q.subject)}</span>` : ''}
                  </div>
                  <span style="color:#52d9ed;font-size:11px;font-weight:800;">${q.timeLimit || 20}ث</span>
                </div>
                <h4 style="color:#fff;font-size:13px;font-weight:800;margin:0 0 4px 0;line-height:1.4;">${esc(q.q || q.text)}</h4>
                <div style="color:#34d399;font-size:11px;font-weight:800;">الإجابة: «${esc(q.opts ? q.opts[q.ans] : '')}»</div>
              </div>
              <div style="display:flex;gap:6px;border-top:1px solid rgba(255,255,255,0.08);padding-top:6px;">
                <button onclick="ScoreARQuizBank.openPreview('${q.id}')" style="background:#231f45;border:1px solid #7550ef;color:#c4b5fd;padding:5px 8px;border-radius:6px;font-size:11px;cursor:pointer;">${ICONS.eye} معاينة</button>
                <button onclick="ScoreARQuizBank.addToActiveQuiz('${q.id}')" style="flex:1;background:linear-gradient(135deg, #10b981, #047857);color:#fff;border:none;padding:5px 8px;border-radius:6px;font-size:11px;font-weight:900;cursor:pointer;">+ للمسابقة</button>
                <button onclick="ScoreARQuizBank.deleteQuestionWithUndo('${q.id}')" style="background:rgba(239,68,68,0.2);color:#ff8a8a;border:none;padding:5px 8px;border-radius:6px;cursor:pointer;" title="حذف">${ICONS.trash}</button>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  function renderFolders(folders) {
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:12px;">
        ${folders.map(f => `
          <div style="background:#14152e;border:1.5px solid rgba(142,100,239,0.3);border-radius:14px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:20px;color:#7550ef;">📁</span>
              <h4 style="color:#fff;font-size:13px;font-weight:900;margin:0;">${esc(f.name)}</h4>
            </div>
            <button onclick="ScoreARQuizBank.deleteFolder('${f.id}')" style="background:none;border:none;color:#ff8a8a;cursor:pointer;font-size:14px;">✕</button>
          </div>`).join('')}
      </div>`;
  }

  function renderPagination(pData) {
    return `
      <div style="display:flex;justify-content:center;align-items:center;gap:8px;margin-top:16px;">
        <button onclick="ScoreARQuizBank.changePage(${pData.currentPage - 1})" ${pData.currentPage <= 1 ? 'disabled' : ''} style="background:#1a1c3d;color:#fff;border:1px solid rgba(142,100,239,0.3);padding:5px 12px;border-radius:8px;font-size:11px;cursor:pointer;">السابق</button>
        <span style="color:#a1a4be;font-size:12px;">صفحة ${pData.currentPage} من ${pData.totalPages}</span>
        <button onclick="ScoreARQuizBank.changePage(${pData.currentPage + 1})" ${pData.currentPage >= pData.totalPages ? 'disabled' : ''} style="background:#1a1c3d;color:#fff;border:1px solid rgba(142,100,239,0.3);padding:5px 12px;border-radius:8px;font-size:11px;cursor:pointer;">التالي</button>
      </div>`;
  }

  function renderPreviewDrawer(q) {
    return `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:999999;display:flex;justify-content:flex-end;">
        <div style="background:#14152e;border-left:2px solid #7550ef;width:100%;max-width:380px;height:100%;padding:18px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;overflow-y:auto;">
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
              <span style="background:#7550ef;color:#fff;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:900;">معاينة سريعة</span>
              <button onclick="ScoreARQuizBank.closePreview()" style="background:none;border:none;color:#9ca3af;font-size:20px;cursor:pointer;">✕</button>
            </div>
            <h3 style="color:#fff;font-size:14px;font-weight:900;line-height:1.5;margin-bottom:10px;">${esc(q.q || q.text)}</h3>
            <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;">
              ${(q.opts || []).map((opt, i) => `
                <div style="background:${i === q.ans ? 'rgba(16,185,129,0.2)' : '#1c1e42'};border:1px solid ${i === q.ans ? '#10b981' : 'rgba(255,255,255,0.06)'};padding:6px 10px;border-radius:8px;color:#fff;font-size:11px;display:flex;align-items:center;gap:6px;">
                  <span style="color:${i === q.ans ? '#34d399' : '#8e8ca8'};">${i === q.ans ? '✓' : '○'}</span>
                  <span>${esc(opt)}</span>
                </div>`).join('')}
            </div>
            ${q.explain ? `<div style="background:rgba(142,100,239,0.15);border-radius:8px;padding:8px;color:#c4b5fd;font-size:11px;line-height:1.4;">💡 ${esc(q.explain)}</div>` : ''}
          </div>
          <button onclick="ScoreARQuizBank.addToActiveQuiz('${q.id}');ScoreARQuizBank.closePreview();" style="background:linear-gradient(135deg, #10b981, #059669);color:#fff;border:none;padding:10px;border-radius:8px;font-weight:900;font-size:12px;cursor:pointer;">+ إضافة لمسابقتي</button>
        </div>
      </div>`;
  }

  // --- Handlers ---
  function switchTab(t) { currentTab = t; activePage = 1; selectedItemIds.clear(); renderBankHubView(); }
  function setViewMode(m) { viewMode = m; renderBankHubView(); }
  function setFilter(k, v) { filters[k] = v; activePage = 1; renderBankHubView(); }
  function changePage(p) { activePage = p; renderBankHubView(); }
  function toggleSelectItem(id) { if (selectedItemIds.has(id)) selectedItemIds.delete(id); else selectedItemIds.add(id); renderBankHubView(); }
  function clearSelection() { selectedItemIds.clear(); renderBankHubView(); }
  function openPreview(id) {
    const qList = global.ScoreARQuizBankData ? global.ScoreARQuizBankData.getQuestions() : [];
    previewQuestion = qList.find(q => q.id === id) || null;
    renderBankHubView();
  }
  function closePreview() { previewQuestion = null; renderBankHubView(); }

  // 5s Undo Deletions
  function deleteQuestionWithUndo(id) {
    if (global.ScoreARQuizBankData) {
      activeUndoHandle = global.ScoreARQuizBankData.deleteWithUndo('question', id, renderBankHubView);
      showUndoBar('تم حذف السؤال.');
    }
  }
  function deleteQuizWithUndo(id) {
    if (global.ScoreARQuizBankData) {
      activeUndoHandle = global.ScoreARQuizBankData.deleteWithUndo('quiz', id, renderBankHubView);
      showUndoBar('تم حذف المسابقة.');
    }
  }
  function batchDeleteWithUndo() {
    if (global.ScoreARQuizBankData && selectedItemIds.size > 0) {
      const type = currentTab === 'quizzes' ? 'quiz' : 'question';
      activeUndoHandle = global.ScoreARQuizBankData.bulkDeleteWithUndo(type, Array.from(selectedItemIds), renderBankHubView);
      showUndoBar(`تم حذف (${selectedItemIds.size}) عناصر.`);
      selectedItemIds.clear();
    }
  }
  function showUndoBar(msg) {
    let s = 5;
    undoNotification = { message: msg, seconds: s };
    renderBankHubView();
    const timer = setInterval(() => {
      s--;
      if (s <= 0) { clearInterval(timer); undoNotification = null; renderBankHubView(); }
      else if (undoNotification) { undoNotification.seconds = s; renderBankHubView(); }
    }, 1000);
  }
  function triggerUndo() {
    if (activeUndoHandle && typeof activeUndoHandle.undo === 'function') activeUndoHandle.undo();
    else if (activeUndoHandle && typeof activeUndoHandle.undoAll === 'function') activeUndoHandle.undoAll();
    undoNotification = null;
    renderBankHubView();
    if (global.toast) global.toast('تم التراجع بنجاح ✓');
  }

  function launchQuiz(quizId) {
    const qz = global.ScoreARQuizBankData ? global.ScoreARQuizBankData.getQuizzes().find(x => x.id === quizId) : null;
    if (!qz || !qz.questions || !qz.questions.length) {
      alert('المسابقة لا تحتوي على أسئلة جاهزة للإطلاق.');
      return;
    }
    closeBankHub();
    if (global.ScoreARWorldFlow && typeof global.ScoreARWorldFlow.openWorldPicker === 'function') {
      global.ScoreARWorldFlow.openWorldPicker({
        defaultWorldId: localStorage.getItem('scorear_last_world') || 'royal',
        quizTitle: qz.title || 'مسابقة',
        onConfirm: (chosenWorld) => {
          global.contestQuestions = JSON.parse(JSON.stringify(qz.questions));
          if (global.ScoreARQuizHost && global.ScoreARQuizHost.startHostLobby) {
            global.ScoreARQuizHost.startHostLobby(chosenWorld, null, true);
          }
        }
      });
    }
  }

  function editQuiz(quizId) {
    const qz = global.ScoreARQuizBankData ? global.ScoreARQuizBankData.getQuizzes().find(x => x.id === quizId) : null;
    if (!qz) return;
    closeBankHub();
    if (global.ScoreARQuizBuilder && global.ScoreARQuizBuilder.openBuilder) global.ScoreARQuizBuilder.openBuilder(qz);
  }

  async function duplicateQuiz(quizId) {
    if (global.ScoreARQuizBankData) {
      await global.ScoreARQuizBankData.duplicateQuiz(quizId);
      renderBankHubView();
      if (global.toast) global.toast('تم تكرار المسابقة بنجاح ✓');
    }
  }

  function createNewQuiz() {
    closeBankHub();
    if (global.ScoreARQuizBuilder && global.ScoreARQuizBuilder.openBuilder) global.ScoreARQuizBuilder.openBuilder(null);
  }

  function addToActiveQuiz(qId) {
    const qList = global.ScoreARQuizBankData ? global.ScoreARQuizBankData.getQuestions() : [];
    const q = qList.find(x => x.id === qId);
    if (!q) return;
    const clone = { id: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), q: q.q || q.text, opts: [...q.opts], ans: q.ans !== undefined ? q.ans : 0, explain: q.explain || '', timeLimit: q.timeLimit || 20, points: q.points || 1000 };
    if (global.ScoreARQuizBuilder && global.ScoreARQuizBuilder.addImportedQuestion) {
      global.ScoreARQuizBuilder.addImportedQuestion(clone);
      if (global.toast) global.toast('تمت إضافة السؤال لمسابقتك الحالية ✓');
    }
  }

  function batchAddToQuiz() {
    const qList = global.ScoreARQuizBankData ? global.ScoreARQuizBankData.getQuestions() : [];
    let count = 0;
    for (const id of selectedItemIds) {
      const q = qList.find(x => x.id === id);
      if (q && global.ScoreARQuizBuilder && global.ScoreARQuizBuilder.addImportedQuestion) {
        global.ScoreARQuizBuilder.addImportedQuestion({ id: 'q_' + Date.now() + '_' + count, q: q.q || q.text, opts: [...q.opts], ans: q.ans !== undefined ? q.ans : 0, explain: q.explain || '', timeLimit: q.timeLimit || 20, points: q.points || 1000 });
        count++;
      }
    }
    selectedItemIds.clear();
    renderBankHubView();
    if (global.toast) global.toast(`تمت إضافة (${count}) أسئلة للمسابقة بنجاح ✓`);
  }

  global.ScoreARQuizBank = {
    openBankHub,
    closeBankHub,
    switchTab,
    setViewMode,
    setFilter,
    changePage,
    toggleSelectItem,
    clearSelection,
    openPreview,
    closePreview,
    deleteQuestionWithUndo,
    deleteQuizWithUndo,
    batchDeleteWithUndo,
    triggerUndo,
    launchQuiz,
    editQuiz,
    duplicateQuiz,
    createNewQuiz,
    addToActiveQuiz,
    batchAddToQuiz
  };

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
