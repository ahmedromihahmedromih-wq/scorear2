/**
 * ScoreAR AI Studio (Gemini Cloud Engine Integration)
 * Item 4: AI Question Generator, ID Token Auth, 20/day Quota, Multimodal Input, Review before Save.
 */
(function (global) {
  'use strict';

  let currentContext = { mode: 'hub', onImport: null };
  let selectedFileBase64 = null;
  let selectedFileMime = null;
  let selectedFileName = '';
  let activeTab = 'text'; // 'text' | 'file'

  function getDb() {
    return (global.firebase && global.firebase.database) ? global.firebase.database() : null;
  }
  function getAuth() {
    return (global.firebase && global.firebase.auth) ? global.firebase.auth() : null;
  }
  function getCurrentUser() {
    const a = getAuth();
    return a ? a.currentUser : null;
  }

  // --- 1. Daily Quota Reader ---
  async function fetchTodayQuota() {
    const user = getCurrentUser();
    if (!user) return { used: 0, limit: 20, remaining: 20 };
    const today = new Date().toISOString().slice(0, 10);
    const db = getDb();
    if (!db) return { used: 0, limit: 20, remaining: 20 };
    try {
      const snap = await db.ref(`scorear_ai_quotas/${user.uid}/${today}`).once('value');
      const val = snap.val() || {};
      const used = Number(val.usedCount) || 0;
      const limit = Number(val.limit) || 20;
      return { used, limit, remaining: Math.max(0, limit - used) };
    } catch (e) {
      return { used: 0, limit: 20, remaining: 20 };
    }
  }

  // --- 2. Modal Stage Management ---
  function getOrCreateAiModal() {
    let m = document.getElementById('scorearAiStudioModal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'scorearAiStudioModal';
      m.style.cssText = 'position:fixed;inset:0;background:rgba(5,6,15,0.92);backdrop-filter:blur(10px);z-index:99999;display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;direction:rtl;font-family:inherit;';
      document.body.appendChild(m);
    }
    return m;
  }

  async function openAiStudio(options = {}) {
    currentContext = { mode: options.mode || 'hub', onImport: options.onImport || null };
    selectedFileBase64 = null;
    selectedFileMime = null;
    selectedFileName = '';
    activeTab = 'text';

    const m = getOrCreateAiModal();
    m.style.display = 'flex';
    const quota = await fetchTodayQuota();
    renderAiModalView(quota);
  }

  function closeAiStudio() {
    const m = document.getElementById('scorearAiStudioModal');
    if (m) m.style.display = 'none';
  }

  // --- 3. View Renderer ---
  function renderAiModalView(quota = { used: 0, limit: 20, remaining: 20 }) {
    const m = getOrCreateAiModal();
    const isExhausted = (quota.remaining <= 0);

    m.innerHTML = `
      <div style="background:#101124;border:2px solid #7550ef;box-shadow:0 0 50px rgba(117,80,239,0.4);border-radius:24px;width:100%;max-width:780px;overflow:hidden;display:flex;flex-direction:column;max-height:94vh;">
        <!-- Header -->
        <header style="background:#171836;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(142,100,239,0.3);">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg, #7550ef, #a855f7);display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 0 15px rgba(168,85,247,0.4);">✨</div>
            <div>
              <h2 style="color:#ffffff;font-size:18px;font-weight:900;margin:0;">توليد الأسئلة بالذكاء الاصطناعي (Gemini Server)</h2>
              <p style="color:#a1a4be;font-size:12px;margin:2px 0 0 0;">صياغة تربوية حقيقية وفق معايير بلوم، مع مراجعة المعلم قبل الاعتماد.</p>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="background:${isExhausted ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.15)'};border:1px solid ${isExhausted ? '#ef4444' : '#10b981'};color:${isExhausted ? '#fca5a5' : '#34d399'};padding:4px 10px;border-radius:10px;font-size:11px;font-weight:800;">
              ⚡ الحصة اليومية: ${quota.remaining} / ${quota.limit} متبقية
            </div>
            <button onclick="ScoreARQuizAI.closeAiStudio()" style="background:none;border:none;color:#9ca3af;font-size:22px;cursor:pointer;padding:2px 8px;">✕</button>
          </div>
        </header>

        <!-- Body Form -->
        <div style="padding:20px 24px;overflow-y:auto;display:flex;flex-direction:column;gap:16px;">
          ${isExhausted ? `
            <div style="background:rgba(239,68,68,0.15);border:1px solid #ef4444;border-radius:12px;padding:12px 16px;color:#fca5a5;font-size:13px;font-weight:800;display:flex;align-items:center;gap:10px;">
              <span>⚠️ تنبيه الحصة:</span>
              <span>لقد استنفدت حصتك اليومية المحددة (${quota.limit}/${quota.limit} طلباً). تتجدد الحصة تلقائياً عند منتصف الليل.</span>
            </div>
          ` : ''}

          <!-- Source Tabs -->
          <div style="display:flex;background:#16183a;padding:4px;border-radius:12px;border:1px solid rgba(142,100,239,0.3);width:fit-content;">
            <button onclick="ScoreARQuizAI.switchTab('text')" style="background:${activeTab==='text'?'#7550ef':'transparent'};color:${activeTab==='text'?'#fff':'#a1a4be'};border:none;padding:6px 16px;border-radius:8px;font-weight:900;font-size:12px;cursor:pointer;">✍️ كتابة نص / درس</button>
            <button onclick="ScoreARQuizAI.switchTab('file')" style="background:${activeTab==='file'?'#7550ef':'transparent'};color:${activeTab==='file'?'#fff':'#a1a4be'};border:none;padding:6px 16px;border-radius:8px;font-weight:900;font-size:12px;cursor:pointer;">📎 رفع مستند أو صورة (OCR)</button>
          </div>

          <!-- Input Mode Content -->
          ${activeTab === 'text' ? `
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <label style="color:#ddd8ff;font-size:13px;font-weight:800;">نص الدرس أو الفقرة التعليمية:</label>
                <div style="display:flex;gap:6px;">
                  <button onclick="ScoreARQuizAI.loadSampleText('nahw')" style="background:rgba(142,100,239,0.2);color:#c4b5fd;border:1px solid rgba(142,100,239,0.3);border-radius:6px;padding:2px 8px;font-size:10px;cursor:pointer;">مثال نحو</button>
                  <button onclick="ScoreARQuizAI.loadSampleText('balagha')" style="background:rgba(142,100,239,0.2);color:#c4b5fd;border:1px solid rgba(142,100,239,0.3);border-radius:6px;padding:2px 8px;font-size:10px;cursor:pointer;">مثال بلاغة</button>
                </div>
              </div>
              <textarea id="aiTextInput" placeholder="الصق نص الدرس أو القواعد النحوية أو الشرح هنا (20 حرفاً على الأقل)..." style="width:100%;height:130px;background:#14152e;border:1px solid rgba(142,100,239,0.4);border-radius:14px;color:#fff;font-size:13px;font-family:inherit;padding:12px;box-sizing:border-box;resize:vertical;line-height:1.5;"></textarea>
            </div>
          ` : `
            <div>
              <label style="display:block;color:#ddd8ff;font-size:13px;font-weight:800;margin-bottom:6px;">رفع ملف مستند أو صورة (OCR وقراءة بصرية):</label>
              <div id="aiFileDropZone" onclick="document.getElementById('aiFileInput').click()" style="border:2px dashed rgba(142,100,239,0.5);border-radius:16px;padding:30px 16px;text-align:center;background:#14152e;cursor:pointer;">
                <input type="file" id="aiFileInput" accept=".docx, .pptx, .xlsx, .pdf, .png, .jpg, .jpeg, .webp" style="display:none;" onchange="ScoreARQuizAI.handleFileUpload(this.files[0])">
                <div style="font-size:36px;margin-bottom:8px;">📎</div>
                <div style="color:#fff;font-size:14px;font-weight:800;">${selectedFileName ? `ملف مختار: ${selectedFileName}` : 'اضغط لاختيار ملف Word أو PDF أو صورة'}</div>
                <p style="color:#94a3b8;font-size:11px;margin:4px 0 0 0;">يدعم Word (.docx)، PowerPoint (.pptx)، PDF، وصور المستندات مع قراءة بصرية للغة العربية.</p>
              </div>
            </div>
          `}

          <!-- Settings Grid -->
          <div style="background:#14152e;border-radius:16px;padding:14px;border:1px solid rgba(255,255,255,0.06);display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:12px;">
            <div>
              <label style="display:block;color:#a89bff;font-size:11px;font-weight:800;margin-bottom:4px;">عدد الأسئلة:</label>
              <select id="aiOptCount" style="width:100%;background:#1c1e42;border:1px solid rgba(142,100,239,0.3);color:#fff;padding:6px;border-radius:8px;font-size:11px;font-family:inherit;">
                <option value="3">3 أسئلة سريعة</option>
                <option value="5" selected>5 أسئلة (موصى به)</option>
                <option value="10">10 أسئلة شاملة</option>
                <option value="15">15 سؤالاً</option>
                <option value="20">20 سؤالاً (الحد الأقصى)</option>
              </select>
            </div>
            <div>
              <label style="display:block;color:#a89bff;font-size:11px;font-weight:800;margin-bottom:4px;">مستوى الصعوبة:</label>
              <select id="aiOptDiff" style="width:100%;background:#1c1e42;border:1px solid rgba(142,100,239,0.3);color:#fff;padding:6px;border-radius:8px;font-size:11px;font-family:inherit;">
                <option value="سهل">سهل (تذكر وفهم مباشر)</option>
                <option value="متوسط" selected>متوسط (فهم وتطبيق)</option>
                <option value="متقدم">متقدم (تحليل وتقويم)</option>
                <option value="تحدي">تحدي المتميزين ⚡</option>
              </select>
            </div>
            <div>
              <label style="display:block;color:#a89bff;font-size:11px;font-weight:800;margin-bottom:4px;">المرحلة الدراسية:</label>
              <select id="aiOptGrade" style="width:100%;background:#1c1e42;border:1px solid rgba(142,100,239,0.3);color:#fff;padding:6px;border-radius:8px;font-size:11px;font-family:inherit;">
                <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                <option value="الصف الثالث الإعدادي" selected>الصف الثالث الإعدادي</option>
                <option value="المرحلة الثانوية">المرحلة الثانوية</option>
              </select>
            </div>
            <div>
              <label style="display:block;color:#a89bff;font-size:11px;font-weight:800;margin-bottom:4px;">المادة / التخصص:</label>
              <select id="aiOptSubject" style="width:100%;background:#1c1e42;border:1px solid rgba(142,100,239,0.3);color:#fff;padding:6px;border-radius:8px;font-size:11px;font-family:inherit;">
                <option value="لغة عربية - نحو" selected>لغة عربية - نحو</option>
                <option value="لغة عربية - بلاغة">لغة عربية - بلاغة</option>
                <option value="لغة عربية - نصوص">لغة عربية - نصوص</option>
                <option value="تربية إسلامية">تربية إسلامية</option>
              </select>
            </div>
          </div>

          <!-- Progress Box (Hidden by default) -->
          <div id="aiProgressBox" style="display:none;background:#161938;border:1px solid #7550ef;border-radius:14px;padding:14px;text-align:center;">
            <div style="font-size:24px;margin-bottom:6px;" class="animate-spin">⏳</div>
            <div id="aiProgressText" style="color:#52d9ed;font-size:13px;font-weight:800;">جارٍ تحضير الطلب والتحقق من الحصة...</div>
            <div style="background:#101124;border-radius:6px;height:6px;margin-top:10px;overflow:hidden;">
              <div id="aiProgressBar" style="background:linear-gradient(90deg, #7550ef, #10b981);height:100%;width:25%;transition:width 0.4s;"></div>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <footer style="background:#171836;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(142,100,239,0.3);">
          <span style="color:#94a3b8;font-size:11px;">⚠️ المسودة تمر بمراجعتك وتعديلك في جدول المعاينة قبل الحفظ النهائي.</span>
          <div style="display:flex;gap:12px;">
            <button onclick="ScoreARQuizAI.closeAiStudio()" style="background:rgba(255,255,255,0.08);color:#d1d5db;border:1px solid rgba(255,255,255,0.15);padding:8px 16px;border-radius:10px;font-size:12px;cursor:pointer;">إلغاء</button>
            <button id="btnTriggerAiGen" onclick="ScoreARQuizAI.triggerGeneration()" ${isExhausted ? 'disabled' : ''} style="background:${isExhausted ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #7550ef, #582cd1)'};color:#fff;border:none;padding:10px 22px;border-radius:12px;font-size:13px;font-weight:900;cursor:${isExhausted ? 'not-allowed' : 'pointer'};box-shadow:0 0 20px rgba(117,80,239,0.4);">
              توليد الأسئلة بالذكاء الاصطناعي 🚀
            </button>
          </div>
        </footer>
      </div>
    `;
  }

  // --- 4. Handlers & Multimodal File Reader ---
  function switchTab(t) {
    activeTab = t;
    fetchTodayQuota().then(renderAiModalView);
  }

  function loadSampleText(type) {
    const area = document.getElementById('aiTextInput');
    if (!area) return;
    if (type === 'nahw') {
      area.value = `درس: أسلوب المدح والذم في اللغة العربية.
يتكون أسلوب المدح والذم من ثلاثة أركان أساسية:
1. فعل المدح أو الذم: (نِعْمَ وحَبّذا للمدح، وبِئْسَ ولا حَبّذا للذم). وهي أفعال جامدة تلزم صيغة الماضي.
2. الفاعل: وله أربع صور مع نعم وبئس: المعرف بـ (أل) مثل: نعم الخلقُ الصدقُ، المضاف إلى ما فيه أل مثل: نعم خلقُ المرءِ الوفاءُ، ضمير مستتر يفسره تمييز نكرة مثل: نعم خلقاً الصدقُ، أو (ما / مَنْ) الموصولتان مثل: نعم ما تتصف به الأمانة.
3. المخصوص بالمدح أو الذم: ويعرب مبتدأ مؤخراً مرفوعاً والجملة قبله خبر مقدم، أو خبراً لمبتدأ محذوف وجوباً. مع حبذا ولا حبذا يجب تأخير المخصوص ولا يصح تقديمه.`;
    } else {
      area.value = `درس: التشبيه وأركانه في علم البيان.
التشبيه هو عقد مماثلة بين أمرين أو أكثر اشتركا في صفة أو أكثر بواسطة أداة التشبيه.
أركان التشبيه أربعة:
1. المشبه: الأمر المراد توضيحه.
2. المشبه به: الأمر الأكثر وضوحاً في الصفة المشتركة. وهما طرفا التشبيه الأساسيان.
3. أداة التشبيه: قد تكون اسماً (مثل، شبه)، أو فعلاً (يشبه، يماثل)، أو حرفاً (الكاف، كأن).
4. وجه الشبه: الصفة المشتركة بين الطرفين وتكون في المشبه به أقوى.
أنواعه: التشبيه المفصل (ذكرت فيه الأركان الأربعة)، التشبيه المجمل (حذفت منه الأداة أو وجه الشبه)، والتشبيه البليغ (حذفت منه الأداة ووجه الشبه معاً وهو أبلغ الأنواع).`;
    }
  }

  function handleFileUpload(file) {
    if (!file) return;
    selectedFileName = file.name;
    selectedFileMime = file.type || 'application/octet-stream';

    const reader = new FileReader();
    reader.onload = function (e) {
      const raw = e.target.result;
      const base64Index = raw.indexOf(';base64,');
      selectedFileBase64 = base64Index >= 0 ? raw.substring(base64Index + 8) : btoa(raw);
      fetchTodayQuota().then(renderAiModalView);
      if (global.toast) global.toast(`تم تجهيز ملف (${file.name}) للتوليد ✓`);
    };

    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      reader.readAsDataURL(file);
    } else {
      // For text or docx, read as ArrayBuffer or text
      reader.readAsDataURL(file);
    }
  }

  // --- 5. Execution Pipeline ---
  async function triggerGeneration() {
    const user = getCurrentUser();
    if (!user) {
      alert('عفواً، يجب تسجيل الدخول بحساب المعلم أولاً لاستخدام الذكاء الاصطناعي.');
      return;
    }

    const textContent = (document.getElementById('aiTextInput')?.value || '').trim();
    if (activeTab === 'text' && textContent.length < 20) {
      alert('يرجى إدخال نص كافٍ من الدرس (20 حرفاً على الأقل) لتتمكن الخوارزمية من صياغة أسئلة دقيقة.');
      return;
    }
    if (activeTab === 'file' && !selectedFileBase64) {
      alert('يرجى اختيار ملف أو صورة أولاً.');
      return;
    }

    const pBox = document.getElementById('aiProgressBox');
    const pText = document.getElementById('aiProgressText');
    const pBar = document.getElementById('aiProgressBar');
    const btn = document.getElementById('btnTriggerAiGen');
    if (btn) btn.disabled = true;
    if (pBox) pBox.style.display = 'block';

    try {
      // Step 1: ID Token
      if (pText) pText.innerText = '1/3 التحقق من الجلسة والحصة اليومية... ⏳';
      if (pBar) pBar.style.width = '35%';
      const idToken = await user.getIdToken(true);

      // Step 2: Request Payload
      if (pText) pText.innerText = '2/3 توليد الأسئلة التربوية عبر خادم الذكاء الاصطناعي... 🧠';
      if (pBar) pBar.style.width = '70%';

      const payload = {
        content: activeTab === 'text' ? textContent : '',
        fileBase64: activeTab === 'file' ? selectedFileBase64 : null,
        mimeType: activeTab === 'file' ? selectedFileMime : null,
        count: Number(document.getElementById('aiOptCount')?.value || 5),
        difficulty: document.getElementById('aiOptDiff')?.value || 'متوسط',
        grade: document.getElementById('aiOptGrade')?.value || 'الصف الثالث الإعدادي',
        subject: document.getElementById('aiOptSubject')?.value || 'لغة عربية - نحو',
        format: 'mcq'
      };

      // Server endpoint call (Direct secure server route)
      const resp = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + idToken
        },
        body: JSON.stringify(payload)
      });

      if (pText) pText.innerText = '3/3 مراجعة وتدقيق جودة الخيارات والإجابات... 🔍';
      if (pBar) pBar.style.width = '95%';

      if (!resp.ok) {
        let errData = {};
        try { errData = await resp.json(); } catch(e){}
        const errMsg = errData.error || `خطأ في الخادم (رمز ${resp.status})`;
        throw new Error(errMsg);
      }

      const resJson = await resp.json();
      const rawQuestions = resJson.questions || [];

      // Canonical Normalization & Validation at AI Boundary
      const evaluator = global.ScoreAREvaluator;
      const questions = [];
      rawQuestions.forEach((raw, idx) => {
        try {
          const canonical = evaluator ? evaluator.normalizeQuestion(raw, { fallbackId: `q_ai_${Date.now()}_${idx}` }) : raw;
          const val = evaluator ? evaluator.validateQuestion(canonical) : { valid: true };
          if (val.valid) questions.push(canonical);
          else console.warn(`[ScoreAR QuizAI] Skipped invalid AI question: ${val.error}`, raw);
        } catch(e) {
          console.warn('[ScoreAR QuizAI] Normalization error:', e.message);
        }
      });

      if (!questions.length) {
        throw new Error('لم يقم النموذج بتوليد أي أسئلة صالحة. يرجى تجربة فقرة أكثر تركيزاً.');
      }

      // Step 3: Success -> Hand off to Interactive Preview Table
      closeAiStudio();
      if (global.toast) global.toast(`تم توليد (${questions.length}) سؤالاً بنجاح! راجعها الآن قبل الحفظ ✓`);

      if (currentContext.mode === 'builder' && typeof currentContext.onImport === 'function') {
        currentContext.onImport(questions);
      } else if (global.ScoreARQuizImporter && global.ScoreARQuizImporter.openImporter) {
        // Open the interactive preview table for teacher review before saving
        global.ScoreARQuizImporter.openImporter({
          mode: currentContext.mode,
          onImport: currentContext.onImport
        });
        // Inject questions into the importer table model
        setTimeout(() => {
          if (global.ScoreARQuizImporter.handlePreloadedQuestions) {
            global.ScoreARQuizImporter.handlePreloadedQuestions(questions, 'توليد ذكي (AI)');
          }
        }, 100);
      }

    } catch (err) {
      console.error('AI Generation Failed:', err);
      alert('تنبيه: ' + (err.message || 'فشل توليد الأسئلة.'));
      if (pBox) pBox.style.display = 'none';
      if (btn) btn.disabled = false;
    }
  }

  global.ScoreARQuizAI = {
    openAiStudio,
    closeAiStudio,
    switchTab,
    loadSampleText,
    handleFileUpload,
    triggerGeneration
  };

})(typeof window !== 'undefined' ? window : this);
