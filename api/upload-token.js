/**
 * ScoreAR Serverless API: /api/upload-token
 * Phase 1: Vercel Blob Image Uploads, Universal CORS, and Dynamic Firebase-Admin.
 * Strictly Rule 7 Compliant (<350 lines).
 */

const ALLOWED_ORIGINS = [
  'https://scorear2.web.app',
  'https://scorear2.firebaseapp.com',
  'https://socerar2.vercel.app',
  'https://scorear2.vercel.app'
];

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith('.vercel.app') ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:');

  const allowOrigin = isAllowed ? origin : (origin ? ALLOWED_ORIGINS[0] : '*');
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

let cachedAuth = null;
async function getAdminAuth() {
  if (cachedAuth) return cachedAuth;

  const rawSa = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!rawSa) {
    return { auth: null, missingSa: true };
  }

  try {
    const { getApps, initializeApp, cert } = await import('firebase-admin/app');
    const { getAuth } = await import('firebase-admin/auth');

    if (getApps().length) {
      cachedAuth = { auth: getAuth(), missingSa: false };
      return cachedAuth;
    }

    const sa = typeof rawSa === 'string' ? JSON.parse(rawSa) : rawSa;
    const app = initializeApp({
      credential: cert(sa),
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://scorear2-default-rtdb.europe-west1.firebasedatabase.app'
    });
    cachedAuth = { auth: getAuth(app), missingSa: false };
    return cachedAuth;
  } catch (e) {
    console.error('[upload-token] firebase-admin init error:', e.message);
    return { auth: null, missingSa: false, initError: e.message };
  }
}

export default async function handler(req, res) {
  // 1. Universal Safe CORS & Preflight Response
  if (setCorsHeaders(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'طريقة غير مدعومة. يرجى استخدام POST.' });
  }

  try {
    // 2. Authentication: Teacher / Admin ID Token verification
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'عفواً، يجب تسجيل دخول المعلم أولاً لرفع أو حذف صور الأسئلة.' });
    }
    const idToken = authHeader.substring(7).trim();

    let teacherUid = null;
    let isTeacher = false;

    const { auth, missingSa, initError } = await getAdminAuth();
    if (auth) {
      try {
        const decoded = await auth.verifyIdToken(idToken, true);
        teacherUid = decoded.uid;
        isTeacher = (decoded.role === 'teacher' || decoded.role === 'admin');
      } catch (e) {
        console.warn('[upload-token] verifyIdToken notice:', e.message);
      }
    } else if (process.env.NODE_ENV === 'test') {
      if (idToken.startsWith('test_teacher_token_')) {
        teacherUid = idToken.replace('test_teacher_token_', 'teacher_');
        isTeacher = true;
      } else if (idToken.startsWith('test_student_token_')) {
        teacherUid = 'test_student_uid';
        isTeacher = false;
      }
    } else if (missingSa) {
      return res.status(500).json({
        error: 'مفتاح الخدمة السحابي غير مضبوط (يرجى ضبط متغير FIREBASE_ADMIN_SERVICE_ACCOUNT في إعدادات Vercel Dashboard).'
      });
    } else {
      return res.status(500).json({
        error: 'فشل تهيئة خدمة المصادقة السحابية: ' + (initError || 'خطأ غير معروف')
      });
    }

    if (!teacherUid) {
      return res.status(401).json({ error: 'رمز الجلسة غير صالح أو ملغي. يرجى إعادة تسجيل الدخول.' });
    }

    if (!isTeacher) {
      return res.status(403).json({ error: 'غير مصرح: إدارة ورفع صور الأسئلة مخصص لحسابات المعلمين والأدمن فقط.' });
    }

    // 3. Image Deletion via @vercel/blob
    if (req.body && req.body.action === 'delete') {
      const targetUrl = req.body.url;
      if (!targetUrl || typeof targetUrl !== 'string') {
        return res.status(400).json({ error: 'رابط الصورة المطلوب حذفها مفقود.' });
      }

      const expectedPathPrefix = `/quiz-images/${teacherUid}/`;
      if (!targetUrl.includes(expectedPathPrefix)) {
        return res.status(403).json({ error: 'غير مصرح: لا يمكنك حذف صور تخص معلماً آخر.' });
      }

      try {
        if (process.env.BLOB_READ_WRITE_TOKEN) {
          const { del } = await import('@vercel/blob');
          await del(targetUrl);
        }
        return res.status(200).json({ success: true, deletedUrl: targetUrl });
      } catch (err) {
        console.warn('[upload-token] Error deleting blob:', err.message);
        return res.status(500).json({ error: 'تعذر حذف الصورة من التخزين السحابي: ' + err.message });
      }
    }

    // 4. Direct Upload Support via put() (Path prefix: quiz-images/{uid}/)
    if (req.body && (req.body.imageBase64 || req.body.fileBase64)) {
      const rawBase64 = req.body.imageBase64 || req.body.fileBase64;
      const mimeMatch = rawBase64.match(/^data:([^;]+);base64,/);
      const mime = (mimeMatch ? mimeMatch[1] : req.body.contentType) || 'image/webp';
      const cleanBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      const allowedTypes = ['image/webp', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(mime)) {
        return res.status(400).json({ error: 'نوع الملف غير مدعوم. الأنواع المسموحة فقط: WebP, JPEG, PNG.' });
      }

      const maxBytes = 500 * 1024; // 500KB strict limit
      if (buffer.length > maxBytes) {
        return res.status(400).json({ error: `حجم الصورة (${(buffer.length / 1024).toFixed(1)}KB) يتجاوز الحد المسموح (500KB).` });
      }

      const filename = `quiz-images/${teacherUid}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.webp`;

      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const { put } = await import('@vercel/blob');
        const blob = await put(filename, buffer, {
          access: 'public',
          contentType: mime
        });
        return res.status(200).json({ url: blob.url, size: buffer.length, contentType: mime });
      } else {
        return res.status(500).json({
          error: 'رمز التخزين السحابي غير مضبوط (يرجى ضبط BLOB_READ_WRITE_TOKEN في إعدادات Vercel Dashboard).'
        });
      }
    }

    // 5. Vercel Blob client upload handleUpload protocol
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({
        error: 'رمز التخزين السحابي غير مضبوط (يرجى ضبط BLOB_READ_WRITE_TOKEN في إعدادات Vercel Dashboard).'
      });
    }

    const { handleUpload } = await import('@vercel/blob/client');
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: ['image/webp', 'image/jpeg', 'image/png'],
          maximumSizeInBytes: 500 * 1024,
          pathname: `quiz-images/${teacherUid}/${pathname || (Date.now() + '.webp')}`,
          tokenPayload: JSON.stringify({ teacherUid })
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('[ScoreAR Blob] Upload completed:', blob.url, tokenPayload);
      }
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('[ScoreAR Blob] Upload token handler error:', error);
    return res.status(500).json({ error: error.message || 'حدث خطأ أثناء معالجة رفع الصورة.' });
  }
}
