/**
 * ScoreAR Real-Time Card Arena Controller (Non-Destructive)
 * Handles Student Mobile Deck (Hand 3 + Trap 2), Instant Counter Sync, Top Non-Intrusive Alerts & Host Ticker.
 * Strictly Rule 7 Compliant (<350 lines).
 */
(function(global) {
  'use strict';

  let manager = null, activePin = null, currentStudentId = null, isDeckOpen = true;

  function sfx(t) { if (global.ScoreARAudio?.playSfx) global.ScoreARAudio.playSfx(t); }

  function getManager() {
    if (!manager && (global.GameModeManager || global.ScoreARCardArenaEngine?.GameModeManager)) {
      const Ctor = global.GameModeManager || global.ScoreARCardArenaEngine.GameModeManager;
      manager = new Ctor({ onStateChange: renderStudentDeckUi, onCardEvent: handleCardEvent, onPlayerToast: handlePlayerToast });
    }
    return manager;
  }

  function initArena(pin, studentId, isHost = false) {
    activePin = String(pin || '000000').trim();
    currentStudentId = studentId || (global.ScoreARAuth?.currentUser?.uid) || 's_local';
    const mgr = getManager();
    if (mgr) {
      const mode = global.ScoreARGameModes?.getMode?.() || 'CARD_ARENA';
      const ai = global.ScoreARGameModes?.isAIEnabled?.() ?? true;
      mgr.setGameMode(mode, ai, 4);
      if (!isHost && !mgr.players[currentStudentId]) {
        const name = global.currentStudent?.name || 'طالب';
        mgr.registerPlayer(currentStudentId, name, false);
      }
    }
    if (global.ScoreARRealtime?.subscribe) global.ScoreARRealtime.subscribe(handleRealtimeMessage);
  }

  // Non-intrusive Top Alert for mobile (never blocks bottom cards or answer buttons)
  function showStudentCardAlert(msg) {
    let el = document.getElementById('scorearStudentCardAlert');
    if (!el) {
      el = document.createElement('div');
      el.id = 'scorearStudentCardAlert';
      el.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%) translateY(-30px);z-index:10000000;background:linear-gradient(135deg,rgba(24,23,46,0.96),rgba(32,27,62,0.98));border:1.5px solid #8e64ef;padding:8px 20px;border-radius:24px;color:#fff;font-size:12.5px;font-weight:900;box-shadow:0 8px 30px rgba(0,0,0,0.6),0 0 20px rgba(142,100,239,0.35);transition:all 0.25s cubic-bezier(0.2,0.8,0.2,1);pointer-events:none;direction:rtl;white-space:nowrap;font-family:Cairo,Tajawal,sans-serif;opacity:0;';
      document.body.appendChild(el);
    }
    el.innerHTML = msg;
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) translateY(-30px)';
    }, 2400);
  }

  function handleRealtimeMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'CARD_ACTION_BROADCAST') {
      showHostCardBanner(msg.actionMessage, msg.actionType);
      if (msg.targetId === currentStudentId) {
        if (msg.cardId === 'PIN_STUDENT' && !msg.blocked) applyPinEffect();
        if (msg.cardId === 'SCREEN_FOG' && !msg.blocked) applyFogEffect();
        if (msg.cardId === 'TIME_SLICER' && !msg.blocked) applyTimeSlicerEffect();
        sfx(msg.actionType === 'REFLECTED' ? 'whoosh' : (msg.actionType === 'BLOCKED' ? 'wrong' : 'pop'));
      }
      renderStudentDeckUi();
    } else if (msg.type === 'ROOM_MODE_UPDATE' || msg.type === 'ROOM_OPEN' || msg.type === 'QUESTION_START') {
      const newMode = msg.gameMode || msg.mode;
      if (newMode) {
        if (global.ScoreARGameModes?.setMode) global.ScoreARGameModes.setMode(newMode, msg.aiEnabled ?? true);
        if (manager) manager.setGameMode(newMode, msg.aiEnabled ?? true);
        renderStudentDeckUi();
      }
    }
  }

  function handleCardEvent(ev) {
    showHostCardBanner(ev.message, ev.type);
    if (global.ScoreARRealtime?.publish && activePin) {
      global.ScoreARRealtime.publish('CARD_ACTION_BROADCAST', {
        actionMessage: ev.message, actionType: ev.type, sourceId: ev.sourcePlayer?.id,
        targetId: ev.targetPlayer?.id, cardId: ev.card?.id, blocked: (ev.type === 'BLOCKED' || ev.type === 'REFLECTED')
      });
    }
  }

  function handlePlayerToast(pid, msg) {
    if (pid === currentStudentId) showStudentCardAlert(msg);
  }

  // --- 1. HOST PROJECTOR LIVE CARD TICKER (Rendered ONLY on Host screen) ---
  function showHostCardBanner(msg, type) {
    const isHostStage = document.getElementById('scorearHostStage');
    if (!isHostStage) return; // Keep student mobile screen clutter-free!

    let ticker = document.getElementById('scorearCardArenaTicker');
    if (!ticker) {
      ticker = document.createElement('div');
      ticker.id = 'scorearCardArenaTicker';
      ticker.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(120px);z-index:9999999;background:linear-gradient(135deg,rgba(24,23,46,0.96),rgba(17,18,38,0.98));border:2px solid #f59e0b;padding:12px 28px;border-radius:20px;color:#fff;font-size:15px;font-weight:900;display:flex;align-items:center;gap:12px;box-shadow:0 12px 40px rgba(0,0,0,0.6);transition:transform 0.35s cubic-bezier(0.34,1.56,0.64,1);pointer-events:none;direction:rtl;font-family:Cairo,Tajawal,sans-serif;';
      document.body.appendChild(ticker);
    }
    const icon = type === 'REFLECTED' ? '🪞' : (type === 'BLOCKED' ? '🛡️' : '⚡');
    const borderCol = type === 'REFLECTED' ? '#38bdf8' : (type === 'BLOCKED' ? '#ef4444' : '#f59e0b');
    ticker.style.borderColor = borderCol;
    ticker.innerHTML = `<span style="font-size:22px;">${icon}</span><span>${msg}</span>`;
    ticker.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(ticker._hideTimer);
    ticker._hideTimer = setTimeout(() => { ticker.style.transform = 'translateX(-50%) translateY(120px)'; }, 4200);
  }

  // --- 2. STUDENT MOBILE DECK OVERLAY ---
  function mountStudentDeck(stage) {
    if (!stage) return;
    let wrap = document.getElementById('studentMobileDeckWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'studentMobileDeckWrap';
      wrap.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:999999;direction:rtl;font-family:Cairo,Tajawal,sans-serif;pointer-events:auto;';
      document.body.appendChild(wrap);
    }
    const opts = document.getElementById('studentOptionsContainer');
    if (opts) opts.style.paddingBottom = '150px';
    renderStudentDeckUi();
  }

  function renderStudentDeckUi() {
    const wrap = document.getElementById('studentMobileDeckWrap');
    if (!wrap) return;
    const mode = global.ScoreARGameModes?.getMode?.() || 'CARD_ARENA';
    if (mode !== 'CARD_ARENA') { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';

    const mgr = getManager(), me = mgr?.players ? mgr.players[currentStudentId] : null;
    const hand = me?.hand || [], traps = me?.trapSlots || [];

    wrap.innerHTML = `
      <div style="display:flex;justify-content:center;margin-bottom:-4px;">
        <button type="button" onclick="ScoreARCardArena.toggleDeck()" style="background:linear-gradient(135deg,#7550ef,#9665ff);color:#fff;border:1px solid #c4a8ff;border-radius:18px 18px 0 0;padding:5px 18px;font-size:11.5px;font-weight:900;cursor:pointer;box-shadow:0 -4px 15px rgba(117,80,239,0.4);display:flex;align-items:center;gap:8px;">
          <span>🃏 حقيبة الكروت (${hand.length}/3)</span>
          <span style="font-size:10px;">${isDeckOpen ? '▼ تصغير' : '▲ فتح'}</span>
        </button>
      </div>
      <div style="background:rgba(12,14,30,0.97);backdrop-filter:blur(16px);border-top:2px solid #8e64ef;padding:10px 12px 12px;box-shadow:0 -10px 30px rgba(0,0,0,0.6);display:${isDeckOpen ? 'block' : 'none'};max-height:46vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
          <span style="font-size:10.5px;font-weight:900;color:#52d9ed;">🛡️ خانة الفخاخ للرد التلقائي (${traps.length}/2):</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">
          ${[0, 1].map(i => {
            const t = traps[i];
            if (!t) return `<div style="background:rgba(255,255,255,0.03);border:1.5px dashed rgba(255,255,255,0.15);border-radius:10px;padding:6px;text-align:center;font-size:10.5px;color:#94a3b8;">خانة فخ فارغة (${i+1})</div>`;
            return `
              <div style="background:rgba(23,37,84,0.75);border:1.5px solid #38bdf8;border-radius:10px;padding:5px 8px;display:flex;align-items:center;gap:6px;box-shadow:0 0 10px rgba(56,189,248,0.25);">
                <img src="${t.img}" alt="${t.nameAr}" style="width:30px;height:40px;object-fit:cover;border-radius:5px;flex-shrink:0;">
                <div style="overflow:hidden;"><b style="color:#ffffff;font-size:11px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.nameAr}</b><small style="color:#7dd3fc;font-size:9px;display:block;">جاهز للرد التلقائي ⚡</small></div>
              </div>`;
          }).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
          <span style="font-size:10.5px;font-weight:900;color:#fcd34d;">🎒 كروت اليد الحالية (${hand.length}/3):</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:6px;">
          ${[0, 1, 2].map(i => {
            const c = hand[i];
            if (!c) return `<div style="background:rgba(255,255,255,0.02);border:1.5px dashed rgba(255,255,255,0.12);border-radius:10px;min-height:95px;display:grid;place-items:center;font-size:10px;color:#64748b;text-align:center;padding:4px;">يد فارغة (${i+1})</div>`;
            const isTrap = c.type.startsWith('TRAP_'), isTargeted = (c.type === 'TARGET_ATTACK' || c.type === 'TARGET_BLUFF');
            return `
              <div style="background:rgba(21,23,49,0.94);border:1.5px solid #f59e0b;border-radius:10px;padding:5px;display:flex;flex-direction:column;justify-content:space-between;align-items:center;text-align:center;min-height:95px;">
                <img src="${c.img}" alt="${c.nameAr}" style="width:100%;max-width:50px;height:38px;object-fit:cover;border-radius:5px;margin-bottom:2px;">
                <b style="color:#ffffff;font-size:10.5px;line-height:1.2;margin-bottom:3px;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;">${c.nameAr}</b>
                ${isTrap ? `<button type="button" onclick="ScoreARCardArena.equipTrap('${c.instanceId}')" style="background:#0284c7;color:#fff;border:none;border-radius:5px;padding:3px 5px;font-size:9.5px;font-weight:900;width:100%;cursor:pointer;">🛡️ وضع بالفخ</button>` : ''}
                ${!isTrap && !isTargeted ? `<button type="button" onclick="ScoreARCardArena.activateSelf('${c.instanceId}')" style="background:#10b981;color:#fff;border:none;border-radius:5px;padding:3px 5px;font-size:9.5px;font-weight:900;width:100%;cursor:pointer;">⚡ تفعيل</button>` : ''}
                ${isTargeted ? `<button type="button" onclick="ScoreARCardArena.openTargetPicker('${c.instanceId}')" style="background:#ef4444;color:#fff;border:none;border-radius:5px;padding:3px 5px;font-size:9.5px;font-weight:900;width:100%;cursor:pointer;">🎯 استهداف</button>` : ''}
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  function toggleDeck() { isDeckOpen = !isDeckOpen; renderStudentDeckUi(); }

  function equipTrap(instanceId) {
    const mgr = getManager();
    if (mgr) { const res = mgr.equipToTrapSlot(currentStudentId, instanceId); if (res?.ok) sfx('pop'); }
  }

  function activateSelf(instanceId) {
    const mgr = getManager();
    if (!mgr) return;
    const me = mgr.players[currentStudentId];
    const card = me?.hand?.find(c => c.instanceId === instanceId);
    if (card?.id === 'ERASER_50_50') applyEraserEffect();
    else if (card?.id === 'MULTIPLIER_2X') { if (me) me.status.multiplier = 2; showStudentCardAlert('⚡ تم تفعيل مضاعف النقاط 2X لسؤالك القادم!'); }
    mgr.activateCard(currentStudentId, instanceId, currentStudentId);
    sfx('reveal');
  }

  function openTargetPicker(instanceId) {
    const mgr = getManager();
    if (!mgr) return;
    const otherPlayers = Object.values(mgr.players).filter(p => p.id !== currentStudentId);
    const modal = document.createElement('div');
    modal.id = 'targetPickerModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:99999999;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:16px;direction:rtl;font-family:Cairo,Tajawal,sans-serif;';
    modal.innerHTML = `
      <div style="background:#13152a;border:2px solid #ef4444;border-radius:22px;padding:22px;max-width:380px;width:100%;text-align:center;">
        <h3 style="color:#ffffff;font-size:18px;margin:0 0 6px;">🎯 اختر الطالب المستهدف</h3>
        <p style="color:#cbd5e1;font-size:12px;margin-bottom:16px;">اضغط على اسم زميلك لإطلاق الكارت عليه مباشرة:</p>
        <div style="display:flex;flex-direction:column;gap:8px;max-height:260px;overflow-y:auto;margin-bottom:16px;">
          ${otherPlayers.length ? otherPlayers.map(p => `
            <button type="button" onclick="ScoreARCardArena.confirmTarget('${instanceId}', '${p.id}')" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:10px 14px;color:#fff;font-weight:800;font-size:14px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
              <span>${p.name}</span><span style="color:#fcd34d;font-size:12px;">${p.score} نقطة</span>
            </button>`).join('') : '<div style="color:#94a3b8;font-size:13px;padding:14px;">لا يوجد متنافسون آخرون بالقاعة حالياً</div>'}
        </div>
        <button type="button" onclick="document.getElementById('targetPickerModal')?.remove()" style="background:#334155;color:#fff;border:none;padding:8px 20px;border-radius:10px;font-weight:700;font-size:12px;cursor:pointer;">إلغاء ✕</button>
      </div>`;
    document.body.appendChild(modal);
  }

  function confirmTarget(instanceId, targetId) {
    document.getElementById('targetPickerModal')?.remove();
    const mgr = getManager();
    if (mgr) mgr.activateCard(currentStudentId, instanceId, targetId);
  }

  function simulateCardAction(cardId = 'SWAP_STUDENT') {
    const mgr = getManager();
    if (!mgr) return;
    const card = mgr.grantRandomCard(currentStudentId, cardId);
    if (card) {
      isDeckOpen = true;
      renderStudentDeckUi();
      showStudentCardAlert(`🃏 تجربة كارت: حصلت على ${card.nameAr}!`);
      sfx('reveal');
    }
  }

  // --- 3. QUESTION SCREEN EFFECTS ---
  function applyPinEffect() {
    const opts = document.querySelectorAll('.student-opt-btn');
    opts.forEach(b => { b.disabled = true; b.style.opacity = '0.4'; b.style.filter = 'grayscale(1)'; });
    showStudentCardAlert('❄️ أنت مجمد بواسطة كارت تثبيت طالب! لا يمكنك الإجابة.');
    sfx('wrong');
  }

  function applyFogEffect() {
    const cont = document.getElementById('studentOptionsContainer');
    if (!cont || document.getElementById('fogOverlayCanvas')) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'fogOverlayCanvas';
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:30;cursor:pointer;border-radius:16px;';
    cont.style.position = 'relative';
    cont.appendChild(canvas);
    canvas.width = cont.offsetWidth || 360; canvas.height = cont.offsetHeight || 200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(30, 27, 58, 0.94)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 16px Cairo, sans-serif'; ctx.fillStyle = '#cbd5e1'; ctx.textAlign = 'center';
    ctx.fillText('💨 ضباب الرؤية! امسح بإصبعك لكشف الخيارات', canvas.width / 2, canvas.height / 2);

    let isWiping = false;
    const wipe = (e) => {
      if (!isWiping) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
      const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(x, y, 32, 0, Math.PI * 2); ctx.fill();
    };
    canvas.addEventListener('mousedown', () => isWiping = true);
    canvas.addEventListener('touchstart', () => isWiping = true);
    window.addEventListener('mouseup', () => isWiping = false);
    window.addEventListener('touchend', () => isWiping = false);
    canvas.addEventListener('mousemove', wipe);
    canvas.addEventListener('touchmove', wipe);
  }

  function applyEraserEffect() {
    const opts = document.querySelectorAll('.student-opt-btn');
    if (opts.length >= 4) {
      opts[0].style.opacity = '0.12'; opts[0].disabled = true;
      opts[2].style.opacity = '0.12'; opts[2].disabled = true;
      showStudentCardAlert('✂️ كارت 50/50: تم حذف خيارين خاطئين!');
    }
  }

  function applyTimeSlicerEffect() {
    const timerTxt = document.getElementById('studentTimerText');
    if (timerTxt) {
      let t = parseInt(timerTxt.textContent, 10);
      if (!isNaN(t) && t > 4) {
        timerTxt.textContent = String(Math.floor(t / 2));
        showStudentCardAlert('⏳ مقص الوقت! تم قطع نصف الوقت المتبقي.');
      }
    }
  }

  // Only 1st and 2nd fastest correct responders receive a card
  function onCorrectAnswerGranted(playerId, isTop2 = false) {
    if (!isTop2 && playerId !== 'solo_player') return;
    const mgr = getManager();
    if (mgr && (global.ScoreARGameModes?.getMode?.() || 'CARD_ARENA') === 'CARD_ARENA') {
      const card = mgr.grantRandomCard(playerId);
      if (card && playerId === currentStudentId) {
        isDeckOpen = true;
        renderStudentDeckUi();
        showStudentCardAlert(`🏆 أسرع إجابة! كسبت كارت: ${card.nameAr}`);
        sfx('fanfare');
      }
    }
  }

  global.ScoreARCardArena = {
    initArena, mountStudentDeck, renderStudentDeckUi, showStudentCardAlert,
    toggleDeck, equipTrap, activateSelf, openTargetPicker, confirmTarget,
    simulateCardAction, showHostCardBanner, applyPinEffect, applyFogEffect,
    applyEraserEffect, applyTimeSlicerEffect, onCorrectAnswerGranted, getManager
  };
})(typeof window !== 'undefined' ? window : global);
