/**
 * ScoreAR Game Modes Controller (Non-Destructive)
 * Adds Game Mode Selection Layer (Solo Classic, Squads, Card Arena) and AI Bots toggle.
 * Strictly Rule 7 Compliant (<300 lines).
 */
(function(global) {
  'use strict';

  let currentMode = 'SOLO'; // 'SOLO' | 'SQUADS' | 'CARD_ARENA'
  let isAiEnabled = false;
  let activeModalEl = null;

  const MODES_CONFIG = {
    SOLO: {
      id: 'SOLO',
      icon: '👤',
      titleAr: 'الطور الفردي (Solo Classic)',
      tagAr: 'كلاسيكي · كل بطل لنفسه',
      descAr: 'نفس قوانين كاهوت وسكور آر الحالية 100%: النقاط حسب صحة الإجابة ومكافأة السرعة وسلسلة الإجابات المتتالية (Streak) بدون كروت.',
      accentColor: '#8e64ef'
    },
    SQUADS: {
      id: 'SQUADS',
      icon: '🛡️',
      titleAr: 'طور المجموعات المتنافسة (Squads)',
      tagAr: 'فرق متنافسة · صقور وأسود',
      descAr: 'يتوزع الطلاب في اللوبي إلى فريقين (الصقور الذهبية وأسود المجرة). تُجمع نقاط الطلاب لدعم صدارة الفريق في لوحة الترتيب.',
      accentColor: '#38bdf8'
    },
    CARD_ARENA: {
      id: 'CARD_ARENA',
      icon: '🃏',
      titleAr: 'طور حرب الكروت (Card Arena)',
      tagAr: '⚡ تفاعل خارق · 20 كارت',
      descAr: 'تفعيل نظام الـ 20 كارت التكتيكي! إرسال فوري لتليفون الطالب عند الإجابة، حقيبة يد 3 كروت للهجوم، وخانة فخاخ للرد والصد العكسي التلقائي.',
      accentColor: '#f59e0b'
    }
  };

  function getMode() {
    return currentMode;
  }

  function isAIEnabled() {
    return isAiEnabled;
  }

  function setMode(mode, ai = false) {
    if (MODES_CONFIG[mode]) currentMode = mode;
    isAiEnabled = Boolean(ai);
    try {
      localStorage.setItem('scorear_last_game_mode', currentMode);
      localStorage.setItem('scorear_last_ai_enabled', String(isAiEnabled));
    } catch(e){}
    global.currentLobbyGameMode = currentMode;
    global.currentLobbyAIEnabled = isAiEnabled;
  }

  function openModePicker(options = {}) {
    const worldId = options.worldId || global.currentLobbyWorldId || 'royal';
    const pin = options.pin || global.currentLobbyPin || '849201';
    const onConfirm = options.onConfirm || (() => {});
    const onCancel = options.onCancel || (() => {});

    // Sync from host room if active
    if (global.ScoreARQuizHost && typeof global.ScoreARQuizHost.getCurrentRoom === 'function') {
      const room = global.ScoreARQuizHost.getCurrentRoom();
      if (room && room.gameMode && MODES_CONFIG[room.gameMode]) currentMode = room.gameMode;
    } else {
      try {
        const savedMode = localStorage.getItem('scorear_last_game_mode');
        if (savedMode && MODES_CONFIG[savedMode]) currentMode = savedMode;
      } catch(e){}
    }
    isAiEnabled = false;

    closeModePicker();

    let selectedMode = currentMode;
    let selectedAI = false;

    const modal = document.createElement('div');
    modal.id = 'scorearGameModeModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(8,10,22,0.88);backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;padding:16px;direction:rtl;font-family:Cairo,Tajawal,sans-serif;';

    const worlds = global.worlds || [];
    const worldObj = worlds.find(w => w.id === worldId) || { name: 'العالم التفاعلي' };

    modal.innerHTML = `
      <div style="background:linear-gradient(180deg,#18172e 0%,#111226 100%);border:1px solid rgba(142,100,239,0.35);border-radius:26px;max-width:680px;width:100%;padding:28px;box-shadow:0 25px 70px rgba(0,0,0,0.7);max-height:92vh;overflow-y:auto;position:relative;">
        
        <!-- Header -->
        <div style="text-align:center;margin-bottom:22px;">
          <div class="launch-pill" style="margin-bottom:10px;"><span class="live-dot"></span> أنظمة المنافسة التفاعلية</div>
          <h2 style="font-size:26px;font-weight:900;color:#ffffff;margin:4px 0 6px;">اختر نظام المنافسة للقاعة</h2>
          <p style="color:#b1a2e9;font-size:13px;line-height:1.6;margin:0;">
            عالم: <b style="color:#52d9ed;">${worldObj.name}</b> · رمز القاعة: <b style="color:#fcd34d;letter-spacing:1px;">${pin}</b>
          </p>
        </div>

        <!-- 3 Modes Cards -->
        <div id="modeCardsContainer" style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px;">
          ${Object.values(MODES_CONFIG).map(m => {
            const isSelected = (m.id === selectedMode);
            return `
              <div class="mode-select-card" data-mode="${m.id}" onclick="ScoreARGameModes.selectModeInModal('${m.id}')" style="cursor:pointer;background:${isSelected ? 'rgba(117,80,239,0.18)' : 'rgba(255,255,255,0.03)'};border:2px solid ${isSelected ? m.accentColor : 'rgba(255,255,255,0.1)'};border-radius:18px;padding:16px 18px;transition:all 0.25s ease;display:flex;align-items:center;justify-content:space-between;gap:14px;box-shadow:${isSelected ? '0 8px 24px rgba(117,80,239,0.25)' : 'none'};">
                <div style="display:flex;align-items:center;gap:14px;">
                  <div style="font-size:32px;width:52px;height:52px;border-radius:14px;background:rgba(255,255,255,0.06);display:grid;place-items:center;flex-shrink:0;">${m.icon}</div>
                  <div>
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
                      <h4 style="font-size:16px;font-weight:900;color:#ffffff;margin:0;">${m.titleAr}</h4>
                      <span style="font-size:10px;padding:2px 8px;border-radius:10px;background:rgba(142,100,239,0.2);color:#c4b5fd;font-weight:800;border:1px solid rgba(142,100,239,0.4);">${m.tagAr}</span>
                    </div>
                    <p style="font-size:12px;color:#a1a4be;line-height:1.55;margin:0;">${m.descAr}</p>
                  </div>
                </div>
                <div class="mode-radio-dot" style="width:24px;height:24px;border-radius:50%;border:2px solid ${isSelected ? m.accentColor : 'rgba(255,255,255,0.3)'};display:grid;place-items:center;flex-shrink:0;">
                  ${isSelected ? `<div style="width:12px;height:12px;border-radius:50%;background:${m.accentColor};"></div>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Lobby Manual Participant Control Notice -->
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:12px 16px;display:flex;align-items:center;gap:10px;margin-bottom:20px;">
          <span style="font-size:22px;">👥</span>
          <div>
            <b style="color:#ffffff;font-size:13px;display:block;">تحكم المعلم الكامل بالمشاركين من قاعة اللوبي</b>
            <small style="color:#a1a4be;font-size:11.5px;">لا يتم إدخال أي بوتات تلقائياً؛ ينضم الطلاب الحقيقيون برمز القاعة، ويمكنك إضافة أو حذف طلاب تجريبيين (Bots) يدوياً من داخل قاعة الانتظار.</small>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex;gap:12px;justify-content:flex-end;align-items:center;flex-wrap:wrap;">
          <button type="button" class="btn launch-outline" onclick="ScoreARGameModes.closeModePicker();" style="padding:12px 20px;border-radius:14px;font-weight:800;font-size:14px;">إلغاء ✕</button>
          <button type="button" class="btn launch-primary" id="btnConfirmGameMode" onclick="ScoreARGameModes.confirmSelection()" style="padding:12px 28px;border-radius:14px;font-weight:900;font-size:15px;box-shadow:0 8px 30px rgba(117,80,239,0.5);">انطلاق إلى قاعة التحدي 🚀</button>
        </div>

      </div>
    `;

    document.body.appendChild(modal);
    activeModalEl = modal;

    modal._state = {
      worldId,
      pin,
      selectedMode,
      selectedAI,
      onConfirm,
      onCancel
    };
  }

  function selectModeInModal(modeId) {
    if (!activeModalEl || !activeModalEl._state) return;
    activeModalEl._state.selectedMode = modeId;

    const cards = activeModalEl.querySelectorAll('.mode-select-card');
    cards.forEach(card => {
      const isSel = (card.getAttribute('data-mode') === modeId);
      const conf = MODES_CONFIG[card.getAttribute('data-mode')];
      card.style.background = isSel ? 'rgba(117,80,239,0.18)' : 'rgba(255,255,255,0.03)';
      card.style.borderColor = isSel ? conf.accentColor : 'rgba(255,255,255,0.1)';
      card.style.boxShadow = isSel ? '0 8px 24px rgba(117,80,239,0.25)' : 'none';
      const dot = card.querySelector('.mode-radio-dot');
      if (dot) {
        dot.style.borderColor = isSel ? conf.accentColor : 'rgba(255,255,255,0.3)';
        dot.innerHTML = isSel ? `<div style="width:12px;height:12px;border-radius:50%;background:${conf.accentColor};"></div>` : '';
      }
    });
  }

  function toggleAiInModal() {
    if (!activeModalEl || !activeModalEl._state) return;
    activeModalEl._state.selectedAI = !activeModalEl._state.selectedAI;
    const ai = activeModalEl._state.selectedAI;
    const sw = document.getElementById('modalAiToggleSwitch');
    if (sw) {
      sw.style.background = ai ? '#10b981' : 'rgba(255,255,255,0.2)';
      sw.innerHTML = `<div style="width:20px;height:20px;border-radius:50%;background:#ffffff;position:absolute;top:3px;${ai ? 'left:4px;' : 'right:4px;'}transition:all 0.25s;"></div>`;
    }
  }

  function confirmSelection() {
    if (!activeModalEl || !activeModalEl._state) return;
    const { worldId, pin, selectedMode, selectedAI, onConfirm } = activeModalEl._state;

    setMode(selectedMode, selectedAI);
    closeModePicker();

    // Update CardArenaEngine manager mode without auto-spawning bots
    if (global.ScoreARCardArena && typeof global.ScoreARCardArena.getManager === 'function') {
      try {
        const mgr = global.ScoreARCardArena.getManager();
        if (mgr && typeof mgr.setGameMode === 'function') mgr.setGameMode(selectedMode, false, 0);
      } catch(e){}
    }

    // Update host room state if host is active
    if (global.ScoreARQuizHost && typeof global.ScoreARQuizHost.getCurrentRoom === 'function') {
      const room = global.ScoreARQuizHost.getCurrentRoom();
      if (room) {
        room.mode = selectedMode;
        room.gameMode = selectedMode;
        room.aiEnabled = selectedAI;
      }
    }

    // Update lobby mode badge in DOM
    if (global.ScoreARQuizHostView && typeof global.ScoreARQuizHostView.updateLobbyModeBadge === 'function') {
      global.ScoreARQuizHostView.updateLobbyModeBadge(selectedMode);
    }

    // Sync to Firebase RTDB if available
    try {
      const db = (global.ScoreARAuth?.getDb?.()) || global.firebase?.database?.();
      if (db && pin) {
        db.ref('rooms/' + pin).update({ mode: selectedMode, gameMode: selectedMode, aiEnabled: selectedAI, updatedAt: Date.now() }).catch(()=>{});
      }
    } catch(e){}

    // Broadcast room mode update to all participants in this PIN
    if (global.ScoreARRealtime && typeof global.ScoreARRealtime.publish === 'function') {
      global.ScoreARRealtime.publish('ROOM_MODE_UPDATE', {
        mode: selectedMode,
        gameMode: selectedMode,
        aiEnabled: selectedAI,
        pin: pin,
        worldId: worldId
      });
    }

    const modeName = selectedMode === 'CARD_ARENA' ? 'حرب الكروت' : (selectedMode === 'SQUADS' ? 'المجموعات' : 'الفردي');
    if (global.toast) global.toast(`تم تفعيل طور «${modeName}» للقاعة بنجاح! 🎮`);

    if (typeof onConfirm === 'function') {
      onConfirm(worldId, selectedMode, selectedAI);
    }
  }

  function closeModePicker() {
    if (activeModalEl) {
      if (activeModalEl.parentNode) activeModalEl.parentNode.removeChild(activeModalEl);
      activeModalEl = null;
    }
  }

  // Public API
  global.ScoreARGameModes = {
    getMode,
    isAIEnabled,
    setMode,
    openModePicker,
    selectModeInModal,
    toggleAiInModal,
    confirmSelection,
    closeModePicker,
    MODES_CONFIG
  };

})(typeof window !== 'undefined' ? window : global);
