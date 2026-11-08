/**
 * ScoreAR Serverless API: /api/upload-token
 * Items 3, 4, 5 & 8: Vercel Blob client upload token generation,
 * direct upload, and teacher-isolated orphan image deletion.
 * Strictly Rule 7 Compliant (<500 lines).
 */
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { put, del } from '@vercel/blob';
import { handleUpload } from '@vercel/blob/client';

// Initialize firebase-admin singleton using FIREBASE_ADMIN_SERVICE_ACCOUNT
function getAdminAuth() {
  if (getApps().length) return getAuth();

  const rawSa = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!rawSa) {
    return null; // Fail closed if missing
  }

  try {
    const sa = typeof rawSa === 'string' ? JSON.parse(rawSa) : rawSa;
    initializeApp({ credential: cert(sa) });
    return getAuth();
  } catch (e) {
    console.error('[firebase-admin] Failed to parse FIREBASE_ADMIN_SERVICE_ACCOUNT:', e.message);
    return null;
  }
}

export default async function handler(req, res) {
  // 1. Strict Explicit CORS (Item 3)
  const origin = req.headers.origin || '';
  const explicitAllowedOrigins = new Set([
    'https://socerar2.vercel.app',
    'https://scorear2.vercel.app',
    'https://scorear2.web.app',
    'https://scorear2.firebaseapp.com'
  ]);

  if (process.env.VERCEL_URL) {
    explicitAllowedOrigins.add(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.VERCEL_BRANCH_URL) {
    explicitAllowedOrigins.add(`https://${process.env.VERCEL_BRANCH_URL}`);
  }

  const isLocalDev = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
  const isAllowed = explicitAllowedOrigins.has(origin) || (isLocalDev && process.env.NODE_ENV !== 'production');

  if (origin && !isAllowed) {
    return res.status(403).json({ error: 'رفض CORS: النطاق غير مصرح به.' });
  }

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'طريقة غير مدعومة. يرجى استخدام POST.' });

  try {
    // 2. Authentication: Teacher/Admin ID Token verification via firebase-admin
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'عفواً، يجب تسجيل دخول المعلم أولاً لرفع أو حذف صور الأسئلة.' });
    }
    const idToken = authHeader.substring(7).trim();

    let teacherUid = null;
    let isTeacher = false;

    const auth = getAdminAuth();
    if (auth) {
      try {
        const decoded = await auth.verifyIdToken(idToken, true);
        teacherUid = decoded.uid;
        isTeacher = (decoded.role === 'teacher' || decoded.role === 'admin');
      } catch (e) {
        console.warn('[upload-token] verifyIdToken error:', e.message);
      }
    } else if (!idToken.startsWith('test_') && process.env.NODE_ENV !== 'test') {
      // Fail closed when service account is not configured in runtime
      return res.status(401).json({ error: 'فشل التحقق: مفتاح الخدمة FIREBASE_ADMIN_SERVICE_ACCOUNT غير مهيأ في الخادم.' });
    }

    // Local automated test harness support
    if (!teacherUid && process.env.NODE_ENV === 'test') {
      if (idToken.startsWith('test_teacher_token_')) {
        teacherUid = idToken.replace('test_teacher_token_', 'teacher_');
        isTeacher = true;
      } else if (idToken.startsWith('test_student_token_')) {
        teacherUid = 'test_student_uid';
        isTeacher = false;
      }
    }

    if (!teacherUid) {
      return res.status(401).json({ error: 'رمز الجلسة غير صالح أو ملغي. يرجى إعادة تسجيل الدخول.' });
    }

    if (!isTeacher) {
      return res.status(403).json({ error: 'غير مصرح: إدارة ورفع صور الأسئلة مخصص لحسابات المعلمين والأدمن فقط.' });
    }

    // 3. Isolated Image Deletion with Cross-Teacher Check (Item 5)
    if (req.body && req.body.action === 'delete') {
      const targetUrl = req.body.url;
      if (!targetUrl || typeof targetUrl !== 'string') {
        return res.status(400).json({ error: 'رابط الصورة المطلوب حذفها مفقود.' });
      }

      // Security Check: Path MUST contain /quiz-images/{teacherUid}/
      const expectedPathPrefix = `/quiz-images/${teacherUid}/`;
      if (!targetUrl.includes(expectedPathPrefix)) {
        return res.status(403).json({ error: 'غير مصرح: لا يمكنك حذف صور تخص معلماً آخر.' });
      }

      try {
        if (process.env.BLOB_READ_WRITE_TOKEN) {
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

      // Enforce file restrictions: type & size
      const allowedTypes = ['image/webp', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(mime)) {
        return res.status(400).json({ error: 'نوع الملف غير مدعوم. الأنواع المسموحة فقط: WebP, JPEG, PNG.' });
      }

      const maxBytes = 500 * 1024; // 500KB strict limit
      if (buffer.length > maxBytes) {
        return res.status(400).json({ error: `حجم الصورة (${(buffer.length / 1024).toFixed(1)}KB) يتجاوز الحد المسموح (500KB).` });
      }

      // Path strictly isolated to quiz-images/{uid}/
      const filename = `quiz-images/${teacherUid}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.webp`;

      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(filename, buffer, {
          access: 'public',
          contentType: mime
        });
        return res.status(200).json({ url: blob.url, size: buffer.length, contentType: mime });
      } else {
        const mockUrl = `https://scorear-cdn.vercel.app/${filename}`;
        return res.status(200).json({ url: mockUrl, size: buffer.length, contentType: mime, notice: 'dev_mock_blob' });
      }
    }

    // 5. Vercel Blob client upload handleUpload protocol (Path prefix: quiz-images/{uid}/)
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
