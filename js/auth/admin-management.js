/**
 * ScoreAR Admin Hub & Account Management Engine (admin-management.js)
 * Phase E: Full Admin Control Panel & Role Management
 * Four Tabs: 1. Teacher Requests (طلبات المعلمين) 2. Teachers (المعلمون) 3. Students (الطلاب) 4. Audit Log (سجل العمليات)
 * Strictly Rule 7 Compliant (<500 lines).
 */
(function (global) {
  'use strict';

  let currentTab = 'requests';
  let cachedRequests = [];
  let cachedTeachers = [];
  let cachedStudents = [];
  let searchQuery = '';

  function getDb() {
    return (global.ScoreARAuth && global.ScoreARAuth.getDb)
      ? global.ScoreARAuth.getDb()
      : (global.firebase && global.firebase.database ? global.firebase.database() : null);
  }

  function getCurrentUser() {
    return (global.ScoreARAuth && global.ScoreARAuth.getUser)
      ? global.ScoreARAuth.getUser()
      : null;
  }

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function formatDate(ts) {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return String(ts);
    }
  }

  async function callApi(body) {
    let idToken = null;
    const auth = global.firebase && global.firebase.auth ? global.firebase.auth() : null;
    if (auth && auth.currentUser) {
      idToken = await auth.currentUser.getIdToken(true);
    }
    const apiUrl = (typeof window !== 'undefined' && window.SCOREAR_API_URL ? window.SCOREAR_API_URL : '') + '/api/account-request';
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (idToken || '')
      },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'حدث خطأ في الخادم (رمز ' + res.status + ')');
    }
    return data;
  }

  function openAdminHub() {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
      if (global.toast) global.toast('عفواً، هذه اللوحة مخصصة للأدمن فقط.');
      return;
    }

    let modal = document.getElementById('scorearAdminHubModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'scorearAdminHubModal';
      modal.className = 'modal-backdrop';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(5,7,18,0.85);backdrop-filter:blur(10px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;';
      document.body.appendChild(modal);
    }

    renderHubShell(modal);
    loadData();
  }

  function closeAdminHub() {
    const modal = document.getElementById('scorearAdminHubModal');
    if (modal) modal.remove();
  }

  function renderHubShell(container) {
    container.innerHTML = `
      <div style="background:#0e1022;border:1px solid rgba(142,100,239,0.35);border-radius:24px;width:100%;max-width:960px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.8);overflow:hidden;direction:rtl;font-family:inherit;">
        <!-- Header -->
        <div style="padding:20px 24px;border-bottom:1px solid rgba(142,100,239,0.2);display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,rgba(117,80,239,0.15),transparent);">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#7550ef,#a855f7);display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px rgba(117,80,239,0.5);font-size:22px;">🛡️</div>
            <div>
              <h2 style="margin:0;font-size:20px;font-weight:900;color:#ffffff;">لوحة الإدارة والحسابات (Admin Hub)</h2>
              <p style="margin:2px 0 0;font-size:12px;color:#a78bfa;">إدارة المعلمين والطلاب والموافقات الرسمية لمنصة ScoreAR</p>
            </div>
          </div>
          <button onclick="ScoreARAdminManagement.closeAdminHub()" style="background:rgba(255,255,255,0.08);border:none;color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>

        <!-- Navigation Tabs -->
        <div style="display:flex;gap:8px;padding:12px 24px;background:#13152a;border-bottom:1px solid rgba(255,255,255,0.06);overflow-x:auto;">
          <button onclick="ScoreARAdminManagement.setTab('requests')" class="admin-tab-btn" id="admTab_requests" style="${getTabStyle('requests')}">
            ⏳ طلبات المعلمين <span id="admBadgeRequests" style="background:#ef4444;color:#fff;font-size:11px;padding:1px 6px;border-radius:10px;margin-inline-start:4px;display:none;">0</span>
          </button>
          <button onclick="ScoreARAdminManagement.setTab('teachers')" class="admin-tab-btn" id="admTab_teachers" style="${getTabStyle('teachers')}">
            👨‍🏫 المعلمون المعتمدون
          </button>
          <button onclick="ScoreARAdminManagement.setTab('students')" class="admin-tab-btn" id="admTab_students" style="${getTabStyle('students')}">
            🎓 إدارة الطلاب
          </button>
          <button onclick="ScoreARAdminManagement.setTab('audit')" class="admin-tab-btn" id="admTab_audit" style="${getTabStyle('audit')}">
            📋 سجل العمليات
          </button>
        </div>

        <!-- Content Area -->
        <div id="admContentArea" style="flex:1;overflow-y:auto;padding:24px;">
          <div style="text-align:center;padding:40px;color:#a78bfa;">جاري تحميل البيانات من الخادم... ⏳</div>
        </div>
      </div>
    `;
  }

  function getTabStyle(tab) {
    const isActive = currentTab === tab;
    return `padding:8px 16px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;border:1px solid ${isActive ? '#8e64ef' : 'transparent'};background:${isActive ? '#7550ef' : 'rgba(255,255,255,0.05)'};color:${isActive ? '#fff' : '#b1a2e9'};transition:all 0.2s;white-space:nowrap;`;
  }

  function setTab(tab) {
    currentTab = tab;
    ['requests', 'teachers', 'students', 'audit'].forEach(t => {
      const el = document.getElementById('admTab_' + t);
      if (el) el.style.cssText = getTabStyle(t);
    });
    renderTabContent();
  }

  async function loadData() {
    const db = getDb();
    if (!db) return;

    try {
      // 1. Fetch Account Requests
      db.ref('scorear_account_requests').on('value', snap => {
        const val = snap.val() || {};
        cachedRequests = Object.entries(val).map(([uid, r]) => ({ uid, ...r }));
        cachedRequests.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        const pendingCount = cachedRequests.filter(r => r.status === 'pending').length;
        const b = document.getElementById('admBadgeRequests');
        if (b) {
          b.innerText = pendingCount;
          b.style.display = pendingCount > 0 ? 'inline-block' : 'none';
        }
        if (currentTab === 'requests' || currentTab === 'audit') renderTabContent();
      });

      // 2. Fetch Teachers Registry
      db.ref('scorear_teachers_registry').on('value', snap => {
        const val = snap.val() || {};
        cachedTeachers = Object.entries(val).map(([uid, t]) => ({ uid, ...t }));
        if (currentTab === 'teachers') renderTabContent();
      });

      // 3. Fetch Students
      db.ref('scorear_students').on('value', snap => {
        const val = snap.val() || {};
        cachedStudents = Object.entries(val).map(([uid, s]) => ({ uid, ...s }));
        cachedStudents.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        if (currentTab === 'students') renderTabContent();
      });

    } catch (e) {
      console.error('Admin data load error:', e);
    }
  }

  function renderTabContent() {
    const area = document.getElementById('admContentArea');
    if (!area) return;

    if (currentTab === 'requests') renderRequestsTab(area);
    else if (currentTab === 'teachers') renderTeachersTab(area);
    else if (currentTab === 'students') renderStudentsTab(area);
    else if (currentTab === 'audit') renderAuditTab(area);
  }

  // --- TAB 1: TEACHER REQUESTS ---
  function renderRequestsTab(container) {
    const pending = cachedRequests.filter(r => r.status === 'pending');

    if (pending.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:60px 20px;color:#9ca3af;">
          <div style="font-size:48px;margin-bottom:12px;">🎉</div>
          <h3 style="color:#fff;font-size:18px;font-weight:800;margin-bottom:6px;">لا توجد طلبات معلمين معلقة حالياً</h3>
          <p style="font-size:13px;color:#a78bfa;">جميع طلبات الانضمام تم البت فيها بنجاح.</p>
        </div>
      `;
      return;
    }

    const ui = global.ScoreARUI || { icon: () => '', iconBox: () => '' };
    container.innerHTML = `
      <div style="margin-bottom:16px;color:#cbd5e1;font-size:14px;font-weight:700;">
        طلبات الانضمام بانتظار المراجعة (${pending.length}):
      </div>
      <div style="display:grid;gap:14px;">
        ${pending.map(r => `
          <div class="scorear-spotlight-card" style="padding:18px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;">
            <div style="display:flex;align-items:center;gap:14px;">
              ${ui.iconBox('graduation', { size: 'md', tone: 'violet' })}
              <div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <span style="color:#f6f3ff;font-size:16px;font-weight:900;">${esc(r.displayName)}</span>
                  <span class="launch-pill" style="padding:2px 10px;font-size:11px;">قيد المراجعة</span>
                </div>
                <div style="color:#a1a4be;font-size:13px;margin-top:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <b>${esc(r.email)}</b>
                  <span>·</span>
                  <span style="display:inline-flex;align-items:center;gap:4px;">${ui.icon('book', { size: 13 })} ${esc(r.subject || 'غير محدد')}</span>
                  <span>·</span>
                  <span>${esc(r.school || 'مدرسة غير محددة')}</span>
                </div>
                <div style="color:#9396b2;font-size:11px;margin-top:4px;display:inline-flex;align-items:center;gap:5px;">
                  ${ui.icon('clock', { size: 12 })} تاريخ الطلب: ${formatDate(r.createdAt)}
                </div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <button onclick="ScoreARAdminManagement.approveTeacher('${r.uid}')" class="btn launch-primary" style="padding:9px 18px;font-size:13px;">
                ${ui.icon('check', { size: 14 })} اعتماد كمعلم
              </button>
              <button onclick="ScoreARAdminManagement.rejectTeacherPrompt('${r.uid}', '${esc(r.displayName)}')" class="btn launch-outline" style="padding:9px 14px;font-size:13px;border-color:#c3849866;color:#ffd3e5;">
                ${ui.icon('close', { size: 14 })} رفض
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderTeachersTab(container) {
    const ui = global.ScoreARUI || { icon: () => '' };
    const list = cachedTeachers.length ? cachedTeachers : cachedRequests.filter(r => r.status === 'approved');

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap;">
        <span style="color:#cbd5e1;font-size:14px;font-weight:700;">سجل المعلمين المعتمدين (${list.length}):</span>
        <input type="text" placeholder="بحث بالاسم أو البريد أو المادة..." oninput="ScoreARAdminManagement.onSearch(this.value)" style="background:#0c0d1d;border:1px solid #ffffff1e;color:#fff;padding:8px 14px;border-radius:10px;font-size:13px;width:min(100%, 260px);direction:rtl;" value="${esc(searchQuery)}">
      </div>
      <div style="display:grid;gap:12px;">
        ${list.filter(t => !searchQuery || (t.displayName||'').toLowerCase().includes(searchQuery.toLowerCase()) || (t.email||'').toLowerCase().includes(searchQuery.toLowerCase())).map(t => `
          <div class="scorear-spotlight-card" style="padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="color:#f6f3ff;font-size:15px;font-weight:900;">${esc(t.displayName)}</span>
                <span style="background:${t.status==='suspended'?'#422337':'#1d5c52'};color:${t.status==='suspended'?'#ffd3e5':'#befff2'};font-size:11px;font-weight:800;padding:2px 8px;border-radius:999px;">
                  ${t.status === 'suspended' ? 'موقوف' : 'معتمد نشط'}
                </span>
              </div>
              <div style="color:#a1a4be;font-size:13px;margin-top:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span>${esc(t.email)}</span>
                <span>·</span>
                <span style="display:inline-flex;align-items:center;gap:4px;">${ui.icon('book', { size: 13 })} ${esc(t.schoolSubject || t.subject || 'غير محدد')}</span>
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button onclick="ScoreARAdminManagement.toggleTeacherStatus('${t.uid}', ${t.status !== 'suspended'})" class="btn launch-outline" style="padding:7px 12px;font-size:12px;">
                ${t.status === 'suspended' ? 'إلغاء الإيقاف' : 'إيقاف الحساب'}
              </button>
              <button onclick="ScoreARAdminManagement.deleteTeacherPrompt('${t.uid}', '${esc(t.displayName)}')" class="btn launch-outline" style="padding:7px 12px;font-size:12px;border-color:#c3849866;color:#ffd3e5;">
                حذف نهائي
              </button>
            </div>
          </div>
        `).join('') || '<div style="text-align:center;padding:30px;color:#9396b2;">لا توجد نتائج مطابقة</div>'}
      </div>
    `;
  }

  function renderStudentsTab(container) {
    const ui = global.ScoreARUI || { icon: () => '' };
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap;">
        <span style="color:#cbd5e1;font-size:14px;font-weight:700;">سجل الطلاب المسجلين (${cachedStudents.length}):</span>
        <input type="text" placeholder="بحث باسم العرض أو المستخدم أو الفصل..." oninput="ScoreARAdminManagement.onSearch(this.value)" style="background:#0c0d1d;border:1px solid #ffffff1e;color:#fff;padding:8px 14px;border-radius:10px;font-size:13px;width:min(100%, 260px);direction:rtl;" value="${esc(searchQuery)}">
      </div>
      <div style="display:grid;gap:12px;">
        ${cachedStudents.filter(s => !searchQuery || (s.displayName||'').toLowerCase().includes(searchQuery.toLowerCase()) || (s.username||'').toLowerCase().includes(searchQuery.toLowerCase()) || (s.className||'').toLowerCase().includes(searchQuery.toLowerCase())).map(s => `
          <div class="scorear-spotlight-card" style="padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span style="color:#f6f3ff;font-size:15px;font-weight:900;">${esc(s.displayName)}</span>
                <span style="color:#c9baff;font-size:12px;font-weight:800;">(@${esc(s.username)})</span>
                <span style="background:${s.isActive === false ? '#422337' : '#1d5c52'};color:${s.isActive === false ? '#ffd3e5' : '#befff2'};font-size:11px;font-weight:800;padding:2px 8px;border-radius:999px;">
                  ${s.isActive === false ? 'موقوف' : 'نشط'}
                </span>
              </div>
              <div style="color:#a1a4be;font-size:13px;margin-top:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span>الفصل: <b>${esc(s.className || 'عام')}</b></span>
                <span>·</span>
                <span style="display:inline-flex;align-items:center;gap:4px;">${ui.icon('clock', { size: 12 })} تاريخ التسجيل: ${formatDate(s.createdAt)}</span>
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button onclick="ScoreARAdminManagement.toggleStudentStatus('${s.uid}', ${s.isActive === false})" class="btn launch-outline" style="padding:7px 12px;font-size:12px;">
                ${s.isActive === false ? 'إعادة التفعيل' : 'إيقاف الحساب'}
              </button>
              <button onclick="ScoreARAdminManagement.resetPasswordPrompt('${s.uid}', '${esc(s.displayName)}')" class="btn launch-outline" style="padding:7px 12px;font-size:12px;border-color:#9665ff66;color:#d7ccea;">
                ${ui.icon('key', { size: 13 })} إعادة كلمة المرور
              </button>
              <button onclick="ScoreARAdminManagement.deleteStudentPrompt('${s.uid}', '${esc(s.displayName)}')" class="btn launch-outline" style="padding:7px 12px;font-size:12px;border-color:#c3849866;color:#ffd3e5;">
                حذف
              </button>
            </div>
          </div>
        `).join('') || '<div style="text-align:center;padding:30px;color:#9396b2;">لا يوجد طلاب مسجلون حالياً</div>'}
      </div>
    `;
  }

  function renderAuditTab(container) {
    const ui = global.ScoreARUI || { icon: () => '' };
    const history = cachedRequests.filter(r => r.status === 'approved' || r.status === 'rejected' || r.status === 'deleted');

    container.innerHTML = `
      <div style="margin-bottom:16px;color:#cbd5e1;font-size:14px;font-weight:700;">
        سجل العمليات الإدارية والموافقات السابقة (${history.length}):
      </div>
      <div style="display:grid;gap:10px;">
        ${history.map(h => `
          <div class="scorear-spotlight-card" style="padding:14px 18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
            <div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="color:#f6f3ff;font-weight:800;font-size:14px;">${esc(h.displayName)}</span>
                <span style="font-size:11px;padding:2px 8px;border-radius:999px;font-weight:800;background:${h.status==='approved'?'#1d5c52':h.status==='rejected'?'#422337':'#27253f'};color:${h.status==='approved'?'#befff2':h.status==='rejected'?'#ffd3e5':'#a1a4be'};">
                  ${h.status === 'approved' ? 'معتمد' : h.status === 'rejected' ? 'مرفوض' : 'محذوف'}
                </span>
              </div>
              <div style="color:#a1a4be;font-size:12px;margin-top:3px;">
                ${esc(h.email)} · ملاحظة: <i>${esc(h.reviewNote || 'بدون ملاحظات')}</i>
              </div>
            </div>
            <div style="color:#9396b2;font-size:11px;display:inline-flex;align-items:center;gap:5px;">
              ${ui.icon('clock', { size: 12 })} ${formatDate(h.reviewedAt || h.createdAt)}
            </div>
          </div>
        `).join('') || '<div style="text-align:center;padding:30px;color:#9396b2;">لا توجد عمليات مسجلة</div>'}
      </div>
    `;
  }

  // --- ACTIONS ---
  async function approveTeacher(uid) {
    if (!confirm('هل تريد بالتأكيد اعتماد هذا المعلم وتفعيل صلاحيات الاستوديو له؟')) return;
    try {
      if (global.toast) global.toast('جاري معالجة الاعتماد... ⏳');
      try {
        await callApi({ action: 'approve', targetUid: uid });
        if (global.toast) global.toast('✓ تم اعتماد حساب المعلم وضبط دوره بنجاح!');
      } catch (apiErr) {
        // Fallback: If serverless API is not available on current host, update RTDB directly
        const db = getDb();
        const user = getCurrentUser();
        if (db && user && user.role === 'admin') {
          await db.ref(`scorear_account_requests/${uid}`).update({
            status: 'approved',
            reviewedAt: Date.now(),
            reviewedBy: user.uid,
            reviewNote: 'تم الاعتماد من لوحة الإدارة.'
          });
          if (global.toast) global.toast('✓ تم تغيير حالة الطلب إلى معتمد في قاعدة البيانات!');
        } else {
          throw apiErr;
        }
      }
    } catch (e) {
      alert('خطأ في الاعتماد: ' + e.message);
    }
  }

  async function rejectTeacherPrompt(uid, name) {
    const note = prompt(`يرجى كتابة سبب رفض طلب المعلم (${name}):`, 'البيانات غير مكتملة');
    if (note === null) return;
    try {
      await callApi({ action: 'reject', targetUid: uid, note });
      if (global.toast) global.toast('تم رفض الطلب بنجاح.');
    } catch (e) {
      alert('خطأ: ' + e.message);
    }
  }

  async function toggleTeacherStatus(uid, makeActive) {
    try {
      await callApi({ action: 'toggleTeacherStatus', targetUid: uid, isActive: makeActive });
      if (global.toast) global.toast(makeActive ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب');
    } catch (e) {
      alert('خطأ: ' + e.message);
    }
  }

  async function deleteTeacherPrompt(uid, name) {
    const confirmName = prompt(`⚠️ تأكيد الحذف النهائي: اكتب اسم الحساب تماماً للتأكيد (${name}):`);
    if (confirmName !== name) {
      alert('لم يتم الحذف: الاسم المكتوب غير متطابق.');
      return;
    }
    try {
      await callApi({ action: 'deleteTeacher', targetUid: uid });
      if (global.toast) global.toast('تم حذف حساب المعلم وسجلاته نهائياً.');
    } catch (e) {
      alert('خطأ: ' + e.message);
    }
  }

  async function toggleStudentStatus(uid, makeActive) {
    try {
      await callApi({ action: 'toggleStudentStatus', targetUid: uid, isActive: makeActive });
      if (global.toast) global.toast(makeActive ? 'تم إعادة تفعيل حساب الطالب' : 'تم إيقاف حساب الطالب');
    } catch (e) {
      alert('خطأ: ' + e.message);
    }
  }

  async function resetPasswordPrompt(uid, name) {
    const tempPass = 'ScoreAR#' + Math.floor(1000 + Math.random() * 9000);
    if (!confirm(`سيتم إعادة تعيين كلمة مرور الطالب (${name}) إلى كلمة مرور مؤقتة:\n\n${tempPass}\n\nهل تريد المتابعة؟`)) return;

    try {
      await callApi({ action: 'resetStudentPassword', targetUid: uid, newPassword: tempPass });
      prompt(`تم تعيين كلمة المرور بنجاح! انسخها وزودها للطالب:`, tempPass);
    } catch (e) {
      alert('خطأ: ' + e.message);
    }
  }

  async function deleteStudentPrompt(uid, name) {
    if (!confirm(`هل أنت متأكد من حذف حساب الطالب (${name}) نهائياً؟`)) return;
    try {
      await callApi({ action: 'deleteStudentAccount', targetUid: uid });
      if (global.toast) global.toast('تم حذف حساب الطالب.');
    } catch (e) {
      alert('خطأ: ' + e.message);
    }
  }

  function onSearch(val) {
    searchQuery = (val || '').trim();
    renderTabContent();
  }

  const AdminAPI = {
    openAdminHub,
    closeAdminHub,
    setTab,
    approveTeacher,
    rejectTeacherPrompt,
    toggleTeacherStatus,
    deleteTeacherPrompt,
    toggleStudentStatus,
    resetPasswordPrompt,
    deleteStudentPrompt,
    onSearch
  };

  global.ScoreARAdminManagement = AdminAPI;

})(typeof window !== 'undefined' ? window : this);
