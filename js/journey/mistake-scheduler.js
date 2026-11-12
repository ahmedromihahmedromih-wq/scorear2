/**
 * ScoreAR Mistake Scheduler Engine (mistake-scheduler.js)
 * Pure Logic & Spaced Repetition Calculations
 * ZERO DOM, ZERO localStorage, Completely Pure & Testable
 * Rule 7 Compliant (<500 lines)
 */
(function(global) {
  'use strict';

  const DAILY_QUIET_XP_CAP = 150;
  const MASTERY_XP_AWARD = 10;
  const DELAY_ONCE_CORRECT_MS = 24 * 60 * 60 * 1000; // 24 hours
  const DELAY_MASTERED_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days

  function isDueForReview(mistake, now = Date.now()) {
    if (!mistake || mistake.archived) return false;
    return now >= (Number(mistake.nextReviewAt) || 0);
  }

  function calculateDailyXpGain(dailyEarned, award = MASTERY_XP_AWARD, cap = DAILY_QUIET_XP_CAP) {
    const safeEarned = (typeof dailyEarned === 'number' && !isNaN(dailyEarned)) ? dailyEarned : 0;
    return Math.max(0, Math.min(award, cap - safeEarned));
  }

  function shuffleOptions(opts, correctIdx) {
    if (!Array.isArray(opts)) return { shuffledOpts: [], newCorrectIdx: -1 };
    const wrapped = opts.map((opt, i) => ({ text: opt, isCorrect: i === correctIdx }));
    for (let i = wrapped.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [wrapped[i], wrapped[j]] = [wrapped[j], wrapped[i]];
    }
    return {
      shuffledOpts: wrapped.map(w => w.text),
      newCorrectIdx: wrapped.findIndex(w => w.isCorrect)
    };
  }

  function applyReviewOutcome(targetMistake, isCorrect, options = {}) {
    const now = options.now || Date.now();
    const dailyEarned = options.dailyEarned || 0;
    const m = { ...targetMistake };
    let xpGain = 0;
    let feedbackMsg = '';

    if (m.mastered) {
      // Post-mastery periodic maintenance review
      if (isCorrect) {
        m.nextReviewAt = now + DELAY_MASTERED_MS;
        m.lastReviewedAt = now;
        m.consecutiveCorrect = (Number(m.consecutiveCorrect) || 2) + 1;
        xpGain = 0; // Already mastered: no duplicate XP
        feedbackMsg = '🌟 رائع! ثبّتّ المفهوم المتقن في ذاكرتك طويلة المدى (تأجيل 7 أيام أخرى للمراجعة الوقائية)';
      } else {
        // Incorrect answer on mastered question: resets back to active!
        m.mastered = false;
        m.consecutiveCorrect = 0;
        m.nextReviewAt = 0;
        m.attemptCount = (Number(m.attemptCount) || 1) + 1;
        m.lastMistakeAt = now;
        xpGain = 0;
        feedbackMsg = '🌸 محاولة طيبة! عاد المفهوم لقائمة المراجعات النشطة لترسيخه مجدداً.';
      }
    } else {
      // Pre-mastery review
      if (isCorrect) {
        m.consecutiveCorrect = (Number(m.consecutiveCorrect) || 0) + 1;
        m.lastReviewedAt = now;
        if (m.consecutiveCorrect >= 2) {
          m.mastered = true;
          m.masteredAt = now;
          m.nextReviewAt = now + DELAY_MASTERED_MS;
          if (!m.masteryXpAwarded) {
            xpGain = calculateDailyXpGain(dailyEarned);
            m.masteryXpAwarded = true;
            feedbackMsg = xpGain > 0
              ? `🏆 مبارك! أتقنت المفهوم بإجابتين صحيحتين متتاليتين (+${xpGain} XP مكافأة الإتقان)`
              : '🏆 مبارك! أتقنت المفهوم بنجاح ونُقل للأرشيف المعرفي (وصلت للسقف اليومي)';
          } else {
            xpGain = 0;
            feedbackMsg = '🏆 مبارك! أتقنت المفهوم بنجاح ونُقل للأرشيف المعرفي (المراجعة بعد 7 أيام)';
          }
        } else {
          m.nextReviewAt = now + DELAY_ONCE_CORRECT_MS;
          xpGain = 0;
          feedbackMsg = '👏 أحسنت! إجابة دقيقة (خطوة 1 من 2 نحو الإتقان — المراجعة القادمة بعد 24 ساعة ⏳)';
        }
      } else {
        m.consecutiveCorrect = 0;
        m.attemptCount = (Number(m.attemptCount) || 1) + 1;
        m.lastMistakeAt = now;
        m.nextReviewAt = 0;
        xpGain = 0;
        feedbackMsg = '🌸 محاولة طيبة! الأخطاء هي بوابتك نحو الفهم العميق. اقرأ الشرح أدناه ورسخ القاعدة.';
      }
    }

    return { updatedMistake: m, xpGain, feedbackMsg };
  }

  const SchedulerAPI = {
    DAILY_QUIET_XP_CAP,
    MASTERY_XP_AWARD,
    DELAY_ONCE_CORRECT_MS,
    DELAY_MASTERED_MS,
    isDueForReview,
    calculateDailyXpGain,
    shuffleOptions,
    applyReviewOutcome
  };

  global.ScoreARMistakeScheduler = SchedulerAPI;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SchedulerAPI;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
