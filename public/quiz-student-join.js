/**
 * ScoreAR Student 3-Step Join Flow (quiz-student-join.js)
 * Step 1: 6-digit PIN with large touch keypad & room openness validation.
 * Step 2: Student Nickname (1-40 chars, regex-validated, pre-filled if logged in, deduplicated, textContent).
 * Step 3: 20-Character Picker with live preview & entry into lobby.
 * Strictly Rule 7 compliant (<500 lines).
 */
(function(global) {
  'use strict';

  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  const NAME_REGEX = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9\u0660-\u0669\u06F0-\u06F9\s\-\.\/]{1,40}$/;

  let state = {
    step: 1,
    pin: '',
    name: '',
    avatarId: 'char_01',
    isRegistered: false,
    error: null,
    loading: false,
    existingPlayers: []
  };

  let containerEl = null;

  function init(container, initialPin = '') {
    containerEl = container;
    const cleanPin = String(initialPin || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).trim();
    state = {
      step: 1,
      pin: /^\d{1,6}$/.test(cleanPin) ? cleanPin : '',
      name: '',
      avatarId: 'char_01',
      isRegistered: false,
      error: null,
      loading: false,
      existingPlayers: []
    };

    // Warm-up anonymous auth early for instantaneous RTDB verification
    try {
      const a = (global.ScoreARAuth && global.ScoreARAuth.getAuth) ? global.ScoreARAuth.getAuth() : (global.firebase && global.firebase.auth ? global.firebase.auth() : null);
      if (a && !a.currentUser) a.signInAnonymously().catch(() => {});
    } catch(e){}

    // Pre-fill registered student if logged in
    try {
      const user = (global.ScoreARAuth && global.ScoreARAuth.getCurrentUser) ? global.ScoreARAuth.getCurrentUser() : null;
      if (user && user.role === 'student' && !user.isAnonymous) {
        state.isRegistered = true;
        state.name = user.displayName || user.name || '';
      } else {
        const activeQuiz = sessionStorage.getItem('scorear_active_quiz_session');
        if (activeQuiz) {
          const parsed = JSON.parse(activeQuiz);
          if (parsed && parsed.pin && parsed.name && (Date.now() - (parsed.savedAt || 0) < 3600000)) {
            state.savedActiveSession = parsed;
            state.name = parsed.name;
            if (parsed.avatarId) state.avatarId = parsed.avatarId;
          }
        } else {
          const saved = sessionStorage.getItem('scorear_student_session');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.name) state.name = parsed.name;
            if (parsed && parsed.avatarId) state.avatarId = parsed.avatarId;
          }
        }
      }
    } catch(e){}

    render();
  }

  function render() {
    if (!containerEl) return;
    containerEl.innerHTML = `
      <div class="student-join-flow" style="display:flex;flex-direction:column;gap:14px;color:#fff;direction:rtl;text-align:right;">
        <!-- Step Indicator -->
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:4px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${state.step>=1?'#7550ef':'#282a4a'};color:#fff;font-size:12px;font-weight:900;">1</span>
            <span style="font-size:12px;font-weight:800;color:${state.step===1?'#c9baff':'#717495'};">رمز القاعة</span>
          </div>
          <div style="width:24px;height:2px;background:${state.step>=2?'#7550ef':'#282a4a'};"></div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${state.step>=2?'#7550ef':'#282a4a'};color:#fff;font-size:12px;font-weight:900;">2</span>
            <span style="font-size:12px;font-weight:800;color:${state.step===2?'#c9baff':'#717495'};">الاسم</span>
          </div>
          <div style="width:24px;height:2px;background:${state.step>=3?'#7550ef':'#282a4a'};"></div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${state.step>=3?'#7550ef':'#282a4a'};color:#fff;font-size:12px;font-weight:900;">3</span>
            <span style="font-size:12px;font-weight:800;color:${state.step===3?'#c9baff':'#717495'};">الشخصية</span>
          </div>
        </div>

        ${state.error ? `
          <div id="studentStepError" style="background:rgba(239,68,68,0.18);border:1px solid #ef4444;color:#fca5a5;padding:10px 14px;border-radius:12px;font-size:12px;font-weight:800;line-height:1.5;text-align:center;">
            ${escapeHtml(state.error)}
          </div>` : ''}

        ${state.step === 1 ? renderStep1Html() : state.step === 2 ? renderStep2Html() : renderStep3Html()}
      </div>
    `;

    // Safe focus and event attachments
    if (state.step === 1) {
      const pinInp = containerEl.querySelector('#studentJoinPinInput');
      if (pinInp) {
        pinInp.addEventListener('input', (e) => {
          const val = e.target.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, '').slice(0, 6);
          state.pin = val;
          e.target.value = val;
          updatePinDisplay();
        });
      }
      const onKey = (e) => {
        if (state.step !== 1) return;
        if (e.target && e.target.tagName === 'INPUT' && e.target.id !== 'studentJoinPinInput') return;
        if (/^\d$/.test(e.key)) { e.preventDefault(); handleKeypad(e.key); }
        else if (e.key === 'Backspace') { e.preventDefault(); handleKeypad('⌫'); }
        else if (e.key === 'Enter') { e.preventDefault(); submitStep1(); }
      };
      if (global._scorearKeyHandler) window.removeEventListener('keydown', global._scorearKeyHandler);
      global._scorearKeyHandler = onKey;
      window.addEventListener('keydown', onKey);
    } else if (state.step === 2) {
      const nameInp = containerEl.querySelector('#studentJoinNameInput');
      if (nameInp) {
        nameInp.value = state.name;
        nameInp.focus();
        nameInp.addEventListener('input', (e) => {
          state.name = e.target.value.slice(0, 40);
        });
      }
    }
  }

  function updatePinDisplay() {
    const disp = containerEl ? containerEl.querySelector('#studentPinDisplay') : null;
    if (!disp) return;
    const digits = state.pin.split('');
    const boxes = disp.querySelectorAll('.pin-digit-box');
    boxes.forEach((box, i) => {
      box.textContent = digits[i] || '';
      box.style.borderColor = (i === digits.length) ? '#a855f7' : (digits[i] ? '#7550ef' : 'rgba(255,255,255,0.2)');
    });
  }

  // STEP 1: PIN & Large Virtual Keypad
  function renderStep1Html() {
    const digits = state.pin.split('');
    return `
      <div style="text-align:center;">
        <h3 style="font-size:20px;font-weight:900;color:#ffffff;margin:2px 0 4px;">أدخل رمز القاعة (PIN)</h3>
        <p style="font-size:12px;color:#a5b4fc;margin:0 0 12px;">اكتب الرمز المكون من 6 أرقام والظاهر على شاشة المعلم</p>
        ${state.savedActiveSession ? `
          <div style="background:rgba(117,80,239,0.22);border:1.5px solid #a855f7;border-radius:14px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <div style="text-align:right;">
              <div style="font-size:12px;font-weight:900;color:#fcd34d;">⚡ استعادة الاتصال السريع</div>
              <div style="font-size:11px;color:#e2e8f0;">القاعة: <b>${state.savedActiveSession.pin}</b> | الطالب: <b>${escapeHtml(state.savedActiveSession.name)}</b></div>
            </div>
            <button type="button" onclick="ScoreARStudentJoin.fastReconnect()" style="background:#7550ef;border:none;border-radius:10px;padding:6px 12px;color:#fff;font-weight:900;font-size:12px;cursor:pointer;">دخول سريع ↩</button>
          </div>` : ''}
        <div id="studentPinDisplay" onclick="const inp=document.getElementById('studentJoinPinInput'); if(inp) inp.focus();" style="display:flex;justify-content:center;gap:8px;margin-bottom:14px;direction:ltr;cursor:pointer;">
          ${[0,1,2,3,4,5].map(i => `<div class="pin-digit-box" style="width:44px;height:52px;background:#13152a;border:2px solid ${i===digits.length?'#a855f7':(digits[i]?'#7550ef':'rgba(255,255,255,0.2)')};border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;color:#fcd34d;font-family:monospace;">${digits[i]||''}</div>`).join('')}
        </div>
        <input id="studentJoinPinInput" type="text" inputmode="numeric" maxlength="6" value="${escapeHtml(state.pin)}" style="opacity:0;position:absolute;pointer-events:none;height:0;width:0;">
        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;max-width:320px;margin:0 auto 14px;direction:ltr;">
          ${['1','2','3','4','5','6','7','8','9','C','0','⌫'].map(k => `<button type="button" onclick="ScoreARStudentJoin.handleKeypad('${k}')" class="keypad-btn" style="height:50px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);border-radius:12px;color:${k==='C'?'#f87171':k==='⌫'?'#38bdf8':'#ffffff'};font-size:${k==='⌫'?'20px':'22px'};font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;user-select:none;">${k}</button>`).join('')}
        </div>
        <button type="button" id="studentStep1NextBtn" onclick="ScoreARStudentJoin.submitStep1()" ${state.loading?'disabled':''} class="btn dark full" style="padding:12px;font-size:15px;font-weight:900;border-radius:14px;background:linear-gradient(135deg, #7550ef, #4f46e5);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 16px rgba(117,80,239,0.4);">
          ${state.loading ? '<span style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></span> جارٍ التحقق من القاعة...' : 'دخول ➔'}
        </button>
      </div>
    `;
  }

  // STEP 2: Nickname Input
  function renderStep2Html() {
    return `
      <div>
        <div style="text-align:center;margin-bottom:12px;">
          <h3 style="font-size:20px;font-weight:900;color:#ffffff;margin:2px 0 4px;">اكتب اسمك للمشاركة</h3>
          <p style="font-size:12px;color:#a5b4fc;margin:0;">اسمك مفرد، ثلاثي، أو رقم الفصل ورقمه (مثال: أحمد، أو أحمد صلاح، أو 3/1 رقم 15)</p>
          ${state.isRegistered ? `<span style="display:inline-block;margin-top:6px;background:rgba(52,211,153,0.15);border:1px solid #10b981;color:#34d399;font-size:11px;font-weight:800;padding:2px 10px;border-radius:12px;">✓ تم التعرف على حسابك المسجل</span>` : ''}
        </div>
        <div style="margin-bottom:16px;">
          <label style="display:block;font-size:12px;font-weight:700;color:#c9baff;margin-bottom:6px;">الاسم المستعار في القاعة (1 - 40 حرفاً):</label>
          <input id="studentJoinNameInput" type="text" maxlength="40" placeholder="اكتب اسمك أو رقم فصلك هنا..." style="width:100%;box-sizing:border-box;background:#111426;border:2px solid #7550ef;border-radius:14px;color:#fff;padding:12px 14px;font-size:15px;font-weight:800;outline:none;" onkeydown="if(event.key==='Enter'){event.preventDefault();ScoreARStudentJoin.submitStep2();}">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:#857aa8;margin-top:4px;">
            <span>مسموح: حروف عربي/لاتيني، أرقام، مسافات، شرطات، سلاش</span>
            <span id="studentNameCharCount">أقصى حد: 40</span>
          </div>
        </div>
        <div style="display:flex;gap:10px;">
          <button type="button" onclick="ScoreARStudentJoin.goToStep(1)" style="flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#fff;padding:12px;border-radius:12px;font-weight:800;font-size:13px;cursor:pointer;">⬅ رجوع</button>
          <button type="button" id="studentStep2NextBtn" onclick="ScoreARStudentJoin.submitStep2()" style="flex:2;background:linear-gradient(135deg, #7550ef, #4f46e5);border:none;color:#fff;padding:12px;border-radius:12px;font-weight:900;font-size:14px;cursor:pointer;box-shadow:0 4px 14px rgba(117,80,239,0.4);">دخول ➔</button>
        </div>
      </div>
    `;
  }

  // STEP 3: 20-Character Picker with Live Preview
  function renderStep3Html() {
    const list = (global.ScoreARCharacters && global.ScoreARCharacters.list) ? global.ScoreARCharacters.list : [];
    const currentHero = list.find(c => c.code === state.avatarId) || list[0] || { name: 'البطل', title: 'المستكشف' };
    return `
      <div>
        <div style="text-align:center;margin-bottom:10px;">
          <h3 style="font-size:20px;font-weight:900;color:#ffffff;margin:2px 0 4px;">اختر بطلك الكرتوني</h3>
          <p style="font-size:12px;color:#a5b4fc;margin:0;">اختر من بين 20 بطلاً يمثلك في القاعة ولوحة الشرف</p>
        </div>
        <div style="background:rgba(21,23,49,0.9);border:2px solid #7550ef;border-radius:18px;padding:12px;display:flex;align-items:center;gap:14px;margin-bottom:12px;box-shadow:0 6px 20px rgba(0,0,0,0.4);">
          <div style="width:70px;height:85px;display:flex;align-items:flex-end;justify-content:center;background:rgba(255,255,255,0.05);border-radius:12px;padding:4px;">
            <img id="studentAvatarLiveImg" src="assets/characters/animated/${escapeHtml(state.avatarId)}-idle.webp" onerror="this.src='assets/characters/animated/char_01-idle.webp'" alt="البطل" style="height:80px;object-fit:contain;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.6));">
          </div>
          <div>
            <div id="studentAvatarLiveName" style="font-size:17px;font-weight:900;color:#ffffff;">${escapeHtml(currentHero.name)}</div>
            <div id="studentAvatarLiveTitle" style="font-size:12px;color:#a5b4fc;font-weight:700;">${escapeHtml(currentHero.title)}</div>
            <div style="display:inline-flex;align-items:center;gap:4px;background:rgba(117,80,239,0.25);color:#c9baff;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:800;margin-top:4px;">
              <span>الاسم المختار:</span> <b id="studentSelectedNameReview" style="color:#fcd34d;"></b>
            </div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:8px;max-height:190px;overflow-y:auto;padding-right:4px;margin-bottom:14px;">
          ${list.map((c) => {
            const isSel = (c.code === state.avatarId);
            return `<div class="avatar-card-picker ${isSel?'selected':''}" onclick="ScoreARStudentJoin.selectAvatar('${c.code}')" style="display:flex;flex-direction:column;align-items:center;background:${isSel?'rgba(117,80,239,0.3)':'#16182e'};border:2px solid ${isSel?'#a855f7':'rgba(255,255,255,0.1)'};border-radius:12px;padding:6px 2px;cursor:pointer;transition:transform 0.15s, border-color 0.2s;">
              <img src="assets/characters/animated/${c.code}-idle.webp" loading="lazy" alt="${escapeHtml(c.name)}" style="width:48px;height:58px;object-fit:contain;">
              <span style="font-size:10px;font-weight:800;color:#fff;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:54px;">${escapeHtml(c.name)}</span>
            </div>`;
          }).join('')}
        </div>
        <div style="display:flex;gap:10px;">
          <button type="button" onclick="ScoreARStudentJoin.goToStep(2)" style="flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#fff;padding:12px;border-radius:12px;font-weight:800;font-size:13px;cursor:pointer;">⬅ رجوع</button>
          <button type="button" id="studentStep3FinalBtn" onclick="ScoreARStudentJoin.submitStep3()" ${state.loading?'disabled':''} style="flex:2;background:linear-gradient(135deg, #10b981, #059669);border:none;color:#fff;padding:12px;border-radius:12px;font-weight:900;font-size:14px;cursor:pointer;box-shadow:0 4px 14px rgba(16,185,129,0.4);display:flex;align-items:center;justify-content:center;gap:6px;">
            ${state.loading ? '<span style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></span> جارٍ الدخول...' : 'دخول للوبي 🚀'}
          </button>
        </div>
      </div>
    `;
  }

  function handleKeypad(key) {
    state.error = null;
    if (key === 'C') {
      state.pin = '';
    } else if (key === '⌫' || key === 'backspace') {
      state.pin = state.pin.slice(0, -1);
    } else if (/^\d$/.test(key)) {
      if (state.pin.length < 6) {
        state.pin += key;
      }
    }
    updatePinDisplay();
    const pinInp = containerEl ? containerEl.querySelector('#studentJoinPinInput') : null;
    if (pinInp) pinInp.value = state.pin;
  }

  async function submitStep1() {
    state.error = null;
    const inp = containerEl ? containerEl.querySelector('#studentJoinPinInput') : null;
    const rawVal = (inp && inp.value ? inp.value : state.pin) || '';
    const cleanPin = String(rawVal).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, '').trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      state.error = 'رمز القاعة (PIN) يجب أن يتكون من 6 أرقام تماماً.';
      render();
      return;
    }

    state.pin = cleanPin;
    state.loading = true;
    render();

    try {
      const roomCheck = await verifyRoomOpen(cleanPin);
      if (roomCheck.isClosed) {
        state.error = 'تم إنهاء هذه القاعة من قِبل المعلم.';
        state.loading = false;
        render();
        return;
      }
      if (!roomCheck.exists) {
        state.error = 'القاعة غير موجودة، يرجى التأكد من الرمز الظاهر على شاشة المعلم.';
        state.loading = false;
        render();
        return;
      }
      if (roomCheck.isLocked) {
        state.error = 'هذه القاعة مغلقة حالياً من قبل المعلم ولا تقبل انضمام طلاب جدد.';
        state.loading = false;
        render();
        return;
      }

      state.existingPlayers = roomCheck.players || [];
      state.loading = false;
      state.step = 2;
      render();
    } catch(err) {
      state.loading = false;
      state.error = err.message || 'تعذر التحقق من حالة القاعة، يرجى المحاولة مرة أخرى.';
      render();
    }
  }

  async function verifyRoomOpen(pin) {
    if (global.ScoreARQuizHost && typeof global.ScoreARQuizHost.getPin === 'function') {
      const hPin = global.ScoreARQuizHost.getPin();
      if (hPin === pin) {
        const locked = (typeof global.ScoreARQuizHost.isLocked === 'function') ? global.ScoreARQuizHost.isLocked() : false;
        const players = (global.ScoreARQuizHost.getPlayers ? global.ScoreARQuizHost.getPlayers() : []);
        return { exists: true, isLocked: locked, players };
      }
    }
    try {
      const db = (global.ScoreARAuth && global.ScoreARAuth.getDb) ? global.ScoreARAuth.getDb() : (global.firebase && global.firebase.database ? global.firebase.database() : null);
      if (db) {
        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('DB_TIMEOUT')), 1500));
        const [snapStatus, snapLock, snapEvents] = await Promise.all([
          Promise.race([db.ref('rooms/' + pin + '/status').once('value'), timeout]).catch(() => null),
          Promise.race([db.ref('rooms/' + pin + '/isLocked').once('value'), timeout]).catch(() => null),
          Promise.race([db.ref('scorear_rooms/' + pin).once('value'), timeout]).catch(() => null)
        ]);
        if (snapStatus && snapStatus.exists()) {
          const sVal = snapStatus.val();
          if (sVal === 'closed') return { exists: false, isClosed: true };
          const isLocked = snapLock && snapLock.exists() ? !!snapLock.val() : false;
          return { exists: true, isLocked, players: [] };
        }
        if (snapEvents && snapEvents.exists() && snapEvents.hasChildren()) {
          const evs = Object.values(snapEvents.val() || {}).filter(Boolean).sort((a,b) => (a._timestamp||0) - (b._timestamp||0));
          const lastOpen = evs.slice().reverse().find(e => e.type === 'ROOM_OPENED');
          const lastClose = evs.slice().reverse().find(e => e.type === 'ROOM_CLOSED');
          if (lastClose && (!lastOpen || (lastClose._timestamp||0) > (lastOpen._timestamp||0))) {
            return { exists: false, isClosed: true };
          }
          const lastLock = evs.slice().reverse().find(e => e.type === 'ROOM_LOCK_STATE' || e.type === 'ROOM_LOCKED' || e.type === 'ROOM_UNLOCKED');
          const isLocked = lastLock ? (lastLock.type !== 'ROOM_UNLOCKED' && !!(lastLock.isLocked || lastLock.locked)) : false;
          return { exists: true, isLocked, players: [] };
        }
      }
    } catch(e) {}
    return { exists: true, isLocked: false, players: [] };
  }

  function submitStep2() {
    state.error = null;
    const rawName = (state.name || '').trim();

    if (!rawName) {
      state.error = 'يرجى كتابة اسمك أو رقم فصلك للدخول.';
      render();
      return;
    }

    if (!NAME_REGEX.test(rawName)) {
      state.error = 'الاسم يمكن أن يحتوي على حروف وأرقام ومسافات وشرطات ونقاط وسلاش فقط (1 إلى 40 حرفاً).';
      render();
      return;
    }

    // Deduplication against existing players in the room
    const deduped = deduplicateName(rawName, state.existingPlayers);
    state.name = deduped;
    state.step = 3;
    render();

    // Fill selected name preview strictly via textContent
    setTimeout(() => {
      const reviewEl = containerEl ? containerEl.querySelector('#studentSelectedNameReview') : null;
      if (reviewEl) reviewEl.textContent = state.name;
    }, 50);
  }

  function deduplicateName(name, existingList) {
    if (!existingList || !Array.isArray(existingList) || existingList.length === 0) return name;
    const base = name.replace(/\s*\(\d+\)$/, '').trim();
    let candidate = name.trim();
    let count = 2;
    const isTaken = (n) => existingList.some(p => p && p.name && p.name.trim() === n);
    if (isTaken(candidate)) {
      while (isTaken(`${base} (${count})`)) {
        count++;
      }
      candidate = `${base} (${count})`;
    }
    return candidate;
  }

  function selectAvatar(avatarId) {
    state.avatarId = avatarId;
    const img = containerEl ? containerEl.querySelector('#studentAvatarLiveImg') : null;
    const nameEl = containerEl ? containerEl.querySelector('#studentAvatarLiveName') : null;
    const titleEl = containerEl ? containerEl.querySelector('#studentAvatarLiveTitle') : null;

    const list = (global.ScoreARCharacters && global.ScoreARCharacters.list) ? global.ScoreARCharacters.list : [];
    const hero = list.find(c => c.code === avatarId) || { name: 'البطل', title: 'المستكشف' };

    if (img) img.src = `assets/characters/animated/${avatarId}-idle.webp`;
    if (nameEl) nameEl.textContent = hero.name;
    if (titleEl) titleEl.textContent = hero.title;

    const cards = containerEl ? containerEl.querySelectorAll('.avatar-card-picker') : [];
    cards.forEach(card => {
      const isSel = card.getAttribute('onclick')?.includes(avatarId);
      card.style.borderColor = isSel ? '#a855f7' : 'rgba(255,255,255,0.1)';
      card.style.background = isSel ? 'rgba(117,80,239,0.3)' : '#16182e';
    });
  }

  async function submitStep3() {
    state.error = null;
    state.loading = true;
    render();

    try {
      const student = await global.ScoreARAuth.joinStudent(state.pin, state.name, state.avatarId);
      if (state.isReconnect && state.savedActiveSession && state.savedActiveSession.uid) {
        student.uid = state.savedActiveSession.uid;
        student.isReconnect = true;
      }
      if (global.closeModal) global.closeModal();
      if (global.toast) global.toast(`مرحباً بك يا ${state.name}! تم الانضمام للقاعة بنجاح 🌟`);

      if (global.ScoreARQuizStudent) {
        global.ScoreARQuizStudent.startStudentSession(state.pin, student);
      } else if (global.renderLiveLobby) {
        global.renderLiveLobby(global.currentLobbyWorldId || 'royal', state.pin);
      }
    } catch(err) {
      state.loading = false;
      state.error = (global.ScoreARAuth && global.ScoreARAuth.mapAuthError) ? global.ScoreARAuth.mapAuthError(err) : err.message;
      render();
    }
  }

  function goToStep(stepNum) {
    state.error = null;
    state.step = stepNum;
    render();
    if (stepNum === 3) {
      setTimeout(() => {
        const reviewEl = containerEl ? containerEl.querySelector('#studentSelectedNameReview') : null;
        if (reviewEl) reviewEl.textContent = state.name;
      }, 50);
    }
  }

  function fastReconnect() {
    if (state.savedActiveSession) {
      state.pin = state.savedActiveSession.pin;
      state.name = state.savedActiveSession.name;
      state.avatarId = state.savedActiveSession.avatarId || 'char_01';
      submitStep3();
    }
  }

  function openJoinModal(initialPin = '') {
    if (typeof global.openModal === 'function') {
      global.openModal('انضم إلى قاعة الاختبار 🎮', '<div id="scorearStudentJoinMount" style="padding:4px 0;"></div>');
      const mount = document.getElementById('scorearStudentJoinMount');
      if (mount) {
        init(mount, initialPin);
      }
    }
  }

  const ScoreARStudentJoin = {
    init,
    openJoinModal,
    goToStep,
    handleKeypad,
    submitStep1,
    submitStep2,
    submitStep3,
    selectAvatar,
    deduplicateName,
    fastReconnect
  };

  global.ScoreARStudentJoin = ScoreARStudentJoin;
  try { if (typeof globalThis !== 'undefined') globalThis.ScoreARStudentJoin = ScoreARStudentJoin; } catch(e){}
  if (typeof module !== 'undefined' && module.exports) module.exports = ScoreARStudentJoin;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
