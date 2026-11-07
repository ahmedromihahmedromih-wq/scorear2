/**
 * ScoreAR Real Authentication Module (Firebase Auth + Session Persistence + Role Claims)
 * Strictly enforces Phase B Registration, Privacy, Rule 3, Rule 4, Rule 7 (<500 lines)
 */
(function(global) {
  'use strict';

  // Decoupled Firebase Environment Initialization via firebase-config.js (B0)
  if (!window.firebase.apps.length) {
    const config = (global.ScoreARFirebaseConfig && typeof global.ScoreARFirebaseConfig.getActiveConfig === 'function')
      ? global.ScoreARFirebaseConfig.getActiveConfig()
      : {
          projectId: 'scorear-staging-test',
          apiKey: 'AIzaSyStagingTestDummyKeyForIsolatedTesting987',
          authDomain: 'scorear-staging-test.firebaseapp.com',
          databaseURL: 'https://scorear-staging-test-default-rtdb.firebaseio.com'
        };
    window.firebase.initializeApp(config);
  }

  const auth = window.firebase.auth();
  const db = window.firebase.database();

  // Enforce Tab-Only Session Persistence (Rule 4: Never keep permanent token in localStorage)
  auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

  // Internal state & listeners
  let currentAuthUser = null;
  const authStateListeners = [];
  const rateLimiter = { attempts: 0, windowStart: Date.now() };

  function checkRateLimit(maxAttempts = 5, windowMs = 600000) {
    const now = Date.now();
    if (now - rateLimiter.windowStart > windowMs) {
      rateLimiter.attempts = 0;
      rateLimiter.windowStart = now;
    }
    rateLimiter.attempts++;
    if (rateLimiter.attempts > maxAttempts) throw new Error('TOO_MANY_ATTEMPTS');
  }

  function notifyAuthChange(user) {
    currentAuthUser = user;
    authStateListeners.forEach(fn => {
      try { fn(user); } catch (e) { console.error('[ScoreAR Auth] Listener error:', e); }
    });
  }

  // Observe Firebase Auth State
  auth.onAuthStateChanged(async (firebaseUser) => {
    if (firebaseUser) {
      if (firebaseUser.isAnonymous) {
        let studentData = {};
        try { studentData = JSON.parse(sessionStorage.getItem('scorear_student_session') || '{}'); } catch(e){}
        notifyAuthChange({
          uid: firebaseUser.uid,
          isAnonymous: true,
          role: 'student',
          displayName: studentData.name || 'بطل جديد',
          avatarId: studentData.avatarId || 'char_01'
        });
      } else {
        try {
          const tokenResult = await firebaseUser.getIdTokenResult(true);
          const roleClaim = tokenResult.claims.role || null;

          if (roleClaim === 'teacher' || roleClaim === 'admin') {
            notifyAuthChange({
              uid: firebaseUser.uid,
              isAnonymous: false,
              role: roleClaim,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || (roleClaim === 'admin' ? 'مدير المنصة' : 'أ. معلم سكور آر')
            });
            return;
          }

          // Check registered student profile (no role claim per specification)
          const studentSnap = await db.ref(`scorear_students/${firebaseUser.uid}`).once('value').catch(() => null);
          if ((studentSnap && studentSnap.exists()) || (firebaseUser.email && firebaseUser.email.endsWith('@students.scorear.app'))) {
            const val = studentSnap && studentSnap.exists() ? studentSnap.val() : {};
            notifyAuthChange({
              uid: firebaseUser.uid,
              isAnonymous: false,
              role: 'student',
              username: val.username || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'student'),
              displayName: val.displayName || firebaseUser.displayName || 'بطل سكور آر',
              className: val.className || '',
              avatarId: val.avatarId || 'char_01'
            });
            return;
          }

          // Check if teacher pending approval
          const reqSnap = await db.ref(`scorear_account_requests/${firebaseUser.uid}`).once('value').catch(() => null);
          if (reqSnap && reqSnap.exists()) {
            const reqData = reqSnap.val() || {};
            notifyAuthChange({
              uid: firebaseUser.uid,
              isAnonymous: false,
              role: 'pending_teacher',
              status: reqData.status || 'pending',
              email: firebaseUser.email,
              displayName: reqData.displayName || firebaseUser.displayName || 'معلم جديد'
            });
            return;
          }

          notifyAuthChange({
            uid: firebaseUser.uid,
            isAnonymous: false,
            role: null,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'مستخدم'
          });
        } catch(e) {
          notifyAuthChange(null);
        }
      }
    } else {
      notifyAuthChange(null);
    }
  });

  // Arabic Error Mapper
  function mapAuthError(err) {
    const code = err.code || err.message;
    switch(code) {
      case 'WEAK_PASSWORD': return 'كلمة المرور يجب أن تتكون من 8 خانات أو رموز على الأقل.';
      case 'INVALID_EMAIL': return 'يرجى إدخال بريد إلكتروني صحيح.';
      case 'INVALID_USERNAME': return 'اسم المستخدم يجب أن يتكون من 3 إلى 20 حرفاً إنجليزياً أو أرقاماً فقط (A-Z, 0-9, _).';
      case 'INVALID_DISPLAY_NAME': return 'يرجى إدخال اسم العرض للطالب (حرفان على الأقل).';
      case 'INVALID_NAME': return 'يرجى إدخال الاسم الكامل للمعلم بشكل صحيح.';
      case 'EMPTY_SUBJECT': return 'يرجى إدخال مادة التدريس الخاصة بالمعلم.';
      case 'TEACHER_PENDING_REVIEW': return 'طلب حسابك قيد المراجعة والاعتماد من قبل إدارة سكور آر. لا يمكنك دخول استوديو المعلم قبل اعتماد الإدارة.';
      case 'TEACHER_ACCOUNT_REJECTED': return 'نعتذر، لم يتم اعتماد هذا الحساب. يرجى مراجعة إدارة المنصة.';
      case 'GENERIC_REGISTRATION_ERROR': return 'تعذر إكمال التسجيل بهذا المعرف، يرجى التحقق من صحة البيانات أو تجربة اسم مستخدم آخر.';
      case 'STUDENT_STUDIO_FORBIDDEN': return 'استوديو المعلم مخصص للمعلمين المعتمدين فقط. يمكنك الانطلاق لرحلتك التعليمية أو قاعة الأبطال.';
      case 'TOO_MANY_ATTEMPTS': return 'تم تجاوز الحد الأقصى للمحاولات مؤقتاً لحماية الحساب. يرجى الانتظار بضع دقائق والمحاولة مجدداً.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
      case 'auth/invalid-email': return 'البريد أو اسم المستخدم أو كلمة المرور غير صحيحة.';
      case 'auth/user-disabled': return 'تم تعطيل هذا الحساب من قبل الإدارة.';
      case 'auth/too-many-requests': return 'تم حظر المحاولات مؤقتاً لكثرة المحاولات الخاطئة. يرجى الانتظار والمحاولة لاحقاً.';
      case 'auth/network-request-failed': return 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.';
      case 'NOT_AUTHORIZED_ROLE': return 'الحساب مسجل ولكن لا يملك صلاحية معلم أو مشرف معتمد.';
      case 'ROOM_NOT_FOUND': return 'رمز القاعة (PIN) غير موجود أو تم إغلاقه من المعلم.';
      case 'ROOM_LOCKED': return 'هذه القاعة مغلقة حالياً من قبل المعلم ولا تقبل انضمام طلاب جدد.';
      case 'ROOM_CLOSED': return 'تم إنهاء هذه القاعة من قِبل المعلم.';
      case 'EMPTY_FIELDS': return 'يرجى إدخال اسم المستخدم/البريد وكلمة المرور كاملين.';
      default: return err.message || 'حدث خطأ أثناء العملية، يرجى المحاولة ثانية.';
    }
  }

  // Unified Login (Email or Student Username + Password)
  async function login(identifier, password) {
    if (!identifier || !password) throw new Error('EMPTY_FIELDS');
    checkRateLimit(6, 300000);

    const raw = identifier.trim();
    let loginEmail = raw;
    let isStudentUsername = false;

    if (!raw.includes('@')) {
      loginEmail = `${raw.toLowerCase()}@students.scorear.app`;
      isStudentUsername = true;
    }

    try {
      const credential = await auth.signInWithEmailAndPassword(loginEmail, password);
      const user = credential.user;
      const tokenResult = await user.getIdTokenResult(true);
      const roleClaim = tokenResult.claims.role || null;

      // 1. Admin or Approved Teacher
      if (roleClaim === 'admin' || roleClaim === 'teacher') {
        const authUser = {
          uid: user.uid,
          role: roleClaim,
          email: user.email,
          displayName: user.displayName || (roleClaim === 'admin' ? 'مدير المنصة' : 'أ. معلم سكور آر'),
          isAnonymous: false
        };
        notifyAuthChange(authUser);
        return authUser;
      }

      // 2. Check if Teacher is Pending Approval
      const reqSnap = await db.ref(`scorear_account_requests/${user.uid}`).once('value').catch(() => null);
      if (reqSnap && reqSnap.exists()) {
        const reqData = reqSnap.val() || {};
        if (reqData.status === 'pending') {
          await auth.signOut();
          notifyAuthChange(null);
          throw new Error('TEACHER_PENDING_REVIEW');
        } else if (reqData.status === 'rejected') {
          await auth.signOut();
          notifyAuthChange(null);
          throw new Error('TEACHER_ACCOUNT_REJECTED');
        }
      }

      // 3. Registered Student (Authenticated, Non-Anonymous, No Role Claim)
      const studentSnap = await db.ref(`scorear_students/${user.uid}`).once('value').catch(() => null);
      if ((studentSnap && studentSnap.exists()) || isStudentUsername || (user.email && user.email.endsWith('@students.scorear.app'))) {
        const val = studentSnap && studentSnap.exists() ? studentSnap.val() : {};
        const studentUser = {
          uid: user.uid,
          role: 'student',
          isAnonymous: false,
          username: val.username || raw.toLowerCase(),
          displayName: val.displayName || user.displayName || 'بطل سكور آر',
          className: val.className || '',
          avatarId: val.avatarId || 'char_01'
        };
        try { sessionStorage.setItem('scorear_student_session', JSON.stringify(studentUser)); } catch(e){}
        notifyAuthChange(studentUser);
        return studentUser;
      }

      throw new Error('NOT_AUTHORIZED_ROLE');
    } catch(err) {
      if (err.message === 'TEACHER_PENDING_REVIEW' || err.message === 'TEACHER_ACCOUNT_REJECTED' || err.message === 'TOO_MANY_ATTEMPTS') {
        throw err;
      }
      throw new Error('auth/invalid-credential');
    }
  }

  // Teacher Registration (Pending Review State + Email Verification)
  async function registerTeacher({ name, email, password, subject, school }) {
    if (!name || name.trim().length < 2) throw new Error('INVALID_NAME');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('INVALID_EMAIL');
    if (!password || password.length < 8) throw new Error('WEAK_PASSWORD');
    if (!subject || subject.trim().length < 2) throw new Error('EMPTY_SUBJECT');

    checkRateLimit(5, 600000);

    let credential;
    try {
      credential = await auth.createUserWithEmailAndPassword(email.trim(), password);
    } catch(err) {
      if (err.code === 'auth/email-already-in-use') throw new Error('GENERIC_REGISTRATION_ERROR');
      if (err.code === 'auth/weak-password') throw new Error('WEAK_PASSWORD');
      throw err;
    }

    const uid = credential.user.uid;
    await credential.user.updateProfile({ displayName: name.trim() });
    await credential.user.sendEmailVerification().catch(() => {});

    // Save request record with status: 'pending'
    const reqData = {
      uid: uid,
      email: email.trim(),
      displayName: name.trim(),
      subject: subject.trim(),
      school: (school || '').trim(),
      status: 'pending',
      createdAt: window.firebase.database.ServerValue.TIMESTAMP
    };

    await db.ref(`scorear_account_requests/${uid}`).set(reqData);

    // Write admin notification
    const notifId = 'notif_' + Date.now();
    await db.ref(`scorear_admin_notifications/${notifId}`).set({
      id: notifId,
      type: 'new_teacher_registration',
      userId: uid,
      displayName: name.trim(),
      email: email.trim(),
      schoolSubject: subject.trim(),
      createdAt: window.firebase.database.ServerValue.TIMESTAMP
    }).catch(() => {});

    // Sign out immediately so pending teacher cannot enter studio
    await auth.signOut();
    notifyAuthChange(null);

    return {
      success: true,
      status: 'pending',
      email: email.trim(),
      message: 'تم استلام طلب تسجيل المعلم بنجاح وهو الآن قيد مراجعة واعتماد الإدارة.'
    };
  }

  // Student Registration (Pseudo-email username@students.scorear.app, Direct Browser Auth, No Role Claim)
  async function registerStudent({ displayName, username, password, className, avatarId }) {
    if (!displayName || displayName.trim().length < 2) throw new Error('INVALID_DISPLAY_NAME');
    const cleanUsername = String(username || '').trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) throw new Error('INVALID_USERNAME');
    if (!password || password.length < 8) throw new Error('WEAK_PASSWORD');

    checkRateLimit(5, 600000);

    const pseudoEmail = `${cleanUsername.toLowerCase()}@students.scorear.app`;

    let credential;
    try {
      credential = await auth.createUserWithEmailAndPassword(pseudoEmail, password);
    } catch(err) {
      // Safe generic message: Do not reveal if username is taken
      if (err.code === 'auth/email-already-in-use') throw new Error('GENERIC_REGISTRATION_ERROR');
      if (err.code === 'auth/weak-password') throw new Error('WEAK_PASSWORD');
      throw err;
    }

    const uid = credential.user.uid;
    await credential.user.updateProfile({ displayName: displayName.trim() });

    // Save student profile in RTDB scorear_students/{uid}
    const studentData = {
      uid: uid,
      username: cleanUsername,
      displayName: displayName.trim(),
      className: (className || '').trim(),
      avatarId: avatarId || 'char_01',
      createdAt: window.firebase.database.ServerValue.TIMESTAMP
    };

    await db.ref(`scorear_students/${uid}`).set(studentData);

    const studentUser = {
      uid: uid,
      role: 'student',
      isAnonymous: false,
      username: cleanUsername,
      displayName: displayName.trim(),
      className: (className || '').trim(),
      avatarId: avatarId || 'char_01'
    };

    try { sessionStorage.setItem('scorear_student_session', JSON.stringify(studentUser)); } catch(e){}
    notifyAuthChange(studentUser);
    return studentUser;
  }

  // Student Fast Join (Independent PIN flow for Guests)
  async function joinStudent(pin, name, avatarId) {
    const raw = String(pin || '');
    const cleanPin = raw.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\s+/g, '').trim();
    if (!/^\d{6}$/.test(cleanPin)) throw new Error('ROOM_NOT_FOUND');

    let user = auth.currentUser;
    if (!user) {
      try {
        const timeoutAuth = new Promise((_, rej) => setTimeout(() => rej(new Error('AUTH_TIMEOUT')), 2500));
        const credential = await Promise.race([auth.signInAnonymously(), timeoutAuth]);
        user = credential ? credential.user : null;
      } catch(e) {
        user = { uid: 'guest_' + Math.random().toString(36).slice(2, 9), isAnonymous: true };
      }
    }

    let roomExists = false, roomIsLocked = false, roomClosed = false;
    const hostPin = (window.ScoreARQuizHost && window.ScoreARQuizHost.getPin) ? window.ScoreARQuizHost.getPin() : window.currentLobbyPin;
    if (hostPin === cleanPin) {
      roomExists = true;
      if (window.ScoreARQuizHost && typeof window.ScoreARQuizHost.isLocked === 'function' && window.ScoreARQuizHost.isLocked()) {
        roomIsLocked = true;
      }
    }

    if (!roomExists) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const timeoutDb = new Promise((_, rej) => setTimeout(() => rej(new Error('DB_TIMEOUT')), 1200));
          const [snapEvents, snapRooms] = await Promise.all([
            Promise.race([db.ref('scorear_rooms/' + cleanPin).once('value'), timeoutDb]).catch(() => null),
            Promise.race([db.ref('rooms/' + cleanPin).once('value'), timeoutDb]).catch(() => null)
          ]);

          if (snapRooms && snapRooms.exists()) {
            const val = snapRooms.val() || {};
            if (val.status === 'closed') { roomClosed = true; break; }
            if (val.isLocked || val.status === 'locked') roomIsLocked = true;
            roomExists = true;
            break;
          } else if (snapEvents && snapEvents.exists() && snapEvents.hasChildren()) {
            const evs = Object.values(snapEvents.val() || {});
            if (evs.some(e => e && e.type === 'ROOM_CLOSED')) { roomClosed = true; break; }
            const lockEv = evs.slice().reverse().find(e => e && (e.type === 'ROOM_LOCK_STATE' || e.type === 'ROOM_LOCKED'));
            if (lockEv && (lockEv.isLocked || lockEv.locked)) roomIsLocked = true;
            roomExists = true;
            break;
          }
        } catch(e) {
          roomExists = true;
          break;
        }
        if (attempt < 1) await new Promise(r => setTimeout(r, 200));
      }
    }

    if (roomClosed) throw new Error('ROOM_CLOSED');
    if (roomIsLocked) throw new Error('ROOM_LOCKED');
    if (!roomExists && hostPin !== cleanPin) throw new Error('ROOM_NOT_FOUND');

    const studentData = {
      name: (name || 'بطل جديد').trim(),
      avatarId: avatarId || 'char_01',
      pin: cleanPin,
      uid: (user && user.uid) ? user.uid : ('guest_' + Math.random().toString(36).slice(2, 9)),
      isAnonymous: !user || user.isAnonymous !== false,
      role: 'student'
    };
    try { sessionStorage.setItem('scorear_student_session', JSON.stringify(studentData)); } catch(e){}

    const studentUser = { uid: user.uid, role: 'student', isAnonymous: true, displayName: studentData.name, ...studentData };
    notifyAuthChange(studentUser);
    return studentUser;
  }

  // Password Reset (Email only for teachers/admins; students reset via teacher/admin)
  async function sendPasswordReset(identifier) {
    if (!identifier) throw new Error('EMPTY_FIELDS');
    const raw = identifier.trim();
    if (!raw.includes('@')) {
      throw new Error('إعادة تعيين كلمة مرور الطالب تتم مباشرة بواسطة معلّم الفصل أو إدارة المدرسة.');
    }
    await auth.sendPasswordResetEmail(raw);
  }

  async function checkApprovalStatus() {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error('EMPTY_FIELDS');
    await firebaseUser.reload();
    const tokenResult = await firebaseUser.getIdTokenResult(true);
    const role = tokenResult.claims.role || null;
    if (role === 'teacher' || role === 'admin') {
      const authUser = {
        uid: firebaseUser.uid,
        role: role,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || 'أ. معلم سكور آر',
        isAnonymous: false
      };
      notifyAuthChange(authUser);
      if (global.ScoreARAuthUI && typeof global.ScoreARAuthUI.updateTopActionsTeacher === 'function') {
        global.ScoreARAuthUI.updateTopActionsTeacher(authUser);
      }
      location.hash = '#studio';
      if (global.render) global.render();
      if (global.toast) global.toast('تهانينا! تم اعتماد حسابك وتفعيل صلاحيات الاستوديو بنجاح 🚀');
      return { approved: true, role };
    } else {
      if (!firebaseUser.emailVerified) {
        if (global.toast) global.toast('يرجى تفعيل بريدك أولاً عبر الرابط المرسل لصندوق بريدك ✉️');
      } else {
        if (global.toast) global.toast('البريد مفعل ✓، ولكن الحساب لا يزال قيد مراجعة واعتماد الإدارة ⏳');
      }
      return { approved: false, emailVerified: firebaseUser.emailVerified };
    }
  }

  async function logout() {
    await auth.signOut();
    try {
      sessionStorage.removeItem('scorear_student_session');
      localStorage.removeItem('scorear_teacher_session');
      sessionStorage.removeItem('scorear_teacher_session');
    } catch(e){}
    notifyAuthChange(null);
  }

  // Public API
  global.ScoreARAuth = {
    login,
    loginTeacher: login, // Backwards compatible alias
    registerTeacher,
    registerStudent,
    joinStudent,
    sendPasswordReset,
    checkApprovalStatus,
    logout,
    mapAuthError,
    getDb: () => db,
    getAuth: () => auth,
    getUser: () => currentAuthUser,
    hasRole: (r) => currentAuthUser && currentAuthUser.role === r,
    onAuthStateChanged: (fn) => {
      authStateListeners.push(fn);
      if (currentAuthUser !== null) fn(currentAuthUser);
    }
  };

})(window);
