/**
 * ScoreAR World Content Picker (world-content-picker.js)
 * Item 1: Direct Content Picker upon selecting a world from Worlds page.
 * Live search, multi-selection from question bank, pre-made quizzes selection,
 * or merging both, with live question & time counter, and direct room launch.
 * Strictly Rule 7 Compliant (<500 lines).
 */
(function (global) {
  'use strict';

  let activeWorldId = 'royal';
  let selectedQuizId = null;
  let selectedQuizQuestions = [];
  let selectedBankQuestionIds = new Set();
  let activeTab = 'quizzes'; // 'quizzes' | 'bank'
  let searchQuery = '';
  let subjectFilter = 'all';

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getWorldData(id) {
    const list = (global.ScoreARWorldFlow && global.ScoreARWorldFlow.WORLDS_DATA) || [
      { id: 'royal', name: 'القصر الملكي الأندلسي', tag: 'تاريخ وأصالة', image: 'royal_palace' },
      { id: 'oasis', name: 'واحة النخيل والرمال', tag: 'بيئة عربية', image: 'desert_oasis' },
      { id: 'cosmic', name: 'محطة الفضاء العربية', tag: 'خيال ومستقبل', image: 'space_station' },
      { id: 'treasure', name: 'جزيرة الكنز الأسطورية', tag: 'مغامرة واستكشاف', image: 'treasure_island' },
      { id: 'stadium', name: 'استاد الأبطال الرياضي', tag: 'منافسة وحماس', image: 'sports_stadium' },
      { id: 'magic', name: 'المملكة السحرية العائمة', tag: 'سحر وفانتازيا', image: 'magic_kingdom' }
    ];
    return list.find(w => w.id === id) || list[0];
  }

  function getOrCreateModal() {
    let m = document.getElementById('scorearWorldContentPickerModal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'scorearWorldContentPickerModal';
      m.style.cssText = 'position:fixed;inset:0;background:rgba(5,6,15,0.92);backdrop-filter:blur(10px);z-index:99999;display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;direction:rtl;font-family:Cairo,Tajawal,sans-serif;';
      document.body.appendChild(m);
    }
    return m;
  }

  async function openContentPicker(options = {}) {
    activeWorldId = options.worldId || localStorage.getItem('scorear_last_world') || 'royal';
    localStorage.setItem('scorear_last_world', activeWorldId);
    selectedQuizId = options.quizId || null;
    selectedQuizQuestions = [];
    selectedBankQuestionIds = new Set();
    activeTab = options.defaultTab || 'quizzes';
    searchQuery = '';
    subjectFilter = 'all';

    const m = getOrCreateModal();
    m.style.display = 'flex';

    if (global.ScoreARQuizBankData) {
      await global.ScoreARQuizBankData.refreshAllData();
    }

    if (selectedQuizId && global.ScoreARQuizBankData) {
      const qz = global.ScoreARQuizBankData.getQuizzes().find(q => q.id === selectedQuizId);
      if (qz && qz.questions) {
        selectedQuizQuestions = JSON.parse(JSON.stringify(qz.questions));
      }
    }

    renderContentPicker();
  }

  function closeContentPicker() {
    const m = document.getElementById('scorearWorldContentPickerModal');
    if (m) m.style.display = 'none';
  }

  function getCombinedQuestions() {
    const combined = [...selectedQuizQuestions];
    if (global.ScoreARQuizBankData) {
      const allBank = global.ScoreARQuizBankData.getQuestions();
      for (const id of selectedBankQuestionIds) {
        const q = allBank.find(x => x.id === id);
        if (q && !combined.some(c => c.id === q.id || c.q === q.q)) {
          combined.push({
            id: q.id,
            q: q.q || q.text,
            opts: q.opts || q.options,
            ans: q.ans !== undefined ? q.ans : (q.correct ? q.correct[0] : 0),
            explain: q.explain || q.explanation || '',
            timeLimit: q.timeLimit || 20,
            points: q.points || 1000
          });
        }
      }
    }
    return combined;
  }

  function renderContentPicker() {
    const m = getOrCreateModal();
    const curWorld = getWorldData(activeWorldId);
    const quizzes = global.ScoreARQuizBankData ? global.ScoreARQuizBankData.getQuizzes() : [];
    const bankQuestions = global.ScoreARQuizBankData ? global.ScoreARQuizBankData.getQuestions() : [];

    // Filter bank questions
    const filteredBank = bankQuestions.filter(q => {
      const txt = (q.q || q.text || '').toLowerCase();
      const matchSearch = !searchQuery || txt.includes(searchQuery.toLowerCase());
      const matchSubj = (subjectFilter === 'all') || (q.subject === subjectFilter);
      return matchSearch && matchSubj;
    });

    const combinedQuestions = getCombinedQuestions();
    const totalCount = combinedQuestions.length;
    const totalSeconds = combinedQuestions.reduce((acc, cur) => acc + (Number(cur.timeLimit) || 20), 0);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const timeFormatted = mins > 0 ? `${mins} د و ${secs} ث` : `${secs} ثانية`;

    m.innerHTML = `
      <div style="background:#101124;border:2px solid #7550ef;box-shadow:0 0 50px rgba(117,80,239,0.4);border-radius:24px;width:100%;max-width:920px;height:90vh;max-height:860px;display:flex;flex-direction:column;overflow:hidden;">
        <!-- Header: Active World Showcase & Switcher -->
        <header style="background:#171836;padding:14px 22px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(142,100,239,0.3);">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:48px;height:48px;border-radius:12px;overflow:hidden;border:1.5px solid #7550ef;position:relative;">
              <img src="assets/${curWorld.image}.webp" alt="${curWorld.name}" style="width:100%;height:100%;object-fit:cover;">
            </div>
            <div>
              <div style="display:flex;align-items:center;gap:8px;">
                <h3 style="color:#ffffff;font-size:16px;font-weight:900;margin:0;">${curWorld.name}</h3>
                <span style="background:rgba(142,100,239,0.25);border:1px solid #7550ef;color:#c4b5fd;font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px;">${curWorld.tag}</span>
              </div>
              <p style="color:#a1a4be;font-size:11px;margin:2px 0 0 0;">اختر المحتوى التعليمي لبدء القاعة مباشرة في هذا العالم المختار.</p>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <button onclick="ScoreARWorldContentPicker.promptChangeWorld()" style="background:rgba(255,255,255,0.08);color:#ddd;border:1px solid rgba(255,255,255,0.15);padding:6px 12px;border-radius:10px;font-size:11px;font-weight:800;cursor:pointer;">
              🪐 تغيير العالم
            </button>
            <button onclick="ScoreARWorldContentPicker.closeContentPicker()" style="background:none;border:none;color:#9ca3af;font-size:22px;cursor:pointer;padding:2px 6px;">✕</button>
          </div>
        </header>

        <!-- Search & Tab Bar -->
        <div style="background:#13142e;padding:12px 22px;border-bottom:1px solid rgba(142,100,239,0.2);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;">
          <!-- Tabs -->
          <div style="display:flex;background:#1a1c3d;padding:4px;border-radius:12px;border:1px solid rgba(142,100,239,0.3);">
            <button onclick="ScoreARWorldContentPicker.switchTab('quizzes')" style="background:${activeTab==='quizzes'?'#7550ef':'transparent'};color:${activeTab==='quizzes'?'#fff':'#a1a4be'};border:none;padding:6px 14px;border-radius:8px;font-weight:900;font-size:12px;cursor:pointer;">
              📚 مسابقاتي الجاهزة (${quizzes.length})
            </button>
            <button onclick="ScoreARWorldContentPicker.switchTab('bank')" style="background:${activeTab==='bank'?'#7550ef':'transparent'};color:${activeTab==='bank'?'#fff':'#a1a4be'};border:none;padding:6px 14px;border-radius:8px;font-weight:900;font-size:12px;cursor:pointer;">
              💡 بنك الأسئلة (${bankQuestions.length})
            </button>
          </div>

          <!-- Search & Filter Input -->
          <div style="display:flex;align-items:center;gap:8px;">
            <input type="text" value="${escapeHtml(searchQuery)}" oninput="ScoreARWorldContentPicker.setSearch(this.value)" placeholder="🔍 بحث في المحتوى..." style="background:#1a1c3d;border:1px solid rgba(142,100,239,0.3);color:#fff;padding:6px 12px;border-radius:10px;font-size:11px;width:180px;">
            ${activeTab === 'bank' ? `
              <button onclick="ScoreARWorldContentPicker.toggleSelectAllBank()" style="background:rgba(142,100,239,0.2);color:#c4b5fd;border:1px solid rgba(142,100,239,0.4);border-radius:8px;padding:6px 10px;font-size:11px;font-weight:800;cursor:pointer;">
                ${selectedBankQuestionIds.size === filteredBank.length && filteredBank.length > 0 ? 'إلغاء تحديد الكل' : 'تحديد كل المعروض'}
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Main Content Area -->
        <div style="flex:1;overflow-y:auto;padding:16px 22px;">
          ${activeTab === 'quizzes' ? `
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:12px;">
              ${!quizzes.length ? `
                <div style="text-align:center;grid-column:1/-1;padding:40px;color:#9ca3af;">
                  <p>لا توجد مسابقات جاهزة. يمكنك اختيار أسئلة من بنك الأسئلة بالتبويب المجاور.</p>
                </div>
              ` : quizzes.map(qz => {
                const count = qz.questions ? qz.questions.length : 0;
                const isSelected = (selectedQuizId === qz.id);
                return `
                  <div onclick="ScoreARWorldContentPicker.selectQuiz('${qz.id}')" style="cursor:pointer;border:2px solid ${isSelected ? '#10b981' : 'rgba(142,100,239,0.25)'};background:${isSelected ? 'rgba(16,185,129,0.18)' : '#14152e'};border-radius:14px;padding:14px;display:flex;flex-direction:column;justify-content:space-between;gap:8px;transition:all 0.2s;">
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                      <span style="background:rgba(142,100,239,0.2);color:#c4b5fd;font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px;">${escapeHtml(qz.subject || 'مسابقة')}</span>
                      <span style="color:${isSelected ? '#34d399' : '#666'};font-size:18px;font-weight:900;">${isSelected ? '✓' : '○'}</span>
                    </div>
                    <h4 style="color:#ffffff;font-size:14px;font-weight:900;margin:0;">${escapeHtml(qz.title || 'مسابقة')}</h4>
                    <div style="color:#52d9ed;font-size:11px;font-weight:800;">${count} أسئلة</div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${!filteredBank.length ? `
                <div style="text-align:center;padding:40px;color:#9ca3af;">
                  <p>لا توجد أسئلة تطابق البحث في بنك الأسئلة.</p>
                </div>
              ` : filteredBank.map(q => {
                const isChecked = selectedBankQuestionIds.has(q.id);
                return `
                  <div onclick="ScoreARWorldContentPicker.toggleBankQuestion('${q.id}')" style="cursor:pointer;background:${isChecked ? 'rgba(117,80,239,0.2)' : '#14152e'};border:1px solid ${isChecked ? '#7550ef' : 'rgba(255,255,255,0.06)'};border-radius:12px;padding:10px 14px;display:flex;align-items:center;gap:12px;">
                    <input type="checkbox" ${isChecked ? 'checked' : ''} style="width:18px;height:18px;accent-color:#7550ef;cursor:pointer;">
                    <div style="flex:1;">
                      <div style="color:#fff;font-size:13px;font-weight:800;margin-bottom:2px;">${escapeHtml(q.q || q.text)}</div>
                      <div style="display:flex;gap:8px;align-items:center;">
                        <span style="color:#34d399;font-size:11px;">الإجابة: «${escapeHtml(q.opts ? q.opts[q.ans] : '')}»</span>
                        ${q.subject ? `<span style="color:#a89bff;font-size:10px;">• ${escapeHtml(q.subject)}</span>` : ''}
                      </div>
                    </div>
                    <span style="color:#52d9ed;font-size:11px;font-weight:800;">${q.timeLimit || 20} ث</span>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Sticky Live Counter & Launch Footer -->
        <footer style="background:#171836;padding:14px 22px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(142,100,239,0.3);">
          <div style="display:flex;align-items:center;gap:16px;">
            <div style="background:#11122a;border:1px solid rgba(142,100,239,0.4);border-radius:10px;padding:6px 14px;display:flex;align-items:center;gap:8px;">
              <span style="font-size:16px;">📝</span>
              <span style="color:#fff;font-size:13px;font-weight:900;"><b style="color:#52d9ed;">${totalCount}</b> أسئلة مختارة</span>
            </div>
            <div style="background:#11122a;border:1px solid rgba(142,100,239,0.4);border-radius:10px;padding:6px 14px;display:flex;align-items:center;gap:8px;">
              <span style="font-size:16px;">⏱️</span>
              <span style="color:#fff;font-size:13px;font-weight:900;">الزمن المتوقع: <b style="color:#fcd34d;">${timeFormatted}</b></span>
            </div>
          </div>

          <div style="display:flex;gap:10px;">
            <button onclick="ScoreARWorldContentPicker.closeContentPicker()" style="background:rgba(255,255,255,0.08);color:#d1d5db;border:1px solid rgba(255,255,255,0.15);padding:10px 18px;border-radius:12px;font-size:12px;cursor:pointer;">إلغاء</button>
            <button onclick="ScoreARWorldContentPicker.launchRoomWithChosenContent()" ${totalCount === 0 ? 'disabled' : ''} style="background:${totalCount === 0 ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #10b981, #059669)'};color:#fff;border:none;padding:10px 26px;border-radius:12px;font-size:14px;font-weight:900;cursor:${totalCount === 0 ? 'not-allowed' : 'pointer'};box-shadow:${totalCount === 0 ? 'none' : '0 0 20px rgba(16,185,129,0.4)'};">
              افتح القاعة بالعالم المختار 🚀
            </button>
          </div>
        </footer>
      </div>
    `;
  }

  function switchTab(t) {
    activeTab = t;
    renderContentPicker();
  }

  function setSearch(q) {
    searchQuery = q;
    renderContentPicker();
  }

  function selectQuiz(quizId) {
    if (selectedQuizId === quizId) {
      selectedQuizId = null;
      selectedQuizQuestions = [];
    } else {
      selectedQuizId = quizId;
      if (global.ScoreARQuizBankData) {
        const qz = global.ScoreARQuizBankData.getQuizzes().find(q => q.id === quizId);
        selectedQuizQuestions = qz && qz.questions ? JSON.parse(JSON.stringify(qz.questions)) : [];
      }
    }
    renderContentPicker();
  }

  function toggleBankQuestion(qId) {
    if (selectedBankQuestionIds.has(qId)) {
      selectedBankQuestionIds.delete(qId);
    } else {
      selectedBankQuestionIds.add(qId);
    }
    renderContentPicker();
  }

  function toggleSelectAllBank() {
    const bankQuestions = global.ScoreARQuizBankData ? global.ScoreARQuizBankData.getQuestions() : [];
    const filtered = bankQuestions.filter(q => {
      const txt = (q.q || q.text || '').toLowerCase();
      return !searchQuery || txt.includes(searchQuery.toLowerCase());
    });
    if (selectedBankQuestionIds.size === filtered.length && filtered.length > 0) {
      selectedBankQuestionIds.clear();
    } else {
      filtered.forEach(q => selectedBankQuestionIds.add(q.id));
    }
    renderContentPicker();
  }

  function promptChangeWorld() {
    if (global.ScoreARWorldFlow && typeof global.ScoreARWorldFlow.openWorldPicker === 'function') {
      global.ScoreARWorldFlow.openWorldPicker({
        defaultWorldId: activeWorldId,
        onConfirm: (newWorldId) => {
          activeWorldId = newWorldId;
          localStorage.setItem('scorear_last_world', newWorldId);
          renderContentPicker();
        }
      });
    }
  }

  function launchRoomWithChosenContent() {
    const combined = getCombinedQuestions();
    if (!combined.length) {
      alert('يرجى اختيار مسابقة أو تحديد أسئلة من بنك الأسئلة أولاً.');
      return;
    }

    closeContentPicker();
    global.contestQuestions = combined;

    if (global.toast) {
      global.toast(`تم تجهيز (${combined.length}) سؤالاً. جارٍ فتح القاعة في ${getWorldData(activeWorldId).name}... 🚀`);
    }

    if (global.ScoreARQuizHost && typeof global.ScoreARQuizHost.startHostLobby === 'function') {
      global.ScoreARQuizHost.startHostLobby(activeWorldId, null, true, false);
    } else if (typeof global.renderLiveLobby === 'function') {
      global.renderLiveLobby(activeWorldId, null, true, false);
    }
  }

  global.ScoreARWorldContentPicker = {
    openContentPicker,
    closeContentPicker,
    switchTab,
    setSearch,
    selectQuiz,
    toggleBankQuestion,
    toggleSelectAllBank,
    promptChangeWorld,
    launchRoomWithChosenContent
  };

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
