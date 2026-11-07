/**
 * ScoreAR Vercel Serverless API: /api/account-request
 * Phase E: Admin & Account Role Management
 * Supports: Teacher Approval/Rejection with Custom Claims (role: 'teacher'),
 * Student Password Resets & Deletions, and Account Status Toggles.
 * Strictly Rule 7 Compliant (<500 lines).
 */
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

function initAdmin() {
  if (getApps().length) return getApps()[0];

  let credential = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = cert(sa);
    } catch (e) {
      console.warn('Failed parsing FIREBASE_SERVICE_ACCOUNT:', e.message);
    }
  } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    credential = cert({
      projectId: process.env.FIREBASE_PROJECT_ID || 'scorear2',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    });
  }

  const databaseURL = process.env.FIREBASE_DATABASE_URL || 'https://scorear2-default-rtdb.europe-west1.firebasedatabase.app';

  return initializeApp({
    credential: credential || undefined,
    databaseURL
  });
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://scorear-e4186.web.app',
    'https://scorear-e4186.firebaseapp.com',
    'https://scorear2.web.app',
    'https://scorear2.firebaseapp.com'
  ];
  const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : allowedOrigins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'طريقة غير مدعومة. يرجى استخدام POST.' });

  try {
    initAdmin();

    // 1. Authenticate Admin via ID Token
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'غير مصرح: يجب تسجيل دخول الأدمن أولاً.' });
    }
    const idToken = authHeader.substring(7).trim();

    let decoded = null;
    try {
      decoded = await getAuth().verifyIdToken(idToken);
    } catch (e) {
      return res.status(401).json({ error: 'رمز الجلسة غير صالح أو منتهي الصلاحية.' });
    }

    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'غير مصرح: تنفيذ هذه العملية يتطلب صلاحيات إدارة المنصة (Admin).' });
    }

    const adminUid = decoded.uid;
    const db = getDatabase();
    const { action, targetUid, newPassword, note, subject, isActive } = req.body || {};

    if (!action || !targetUid) {
      return res.status(400).json({ error: 'بيانات غير مكتملة: يجب تحديد الإجراء ومعرّف الحساب المستهدف.' });
    }

    const now = Date.now();

    // --- ACTION 1: APPROVE TEACHER REQUEST ---
    if (action === 'approve') {
      let targetUser = null;
      try {
        targetUser = await getAuth().getUser(targetUid);
      } catch (e) {
        return res.status(404).json({ error: 'حساب المعلم غير موجود في نظام التوثيق.' });
      }

      if (!targetUser.emailVerified) {
        return res.status(400).json({ error: 'لا يمكن اعتماد المعلم قبل تفعيل بريده الإلكتروني (emailVerified غير مفعّل).' });
      }

      // Assign teacher claim
      await getAuth().setCustomUserClaims(targetUid, { role: 'teacher' });

      // Update scorear_account_requests
      const reqRef = db.ref(`scorear_account_requests/${targetUid}`);
      const snap = await reqRef.once('value');
      const reqData = snap.val() || {};

      await reqRef.update({
        status: 'approved',
        reviewedAt: now,
        reviewedBy: adminUid,
        reviewNote: note || 'تم الاعتماد بنجاح بواسطة الإدارة.'
      });

      // Write into scorear_teachers_registry with firebaseUid for v2 queries
      await db.ref(`scorear_teachers_registry/${targetUid}`).set({
        userId: targetUid,
        firebaseUid: targetUid,
        email: reqData.email || targetUser.email || '',
        displayName: reqData.displayName || targetUser.displayName || 'معلم سكور آر',
        schoolSubject: reqData.subject || '',
        school: reqData.school || '',
        status: 'approved',
        updatedAt: now
      });

      return res.status(200).json({ success: true, message: 'تم اعتماد حساب المعلم وضبط صلاحيات الدور بنجاح.', status: 'approved' });
    }

    // --- ACTION 2: REJECT TEACHER REQUEST ---
    if (action === 'reject') {
      await getAuth().setCustomUserClaims(targetUid, { role: null }).catch(() => {});

      await db.ref(`scorear_account_requests/${targetUid}`).update({
        status: 'rejected',
        reviewedAt: now,
        reviewedBy: adminUid,
        reviewNote: note || 'تم الرفض بواسطة الإدارة.'
      });

      await db.ref(`scorear_teachers_registry/${targetUid}`).update({
        status: 'rejected',
        updatedAt: now
      });

      return res.status(200).json({ success: true, message: 'تم رفض طلب المعلم بنجاح.', status: 'rejected' });
    }

    // --- ACTION 3: TOGGLE TEACHER STATUS (SUSPEND / ACTIVATE) ---
    if (action === 'toggleTeacherStatus') {
      const willBeActive = Boolean(isActive);
      await getAuth().setCustomUserClaims(targetUid, { role: willBeActive ? 'teacher' : null });
      await db.ref(`scorear_teachers_registry/${targetUid}`).update({
        status: willBeActive ? 'approved' : 'suspended',
        updatedAt: now
      });
      return res.status(200).json({ success: true, message: willBeActive ? 'تم تفعيل حساب المعلم.' : 'تم إيقاف حساب المعلم مؤقتاً.' });
    }

    // --- ACTION 4: DELETE TEACHER ACCOUNT ---
    if (action === 'deleteTeacher') {
      await getAuth().deleteUser(targetUid).catch(err => console.warn('Auth user delete warn:', err.message));
      await db.ref(`scorear_teachers_registry/${targetUid}`).remove();
      await db.ref(`scorear_account_requests/${targetUid}`).update({ status: 'deleted', reviewedAt: now, reviewedBy: adminUid });
      return res.status(200).json({ success: true, message: 'تم حذف حساب المعلم وسجلاته بالكامل.' });
    }

    // --- ACTION 5: TOGGLE STUDENT STATUS (ACTIVE / SUSPENDED) ---
    if (action === 'toggleStudentStatus') {
      const willBeActive = Boolean(isActive);
      await db.ref(`scorear_students/${targetUid}`).update({
        isActive: willBeActive,
        updatedAt: now
      });
      return res.status(200).json({ success: true, message: willBeActive ? 'تم تفعيل حساب الطالب.' : 'تم إيقاف حساب الطالب.' });
    }

    // --- ACTION 6: RESET STUDENT PASSWORD ---
    if (action === 'resetStudentPassword') {
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 8 خانات على الأقل.' });
      }
      await getAuth().updateUser(targetUid, { password: newPassword });
      await db.ref(`scorear_students/${targetUid}`).update({
        isTemporaryPassword: true,
        updatedAt: now
      });
      return res.status(200).json({ success: true, message: 'تم تغيير كلمة المرور بنجاح وتعيينها كمؤقتة.' });
    }

    // --- ACTION 7: DELETE STUDENT ACCOUNT ---
    if (action === 'deleteStudentAccount') {
      await getAuth().deleteUser(targetUid).catch(err => console.warn('Auth student delete warn:', err.message));
      await db.ref(`scorear_students/${targetUid}`).remove();
      return res.status(200).json({ success: true, message: 'تم حذف حساب الطالب وبياناته بالكامل.' });
    }

    return res.status(400).json({ error: 'نوع الإجراء المطلوب غير معروف.' });

  } catch (err) {
    console.error('Account-request serverless error:', err);
    return res.status(500).json({ error: 'حدث خطأ غير متوقع أثناء معالجة الطلب: ' + err.message });
  }
}
