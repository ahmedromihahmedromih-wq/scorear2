/**
 * ScoreAR Quiz Bank & Library View (quiz-bank.js)
 * Unified Cosmic Glass & Linear Vector UI + Functional Add-Question / Folder Modals.
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

  const ui = () => global.ScoreARUI || {
    icon: n => `<span class="fallback-ico" data-ico="${n}"></span>`,
    iconBox: () => ''
  };

  function getOrCreateBankStage() {
    let s = document.getElementById('scorearQuizBankStage');
    if (!s) {
      s = document.createElement('div');
      s.id = 'scorearQuizBankStage';
      s.className = 'scorear-bank-stage';
      document.body.appendChild(s);
    } else if (!s.className) {
      s.className = 'scorear-bank-stage';
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
    renderBankHubView();
    if (global.ScoreARQuizBankData) {
      try {
        await Promise.race([
          global.ScoreARQuizBankData.refreshAllData(),
          new Promise(res => setTimeout(res, 2200))
        ]);
      } catch {}
      renderBankHubView();
    }
  }

  function closeBankHub() {
    const s = document.getElementById('scorearQuizBankStage');
    if (s) s.style.display = 'none';
  }

  function renderHeroBanner(allQuizzes, allQuestions, allFolders) {
    const { iconBox } = ui();
    const publishedCount = allQuizzes.filter(q => q.status === 'published').length;
    return `
      <header class="scorear-editorial-head" style="margin-bottom:14px;">
        <div class="scorear-editorial-copy">
          <span class="launch-pill"><span class="live-dot"></span> مركز المحتوى التعليمي</span>
          <h2 style="margin:12px 0 6px;">مسابقاتي <span class="gradient-text">وبنك الأسئلة</span></h2>
          <p>نظّم مسابقاتك ومجلداتك، وأطلق القاعة التفاعلية أو اجمع الأسئلة من الاستيراد والذكاء الاصطناعي.</p>
        </div>
        <span class="scorear-panel-index">02 — QUIZ & BANK HUB</span>
      </header>
      <div class="scorear-stat-ribbon" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:12px;">
        <div class="scorear-ribbon-item scorear-bank-stat-pill">
          ${iconBox('book', { size: 'sm', tone: 'violet' })}
          <div><b>${allQuizzes.length}</b><span>مسابقة (${publishedCount} منشورة)</span></div>
        </div>
        <div class="scorear-ribbon-item scorear-bank-stat-pill">
          ${iconBox('sparkles', { size: 'sm', tone: 'cyan' })}
          <div><b>${allQuestions.length}</b><span>سؤال في البنك</span></div>
        </div>
        <div class="scorear-ribbon-item scorear-bank-stat-pill">
          ${iconBox('folder', { size: 'sm', tone: 'violet' })}
          <div><b>${allFolders.length}</b><span>مجلدات تنظيمية</span></div>
        </div>
      </div>`;
  }

  function renderBankHubView() {
    const stage = getOrCreateBankStage();
    const { icon } = ui();
    const dataMod = global.ScoreARQuizBankData;
    const allQuizzes = dataMod ? dataMod.getQuizzes() : [];
    const allQuestions = dataMod ? dataMod.getQuestions() : [];
    const allFolders = dataMod ? dataMod.getFolders() : [];
    const subjects = dataMod ? dataMod.getUniqueSubjects() : [];
    const grades = dataMod ? dataMod.getUniqueGrades() : [];

    let pData = { items: [], totalItems: 0, totalPages: 1, currentPage: 1 };
    if (dataMod) {
      pData = currentTab === 'quizzes'
        ? dataMod.getFilteredQuizzes({ ...filters, page: activePage, pageSize })
        : dataMod.getFilteredQuestions({ ...filters, page: activePage, pageSize });
    }

    const primaryAction = currentTab === 'quizzes'
      ? `<button onclick="ScoreARQuizBank.createNewQuiz()" class="btn launch-primary" style="padding:7px 14px;font-size:12px;">${icon('plus', { size: 14 })} مسابقة جديدة</button>`
      : currentTab === 'bank'
      ? `<button onclick="ScoreARQuizBank.openAddQuestionModal()" class="btn launch-primary" style="padding:7px 14px;font-size:12px;">${icon('plus', { size: 14 })} سؤال للبنك</button>`
      : `<button onclick="ScoreARQuizBank.openCreateFolderModal()" class="btn launch-primary" style="padding:7px 14px;font-size:12px;">${icon('plus', { size: 14 })} إنشاء مجلد</button>`;

    stage.innerHTML = `
      <header class="scorear-bank-topbar">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <div class="scorear-bank-tabs">
            <button onclick="ScoreARQuizBank.switchTab('quizzes')" class="scorear-bank-tab ${currentTab === 'quizzes' ? 'active' : ''}">${icon('book', { size: 14 })} مسابقاتي (${allQuizzes.length})</button>
            <button onclick="ScoreARQuizBank.switchTab('bank')" class="scorear-bank-tab ${currentTab === 'bank' ? 'active' : ''}">${icon('layers', { size: 14 })} بنك الأسئلة (${allQuestions.length})</button>
            <button onclick="ScoreARQuizBank.switchTab('folders')" class="scorear-bank-tab ${currentTab === 'folders' ? 'active' : ''}">${icon('folder', { size: 14 })} المجلدات (${allFolders.length})</button>
          </div>
          <div class="scorear-bank-tabs" style="padding:3px;">
            <button onclick="ScoreARQuizBank.setViewMode('grid')" class="scorear-bank-tab ${viewMode === 'grid' ? 'active' : ''}" style="padding:5px 9px;" title="عرض شبكي">${icon('layoutGrid', { size: 14 })}</button>
            <button onclick="ScoreARQuizBank.setViewMode('list')" class="scorear-bank-tab ${viewMode === 'list' ? 'active' : ''}" style="padding:5px 9px;" title="عرض قائمة">${icon('list', { size: 14 })}</button>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button onclick="ScoreARQuizAI.openAiStudio({mode:'hub'})" class="btn launch-outline" style="padding:7px 12px;font-size:12px;border-color:#9665ff66;">${icon('spark', { size: 14 })} توليد AI</button>
          <button onclick="ScoreARQuizImporter.openImporter({mode:'hub'})" class="btn launch-outline" style="padding:7px 12px;font-size:12px;border-color:#58dce355;color:#85f3d8;">${icon('spreadsheet', { size: 14 })} استيراد Excel</button>
          ${primaryAction}
          <button onclick="ScoreARQuizBank.closeBankHub()" class="icon-btn" style="padding:6px 10px;" aria-label="إغلاق">${icon('close', { size: 15 })}</button>
        </div>
      </header>

      <main class="scorear-bank-main scorear-open-page">
        ${ui().cosmicBackdrop ? ui().cosmicBackdrop() : ''}
        <div class="scorear-bank-inner">
          ${renderHeroBanner(allQuizzes, allQuestions, allFolders)}

          ${currentTab !== 'folders' ? `
            <div class="scorear-bank-filters" style="background:transparent;border:none;border-bottom:1px solid #ffffff12;border-radius:0;padding:4px 0 16px;">
              <div class="scorear-lib-search" style="flex:1.5 1 200px;">
                ${icon('search', { size: 15 })}
                <input type="text" value="${esc(filters.search)}" oninput="ScoreARQuizBank.setFilter('search', this.value)" placeholder="ابحث باسم المسابقة أو نص السؤال..." style="padding:8px 36px 8px 12px;font-size:12px;">
              </div>
              ${currentTab === 'bank' ? `
                <input list="bankSubjDl" class="scorear-bank-input" value="${filters.subject === 'all' ? '' : esc(filters.subject)}" onchange="ScoreARQuizBank.setFilter('subject', this.value || 'all')" placeholder="المادة (حرة)...">
                <datalist id="bankSubjDl">${subjects.map(s => `<option value="${esc(s)}"></option>`).join('')}</datalist>
                <input list="bankGrdDl" class="scorear-bank-input" value="${filters.grade === 'all' ? '' : esc(filters.grade)}" onchange="ScoreARQuizBank.setFilter('grade', this.value || 'all')" placeholder="الصف (حر)...">
                <datalist id="bankGrdDl">${grades.map(g => `<option value="${esc(g)}"></option>`).join('')}</datalist>
                <select onchange="ScoreARQuizBank.setFilter('source', this.value)" class="scorear-bank-select">
                  <option value="all" ${filters.source === 'all' ? 'selected' : ''}>كل المصادر</option>
                  <option value="manual" ${filters.source === 'manual' ? 'selected' : ''}>يدوي</option>
                  <option value="import" ${filters.source === 'import' ? 'selected' : ''}>استيراد</option>
                  <option value="ai" ${filters.source === 'ai' ? 'selected' : ''}>ذكاء اصطناعي</option>
                </select>
                <select onchange="ScoreARQuizBank.setFilter('type', this.value)" class="scorear-bank-select">
                  <option value="all" ${filters.type === 'all' ? 'selected' : ''}>كل الأنواع</option>
                  <option value="mcq" ${filters.type === 'mcq' ? 'selected' : ''}>اختيار متعدد</option>
                  <option value="tf" ${filters.type === 'tf' ? 'selected' : ''}>صح أو خطأ</option>
                </select>
              ` : ''}
              <select onchange="ScoreARQuizBank.setFilter('folderId', this.value)" class="scorear-bank-select">
                <option value="all">كل المجلدات</option>
                ${allFolders.map(f => `<option value="${f.id}" ${filters.folderId === f.id ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}
              </select>
              <select onchange="ScoreARQuizBank.setFilter('dateFilter', this.value)" class="scorear-bank-select">
                <option value="all" ${filters.dateFilter === 'all' ? 'selected' : ''}>كل التواريخ</option>
                <option value="today" ${filters.dateFilter === 'today' ? 'selected' : ''}>اليوم</option>
                <option value="week" ${filters.dateFilter === 'week' ? 'selected' : ''}>هذا الأسبوع</option>
              </select>
            </div>
          ` : ''}

          ${currentTab === 'quizzes' ? renderQuizzes(pData.items) : currentTab === 'bank' ? renderQuestions(pData.items) : renderFolders(allFolders)}
          ${pData.totalPages > 1 ? renderPagination(pData) : ''}
        </div>
      </main>

      ${selectedItemIds.size > 0 ? `
        <div class="scorear-bank-batch-bar">
          <span style="color:#f6f3ff;font-weight:900;font-size:12px;">تم تحديد <b style="color:#58dce3;">${selectedItemIds.size}</b> عنصر</span>
          ${currentTab === 'bank' ? `<button onclick="ScoreARQuizBank.batchAddToQuiz()" class="btn launch-primary" style="padding:6px 12px;font-size:11px;">${icon('plus', { size: 13 })} إضافة للمسابقة</button>` : ''}
          <button onclick="ScoreARQuizBank.batchDeleteWithUndo()" class="btn launch-outline" style="padding:6px 12px;font-size:11px;border-color:#c3849866;color:#ffd3e5;">${icon('trash', { size: 13 })} حذف بتراجع</button>
          <button onclick="ScoreARQuizBank.clearSelection()" style="background:none;border:none;color:#a1a4be;font-size:11px;cursor:pointer;">إلغاء</button>
        </div>` : ''}

      ${undoNotification ? `
        <div class="scorear-bank-undo-toast">
          <span>${esc(undoNotification.message)}</span>
          <button onclick="ScoreARQuizBank.triggerUndo()" style="background:#0c0d1d;color:#befff2;border:1px solid #44b8a566;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:900;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">${icon('rotateCcw', { size: 12 })} تراجع (${undoNotification.seconds}s)</button>
        </div>` : ''}

      ${previewQuestion ? renderPreviewDrawer(previewQuestion) : ''}
    `;
  }

  function renderQuizzes(items) {
    const u = ui();
    const { icon, iconBox } = u;
    if (!items.length) {
      const orb = u.orbShowcase ? u.orbShowcase('book', { tone: 'violet' }) : iconBox('book', { size: 'lg', tone: 'violet' });
      return `
        <div class="scorear-experience-panel spotlight" style="text-align:center;padding:38px 20px;">
          ${orb}
          <h3 style="color:#f6f3ff;font-size:19px;font-weight:900;margin:4px 0 6px;">لا توجد مسابقات تطابق البحث</h3>
          <p style="color:#a1a4be;font-size:13px;margin:0 0 20px;">أنشئ مسابقة جديدة الآن أو استورد أسئلة عبر الذكاء الاصطناعي أو ملف Excel.</p>
          <button onclick="ScoreARQuizBank.createNewQuiz()" class="btn launch-primary" style="padding:11px 22px;font-size:13px;">${icon('plus', { size: 14 })} إنشاء أول مسابقة</button>
        </div>`;
    }
    const cls = viewMode === 'grid' ? 'scorear-bank-grid' : 'scorear-bank-list';
    return `<div class="${cls}">${items.map((qz, idx) => {
      const isSel = selectedItemIds.has(qz.id);
      const count = qz.questions ? qz.questions.length : 0;
      const isPub = qz.status === 'published';
      return `
        <article class="scorear-experience-panel ${isPub ? 'tone-cyan' : ''} scorear-bank-card spotlight" style="${isSel ? 'border-color:#9665ff;' : ''}">
          <div>
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:14px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <input type="checkbox" ${isSel ? 'checked' : ''} onchange="ScoreARQuizBank.toggleSelectItem('${qz.id}')" style="accent-color:#7550ef;cursor:pointer;">
                ${iconBox('book', { size: 'sm', tone: isPub ? 'cyan' : 'violet', tilted: true })}
                <span class="scorear-panel-index">${String(idx + 1).padStart(2, '0')} / ${isPub ? 'LIVE' : 'DRAFT'}</span>
              </div>
              <span class="launch-pill" style="padding:2px 10px;font-size:10px;">${count} أسئلة</span>
            </div>
            <h3 style="color:#f6f3ff;font-size:16px;font-weight:900;margin:0 0 6px;line-height:1.5;">${esc(qz.title || 'مسابقة بدون عنوان')}</h3>
            ${(qz.subject || qz.grade) ? `<div style="color:#a1a4be;font-size:11px;display:flex;gap:6px;flex-wrap:wrap;">${qz.subject ? `<span>${esc(qz.subject)}</span>` : ''}${qz.subject && qz.grade ? '<span>•</span>' : ''}${qz.grade ? `<span>${esc(qz.grade)}</span>` : ''}</div>` : ''}
          </div>
          <div class="scorear-bank-card-foot">
            <button onclick="ScoreARQuizBank.launchQuiz('${qz.id}')" class="btn launch-primary" style="flex:2;padding:7px 12px;font-size:12px;">${icon('play', { size: 13 })} إطلاق القاعة</button>
            <button onclick="ScoreARQuizBank.editQuiz('${qz.id}')" class="btn launch-outline" style="padding:7px 12px;font-size:12px;">${icon('edit', { size: 13 })} تعديل</button>
            <button onclick="ScoreARQuizBank.duplicateQuiz('${qz.id}')" class="icon-btn" style="padding:7px 9px;" title="تكرار">${icon('copy', { size: 13 })}</button>
            <button onclick="ScoreARQuizBank.deleteQuizWithUndo('${qz.id}')" class="icon-btn" style="padding:7px 9px;color:#ffd3e5;" title="حذف">${icon('trash', { size: 13 })}</button>
          </div>
        </article>`;
    }).join('')}</div>`;
  }

  function renderQuestions(items) {
    const u = ui();
    const { icon, iconBox } = u;
    if (!items.length) {
      const orb = u.orbShowcase ? u.orbShowcase('search', { tone: 'cyan' }) : iconBox('search', { size: 'lg', tone: 'muted' });
      return `
        <div class="scorear-experience-panel tone-cyan spotlight" style="text-align:center;padding:38px 20px;">
          ${orb}
          <h3 style="color:#f6f3ff;font-size:19px;font-weight:900;margin:4px 0 6px;">لا توجد أسئلة تطابق التصفية</h3>
          <p style="color:#a1a4be;font-size:13px;margin:0 0 20px;">أضف سؤالاً جديداً يدوياً أو استورد أسئلة من Excel أو الاستوديو الذكي.</p>
          <button onclick="ScoreARQuizBank.openAddQuestionModal()" class="btn launch-primary" style="padding:11px 22px;font-size:13px;">${icon('plus', { size: 14 })} إضافة سؤال للبنك</button>
        </div>`;
    }
    const cls = viewMode === 'grid' ? 'scorear-bank-grid' : 'scorear-bank-list';
    return `<div class="${cls}">${items.map((q, idx) => {
      const isSel = selectedItemIds.has(q.id);
      const src = q.source === 'ai' ? 'توليد AI' : q.source === 'import' ? 'مستورد' : 'يدوي';
      return `
        <article class="scorear-experience-panel scorear-bank-card spotlight" style="${isSel ? 'border-color:#9665ff;' : ''}">
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <input type="checkbox" ${isSel ? 'checked' : ''} onchange="ScoreARQuizBank.toggleSelectItem('${q.id}')" style="accent-color:#7550ef;cursor:pointer;">
                <span class="launch-pill" style="padding:2px 9px;font-size:10px;">${src}</span>
                ${q.subject ? `<span style="color:#58dce3;font-size:11px;font-weight:700;">${esc(q.subject)}</span>` : ''}
              </div>
              <span class="scorear-panel-index">${String(idx + 1).padStart(2, '0')} • ${q.timeLimit || 20}s</span>
            </div>
            <h4 style="color:#f6f3ff;font-size:14.5px;font-weight:800;margin:0 0 10px;line-height:1.6;">${esc(q.q || q.text)}</h4>
            <div style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;background:#163c39;color:#7fe7ce;font-size:11px;font-weight:800;">${icon('check', { size: 12 })} ${esc(q.opts ? q.opts[q.ans] : '')}</div>
          </div>
          <div class="scorear-bank-card-foot">
            <button onclick="ScoreARQuizBank.openPreview('${q.id}')" class="btn launch-outline" style="padding:6px 10px;font-size:11px;">${icon('eye', { size: 13 })} معاينة</button>
            <button onclick="ScoreARQuizBank.addToActiveQuiz('${q.id}')" class="btn launch-primary" style="flex:1;padding:6px 10px;font-size:11px;">${icon('plus', { size: 13 })} للمسابقة</button>
            <button onclick="ScoreARQuizBank.deleteQuestionWithUndo('${q.id}')" class="icon-btn" style="padding:6px 8px;color:#ffd3e5;" title="حذف">${icon('trash', { size: 13 })}</button>
          </div>
        </article>`;
    }).join('')}</div>`;
  }

  function renderFolders(folders) {
    const u = ui();
    const { icon, iconBox } = u;
    if (!folders.length) {
      const orb = u.orbShowcase ? u.orbShowcase('folderOpen', { tone: 'violet' }) : iconBox('folderOpen', { size: 'lg', tone: 'violet' });
      return `
        <div class="scorear-experience-panel spotlight" style="text-align:center;padding:38px 20px;">
          ${orb}
          <h3 style="color:#f6f3ff;font-size:19px;font-weight:900;margin:4px 0 6px;">لا توجد مجلدات تنظيمية بعد</h3>
          <p style="color:#a1a4be;font-size:13px;margin:0 0 20px;">أنشئ مجلدات حسب الصف أو المادة لتنظيم مسابقاتك وأسئلتك بسهولة.</p>
          <button onclick="ScoreARQuizBank.openCreateFolderModal()" class="btn launch-primary" style="padding:11px 22px;font-size:13px;">${icon('plus', { size: 14 })} إنشاء أول مجلد</button>
        </div>`;
    }
    return `<div class="scorear-bank-grid">${folders.map(f => `
      <div class="scorear-experience-panel spotlight" style="padding:18px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <div onclick="ScoreARQuizBank.openFolder('${f.id}')" style="display:flex;align-items:center;gap:12px;cursor:pointer;min-width:0;flex:1;">
          ${iconBox('folder', { size: 'md', tone: 'violet', tilted: true })}
          <div style="min-width:0;">
            <h4 style="color:#f6f3ff;font-size:14px;font-weight:900;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(f.name)}</h4>
            <small style="color:#a1a4be;font-size:11px;">انقر لتصفية الأسئلة داخل المجلد</small>
          </div>
        </div>
        <button onclick="ScoreARQuizBank.deleteFolder('${f.id}')" class="icon-btn" style="padding:6px 8px;color:#ffd3e5;" title="حذف المجلد">${icon('trash', { size: 13 })}</button>
      </div>`).join('')}</div>`;
  }

  function renderPagination(pData) {
    return `
      <div style="display:flex;justify-content:center;align-items:center;gap:10px;margin-top:8px;">
        <button onclick="ScoreARQuizBank.changePage(${pData.currentPage - 1})" ${pData.currentPage <= 1 ? 'disabled' : ''} class="btn launch-outline" style="padding:6px 14px;font-size:12px;">السابق</button>
        <span style="color:#a1a4be;font-size:12px;">صفحة ${pData.currentPage} من ${pData.totalPages}</span>
        <button onclick="ScoreARQuizBank.changePage(${pData.currentPage + 1})" ${pData.currentPage >= pData.totalPages ? 'disabled' : ''} class="btn launch-outline" style="padding:6px 14px;font-size:12px;">التالي</button>
      </div>`;
  }

  function renderPreviewDrawer(q) {
    const { icon } = ui();
    return `
      <div style="position:fixed;inset:0;background:rgba(5,6,15,0.74);backdrop-filter:blur(8px);z-index:999999;display:flex;justify-content:flex-end;">
        <div style="background:#0c0d1d;border-right:1px solid #9665ff55;width:100%;max-width:400px;height:100%;padding:20px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;overflow-y:auto;">
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
              <span class="launch-pill" style="padding:4px 12px;font-size:11px;">معاينة السؤال</span>
              <button onclick="ScoreARQuizBank.closePreview()" class="icon-btn" aria-label="إغلاق">${icon('close', { size: 15 })}</button>
            </div>
            <h3 style="color:#f6f3ff;font-size:15px;font-weight:900;line-height:1.65;margin-bottom:14px;">${esc(q.q || q.text)}</h3>
            <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
              ${(q.opts || []).map((opt, i) => `
                <div style="background:${i === q.ans ? '#163c39' : '#18172e'};border:1px solid ${i === q.ans ? '#44b8a5' : '#ffffff16'};padding:9px 12px;border-radius:10px;color:#fff;font-size:12px;display:flex;align-items:center;gap:8px;">
                  <span style="color:${i === q.ans ? '#7fe7ce' : '#8e8ca8'};">${i === q.ans ? icon('check', { size: 14 }) : '○'}</span>
                  <span>${esc(opt)}</span>
                </div>`).join('')}
            </div>
            ${q.explain ? `<div style="background:#18172e;border:1px solid #9665ff33;border-radius:12px;padding:10px 12px;color:#c9baff;font-size:12px;line-height:1.7;">${icon('info', { size: 14 })} ${esc(q.explain)}</div>` : ''}
          </div>
          <button onclick="ScoreARQuizBank.addToActiveQuiz('${q.id}');ScoreARQuizBank.closePreview();" class="btn launch-primary" style="padding:11px;font-size:13px;width:100%;">${icon('plus', { size: 15 })} إضافة لمسابقتي</button>
        </div>
      </div>`;
  }

  function showFormDialog(id, title, iconName, fieldsHtml, onSubmit) {
    const { icon, iconBox } = ui();
    let dlg = document.getElementById(id);
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = id;
      dlg.style.cssText = 'width:min(540px,94vw);border-radius:22px;padding:0;overflow:hidden;';
      document.body.appendChild(dlg);
    }
    dlg.innerHTML = `
      <div class="modal-head" style="padding:16px 20px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:10px;">${iconBox(iconName, { size: 'sm', tone: 'violet' })}<strong style="color:#f6f3ff;font-size:16px;">${title}</strong></div>
        <button type="button" class="icon-btn" data-dlg-close="1">${icon('close', { size: 15 })}</button>
      </div>
      <form class="modal-body-pad" style="padding:18px 20px;display:flex;flex-direction:column;gap:12px;">
        ${fieldsHtml}
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:4px;">
          <button type="button" class="btn launch-outline" data-dlg-close="1">إلغاء</button>
          <button type="submit" class="btn launch-primary">${icon('check', { size: 14 })} حفظ</button>
        </div>
      </form>`;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.style.display = 'block';
    const closeFn = () => (typeof dlg.close === 'function' ? dlg.close() : (dlg.style.display = 'none'));
    dlg.querySelectorAll('[data-dlg-close]').forEach(b => { b.onclick = closeFn; });
    const form = dlg.querySelector('form');
    if (form) form.onsubmit = async (e) => { e.preventDefault(); await onSubmit(dlg, closeFn); };
  }

  function openAddQuestionModal() {
    const optsHtml = [0, 1, 2, 3].map(i => `<div style="display:flex;align-items:center;gap:6px;"><input type="radio" name="bkQAns" value="${i}" ${i === 0 ? 'checked' : ''} style="accent-color:#44b8a5;"><input type="text" class="field bkQOpt" ${i < 2 ? 'required' : ''} placeholder="خيار ${i + 1}"></div>`).join('');
    const body = `<textarea id="bkQText" required rows="3" class="field" placeholder="اكتب نص السؤال..."></textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">${optsHtml}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><input type="text" id="bkQSubj" class="field" placeholder="المادة (اختياري)"><input type="text" id="bkQGrade" class="field" placeholder="الصف (اختياري)"></div>
      <input type="text" id="bkQExplain" class="field" placeholder="توضيح الإجابة (اختياري)">`;
    showFormDialog('scorearAddBankQDialog', 'إضافة سؤال إلى بنك الأسئلة', 'layers', body, async (dlg, closeFn) => {
      const q = dlg.querySelector('#bkQText')?.value?.trim() || '';
      const opts = Array.from(dlg.querySelectorAll('.bkQOpt')).map(el => el.value.trim()).filter(Boolean);
      const ans = Number(dlg.querySelector('input[name="bkQAns"]:checked')?.value || 0);
      if (!q || opts.length < 2) return;
      await global.ScoreARQuizBankData?.saveQuestion?.(
        { q, opts, ans: Math.min(ans, opts.length - 1), explain: dlg.querySelector('#bkQExplain')?.value?.trim() || '', timeLimit: 20, points: 1000 },
        { subject: dlg.querySelector('#bkQSubj')?.value?.trim() || '', grade: dlg.querySelector('#bkQGrade')?.value?.trim() || '' }
      );
      closeFn(); renderBankHubView(); if (global.toast) global.toast('تمت إضافة السؤال إلى البنك بنجاح ✓');
    });
  }

  function openCreateFolderModal() {
    showFormDialog('scorearAddFolderDialog', 'إنشاء مجلد جديد', 'folder', '<input type="text" id="fldNameInp" required class="field" placeholder="اسم المجلد (مثال: نحو الصف الثالث)...">', async (dlg, closeFn) => {
      const name = dlg.querySelector('#fldNameInp')?.value?.trim();
      if (!name) return;
      await global.ScoreARQuizBankData?.createFolder?.(name);
      closeFn(); renderBankHubView(); if (global.toast) global.toast('تم إنشاء المجلد بنجاح ✓');
    });
  }

  async function deleteFolder(folderId) {
    if (global.ScoreARQuizBankData?.deleteFolder) {
      await global.ScoreARQuizBankData.deleteFolder(folderId);
      if (filters.folderId === folderId) filters.folderId = 'all';
      renderBankHubView();
      if (global.toast) global.toast('تم حذف المجلد');
    }
  }

  function openFolder(folderId) {
    filters.folderId = folderId || 'all';
    currentTab = 'bank';
    activePage = 1;
    renderBankHubView();
  }

  function switchTab(t) { currentTab = t; activePage = 1; selectedItemIds.clear(); renderBankHubView(); }
  function setViewMode(m) { viewMode = m; renderBankHubView(); }
  function setFilter(k, v) { filters[k] = v; activePage = 1; renderBankHubView(); }
  function changePage(p) { activePage = p; renderBankHubView(); }
  function toggleSelectItem(id) { if (selectedItemIds.has(id)) selectedItemIds.delete(id); else selectedItemIds.add(id); renderBankHubView(); }
  function clearSelection() { selectedItemIds.clear(); renderBankHubView(); }
  function openPreview(id) { previewQuestion = (global.ScoreARQuizBankData?.getQuestions() || []).find(q => q.id === id) || null; renderBankHubView(); }
  function closePreview() { previewQuestion = null; renderBankHubView(); }
  function deleteQuestionWithUndo(id) { if (global.ScoreARQuizBankData) { activeUndoHandle = global.ScoreARQuizBankData.deleteWithUndo('question', id, renderBankHubView); showUndoBar('تم حذف السؤال.'); } }
  function deleteQuizWithUndo(id) { if (global.ScoreARQuizBankData) { activeUndoHandle = global.ScoreARQuizBankData.deleteWithUndo('quiz', id, renderBankHubView); showUndoBar('تم حذف المسابقة.'); } }
  function batchDeleteWithUndo() {
    if (global.ScoreARQuizBankData && selectedItemIds.size > 0) {
      const type = currentTab === 'quizzes' ? 'quiz' : 'question';
      activeUndoHandle = global.ScoreARQuizBankData.bulkDeleteWithUndo(type, Array.from(selectedItemIds), renderBankHubView);
      showUndoBar(`تم حذف (${selectedItemIds.size}) عناصر.`);
      selectedItemIds.clear();
    }
  }
  function showUndoBar(msg) {
    let s = 5; undoNotification = { message: msg, seconds: s }; renderBankHubView();
    const timer = setInterval(() => { s--; if (s <= 0) { clearInterval(timer); undoNotification = null; renderBankHubView(); } else if (undoNotification) { undoNotification.seconds = s; renderBankHubView(); } }, 1000);
  }
  function triggerUndo() {
    if (activeUndoHandle?.undo) activeUndoHandle.undo(); else if (activeUndoHandle?.undoAll) activeUndoHandle.undoAll();
    undoNotification = null; renderBankHubView(); if (global.toast) global.toast('تم التراجع بنجاح ✓');
  }
  function launchQuiz(quizId) {
    const qz = global.ScoreARQuizBankData?.getQuizzes().find(x => x.id === quizId);
    if (!qz?.questions?.length) { alert('المسابقة لا تحتوي على أسئلة جاهزة للإطلاق.'); return; }
    closeBankHub();
    global.ScoreARWorldFlow?.openWorldPicker?.({
      defaultWorldId: localStorage.getItem('scorear_last_world') || 'royal', quizTitle: qz.title || 'مسابقة',
      onConfirm: (chosenWorld) => { global.contestQuestions = JSON.parse(JSON.stringify(qz.questions)); global.ScoreARQuizHost?.startHostLobby?.(chosenWorld, null, true); }
    });
  }
  function editQuiz(quizId) { const qz = global.ScoreARQuizBankData?.getQuizzes().find(x => x.id === quizId); if (qz) { closeBankHub(); global.ScoreARQuizBuilder?.openBuilder?.(qz); } }
  async function duplicateQuiz(quizId) { if (global.ScoreARQuizBankData) { await global.ScoreARQuizBankData.duplicateQuiz(quizId); renderBankHubView(); if (global.toast) global.toast('تم تكرار المسابقة بنجاح ✓'); } }
  function createNewQuiz() { closeBankHub(); global.ScoreARQuizBuilder?.openBuilder?.(null); }
  function addToActiveQuiz(qId) {
    const q = (global.ScoreARQuizBankData?.getQuestions() || []).find(x => x.id === qId); if (!q) return;
    global.ScoreARQuizBuilder?.addImportedQuestion?.({ id: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), q: q.q || q.text, opts: [...q.opts], ans: q.ans !== undefined ? q.ans : 0, explain: q.explain || '', timeLimit: q.timeLimit || 20, points: q.points || 1000 });
    if (global.toast) global.toast('تمت إضافة السؤال لمسابقتك الحالية ✓');
  }
  function batchAddToQuiz() {
    const qList = global.ScoreARQuizBankData?.getQuestions() || []; let count = 0;
    for (const id of selectedItemIds) {
      const q = qList.find(x => x.id === id);
      if (q && global.ScoreARQuizBuilder?.addImportedQuestion) {
        global.ScoreARQuizBuilder.addImportedQuestion({ id: 'q_' + Date.now() + '_' + count, q: q.q || q.text, opts: [...q.opts], ans: q.ans !== undefined ? q.ans : 0, explain: q.explain || '', timeLimit: q.timeLimit || 20, points: q.points || 1000 });
        count++;
      }
    }
    selectedItemIds.clear(); renderBankHubView(); if (global.toast) global.toast(`تمت إضافة (${count}) أسئلة للمسابقة بنجاح ✓`);
  }

  global.ScoreARQuizBank = {
    openBankHub, closeBankHub, switchTab, setViewMode, setFilter, changePage, toggleSelectItem, clearSelection,
    openPreview, closePreview, deleteQuestionWithUndo, deleteQuizWithUndo, batchDeleteWithUndo, triggerUndo,
    launchQuiz, editQuiz, duplicateQuiz, createNewQuiz, addToActiveQuiz, batchAddToQuiz,
    openAddQuestionModal, openCreateFolderModal, deleteFolder, openFolder
  };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
