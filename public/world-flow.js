/**
 * ScoreAR World Flow & Room Setup Wizard (world-flow.js)
 * Phase A: Worlds Experience & Controlled Room Launcher
 * Rules:
 *   1. Selecting a world does NOT launch room directly.
 *   2. Guests/Students: Read-only showcase (description + video preview) with «ادخل لتبدأ كمعلم».
 *   3. Teachers: 3-step Wizard: Choose World -> Choose Content -> Launch Room, with persistent state & back/forward navigation.
 *   4. Uses single helper getCurrentRole() reading current session (ready for Phase B).
 *   5. Non-functional cosmetic items displayed disabled with «قريبًا» badge.
 * Strictly Rule 7 Compliant (<500 lines).
 */
(function(global) {
  'use strict';

  function escapeHtml(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  const WORLDS_DATA = [
    { id: 'royal', name: 'القصر الملكي الأندلسي', tag: 'تاريخ وأصالة', image: 'royal_palace', desc: 'أجواء أندلسية فاخرة بنقوش هندسية وموسيقى عربية عريقة تناسب تحديات النحو والبلاغة.' },
    { id: 'oasis', name: 'واحة النخيل والرمال', tag: 'بيئة عربية', image: 'desert_oasis', desc: 'كثبان ذهبية ونخيل ومخيم بدوي أصيل تحت سماء مرصعة بالنجوم.' },
    { id: 'cosmic', name: 'محطة الفضاء العربية', tag: 'خيال ومستقبل', image: 'space_station', desc: 'سفينة مدارية حديثة تدور حول كوكب مستقبلي بألوان نيون بنفسجية مشعة.' },
    { id: 'treasure', name: 'جزيرة الكنز الأسطورية', tag: 'مغامرة واستكشاف', image: 'treasure_island', desc: 'شواطئ استوائية، سفن شراعية، وقناديل ذهبية طافية لسباق المعرفة.' },
    { id: 'stadium', name: 'استاد الأبطال الرياضي', tag: 'منافسة وحماس', image: 'sports_stadium', desc: 'ملعب أولمبي ضخم وأضواء كاشفة ومدرجات تهتف للحماس والسرعة.' },
    { id: 'magic', name: 'المملكة السحرية العائمة', tag: 'سحر وفانتازيا', image: 'magic_kingdom', desc: 'جزر طافية في السحاب وبلورات كريستالية مشعة لأجواء أسطورية مبتكرة.' }
  ];

  let wizardState = {
    step: 1, // 1: world, 2: content, 3: launch
    worldId: 'royal',
    quizId: 'grammar_naat',
    quizTitle: 'مسار النعت وأقسامه (المفرد والجملة)',
    questionCount: 5
  };

  function getCurrentRole() {
    if (global.ScoreARAuth && typeof global.ScoreARAuth.getUser === 'function') {
      const u = global.ScoreARAuth.getUser();
      if (u && (u.role === 'admin' || u.role === 'teacher')) return 'teacher';
      if (u && u.role === 'student') return 'student';
    }
    try {
      const raw = localStorage.getItem('scorear_teacher_session') || sessionStorage.getItem('scorear_teacher_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.role === 'teacher' || parsed.role === 'admin')) return 'teacher';
      }
    } catch (e) {}
    return 'guest';
  }

  function getWorld(worldId) {
    return WORLDS_DATA.find(w => w.id === worldId) || WORLDS_DATA[0];
  }

  function getOrCreateModal() {
    let el = document.getElementById('scorearWorldFlowModal');
    if (!el) {
      el = document.createElement('dialog');
      el.id = 'scorearWorldFlowModal';
      el.style.cssText = 'border:none;background:transparent;padding:0;margin:auto;max-width:820px;width:94%;border-radius:24px;box-shadow:0 25px 60px rgba(0,0,0,0.8);color:#fff;font-family:Cairo,Tajawal,sans-serif;direction:rtl;';
      document.body.appendChild(el);
      el.addEventListener('click', (e) => {
        if (e.target === el) closeWorldModal();
      });
    }
    return el;
  }

  function closeWorldModal() {
    const el = document.getElementById('scorearWorldFlowModal');
    if (el && el.open) el.close();
  }

  async function openWorld(worldId) {
    const role = getCurrentRole();
    const world = getWorld(worldId);
    wizardState.worldId = world.id;
    try { localStorage.setItem('scorear_last_world', world.id); } catch(e){}

    if (role === 'teacher') {
      if (global.ScoreARWorldContentPicker && typeof global.ScoreARWorldContentPicker.openContentPicker === 'function') {
        await global.ScoreARWorldContentPicker.openContentPicker({ worldId: world.id });
      } else {
        wizardState.step = 2;
        renderTeacherWizardModal();
      }
    } else {
      renderGuestShowcaseModal(world);
    }
  }

  // --- 1. GUEST & STUDENT SHOWCASE MODAL (Read-Only) ---
  function renderGuestShowcaseModal(world) {
    const modal = getOrCreateModal();
    modal.innerHTML = `
      <div style="background:radial-gradient(circle at top right, rgba(142,100,239,0.25), rgba(21,23,49,0.98));border:1.5px solid rgba(142,100,239,0.4);border-radius:24px;padding:28px 24px;text-align:right;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:28px;">🪐</span>
            <div>
              <h2 style="font-size:22px;font-weight:900;margin:0;color:#fff;">${world.name}</h2>
              <span style="background:rgba(142,100,239,0.25);color:#dcd2ff;font-size:11px;font-weight:800;padding:2px 10px;border-radius:8px;">${world.tag}</span>
            </div>
          </div>
          <button onclick="ScoreARWorldFlow.closeWorldModal()" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#fff;border-radius:12px;padding:6px 14px;cursor:pointer;font-family:inherit;font-weight:700;">✕ إغلاق</button>
        </div>

        <div style="border-radius:18px;overflow:hidden;position:relative;margin-bottom:18px;max-height:280px;border:1px solid rgba(255,255,255,0.1);">
          <img src="assets/${world.image}.webp" alt="${world.name}" style="width:100%;height:100%;object-fit:cover;display:block;">
          <div style="position:absolute;inset:0;background:linear-gradient(to top, rgba(10,11,26,0.9) 0%, transparent 60%);"></div>
          <div style="position:absolute;bottom:16px;right:16px;left:16px;">
            <p style="margin:0;font-size:14px;color:#ddd8ff;line-height:1.6;">${world.desc}</p>
          </div>
        </div>

        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px;margin-bottom:22px;">
          <div style="font-size:13px;font-weight:800;color:#fcd34d;margin-bottom:6px;">ℹ️ وضع المعاينة والاستكشاف</div>
          <p style="font-size:12px;color:#a89bff;margin:0;line-height:1.6;">
            أنت تستكشف العالم كـ زائر/طالب. فتح القاعات الحية وبدء المنافسات الجماعية مع الطلاب متاح للمعلم المسجل.
          </p>
        </div>

        <div style="display:flex;gap:12px;justify-content:flex-end;flex-wrap:wrap;">
          <button onclick="if(window.preview)window.preview('${world.id}');ScoreARWorldFlow.closeWorldModal();" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);color:#fff;border-radius:12px;padding:12px 20px;font-weight:800;cursor:pointer;font-family:inherit;">
            🎬 معاينة الفيديو
          </button>
          <button onclick="ScoreARWorldFlow.closeWorldModal();if(window.openTeacherLoginModal)window.openTeacherLoginModal();" style="background:linear-gradient(135deg, #8e64ef, #6d28d9);color:#fff;border:none;border-radius:12px;padding:12px 24px;font-weight:900;cursor:pointer;font-family:inherit;">
            ادخل لتبدأ كمعلم 🚀
          </button>
        </div>
      </div>
    `;
    if (!modal.open) modal.showModal();
  }

  // --- 2. TEACHER 3-STEP WIZARD MODAL ---
  function renderTeacherWizardModal() {
    const modal = getOrCreateModal();
    const curWorld = getWorld(wizardState.worldId);

    const stepHeaders = [
      { num: 1, title: 'اختر العالم' },
      { num: 2, title: 'اختر المحتوى' },
      { num: 3, title: 'إطلاق القاعة' }
    ];

    let bodyHtml = '';

    // STEP 1: Select World
    if (wizardState.step === 1) {
      bodyHtml = `
        <div style="margin-bottom:18px;">
          <h4 style="font-size:16px;font-weight:900;color:#fff;margin:0 0 10px 0;">اختر بيئة القاعة التفاعلية:</h4>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:12px;">
            ${WORLDS_DATA.map(w => `
              <div onclick="ScoreARWorldFlow.setWizardWorld('${w.id}')" style="cursor:pointer;border:2px solid ${w.id === wizardState.worldId ? '#8e64ef' : 'rgba(255,255,255,0.1)'};background:${w.id === wizardState.worldId ? 'rgba(142,100,239,0.25)' : 'rgba(255,255,255,0.03)'};border-radius:16px;padding:8px;text-align:center;transition:all 0.15s;">
                <img src="assets/${w.image}.webp" alt="${w.name}" style="width:100%;height:70px;object-fit:cover;border-radius:10px;margin-bottom:6px;">
                <div style="font-size:12px;font-weight:800;color:#fff;">${w.name}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // STEP 2: Select Content
    else if (wizardState.step === 2) {
      const QUIZZES = [
        { id: 'grammar_naat', title: 'مسار النعت وأقسامه (المفرد والجملة)', count: 5, category: 'النحو العربي' },
        { id: 'rhetoric_intro', title: 'مسار التشبيه والاستعارة (الجمال البلاغي)', count: 4, category: 'البلاغة والبيان' },
        { id: 'spelling_rules', title: 'مسار قواعد الإملاء والرسم الكتابي', count: 4, category: 'الإملاء والرسم' },
        { id: 'custom_quiz_bank', title: 'بنك أسئلة القاعة التفاعلية المختارة', count: 10, category: 'بنك الأسئلة' }
      ];

      bodyHtml = `
        <div style="margin-bottom:18px;">
          <h4 style="font-size:16px;font-weight:900;color:#fff;margin:0 0 10px 0;">اختر المسابقة أو المحتوى التعليمي للقاعة:</h4>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${QUIZZES.map(q => `
              <div onclick="ScoreARWorldFlow.setWizardQuiz('${q.id}', '${q.title}', ${q.count})" style="cursor:pointer;border:2px solid ${q.id === wizardState.quizId ? '#10b981' : 'rgba(255,255,255,0.1)'};background:${q.id === wizardState.quizId ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.03)'};border-radius:16px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
                <div>
                  <span style="font-size:11px;color:#a89bff;font-weight:700;">${q.category}</span>
                  <div style="font-size:15px;font-weight:900;color:#fff;margin-top:2px;">${q.title}</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="background:rgba(255,255,255,0.08);color:#dcd2ff;font-size:12px;font-weight:800;padding:4px 10px;border-radius:8px;">${q.count} أسئلة</span>
                  <span style="color:${q.id === wizardState.quizId ? '#34d399' : '#666'};font-size:18px;">${q.id === wizardState.quizId ? '✓' : '○'}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // STEP 3: Confirm & Launch Room
    else if (wizardState.step === 3) {
      bodyHtml = `
        <div style="margin-bottom:20px;">
          <h4 style="font-size:16px;font-weight:900;color:#fff;margin:0 0 12px 0;">جاهز للانطلاق! راجع إعدادات القاعة:</h4>
          <div style="background:rgba(255,255,255,0.04);border:1.5px solid rgba(142,100,239,0.3);border-radius:18px;padding:18px;display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
            <div>
              <div style="font-size:12px;color:#a89bff;">العالم المختار:</div>
              <div style="font-size:16px;font-weight:900;color:#fff;margin-top:2px;">🪐 ${curWorld.name}</div>
            </div>
            <div>
              <div style="font-size:12px;color:#a89bff;">المحتوى المختار:</div>
              <div style="font-size:16px;font-weight:900;color:#fcd34d;margin-top:2px;">📖 ${wizardState.quizTitle}</div>
            </div>
          </div>

          <div style="background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.12);border-radius:16px;padding:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <span style="font-size:13px;color:#8e8ca8;">النمط التنافسي المباشر:</span>
            <span style="background:rgba(255,255,255,0.05);color:#8e8ca8;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:700;">مفعّل تلقائيًا (حي وآني)</span>
          </div>

          <div style="margin-top:10px;background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.12);border-radius:16px;padding:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <span style="font-size:13px;color:#8e8ca8;">نمط الفرق الموسع:</span>
            <span style="background:rgba(245,158,11,0.15);color:#fcd34d;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:800;">⚡ قريبًا في التحديث القادم</span>
          </div>
        </div>
      `;
    }

    modal.innerHTML = `
      <div style="background:radial-gradient(circle at top right, rgba(142,100,239,0.25), rgba(21,23,49,0.98));border:1.5px solid rgba(142,100,239,0.4);border-radius:24px;padding:26px 24px;text-align:right;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:24px;">🚀</span>
            <div>
              <h2 style="font-size:19px;font-weight:900;margin:0;color:#fff;">معالج تجهيز القاعة التفاعلية</h2>
              <span style="color:#a89bff;font-size:12px;">الخطوة ${wizardState.step} من 3: ${stepHeaders[wizardState.step - 1].title}</span>
            </div>
          </div>
          <button onclick="ScoreARWorldFlow.closeWorldModal()" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#fff;border-radius:12px;padding:6px 14px;cursor:pointer;font-family:inherit;font-weight:700;">✕ إغلاق</button>
        </div>

        <!-- Wizard Steps Indicator -->
        <div style="display:flex;gap:8px;margin-bottom:20px;">
          ${stepHeaders.map(s => `
            <div style="flex:1;height:6px;border-radius:6px;background:${s.num <= wizardState.step ? '#8e64ef' : 'rgba(255,255,255,0.1)'};transition:background 0.2s;"></div>
          `).join('')}
        </div>

        ${bodyHtml}

        <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.08);padding-top:16px;">
          <div>
            ${wizardState.step > 1 ? `
              <button onclick="ScoreARWorldFlow.prevStep()" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#fff;border-radius:12px;padding:10px 20px;font-weight:800;cursor:pointer;font-family:inherit;">
                ➔ السابق
              </button>
            ` : ''}
          </div>
          <div>
            ${wizardState.step < 3 ? `
              <button onclick="ScoreARWorldFlow.nextStep()" style="background:linear-gradient(135deg, #8e64ef, #6d28d9);color:#fff;border:none;border-radius:12px;padding:10px 24px;font-weight:900;cursor:pointer;font-family:inherit;">
                التالي: ${stepHeaders[wizardState.step].title} ➔
              </button>
            ` : `
              <button onclick="ScoreARWorldFlow.launchRoomNow()" style="background:linear-gradient(135deg, #10b981, #059669);color:#fff;border:none;border-radius:12px;padding:12px 30px;font-weight:900;font-size:15px;cursor:pointer;font-family:inherit;">
                إطلاق القاعة الآن 🚀
              </button>
            `}
          </div>
        </div>
      </div>
    `;
    if (!modal.open) modal.showModal();
  }

  function setWizardWorld(worldId) {
    wizardState.worldId = worldId;
    renderTeacherWizardModal();
  }

  function setWizardQuiz(quizId, quizTitle, count) {
    wizardState.quizId = quizId;
    wizardState.quizTitle = quizTitle;
    wizardState.questionCount = count;
    renderTeacherWizardModal();
  }

  function nextStep() {
    if (wizardState.step < 3) {
      wizardState.step += 1;
      renderTeacherWizardModal();
    }
  }

  function prevStep() {
    if (wizardState.step > 1) {
      wizardState.step -= 1;
      renderTeacherWizardModal();
    }
  }

  let activePickerCallback = null;
  let activeSelectedWorldId = 'royal';

  function openWorldPicker(options = {}) {
    activePickerCallback = options.onConfirm || null;
    activeSelectedWorldId = options.defaultWorldId || localStorage.getItem('scorear_last_world') || wizardState.worldId || 'royal';
    const modal = getOrCreateModal();

    function renderPicker() {
      const curWorld = getWorld(activeSelectedWorldId);
      modal.innerHTML = `
        <div style="background:radial-gradient(circle at top right, rgba(142,100,239,0.32), rgba(15,16,33,0.98));border:1.5px solid #8e64ef;border-radius:24px;padding:26px 24px;text-align:right;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:12px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:26px;">🪐</span>
              <div>
                <h3 style="font-size:19px;font-weight:900;color:#fff;margin:0;">اختر عالم المنافسة التفاعلي</h3>
                <span style="font-size:12px;color:#a89bff;">${options.quizTitle ? `المسابقة: ${escapeHtml(options.quizTitle)} • ` : ''}حدد البيئة الحية للقاعة</span>
              </div>
            </div>
            <button onclick="ScoreARWorldFlow.closeWorldModal()" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);color:#fff;border-radius:10px;padding:6px 12px;cursor:pointer;">✕</button>
          </div>

          <!-- Video Preview Window -->
          <div style="position:relative;width:100%;height:190px;border-radius:18px;overflow:hidden;margin-bottom:16px;box-shadow:0 8px 24px rgba(0,0,0,0.5);border:1.5px solid rgba(142,100,239,0.4);">
            <video id="worldPickerVideo" autoplay loop muted playsinline poster="assets/worlds/${curWorld.id}/lobby.jpg" style="width:100%;height:100%;object-fit:cover;">
              <source src="assets/videos/worlds/${curWorld.id}.mp4" type="video/mp4">
            </video>
            <div style="position:absolute;inset:0;background:linear-gradient(to top, rgba(10,11,26,0.92) 0%, transparent 60%);"></div>
            <div style="position:absolute;bottom:12px;right:16px;left:16px;display:flex;align-items:center;justify-content:space-between;">
              <div>
                <h4 style="margin:0;color:#fff;font-size:17px;font-weight:900;">${curWorld.name}</h4>
                <p style="margin:2px 0 0;font-size:12px;color:#c9baff;">${curWorld.desc}</p>
              </div>
              <span style="background:rgba(142,100,239,0.35);border:1px solid #a855f7;color:#fcd34d;font-size:11px;font-weight:800;padding:4px 10px;border-radius:10px;">${curWorld.tag}</span>
            </div>
          </div>

          <!-- 6 Worlds Cards Grid -->
          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;margin-bottom:20px;">
            ${WORLDS_DATA.map(w => {
              const isSel = (w.id === activeSelectedWorldId);
              return `
                <div onclick="ScoreARWorldFlow.selectPickerWorld('${w.id}')" style="cursor:pointer;border:2px solid ${isSel ? '#8e64ef' : 'rgba(255,255,255,0.1)'};background:${isSel ? 'rgba(142,100,239,0.3)' : 'rgba(255,255,255,0.03)'};border-radius:14px;padding:8px;text-align:center;transition:all 0.15s;transform:${isSel ? 'scale(1.02)' : 'scale(1)'};box-shadow:${isSel ? '0 0 16px rgba(142,100,239,0.5)' : 'none'};">
                  <img src="assets/${w.image}.webp" alt="${w.name}" style="width:100%;height:65px;object-fit:cover;border-radius:10px;margin-bottom:4px;">
                  <div style="font-size:12px;font-weight:900;color:${isSel ? '#fcd34d' : '#fff'};">${w.name}</div>
                </div>`;
            }).join('')}
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.1);padding-top:14px;">
            <button type="button" onclick="ScoreARWorldFlow.closeWorldModal()" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:10px 18px;border-radius:12px;font-weight:800;font-size:13px;cursor:pointer;">إلغاء ✕</button>
            <button type="button" onclick="ScoreARWorldFlow.confirmPickerWorld()" style="background:linear-gradient(135deg, #10b981, #059669);border:none;color:#fff;padding:12px 28px;border-radius:14px;font-weight:900;font-size:14px;cursor:pointer;box-shadow:0 4px 18px rgba(16,185,129,0.4);display:flex;align-items:center;gap:8px;">
              <span>انطلاق بهذا العالم 🚀</span>
            </button>
          </div>
        </div>
      `;
      if (!modal.open) modal.showModal();
    }

    renderPicker();
  }

  function selectPickerWorld(worldId) {
    activeSelectedWorldId = worldId;
    wizardState.worldId = worldId;
    const v = document.getElementById('worldPickerVideo');
    if (v) {
      v.src = `assets/videos/worlds/${worldId}.mp4`;
      v.poster = `assets/worlds/${worldId}/lobby.jpg`;
      v.play().catch(() => {});
    }
    const cards = document.querySelectorAll('#scorearWorldFlowModal [onclick*="selectPickerWorld"]');
    cards.forEach(c => {
      const isSel = c.getAttribute('onclick').includes(worldId);
      c.style.borderColor = isSel ? '#8e64ef' : 'rgba(255,255,255,0.1)';
      c.style.background = isSel ? 'rgba(142,100,239,0.3)' : 'rgba(255,255,255,0.03)';
      c.style.transform = isSel ? 'scale(1.02)' : 'scale(1)';
      c.style.boxShadow = isSel ? '0 0 16px rgba(142,100,239,0.5)' : 'none';
    });
  }

  function confirmPickerWorld() {
    closeWorldModal();
    const chosen = activeSelectedWorldId || 'royal';
    try { localStorage.setItem('scorear_last_world', chosen); } catch(e){}
    const proceed = (wId) => {
      const finalW = wId || chosen;
      if (typeof activePickerCallback === 'function') {
        activePickerCallback(finalW);
      } else {
        launchRoomNow(finalW);
      }
    };
    if (global.ScoreARGameModes && typeof global.ScoreARGameModes.openModePicker === 'function') {
      global.ScoreARGameModes.openModePicker({
        worldId: chosen,
        pin: global.currentLobbyPin || null,
        onConfirm: (wId) => proceed(wId || chosen)
      });
      return;
    }
    proceed(chosen);
  }

  function launchRoomNow(overrideWorldId) {
    closeWorldModal();
    const worldId = overrideWorldId || wizardState.worldId || activeSelectedWorldId || 'royal';
    const pin = (typeof global.currentLobbyPin === 'string' && /^\d{6}$/.test(global.currentLobbyPin)) ? global.currentLobbyPin : String(Math.floor(100000 + Math.random() * 900000));
    global.currentLobbyPin = pin;
    const doLaunch = (targetWorld) => {
      const w = targetWorld || worldId;
      if (typeof global.renderLiveLobby === 'function') {
        global.renderLiveLobby(w, pin, true);
      } else if (global.ScoreARQuizHost && typeof global.ScoreARQuizHost.startHostLobby === 'function') {
        global.ScoreARQuizHost.startHostLobby(w, pin, true);
      } else {
        window.location.hash = '#worlds';
      }
    };
    if (!overrideWorldId && global.ScoreARGameModes && typeof global.ScoreARGameModes.openModePicker === 'function') {
      global.ScoreARGameModes.openModePicker({
        worldId: worldId,
        pin: pin,
        onConfirm: (wId) => doLaunch(wId || worldId)
      });
      return;
    }
    doLaunch(worldId);
  }

  // Intercept world launch clicks
  function initWorldFlowInterceptors() {
    if (typeof document === 'undefined') return;
    document.addEventListener('click', (e) => {
      const launchBtn = e.target.closest('[data-action="launchworld"]');
      if (launchBtn) {
        e.preventDefault();
        e.stopPropagation();
        const worldId = launchBtn.getAttribute('data-world') || 'royal';
        openWorld(worldId);
        return;
      }

      const setupBtn = e.target.closest('[data-action="setup"]');
      if (setupBtn) {
        e.preventDefault();
        e.stopPropagation();
        const worldId = setupBtn.getAttribute('data-world') || 'royal';
        openWorld(worldId);
      }
    }, true); // capture phase to intercept before app.js
  }

  const WorldFlowAPI = {
    WORLDS_DATA,
    getCurrentRole,
    getWorld,
    openWorld,
    openWorldPicker,
    selectPickerWorld,
    confirmPickerWorld,
    closeWorldModal,
    setWizardWorld,
    setWizardQuiz,
    nextStep,
    prevStep,
    launchRoomNow,
    getWizardState: () => ({ ...wizardState })
  };

  global.ScoreARWorldFlow = WorldFlowAPI;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initWorldFlowInterceptors);
    } else {
      initWorldFlowInterceptors();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorldFlowAPI;
  }
})(typeof window !== 'undefined' ? window : globalThis);
