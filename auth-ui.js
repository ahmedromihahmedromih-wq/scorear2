/**
 * ScoreAR Unified Authentication UI Module (Unified Login & Session Status)
 * Complies with Phase B specifications, Rule 6 (Visual Identity), Rule 7 (<500 lines)
 */
(function(global) {
  'use strict';

  const $ = selector => document.querySelector(selector);

  const ScoreARAuthUI = {
    togglePassword: function() {
      const input = $('#loginPassword');
      const btn = $('#toggleLoginPasswordBtn');
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        if (btn) btn.textContent = '🙈';
      } else {
        input.type = 'password';
        if (btn) btn.textContent = '👁️';
      }
    },

    forgotPassword: async function() {
      const idInput = $('#loginIdentifier');
      const val = idInput ? idInput.value.trim() : '';
      const errBox = $('#loginErrorBox');

      if (!val) {
        if (errBox) {
          errBox.textContent = 'يرجى إدخال البريد الإلكتروني (للمعلم) أو اسم المستخدم (للطالب) أولاً.';
          errBox.style.color = '#ff8a8a';
          errBox.style.background = 'rgba(255,107,107,0.15)';
          errBox.style.display = 'block';
        }
        if (idInput) idInput.focus();
        return;
      }

      if (!val.includes('@')) {
        if (global.ScoreARRegisterUI && typeof global.ScoreARRegisterUI.openStudentForgotHelpModal === 'function') {
          global.ScoreARRegisterUI.openStudentForgotHelpModal();
        }
        return;
      }

      try {
        if (errBox) errBox.style.display = 'none';
        await global.ScoreARAuth.sendPasswordReset(val);
        if (errBox) {
          errBox.textContent = `✓ تم إرسال رابط إعادة ضبط كلمة المرور إلى ${val}. يرجى تفقد صندوق الوارد.`;
          errBox.style.color = '#52d9ed';
          errBox.style.background = 'rgba(82,217,237,0.15)';
          errBox.style.border = '1px solid rgba(82,217,237,0.3)';
          errBox.style.display = 'block';
        }
      } catch(err) {
        if (errBox) {
          errBox.textContent = global.ScoreARAuth.mapAuthError(err);
          errBox.style.color = '#ff8a8a';
          errBox.style.background = 'rgba(255,107,107,0.15)';
          errBox.style.display = 'block';
        }
      }
    },

    submitLogin: async function(e) {
      e.preventDefault();
      const idInput = $('#loginIdentifier');
      const passInput = $('#loginPassword');
      const btn = $('#loginSubmitBtn');
      const errBox = $('#loginErrorBox');

      const identifier = idInput ? idInput.value.trim() : '';
      const pass = passInput ? passInput.value : '';

      if (!identifier || !pass) {
        if (errBox) {
          errBox.textContent = 'يرجى إدخال اسم المستخدم/البريد وكلمة المرور.';
          errBox.style.color = '#ff8a8a';
          errBox.style.display = 'block';
        }
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-inline-end:8px;vertical-align:middle;"></span> جارٍ التحقق وتأمين الجلسة...';
      }
      if (errBox) errBox.style.display = 'none';

      try {
        const user = await global.ScoreARAuth.login(identifier, pass);
        if (global.closeModal) global.closeModal();

        updateTopActionsTeacher(user);

        if (user.role === 'teacher' || user.role === 'admin') {
          if (global.toast) global.toast(`مرحباً بك أ. ${user.displayName}! تم تسجيل الدخول بنجاح 🚀`);
          location.hash = '#studio';
        } else {
          if (global.toast) global.toast(`أهلاً بالبطل ${user.displayName}! تم تسجيل الدخول بنجاح 🌟`);
          location.hash = '#journey';
        }

        if (global.render) global.render();
      } catch(err) {
        if (errBox) {
          errBox.textContent = global.ScoreARAuth.mapAuthError(err);
          errBox.style.color = '#ff8a8a';
          errBox.style.background = 'rgba(255,107,107,0.15)';
          errBox.style.border = '1px solid rgba(255,107,107,0.3)';
          errBox.style.display = 'block';
        }
        if (passInput) {
          passInput.value = '';
          passInput.focus();
        }
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = 'دخول 🚀';
        }
      }
    },

    openUnifiedLoginModal: function() {
      openAuthModal('login');
    }
  };

  function openAuthModal(mode = 'login') {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    if (!modal || !modalBody) return;

    if (modalTitle) modalTitle.textContent = 'بوابة الدخول إلى سكور آر 🔐';
    modalBody.innerHTML = `
      <div class="modal-body-pad" style="text-align:right;">
        <div style="text-align:center;margin-bottom:16px;">
          <h3 style="color:#ffffff;font-size:20px;font-weight:900;margin-bottom:4px;">تسجيل الدخول الموحد</h3>
          <p style="color:#b1a2e9;font-size:12px;margin-bottom:0;">للمعلمين والطلاب والإدارة المسجلين</p>
        </div>

        <form id="unifiedLoginForm" onsubmit="ScoreARAuthUI.submitLogin(event)" style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <label style="display:block;color:#ddd8ff;font-size:12px;font-weight:700;margin-bottom:6px;">البريد الإلكتروني (للمعلم) أو اسم المستخدم (للطالب):</label>
            <input class="field" id="loginIdentifier" type="text" placeholder="ahmed@example.com أو omar_2026" autocomplete="username" required dir="ltr" style="text-align:right;font-weight:700;font-size:14px;background:#111426;border-radius:12px;width:100%;">
          </div>

          <div>
            <label style="display:block;color:#ddd8ff;font-size:12px;font-weight:700;margin-bottom:6px;">كلمة المرور السرية:</label>
            <div style="position:relative;">
              <input class="field" id="loginPassword" type="password" placeholder="••••••••" autocomplete="current-password" required dir="ltr" style="text-align:left;letter-spacing:2px;font-weight:800;font-size:16px;background:#111426;border-radius:12px;padding-inline-end:44px;width:100%;">
              <button type="button" id="toggleLoginPasswordBtn" onclick="ScoreARAuthUI.togglePassword()" style="position:absolute;inset-inline-end:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:#a1a4be;cursor:pointer;padding:6px;font-size:16px;" aria-label="إظهار أو إخفاء كلمة المرور">
                👁️
              </button>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px;">
            <span style="color:#7e8299;font-size:11px;">🔒 جلسة آمنة تنتهي مع إغلاق التبويب</span>
            <button type="button" onclick="ScoreARAuthUI.forgotPassword()" style="background:none;border:none;color:#52d9ed;font-size:12px;cursor:pointer;text-decoration:underline;">نسيت كلمة المرور؟</button>
          </div>

          <div id="loginErrorBox" style="display:none;color:#ff8a8a;font-size:13px;text-align:center;background:rgba(255,107,107,0.15);padding:10px;border-radius:12px;border:1px solid rgba(255,107,107,0.3);line-height:1.5;"></div>

          <button class="btn dark full" id="loginSubmitBtn" type="submit" style="margin-top:8px;font-weight:900;font-size:16px;padding:14px;border-radius:12px;background:linear-gradient(135deg, #7550ef, #8e64ef);">
            دخول 🚀
          </button>
        </form>

        <!-- New User Switch Cards -->
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1);text-align:center;">
          <div style="font-size:12px;color:#94a3b8;font-weight:700;margin-bottom:10px;">ليس لديك حساب مسجل بعد؟</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <button type="button" onclick="ScoreARRegisterUI.openTeacherRegistrationModal()" style="background:#1b1c33;border:1px solid rgba(142,100,239,0.3);border-radius:12px;padding:10px;cursor:pointer;display:flex;align-items:center;gap:8px;justify-content:center;">
              <span style="font-size:18px;">👨‍🏫</span>
              <div style="text-align:right;">
                <b style="color:#fff;font-size:12px;display:block;">معلم جديد</b>
                <small style="color:#a5b4fc;font-size:10px;">إنشاء حساب معلم</small>
              </div>
            </button>
            <button type="button" onclick="ScoreARRegisterUI.openStudentRegistrationModal()" style="background:#1b1c33;border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:10px;cursor:pointer;display:flex;align-items:center;gap:8px;justify-content:center;">
              <span style="font-size:18px;">🎯</span>
              <div style="text-align:right;">
                <b style="color:#fff;font-size:12px;display:block;">طالب جديد</b>
                <small style="color:#a7f3d0;font-size:10px;">إنشاء حساب بطل</small>
              </div>
            </button>
          </div>
        </div>
      </div>
    `;

    if (!modal.open) modal.showModal();
    if (typeof global.hydrate === 'function') global.hydrate(modal);
    setTimeout(() => { const em = $('#loginIdentifier'); if(em) em.focus(); }, 100);
  }

  function updateTopActionsTeacher(user) {
    const isTeacher = user && (user.role === 'admin' || user.role === 'teacher');
    const isStudent = user && (user.role === 'student' && !user.isAnonymous);
    document.body.classList.toggle('is-logged-in', !!(isTeacher || isStudent));

    const area = document.getElementById('topActionsArea');
    if (area) {
      if (isTeacher) {
        area.innerHTML = `<div style="display:flex;align-items:center;gap:10px;">
          <a href="#studio" class="btn dark small" style="background:#272044;color:#c9baff;border:1px solid #8e64ef;padding:6px 14px;border-radius:12px;font-size:12px;font-weight:800;text-decoration:none;display:inline-flex;align-items:center;gap:6px;">
            👨‍🏫 ${user.displayName || 'أ. أحمد رميح'} (الاستوديو)
          </a>
          <button class="btn outline small" data-action="logout" style="font-size:11px;padding:6px 12px;border-color:rgba(255,107,107,0.4);color:#ff8a8a;cursor:pointer;">خروج</button>
        </div>`;
      } else if (isStudent) {
        area.innerHTML = `<div style="display:flex;align-items:center;gap:10px;">
          <a href="#journey" class="btn dark small" style="background:#132e27;color:#a7f3d0;border:1px solid #10b981;padding:6px 14px;border-radius:12px;font-size:12px;font-weight:800;text-decoration:none;display:inline-flex;align-items:center;gap:6px;">
            🎒 ${user.displayName || 'البطل'}
          </a>
          <button class="btn outline small" data-action="logout" style="font-size:11px;padding:6px 12px;border-color:rgba(255,107,107,0.4);color:#ff8a8a;cursor:pointer;">خروج</button>
        </div>`;
      } else {
        area.innerHTML = `<button class="quiet join-top" data-action="join"><i data-icon="key"></i> أدخل رمز القاعة</button><button class="btn dark small" data-action="teacher-login">دخول <i data-icon="arrow"></i></button>`;
      }
      if (global.hydrate) global.hydrate(area);
    }

    const launchActions = document.querySelector('.launch-nav-actions');
    if (launchActions) {
      if (isTeacher) {
        launchActions.innerHTML = `
          <button class="nav-join" data-action="join">عندي رمز قاعة</button>
          <a href="#studio" class="btn launch-primary" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:12px;font-weight:800;font-size:13px;">👨‍🏫 استوديو المعلم</a>
          <button class="btn launch-outline small" data-action="logout" style="border-color:rgba(255,107,107,0.5);color:#ff8a8a;padding:8px 14px;font-weight:800;border-radius:12px;cursor:pointer;">خروج</button>
          <button class="icon-btn launch-menu" data-action="menu" aria-label="فتح القائمة"><i data-icon="menu"></i></button>
        `;
      } else if (isStudent) {
        launchActions.innerHTML = `
          <button class="nav-join" data-action="join">عندي رمز قاعة</button>
          <a href="#journey" class="btn launch-primary" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:12px;font-weight:800;font-size:13px;background:#10b981;">🎒 رحلتي التعليمية</a>
          <button class="btn launch-outline small" data-action="logout" style="border-color:rgba(255,107,107,0.5);color:#ff8a8a;padding:8px 14px;font-weight:800;border-radius:12px;cursor:pointer;">خروج</button>
          <button class="icon-btn launch-menu" data-action="menu" aria-label="فتح القائمة"><i data-icon="menu"></i></button>
        `;
      } else {
        launchActions.innerHTML = `
          <button class="nav-join" data-action="join">عندي رمز قاعة</button>
          <button class="btn launch-primary" data-action="teacher-login">دخول <i data-icon="arrow"></i></button>
          <button class="icon-btn launch-menu" data-action="menu" aria-label="فتح القائمة"><i data-icon="menu"></i></button>
        `;
      }
      if (global.hydrate) global.hydrate(launchActions);
    }
  }

  // Global Click Delegations for Auth Actions
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'teacher-login' || action === 'unified-login') {
      e.preventDefault();
      ScoreARAuthUI.openUnifiedLoginModal();
    } else if (action === 'register-teacher') {
      e.preventDefault();
      if (global.ScoreARRegisterUI) global.ScoreARRegisterUI.openTeacherRegistrationModal();
    } else if (action === 'register-student') {
      e.preventDefault();
      if (global.ScoreARRegisterUI) global.ScoreARRegisterUI.openStudentRegistrationModal();
    } else if (action === 'logout') {
      e.preventDefault();
      global.ScoreARAuth.logout().then(() => {
        if (global.toast) global.toast('تم تسجيل الخروج بنجاح 👋');
        updateTopActionsTeacher(null);
        location.hash = '#home';
        if (global.render) global.render();
      });
    }
  });

  ScoreARAuthUI.openAuthModal = openAuthModal;
  ScoreARAuthUI.updateTopActionsTeacher = updateTopActionsTeacher;
  global.ScoreARAuthUI = ScoreARAuthUI;
  global.openAuthModal = openAuthModal;
})(typeof window !== 'undefined' ? window : this);
