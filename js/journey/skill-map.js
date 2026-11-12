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
    const ui = global.ScoreARUI || { icon: () => '', iconBox: () => '' };

    let html = `
      <div class="scorear-skill-map-container" style="direction:rtl;text-align:right;font-family:Cairo,Tajawal,sans-serif;width:100%;max-width:100%;box-sizing:border-box;overflow-x:hidden;">
        <div style="margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:6px 2px 14px;border-bottom:1px solid #ffffff12;">
          <div>
            <h2 style="font-size:21px;font-weight:900;color:#f6f3ff;margin:0 0 4px 0;">خريطة المهارات والمحطات التعليمية</h2>
            <p style="font-size:13px;color:#a1a4be;margin:0;">اجتز كل محطة بنسبة 70% أو أكثر لفتح المحطة التالية. يمكنك إعادة أي محطة لرفع مستواك في أي وقت.</p>
          </div>
          <div style="display:flex;gap:8px;font-size:11px;font-weight:800;flex-wrap:wrap;">
            <span style="background:#1d5c52;color:#befff2;border:1px solid #44b8a555;padding:4px 10px;border-radius:999px;display:inline-flex;align-items:center;gap:5px;">${ui.icon('check', { size: 12 })} متقنة</span>
            <span class="launch-pill" style="padding:4px 10px;font-size:11px;">${ui.icon('play', { size: 12 })} مفتوحة للتدريب</span>
            <span style="background:#14152a;color:#8e8ca8;border:1px solid #ffffff14;padding:4px 10px;border-radius:999px;display:inline-flex;align-items:center;gap:5px;">${ui.icon('lock', { size: 12 })} مغلقة</span>
          </div>
        </div>

        <div class="scorear-tracks-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 290px), 1fr));gap:18px;width:100%;box-sizing:border-box;">
    `;

    tracks.forEach((track, tIdx) => {
      const stations = track.stations || [];
      const tIcon = tIdx === 0 ? 'book' : tIdx === 1 ? 'spark' : 'edit';
      html += `
        <div class="scorear-experience-panel spotlight" style="display:flex;flex-direction:column;gap:14px;box-sizing:border-box;width:100%;">
          <div style="display:flex;align-items:center;gap:12px;border-bottom:1px solid #ffffff12;padding-bottom:14px;">
            ${ui.iconBox(tIcon, { size: 'md', tone: 'violet', tilted: true })}
            <div>
              <span class="scorear-panel-index">${track.category || track.skill || 'مسار تعليمي'}</span>
              <h3 style="font-size:16px;font-weight:900;color:#f6f3ff;margin:2px 0 0 0;">${track.trackTitle || track.title}</h3>
            </div>
          </div>
          <p style="font-size:13px;color:#a1a4be;margin:0;line-height:1.7;">${track.desc || ''}</p>

          <div class="scorear-stations-path" style="display:flex;flex-direction:column;gap:12px;margin-top:4px;width:100%;box-sizing:border-box;">
      `;

      stations.forEach((st, sIdx) => {
        const status = Engine.determineStationStatus(st, sIdx, stations, stationsProg);
        const stProg = stationsProg[st.id] || {};
        const isMastered = status === Engine.STATUS_MASTERED;
        const isOpen = status === Engine.STATUS_OPEN;

        let statusBadge = `<span style="color:#8e8ca8;font-size:11px;display:inline-flex;align-items:center;gap:4px;">${ui.icon('lock', { size: 12 })} مغلقة</span>`;
        let borderColor = '#ffffff10';
        let bg = '#0c0d1d99';
        let buttonText = `${ui.icon('lock', { size: 13 })} مغلقة (أكمل السابقة)`;
        let btnCls = 'btn launch-outline';
        let btnExtra = 'opacity:0.5;cursor:not-allowed;';
        let actionClick = '';

        if (isMastered) {
          statusBadge = `<span style="color:#7fe7ce;font-size:11px;font-weight:800;display:inline-flex;align-items:center;gap:4px;">${ui.icon('check', { size: 12 })} متقنة (${stProg.bestScore ? Math.round(stProg.bestScore * 100) : 100}%)</span>`;
          borderColor = '#44b8a566';
          bg = 'linear-gradient(145deg, #163c3988, #0c0d1dcc)';
          buttonText = `${ui.icon('refresh', { size: 13 })} إعادة المحطة`;
          btnCls = 'btn launch-outline';
          btnExtra = 'border-color:#44b8a566;color:#befff2;';
          actionClick = `onclick="window.ScoreARSkillMap.startStation('${track.trackId || track.id}', '${st.id}')"`;
        } else if (isOpen) {
          statusBadge = `<span style="color:#c9baff;font-size:11px;font-weight:800;display:inline-flex;align-items:center;gap:4px;">${ui.icon('spark', { size: 12 })} متاحة الآن</span>`;
          borderColor = '#9665ff66';
          bg = 'radial-gradient(circle at top right, #7550ef29, #111329)';
          buttonText = stProg.attempts > 0 ? `${ui.icon('zap', { size: 13 })} متابعة التدريب` : `${ui.icon('play', { size: 13 })} ابدأ المحطة`;
          btnCls = 'btn launch-primary';
          btnExtra = '';
          actionClick = `onclick="window.ScoreARSkillMap.startStation('${track.trackId || track.id}', '${st.id}')"`;
        }

        const qCount = (st.questions && st.questions.length) || 0;
        const hasUnreviewed = st.questions && st.questions.some(q => q.reviewed === false);

        html += `
          <div class="scorear-station-node" style="border:1px solid ${borderColor};background:${bg};border-radius:16px;padding:15px;display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <h4 style="font-size:14.5px;font-weight:900;color:#f6f3ff;margin:0;">${st.title}</h4>
              ${statusBadge}
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11px;">
              <span style="background:#18172e;color:#c9baff;padding:2px 9px;border-radius:999px;">${qCount} أسئلة</span>
              ${hasUnreviewed ? `<span style="background:#422337;color:#ffd3e5;border:1px solid #c3849866;padding:2px 9px;border-radius:999px;font-weight:700;display:inline-flex;align-items:center;gap:4px;">${ui.icon('alert', { size: 11 })} قيد المراجعة اللغوية</span>` : ''}
              ${stProg.attempts ? `<span style="color:#a1a4be;">المحاولات: ${stProg.attempts}</span>` : ''}
            </div>
            <button ${actionClick} class="${btnCls}" style="width:100%;padding:9px;font-size:12.5px;margin-top:2px;${btnExtra}">
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
      if (mainEl && global.ScoreARJourney) {
        mainEl.innerHTML = global.ScoreARJourney.renderJourneyPage();
        global.ScoreARJourney.bindJourneyEvents?.();
        mount();
        global.ScoreARJourneyExtras?.mount?.();
      }
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

    const ui = global.ScoreARUI || { icon: () => '', iconBox: () => '' };
    stage.innerHTML = `
      <header style="padding:16px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ffffff14;gap:12px;">
        <div>
          <span style="font-size:12px;color:#a89bff;font-weight:700;">${s.track.trackTitle || s.track.title} / ${s.station.title}</span>
          <h2 style="font-size:17px;font-weight:900;color:#f6f3ff;margin:2px 0 0 0;">السؤال ${curNum} من ${total}</h2>
        </div>
        <button onclick="window.ScoreARSkillMap.closeStationQuiz()" class="btn launch-outline" style="padding:8px 14px;font-size:13px;">${ui.icon('close', { size: 15 })} خروج</button>
      </header>

      <main style="flex:1;max-width:760px;width:100%;margin:0 auto;padding:24px 20px;display:flex;flex-direction:column;gap:18px;">
        <div class="scorear-spotlight-card" style="padding:24px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <span class="launch-pill" style="padding:4px 12px;font-size:11px;">${q.ruleTag || q.skill || 'تدريب مهارة'}</span>
            ${isUnreviewed ? `<span style="display:inline-flex;align-items:center;gap:6px;background:#4a2538;color:#ffd3e5;font-size:11px;font-weight:800;padding:4px 10px;border-radius:999px;border:1px solid #c3849866;">${ui.icon('alert', { size: 13 })} قيد المراجعة اللغوية</span>` : ''}
          </div>
          <p style="font-size:19px;font-weight:800;color:#f6f3ff;line-height:1.6;margin:0;">${q.text || q.q}</p>
        </div>

        <div style="display:grid;grid-template-columns:1fr;gap:12px;">
          ${(q.options || q.opts || []).map((opt, idx) => `
            <button onclick="window.ScoreARSkillMap.handleAnswer(${idx})" style="background:#18172e;border:1px solid #ffffff1a;border-radius:14px;padding:14px 18px;color:#eceeff;font-size:15px;font-weight:700;text-align:right;cursor:pointer;font-family:inherit;transition:all 0.15s;display:flex;align-items:center;gap:10px;">
              <span style="display:inline-grid;place-items:center;width:26px;height:26px;border-radius:8px;background:#2b2543;color:#dcd2ff;font-size:12px;flex-shrink:0;">${idx + 1}</span>
              <span>${opt}</span>
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

    const ui = global.ScoreARUI || { icon: () => '' };
    const fb = document.getElementById('stationFeedback');
    if (fb) {
      fb.style.display = 'block';
      fb.innerHTML = `
        <div style="background:${isCorrect ? '#163c39' : '#422337'};border:1px solid ${isCorrect ? '#44b8a5' : '#c38498'};border-radius:16px;padding:16px;color:#f6f3ff;">
          <div style="font-size:15px;font-weight:900;color:${isCorrect ? '#7fe7ce' : '#ffd3e5'};margin-bottom:6px;display:flex;align-items:center;gap:8px;">
            ${ui.icon(isCorrect ? 'checkCircle' : 'alert', { size: 17 })}
            <span>${isCorrect ? 'إجابة صحيحة! أحسنت' : 'إجابة غير موفقة — لا تقلق، هذا وقت التعلّم'}</span>
          </div>
          <p style="font-size:14px;color:#e2d4fb;line-height:1.7;margin:0 0 12px 0;">${q.explanation || q.why || ''}</p>
          <button onclick="window.ScoreARSkillMap.nextQuestion()" class="btn launch-primary" style="padding:10px 22px;font-size:14px;">
            ${s.currentIndex + 1 < s.station.questions.length ? 'السؤال التالي' : 'عرض النتيجة النهائية'} ${ui.icon('arrow', { size: 15 })}
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

    if (global.ScoreARJourneyExtras && typeof global.ScoreARJourneyExtras.recordAttempt === 'function') {
      global.ScoreARJourneyExtras.recordAttempt({
        title: `${s.track.trackTitle || s.track.title} — ${s.station.title}`,
        mode: 'station',
        correct: scoreRes.correct,
        total: scoreRes.total,
        percentage: scoreRes.percentage,
        xpEarned: 0
      });
    }

    const ui = global.ScoreARUI || { icon: () => '', iconBox: () => '' };
    stage.innerHTML = `
      <div style="flex:1;max-width:620px;width:100%;margin:auto;padding:32px 20px;text-align:center;">
        <div class="scorear-spotlight-card" style="padding:32px 24px;border-color:${scoreRes.isPassed ? '#44b8a5' : '#9665ff55'};">
          <div style="margin-bottom:14px;">${ui.iconBox(scoreRes.isPassed ? 'trophy' : 'target', { size: 'lg', tone: scoreRes.isPassed ? 'cyan' : 'violet' })}</div>
          <h2 style="font-size:24px;font-weight:900;color:#f6f3ff;margin:0 0 6px 0;">
            ${scoreRes.isPassed ? 'تهانينا! اجتزت المحطة بنجاح' : 'محاولة ممتازة وتعلّم مستمر!'}
          </h2>
          <p style="font-size:14px;color:#a89bff;margin:0 0 20px 0;">${s.station.title}</p>

          <div style="background:#0c0d1d;border:1px solid #ffffff12;border-radius:18px;padding:18px;display:flex;justify-content:space-around;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
            <div>
              <div style="font-size:12px;color:#a1a4be;">النتيجة</div>
              <div style="font-size:26px;font-weight:900;color:#c9baff;">${scoreRes.percentage}%</div>
            </div>
            <div>
              <div style="font-size:12px;color:#a1a4be;">الإجابات الصحيحة</div>
              <div style="font-size:26px;font-weight:900;color:#7fe7ce;">${scoreRes.correct} / ${scoreRes.total}</div>
            </div>
            <div>
              <div style="font-size:12px;color:#a1a4be;">الحالة</div>
              <div style="font-size:18px;font-weight:900;color:#f6f3ff;line-height:28px;">${scoreRes.isPassed ? 'متقنة' : 'تحتاج تدريباً'}</div>
            </div>
          </div>

          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
            <button onclick="window.ScoreARSkillMap.startStation('${s.track.trackId || s.track.id}', '${s.station.id}')" class="btn launch-outline" style="padding:12px 22px;font-size:14px;">${ui.icon('refresh', { size: 15 })} إعادة المحطة</button>
            <button onclick="window.ScoreARSkillMap.closeStationQuiz()" class="btn launch-primary" style="padding:12px 26px;font-size:14px;">العودة للخريطة ${ui.icon('arrow', { size: 15 })}</button>
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
