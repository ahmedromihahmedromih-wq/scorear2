/**
 * ScoreAR Serverless API: /api/generate-questions
 * Item 4: Server-side Gemini AI question generation, ID Token verification, Daily quota (20/day), Multimodal OCR.
 */
export default async function handler(req, res) {
  // 1. Strict CORS for authorized ScoreAR origins
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
    // 2. Authentication: Teacher ID Token verification
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'عفواً، يجب تسجيل دخول المعلم أولاً لاستخدام التوليد الذكي.' });
    }
    const idToken = authHeader.substring(7).trim();

    let teacherUid = null;
    try {
      const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      if (verifyRes.ok) {
        const info = await verifyRes.json();
        teacherUid = info.user_id || info.sub;
      }
    } catch (e) {
      console.warn('Token verify error:', e);
    }

    if (!teacherUid) {
      return res.status(401).json({ error: 'رمز الجلسة غير صالح أو منتهي الصلاحية. يرجى إعادة تسجيل الدخول.' });
    }

    // 3. Daily Quota Check (20 requests/day per teacher) via Firebase RTDB
    const today = new Date().toISOString().slice(0, 10);
    const quotaUrl = `https://scorear2-default-rtdb.firebaseio.com/scorear_ai_quotas/${teacherUid}/${today}.json?auth=${encodeURIComponent(idToken)}`;
    let quotaData = { usedCount: 0, limit: 20, lastUsedAt: 0 };

    try {
      const qRes = await fetch(quotaUrl);
      if (qRes.ok) {
        const d = await qRes.json();
        if (d) quotaData = Object.assign(quotaData, d);
      }
    } catch (e) {}

    if (quotaData.usedCount >= (quotaData.limit || 20)) {
      return res.status(429).json({
        error: `لقد استنفدت حصتك اليومية المحددة (${quotaData.limit || 20} طلباً). تتجدد الحصة تلقائياً عند منتصف الليل.`,
        quota: quotaData
      });
    }

    // 4. Gemini API Key from server environment (Never exposed to client)
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'مفتاح الذكاء الاصطناعي غير مضبوط في إعدادات الخادم.' });
    }

    // 5. Parse and Prepare Request Payload
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
      return res.status(400).json({ error: 'يرجى كتابة نص تعليمي أو رفع ملف/صورة للتوليد.' });
    }

    const qCount = Math.max(1, Math.min(Number(count) || 5, 20));
    const systemPrompt = `أنت خبير تربوي ومستشار أول لوضع المناهج والامتحانات التعليمية.
مهمتك: صياغة ${qCount} سؤالاً تعليمياً تفاعلياً ومطابقاً للمناهج العربية.

القواعد الصارمة:
1. صلب المنهج فقط: يُمنع تماماً أي سؤال عن أرقام الصفحات، الطبعة، دار النشر، أو المؤلفين.
2. اكتمال الخيارات: 4 خيارات واضحة ومستقلة، لا خيارات مكررة، ولا خيارات ناقصة تنتهي بنقاط حذف (...).
3. تحديد الإجابة الصحيحة بدقة مع شرح تعليلي موجز.
4. الإخراج حصراً كمصفوفة JSON:
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
عدد الأسئلة: ${qCount}
صغ الأسئلة باللغة العربية الفصحى وأعد مصفوفة JSON فقط.`;

    const parts = [];
    if (fileBase64 && mimeType) {
      parts.push({
        inlineData: { mimeType, data: fileBase64 }
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

    // 7. Parse and Validate Output
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
        if (new Set(opts).size !== opts.length) return false;
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
        error: 'لم يتمكن الذكاء الاصطناعي من استخراج أسئلة سليمة من هذا المحتوى. يرجى تزويد فقرة أكثر تركيزاً من الدرس.'
      });
    }

    // 8. Deduct Daily Quota in RTDB
    quotaData.usedCount = (quotaData.usedCount || 0) + 1;
    quotaData.lastUsedAt = Date.now();
    try {
      await fetch(quotaUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotaData)
      });
    } catch (e) {}

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
    console.error('generate-questions error:', err);
    return res.status(500).json({ error: 'حدث خطأ غير متوقع: ' + err.message });
  }
}
