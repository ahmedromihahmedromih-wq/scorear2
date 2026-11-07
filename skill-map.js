/**
 * ScoreAR Skill Map UI (skill-map.js)
 * Item 2: Interactive Station Map on Desktop and Mobile
 * Rules:
 *   1. Responsive RTL Arabic layout (Desktop grid & Mobile vertical path).
 *   2. Stations: Locked (🔒) / Open (⏳) / Mastered (⭐).
 *   3. Questions with 'reviewed: false' display with «قيد المراجعة» badge.
 *   4. Replay allowed for all open or mastered stations.
 *   5. Pure state mutations delegated to ScoreARSkillEngine.
 *   6. Line count strictly Rule 7 compliant (< 500 lines).
 */
(function(global) {
  'use strict';

  const GUEST_STORAGE_KEY = 'scorear_student_guest_v1';
  let cachedTracks = null;
  let activeStationSession = null;

  function getEngine() {
    return global.ScoreARSkillEngine || {
      PASS_THRESHOLD: 0.70,
      STATUS_LOCKED: 'locked',
      STATUS_OPEN: 'open',
      STATUS_MASTERED: 'mastered',
      calculateStationScore: () => ({ isPassed: false, percentage: 0 }),
      determineStationStatus: () => 'open',
      recordStationAttempt: (p) => p,
      migrateProgressToV3: (s) => s
    };
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(GUEST_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const v3 = getEngine().migrateProgressToV3(parsed);
        return v3.data;
      }
    } catch (e) {
      console.warn('[ScoreARSkillMap] Storage read error:', e);
    }
    return getEngine().migrateProgressToV3(null).data;
  }

  function saveProgress(data) {
    try {
      const raw = localStorage.getItem(GUEST_STORAGE_KEY);
      let payload = raw ? JSON.parse(raw) : { schemaVersion: 'scorear_v3', data: {} };
      payload.schemaVersion = 'scorear_v3';
      payload.data = Object.assign({}, payload.data, data);
      payload.data.lastUpdated = Date.now();
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('[ScoreARSkillMap] Storage write error:', e);
    }
  }

  async function fetchTracksData() {
    if (cachedTracks) return cachedTracks;
    try {
      const res = await fetch('content/journey/tracks.json');
      if (res.ok) {
        cachedTracks = await res.json();
        return cachedTracks;
      }
    } catch (e) {
      console.warn('[ScoreARSkillMap] Fetch failed, falling back to embedded tracks:', e);
    }
    // Fallback if running from file:// or network fail
    cachedTracks = (global.ScoreARJourney && global.ScoreARJourney.PRACTICE_TRACKS) || [];
    return cachedTracks;
  }

  function renderMapHTML(tracks, progress) {
    const Engine = getEngine();
    const stationsProg = progress.stationsProgress || {};

    let html = `
      <div class="scorear-skill-map-container" style="direction:rtl;text-align:right;font-family:Cairo,Tajawal,sans-serif;width:100%;max-width:100%;box-sizing:border-box;overflow-x:hidden;">
        <div style="margin-bottom:20px;background:rgba(21,23,49,0.7);border:1px solid rgba(142,100,239,0.25);border-radius:20px;padding:16px 18px;box-sizing:border-box;">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
              <h2 style="font-size:20px;font-weight:900;color:#fff;margin:0 0 6px 0;">خريطة المهارات والمحطات التعليمية 🗺️</h2>
              <p style="font-size:13px;color:#a89bff;margin:0;">اجتز كل محطة بنسبة 70% أو أكثر لفتح المحطة التالية. يمكنك إعادة أي محطة لرفع مستواك في أي وقت.</p>
            </div>
            <div style="display:flex;gap:8px;font-size:12px;font-weight:700;flex-wrap:wrap;">
              <span style="background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.3);padding:4px 10px;border-radius:12px;">⭐ متقنة</span>
              <span style="background:rgba(245,158,11,0.15);color:#fcd34d;border:1px solid rgba(245,158,11,0.3);padding:4px 10px;border-radius:12px;">⏳ مفتوحة للتدريب</span>
              <span style="background:rgba(255,255,255,0.05);color:#8e8ca8;border:1px solid rgba(255,255,255,0.1);padding:4px 10px;border-radius:12px;">🔒 مغلقة</span>
            </div>
          </div>
        </div>

        <div class="scorear-tracks-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 280px), 1fr));gap:20px;width:100%;box-sizing:border-box;">
    `;

    tracks.forEach((track, tIdx) => {
      const stations = track.stations || [];
      html += `
        <div class="scorear-track-card" style="background:rgba(21,23,49,0.85);border:1.5px solid rgba(142,100,239,0.2);border-radius:20px;padding:18px;display:flex;flex-direction:column;gap:16px;box-sizing:border-box;width:100%;">
          <div style="display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:14px;">
            <span style="font-size:30px;">${track.trackIcon || track.icon || '📘'}</span>
            <div>
              <span style="font-size:11px;color:#a89bff;font-weight:800;letter-spacing:0.5px;">${track.category || track.skill || 'مسار تعليمي'}</span>
              <h3 style="font-size:16px;font-weight:900;color:#fff;margin:2px 0 0 0;">${track.trackTitle || track.title}</h3>
            </div>
          </div>
          <p style="font-size:13px;color:#c9baff;margin:0;line-height:1.6;">${track.desc || ''}</p>

          <div class="scorear-stations-path" style="display:flex;flex-direction:column;gap:14px;margin-top:6px;width:100%;box-sizing:border-box;">
      `;

      stations.forEach((st, sIdx) => {
        const status = Engine.determineStationStatus(st, sIdx, stations, stationsProg);
        const stProg = stationsProg[st.id] || {};
        const isMastered = status === Engine.STATUS_MASTERED;
        const isOpen = status === Engine.STATUS_OPEN;
        const isLocked = status === Engine.STATUS_LOCKED;

        let statusBadge = '<span style="color:#8e8ca8;font-size:11px;">🔒 مغلقة</span>';
        let borderColor = 'rgba(255,255,255,0.08)';
        let bg = 'rgba(255,255,255,0.02)';
        let buttonText = '🔒 مغلقة (أكمل السابقة)';
        let buttonStyle = 'background:rgba(255,255,255,0.05);color:#666;cursor:not-allowed;';
        let actionClick = '';

        if (isMastered) {
          statusBadge = `<span style="color:#34d399;font-size:11px;font-weight:800;">⭐ متقنة (${stProg.bestScore ? Math.round(stProg.bestScore * 100) : 100}%)</span>`;
          borderColor = 'rgba(16,185,129,0.4)';
          bg = 'rgba(16,185,129,0.08)';
          buttonText = 'إعادة المحطة 🔄';
          buttonStyle = 'background:linear-gradient(135deg, #10b981, #059669);color:#fff;cursor:pointer;';
          actionClick = `onclick="window.ScoreARSkillMap.startStation('${track.trackId || track.id}', '${st.id}')"`;
        } else if (isOpen) {
          statusBadge = '<span style="color:#fcd34d;font-size:11px;font-weight:800;">⏳ مفتوحة للتدريب</span>';
          borderColor = 'rgba(142,100,239,0.5)';
          bg = 'radial-gradient(circle at top right, rgba(142,100,239,0.18), rgba(21,23,49,0.5))';
          buttonText = stProg.attempts > 0 ? 'متابعة التدريب ⚡' : 'ابدأ المحطة 🚀';
          buttonStyle = 'background:linear-gradient(135deg, #8e64ef, #6d28d9);color:#fff;cursor:pointer;';
          actionClick = `onclick="window.ScoreARSkillMap.startStation('${track.trackId || track.id}', '${st.id}')"`;
        }

        const qCount = (st.questions && st.questions.length) || 0;
        const hasUnreviewed = st.questions && st.questions.some(q => q.reviewed === false);

        html += `
          <div class="scorear-station-node" style="border:1.5px solid ${borderColor};background:${bg};border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <h4 style="font-size:15px;font-weight:900;color:#fff;margin:0;">${st.title}</h4>
              ${statusBadge}
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11px;">
              <span style="background:rgba(255,255,255,0.06);color:#a89bff;padding:2px 8px;border-radius:8px;">${qCount} أسئلة</span>
              ${hasUnreviewed ? '<span style="background:rgba(239,68,68,0.18);color:#fca5a5;border:1px solid rgba(239,68,68,0.3);padding:2px 8px;border-radius:8px;font-weight:700;">⚠️ قيد المراجعة اللغوية</span>' : ''}
              ${stProg.attempts ? `<span style="color:#8e8ca8;">المحاولات: ${stProg.attempts}</span>` : ''}
            </div>
            <button ${actionClick} style="width:100%;padding:10px;border-radius:12px;border:none;font-size:13px;font-weight:800;font-family:inherit;margin-top:4px;transition:transform 0.15s;${buttonStyle}">
              ${buttonText}
            </button>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    return html;
  }

  function getOrCreateStage() {
    let el = document.getElementById('scorearStationQuizStage');
    if (!el) {
      el = document.createElement('div');
      el.id = 'scorearStationQuizStage';
      el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:radial-gradient(circle at 50% 15%, #181938 0%, #090a16 100%);color:#fff;font-family:Cairo,Tajawal,sans-serif;direction:rtl;display:flex;flex-direction:column;overflow-y:auto;';
      document.body.appendChild(el);
    }
    el.style.display = 'flex';
    return el;
  }

  function closeStationQuiz() {
    activeStationSession = null;
    const el = document.getElementById('scorearStationQuizStage');
    if (el) el.style.display = 'none';
    if (typeof window !== 'undefined' && window.location && window.location.hash === '#journey') {
      const mainEl = document.getElementById('main');
      if (mainEl && global.ScoreARJourney) mainEl.innerHTML = global.ScoreARJourney.renderJourneyPage();
    }
  }

  async function startStation(trackId, stationId) {
    const tracks = await fetchTracksData();
    const track = tracks.find(t => (t.trackId || t.id) === trackId);
    if (!track) return;
    const station = (track.stations || []).find(s => s.id === stationId);
    if (!station || !station.questions || station.questions.length === 0) return;

    activeStationSession = {
      track,
      station,
      currentIndex: 0,
      userAnswers: {},
      hasAnswered: false,
      startTime: Date.now()
    };

    renderStationQuizStep();
  }

  function renderStationQuizStep() {
    const s = activeStationSession;
    if (!s) return;
    const stage = getOrCreateStage();
    const q = s.station.questions[s.currentIndex];

    if (!q) {
      renderStationSummary(stage);
      return;
    }

    const total = s.station.questions.length;
    const curNum = s.currentIndex + 1;
    const isUnreviewed = (q.reviewed === false);

    stage.innerHTML = `
      <header style="padding:16px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.1);">
        <div>
          <span style="font-size:12px;color:#a89bff;font-weight:700;">${s.track.trackTitle || s.track.title} / ${s.station.title}</span>
          <h2 style="font-size:17px;font-weight:900;color:#fff;margin:2px 0 0 0;">السؤال ${curNum} من ${total}</h2>
        </div>
        <button onclick="window.ScoreARSkillMap.closeStationQuiz()" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#fff;border-radius:12px;padding:8px 16px;cursor:pointer;font-family:inherit;font-weight:700;">خروج ✕</button>
      </header>

      <main style="flex:1;max-width:760px;width:100%;margin:0 auto;padding:24px 20px;display:flex;flex-direction:column;gap:18px;">
        <div style="background:rgba(21,23,49,0.7);border:1.5px solid rgba(142,100,239,0.3);border-radius:20px;padding:24px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <span style="background:rgba(142,100,239,0.2);color:#c9baff;font-size:11px;font-weight:800;padding:2px 10px;border-radius:8px;">${q.ruleTag || q.skill || 'تدريب مهارة'}</span>
            ${isUnreviewed ? '<span style="background:rgba(239,68,68,0.2);color:#fca5a5;font-size:11px;font-weight:800;padding:2px 10px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);">⚠️ قيد المراجعة اللغوية</span>' : ''}
          </div>
          <p style="font-size:19px;font-weight:800;color:#fff;line-height:1.6;margin:0;">${q.text || q.q}</p>
        </div>

        <div style="display:grid;grid-template-columns:1fr;gap:12px;">
          ${(q.options || q.opts || []).map((opt, idx) => `
            <button onclick="window.ScoreARSkillMap.handleAnswer(${idx})" style="background:rgba(255,255,255,0.04);border:1.5px solid rgba(255,255,255,0.1);border-radius:14px;padding:14px 18px;color:#fff;font-size:15px;font-weight:700;text-align:right;cursor:pointer;font-family:inherit;transition:all 0.15s;">
              <span style="display:inline-block;width:24px;height:24px;line-height:24px;border-radius:50%;background:rgba(142,100,239,0.25);color:#dcd2ff;text-align:center;font-size:12px;margin-left:10px;">${idx + 1}</span>
              ${opt}
            </button>
          `).join('')}
        </div>

        <div id="stationFeedback" style="display:none;margin-top:6px;"></div>
      </main>
    `;
  }

  function handleAnswer(chosenIdx) {
    const s = activeStationSession;
    if (!s || s.hasAnswered) return;
    s.hasAnswered = true;

    const q = s.station.questions[s.currentIndex];
    const correctIdx = (q.correct !== undefined) ? q.correct : q.answer;
    const isCorrect = (chosenIdx === correctIdx);
    s.userAnswers[q.id] = chosenIdx;

    if (global.ScoreARStreak) global.ScoreARStreak.recordQuestionAnswered(q.id);

    const fb = document.getElementById('stationFeedback');
    if (fb) {
      fb.style.display = 'block';
      fb.innerHTML = `
        <div style="background:${isCorrect ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)'};border:1.5px solid ${isCorrect ? '#10b981' : '#ef4444'};border-radius:16px;padding:16px;color:#fff;">
          <div style="font-size:16px;font-weight:900;color:${isCorrect ? '#34d399' : '#f87171'};margin-bottom:6px;">
            ${isCorrect ? 'إجابة صحيحة! أحسنت 🌟' : 'إجابة غير موفقة — لا تقلق، هذا وقت التعلّم 💡'}
          </div>
          <p style="font-size:14px;color:#e2e8f0;line-height:1.5;margin:0 0 12px 0;">${q.explanation || q.why || ''}</p>
          <button onclick="window.ScoreARSkillMap.nextQuestion()" style="background:#8e64ef;color:#fff;border:none;padding:10px 24px;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;">
            ${s.currentIndex + 1 < s.station.questions.length ? 'السؤال التالي ←' : 'عرض النتيجة النهائية 🏆'}
          </button>
        </div>
      `;
    }
  }

  function nextQuestion() {
    const s = activeStationSession;
    if (!s) return;
    s.currentIndex += 1;
    s.hasAnswered = false;
    renderStationQuizStep();
  }

  function renderStationSummary(stage) {
    const s = activeStationSession;
    const Engine = getEngine();
    const scoreRes = Engine.calculateStationScore(s.station.questions, s.userAnswers);

    const prog = loadProgress();
    const updatedStations = Engine.recordStationAttempt(prog.stationsProgress || {}, s.station.id, scoreRes);
    prog.stationsProgress = updatedStations;
    saveProgress(prog);

    stage.innerHTML = `
      <div style="flex:1;max-width:620px;width:100%;margin:auto;padding:32px 20px;text-align:center;">
        <div style="background:rgba(21,23,49,0.88);border:2px solid ${scoreRes.isPassed ? '#10b981' : '#f59e0b'};border-radius:24px;padding:32px 24px;">
          <span style="font-size:56px;">${scoreRes.isPassed ? '🎉' : '🌱'}</span>
          <h2 style="font-size:24px;font-weight:900;color:#fff;margin:12px 0 6px 0;">
            ${scoreRes.isPassed ? 'تهانينا! اجتزت المحطة بنجاح' : 'محاولة ممتازة وتعلّم مستمر!'}
          </h2>
          <p style="font-size:14px;color:#a89bff;margin:0 0 20px 0;">${s.station.title}</p>

          <div style="background:rgba(255,255,255,0.05);border-radius:18px;padding:20px;display:flex;justify-content:space-around;margin-bottom:24px;">
            <div>
              <div style="font-size:12px;color:#a89bff;">النتيجة</div>
              <div style="font-size:28px;font-weight:900;color:#fcd34d;">${scoreRes.percentage}%</div>
            </div>
            <div>
              <div style="font-size:12px;color:#a89bff;">الإجابات الصحيحة</div>
              <div style="font-size:28px;font-weight:900;color:#34d399;">${scoreRes.correct} / ${scoreRes.total}</div>
            </div>
            <div>
              <div style="font-size:12px;color:#a89bff;">الحالة</div>
              <div style="font-size:20px;font-weight:900;color:#fff;line-height:28px;">${scoreRes.isPassed ? 'متقنة ⭐' : 'تحتاج تدريباً ⏳'}</div>
            </div>
          </div>

          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
            <button onclick="window.ScoreARSkillMap.startStation('${s.track.trackId || s.track.id}', '${s.station.id}')" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);color:#fff;border-radius:12px;padding:12px 24px;font-weight:800;cursor:pointer;font-family:inherit;">إعادة المحطة 🔄</button>
            <button onclick="window.ScoreARSkillMap.closeStationQuiz()" style="background:linear-gradient(135deg, #8e64ef, #6d28d9);color:#fff;border:none;border-radius:12px;padding:12px 28px;font-weight:800;cursor:pointer;font-family:inherit;">العودة للخريطة ←</button>
          </div>
        </div>
      </div>
    `;
  }

  async function mount() {
    const tracksContainer = document.getElementById('practiceTracksSection');
    if (!tracksContainer) return;
    let mapDiv = document.getElementById('scorearSkillMapSection');
    if (!mapDiv) {
      mapDiv = document.createElement('div');
      mapDiv.id = 'scorearSkillMapSection';
      tracksContainer.parentNode.insertBefore(mapDiv, tracksContainer);
    }
    const tracks = await fetchTracksData();
    const progress = loadProgress();
    mapDiv.innerHTML = renderMapHTML(tracks, progress);
  }

  const MapAPI = {
    loadProgress,
    saveProgress,
    fetchTracksData,
    renderMapHTML,
    mount,
    startStation,
    handleAnswer,
    nextQuestion,
    closeStationQuiz
  };

  global.ScoreARSkillMap = MapAPI;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapAPI;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
