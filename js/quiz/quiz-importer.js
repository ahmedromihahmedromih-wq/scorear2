/**
 * ScoreAR Quiz Importer (Excel & CSV - Kahoot Standard Engine)
 * Item 3: Kahoot format import, Template download, Editable preview table, Strict error guards & destination routing.
 */
(function (global) {
  'use strict';
  let currentContext = { mode: 'hub', onImport: null };
  let importedRows = [];
  let currentFileName = '';
  function getDb() {
    return (global.firebase && global.firebase.database) ? global.firebase.database() : null;
  }
  function getAuthUid() {
    const a = (global.firebase && global.firebase.auth) ? global.firebase.auth() : null;
    return a && a.currentUser ? a.currentUser.uid : null;
  }
  function escapeHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  // --- 1. Template Generation & Download ---
  function downloadTemplate(format = 'xlsx') {
    const headers = ['السؤال (Question)', 'الإجابة 1 (Answer 1)', 'الإجابة 2 (Answer 2)', 'الإجابة 3 (Answer 3)', 'الإجابة 4 (Answer 4)', 'الزمن بالثواني (Time limit)', 'رقم الإجابة الصحيحة (Correct answer)', 'النقاط (Points)', 'الشرح بعد الإجابة (Explanation)'];
    const s1 = ['ما إعراب كلمة "العلمُ" في "العلمُ نورٌ"؟', 'مبتدأ مرفوع', 'خبر مرفوع', 'فاعل مرفوع', 'مفعول به منصوب', 20, 1, 1000, 'العلم اسم بدأت به الجملة الاسمية فيعرب مبتدأ مرفوعاً'];
    const s2 = ['كم عدد حروف الهجاء في اللغة العربية؟', '26 حرفاً', '28 حرفاً', '30 حرفاً', '24 حرفاً', 30, 2, 1000, 'حروف الهجاء العربية ثمانية وعشرون حرفاً'];
    const s3 = ['أي من الكلمات الآتية اسم مبني؟', 'هذا', 'محمد', 'كتاب', 'شجرة', 15, 1, 1000, 'أسماء الإشارة مبنية عدا المثنى'];
    const data = [headers, s1, s2, s3];
    if (format === 'csv') {
      const csv = '\uFEFF' + data.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ScoreAR_Kahoot_Template.csv';
      a.click();
      URL.revokeObjectURL(a.href);
      if (global.toast) global.toast('تم تنزيل قالب CSV (UTF-8 مع العربية) ✓');
      return;
    }
    if (!global.XLSX) { alert('مكتبة Excel قيد التحميل، يرجى الانتظار ثانية.'); return; }
    const ws = global.XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 30 }];
    const wb = global.XLSX.utils.book_new();
    global.XLSX.utils.book_append_sheet(wb, ws, 'ScoreAR Template');
    global.XLSX.writeFile(wb, 'ScoreAR_Kahoot_Template.xlsx');
    if (global.toast) global.toast('تم تنزيل قالب Excel المتوافق مع كاهوت ✓');
  }
  // --- 2. File Parsing & Header Auto-Detection ---
  function parseUploadedFile(file) {
    if (!file) return;
    currentFileName = file.name;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        if (!global.XLSX) { alert('محرك Excel غير محمل، يرجى تحديث الصفحة.'); return; }
        const wb = global.XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = global.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        processRawRows(rows);
      } catch (err) {
        alert('خطأ أثناء قراءة الملف: ' + (err.message || ''));
      }
    };
    reader.readAsArrayBuffer(file);
  }
  function processRawRows(rawRows) {
    if (!rawRows || !rawRows.length) { alert('الملف فارغ أو لا يحتوي على بيانات.'); return; }
    let headerIdx = -1;
    let colMap = { q: 0, o1: 1, o2: 2, o3: 3, o4: 4, o5: -1, o6: -1, time: 5, ans: 6, pts: 7, exp: 8 };
    for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
      const row = rawRows[i];
      if (!Array.isArray(row)) continue;
      const rStr = row.map(c => String(c).toLowerCase()).join(' ');
      if (rStr.includes('سؤال') || rStr.includes('question') || rStr.includes('إجابة') || rStr.includes('answer')) {
        headerIdx = i;
        row.forEach((cell, cIdx) => {
          const s = String(cell).trim().toLowerCase();
          if (/سؤال|question|السؤال/.test(s)) colMap.q = cIdx;
          else if (/إجابة 1|اجابة 1|خيار 1|answer 1|ans 1/.test(s)) colMap.o1 = cIdx;
          else if (/إجابة 2|اجابة 2|خيار 2|answer 2|ans 2/.test(s)) colMap.o2 = cIdx;
          else if (/إجابة 3|اجابة 3|خيار 3|answer 3|ans 3/.test(s)) colMap.o3 = cIdx;
          else if (/إجابة 4|اجابة 4|خيار 4|answer 4|ans 4/.test(s)) colMap.o4 = cIdx;
          else if (/إجابة 5|اجابة 5|answer 5/.test(s)) colMap.o5 = cIdx;
          else if (/إجابة 6|اجابة 6|answer 6/.test(s)) colMap.o6 = cIdx;
          else if (/زمن|وقت|time|ثانية/.test(s)) colMap.time = cIdx;
          else if (/صحيح|صحيحة|correct|key/.test(s)) colMap.ans = cIdx;
          else if (/نقاط|نقطة|درجة|points/.test(s)) colMap.pts = cIdx;
          else if (/شرح|تفسير|توضيح|explanation/.test(s)) colMap.exp = cIdx;
        });
        break;
      }
    }
    importedRows = [];
    for (let r = (headerIdx >= 0 ? headerIdx + 1 : 0); r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || !row.length) continue;
      const joined = row.map(x => String(x || '').trim()).join('');
      if (!joined || joined.startsWith('#') || joined.startsWith('//')) continue;
      const qText = String(row[colMap.q] ?? '').trim();
      const rawOpts = [
        String(row[colMap.o1] ?? '').trim(), String(row[colMap.o2] ?? '').trim(),
        colMap.o3 >= 0 ? String(row[colMap.o3] ?? '').trim() : '',
        colMap.o4 >= 0 ? String(row[colMap.o4] ?? '').trim() : '',
        colMap.o5 >= 0 ? String(row[colMap.o5] ?? '').trim() : '',
        colMap.o6 >= 0 ? String(row[colMap.o6] ?? '').trim() : ''
      ].filter(Boolean);
      let pTime = colMap.time >= 0 ? parseInt(row[colMap.time], 10) : 20;
      if (isNaN(pTime) || pTime <= 0) pTime = 20;
      let pPts = colMap.pts >= 0 ? parseInt(row[colMap.pts], 10) : 1000;
      if (![0, 1000, 2000].includes(pPts)) pPts = 1000;
      const rAns = colMap.ans >= 0 ? String(row[colMap.ans] ?? '').trim() : '1';
      let cIdx = -1;
      const numAns = parseInt(rAns, 10);
      if (!isNaN(numAns) && numAns >= 1 && numAns <= rawOpts.length) {
        cIdx = numAns - 1;
      } else {
        const lMap = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'أ': 0, 'ب': 1, 'ج': 2, 'د': 3 };
        const lKey = rAns.toLowerCase();
        if (lMap[lKey] !== undefined && lMap[lKey] < rawOpts.length) cIdx = lMap[lKey];
        else { const m = rawOpts.findIndex(o => o.toLowerCase() === rAns.toLowerCase()); if (m >= 0) cIdx = m; }
      }
      const item = {
        id: 'imp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        included: true,
        q: qText,
        opts: rawOpts.length >= 2 ? rawOpts : (rawOpts.length === 1 ? [rawOpts[0], ''] : ['', '']),
        ans: cIdx,
        timeLimit: pTime,
        points: pPts,
        explain: colMap.exp >= 0 ? String(row[colMap.exp] ?? '').trim() : '',
        errors: []
      };
      validateRow(item);
      importedRows.push(item);
    }
    renderPreviewView();
  }
  // --- 3. Row Validation Engine ---
  function validateRow(row) {
    const errs = [];
    const evaluator = global.ScoreAREvaluator;
    if (evaluator) {
      try {
        const canonical = evaluator.normalizeQuestion({ q: row.q, opts: row.opts, ans: row.ans });
        const val = evaluator.validateQuestion(canonical);
        if (!val.valid) errs.push(val.error);
      } catch(e) { errs.push(e.message); }
    } else {
      const q = (row.q || '').trim();
      if (!q) errs.push('نص السؤال فارغ');
      const clean = (row.opts || []).map(o => (o || '').trim()).filter(Boolean);
      if (clean.length < 2) errs.push('يجب توفر إجابتين على الأقل');
      if (row.ans === null || row.ans === undefined || isNaN(row.ans) || row.ans < 0) errs.push('لم يتم تحديد الإجابة الصحيحة');
    }
    const t = Number(row.timeLimit);
    if (isNaN(t) || t < 5 || t > 120) errs.push('الزمن يجب أن يكون بين 5 و 120 ثانية');
    row.errors = errs;
    row.isValid = (errs.length === 0);
    return row.isValid;
  }
  // --- 4. Modal Stage ---
  function getOrCreateImporterModal() {
    let m = document.getElementById('scorearQuizImporterModal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'scorearQuizImporterModal';
      m.style.cssText = 'position:fixed;inset:0;background:rgba(5,6,15,0.92);backdrop-filter:blur(10px);z-index:99999;display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;direction:rtl;font-family:inherit;';
      document.body.appendChild(m);
    }
    return m;
  }
  function openImporter(options = {}) {
    currentContext = { mode: options.mode || 'hub', onImport: options.onImport || null };
    importedRows = [];
    currentFileName = '';
    const m = getOrCreateImporterModal();
    m.style.display = 'flex';
    renderUploadView();
  }
  function closeImporter() {
    const m = document.getElementById('scorearQuizImporterModal');
    if (m) m.style.display = 'none';
  }
  // --- 5. Upload View ---
  function renderUploadView() {
    const m = getOrCreateImporterModal();
    m.innerHTML = `
      <div style="background:#101124;border:2px solid #7550ef;box-shadow:0 0 40px rgba(117,80,239,0.4);border-radius:24px;width:100%;max-width:760px;overflow:hidden;display:flex;flex-direction:column;max-height:92vh;">
        <header style="background:#171836;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(142,100,239,0.3);">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:42px;height:42px;border-radius:12px;background:#7550ef;display:flex;align-items:center;justify-content:center;font-size:22px;">📥</div>
            <div>
              <h2 style="color:#ffffff;font-size:18px;font-weight:900;margin:0;">استيراد الأسئلة من Excel / CSV</h2>
              <p style="color:#a1a4be;font-size:12px;margin:2px 0 0 0;">متوافق مع قوالب كاهوت وملفات Excel و CSV باللغة العربية.</p>
            </div>
          </div>
          <button onclick="ScoreARQuizImporter.closeImporter()" style="background:none;border:none;color:#9ca3af;font-size:22px;cursor:pointer;padding:4px 8px;">✕</button>
        </header>
        <div style="padding:24px;overflow-y:auto;display:flex;flex-direction:column;gap:20px;">
          <div style="background:#161833;border:1px dashed #7550ef;border-radius:16px;padding:16px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
            <div>
              <h3 style="color:#52d9ed;font-size:14px;font-weight:900;margin:0 0 4px 0;">💡 هل تحتاج إلى القالب المعتمد؟</h3>
              <p style="color:#cbd5e1;font-size:12px;margin:0;">رتّب أسئلتك على جهازك ثم ارفع الملف هنا للاستيراد الفوري.</p>
            </div>
            <div style="display:flex;gap:10px;">
              <button onclick="ScoreARQuizImporter.downloadTemplate('xlsx')" style="background:#1e3a29;color:#34d399;border:1px solid #10b981;padding:8px 14px;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;">📊 تنزيل قالب Excel</button>
              <button onclick="ScoreARQuizImporter.downloadTemplate('csv')" style="background:#221d42;color:#c4b5fd;border:1px solid #7550ef;padding:8px 14px;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;">📄 تنزيل قالب CSV (UTF-8)</button>
            </div>
          </div>
          <div id="scorearDropZone" style="border:2px dashed rgba(142,100,239,0.5);border-radius:20px;padding:40px 20px;text-align:center;background:#14152e;cursor:pointer;transition:all 0.2s;" onclick="document.getElementById('scorearFileInput').click()">
            <input type="file" id="scorearFileInput" accept=".xlsx, .xls, .csv" style="display:none;" onchange="ScoreARQuizImporter.handleFileSelect(this.files[0])">
            <div style="font-size:48px;margin-bottom:12px;">📁</div>
            <h3 style="color:#ffffff;font-size:16px;font-weight:800;margin:0 0 6px 0;">اضغط لاختيار ملف Excel/CSV أو اسحبه هنا</h3>
            <p style="color:#94a3b8;font-size:12px;margin:0;">يدعم .xlsx ، .xls ، .csv (ترميز UTF-8 مع العربية)</p>
          </div>
          <div style="background:#111228;border-radius:14px;padding:12px 16px;border:1px solid rgba(255,255,255,0.06);color:#cbd5e1;font-size:11px;line-height:1.6;">
            <strong style="color:#a89bff;">أعمدة كاهوت القياسية:</strong> السؤال | الإجابة 1 | الإجابة 2 | الإجابة 3 | الإجابة 4 | الزمن (ث) | الإجابة الصحيحة (1-4) | النقاط | الشرح
          </div>
        </div>
        <footer style="background:#14152e;padding:14px 24px;display:flex;justify-content:flex-end;border-top:1px solid rgba(142,100,239,0.2);">
          <button onclick="ScoreARQuizImporter.closeImporter()" style="background:rgba(255,255,255,0.08);color:#d1d5db;border:1px solid rgba(255,255,255,0.15);padding:8px 18px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;">إلغاء</button>
        </footer>
      </div>
    `;
    const dz = document.getElementById('scorearDropZone');
    if (dz) {
      dz.ondragover = (e) => { e.preventDefault(); dz.style.borderColor = '#10b981'; };
      dz.ondragleave = () => { dz.style.borderColor = 'rgba(142,100,239,0.5)'; };
      dz.ondrop = (e) => { e.preventDefault(); if (e.dataTransfer?.files?.[0]) parseUploadedFile(e.dataTransfer.files[0]); };
    }
  }
  // --- 6. Preview View ---
  function renderPreviewView() {
    const m = getOrCreateImporterModal();
    const inc = importedRows.filter(r => r.included);
    const valid = inc.filter(r => r.isValid).length;
    const errors = inc.filter(r => !r.isValid).length;
    const canSave = (errors === 0 && valid > 0);
    m.innerHTML = `
      <div style="background:#101124;border:2px solid #7550ef;box-shadow:0 0 50px rgba(117,80,239,0.4);border-radius:24px;width:100%;max-width:1150px;overflow:hidden;display:flex;flex-direction:column;max-height:94vh;">
        <header style="background:#171836;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(142,100,239,0.3);">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:38px;height:38px;border-radius:10px;background:#7550ef;display:flex;align-items:center;justify-content:center;font-size:20px;">📋</div>
            <div>
              <h2 style="color:#ffffff;font-size:16px;font-weight:900;margin:0;">معاينة الأسئلة (${currentFileName || 'ملف جاهز'})</h2>
              <div style="display:flex;gap:10px;margin-top:2px;">
                <span style="color:#c4b5fd;font-size:11px;font-weight:700;">إجمالي: ${importedRows.length} سؤال</span>
                <span style="color:#34d399;font-size:11px;font-weight:800;">✓ ${valid} سليم</span>
                ${errors > 0 ? `<span style="background:rgba(239,68,68,0.2);color:#f87171;padding:1px 6px;border-radius:6px;font-size:11px;font-weight:800;border:1px solid #ef4444;">⚠️ ${errors} أخطاء</span>` : ''}
              </div>
            </div>
          </div>
          <div style="display:flex;gap:10px;">
            <button onclick="ScoreARQuizImporter.renderUploadView()" class="btn launch-outline" style="padding:6px 12px;font-size:11px;">${(global.ScoreARUI?.icon('folderOpen', { size: 13 }) || '')} ملف آخر</button>
            <button onclick="ScoreARQuizImporter.closeImporter()" class="icon-btn" style="padding:4px 8px;" aria-label="إغلاق">${(global.ScoreARUI?.icon('close', { size: 15 }) || '✕')}</button>
          </div>
        </header>
        ${errors > 0 ? `
          <div style="background:#422337;border-bottom:1px solid #c38498;padding:8px 24px;color:#ffd3e5;font-size:12px;font-weight:800;display:flex;align-items:center;gap:8px;">
            ${(global.ScoreARUI?.icon('alert', { size: 14 }) || '')} زر الحفظ معطّل لوجود (${errors}) صفوف بها أخطاء. قم بتصحيحها في الجدول، أو حذفها، أو استبعادها من الاستيراد.
          </div>
        ` : ''}
        <div style="padding:16px 20px;overflow-y:auto;flex:1;">
          <table style="width:100%;border-collapse:collapse;color:#ffffff;font-size:12px;text-align:right;">
            <thead>
              <tr style="background:#111226;color:#c9baff;border-bottom:1px solid #ffffff1a;">
                <th style="padding:8px 6px;width:34px;text-align:center;">#</th>
                <th style="padding:8px 6px;width:40px;text-align:center;">تضمين</th>
                <th style="padding:8px 6px;min-width:200px;">نص السؤال</th>
                <th style="padding:8px 6px;min-width:300px;">الخيارات (انقر الدائرة لتحديد الإجابة الصحيحة)</th>
                <th style="padding:8px 6px;width:65px;text-align:center;">الزمن</th>
                <th style="padding:8px 6px;width:70px;text-align:center;">النقاط</th>
                <th style="padding:8px 6px;min-width:120px;">الشرح</th>
                <th style="padding:8px 6px;width:80px;text-align:center;">الحالة</th>
                <th style="padding:8px 6px;width:40px;text-align:center;">حذف</th>
              </tr>
            </thead>
            <tbody>
              ${importedRows.map((row, idx) => {
                const isErr = (!row.isValid && row.included);
                return `
                  <tr style="background:${isErr ? '#42233766' : (idx % 2 === 0 ? '#14152a' : '#0f1123')};border-bottom:1px solid ${isErr ? '#c38498' : '#ffffff10'};opacity:${row.included ? '1' : '0.45'};">
                    <td style="padding:6px;text-align:center;font-weight:800;color:#a1a4be;">${idx + 1}</td>
                    <td style="padding:6px;text-align:center;">
                      <input type="checkbox" ${row.included ? 'checked' : ''} onchange="ScoreARQuizImporter.toggleRowInclude(${idx}, this.checked)" style="cursor:pointer;accent-color:#7550ef;width:16px;height:16px;">
                    </td>
                    <td style="padding:6px;">
                      <textarea oninput="ScoreARQuizImporter.updateRowText(${idx}, 'q', this.value)" style="width:100%;height:45px;background:#0c0d1d;border:1px solid ${isErr && !row.q.trim() ? '#c38498' : '#ffffff1c'};border-radius:8px;color:#fff;font-size:12px;font-family:inherit;padding:4px;resize:none;">${escapeHtml(row.q)}</textarea>
                    </td>
                    <td style="padding:6px;">
                      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
                        ${row.opts.map((opt, oIdx) => {
                          const isC = (row.ans === oIdx);
                          return `
                            <div style="display:flex;align-items:center;gap:4px;background:${isC ? '#163c39' : '#0c0d1d'};border:1px solid ${isC ? '#44b8a5' : '#ffffff16'};border-radius:6px;padding:2px 6px;">
                              <button type="button" onclick="ScoreARQuizImporter.setRowCorrectAnswer(${idx}, ${oIdx})" style="width:15px;height:15px;border-radius:50%;background:${isC ? '#44b8a5' : 'transparent'};border:1px solid ${isC ? '#44b8a5' : '#6b7280'};cursor:pointer;flex-shrink:0;" title="${isC ? 'الإجابة الصحيحة' : 'اجعلها الصحيحة'}"></button>
                              <input type="text" value="${escapeHtml(opt)}" oninput="ScoreARQuizImporter.updateRowOption(${idx}, ${oIdx}, this.value)" placeholder="خيار ${oIdx + 1}" style="background:transparent;border:none;color:#fff;font-size:11px;width:100%;font-family:inherit;outline:none;">
                            </div>
                          `;
                        }).join('')}
                      </div>
                    </td>
                    <td style="padding:6px;text-align:center;">
                      <input type="number" min="5" max="120" value="${row.timeLimit}" oninput="ScoreARQuizImporter.updateRowText(${idx}, 'timeLimit', this.value)" style="width:50px;background:#0c0d1d;border:1px solid #ffffff1c;border-radius:6px;color:#fff;font-size:11px;text-align:center;padding:4px;">
                    </td>
                    <td style="padding:6px;text-align:center;">
                      <select onchange="ScoreARQuizImporter.updateRowText(${idx}, 'points', this.value)" style="background:#0c0d1d;border:1px solid #ffffff1c;border-radius:6px;color:#fff;font-size:10px;padding:3px;font-family:inherit;">
                        <option value="1000" ${row.points === 1000 ? 'selected' : ''}>1000</option>
                        <option value="2000" ${row.points === 2000 ? 'selected' : ''}>2000</option>
                        <option value="0" ${row.points === 0 ? 'selected' : ''}>0</option>
                      </select>
                    </td>
                    <td style="padding:6px;">
                      <input type="text" value="${escapeHtml(row.explain || '')}" oninput="ScoreARQuizImporter.updateRowText(${idx}, 'explain', this.value)" placeholder="توضيح..." style="width:100%;background:#0c0d1d;border:1px solid #ffffff1c;border-radius:6px;color:#fff;font-size:11px;padding:4px;font-family:inherit;">
                    </td>
                    <td style="padding:6px;text-align:center;">
                      ${row.isValid ? '<span style="color:#7fe7ce;font-weight:800;font-size:11px;">✓ سليم</span>' : `<span title="${row.errors.join(' | ')}" style="color:#ffd3e5;font-weight:800;font-size:10px;display:block;cursor:help;">خطأ</span>`}
                    </td>
                    <td style="padding:6px;text-align:center;">
                      <button onclick="ScoreARQuizImporter.deleteRow(${idx})" style="background:none;border:none;color:#ffd3e5;cursor:pointer;display:inline-grid;place-items:center;" aria-label="حذف">${(global.ScoreARUI?.icon('trash', { size: 14 }) || '✕')}</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        <footer style="background:#111226;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #ffffff16;flex-wrap:wrap;gap:12px;">
          <div style="color:#a1a4be;font-size:12px;font-weight:700;">
            الملخص: <strong style="color:#7fe7ce;">${valid} سؤالاً سليماً</strong> | <strong style="color:${errors > 0 ? '#ffd3e5' : '#a1a4be'};">${errors} أخطاء</strong>
          </div>
          <div style="display:flex;gap:10px;align-items:center;">
            <button onclick="ScoreARQuizImporter.closeImporter()" class="btn launch-outline" style="padding:8px 16px;font-size:12px;">إلغاء</button>
            <button onclick="ScoreARQuizImporter.commitImportedQuestions()" ${canSave ? '' : 'disabled'} class="${canSave ? 'btn launch-primary' : 'btn launch-outline'}" style="padding:10px 22px;font-size:13px;cursor:${canSave ? 'pointer' : 'not-allowed'};opacity:${canSave ? '1' : '0.5'};">
              ${(global.ScoreARUI?.icon('check', { size: 14 }) || '')} اعتماد وحفظ (${valid} سؤالاً)
            </button>
          </div>
        </footer>
      </div>
    `;
  }
  // --- 7. Live Table Edit Actions ---
  function updateRowText(idx, field, val) { if (!importedRows[idx]) return; importedRows[idx][field] = val; validateRow(importedRows[idx]); renderPreviewView(); }
  function updateRowOption(idx, oIdx, val) { if (!importedRows[idx]) return; importedRows[idx].opts[oIdx] = val; validateRow(importedRows[idx]); renderPreviewView(); }
  function setRowCorrectAnswer(idx, oIdx) { if (!importedRows[idx]) return; importedRows[idx].ans = oIdx; validateRow(importedRows[idx]); renderPreviewView(); }
  function toggleRowInclude(idx, isInc) { if (!importedRows[idx]) return; importedRows[idx].included = isInc; renderPreviewView(); }
  function deleteRow(idx) { importedRows.splice(idx, 1); renderPreviewView(); }
  // --- 8. Save & Target Routing ---
  async function commitImportedQuestions() {
    const validQuestions = importedRows.filter(r => r.included && r.isValid).map(r => ({
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      q: r.q.trim(), opts: r.opts.map(o => o.trim()).filter(Boolean), ans: r.ans,
      timeLimit: Number(r.timeLimit) || 20, points: Number(r.points) || 1000, explain: (r.explain || '').trim()
    }));
    if (!validQuestions.length) { alert('لا توجد أسئلة سليمة لاعتمادها.'); return; }
    if (currentContext.mode === 'builder' && typeof currentContext.onImport === 'function') {
      currentContext.onImport(validQuestions); closeImporter();
      if (global.toast) global.toast(`تم استيراد ${validQuestions.length} سؤالاً بنجاح إلى مسابقتك ✓`);
      return;
    }
    renderDestinationModal(validQuestions);
  }
  function renderDestinationModal(questions) {
    const m = getOrCreateImporterModal();
    m.innerHTML = `
      <div style="background:#101124;border:2px solid #7550ef;box-shadow:0 0 40px rgba(117,80,239,0.4);border-radius:24px;width:100%;max-width:540px;overflow:hidden;direction:rtl;font-family:inherit;">
        <header style="background:#171836;padding:16px 20px;border-bottom:1px solid rgba(142,100,239,0.3);display:flex;align-items:center;justify-content:space-between;">
          <h3 style="color:#fff;font-size:16px;font-weight:900;margin:0;">اختر وجهة حفظ (${questions.length}) سؤالاً</h3>
          <button onclick="ScoreARQuizImporter.renderPreviewView()" style="background:none;border:none;color:#9ca3af;font-size:18px;cursor:pointer;">✕</button>
        </header>
        <div style="padding:24px;display:flex;flex-direction:column;gap:16px;">
          <div style="background:#17193b;border:2px solid rgba(142,100,239,0.4);border-radius:16px;padding:16px;cursor:pointer;" onclick="ScoreARQuizImporter.saveAsNewQuiz()">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
              <span style="font-size:24px;">📚</span>
              <h4 style="color:#fff;font-size:14px;font-weight:800;margin:0;">حفظ كمسابقة جديدة في مكتبتي</h4>
            </div>
            <p style="color:#cbd5e1;font-size:12px;margin:0 0 10px 0;">إنشاء مسابقة جاهزة بكامل الأسئلة مع إمكانية إطلاقها فوراً للطلاب.</p>
            <input type="text" id="impQuizTitle" value="مسابقة مستوردة - ${new Date().toLocaleDateString('ar-EG')}" onclick="event.stopPropagation()" style="width:100%;background:#111228;border:1px solid #7550ef;border-radius:8px;padding:8px 12px;color:#fff;font-size:12px;font-family:inherit;box-sizing:border-box;">
          </div>
          <div style="background:#17193b;border:2px solid rgba(16,185,129,0.4);border-radius:16px;padding:16px;cursor:pointer;" onclick="ScoreARQuizImporter.saveToQuestionBank()">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
              <span style="font-size:24px;">💡</span>
              <h4 style="color:#fff;font-size:14px;font-weight:800;margin:0;">إضافة جميع الأسئلة لبنك الأسئلة الشامل</h4>
            </div>
            <p style="color:#cbd5e1;font-size:12px;margin:0 0 10px 0;">تخزين الأسئلة مع تصنيف المادة والصف لإعادة استخدامها في أي مسابقة.</p>
            <div style="display:flex;gap:10px;" onclick="event.stopPropagation()">
              <select id="impBankSubject" style="flex:1;background:#111228;border:1px solid #10b981;border-radius:8px;padding:6px 10px;color:#fff;font-size:11px;font-family:inherit;">
                <option value="لغة عربية - نحو">لغة عربية - نحو</option>
                <option value="لغة عربية - بلاغة">لغة عربية - بلاغة</option>
                <option value="لغة عربية - نصوص">لغة عربية - نصوص</option>
                <option value="تربية إسلامية">تربية إسلامية</option>
              </select>
              <select id="impBankGrade" style="flex:1;background:#111228;border:1px solid #10b981;border-radius:8px;padding:6px 10px;color:#fff;font-size:11px;font-family:inherit;">
                <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                <option value="المرحلة الثانوية">المرحلة الثانوية</option>
              </select>
            </div>
          </div>
        </div>
        <footer style="background:#14152e;padding:12px 20px;display:flex;justify-content:flex-end;">
          <button onclick="ScoreARQuizImporter.renderPreviewView()" style="background:rgba(255,255,255,0.08);color:#d1d5db;border:1px solid rgba(255,255,255,0.15);padding:6px 14px;border-radius:8px;font-size:12px;cursor:pointer;">العودة للمعاينة</button>
        </footer>
      </div>
    `;
    global._pendingImportedQuestions = questions;
  }
  async function saveAsNewQuiz() {
    const questions = global._pendingImportedQuestions || [];
    if (!questions.length) return;
    const title = (document.getElementById('impQuizTitle')?.value || '').trim() || 'مسابقة مستوردة جديدة';
    const db = getDb();
    const uid = getAuthUid();
    if (!db || !uid) { alert('يجب تسجيل الدخول كمعلم لإتمام الحفظ في مكتبتك.'); return; }
    const quizId = 'qz_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const quizDoc = { id: quizId, ownerUid: uid, title, questions, folderId: 'root', createdAt: Date.now(), updatedAt: Date.now() };
    try {
      await db.ref('scorear_quizzes/' + quizId).set(quizDoc);
      const snap = await db.ref('scorear_quizzes/' + quizId).once('value');
      if (!snap.exists()) throw new Error('فشل التحقق من كتابة المسابقة في قاعدة البيانات.');
      closeImporter();
      if (global.toast) global.toast(`تم إنشاء وحفظ المسابقة (${title}) بنجاح ✓`);
      if (global.ScoreARQuizBank && global.ScoreARQuizBank.openBankHub) global.ScoreARQuizBank.openBankHub('quizzes');
    } catch (err) {
      alert('خطأ أثناء حفظ المسابقة: ' + err.message);
    }
  }
  async function saveToQuestionBank() {
    const questions = global._pendingImportedQuestions || [];
    if (!questions.length) return;
    const subj = document.getElementById('impBankSubject')?.value || 'لغة عربية - نحو';
    const grade = document.getElementById('impBankGrade')?.value || 'الصف الأول الإعدادي';
    const db = getDb();
    const uid = getAuthUid();
    if (!db || !uid) { alert('يجب تسجيل الدخول كمعلم لإتمام الحفظ في البنك.'); return; }
    try {
      const updates = {};
      const now = Date.now();
      questions.forEach((q, i) => {
        const qId = 'qb_' + (now + i) + '_' + Math.random().toString(36).substring(2, 6);
        updates['scorear_question_bank/' + qId] = {
          id: qId, ownerUid: uid, q: q.q, opts: q.opts, ans: q.ans, timeLimit: q.timeLimit,
          points: q.points, explain: q.explain, subject: subj, grade: grade,
          tags: [subj, 'استيراد'], folderId: 'root', createdAt: now + i, updatedAt: now + i
        };
      });
      await db.ref().update(updates);
      closeImporter();
      if (global.toast) global.toast(`تم حفظ (${questions.length}) سؤالاً في بنك الأسئلة الشامل ✓`);
      if (global.ScoreARQuizBank && global.ScoreARQuizBank.openBankHub) global.ScoreARQuizBank.openBankHub('bank');
    } catch (err) {
      alert('خطأ أثناء حفظ الأسئلة في البنك: ' + err.message);
    }
  }
  function handlePreloadedQuestions(questions, sourceName = 'توليد ذكي (AI)') {
    if (!Array.isArray(questions)) return;
    currentFileName = sourceName;
    importedRows = questions.map(q => {
      const item = {
        id: q.id || ('imp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
        included: true,
        q: (q.q || q.text || '').trim(),
        opts: Array.isArray(q.opts || q.options) ? [...(q.opts || q.options)] : [],
        ans: (q.ans !== undefined) ? q.ans : 0,
        timeLimit: Number(q.timeLimit) || 20,
        points: Number(q.points) || 1000,
        explain: (q.explain || q.explanation || '').trim(),
        errors: []
      };
      validateRow(item);
      return item;
    });
    renderPreviewView();
  }
  global.ScoreARQuizImporter = {
    openImporter, closeImporter, downloadTemplate, handleFileSelect: parseUploadedFile,
    renderUploadView, renderPreviewView, updateRowText, updateRowOption, setRowCorrectAnswer,
    toggleRowInclude, deleteRow, commitImportedQuestions, saveAsNewQuiz, saveToQuestionBank,
    handlePreloadedQuestions
  };
})(typeof window !== 'undefined' ? window : this);
