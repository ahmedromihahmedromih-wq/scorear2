(function () {
  'use strict';

  const STORAGE_KEY = 'scorear_v3_files';
  const MAX_FILE_BYTES = 20 * 1024 * 1024;
  const MAX_TOTAL_CHARS = 600000;
  const MAX_STORED_FILES = 25;

  let searchQuery = '';
  let activeCancelToken = null;
  let activeFileList = [];

  const ui = () => window.ScoreARUI || {
    icon: () => '',
    iconBox: () => '',
    fileIconBox: () => '',
    escapeHtml: s => String(s ?? '')
  };

  function notify(msg) {
    if (typeof window.toast === 'function') window.toast(msg);
  }

  function formatBytes(bytes) {
    const b = Number(bytes) || 0;
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  }

  function loadFiles() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      activeFileList = Array.isArray(parsed) ? parsed : [];
    } catch {
      activeFileList = [];
    }
    return activeFileList;
  }

  function saveFiles(list) {
    let trimmed = Array.isArray(list) ? list.slice(0, MAX_STORED_FILES) : [];
    let totalChars = trimmed.reduce((acc, item) => acc + String(item.extractedText || '').length, 0);
    while (totalChars > MAX_TOTAL_CHARS && trimmed.length > 1) {
      const removed = trimmed.pop();
      totalChars -= String(removed?.extractedText || '').length;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      activeFileList = trimmed;
      return true;
    } catch {
      notify('مساحة التخزين المحلية ممتلئة؛ احذف ملفاً قديماً أولاً.');
      return false;
    }
  }

  function getProgressHost() {
    return document.getElementById('libraryProgressSlot');
  }

  function renderProgress(state) {
    const host = getProgressHost();
    if (!host) return;
    if (!state) {
      host.innerHTML = '';
      return;
    }
    const { icon, escapeHtml } = ui();
    const pct = Math.max(0, Math.min(100, Number(state.percent) || 0));
    host.innerHTML = `
      <div class="scorear-lib-panel" style="margin-top:16px;padding:14px 16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;">
          <span style="display:inline-flex;align-items:center;gap:8px;color:#e2d4fb;font-size:12px;font-weight:700;">
            ${icon('refresh', { size: 15 })} ${escapeHtml(state.statusText || 'جارٍ تحليل الملف...')}
          </span>
          <button type="button" class="btn launch-outline" id="libCancelExtractBtn" style="padding:5px 10px;font-size:11px;">إلغاء</button>
        </div>
        <div class="quiz-progress" style="height:8px;border-radius:999px;overflow:hidden;">
          <span style="display:block;height:100%;width:${pct}%;transition:width .25s ease;"></span>
        </div>
      </div>`;
    const cancelBtn = document.getElementById('libCancelExtractBtn');
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        if (activeCancelToken) activeCancelToken.cancel();
        renderProgress(null);
        notify('تم إلغاء معالجة الملف');
      };
    }
  }

  async function processSingleFile(file) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      notify(`حجم الملف (${file.name}) يتجاوز الحد المسموح (20 MB).`);
      return;
    }

    const name = String(file.name || 'ملف');
    const ext = (name.split('.').pop() || 'txt').toLowerCase().trim();
    const isSpreadsheet = /^(xlsx|xls|csv)$/i.test(ext);

    if (isSpreadsheet) {
      const files = loadFiles();
      const entry = {
        id: `lib_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        ext,
        size: file.size,
        extractedText: 'ملف جدول بيانات للأسئلة (.xlsx / .csv) — يُفتح مباشرة في مستورد الجداول.',
        chars: 0,
        pagesCount: 1,
        scannedPages: 0,
        isSpreadsheet: true,
        createdAt: Date.now()
      };
      saveFiles([entry, ...files.filter(f => f.name !== name || f.size !== file.size)]);
      renderFileList();
      if (window.ScoreARQuizImporter && typeof window.ScoreARQuizImporter.openImporter === 'function') {
        window.ScoreARQuizImporter.openImporter({ mode: 'hub' });
        if (typeof window.ScoreARQuizImporter.handleFileSelect === 'function') {
          window.ScoreARQuizImporter.handleFileSelect(file);
        }
      } else {
        notify('مستورد ملفات Excel غير متاح حالياً.');
      }
      return;
    }

    if (!window.ScoreARDocExtractor || typeof window.ScoreARDocExtractor.extractDocument !== 'function') {
      notify('محرك استخراج المستندات غير محمّل بعد.');
      return;
    }

    activeCancelToken = window.ScoreARDocExtractor.createCancellationToken();
    try {
      renderProgress({ percent: 8, statusText: `قراءة ${name}...` });
      const result = await window.ScoreARDocExtractor.extractDocument(
        file,
        { maxPages: 300, maxScannedPages: 12 },
        activeCancelToken,
        prog => renderProgress(prog)
      );

      const pages = Array.isArray(result?.pages) ? result.pages : [];
      const scannedCount = pages.filter(p => p.isScanned).length;
      const assembled = pages
        .map(p => {
          const head = p.title ? `--- ${p.title} ---\n` : `--- صفحة ${p.pageNum || ''} ---\n`;
          const body = (p.text || '').trim() || (p.isScanned ? '[صفحة مصورة — جاهزة للتحويل عبر الاستوديو الذكي]' : '');
          return body ? `${head}${body}` : '';
        })
        .filter(Boolean)
        .join('\n\n')
        .slice(0, MAX_TOTAL_CHARS);

      const files = loadFiles();
      const entry = {
        id: `lib_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        ext,
        size: file.size,
        extractedText: assembled || 'لم يُعثر على نص مباشر في هذا الملف.',
        chars: assembled.length,
        pagesCount: Number(result?.totalPages) || pages.length || 1,
        scannedPages: scannedCount,
        isSpreadsheet: false,
        createdAt: Date.now()
      };
      if (saveFiles([entry, ...files])) {
        notify(`تم حفظ "${name}" في مكتبتك واستخراج ${assembled.length} حرف ✓`);
        renderFileList();
      }
    } catch (err) {
      if (err && /إلغاء|cancel/i.test(String(err.message))) return;
      notify(err?.message || 'تعذّر استخراج محتوى الملف.');
    } finally {
      activeCancelToken = null;
      renderProgress(null);
    }
  }

  function handleSelectedFiles(fileList) {
    const arr = Array.from(fileList || []);
    if (!arr.length) return;
    (async () => {
      for (const f of arr) await processSingleFile(f);
    })();
  }

  function downloadTxtFile(item) {
    const content = String(item?.extractedText || '').trim();
    if (!content) {
      notify('لا يوجد نص مستخرج للتنزيل.');
      return;
    }
    const base = String(item.name || 'document').replace(/\.[^.]+$/, '');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${base}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function sendToAiStudio(item) {
    if (!window.ScoreARQuizAI || typeof window.ScoreARQuizAI.openAiStudio !== 'function') {
      notify('استوديو الذكاء الاصطناعي غير متاح حالياً.');
      return;
    }
    const title = String(item?.name || '').replace(/\.[^.]+$/, '');
    window.ScoreARQuizAI.openAiStudio({
      mode: 'hub',
      initialTitle: title,
      initialText: String(item?.extractedText || '').slice(0, 14000)
    });
  }

  function openPreviewDialog(item) {
    const { icon, fileIconBox, escapeHtml } = ui();
    let dlg = document.getElementById('scorearLibPreviewDialog');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'scorearLibPreviewDialog';
      dlg.style.cssText = 'width:min(740px,94vw);border-radius:22px;padding:0;overflow:hidden;';
      document.body.appendChild(dlg);
    }
    const text = String(item.extractedText || '');
    dlg.innerHTML = `
      <div class="modal-head" style="padding:18px 22px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;min-width:0;">
          ${fileIconBox(item.name, { ext: item.ext, size: 'sm' })}
          <div style="min-width:0;">
            <strong style="display:block;color:#f6f3ff;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(item.name)}</strong>
            <small style="color:#a1a4be;font-size:11px;">${escapeHtml(formatBytes(item.size))} • ${item.pagesCount || 1} صفحة • ${text.length} حرف</small>
          </div>
        </div>
        <button type="button" class="icon-btn" id="libDlgCloseBtn" aria-label="إغلاق">${icon('close', { size: 17 })}</button>
      </div>
      <div class="modal-body-pad" style="padding:18px 22px;">
        <pre class="scorear-preview-text">${escapeHtml(text)}</pre>
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:16px;">
          <button type="button" class="btn launch-outline" id="libDlgCopyBtn">${icon('copy', { size: 15 })} نسخ النص</button>
          <button type="button" class="btn launch-outline" id="libDlgDlBtn">${icon('download', { size: 15 })} تنزيل .txt</button>
          <button type="button" class="btn launch-primary" id="libDlgAiBtn">${icon('spark', { size: 15 })} توليد أسئلة AI</button>
        </div>
      </div>`;
    dlg.showModal();
    dlg.querySelector('#libDlgCloseBtn').onclick = () => dlg.close();
    dlg.querySelector('#libDlgDlBtn').onclick = () => downloadTxtFile(item);
    dlg.querySelector('#libDlgCopyBtn').onclick = async () => {
      try {
        await navigator.clipboard.writeText(text);
        notify('تم نسخ النص إلى الحافظة ✓');
      } catch {
        notify('تعذّر النسخ التلقائي — حدد النص يدوياً.');
      }
    };
    dlg.querySelector('#libDlgAiBtn').onclick = () => {
      dlg.close();
      sendToAiStudio(item);
    };
  }

  function openConfirmDeleteDialog(item) {
    const { icon, iconBox, escapeHtml } = ui();
    let dlg = document.getElementById('scorearLibDeleteDialog');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'scorearLibDeleteDialog';
      dlg.style.cssText = 'width:min(440px,92vw);border-radius:22px;padding:0;overflow:hidden;';
      document.body.appendChild(dlg);
    }
    dlg.innerHTML = `
      <div class="modal-body-pad" style="padding:24px;text-align:center;">
        <div style="margin-bottom:14px;">${iconBox('trash', { size: 'lg', tone: 'danger' })}</div>
        <h3 style="color:#f6f3ff;font-size:18px;font-weight:900;margin-bottom:8px;">حذف الملف من المكتبة؟</h3>
        <p style="color:#a1a4be;font-size:13px;line-height:1.8;margin-bottom:20px;">سيتم إزالة <strong style="color:#e2d4fb;">${escapeHtml(item.name)}</strong> من قائمة ملفاتك المحفوظة محلياً.</p>
        <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;">
          <button type="button" class="btn launch-outline" id="libDelCancelBtn">${icon('close', { size: 15 })} تراجع</button>
          <button type="button" class="btn launch-primary" id="libDelConfirmBtn" style="background:linear-gradient(110deg,#6a364e,#944769);border-color:#c3849866;">${icon('trash', { size: 15 })} تأكيد الحذف</button>
        </div>
      </div>`;
    dlg.showModal();
    dlg.querySelector('#libDelCancelBtn').onclick = () => dlg.close();
    dlg.querySelector('#libDelConfirmBtn').onclick = () => {
      const next = loadFiles().filter(f => f.id !== item.id);
      saveFiles(next);
      dlg.close();
      renderFileList();
      notify('تم حذف الملف من المكتبة');
    };
  }

  function renderFileList() {
    const listEl = document.getElementById('libraryFileList');
    const countBadge = document.getElementById('libraryFilesCount');
    if (!listEl) return;

    const u = ui();
    const { icon, fileIconBox, escapeHtml } = u;
    const allFiles = loadFiles();
    const q = searchQuery.trim().toLowerCase();
    const filtered = q ? allFiles.filter(f => String(f.name || '').toLowerCase().includes(q) || String(f.ext || '').toLowerCase().includes(q)) : allFiles;

    if (countBadge) countBadge.textContent = `${allFiles.length} ملف`;

    if (!filtered.length) {
      const orbHtml = u.orbShowcase ? u.orbShowcase(q ? 'search' : 'folderOpen', { tone: 'cyan', compact: true }) : u.iconBox(q ? 'search' : 'folderOpen', { size: 'lg', tone: 'muted' });
      listEl.innerHTML = `
        <div style="text-align:center;padding:34px 16px;">
          ${orbHtml}
          <h4 style="color:#f6f3ff;font-size:17px;font-weight:900;margin:8px 0 6px;">${q ? 'لا توجد نتائج مطابقة' : 'مكتبتك جاهزة لأول درس'}</h4>
          <p style="color:#a1a4be;font-size:13px;line-height:1.85;max-width:380px;margin:0 auto;">${q ? 'جرّب البحث باسم ملف مختلف أو مسح كلمة البحث.' : 'ارفع ملف PDF أو Word أو PowerPoint أو Excel من البوابة المجاورة لاستخراج نصوصه والبدء فوراً.'}</p>
        </div>`;
      return;
    }

    listEl.innerHTML = filtered.map(item => {
      const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString('ar-EG') : '';
      return `
        <article class="scorear-file-card" data-file-id="${escapeHtml(item.id)}">
          <div class="scorear-file-main">
            ${fileIconBox(item.name, { ext: item.ext, size: 'md' })}
            <div class="scorear-file-meta">
              <strong title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong>
              <small>
                <span>${escapeHtml(formatBytes(item.size))}</span>
                <span>•</span>
                <span>${item.isSpreadsheet ? 'جدول أسئلة' : `${item.pagesCount || 1} صفحة`}</span>
                ${dateStr ? `<span>•</span><span>${escapeHtml(dateStr)}</span>` : ''}
              </small>
            </div>
          </div>
          <div class="scorear-file-actions">
            <button type="button" class="btn launch-outline" data-lib-act="preview" data-id="${escapeHtml(item.id)}" style="padding:7px 11px;font-size:12px;">${icon('eye', { size: 14 })} معاينة</button>
            ${item.isSpreadsheet
              ? `<button type="button" class="btn launch-primary" data-lib-act="import" data-id="${escapeHtml(item.id)}" style="padding:7px 11px;font-size:12px;">${icon('spreadsheet', { size: 14 })} استيراد أسئلة</button>`
              : `<button type="button" class="btn launch-primary" data-lib-act="ai" data-id="${escapeHtml(item.id)}" style="padding:7px 11px;font-size:12px;">${icon('spark', { size: 14 })} توليد AI</button>`}
            ${!item.isSpreadsheet ? `<button type="button" class="icon-btn" data-lib-act="download" data-id="${escapeHtml(item.id)}" title="تنزيل نص .txt" aria-label="تنزيل نص">${icon('download', { size: 15 })}</button>` : ''}
            <button type="button" class="icon-btn" data-lib-act="delete" data-id="${escapeHtml(item.id)}" title="حذف الملف" aria-label="حذف الملف">${icon('trash', { size: 15 })}</button>
          </div>
        </article>`;
    }).join('');

    listEl.querySelectorAll('[data-lib-act]').forEach(btn => {
      btn.onclick = () => {
        const act = btn.getAttribute('data-lib-act');
        const id = btn.getAttribute('data-id');
        const item = loadFiles().find(f => f.id === id);
        if (!item) return;
        if (act === 'preview') openPreviewDialog(item);
        else if (act === 'ai') sendToAiStudio(item);
        else if (act === 'download') downloadTxtFile(item);
        else if (act === 'delete') openConfirmDeleteDialog(item);
        else if (act === 'import' && window.ScoreARQuizImporter) window.ScoreARQuizImporter.openImporter({ mode: 'hub' });
      };
    });
  }

  function renderPage() {
    const u = ui();
    const { icon, iconBox } = u;
    const backdrop = u.cosmicBackdrop ? u.cosmicBackdrop() : '';
    const uploadOrb = u.orbShowcase ? u.orbShowcase('upload', { tone: 'violet' }) : iconBox('upload', { size: 'lg', tone: 'violet' });
    return `
      <div class="page scorear-open-page">
        ${backdrop}
        <header class="scorear-editorial-head">
          <div class="scorear-editorial-copy">
            <span class="launch-pill"><span class="live-dot"></span> مكتبة المحتوى الذكية</span>
            <h1>محتواك المنظم، <span class="gradient-text">جاهز لكل حصة.</span></h1>
            <p>ارفع ملفات الشرح، أوراق العمل، والعروض التقديمية لاستخراج نصوصها وبناء مسابقات بالذكاء الاصطناعي في لحظات.</p>
          </div>
          <span class="scorear-panel-index">01 — CONTENT LIBRARY</span>
        </header>

        <div class="scorear-lib-layout">
          <div>
            <div class="scorear-portal-drop spotlight" id="dropZone" tabindex="0" role="button" aria-label="رفع ملف إلى مكتبة المحتوى">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <span class="scorear-panel-index">01 / UPLOAD ORBIT</span>
                <span class="launch-pill" style="padding:3px 10px;font-size:10px;">حد 20 MB</span>
              </div>
              ${uploadOrb}
              <h3 style="color:#f6f3ff;font-size:21px;font-weight:900;margin:6px 0 8px;">اسحب الملفات هنا أو اختر من جهازك</h3>
              <p style="color:#aaa9c1;font-size:13px;line-height:1.8;max-width:380px;margin:0 auto;">تحليل فوري للنصوص والملفات الممسوحة ضوئياً وتمريرها مباشرة لصناعة الأسئلة</p>
              <div class="scorear-lib-formats">
                <span class="scorear-format-tag">PDF</span>
                <span class="scorear-format-tag">Word .docx</span>
                <span class="scorear-format-tag">PowerPoint .pptx</span>
                <span class="scorear-format-tag">Excel / CSV</span>
                <span class="scorear-format-tag">TXT / MD</span>
                <span class="scorear-format-tag">صور الدروس</span>
              </div>
              <input type="file" id="fileInput" style="display:none;" multiple accept=".pdf,.doc,.docx,.pptx,.xlsx,.xls,.csv,.txt,.md,.png,.jpg,.jpeg,.webp">
              <button type="button" class="btn launch-primary" id="libraryBrowseBtn">
                ${icon('plus', { size: 16 })} تصفح ملفات جهازك
              </button>
            </div>
            <div id="libraryProgressSlot"></div>
          </div>

          <section class="scorear-experience-panel tone-cyan spotlight">
            <div class="scorear-lib-toolbar">
              <div style="display:flex;align-items:center;gap:12px;">
                ${iconBox('layers', { size: 'sm', tone: 'cyan' })}
                <div>
                  <h3 style="color:#f6f3ff;font-size:17px;font-weight:900;margin:0;">ملفاتي المحفوظة</h3>
                  <small id="libraryFilesCount" style="color:#85f3d8;font-size:11px;font-weight:700;">0 ملف</small>
                </div>
              </div>
              <div class="scorear-lib-search">
                ${icon('search', { size: 16 })}
                <input type="search" id="librarySearchInput" placeholder="ابحث في ملفاتك بالاسم أو الصيغة..." aria-label="بحث في المكتبة">
              </div>
            </div>
            <div class="scorear-lib-list" id="libraryFileList"></div>
          </section>
        </div>
      </div>`;
  }

  function bindEvents() {
    const input = document.getElementById('fileInput');
    const browseBtn = document.getElementById('libraryBrowseBtn');
    const drop = document.getElementById('dropZone');
    const search = document.getElementById('librarySearchInput');

    if (browseBtn && input) {
      browseBtn.onclick = e => { e.stopPropagation(); input.click(); };
    }
    if (drop && input) {
      drop.onclick = e => {
        if (e.target.closest('button')) return;
        input.click();
      };
      drop.onkeydown = e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          input.click();
        }
      };
      drop.ondragover = e => { e.preventDefault(); drop.classList.add('drag'); };
      drop.ondragleave = () => drop.classList.remove('drag');
      drop.ondrop = e => {
        e.preventDefault();
        drop.classList.remove('drag');
        handleSelectedFiles(e.dataTransfer?.files);
      };
    }
    if (input) {
      input.onchange = e => {
        handleSelectedFiles(e.target?.files);
        e.target.value = '';
      };
    }
    if (search) {
      search.value = searchQuery;
      search.oninput = e => {
        searchQuery = e.target.value || '';
        renderFileList();
      };
    }
    renderFileList();
  }

  window.ScoreARLibraryHub = {
    STORAGE_KEY,
    renderPage,
    bindEvents,
    loadFiles,
    saveFiles,
    renderFileList,
    handleSelectedFiles
  };
})();
