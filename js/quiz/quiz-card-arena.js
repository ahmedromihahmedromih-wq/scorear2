/**
 * ScoreAR Real-Time Card Arena Controller (Authoritative Multi-Device Sync)
 * Handles Student Mobile Deck (Hand 3 + Trap 2), Host Referee Execution, Pending Question Effects & Live Alerts.
 * Strictly Rule 7 Compliant (<350 lines).
 */
(function(global) {
  'use strict';

  let manager = null, activePin = null, currentStudentId = null, isHostRole = false, isDeckOpen = true;
  const pendingEffects = { pin: false, fog: false, timeSlicer: false, eraser: false };

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
    isHostRole = Boolean(isHost);
    const mgr = getManager();
    if (mgr) {
      const mode = global.ScoreARGameModes?.getMode?.() || 'CARD_ARENA';
      mgr.setGameMode(mode, false, 0);
      if (isHostRole) {
        mgr.syncRoster(global.ScoreARQuizHost?.getPlayers?.() || []);
      } else if (!mgr.players[currentStudentId]) {
        mgr.registerPlayer(currentStudentId, global.ScoreARQuizStudent?.state?.name || global.currentStudent?.name || 'طالب', false);
      }
    }
    if (global.ScoreARRealtime?.subscribe) global.ScoreARRealtime.subscribe(handleRealtimeMessage);
  }

  function syncHostRoster(roomPlayers = null) {
    const mgr = getManager();
    if (!mgr) return;
    const list = Array.isArray(roomPlayers) ? roomPlayers : (global.ScoreARQuizHost?.getPlayers?.() || []);
    mgr.syncRoster(list, isHostRole ? null : currentStudentId);
    if (isHostRole && global.ScoreARRealtime?.publish && activePin) {
      global.ScoreARRealtime.publish('ROSTER_SYNC', {
        pin: activePin,
        roster: list.map(p => ({ id: p.id, name: p.name, score: p.score || 0, streak: p.streak || 0, avatarId: p.avatarId || 'char_01', isBot: Boolean(p.isBot || p.isDemo) }))
      });
    }
  }

  function showStudentCardAlert(msg, isAttack = false) {
    let el = document.getElementById('scorearStudentCardAlert');
    if (!el) {
      el = document.createElement('div');
      el.id = 'scorearStudentCardAlert';
      el.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%) translateY(-30px);z-index:10000000;background:linear-gradient(135deg,rgba(24,23,46,0.97),rgba(32,27,62,0.99));border:2px solid #8e64ef;padding:10px 20px;border-radius:20px;color:#fff;font-size:12.5px;font-weight:900;box-shadow:0 10px 32px rgba(0,0,0,0.7),0 0 22px rgba(142,100,239,0.4);transition:all 0.28s cubic-bezier(0.2,0.8,0.2,1);pointer-events:none;direction:rtl;max-width:92vw;text-align:center;font-family:Cairo,Tajawal,sans-serif;opacity:0;';
      document.body.appendChild(el);
    }
    el.style.borderColor = isAttack ? '#ef4444' : '#8e64ef';
    el.innerHTML = msg;
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(-30px)'; }, 3400);
  }

  function isOptionsScreenOpen() {
    const btns = document.querySelectorAll('.student-opt-btn');
    return btns.length > 0 && !(global.ScoreARQuizStudent?.hasAnswered?.());
  }

  function triggerCardEffectOnMe(cardId, sourceName = 'منافس', actionMsg = '') {
    const mgr = getManager(), me = mgr?.players?.[currentStudentId];
    if (cardId === 'PIN_STUDENT') {
      if (isOptionsScreenOpen()) { if (me?.status) me.status.isPinned = false; pendingEffects.pin = false; applyPinEffect(sourceName); }
      else { pendingEffects.pin = true; showStudentCardAlert(`❄️ هجوم تثبيت من ${sourceName}! سيتم تجميد خياراتك في السؤال القادم!`, true); sfx('wrong'); }
    } else if (cardId === 'SCREEN_FOG') {
      if (isOptionsScreenOpen()) { if (me?.status) me.status.hasFog = false; pendingEffects.fog = false; applyFogEffect(sourceName); }
      else { pendingEffects.fog = true; showStudentCardAlert(`💨 هجوم ضباب الرؤية من ${sourceName}! سيغطي الضباب سؤالك القادم!`, true); sfx('wrong'); }
    } else if (cardId === 'TIME_SLICER') {
      if (isOptionsScreenOpen()) { if (me?.status) me.status.timeSliced = false; pendingEffects.timeSlicer = false; applyTimeSlicerEffect(sourceName); }
      else { pendingEffects.timeSlicer = true; showStudentCardAlert(`⏳ مقص الوقت من ${sourceName}! سيُقتطع نصف وقتك في السؤال القادم!`, true); sfx('wrong'); }
    } else if (cardId === 'BLOCK_DRAW') {
      if (me?.status) me.status.blockDrawTurns = 2;
      showStudentCardAlert(`🚫 مانع السحب من ${sourceName}! لن تسحب كروتاً لجولتين.`, true);
      sfx('wrong');
    } else if (cardId === 'MINUS_50' || cardId === 'POINT_LEECH' || cardId === 'SWAP_STUDENT') {
      const stg = document.getElementById('scorearStudentStage');
      if (stg) { stg.style.boxShadow = 'inset 0 0 60px rgba(239,68,68,0.75)'; setTimeout(() => { stg.style.boxShadow = ''; }, 900); }
      showStudentCardAlert(actionMsg || `💥 هجوم تكتيكي من ${sourceName}! رصيد نقاطك الآن: ${me?.score ?? 0} نقطة!`, true);
      sfx('wrong');
    }
  }

  function handleRealtimeMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    const mgr = getManager();
    if (msg.gameMode || msg.mode) {
      const newMode = msg.gameMode || msg.mode;
      if (global.ScoreARGameModes?.setMode) global.ScoreARGameModes.setMode(newMode, false);
      if (mgr) mgr.setGameMode(newMode, false, 0);
    }
    if (Array.isArray(msg.roster) || Array.isArray(msg.allRanks)) {
      if (mgr) mgr.syncRoster(msg.roster || msg.allRanks, isHostRole ? null : currentStudentId);
      if (!isHostRole && mgr?.players?.[currentStudentId] && global.ScoreARQuizStudent?.syncScoreFromHost) {
        global.ScoreARQuizStudent.syncScoreFromHost(mgr.players[currentStudentId].score);
      }
      renderStudentDeckUi();
    }
    if (msg.type === 'CARD_TRAP_EQUIP' && isHostRole && mgr && msg.playerId && msg.card) {
      if (!mgr.players[msg.playerId]) mgr.registerPlayer(msg.playerId, msg.playerName || 'طالب', false);
      const p = mgr.players[msg.playerId];
      if (p.trapSlots.length < 2 && !p.trapSlots.some(t => t.instanceId === msg.card.instanceId)) p.trapSlots.push(msg.card);
      return;
    }
    if (msg.type === 'CARD_GRANT_STUDENT' && !isHostRole && mgr) {
      if (!msg.targetId || String(msg.targetId) === String(currentStudentId)) {
        const c = mgr.grantRandomCard(currentStudentId, msg.cardId || null);
        if (c) { isDeckOpen = true; renderStudentDeckUi(); showStudentCardAlert(`🃏 وصلك كارت تكتيكي: ${c.nameAr}!`); sfx('fanfare'); }
      }
      return;
    }
    if (msg.type === 'CARD_ACTION_BROADCAST') {
      const hostRoom = global.ScoreARQuizHost?.getCurrentRoom?.();
      if ((isHostRole || hostRoom) && mgr && msg.sourceId && msg.cardId) {
        if (hostRoom?.players) mgr.syncRoster(hostRoom.players);
        if (!mgr.players[msg.sourceId]) mgr.registerPlayer(msg.sourceId, msg.sourceName || 'طالب', false);
        const sender = mgr.players[msg.sourceId], instId = msg.instanceId || ('c_sync_' + Date.now());
        if (!sender.hand.some(c => c.instanceId === instId)) {
          const tpl = global.CARDS_DATABASE?.[msg.cardId] || { id: msg.cardId, nameAr: msg.cardId, type: 'TARGET_ATTACK' };
          sender.hand.push({ ...tpl, instanceId: instId });
        }
        mgr.activateCard(msg.sourceId, instId, msg.targetId || msg.sourceId);
        return;
      }
      showHostCardBanner(msg.actionMessage, msg.actionType);
      if (String(msg.targetId) === String(currentStudentId) && !msg.blocked) triggerCardEffectOnMe(msg.cardId, msg.sourceName || 'منافس', msg.actionMessage);
      renderStudentDeckUi();
    } else if (msg.type === 'HOST_CARD_EFFECT') {
      if (isHostRole) return;
      if (mgr && Array.isArray(msg.roster)) mgr.syncRoster(msg.roster, currentStudentId);
      const me = mgr?.players?.[currentStudentId];
      if (me && global.ScoreARQuizStudent?.syncScoreFromHost) global.ScoreARQuizStudent.syncScoreFromHost(me.score);
      const myIdStr = String(currentStudentId), isTarget = String(msg.targetId) === myIdStr;
      const isAffected = String(msg.affectedId || msg.targetId) === myIdStr, isSource = String(msg.sourceId) === myIdStr;
      if (isTarget && (msg.blocked || msg.reflected)) {
        if (me?.trapSlots?.length) me.trapSlots.shift();
        showStudentCardAlert(`🛡️ ${msg.actionMessage}`);
        sfx('fanfare');
      } else if (isAffected && !msg.blocked && (msg.targetId !== msg.sourceId || msg.reflected)) {
        triggerCardEffectOnMe(msg.cardId, msg.reflected ? 'مرآة القاضي (مرتد)' : (msg.sourceName || 'منافس'), msg.actionMessage);
      } else if (isSource) {
        showStudentCardAlert(msg.actionMessage, Boolean(msg.blocked));
        sfx(msg.blocked ? 'wrong' : 'reveal');
      }
      renderStudentDeckUi();
    }
  }

  function handleCardEvent(ev) {
    const mgr = getManager(), hostRoom = global.ScoreARQuizHost?.getCurrentRoom?.();
    if (hostRoom && Array.isArray(hostRoom.players) && mgr) {
      hostRoom.players.forEach(p => {
        const mp = mgr.players[p.id];
        if (mp) { p.score = mp.score; p.isPinned = Boolean(mp.status?.isPinned); p.hasFog = Boolean(mp.status?.hasFog); p.timeSliced = Boolean(mp.status?.timeSliced); p.cardMultiplier = mp.status?.multiplier || 1; }
      });
      document.querySelectorAll('.scorear-count-up').forEach((el, idx) => {
        const sorted = [...hostRoom.players].sort((a, b) => (b.score || 0) - (a.score || 0));
        if (sorted[idx]) el.textContent = sorted[idx].score || 0;
      });
    }
    showHostCardBanner(ev.message, ev.type);
    if (!isHostRole && mgr?.players?.[currentStudentId] && global.ScoreARQuizStudent?.syncScoreFromHost) {
      global.ScoreARQuizStudent.syncScoreFromHost(mgr.players[currentStudentId].score);
    }
    if (global.ScoreARRealtime?.publish && activePin) {
      if (isHostRole || hostRoom) {
        const roster = (hostRoom?.players || Object.values(mgr?.players || {})).map(p => ({ id: p.id, name: p.name, score: p.score || 0, streak: p.streak || 0, isBot: Boolean(p.isBot || p.isDemo || p.isAI) }));
        global.ScoreARRealtime.publish('HOST_CARD_EFFECT', {
          actionMessage: ev.message, actionType: ev.type, sourceId: ev.sourcePlayer?.id, sourceName: ev.sourcePlayer?.name,
          targetId: ev.targetPlayer?.id, targetName: ev.targetPlayer?.name, affectedId: (ev.affectedPlayer || ev.targetPlayer)?.id,
          cardId: ev.card?.id, cardNameAr: ev.card?.nameAr, trapNameAr: ev.trapCard?.nameAr || null,
          blocked: (ev.type === 'BLOCKED' || ev.type === 'REFLECTED'), reflected: (ev.type === 'REFLECTED'), roster
        });
      } else {
        global.ScoreARRealtime.publish('CARD_ACTION_BROADCAST', {
          actionMessage: ev.message, actionType: ev.type, sourceId: ev.sourcePlayer?.id, sourceName: ev.sourcePlayer?.name,
          targetId: ev.targetPlayer?.id, cardId: ev.card?.id, instanceId: ev.card?.instanceId, blocked: (ev.type === 'BLOCKED' || ev.type === 'REFLECTED')
        });
      }
    }
  }

  function handlePlayerToast(pid, msg) { if (String(pid) === String(currentStudentId)) showStudentCardAlert(msg); }

  function showHostCardBanner(msg, type) {
    if (!document.getElementById('scorearHostStage')) return;
    let ticker = document.getElementById('scorearCardArenaTicker');
    if (!ticker) {
      ticker = document.createElement('div');
      ticker.id = 'scorearCardArenaTicker';
      ticker.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(120px);z-index:9999999;background:linear-gradient(135deg,rgba(24,23,46,0.96),rgba(17,18,38,0.98));border:2px solid #f59e0b;padding:12px 28px;border-radius:20px;color:#fff;font-size:15px;font-weight:900;display:flex;align-items:center;gap:12px;box-shadow:0 12px 40px rgba(0,0,0,0.6);transition:transform 0.35s cubic-bezier(0.34,1.56,0.64,1);pointer-events:none;direction:rtl;font-family:Cairo,Tajawal,sans-serif;';
      document.body.appendChild(ticker);
    }
    const icon = type === 'REFLECTED' ? '🪞' : (type === 'BLOCKED' ? '🛡️' : '⚡');
    ticker.style.borderColor = type === 'REFLECTED' ? '#38bdf8' : (type === 'BLOCKED' ? '#ef4444' : '#f59e0b');
    ticker.innerHTML = `<span style="font-size:22px;">${icon}</span><span>${msg}</span>`;
    ticker.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(ticker._hideTimer);
    ticker._hideTimer = setTimeout(() => { ticker.style.transform = 'translateX(-50%) translateY(120px)'; }, 4200);
  }

  function mountStudentDeck(stage) {
    if (!stage) return;
    let wrap = document.getElementById('studentMobileDeckWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'studentMobileDeckWrap';
      wrap.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:999999;direction:rtl;font-family:Cairo,Tajawal,sans-serif;pointer-events:auto;';
      document.body.appendChild(wrap);
    }
    if (global.innerWidth && global.innerWidth <= 768) isDeckOpen = false;
    renderStudentDeckUi();
    const mgr = getManager(), me = mgr?.players?.[currentStudentId];
    if (pendingEffects.pin || me?.status?.isPinned) { pendingEffects.pin = false; if (me?.status) me.status.isPinned = false; setTimeout(() => applyPinEffect(), 60); }
    if (pendingEffects.fog || me?.status?.hasFog) { pendingEffects.fog = false; if (me?.status) me.status.hasFog = false; setTimeout(() => applyFogEffect(), 80); }
    if (pendingEffects.timeSlicer || me?.status?.timeSliced) { pendingEffects.timeSlicer = false; if (me?.status) me.status.timeSliced = false; setTimeout(() => applyTimeSlicerEffect(), 80); }
    if (pendingEffects.eraser || me?.status?.eraserActive) { pendingEffects.eraser = false; if (me?.status) me.status.eraserActive = false; setTimeout(() => applyEraserEffect(), 80); }
  }

  function renderStudentDeckUi() {
    const wrap = document.getElementById('studentMobileDeckWrap');
    if (!wrap) return;
    const mode = global.ScoreARGameModes?.getMode?.() || 'CARD_ARENA';
    if (mode !== 'CARD_ARENA') { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    const mgr = getManager(), me = mgr?.players ? mgr.players[currentStudentId] : null;
    const hand = me?.hand || [], traps = me?.trapSlots || [];
    wrap.innerHTML = `<div style="display:flex;justify-content:center;margin-bottom:-4px;"><button type="button" onclick="ScoreARCardArena.toggleDeck()" style="background:linear-gradient(135deg,#7550ef,#9665ff);color:#fff;border:1px solid #c4a8ff;border-radius:18px 18px 0 0;padding:5px 18px;font-size:11.5px;font-weight:900;cursor:pointer;box-shadow:0 -4px 15px rgba(117,80,239,0.4);display:flex;align-items:center;gap:8px;"><span>🃏 حقيبة الكروت (${hand.length}/3)</span><span style="font-size:10px;">${isDeckOpen ? '▼ تصغير' : '▲ فتح'}</span></button></div><div style="background:rgba(12,14,30,0.97);backdrop-filter:blur(16px);border-top:2px solid #8e64ef;padding:10px 12px 12px;box-shadow:0 -10px 30px rgba(0,0,0,0.6);display:${isDeckOpen ? 'block' : 'none'};max-height:46vh;overflow-y:auto;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;"><span style="font-size:10.5px;font-weight:900;color:#52d9ed;">🛡️ خانة الفخاخ للرد التلقائي (${traps.length}/2):</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">${[0, 1].map(i => { const t = traps[i]; if (!t) return `<div style="background:rgba(255,255,255,0.03);border:1.5px dashed rgba(255,255,255,0.15);border-radius:10px;padding:6px;text-align:center;font-size:10.5px;color:#94a3b8;">خانة فخ فارغة (${i+1})</div>`; return `<div style="background:rgba(23,37,84,0.75);border:1.5px solid #38bdf8;border-radius:10px;padding:5px 8px;display:flex;align-items:center;gap:6px;box-shadow:0 0 10px rgba(56,189,248,0.25);"><img src="${t.img}" alt="${t.nameAr}" style="width:30px;height:40px;object-fit:cover;border-radius:5px;flex-shrink:0;"><div style="overflow:hidden;"><b style="color:#ffffff;font-size:11px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.nameAr}</b><small style="color:#7dd3fc;font-size:9px;display:block;">جاهز للرد التلقائي ⚡</small></div></div>`; }).join('')}</div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;"><span style="font-size:10.5px;font-weight:900;color:#fcd34d;">🎒 كروت اليد الحالية (${hand.length}/3):</span></div><div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:6px;">${[0, 1, 2].map(i => { const c = hand[i]; if (!c) return `<div style="background:rgba(255,255,255,0.02);border:1.5px dashed rgba(255,255,255,0.12);border-radius:10px;min-height:95px;display:grid;place-items:center;font-size:10px;color:#64748b;text-align:center;padding:4px;">يد فارغة (${i+1})</div>`; const isTrap = c.type.startsWith('TRAP_'), isTargeted = (c.type === 'TARGET_ATTACK' || c.type === 'TARGET_BLUFF'); return `<div style="background:rgba(21,23,49,0.94);border:1.5px solid #f59e0b;border-radius:10px;padding:5px;display:flex;flex-direction:column;justify-content:space-between;align-items:center;text-align:center;min-height:95px;"><img src="${c.img}" alt="${c.nameAr}" style="width:100%;max-width:50px;height:38px;object-fit:cover;border-radius:5px;margin-bottom:2px;"><b style="color:#ffffff;font-size:10.5px;line-height:1.2;margin-bottom:3px;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;">${c.nameAr}</b>${isTrap ? `<button type="button" onclick="ScoreARCardArena.equipTrap('${c.instanceId}')" style="background:#0284c7;color:#fff;border:none;border-radius:5px;padding:3px 5px;font-size:9.5px;font-weight:900;width:100%;cursor:pointer;">🛡️ وضع بالفخ</button>` : ''}${!isTrap && !isTargeted ? `<button type="button" onclick="ScoreARCardArena.activateSelf('${c.instanceId}')" style="background:#10b981;color:#fff;border:none;border-radius:5px;padding:3px 5px;font-size:9.5px;font-weight:900;width:100%;cursor:pointer;">⚡ تفعيل</button>` : ''}${isTargeted ? `<button type="button" onclick="ScoreARCardArena.openTargetPicker('${c.instanceId}')" style="background:#ef4444;color:#fff;border:none;border-radius:5px;padding:3px 5px;font-size:9.5px;font-weight:900;width:100%;cursor:pointer;">🎯 استهداف</button>` : ''}</div>`; }).join('')}</div></div>`;
  }

  function toggleDeck() { isDeckOpen = !isDeckOpen; renderStudentDeckUi(); }

  function equipTrap(instanceId) {
    const mgr = getManager();
    if (!mgr) return;
    const res = mgr.equipToTrapSlot(currentStudentId, instanceId);
    if (res?.ok) {
      sfx('pop');
      if (!isHostRole && global.ScoreARRealtime?.publish && activePin) {
        global.ScoreARRealtime.publish('CARD_TRAP_EQUIP', { playerId: currentStudentId, playerName: mgr.players[currentStudentId]?.name || 'طالب', card: res.card });
      }
    }
  }

  function activateSelf(instanceId) {
    const mgr = getManager();
    if (!mgr) return;
    const me = mgr.players[currentStudentId], card = me?.hand?.find(c => c.instanceId === instanceId);
    if (card?.id === 'ERASER_50_50') {
      if (isOptionsScreenOpen()) applyEraserEffect();
      else { pendingEffects.eraser = true; showStudentCardAlert('✂️ سيتم حذف خيارين فور ظهور خيارات السؤال!'); }
    } else if (card?.id === 'MULTIPLIER_2X') {
      if (me) me.status.multiplier = 2;
      showStudentCardAlert('⚡ تم تفعيل مضاعف النقاط 2X لسؤالك القادم!');
    }
    mgr.activateCard(currentStudentId, instanceId, currentStudentId);
    sfx('reveal');
  }

  function openTargetPicker(instanceId) {
    const mgr = getManager();
    if (!mgr) return;
    const hostPlayers = global.ScoreARQuizHost?.getPlayers?.();
    if (Array.isArray(hostPlayers) && hostPlayers.length) mgr.syncRoster(hostPlayers, currentStudentId);
    const otherPlayers = Object.values(mgr.players).filter(p => String(p.id) !== String(currentStudentId));
    document.getElementById('targetPickerModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'targetPickerModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:99999999;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:16px;direction:rtl;font-family:Cairo,Tajawal,sans-serif;';
    modal.innerHTML = `<div style="background:#13152a;border:2px solid #ef4444;border-radius:22px;padding:22px;max-width:380px;width:100%;text-align:center;"><h3 style="color:#ffffff;font-size:18px;margin:0 0 6px;">🎯 اختر الطالب المستهدف</h3><p style="color:#cbd5e1;font-size:12px;margin-bottom:16px;">اضغط على اسم منافسك لإطلاق الكارت عليه فوراً:</p><div style="display:flex;flex-direction:column;gap:8px;max-height:260px;overflow-y:auto;margin-bottom:16px;">${otherPlayers.length ? otherPlayers.map(p => `<button type="button" onclick="ScoreARCardArena.confirmTarget('${instanceId}', '${p.id}')" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);border-radius:12px;padding:10px 14px;color:#fff;font-weight:800;font-size:14px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;"><span>${p.isAI ? '🤖 ' : '👤 '}${p.name}</span><span style="color:#fcd34d;font-size:12px;">${p.score || 0} نقطة</span></button>`).join('') : '<div style="color:#94a3b8;font-size:13px;padding:14px;">لا يوجد متنافسون آخرون بالقاعة حالياً</div>'}</div><button type="button" onclick="document.getElementById('targetPickerModal')?.remove()" style="background:#334155;color:#fff;border:none;padding:8px 20px;border-radius:10px;font-weight:700;font-size:12px;cursor:pointer;">إلغاء ✕</button></div>`;
    document.body.appendChild(modal);
  }

  function confirmTarget(instanceId, targetId) {
    document.getElementById('targetPickerModal')?.remove();
    const mgr = getManager();
    if (mgr) { mgr.activateCard(currentStudentId, instanceId, targetId); sfx('pop'); }
  }

  function simulateCardAction(cardId = null) {
    const mgr = getManager();
    if (!mgr) return;
    if (isHostRole && document.getElementById('scorearHostStage')) {
      syncHostRoster();
      if (global.ScoreARRealtime?.publish && activePin) global.ScoreARRealtime.publish('CARD_GRANT_STUDENT', { pin: activePin, cardId });
      const all = Object.values(mgr.players);
      if (all.length >= 2) {
        const c = mgr.grantRandomCard(all[0].id, cardId || 'POINT_LEECH');
        if (c) mgr.activateCard(all[0].id, c.instanceId, all[1].id);
      } else showHostCardBanner('🃏 تم إرسال كارت تكتيكي تجريبي لهواتف الطلاب المتصلين بالقاعة!', 'EXECUTED');
      sfx('reveal');
      return;
    }
    const card = mgr.grantRandomCard(currentStudentId, cardId || 'SWAP_STUDENT');
    if (card) { isDeckOpen = true; renderStudentDeckUi(); showStudentCardAlert(`🃏 تجربة كارت: حصلت على ${card.nameAr}!`); sfx('reveal'); }
  }

  function applyPinEffect(sourceName = 'منافس') {
    document.querySelectorAll('.student-opt-btn').forEach(b => { b.disabled = true; b.style.pointerEvents = 'none'; b.style.opacity = '0.35'; b.style.filter = 'grayscale(1)'; });
    const fb = document.getElementById('studentFeedbackBox');
    if (fb) fb.innerHTML = `❄️ <strong style="color:#38bdf8;">تم تجميد شاشتك بواسطة ${sourceName}!</strong> لا يمكنك الإجابة في هذه الجولة.`;
    showStudentCardAlert(`❄️ أنت مجمد بواسطة كارت تثبيت طالب من ${sourceName}!`, true);
    sfx('wrong');
  }

  function applyFogEffect(sourceName = 'منافس') {
    const cont = document.getElementById('studentOptionsContainer');
    if (!cont || document.getElementById('fogOverlayCanvas')) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'fogOverlayCanvas';
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:30;cursor:pointer;border-radius:16px;touch-action:none;';
    cont.style.position = 'relative'; cont.appendChild(canvas);
    canvas.width = cont.offsetWidth || 360; canvas.height = cont.offsetHeight || 220;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(22, 20, 48, 0.96)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'bold 15px Cairo, sans-serif'; ctx.fillStyle = '#38bdf8'; ctx.textAlign = 'center';
      ctx.fillText('💨 ضباب الرؤية! امسح بإصبعك لكشف الخيارات', canvas.width / 2, canvas.height / 2);
      let isWiping = false;
      const wipe = (e) => {
        if (!isWiping) return;
        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX ?? e.touches?.[0]?.clientX) || 0) - rect.left, y = ((e.clientY ?? e.touches?.[0]?.clientY) || 0) - rect.top;
        ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(x, y, 36, 0, Math.PI * 2); ctx.fill();
      };
      canvas.addEventListener('mousedown', () => isWiping = true); canvas.addEventListener('touchstart', () => isWiping = true);
      global.addEventListener?.('mouseup', () => isWiping = false); global.addEventListener?.('touchend', () => isWiping = false);
      canvas.addEventListener('mousemove', wipe); canvas.addEventListener('touchmove', wipe);
    }
    showStudentCardAlert(`💨 ضباب الرؤية من ${sourceName}! امسح الشاشة لكشف الخيارات.`, true);
  }

  function applyEraserEffect() {
    const opts = document.querySelectorAll('.student-opt-btn');
    if (opts.length >= 4) {
      opts[0].style.opacity = '0.15'; opts[0].disabled = true; opts[0].style.pointerEvents = 'none';
      opts[2].style.opacity = '0.15'; opts[2].disabled = true; opts[2].style.pointerEvents = 'none';
      showStudentCardAlert('✂️ كارت 50/50: تم استبعاد خيارين!');
    }
  }

  function applyTimeSlicerEffect(sourceName = 'منافس') {
    if (global.ScoreARQuizStudent?.cutTimeInHalf) global.ScoreARQuizStudent.cutTimeInHalf();
    else {
      const timerTxt = document.getElementById('studentTimerText');
      if (timerTxt) { const t = parseInt(timerTxt.textContent, 10); if (!isNaN(t) && t > 2) timerTxt.textContent = String(Math.floor(t / 2)); }
    }
    showStudentCardAlert(`⏳ مقص الوقت من ${sourceName}! تم قطع نصف الوقت المتبقي.`, true);
    sfx('wrong');
  }

  function isModeActive() {
    const m = (global.ScoreARGameModes && typeof global.ScoreARGameModes.getMode === 'function') ? global.ScoreARGameModes.getMode() : (manager?.mode || 'CARD_ARENA');
    return m === 'CARD_ARENA';
  }

  function onCorrectAnswerGranted(playerId, isTop2 = false) {
    if (!isTop2 && playerId !== 'solo_player') return;
    const mgr = getManager();
    if (!mgr) return;
    const pidStr = String(playerId || currentStudentId || 's_local');
    if (!mgr.players[pidStr]) mgr.registerPlayer(pidStr, global.ScoreARQuizStudent?.state?.name || 'طالب', false);
    const card = mgr.grantRandomCard(pidStr);
    if (card) { isDeckOpen = true; renderStudentDeckUi(); showStudentCardAlert(`🏆 مركز متقدم بالسرعة! كسبت كارت: ${card.nameAr}`); sfx('fanfare'); }
  }

  global.ScoreARCardArena = {
    initArena, syncHostRoster, mountStudentDeck, renderStudentDeckUi, showStudentCardAlert,
    toggleDeck, equipTrap, activateSelf, openTargetPicker, confirmTarget,
    simulateCardAction, showHostCardBanner, applyPinEffect, applyFogEffect,
    applyEraserEffect, applyTimeSlicerEffect, onCorrectAnswerGranted, getManager, isModeActive
  };
})(typeof window !== 'undefined' ? window : global);
