/**
 * ScoreAR Quiz Host Leaderboard Race Module (quiz-host-leaderboard.js)
 * Implements Themed 6-World Race Track Leaderboard (Top 5 only) with Procedural Motion,
 * Speed Lines, Counting Points, World Goal Decor, and Gap-to-Next Badges.
 * Strictly Rule 7 Compliant (<450 lines).
 */
(function(global) {
  'use strict';

  const previousRanks = new Map();

  const WORLD_RACE_THEMES = {
    royal: {
      name: 'القصر الملكي الأندلسي',
      trackTitle: 'طريق السجادة الحمراء نحو العرش',
      targetIcon: '👑',
      targetLabel: 'العرش الملكي',
      bgGradient: 'linear-gradient(90deg, rgba(120, 20, 30, 0.75) 0%, rgba(185, 28, 28, 0.8) 75%, rgba(245, 158, 11, 0.85) 100%)',
      laneBorder: 'rgba(245, 158, 11, 0.45)',
      speedColor: '#fbbf24',
      accentColor: '#f59e0b'
    },
    cosmic: {
      name: 'محطة الفضاء العربية',
      trackTitle: 'مسارات الصواريخ المدارية',
      targetIcon: '🪐',
      targetLabel: 'المحطة المدارية',
      bgGradient: 'linear-gradient(90deg, rgba(15, 23, 42, 0.8) 0%, rgba(14, 116, 144, 0.75) 75%, rgba(139, 92, 246, 0.85) 100%)',
      laneBorder: 'rgba(6, 182, 212, 0.45)',
      speedColor: '#38bdf8',
      accentColor: '#06b6d4'
    },
    treasure: {
      name: 'جزيرة الكنز الأسطورية',
      trackTitle: 'تسلق الجرف الصخري نحو الكنز',
      targetIcon: '💎',
      targetLabel: 'صندوق الكنز',
      bgGradient: 'linear-gradient(90deg, rgba(67, 30, 10, 0.8) 0%, rgba(180, 83, 9, 0.78) 75%, rgba(251, 191, 36, 0.85) 100%)',
      laneBorder: 'rgba(251, 191, 36, 0.45)',
      speedColor: '#fde047',
      accentColor: '#f59e0b'
    },
    stadium: {
      name: 'استاد الأبطال الرياضي',
      trackTitle: 'مضمار الجري الرياضي بحارات السرعة',
      targetIcon: '🏆',
      targetLabel: 'خط النهاية والكأس',
      bgGradient: 'linear-gradient(90deg, rgba(20, 30, 45, 0.8) 0%, rgba(22, 101, 52, 0.78) 75%, rgba(56, 189, 248, 0.85) 100%)',
      laneBorder: 'rgba(74, 222, 128, 0.45)',
      speedColor: '#4ade80',
      accentColor: '#22c55e'
    },
    oasis: {
      name: 'واحة النخيل والرمال',
      trackTitle: 'مجرى النهر الفيروزي نحو الواحة',
      targetIcon: '🌴',
      targetLabel: 'الواحة والينبوع',
      bgGradient: 'linear-gradient(90deg, rgba(15, 35, 30, 0.8) 0%, rgba(13, 148, 136, 0.75) 75%, rgba(16, 185, 129, 0.85) 100%)',
      laneBorder: 'rgba(52, 211, 153, 0.45)',
      speedColor: '#6ee7b7',
      accentColor: '#10b981'
    },
    magic: {
      name: 'المملكة السحرية العائمة',
      trackTitle: 'طيران السحر والبسط الطائرة في الشفق',
      targetIcon: '🏰',
      targetLabel: 'قلعة السحر المعلقة',
      bgGradient: 'linear-gradient(90deg, rgba(30, 15, 45, 0.8) 0%, rgba(109, 40, 217, 0.75) 75%, rgba(236, 72, 153, 0.85) 100%)',
      laneBorder: 'rgba(192, 132, 252, 0.45)',
      speedColor: '#f472b6',
      accentColor: '#c084fc'
    }
  };

  function escapeHtml(str) {
    return typeof str !== 'string' ? String(str || '') : str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }
  function sfx(t) { if (global.ScoreARAudio) global.ScoreARAudio.playSfx(t); }

  function renderHostLeaderboard(stage, currentRoom, activeQuestions, currentQIndex, onNext, onPodium, onClose) {
    const sorted = [...(currentRoom.players || [])].sort((a, b) => (b.score || 0) - (a.score || 0));
    const hasNext = (currentQIndex + 1 < activeQuestions.length);
    const worldId = (currentRoom.world && currentRoom.world.id) ? currentRoom.world.id : (currentRoom.worldId || 'royal');
    const theme = WORLD_RACE_THEMES[worldId] || WORLD_RACE_THEMES.royal;
    const top5 = sorted.slice(0, 5);

    // Compute rank shifts & biggest jumper
    let maxJump = 0, biggestJumperId = null;
    sorted.forEach((p, idx) => {
      const curRank = idx + 1;
      const prev = previousRanks.has(p.id) ? previousRanks.get(p.id) : curRank;
      const jump = prev - curRank;
      p._rankDelta = jump;
      p._prevRank = prev;
      p._currentRank = curRank;
      if (jump >= 2 && jump > maxJump) {
        maxJump = jump;
        biggestJumperId = p.id;
      }
    });
    sorted.forEach(p => previousRanks.set(p.id, p._currentRank));

    sfx('whoosh');
    setTimeout(() => { sfx('reveal'); }, 450);

    const isMuted = (global.ScoreARAudio && typeof global.ScoreARAudio.isMuted === 'function')
      ? global.ScoreARAudio.isMuted() : false;

    stage.innerHTML = `
      <style>
        @keyframes raceLaneSlideIn {
          0% { opacity: 0; transform: translateX(-40px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes charProceduralBounce {
          0%, 100% { transform: translateY(0) scale(1, 1); }
          35% { transform: translateY(-9px) scale(0.96, 1.05) rotate(1deg); }
          50% { transform: translateY(-12px) scale(1, 1.02); }
          75% { transform: translateY(0) scale(1.05, 0.95) rotate(-1deg); }
        }
        @keyframes shadowScale {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(0.75); opacity: 0.25; }
        }
        @keyframes speedLinesMotion {
          0% { transform: translateX(0); opacity: 0.3; }
          50% { transform: translateX(-15px); opacity: 0.85; }
          100% { transform: translateX(0); opacity: 0.3; }
        }
        @media (prefers-reduced-motion: reduce) {
          .race-lane-card, .char-procedural-rig, .speed-lines-svg { animation: none !important; transform: none !important; }
        }
      </style>

      <div style="position:absolute;inset:0;overflow:hidden;z-index:0;background:url('assets/worlds/${worldId}/results.jpg') center/cover no-repeat;">
        <img src="assets/worlds/${worldId}/results.jpg" alt="" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='assets/worlds/${worldId}/lobby.jpg';}else{this.style.display='none';}" style="width:100%;height:100%;object-fit:cover;display:block;filter:brightness(0.84) saturate(1.08);">
        <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 25%, rgba(15,23,42,0.22) 0%, rgba(10,11,24,0.62) 100%);"></div>
      </div>

      <header style="position:relative;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:12px 28px;background:rgba(12,13,30,0.8);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,0.12);">
        <div style="display:flex;align-items:center;gap:12px;">
          <button onclick="ScoreARQuizHost.closeHostSession()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 12px;border-radius:8px;font-weight:800;font-size:11px;cursor:pointer;">✕ إنهاء القاعة</button>
          <button id="hostAudioMuteBtn" class="scorear-audio-btn" onclick="ScoreARAudio?.toggleMute?.()" style="background:rgba(12,13,30,0.72);border:1px solid rgba(82,217,237,0.45);color:#52d9ed;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;">
            ${isMuted ? '🔇 الصوت: صامت' : '🔊 الصوت: يعمل'}
          </button>
        </div>
        
        <div style="text-align:center;">
          <h2 style="font-size:20px;font-weight:900;color:#ffffff;margin:0;display:flex;align-items:center;justify-content:center;gap:8px;">
            <span>🏁</span>
            <span>${theme.trackTitle} (${currentQIndex + 1} من ${activeQuestions.length})</span>
          </h2>
          <small style="color:${theme.speedColor};font-size:11px;font-weight:700;">أول 5 متصدرين في سباق التحدي المباشر</small>
        </div>

        <button onclick="${hasNext ? `ScoreARQuizHost.launchQuestion(${currentQIndex + 1})` : 'ScoreARQuizHost.renderHostPodium()'}" style="background:linear-gradient(135deg, #10b981, #059669);border:none;color:#fff;padding:10px 24px;border-radius:12px;font-weight:900;font-size:14px;cursor:pointer;box-shadow:0 4px 18px rgba(16,185,129,0.5);display:flex;align-items:center;gap:8px;">
          <span>${hasNext ? 'السؤال التالي ➔' : 'تتويج الأبطال 👑'}</span>
        </button>
      </header>

      <main style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px 24px;max-width:980px;margin:0 auto;width:100%;">
        <div style="width:100%;display:flex;flex-direction:column;gap:8px;">
          ${top5.map((p, idx) => {
            const isTop1 = (idx === 0), isTop2 = (idx === 1), isTop3 = (idx === 2);
            const roleIcon = p.isDemo ? '🤖' : p.isRegistered ? '✓' : '✨';
            const roleTitle = p.isDemo ? 'طالب تجريبي' : p.isRegistered ? 'طالب مسجل' : 'ضيف';
            const medal = isTop1 ? '🥇 1' : isTop2 ? '🥈 2' : isTop3 ? '🥉 3' : `#${idx + 1}`;

            let arrowHtml = '<span style="color:#94a3b8;font-size:12px;font-weight:900;">—</span>';
            if (p._rankDelta > 0) {
              arrowHtml = `<span style="color:#34d399;font-size:12px;font-weight:900;">▲ +${p._rankDelta}</span>`;
            } else if (p._rankDelta < 0) {
              arrowHtml = `<span style="color:#f87171;font-size:12px;font-weight:900;">▼ ${p._rankDelta}</span>`;
            }

            // Badges
            const badges = [];
            if (p.isFastest || (currentRoom.lastFastestStudent && currentRoom.lastFastestStudent.id === p.id)) {
              badges.push('<span style="background:rgba(245,158,11,0.25);border:1px solid #f59e0b;color:#fcd34d;font-size:10px;font-weight:900;padding:2px 7px;border-radius:8px;">⚡ الأسرع</span>');
            }
            if (p.streak >= 3) {
              badges.push(`<span style="background:rgba(239,68,68,0.25);border:1px solid #ef4444;color:#fca5a5;font-size:10px;font-weight:900;padding:2px 7px;border-radius:8px;">🔥 ${p.streak} متتالية</span>`);
            }
            if (p.id === biggestJumperId) {
              badges.push('<span style="background:rgba(168,85,247,0.25);border:1px solid #a855f7;color:#d8b4fe;font-size:10px;font-weight:900;padding:2px 7px;border-radius:8px;">🚀 أكبر صعود</span>');
            }

            const ptsGained = p.lastPointsGained || 0;
            const startScore = Math.max(0, (p.score || 0) - ptsGained);
            const delaySec = (idx * 0.08).toFixed(2);

            // Points Gap to the rank directly above
            let gapHtml = '';
            if (idx > 0) {
              const abovePlayer = top5[idx - 1];
              const gap = (abovePlayer.score || 0) - (p.score || 0);
              gapHtml = `<div style="text-align:center;margin:-3px 0;font-size:10px;font-weight:800;color:rgba(255,255,255,0.7);"><span style="background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.15);padding:2px 10px;border-radius:10px;">تفصلك ${gap} نقطة عن المركز #${idx}</span></div>`;
            }

            const cleanCode = p.avatarId ? (p.avatarId.startsWith('char_') ? p.avatarId : 'char_' + String(p.avatarId).padStart(2, '0')) : 'char_01';
            const actionType = (worldId === 'treasure') ? 'climb' : (worldId === 'magic') ? 'fly' : 'run';
            const actionAtlas = `assets/characters/animated/${cleanCode}-${actionType}.webp`;

            return `
              ${gapHtml}
              <div class="race-lane-card" style="animation:raceLaneSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delaySec}s both;position:relative;background:${theme.bgGradient};border:1.5px solid ${isTop1 ? '#fbbf24' : theme.laneBorder};border-radius:18px;padding:8px 18px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 6px 20px rgba(0,0,0,0.45);min-height:68px;overflow:hidden;">
                
                <!-- Speed Lines SVG Overlay -->
                <svg class="speed-lines-svg" width="90" height="40" viewBox="0 0 90 40" fill="none" style="position:absolute;left:130px;opacity:0.4;animation:speedLinesMotion 1.5s infinite ease-in-out;pointer-events:none;">
                  <line x1="0" y1="10" x2="70" y2="10" stroke="${theme.speedColor}" stroke-width="2" stroke-dasharray="8 6"/>
                  <line x1="15" y1="20" x2="85" y2="20" stroke="${theme.speedColor}" stroke-width="2" stroke-dasharray="12 4"/>
                  <line x1="5" y1="30" x2="65" y2="30" stroke="${theme.speedColor}" stroke-width="2" stroke-dasharray="6 8"/>
                </svg>

                <!-- Left side: Rank & Character with Procedural Motion -->
                <div style="display:flex;align-items:center;gap:14px;position:relative;z-index:2;">
                  <div style="display:flex;flex-direction:column;align-items:center;min-width:44px;">
                    <span style="font-size:15px;font-weight:900;color:${isTop1 ? '#fef08a' : '#ffffff'};">${medal}</span>
                    <span style="margin-top:1px;">${arrowHtml}</span>
                  </div>

                  <div style="position:relative;width:56px;height:58px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;">
                    <div class="char-procedural-rig scorear-character character-${actionType}" style="--character-action-atlas:url('${actionAtlas}');--character-atlas:url('assets/characters/animated/${cleanCode}-atlas.webp');width:52px;height:52px;animation:charProceduralBounce 1.4s infinite ease-in-out;transform-origin:bottom center;">
                      <div class="character-frames"></div>
                      <img src="assets/characters/animated/${cleanCode}-idle.webp" onerror="this.src='assets/characters/animated/char_01-idle.webp'" alt="${escapeHtml(p.name)}" style="height:52px;object-fit:contain;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.6));display:block;">
                    </div>
                    <div style="width:36px;height:7px;background:radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 70%);border-radius:50%;margin-top:-3px;animation:shadowScale 1.4s infinite ease-in-out;"></div>
                  </div>

                  <div>
                    <div style="display:flex;align-items:center;gap:6px;">
                      <span title="${roleTitle}" style="color:${roleIcon==='✓'?'#34d399':roleIcon==='🤖'?'#38bdf8':'#fcd34d'};font-size:13px;">${roleIcon}</span>
                      <b style="font-size:16px;font-weight:900;color:#ffffff;max-width:210px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:inline-block;">${escapeHtml(p.name)}</b>
                      ${isTop1 ? '<span>👑</span>' : ''}
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;margin-top:3px;">
                      ${badges.join('')}
                    </div>
                  </div>
                </div>

                <!-- Right side: Score count-up & Gained Points badge -->
                <div style="text-align:left;display:flex;flex-direction:column;align-items:flex-end;position:relative;z-index:2;">
                  <div style="display:flex;align-items:center;gap:8px;">
                    ${ptsGained > 0 ? `<span style="background:rgba(16,185,129,0.3);border:1px solid #10b981;color:#6ee7b7;font-size:11px;font-weight:900;padding:2px 8px;border-radius:8px;">+${ptsGained}</span>` : ''}
                    <span class="scorear-count-up" data-start="${startScore}" data-target="${p.score || 0}" style="font-size:24px;font-weight:900;color:${isTop1 ? '#fef08a' : '#38bdf8'};font-family:monospace;letter-spacing:-0.5px;">${p.score || 0}</span>
                  </div>
                  <span style="font-size:10px;color:rgba(255,255,255,0.7);font-weight:800;">نقطة</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </main>
    `;

    // Count-up execution
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
    }, 400);

    // Broadcast private ranking summary to students
    if (global.ScoreARRealtime) {
      global.ScoreARRealtime.publish('LEADERBOARD_UPDATE', {
        top5: top5.map(p => ({ id: p.id, name: p.name, score: p.score })),
        totalPlayers: sorted.length,
        allRanks: sorted.map((p, i) => ({
          id: p.id,
          name: p.name,
          rank: i + 1,
          score: p.score,
          delta: p._rankDelta || 0,
          streak: p.streak || 0,
          gapToAbove: i > 0 ? ((sorted[i - 1].score || 0) - (p.score || 0)) : 0
        }))
      });
    }
  }

  function renderHostPodium(stage, currentRoom, onClose) {
    if (global.ScoreARPodiumEffects?.renderHostPodium) {
      global.ScoreARPodiumEffects.renderHostPodium(stage, currentRoom, onClose);
    }
  }

  function toggleMuteAudio() {
    if (global.ScoreARAudio?.toggleMute) {
      const muted = global.ScoreARAudio.toggleMute();
      const btn = document.getElementById('hostAudioMuteBtn');
      if (btn) btn.textContent = muted ? '🔇 مكتوم' : '🔊 صوت';
    }
  }

  const ScoreARHostLeaderboard = {
    renderHostLeaderboard,
    renderHostPodium,
    toggleMuteAudio,
    WORLD_RACE_THEMES
  };

  global.ScoreARHostLeaderboard = ScoreARHostLeaderboard;
  try { if (typeof globalThis !== 'undefined') globalThis.ScoreARHostLeaderboard = ScoreARHostLeaderboard; } catch(e){}
  if (typeof module !== 'undefined' && module.exports) module.exports = ScoreARHostLeaderboard;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));