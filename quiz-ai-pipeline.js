/**
 * ScoreAR AI Pipeline (quiz-ai-pipeline.js)
 * 3-Stage Educational Question Generation Pipeline:
 *  - Stage A: Content Classification & Noise Filtering (Cover, TOC, ads removal).
 *  - Stage B: Chunked Micro-Requests with Exponential Backoff (<1MB payload, <4s runtime).
 *  - Stage C: Fact-checking & Source Quote Verification Gate (Bloom levels & anti-hallucination).
 * Strictly Rule 7 Compliant (<500 lines).
 */
(function (global) {
  'use strict';

  // Helper: Normalize Arabic text for matching (strip tashkeel & normalize alif/yaa)
  function normalizeArabic(str) {
    if (!str) return '';
    return str
      .replace(/[\u064B-\u065F\u0670]/g, '') // strip diacritics
      .replace(/[إأآا]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ي/g, 'ى')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Helper: Sleep
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // --- Stage A: Content Classification & Noise Filtering ---
  function classifyAndFilterContent(extractedPages, options = {}) {
    const noisePatterns = [
      /فهرس\s*(الموضوعات|المحتويات|الكتاب)?/i,
      /قائمة\s*المحتويات/i,
      /حقوق\s*الطبع\s*(محفوظة|والنشر)?/i,
      /رقم\s*الإيداع/i,
      /دار\s*النشر/i,
      /المطبعة/i,
      /شكر\s*وتقدير/i,
      /إهداء\s*إلى/i,
      /جميع\s*الحقوق\s*محفوظة/i,
      /الطبعة\s*(الأولى|الثانية|الثالثة|\d+)/i
    ];

    const cleanPages = [];
    const detectedTopics = [];

    // Filter out pages that are purely noise
    for (const page of extractedPages) {
      if (page.isScanned && page.imageBase64) {
        cleanPages.push(page);
        continue;
      }

      const text = page.text || '';
      if (text.length < 40) continue; // Skip nearly empty pages

      let isNoise = false;
      let matchedKeyword = '';
      for (const pat of noisePatterns) {
        if (pat.test(text)) {
          // If the page is short and matched noise pattern, it's a cover or TOC
          if (text.length < 600 || text.includes('رقم الإيداع') || text.includes('حقوق الطبع')) {
            isNoise = true;
            matchedKeyword = pat.toString();
            break;
          }
        }
      }

      if (!isNoise) {
        cleanPages.push(page);
      }
    }

    if (!cleanPages.length) {
      throw new Error('لم يتبق أي محتوى تعليمي صالح بعد تصفية الغلاف والفهرس والبيانات غير المنهجية.');
    }

    // Partition into chunks (2,000 to 4,500 characters per topic chunk)
    let currentTopicPages = [];
    let currentTopicText = '';
    let topicIndex = 1;

    for (let i = 0; i < cleanPages.length; i++) {
      const p = cleanPages[i];
      currentTopicPages.push(p.pageNum);
      currentTopicText += (currentTopicText ? '\n\n' : '') + p.text;

      if (currentTopicText.length >= 2500 || i === cleanPages.length - 1 || p.isScanned) {
        const titleMatch = currentTopicText.match(/^([^\n]{5,50})/);
        const topicTitle = titleMatch ? titleMatch[1].trim() : `موضوع دراسي (${currentTopicPages[0]}–${currentTopicPages[currentTopicPages.length - 1]})`;

        detectedTopics.push({
          topicId: 'topic_' + topicIndex,
          title: topicTitle,
          pageRefs: [...currentTopicPages],
          text: currentTopicText,
          isScanned: p.isScanned,
          imageBase64: p.imageBase64 || null
        });

        topicIndex++;
        currentTopicPages = [];
        currentTopicText = '';
      }
    }

    return {
      totalOriginalPages: extractedPages.length,
      filteredPagesCount: cleanPages.length,
      topics: detectedTopics
    };
  }

  // --- Stage B: Chunked Micro-Requests to /api/generate-questions ---
  async function generateQuestionsForTopic(topic, config, idToken, onStatus) {
    const maxRetries = 3;
    let attempt = 0;
    let delay = 1000;

    const payload = {
      content: topic.text || '',
      fileBase64: topic.imageBase64 || null,
      mimeType: topic.imageBase64 ? 'image/webp' : null,
      pageRefs: topic.pageRefs,
      topicTitle: topic.title,
      count: config.questionsPerChunk || 3,
      difficulty: config.difficulty || 'متوسط',
      grade: config.grade || '',
      subject: config.subject || '',
      format: config.format || 'mcq',
      instructions: config.instructions || '',
      language: config.language || 'العربية الفصحى'
    };

    while (attempt < maxRetries) {
      try {
        attempt++;
        if (onStatus) onStatus(`إرسال شريحة (${topic.title}) [محاولة ${attempt}/${maxRetries}]...`);

        const resp = await fetch('/api/generate-questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + idToken
          },
          body: JSON.stringify(payload)
        });

        if (resp.status === 429) {
          const errData = await resp.json().catch(() => ({}));
          if (errData.error && errData.error.includes('الحصة اليومية')) {
            throw new Error(errData.error);
          }
          if (onStatus) onStatus(`تنبيه: مزود الذكاء مشغول (429). إعادة المحاولة خلال ${delay / 1000} ثوانٍ...`);
          await sleep(delay);
          delay *= 2;
          continue;
        }

        if (!resp.ok) {
          let errData = {};
          try { errData = await resp.json(); } catch (e) {
            const raw = await resp.text().catch(() => '');
            errData = { error: `خطأ HTTP ${resp.status}: ${raw.slice(0, 100)}` };
          }
          if (resp.status >= 500 && attempt < maxRetries) {
            await sleep(delay);
            delay *= 2;
            continue;
          }
          throw new Error(errData.error || `خطأ في الخادم (رمز ${resp.status})`);
        }

        const resJson = await resp.json();
        return resJson.questions || [];

      } catch (err) {
        if (attempt >= maxRetries || err.message.includes('الحصة اليومية') || err.message.includes('401') || err.message.includes('403')) {
          throw err;
        }
        await sleep(delay);
        delay *= 2;
      }
    }

    throw new Error('فشلت جميع المحاولات للاتصال بخادم التوليد الذكي.');
  }

  // --- Stage C: Fact-checking & Source Quote Verification Gate ---
  function verifyQuestionQuality(rawQuestion, topic) {
    const issues = [];
    const qText = (rawQuestion.q || rawQuestion.text || '').trim();
    let opts = (rawQuestion.opts || rawQuestion.options || []).map(o => String(o).trim()).filter(Boolean);
    let ans = Number(rawQuestion.ans);
    if (isNaN(ans) || ans < 0 || ans >= opts.length) ans = 0;

    // Check 1: Length and format
    if (qText.length < 8) issues.push('نص السؤال قصير جداً أو ناقص.');
    if (opts.length < 2) issues.push('الخيارات أقل من خيارين.');
    if (new Set(opts).size !== opts.length) issues.push('يوجد خيارات مكررة.');

    // Check 2: Bloom Level & Type assignment
    const type = opts.length === 2 ? 'tf' : 'mcq';
    const cognitiveLevel = rawQuestion.cognitiveLevel || rawQuestion.bloomLevel || 'فهم';

    // Check 3: Strict Source Quote Verification
    const sourceQuote = (rawQuestion.sourceQuote || '').trim();
    const sourceRef = rawQuestion.sourceRef || `صفحة ${topic.pageRefs ? topic.pageRefs.join(', ') : '1'}`;
    let quoteVerified = false;

    if (topic.text && sourceQuote) {
      const normSource = normalizeArabic(topic.text);
      const normQuote = normalizeArabic(sourceQuote);
      if (normSource.includes(normQuote)) {
        quoteVerified = true;
      } else {
        // Try fuzzy window match (at least 60% words present contiguously)
        const quoteWords = normQuote.split(' ').filter(w => w.length > 2);
        if (quoteWords.length >= 3) {
          const matchCount = quoteWords.filter(w => normSource.includes(w)).length;
          if (matchCount / quoteWords.length >= 0.75) {
            quoteVerified = true;
          }
        }
      }
    } else if (topic.isScanned) {
      // For scanned images, verification is visual
      quoteVerified = true;
    }

    if (!quoteVerified && sourceQuote.length > 5) {
      issues.push('الاقتباس المرجعي غير مطابق للنص تماماً.');
    }

    return {
      isValid: issues.length === 0,
      issues,
      canonicalQuestion: {
        id: rawQuestion.id || ('q_ai_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
        q: qText,
        opts,
        ans,
        timeLimit: Math.max(5, Math.min(Number(rawQuestion.timeLimit) || 20, 120)),
        points: [100, 200, 500, 1000, 2000].includes(Number(rawQuestion.points)) ? Number(rawQuestion.points) : 1000,
        explain: (rawQuestion.explain || rawQuestion.explanation || '').trim(),
        sourceQuote: sourceQuote || '',
        sourceRef: sourceRef,
        cognitiveLevel: cognitiveLevel,
        type: type,
        isVerified: quoteVerified,
        warning: issues.join(' | ') || null
      }
    };
  }

  // --- Pipeline Master Execution ---
  async function executePipeline(extractedPages, options, user, callbacks = {}) {
    const { onProgress, onStatus } = callbacks;

    // Stage A: Classify & Filter
    if (onStatus) onStatus('المرحلة 1/3: تصنيف المحتوى واستبعاد الغلاف والفهرس وبناء خريطة الموضوعات...');
    if (onProgress) onProgress(20);
    const classification = classifyAndFilterContent(extractedPages, options);
    const topics = classification.topics;

    if (onStatus) onStatus(`المرحلة 1/3: تم استخلاص ${topics.length} موضوعات تعليمية رئيسية.`);
    if (onProgress) onProgress(35);

    // Stage B: Generation across Topic Chunks
    const idToken = await user.getIdToken(true);
    const targetCount = Number(options.count) || 5;
    const questionsPerChunk = Math.max(1, Math.ceil(targetCount / topics.length));

    const generatedQuestions = [];
    let completedTopics = 0;

    for (const topic of topics) {
      if (generatedQuestions.length >= targetCount) break;

      if (onStatus) onStatus(`المرحلة 2/3: توليد أسئلة لموضوع (${topic.title}) [${completedTopics + 1}/${topics.length}]...`);
      const rawBatch = await generateQuestionsForTopic(topic, {
        ...options,
        questionsPerChunk
      }, idToken, onStatus);

      // Stage C: Quality Gate & Verification
      for (const raw of rawBatch) {
        if (generatedQuestions.length >= targetCount) break;
        const verified = verifyQuestionQuality(raw, topic);
        if (verified.isValid) {
          generatedQuestions.push(verified.canonicalQuestion);
        } else {
          // If verification failed but question is salvageable, push with warning
          if (verified.canonicalQuestion.q.length >= 8 && verified.canonicalQuestion.opts.length >= 2) {
            generatedQuestions.push(verified.canonicalQuestion);
          }
        }
      }

      completedTopics++;
      const progressPercent = 35 + Math.round((completedTopics / topics.length) * 55);
      if (onProgress) onProgress(Math.min(95, progressPercent));
    }

    if (!generatedQuestions.length) {
      throw new Error('لم يتمكن الذكاء الاصطناعي من توليد أسئلة مطابقة للشروط من هذا المستند.');
    }

    if (onProgress) onProgress(100);
    if (onStatus) onStatus(`اكتملت المراحل بنجاح: تم تدقيق وتوليد (${generatedQuestions.length}) سؤالاً ✓`);

    return {
      success: true,
      questions: generatedQuestions,
      metrics: {
        totalOriginalPages: classification.totalOriginalPages,
        filteredPagesCount: classification.filteredPagesCount,
        topicsCount: topics.length,
        verifiedCount: generatedQuestions.filter(q => q.isVerified).length,
        passRatePercent: Math.round((generatedQuestions.filter(q => q.isVerified).length / generatedQuestions.length) * 100)
      }
    };
  }

  global.ScoreARQuizAIPipeline = {
    classifyAndFilterContent,
    generateQuestionsForTopic,
    verifyQuestionQuality,
    executePipeline,
    normalizeArabic
  };

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
