/**
 * ScoreAR Quiz Evaluator Module (Strict Canonical Format Engine)
 * Strictly evaluates correct answers based ONLY on Canonical Format:
 * { id, text, options: [string], correct: [0-based numbers], explanation: string }
 * Normalization is performed strictly at the boundaries via normalizeQuestion / migrateQuestions.
 * Rule 7 Compliant (<200 lines)
 */
(function(global) {
  'use strict';

  /**
   * Validates a question against the canonical schema.
   * Returns { valid: true } or { valid: false, error: string (Arabic) }.
   */
  function validateQuestion(q) {
    if (!q || typeof q !== 'object') {
      return { valid: false, error: 'السؤال غير معرف أو تالف.' };
    }
    const text = q.text || q.q || q.question;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return { valid: false, error: 'نص السؤال مطلوب ولا يمكن أن يكون فارغاً.' };
    }
    const opts = q.options || q.opts;
    if (!Array.isArray(opts) || opts.length < 2) {
      return { valid: false, error: 'يجب أن يحتوي السؤال على خيارين على الأقل.' };
    }
    for (let i = 0; i < opts.length; i++) {
      if (!opts[i] || typeof opts[i] !== 'string' || !opts[i].trim()) {
        return { valid: false, error: `الخيار رقم (${i + 1}) فارغ، يرجى كتابة نص الخيار.` };
      }
    }
    const correct = q.correct;
    if (!Array.isArray(correct) || correct.length === 0) {
      return { valid: false, error: 'يجب تحديد إجابة صحيحة واحدة على الأقل كمصفوفة فهارس تبدأ من الصفر (0-based).' };
    }
    for (let i = 0; i < correct.length; i++) {
      const idx = correct[i];
      if (typeof idx !== 'number' || !Number.isInteger(idx) || idx < 0 || idx >= opts.length) {
        return {
          valid: false,
          error: `فهرس الإجابة الصحيحة (${idx}) خارج نطاق الخيارات المتاحة (0 إلى ${opts.length - 1}).`
        };
      }
    }
    return { valid: true, error: null };
  }

  /**
   * Normalizes raw questions from any source into canonical format strictly at boundaries.
   * Converts Kahoot 1-based, legacy ans/answer/correctAnswer, and text matchings ONCE.
   */
  function normalizeQuestion(rawQ, opts = {}) {
    if (!rawQ || typeof rawQ !== 'object') {
      throw new Error('السؤال غير صالح: يجب توفير كائن سؤال.');
    }

    const text = String(rawQ.text ?? rawQ.q ?? rawQ.question ?? '').trim();
    const rawOpts = rawQ.options ?? rawQ.opts;
    const options = (Array.isArray(rawOpts) ? rawOpts : []).map(o => String(o ?? '').trim()).filter(Boolean);

    const id = String(rawQ.id || opts.fallbackId || ('q_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5)));
    const explanation = String(rawQ.explanation ?? rawQ.why ?? rawQ.explain ?? '').trim();

    const isOneBased = Boolean(
      opts.isKahootOneBased ||
      rawQ.isKahootOneBased ||
      rawQ.isKahoot ||
      rawQ.oneBased ||
      rawQ.isOneBased
    );

    const rawCorrect = [
      rawQ.correct,
      rawQ.correctIndices,
      rawQ.correctIndex,
      rawQ.ans,
      rawQ.answer,
      rawQ.correctAnswer
    ].find(v => v !== undefined && v !== null);

    const correctSet = new Set();

    if (Array.isArray(rawCorrect)) {
      rawCorrect.forEach(item => {
        const num = Number(item);
        if (!isNaN(num)) {
          const idx = isOneBased ? (num - 1) : num;
          if (Number.isInteger(idx) && idx >= 0 && (options.length === 0 || idx < options.length)) {
            correctSet.add(idx);
          }
        }
      });
    } else if (rawCorrect !== undefined && rawCorrect !== null) {
      if (typeof rawCorrect === 'number') {
        const idx = isOneBased ? (rawCorrect - 1) : rawCorrect;
        if (Number.isInteger(idx) && idx >= 0 && (options.length === 0 || idx < options.length)) {
          correctSet.add(idx);
        }
      } else if (typeof rawCorrect === 'string') {
        const trimmed = rawCorrect.trim();
        const parsed = parseInt(trimmed, 10);
        if (!isNaN(parsed) && String(parsed) === trimmed) {
          const idx = isOneBased ? (parsed - 1) : parsed;
          if (Number.isInteger(idx) && idx >= 0 && (options.length === 0 || idx < options.length)) {
            correctSet.add(idx);
          }
        } else {
          const lMap = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'أ': 0, 'ب': 1, 'ج': 2, 'د': 3 };
          const lKey = trimmed.toLowerCase();
          if (lMap[lKey] !== undefined && (options.length === 0 || lMap[lKey] < options.length)) {
            correctSet.add(lMap[lKey]);
          } else if (options.length > 0) {
            const matchIdx = options.findIndex(o => o.toLowerCase() === trimmed.toLowerCase());
            if (matchIdx !== -1) correctSet.add(matchIdx);
          }
        }
      }
    }

    const correct = Array.from(correctSet).sort((a, b) => a - b);

    const canonical = {
      id,
      text,
      options,
      correct,
      explanation,
      skill: rawQ.skill || 'لغة عربية',
      timeLimit: (typeof rawQ.timeLimit === 'number' && rawQ.timeLimit > 0) ? rawQ.timeLimit : 20,
      points: (typeof rawQ.points === 'number') ? rawQ.points : 1000,
      get q() { return this.text; },
      get opts() { return this.options; },
      get ans() { return this.correct.length > 0 ? this.correct[0] : 0; },
      get why() { return this.explanation; }
    };

    return canonical;
  }

  /**
   * Batch migration helper for legacy question arrays.
   */
  function migrateQuestions(list, opts = {}) {
    if (!Array.isArray(list)) return [];
    const results = [];
    list.forEach((item, idx) => {
      try {
        const canonical = normalizeQuestion(item, { fallbackId: `q_migrated_${idx}`, ...opts });
        const val = validateQuestion(canonical);
        if (val.valid) {
          results.push(canonical);
        } else {
          console.warn(`[ScoreAR Evaluator] Question index ${idx} failed validation during migration:`, val.error);
        }
      } catch(e) {
        console.warn(`[ScoreAR Evaluator] Error migrating question index ${idx}:`, e.message);
      }
    });
    return results;
  }

  /**
   * Normalizes chosen indices into a deduplicated array of non-negative integers.
   */
  function normalizeChosen(chosen) {
    if (chosen === null || chosen === undefined || chosen === -1 || chosen === '-1') return [];
    const list = Array.isArray(chosen) ? chosen : [chosen];
    const out = [];
    list.forEach(c => {
      const n = Number(c);
      if (!isNaN(n) && n >= 0) out.push(n);
    });
    return Array.from(new Set(out)).sort((a, b) => a - b);
  }

  /**
   * Strict Pure Evaluation Function
   * Strictly evaluates ONLY canonical format: question.correct MUST be [0-based numbers].
   * No auto-detecting 1-based, no string matching here.
   */
  function isCorrect(question, chosenIndices, optionOrder = null) {
    if (!question || typeof question !== 'object') return false;

    const expected = Array.isArray(question.correct) ? question.correct : null;
    if (!expected || expected.length === 0) {
      console.warn('[ScoreAR Evaluator] Rejecting evaluation: Question does not conform to canonical schema (.correct missing).', question);
      return false;
    }

    const normChosen = normalizeChosen(chosenIndices);
    if (normChosen.length === 0) return false;

    const originalChosen = (Array.isArray(optionOrder) && optionOrder.length > 0)
      ? normChosen.map(idx => (optionOrder[idx] !== undefined ? optionOrder[idx] : idx))
      : normChosen;

    if (originalChosen.length !== expected.length) return false;

    const expectedSet = new Set(expected);
    return originalChosen.every(idx => expectedSet.has(idx));
  }

  const ScoreAREvaluator = {
    validateQuestion,
    normalizeQuestion,
    migrateQuestions,
    normalizeChosen,
    isCorrect,
    getCorrectIndices: function(q) {
      if (Array.isArray(q?.correct)) return q.correct;
      const norm = normalizeQuestion(q);
      return norm.correct;
    }
  };

  global.ScoreAREvaluator = ScoreAREvaluator;
  try {
    if (typeof globalThis !== 'undefined') globalThis.ScoreAREvaluator = ScoreAREvaluator;
  } catch(e){}

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScoreAREvaluator;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
