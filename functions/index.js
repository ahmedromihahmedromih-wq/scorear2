/**
 * ScoreAR Firebase Cloud Function: generateQuestions
 * Item 4: Server-side Gemini AI question generation, ID Token verification, Daily quota (20/day), Multimodal OCR.
 */
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

if (!getApps().length) initializeApp();

const ALLOWED_ORIGINS = [
  'https://scorear-e4186.web.app',
  'https://scorear-e4186.firebaseapp.com',
  'https://scorear2.web.app',
  'https://scorear2.firebaseapp.com'
];

export const generateQuestions = onRequest({
  region: 'europe-west1',
  cors: (req, res) => {
    const origin = req.headers.origin || '';
    if (ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  },
  secrets: ['GEMINI_API_KEY'],
  timeoutSeconds: 120,
  maxInstances: 10
}, async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'طريقة غير مدعومة. يرجى استخدام POST.' });

  try {
    // 1. Authenticate Teacher via ID Token
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'عفواً، يجب تسجيل دخول المعلم أولاً لاستخدام التوليد الذكي.' });
    }
    const idToken = authHeader.substring(7).trim();
    let decodedToken = null;
    try {
      decodedToken = await getAuth().verifyIdToken(idToken);
    } catch (e) {
      return res.status(401).json({ error: 'رمز الجلسة غير صالح أو منتهي الصلاحية. يرجى إعادة تسجيل الدخول.' });
    }

    const teacherUid = decodedToken.uid;
    const db = getDatabase();

    // 2. Check Daily Quota (20 requests per day)
    const today = new Date().toISOString().slice(0, 10);
    const quotaRef = db.ref(`scorear_ai_quotas/${teacherUid}/${today}`);
    const quotaSnap = await quotaRef.once('value');
    let quotaData = quotaSnap.val() || { usedCount: 0, limit: 20, lastUsedAt: 0 };

    if (quotaData.usedCount >= (quotaData.limit || 20)) {
      return res.status(429).json({
        error: `لقد استنفدت حصتك اليومية المحددة (${quotaData.limit || 20} طلباً). تتجدد الحصة تلقائياً غداً.`,
        quota: quotaData
      });
    }

    // 3. Gemini API Key from Secrets/Environment (Never exposed to client)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'مفتاح الذكاء الاصطناعي غير مضبوط في إعدادات الخادم.' });
    }

    // 4. Parse Request Payload
    const {
      content = '',
      fileBase64 = null,
      mimeType = null,
      count = 5,
      subject = 'لغة عربية',
      grade = 'المرحلة الإعدادية',
      lesson = '',
      difficulty = 'متوسط',
      format = 'mcq'
    } = req.body || {};

    if (!content.trim() && !fileBase64) {
      return res.status(400).json({ error: 'يرجى تقديم نص تعليمي أو رفع ملف/صورة للتوليد.' });
    }

    // 5. Construct Prompts & Multimodal Parts
    const qCount = Math.max(1, Math.min(Number(count) || 5, 20));
    const systemPrompt = `أنت خبير تربوي ومستشار وضع امتحانات تعليمية معتمد.
مهمتك: صياغة ${qCount} سؤالاً تعليمياً تفاعلياً ومطابقاً للمناهج العربية، بناءً على المحتوى المعطى.

القواعد الصارمة:
1. صلب المنهج فقط: يُمنع تماماً أي سؤال عن أرقام الصفحات أو الطبعة أو دار النشر أو أسماء المؤلفين.
2. اكتمال الخيارات: 4 خيارات مستقلة وواضحة، بلا خيارات مكررة، وبلا خيارات ناقصة أو تنتهي بنقاط حذف (...).
3. إجابة صحيحة دقيقة: تحديد رقم الإجابة الصحيحة بدقة (1 إلى 4)، مع شرح تعليلي موجز.
4. الإخراج بصيغة مصفوفة JSON حصراً:
[
  {
    "q": "نص السؤال الواضح والمكتمل",
    "opts": ["الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"],
    "ans": 0,
    "timeLimit": 20,
    "points": 1000,
    "explain": "تعليل تربوي لسبب صحة الخيار"
  }
]`;

    const userPrompt = `المحتوى التعليمي:
"""
${content.trim()}
"""
التخصص/المادة: ${subject}
الصف الدراسي: ${grade}
الدرس: ${lesson || 'محتوى تعليمي'}
مستوى الصعوبة: ${difficulty}
نمط الأسئلة: ${format}
عدد الأسئلة المطلوبة: ${qCount}
صغ الأسئلة باللغة العربية الفصحى وأعد مصفوفة JSON فقط.`;

    const parts = [];
    if (fileBase64 && mimeType) {
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: fileBase64
        }
      });
    }
    parts.push({ text: systemPrompt + '\n\n' + userPrompt });

    // 6. Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const aiResp = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      return res.status(502).json({ error: 'تعذر الاتصال بمحرك الذكاء الاصطناعي.', details: errText });
    }

    const aiData = await aiResp.json();
    const rawReply = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawReply) {
      return res.status(502).json({ error: 'لم يتم استلام رد صالح من الذكاء الاصطناعي.' });
    }

    // 7. Validate and Sanitize Questions
    let parsedArray = [];
    try {
      parsedArray = JSON.parse(rawReply);
    } catch (e) {
      const m = rawReply.match(/\[[\s\S]*\]/);
      if (m) parsedArray = JSON.parse(m[0]);
      else throw new Error('تعذر قراءة صيغة JSON المستلمة.');
    }

    if (!Array.isArray(parsedArray)) parsedArray = parsedArray.questions || [];

    const validQuestions = parsedArray
      .filter(item => {
        const qText = (item.q || item.text || '').trim();
        const opts = (item.opts || item.options || []).map(o => String(o).trim()).filter(Boolean);
        if (qText.length < 8 || opts.length < 2) return false;
        if (new Set(opts).size !== opts.length) return false; // no duplicates
        return true;
      })
      .map((item, idx) => {
        const opts = (item.opts || item.options || []).map(o => String(o).trim()).filter(Boolean);
        let ansIdx = 0;
        if (item.ans !== undefined && Number(item.ans) >= 0 && Number(item.ans) < opts.length) {
          ansIdx = Number(item.ans);
        } else if (item.correctAnswer !== undefined && Number(item.correctAnswer) >= 1 && Number(item.correctAnswer) <= opts.length) {
          ansIdx = Number(item.correctAnswer) - 1;
        }

        return {
          id: 'q_' + Date.now() + '_' + idx,
          q: (item.q || item.text || '').trim(),
          opts: opts,
          ans: ansIdx,
          timeLimit: Math.max(5, Math.min(Number(item.timeLimit) || 20, 120)),
          points: [0, 1000, 2000].includes(Number(item.points)) ? Number(item.points) : 1000,
          explain: (item.explain || item.explanation || '').trim()
        };
      });

    if (!validQuestions.length) {
      return res.status(422).json({
        error: 'لم يتمكن الذكاء الاصطناعي من صياغة أسئلة سليمة من هذا المحتوى. يرجى تزويد فقرة أكثر تركيزاً من الدرس.'
      });
    }

    // 8. Deduct Daily Quota
    quotaData.usedCount = (quotaData.usedCount || 0) + 1;
    quotaData.lastUsedAt = Date.now();
    await quotaRef.set(quotaData);

    return res.status(200).json({
      success: true,
      questions: validQuestions,
      quota: {
        used: quotaData.usedCount,
        limit: quotaData.limit || 20,
        remaining: Math.max(0, (quotaData.limit || 20) - quotaData.usedCount)
      }
    });

  } catch (err) {
    console.error('generateQuestions error:', err);
    return res.status(500).json({ error: 'حدث خطأ غير متوقع أثناء المعالجة: ' + err.message });
  }
});

/**
 * ScoreAR Server-Side Account & Role Claims Management Function
 * Rebuilds legacy scorearAccountRequest pattern with real Firebase Admin SDK custom claims.
 * Handles: Admin approval/rejection of teacher requests, and teacher/admin student management.
 */
export const scorearAccountRequest = onRequest({
  region: 'europe-west1',
  cors: (req, res) => {
    const origin = req.headers.origin || '';
    if (ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  },
  timeoutSeconds: 60,
  maxInstances: 10
}, async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'طريقة غير مدعومة. يرجى استخدام POST.' });

  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'غير مصرح: يجب تسجيل الدخول لاستدعاء هذه الوظيفة.' });
    }
    const idToken = authHeader.substring(7).trim();
    let decodedToken = null;
    try {
      decodedToken = await getAuth().verifyIdToken(idToken);
    } catch (e) {
      return res.status(401).json({ error: 'رمز الجلسة غير صالح أو منتهي الصلاحية.' });
    }

    const callerRole = decodedToken.role || null;
    const db = getDatabase();
    const { action, targetUid, newPassword, note } = req.body || {};

    if (!action || !targetUid) {
      return res.status(400).json({ error: 'بيانات غير مكتملة: يجب توفير نوع الإجراء ومعرّف المستخدم المستهدف.' });
    }

    // 1. Approve Teacher Account Request (Admin Only) - Requires verified email
    if (action === 'approve') {
      if (callerRole !== 'admin') {
        return res.status(403).json({ error: 'غير مصرح: اعتماد حسابات المعلمين يتطلب صلاحيات الإدارة.' });
      }

      const targetUser = await getAuth().getUser(targetUid);
      if (!targetUser.emailVerified) {
        return res.status(400).json({ error: 'لا يمكن اعتماد المعلم قبل تفعيل بريده الإلكتروني (يجب أن يكون emailVerified مفعلاً).' });
      }

      await getAuth().setCustomUserClaims(targetUid, { role: 'teacher' });

      const reqRef = db.ref(`scorear_account_requests/${targetUid}`);
      const snap = await reqRef.once('value');
      const reqData = snap.val() || {};

      const now = Date.now();
      const updatedReq = {
        ...reqData,
        status: 'approved',
        reviewedAt: now,
        reviewedBy: decodedToken.uid,
        reviewNote: note || ''
      };
      await reqRef.update(updatedReq);

      // Mirror into scorear_teachers_registry for legacy registry compatibility (with firebaseUid for v2 queries)
      await db.ref(`scorear_teachers_registry/${targetUid}`).set({
        userId: targetUid,
        firebaseUid: targetUid,
        email: reqData.email || '',
        displayName: reqData.displayName || '',
        schoolSubject: reqData.subject || '',
        school: reqData.school || '',
        status: 'approved',
        updatedAt: now
      });

      return res.status(200).json({ success: true, message: 'تم اعتماد حساب المعلم وضبط صلاحيات الدور بنجاح.', status: 'approved' });
    }

    // 2. Reject / Revoke Teacher Account (Admin Only)
    if (action === 'reject') {
      if (callerRole !== 'admin') {
        return res.status(403).json({ error: 'غير مصرح: رفض الحسابات يتطلب صلاحيات الإدارة.' });
      }

      await getAuth().setCustomUserClaims(targetUid, { role: null });
      await db.ref(`scorear_account_requests/${targetUid}`).update({
        status: 'rejected',
        reviewedAt: Date.now(),
        reviewedBy: decodedToken.uid,
        reviewNote: note || ''
      });
      await db.ref(`scorear_teachers_registry/${targetUid}`).update({
        status: 'rejected',
        updatedAt: Date.now()
      });

      return res.status(200).json({ success: true, message: 'تم رفض/تعليق حساب المعلم بنجاح.', status: 'rejected' });
    }

    // 3. Reset Student Password (Admin Only for now - until Class Associations are built)
    if (action === 'resetStudentPassword') {
      if (callerRole !== 'admin') {
        return res.status(403).json({ error: 'غير مصرح: إعادة تعيين كلمة مرور الطالب محصورة في إدارة المنصة حالياً حتى اكتمال منظومة الفصول.' });
      }
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تتكون من 8 خانات على الأقل.' });
      }

      const studentSnap = await db.ref(`scorear_students/${targetUid}`).once('value');
      if (!studentSnap.exists()) {
        return res.status(404).json({ error: 'حساب الطالب المستهدف غير موجود في سجل الطلاب.' });
      }

      await getAuth().updateUser(targetUid, { password: newPassword });
      await db.ref(`scorear_students/${targetUid}`).update({ updatedAt: Date.now() });

      return res.status(200).json({ success: true, message: 'تم تحديث كلمة مرور الطالب بنجاح.' });
    }

    // 4. Delete Student Account (Admin Only for now)
    if (action === 'deleteStudentAccount') {
      if (callerRole !== 'admin') {
        return res.status(403).json({ error: 'غير مصرح: حذف حساب الطالب محصور في إدارة المنصة حالياً.' });
      }

      await getAuth().deleteUser(targetUid).catch(err => {
        console.warn('Auth user delete warning:', err.message);
      });
      await db.ref(`scorear_students/${targetUid}`).remove();

      return res.status(200).json({ success: true, message: 'تم حذف حساب الطالب وبياناته بالكامل.' });
    }

    return res.status(400).json({ error: 'نوع الإجراء المطلوب غير معروف.' });
  } catch (err) {
    console.error('scorearAccountRequest error:', err);
    return res.status(500).json({ error: 'حدث خطأ أثناء معالجة الطلب: ' + err.message });
  }
});

