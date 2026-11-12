/**
 * ScoreAR Registration UI Module (Teacher & Student Registration Modals + Privacy Notice)
 * Complies with Phase B specifications, Rule 6 (Visual Identity), Rule 7 (<500 lines)
 */
(function(global) {
  'use strict';

  const $ = selector => document.querySelector(selector);
  let selectedStudentAvatar = 'char_01';

  function getModalElements() {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    return { modal, modalTitle, modalBody };
  }

  // --- 1. Teacher Registration Modal ---
  function openTeacherRegistrationModal() {
    const { modal, modalTitle, modalBody } = getModalElements();
    if (!modal || !modalBody) return;

    if (modalTitle) modalTitle.textContent = 'تسجيل معلم جديد 👨‍🏫';
    modalBody.innerHTML = `
      <div class="modal-body-pad" style="text-align:right;">
        <div style="text-align:center;margin-bottom:14px;">
          <div style="width:72px;height:72px;margin:0 auto 10px;border-radius:20px;border:2px solid #8e64ef;box-shadow:0 0 20px rgba(142,100,239,0.35);overflow:hidden;background:#1b1c33;">
            <img src="assets/characters/teacher_ahmed.webp?v=20261106_real" alt="معلم سكور آر" style="width:100%;height:100%;object-fit:cover;">
          </div>
          <h3 style="color:#ffffff;font-size:18px;font-weight:900;margin-bottom:4px;">انضم إلى كادر معلّمي سكور آر</h3>
          <p style="color:#b1a2e9;font-size:12px;margin-bottom:0;">أنشئ حسابك وسيتولى فريق الإدارة مراجعته واعتماده لتفعيل صلاحيات الاستوديو.</p>
        </div>

        <form id="teacherRegisterForm" onsubmit="ScoreARRegisterUI.submitTeacherRegister(event)" style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <label style="display:block;color:#ddd8ff;font-size:12px;font-weight:700;margin-bottom:6px;">الاسم الكامل (ثلاثي):</label>
            <input class="field" id="trName" type="text" placeholder="أ. أحمد صلاح رميح" required style="width:100%;border-radius:12px;font-weight:700;font-size:14px;background:#111426;">
          </div>

          <div>
            <label style="display:block;color:#ddd8ff;font-size:12px;font-weight:700;margin-bottom:6px;">البريد الإلكتروني المعتمد:</label>
            <input class="field" id="trEmail" type="email" placeholder="teacher@example.com" required dir="ltr" style="text-align:right;width:100%;border-radius:12px;font-weight:700;font-size:14px;background:#111426;">
          </div>

          <div>
            <label style="display:block;color:#ddd8ff;font-size:12px;font-weight:700;margin-bottom:6px;">كلمة المرور (8 خانات أو أكثر):</label>
            <div style="position:relative;">
              <input class="field" id="trPassword" type="password" placeholder="••••••••" minlength="8" required dir="ltr" style="text-align:left;letter-spacing:2px;font-weight:800;font-size:15px;background:#111426;border-radius:12px;padding-inline-end:44px;width:100%;">
              <button type="button" onclick="ScoreARRegisterUI.toggleFieldPass('trPassword', this)" style="position:absolute;inset-inline-end:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:#a1a4be;cursor:pointer;padding:6px;font-size:15px;">👁️</button>
            </div>
            <small style="color:#94a3b8;font-size:11px;display:block;margin-top:4px;">يجب أن تتكون من 8 خانات على الأقل لضمان أمان حسابك.</small>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div>
              <label style="display:block;color:#ddd8ff;font-size:12px;font-weight:700;margin-bottom:6px;">مادة التدريس:</label>
              <input class="field" id="trSubject" type="text" placeholder="اللغة العربية" required style="width:100%;border-radius:12px;font-weight:700;font-size:13px;background:#111426;">
            </div>
            <div>
              <label style="display:block;color:#ddd8ff;font-size:12px;font-weight:700;margin-bottom:6px;">المدرسة (اختياري):</label>
              <input class="field" id="trSchool" type="text" placeholder="مدرسة الأمل" style="width:100%;border-radius:12px;font-weight:700;font-size:13px;background:#111426;">
            </div>
          </div>

          <div style="background:rgba(142,100,239,0.12);border:1px solid rgba(142,100,239,0.3);border-radius:12px;padding:10px;font-size:11px;color:#c9baff;line-height:1.5;">
            ℹ️ <b>ملاحظة هامة:</b> ستكون حالة الحساب فور التسجيل <b>«قيد المراجعة»</b>، وسيتم إرسال بريد تفعيل إلى بريدك. يتطلب دخول الاستوديو موافقة الإدارة وضبط الصلاحيات.
          </div>

          <div id="trErrorBox" style="display:none;color:#ff8a8a;font-size:13px;text-align:center;background:rgba(255,107,107,0.15);padding:10px;border-radius:12px;border:1px solid rgba(255,107,107,0.3);line-height:1.5;"></div>

          <button class="btn dark full" id="trSubmitBtn" type="submit" style="margin-top:6px;font-weight:900;font-size:15px;padding:12px;border-radius:12px;background:linear-gradient(135deg, #7550ef, #8e64ef);">
            إرسال طلب التسجيل للمراجعة 🚀
          </button>

          <div style="text-align:center;margin-top:4px;">
            <button type="button" onclick="ScoreARAuthUI.openUnifiedLoginModal()" style="background:none;border:none;color:#52d9ed;font-size:12px;cursor:pointer;text-decoration:underline;">لديك حساب بالفعل؟ تسجيل الدخول</button>
          </div>
        </form>
      </div>
    `;

    if (!modal.open) modal.showModal();
    if (typeof global.hydrate === 'function') global.hydrate(modal);
    setTimeout(() => { $('#trName')?.focus(); }, 100);
  }

  // --- 2. Student Registration Modal ---
  function openStudentRegistrationModal() {
    const { modal, modalTitle, modalBody } = getModalElements();
    if (!modal || !modalBody) return;

    selectedStudentAvatar = 'char_01';
    if (modalTitle) modalTitle.textContent = 'تسجيل طالب جديد 🎯';

    // Roster cards preview (first 6 for quick selection)
    const heroes = [
      { id: 'char_01', name: 'زياد' }, { id: 'char_02', name: 'نور' },
      { id: 'char_05', name: 'ياسين' }, { id: 'char_07', name: 'عمر' },
      { id: 'char_12', name: 'بندق' }, { id: 'char_17', name: 'شرارة' }
    ];

    modalBody.innerHTML = `
      <div class="modal-body-pad" style="text-align:right;">
        <div style="text-align:center;margin-bottom:12px;">
          <h3 style="color:#ffffff;font-size:18px;font-weight:900;margin-bottom:4px;">انضم إلى أبطال سكور آر</h3>
          <p style="color:#b1a2e9;font-size:12px;margin-bottom:0;">سجّل حسابك الخاص لتحفظ أوسمتك ونقاطك وتنافس في كافة القاعات.</p>
        </div>

        <form id="studentRegisterForm" onsubmit="ScoreARRegisterUI.submitStudentRegister(event)" style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <label style="display:block;color:#ddd8ff;font-size:12px;font-weight:700;margin-bottom:6px;">اسم العرض (الاسم الذي يظهر للجميع):</label>
            <input class="field" id="srDisplayName" type="text" placeholder="البطل عمر" required style="width:100%;border-radius:12px;font-weight:700;font-size:14px;background:#111426;">
          </div>

          <div>
            <label style="display:block;color:#ddd8ff;font-size:12px;font-weight:700;margin-bottom:6px;">اسم المستخدم (حروف إنجليزية وأرقام فقط):</label>
            <input class="field" id="srUsername" type="text" placeholder="omar_2026" pattern="^[a-zA-Z0-9_]{3,20}$" required dir="ltr" style="text-align:left;width:100%;border-radius:12px;font-weight:700;font-size:14px;background:#111426;">
            <small style="color:#94a3b8;font-size:11px;display:block;margin-top:4px;">ستستخدم هذا الاسم لتسجيل دخولك دائماً (3 إلى 20 رمزاً).</small>
          </div>

          <div>
            <label style="display:block;color:#ddd8ff;font-size:12px;font-weight:700;margin-bottom:6px;">كلمة المرور (8 خانات أو أكثر):</label>
            <div style="position:relative;">
              <input class="field" id="srPassword" type="password" placeholder="••••••••" minlength="8" required dir="ltr" style="text-align:left;letter-spacing:2px;font-weight:800;font-size:15px;background:#111426;border-radius:12px;padding-inline-end:44px;width:100%;">
              <button type="button" onclick="ScoreARRegisterUI.toggleFieldPass('srPassword', this)" style="position:absolute;inset-inline-end:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:#a1a4be;cursor:pointer;padding:6px;font-size:15px;">👁️</button>
            </div>
          </div>

          <div>
            <label style="display:block;color:#ddd8ff;font-size:12px;font-weight:700;margin-bottom:6px;">الفصل أو الصف (اختياري):</label>
            <input class="field" id="srClass" type="text" placeholder="الصف الخامس - فصل 2" style="width:100%;border-radius:12px;font-weight:700;font-size:13px;background:#111426;">
          </div>

          <!-- Hero Selection Preview -->
          <div>
            <label style="display:block;color:#ddd8ff;font-size:12px;font-weight:700;margin-bottom:6px;">اختر بطلك المفضل:</label>
            <div style="display:grid;grid-template-columns:repeat(6, 1fr);gap:6px;">
              ${heroes.map((h, i) => `
                <button type="button" class="avatar-card-picker ${i===0?'selected':''}" onclick="ScoreARRegisterUI.selectStudentAvatar('${h.id}', this)" style="background:#16182e;border:2px solid ${i===0?'#a855f7':'rgba(255,255,255,0.1)'};border-radius:10px;padding:4px 2px;cursor:pointer;display:flex;flex-direction:column;align-items:center;">
                  <img src="assets/characters/animated/${h.id}-idle.webp" onerror="this.src='assets/characters/animated/char_01-idle.webp'" alt="${h.name}" style="height:36px;object-fit:contain;">
                  <small style="color:#fff;font-size:10px;font-weight:700;margin-top:2px;">${h.name}</small>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Strict Privacy Notice Box (Zero Sensitive Data) -->
          <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:10px;font-size:11px;color:#a7f3d0;line-height:1.5;">
            🛡️ <b>بيان الخصوصية والأمان:</b> نحن في سكور آر نلتزم بأعلى معايير حماية وخصوصية الطلاب: <b>لا نطلب أي بريد شخصي أو رقم هاتف نهائياً</b>، وجميع البيانات مخصصة للمشاركة التعليمية الصفيّة الآمنة.
          </div>

          <div id="srErrorBox" style="display:none;color:#ff8a8a;font-size:13px;text-align:center;background:rgba(255,107,107,0.15);padding:10px;border-radius:12px;border:1px solid rgba(255,107,107,0.3);line-height:1.5;"></div>

          <button class="btn dark full" id="srSubmitBtn" type="submit" style="margin-top:6px;font-weight:900;font-size:15px;padding:12px;border-radius:12px;background:linear-gradient(135deg, #10b981, #059669);">
            تسجيل حساب طالب جديد 🌟
          </button>

          <div style="text-align:center;margin-top:4px;">
            <button type="button" onclick="ScoreARAuthUI.openUnifiedLoginModal()" style="background:none;border:none;color:#52d9ed;font-size:12px;cursor:pointer;text-decoration:underline;">لديك حساب مسجل؟ تسجيل الدخول</button>
          </div>
        </form>
      </div>
    `;

    if (!modal.open) modal.showModal();
    if (typeof global.hydrate === 'function') global.hydrate(modal);
    setTimeout(() => { $('#srDisplayName')?.focus(); }, 100);
  }

  // Submit Teacher Registration
  async function submitTeacherRegister(e) {
    e.preventDefault();
    const name = $('#trName')?.value.trim();
    const email = $('#trEmail')?.value.trim();
    const password = $('#trPassword')?.value;
    const subject = $('#trSubject')?.value.trim();
    const school = $('#trSchool')?.value.trim();
    const btn = $('#trSubmitBtn');
    const errBox = $('#trErrorBox');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-inline-end:8px;vertical-align:middle;"></span> جارٍ إرسال طلب الاعتماد...';
    }
    if (errBox) errBox.style.display = 'none';

    try {
      await global.ScoreARAuth.registerTeacher({ name, email, password, subject, school });
      const { modal, modalBody, modalTitle } = getModalElements();
      if (modalTitle) modalTitle.textContent = 'تم استلام طلب التسجيل بنجاح ✓';
      modalBody.innerHTML = `
        <div class="modal-body-pad" style="text-align:center;padding:24px 16px;">
          <div style="font-size:48px;margin-bottom:12px;">⏳</div>
          <h3 style="color:#ffffff;font-size:20px;font-weight:900;margin-bottom:8px;">مرحباً بك أ. ${name}</h3>
          <p style="color:#c9baff;font-size:14px;line-height:1.6;margin-bottom:16px;">
            حسابك الآن <b>«قيد المراجعة والاعتماد»</b> من قِبل إدارة سكور آر.<br>
            تم إرسال رابط تأكيد إلى بريدك: <b style="color:#52d9ed;">${email}</b>.<br>
            ستتمكن من تسجيل الدخول إلى استوديو المعلم فور تفعيل الحساب واعتماده.
          </p>
          <button class="btn dark full" onclick="if(global.closeModal)global.closeModal()" style="font-weight:900;padding:12px;border-radius:12px;">
            حسناً، فهمت ذلك ✓
          </button>
        </div>
      `;
      if (global.toast) global.toast('تم تقديم طلبك بنجاح وهو قيد المراجعة 📋');
    } catch(err) {
      if (errBox) {
        errBox.textContent = global.ScoreARAuth.mapAuthError(err);
        errBox.style.display = 'block';
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'إرسال طلب التسجيل للمراجعة 🚀';
      }
    }
  }

  // Submit Student Registration
  async function submitStudentRegister(e) {
    e.preventDefault();
    const displayName = $('#srDisplayName')?.value.trim();
    const username = $('#srUsername')?.value.trim();
    const password = $('#srPassword')?.value;
    const className = $('#srClass')?.value.trim();
    const avatarId = selectedStudentAvatar || 'char_01';
    const btn = $('#srSubmitBtn');
    const errBox = $('#srErrorBox');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-inline-end:8px;vertical-align:middle;"></span> جارٍ إنشاء حساب البطل...';
    }
    if (errBox) errBox.style.display = 'none';

    try {
      const student = await global.ScoreARAuth.registerStudent({ displayName, username, password, className, avatarId });
      if (global.closeModal) global.closeModal();
      if (global.toast) global.toast(`أهلاً بك يا ${displayName}! تم تسجيل حسابك بنجاح 🌟`);

      // Update Top Actions and direct to Journey
      if (global.ScoreARAuthUI && typeof global.ScoreARAuthUI.updateTopActionsTeacher === 'function') {
        global.ScoreARAuthUI.updateTopActionsTeacher(student);
      }
      location.hash = '#journey';
      if (global.render) global.render();
    } catch(err) {
      if (errBox) {
        errBox.textContent = global.ScoreARAuth.mapAuthError(err);
        errBox.style.display = 'block';
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'تسجيل حساب طالب جديد 🌟';
      }
    }
  }

  function toggleFieldPass(fieldId, btn) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    if (field.type === 'password') {
      field.type = 'text';
      if (btn) btn.textContent = '🙈';
    } else {
      field.type = 'password';
      if (btn) btn.textContent = '👁️';
    }
  }

  function selectStudentAvatar(id, el) {
    selectedStudentAvatar = id;
    document.querySelectorAll('.avatar-card-picker').forEach(c => {
      c.style.borderColor = 'rgba(255,255,255,0.1)';
      c.classList.remove('selected');
    });
    if (el) {
      el.style.borderColor = '#a855f7';
      el.classList.add('selected');
    }
  }

  function openStudentForgotHelpModal() {
    const { modal, modalTitle, modalBody } = getModalElements();
    if (!modal || !modalBody) return;
    if (modalTitle) modalTitle.textContent = 'إعادة تعيين كلمة مرور الطالب 🔒';
    modalBody.innerHTML = `
      <div class="modal-body-pad" style="text-align:center;padding:20px 14px;">
        <div style="font-size:42px;margin-bottom:12px;">🛡️</div>
        <h3 style="color:#ffffff;font-size:18px;font-weight:900;margin-bottom:8px;">حماية الخصوصية أولاً</h3>
        <p style="color:#c9baff;font-size:13px;line-height:1.6;margin-bottom:16px;">
          لأن حسابات الطلاب في سكور آر محمية تماماً ولا ترتبط بأي بريد إلكتروني أو رقم هاتف شخصي،
          يتم استعادة أو إعادة ضبط كلمة المرور بواسطة <b>معلّم الفصل</b> أو <b>إدارة المدرسة</b> من خلال استوديو المعلم.
        </p>
        <button class="btn dark full" onclick="ScoreARAuthUI.openUnifiedLoginModal()" style="font-weight:900;padding:12px;border-radius:12px;">
          العودة لتسجيل الدخول ↩
        </button>
      </div>
    `;
    if (!modal.open) modal.showModal();
  }

  const ScoreARRegisterUI = {
    openTeacherRegistrationModal,
    openStudentRegistrationModal,
    openStudentForgotHelpModal,
    submitTeacherRegister,
    submitStudentRegister,
    toggleFieldPass,
    selectStudentAvatar
  };

  global.ScoreARRegisterUI = ScoreARRegisterUI;
})(typeof window !== 'undefined' ? window : this);
