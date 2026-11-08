/**
 * ScoreAR Quiz Host Leaderboard & Podium Module
 * Renders Host Leaderboard FLIP transitions, Staggered Rows, Crowning Podium Ceremony & Full Results Roster.
 * Strictly Rule 7 Compliant (<300 lines).
 */
(function(global) {
  'use strict';

  const previousRanks = new Map();

  function escapeHtml(str) {
    return typeof str !== 'string' ? String(str || '') : str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }
  function sfx(t) { if (global.ScoreARAudio) global.ScoreARAudio.playSfx(t); }
  function music(tr, vol) { if (global.ScoreARAudio) global.ScoreARAudio.playMusic(tr, vol); }

  function renderHostLeaderboard(stage, currentRoom, activeQuestions, currentQIndex, onNext, onPodium, onClose) {
    const sorted = [...currentRoom.players].sort((a, b) => b.score - a.score);
    const hasNext = (currentQIndex + 1 < activeQuestions.length);
    const worldId = (currentRoom.world && currentRoom.world.id) ? currentRoom.world.id : (currentRoom.worldId || 'royal');
    const totalCount = Math.min(sorted.length, 5);

    let maxJump = 0, biggestJumperId = null;
    sorted.forEach((p, idx) => {
      const curRank = idx + 1;
      const prevRank = previousRanks.has(p.id) ? previousRanks.get(p.id) : curRank;
      const jump = prevRank - curRank;
      p._rankDelta = jump;
      p._prevRank = prevRank;
      p._currentRank = curRank;
      if (jump >= 2 && jump > maxJump) {
        maxJump = jump;
        biggestJumperId = p.id;
      }
    });

    sorted.forEach(p => previousRanks.set(p.id, p._currentRank));

    sfx('whoosh');
    setTimeout(() => { sfx('reveal'); }, 400 + (totalCount * 260));

    stage.innerHTML = `
      <style>
        @keyframes staggeredRowIn {
          0% { opacity: 0; transform: translateY(18px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .scorear-leaderboard-row { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      </style>
      <div style="position:absolute;inset:0;overflow:hidden;z-index:0;background:url('assets/worlds/${worldId}/results.jpg') center/cover no-repeat;">
        <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 25%, rgba(15,23,42,0.65) 0%, rgba(10,11,24,0.94) 100%);"></div>
      </div>
      <header style="position:relative;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:14px 28px;background:rgba(12,13,30,0.75);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,0.12);">
        <button onclick="ScoreARQuizHost.closeHostSession()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 12px;border-radius:8px;font-weight:800;font-size:11px;cursor:pointer;">✕ إنهاء القاعة</button>
        <h2 style="font-size:22px;font-weight:900;color:#ffffff;margin:0;display:flex;align-items:center;gap:10px;">🏆 لوحة الصدارة بعد السؤال (${currentQIndex + 1})</h2>
        <button onclick="${hasNext ? `ScoreARQuizHost.launchQuestion(${currentQIndex + 1})` : 'ScoreARQuizHost.renderHostPodium()'}" style="background:linear-gradient(135deg, #6366f1, #8b5cf6);border:none;color:#fff;padding:10px 22px;border-radius:12px;font-weight:900;font-size:13px;cursor:pointer;box-shadow:0 4px 16px rgba(99,102,241,0.4);">
          ${hasNext ? 'السؤال التالي ➔' : 'تتويج الأبطال 👑'}
        </button>
      </header>
      <main style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;">
        <div class="leaderboard-container" style="width:100%;max-width:780px;display:flex;flex-direction:column;gap:12px;">
          ${sorted.slice(0, 5).map((p, idx) => {
            const isTop1 = (idx === 0), isTop2 = (idx === 1), isTop3 = (idx === 2);
            const roleIcon = p.isDemo ? '🤖' : p.isRegistered ? '✓' : '✨';
            const roleTitle = p.isDemo ? 'طالب تجريبي' : p.isRegistered ? 'طالب مسجل' : 'ضيف';

            let arrowHtml = '<span style="color:#94a3b8;font-size:13px;font-weight:900;">—</span>';
            if (p._rankDelta > 0) {
              arrowHtml = `<span style="color:#34d399;font-size:13px;font-weight:900;" title="صعد ${p._rankDelta} مراكز">▲ ${p._rankDelta}</span>`;
            } else if (p._rankDelta < 0) {
              arrowHtml = `<span style="color:#f87171;font-size:13px;font-weight:900;" title="تراجع ${Math.abs(p._rankDelta)} مراكز">▼ ${Math.abs(p._rankDelta)}</span>`;
            }

            const badges = [];
            if (p.id === biggestJumperId) badges.push('<span style="background:rgba(168,85,247,0.25);border:1px solid #a855f7;color:#d8b4fe;font-size:10px;font-weight:900;padding:2px 8px;border-radius:10px;">🚀 قفزة كبرى</span>');
            if (p.streak >= 3) badges.push(`<span style="background:rgba(245,158,11,0.25);border:1px solid #f59e0b;color:#fcd34d;font-size:10px;font-weight:900;padding:2px 8px;border-radius:10px;">🔥 ${p.streak} متتالية</span>`);
            if (p.lastPointsGained && p.lastPointsGained >= 850) badges.push('<span style="background:rgba(52,211,153,0.25);border:1px solid #10b981;color:#34d399;font-size:10px;font-weight:900;padding:2px 8px;border-radius:10px;">⚡ سرعة فائقة</span>');

            const delaySec = ((totalCount - 1 - idx) * 0.26).toFixed(2);
            const borderStyle = isTop1 ? '2px solid #f59e0b;box-shadow:0 0 24px rgba(245,158,11,0.45);background:linear-gradient(135deg, rgba(245,158,11,0.25), rgba(15,23,42,0.85))'
              : isTop2 ? '2px solid #94a3b8;box-shadow:0 0 16px rgba(148,163,184,0.3);background:rgba(15,23,42,0.85)'
              : isTop3 ? '2px solid #d97706;box-shadow:0 0 14px rgba(217,119,6,0.25);background:rgba(15,23,42,0.85)'
              : '1px solid rgba(255,255,255,0.12);background:rgba(15,23,42,0.75)';

            const ptsGained = p.lastPointsGained || 0;
            const startScore = Math.max(0, (p.score || 0) - ptsGained);

            return `
              <div class="scorear-leaderboard-row" style="animation:staggeredRowIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) ${delaySec}s both;border-radius:18px;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;border:${borderStyle};backdrop-filter:blur(16px);transition:transform 0.25s ease;">
                <div style="display:flex;align-items:center;gap:12px;">
                  <div style="display:flex;flex-direction:column;align-items:center;min-width:38px;">
                    <div style="width:34px;height:34px;border-radius:10px;background:${isTop1?'#f59e0b':isTop2?'#94a3b8':isTop3?'#d97706':'rgba(255,255,255,0.1)'};color:${isTop1?'#000':'#fff'};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;">
                      ${isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : (idx + 1)}
                    </div>
                    <div style="margin-top:2px;">${arrowHtml}</div>
                  </div>
                  <div style="width:40px;height:52px;display:flex;align-items:flex-end;justify-content:center;">
                    <img src="assets/characters/animated/${p.avatarId || 'char_01'}-idle.webp" onerror="this.src='assets/characters/animated/char_01-idle.webp'" alt="${escapeHtml(p.name)}" style="height:48px;object-fit:contain;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5));">
                  </div>
                  <div>
                    <div style="display:flex;align-items:center;gap:6px;">
                      <span title="${roleTitle}" style="color:${roleIcon==='✓'?'#34d399':roleIcon==='🤖'?'#38bdf8':'#fcd34d'};font-size:13px;">${roleIcon}</span>
                      <span class="player-name-text" style="font-size:16px;font-weight:900;color:#ffffff;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:inline-block;" title="${escapeHtml(p.name)}" onclick="this.classList.toggle('expanded');">${escapeHtml(p.name)}</span>
                      ${isTop1 ? '<span style="font-size:16px;">👑</span>' : ''}
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
                      ${badges.join('')}
                    </div>
                  </div>
                </div>
                <div style="text-align:left;display:flex;flex-direction:column;align-items:flex-end;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    ${ptsGained > 0 ? `<span style="background:rgba(16,185,129,0.25);border:1px solid #10b981;color:#34d399;font-size:11px;font-weight:900;padding:2px 6px;border-radius:6px;">+${ptsGained}</span>` : ''}
                    <span class="scorear-count-up" data-start="${startScore}" data-target="${p.score || 0}" style="font-size:22px;font-weight:900;color:${isTop1?'#fbbf24':'#34d399'};font-family:monospace;">${p.score || 0}</span>
                  </div>
                  <span style="font-size:10px;color:#94a3b8;font-weight:700;">نقطة</span>
                </div>
              </div>`;
          }).join('')}
        </div>
      </main>`;

    setTimeout(() => {
      const countEls = stage.querySelectorAll('.scorear-count-up');
      countEls.forEach(el => {
        const start = Number(el.getAttribute('data-start')) || 0;
        const target = Number(el.getAttribute('data-target')) || 0;
        if (start === target) return;
        const duration = 750, startTime = performance.now();
        function tick(now) {
          const progress = Math.min(1, (now - startTime) / duration);
          el.textContent = Math.round(start + (target - start) * progress);
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, 450);
  }

  function renderHostPodium(stage, currentRoom, onClose) {
    const sorted = [...currentRoom.players].sort((a, b) => b.score - a.score);
    const p1 = sorted[0] || { name: 'البطل الأول', score: 0, avatarId: 'char_01' };
    const p2 = sorted[1] || { name: 'الوصيف الثاني', score: 0, avatarId: 'char_02' };
    const p3 = sorted[2] || { name: 'الثالث', score: 0, avatarId: 'char_03' };
    const worldId = (currentRoom.world && currentRoom.world.id) ? currentRoom.world.id : (currentRoom.worldId || 'royal');

    sfx('reveal');
    music('magic', 0.28);

    try {
      if (global.confetti) {
        global.confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
        setTimeout(() => global.confetti({ particleCount: 180, spread: 110, origin: { y: 0.5 } }), 800);
      }
    } catch(e){}

    if (global.ScoreARHostEvents?.publishContestCompleted) {
      global.ScoreARHostEvents.publishContestCompleted([p1, p2, p3].filter(Boolean), currentRoom.players.length, sorted);
    }

    const podiums = [
      { p: p2, medal: '🥈', h: '160px', bg: 'linear-gradient(180deg, #94a3b8, #475569)', tc: '#e2e8f0', w: '160px', fs: '26px', sz: '80px' },
      { p: p1, medal: '🥇', h: '220px', bg: 'linear-gradient(180deg, #f59e0b, #b45309)', tc: '#fef3c7', w: '190px', fs: '36px', sz: '110px', main: true },
      { p: p3, medal: '🥉', h: '130px', bg: 'linear-gradient(180deg, #d97706, #78350f)', tc: '#fed7aa', w: '160px', fs: '24px', sz: '70px' }
    ];

    stage.innerHTML = `
      <div style="position:absolute;inset:0;overflow:hidden;z-index:0;background:url('assets/worlds/${worldId}/podium.jpg') center/cover no-repeat;">
        <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 15%, rgba(245,158,11,0.25) 0%, rgba(12,13,30,0.94) 100%);"></div>
      </div>
      <header style="position:relative;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:14px 28px;background:rgba(12,13,30,0.75);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,0.12);">
        <button onclick="ScoreARQuizHost.closeHostSession()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:8px 14px;border-radius:10px;font-weight:800;font-size:12px;cursor:pointer;">✕ إغلاق التتويج والعودة</button>
        <div style="font-size:22px;font-weight:900;color:#fef3c7;display:flex;align-items:center;gap:10px;">👑 منصة تتويج أبطال ScoreAR 👑</div>
        <div style="font-size:13px;color:#94a3b8;font-weight:700;">إجمالي الأبطال: <b style="color:#fff;">${currentRoom.players.length}</b></div>
      </header>
      <main style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:20px;overflow-y:auto;">
        <div style="display:flex;align-items:flex-end;justify-content:center;gap:16px;margin-bottom:20px;margin-top:10px;">
          ${podiums.map(item => `
            <div style="display:flex;flex-direction:column;align-items:center;animation:enterFullBody 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);">
              <div style="height:${item.sz};display:flex;align-items:flex-end;justify-content:center;margin-bottom:6px;">
                <img src="assets/characters/animated/${item.p.avatarId || 'char_01'}-idle.webp" onerror="this.src='assets/characters/animated/char_01-idle.webp'" alt="${escapeHtml(item.p.name)}" style="height:${item.sz};object-fit:contain;filter:drop-shadow(0 8px 16px rgba(0,0,0,0.7));">
              </div>
              <div style="background:rgba(15,23,42,0.92);border:2px solid ${item.main ? '#f59e0b' : 'rgba(255,255,255,0.2)'};border-radius:12px;padding:4px 12px;color:#fff;font-size:12px;font-weight:900;margin-bottom:6px;box-shadow:0 6px 18px rgba(0,0,0,0.5);white-space:nowrap;max-width:150px;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(item.p.name)}</div>
              <div style="width:${item.w};height:${item.h};background:${item.bg};border-top-left-radius:16px;border-top-right-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:10px;box-shadow:0 12px 30px rgba(0,0,0,0.6);border:2px solid rgba(255,255,255,0.3);border-bottom:none;">
                <div style="font-size:${item.fs};">${item.medal}</div>
                <div style="font-size:18px;font-weight:900;color:${item.tc};font-family:monospace;margin-top:4px;">${item.p.score || 0}</div>
                <div style="font-size:10px;font-weight:800;color:${item.tc};opacity:0.85;">نقطة</div>
              </div>
            </div>`).join('')}
        </div>
        <div style="width:100%;max-width:780px;background:rgba(15,23,42,0.85);backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,0.15);border-radius:18px;padding:14px 18px;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
          <div style="font-size:14px;font-weight:900;color:#c9baff;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;">
            <span>📋 كشف النتائج والترتيب النهائي لكافة المتسابقين (${sorted.length})</span>
            <span style="font-size:11px;color:#94a3b8;">سكور آر الرسمية</span>
          </div>
          <div style="max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding-right:4px;">
            ${sorted.map((p, idx) => {
              const roleIcon = p.isDemo ? '🤖' : p.isRegistered ? '✓' : '✨';
              const rankMedal = idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`;
              return `
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:12px;font-weight:900;color:${idx<3?'#fcd34d':'#94a3b8'};min-width:32px;">${rankMedal}</span>
                    <img src="assets/characters/animated/${p.avatarId || 'char_01'}-idle.webp" onerror="this.src='assets/characters/animated/char_01-idle.webp'" alt="${escapeHtml(p.name)}" style="width:26px;height:32px;object-fit:contain;">
                    <span style="color:${roleIcon==='✓'?'#34d399':roleIcon==='🤖'?'#38bdf8':'#fcd34d'};font-size:12px;">${roleIcon}</span>
                    <span style="font-size:13px;font-weight:800;color:#fff;">${escapeHtml(p.name)}</span>
                  </div>
                  <div style="font-size:15px;font-weight:900;color:#34d399;font-family:monospace;">${p.score || 0} <span style="font-size:10px;color:#94a3b8;">نقطة</span></div>
                </div>`;
            }).join('')}
          </div>
        </div>
      </main>`;
  }

  const ScoreARHostLeaderboard = {
    renderHostLeaderboard,
    renderHostPodium
  };

  global.ScoreARHostLeaderboard = ScoreARHostLeaderboard;
  try { if (typeof globalThis !== 'undefined') globalThis.ScoreARHostLeaderboard = ScoreARHostLeaderboard; } catch(e){}
  if (typeof module !== 'undefined' && module.exports) module.exports = ScoreARHostLeaderboard;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
