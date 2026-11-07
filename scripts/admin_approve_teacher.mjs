/**
 * ScoreAR Admin CLI Tool: Approve Teacher Account
 * Usage: node scripts/admin_approve_teacher.mjs <teacher_email_or_uid>
 * 
 * Verifies emailVerified status, grants { role: 'teacher' } custom claim,
 * and updates status to 'approved' in RTDB scorear_account_requests and scorear_teachers_registry.
 */
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Look for service account in standard locations or initialize with project
const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
let adminApp;
if (fs.existsSync(serviceAccountPath)) {
  const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  adminApp = initializeApp({
    credential: cert(sa),
    databaseURL: 'https://scorear2-default-rtdb.europe-west1.firebasedatabase.app'
  });
} else {
  adminApp = initializeApp({
    projectId: 'scorear2',
    databaseURL: 'https://scorear2-default-rtdb.europe-west1.firebasedatabase.app'
  });
}

const target = process.argv[2];
if (!target) {
  console.log('الاستخدام: node scripts/admin_approve_teacher.mjs <البريد_الإلكتروني_أو_المعرف>');
  console.log('مثال: node scripts/admin_approve_teacher.mjs teacher@school.edu');
  process.exit(1);
}

async function approveTeacher() {
  const auth = getAuth();
  const db = getDatabase();

  let userRecord;
  try {
    if (target.includes('@')) {
      userRecord = await auth.getUserByEmail(target.trim());
    } else {
      userRecord = await auth.getUser(target.trim());
    }
  } catch(e) {
    console.error('❌ لم يتم العثور على هذا المستخدم في Firebase Auth:', e.message);
    process.exit(1);
  }

  const uid = userRecord.uid;
  console.log(`جارٍ فحص بيانات المعلم: ${userRecord.displayName || 'معلم'} (${userRecord.email}) [UID: ${uid}]...`);

  // 1. Check emailVerified requirement
  if (!userRecord.emailVerified) {
    console.error('⚠️ تحذير أمني: البريد الإلكتروني لهذا المعلم غير مفعل بعد (emailVerified === false).');
    console.log('يجب على المعلم الضغط على رابط التفعيل المرسل لبريده أولاً، أو تفعيله يدوياً عبر الكونسول.');
    process.exit(1);
  }

  // 2. Set Custom Claim
  await auth.setCustomUserClaims(uid, { role: 'teacher' });
  console.log('✓ تم تعيين صلاحية الدور بنجاح: { role: "teacher" }');

  // 3. Update RTDB request and registry
  const reqRef = db.ref(`scorear_account_requests/${uid}`);
  const snap = await reqRef.once('value');
  const reqData = snap.val() || {};

  const now = Date.now();
  await reqRef.update({
    status: 'approved',
    reviewedAt: now,
    reviewedBy: 'admin_cli',
    reviewNote: 'Approved via Admin CLI'
  });

  await db.ref(`scorear_teachers_registry/${uid}`).set({
    userId: uid,
    firebaseUid: uid,
    email: userRecord.email,
    displayName: userRecord.displayName || reqData.displayName || 'معلم سكور آر',
    schoolSubject: reqData.subject || 'عام',
    school: reqData.school || '',
    status: 'approved',
    updatedAt: now
  });

  console.log('✓ تم تحديث حالة الطلب إلى "approved" في قاعدة البيانات وسجل المعلمين.');
  console.log('🎉 اكتمل اعتماد المعلم بنجاح! يمكن للمعلم الآن الضغط على زر "تحقق من الاعتماد 🔄" أو تسجيل الدخول لدخول الاستوديو مباشرة.');
  process.exit(0);
}

approveTeacher().catch(err => {
  console.error('حدث خطأ أثناء الاعتماد:', err.message);
  process.exit(1);
});
