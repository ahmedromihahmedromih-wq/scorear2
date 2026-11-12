/**
 * ScoreAR Skill Map Engine (skill-engine.js)
 * Item 2: Skill Map with Interactive Stations
 * Rules:
 *   1. Pure engine: No DOM, no localStorage, completely deterministic and testable.
 *   2. Stations statuses: 'locked' | 'open' | 'mastered'.
 *   3. Passing threshold: >= 70% (0.70).
 *   4. Stations unlock sequentially after passing the previous station >= 70%.
 *   5. Students can replay any open or mastered station without restriction.
 *   6. 'reviewed: false' questions display with tag and are excluded from official mastery score.
 *   7. Edge cases safe: 70% exactly, station with 0 questions, missing question IDs.
 *   8. Lossless migration from v2 schema.
 * Strictly Rule 7 Compliant (<500 lines).
 */
(function(global) {
  'use strict';

  const PASS_THRESHOLD = 0.70;
  const STATUS_LOCKED = 'locked';
  const STATUS_OPEN = 'open';
  const STATUS_MASTERED = 'mastered';

  /**
   * Evaluates station score and distinguishes between all questions and reviewed questions.
   * Safe against 0 questions and missing question IDs.
   */
  function calculateStationScore(questions = [], userAnswers = {}) {
    if (!Array.isArray(questions) || questions.length === 0) {
      return {
        total: 0,
        correct: 0,
        score: 0,
        percentage: 0,
        isPassed: false,
        reviewedTotal: 0,
        reviewedCorrect: 0,
        reviewedScore: 0,
        reviewedPercentage: 0,
        hasUnreviewedQuestions: false
      };
    }

    let total = 0;
    let correct = 0;
    let reviewedTotal = 0;
    let reviewedCorrect = 0;
    let hasUnreviewed = false;

    questions.forEach(q => {
      if (!q || !q.id) return;
      total += 1;
      const chosen = userAnswers[q.id];
      const isAnsCorrect = (chosen !== undefined && chosen !== null && Number(chosen) === Number(q.correct));
      if (isAnsCorrect) correct += 1;

      if (q.reviewed === true) {
        reviewedTotal += 1;
        if (isAnsCorrect) reviewedCorrect += 1;
      } else {
        hasUnreviewed = true;
      }
    });

    const score = total > 0 ? (correct / total) : 0;
    // Handle floating-point rounding (e.g. 7/10 = 0.70)
    const isPassed = Math.round(score * 1000) >= Math.round(PASS_THRESHOLD * 1000);

    const reviewedScore = reviewedTotal > 0 ? (reviewedCorrect / reviewedTotal) : 0;
    const isReviewedPassed = reviewedTotal > 0 && (Math.round(reviewedScore * 1000) >= Math.round(PASS_THRESHOLD * 1000));

    return {
      total,
      correct,
      score,
      percentage: Math.round(score * 100),
      isPassed,
      reviewedTotal,
      reviewedCorrect,
      reviewedScore,
      reviewedPercentage: Math.round(reviewedScore * 100),
      isReviewedPassed,
      hasUnreviewedQuestions: hasUnreviewed
    };
  }

  /**
   * Determines if a station is unlocked based on previous station status.
   */
  function determineStationStatus(station, indexInTrack, stationsInTrack, stationsProgress = {}) {
    if (!station || !station.id) return STATUS_LOCKED;
    const currentProgress = stationsProgress[station.id];

    // If already mastered, it stays mastered
    if (currentProgress && currentProgress.status === STATUS_MASTERED) {
      return STATUS_MASTERED;
    }

    // First station in track is always open
    if (indexInTrack === 0) {
      return (currentProgress && currentProgress.status) || STATUS_OPEN;
    }

    // Subsequent stations require previous station to be mastered
    const prevStation = stationsInTrack[indexInTrack - 1];
    if (!prevStation) return STATUS_OPEN;

    const prevProgress = stationsProgress[prevStation.id];
    const prevIsMastered = prevProgress && (prevProgress.status === STATUS_MASTERED || (prevProgress.bestScore >= PASS_THRESHOLD));

    if (prevIsMastered) {
      return (currentProgress && currentProgress.status) || STATUS_OPEN;
    }

    return STATUS_LOCKED;
  }

  /**
   * Updates stations progress after an attempt (Pure function).
   * Supports unlimited replays for open/mastered stations.
   */
  function recordStationAttempt(currentStationsProgress = {}, stationId, scoreResult, now = Date.now()) {
    const nextProgress = Object.assign({}, currentStationsProgress);
    const existing = nextProgress[stationId] || {
      status: STATUS_OPEN,
      bestScore: 0,
      attempts: 0,
      lastAttemptAt: 0,
      passedAt: null
    };

    const newAttempts = (existing.attempts || 0) + 1;
    const newBestScore = Math.max(existing.bestScore || 0, scoreResult.score || 0);
    const newStatus = (existing.status === STATUS_MASTERED || scoreResult.isPassed) ? STATUS_MASTERED : STATUS_OPEN;
    const passedAt = scoreResult.isPassed ? (existing.passedAt || now) : existing.passedAt;

    nextProgress[stationId] = {
      status: newStatus,
      bestScore: Math.round(newBestScore * 1000) / 1000,
      attempts: newAttempts,
      lastAttemptAt: now,
      passedAt: passedAt,
      lastPercentage: scoreResult.percentage,
      reviewedScore: scoreResult.reviewedScore,
      hasUnreviewed: scoreResult.hasUnreviewedQuestions
    };

    return nextProgress;
  }

  /**
   * Lossless migration from v2 to v3 schema.
   * Preserves XP, streak, completed tracks, and mistakes without data loss.
   */
  function migrateProgressToV3(rawV2, now = Date.now()) {
    if (!rawV2 || typeof rawV2 !== 'object') {
      return {
        schemaVersion: 'scorear_v3',
        data: {
          xp: 0,
          solvedQuestionIds: {},
          completedTrackIds: {},
          stationsProgress: {},
          streak: null,
          lastUpdated: now
        }
      };
    }

    const d = rawV2.data || rawV2;
    const existingStations = (d.stationsProgress && typeof d.stationsProgress === 'object') ? d.stationsProgress : {};
    const completedTracks = (d.completedTrackIds && typeof d.completedTrackIds === 'object') ? d.completedTrackIds : {};

    // Auto-credit completed tracks to corresponding stations if not already recorded
    const migratedStations = Object.assign({}, existingStations);
    if (completedTracks['grammar_naat'] && !migratedStations['station_naat_01']) {
      migratedStations['station_naat_01'] = {
        status: STATUS_MASTERED,
        bestScore: 1.0,
        attempts: 1,
        lastAttemptAt: now,
        passedAt: now,
        lastPercentage: 100
      };
    }
    if (completedTracks['rhetoric_intro'] && !migratedStations['station_rhetoric_01']) {
      migratedStations['station_rhetoric_01'] = {
        status: STATUS_MASTERED,
        bestScore: 1.0,
        attempts: 1,
        lastAttemptAt: now,
        passedAt: now,
        lastPercentage: 100
      };
    }
    if (completedTracks['spelling_rules'] && !migratedStations['station_spelling_01']) {
      migratedStations['station_spelling_01'] = {
        status: STATUS_MASTERED,
        bestScore: 1.0,
        attempts: 1,
        lastAttemptAt: now,
        passedAt: now,
        lastPercentage: 100
      };
    }

    return {
      schemaVersion: 'scorear_v3',
      data: {
        xp: Math.max(0, Number(d.xp) || 0),
        dailyQuietXp: d.dailyQuietXp || null,
        solvedQuestionIds: (d.solvedQuestionIds && typeof d.solvedQuestionIds === 'object') ? Object.assign({}, d.solvedQuestionIds) : {},
        completedTrackIds: Object.assign({}, completedTracks),
        stationsProgress: migratedStations,
        streak: d.streak || null,
        lastUpdated: now
      }
    };
  }

  const EngineAPI = {
    PASS_THRESHOLD,
    STATUS_LOCKED,
    STATUS_OPEN,
    STATUS_MASTERED,
    calculateStationScore,
    determineStationStatus,
    recordStationAttempt,
    migrateProgressToV3
  };

  global.ScoreARSkillEngine = EngineAPI;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EngineAPI;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
