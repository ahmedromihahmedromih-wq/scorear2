/**
 * ScoreAR Quiz Builder Actions Module
 * Items 3, 4, 5, 6, 7:
 * - 5-Second Question Delete Undo Stack
 * - Drag-and-Drop Question Reordering
 * - Points & Time Generalization with Confirmation and Undo
 * - Double Points Toggle Helper
 * - Last Draft Manager ("تابع آخر مسودة")
 * Strictly Rule 7 Compliant (<500 lines).
 */
(function(global) {
  'use strict';

  let lastDeletedInfo = null; // { question, index, timerId, toastEl }
  let lastPointsGeneralization = null; // { previousPoints: [], timerId }
  let lastTimeGeneralization = null; // { previousTimes: [], timerId }
  let draggedQIndex = null;

  // --- 1. Five-Second Delete with Undo ---
  function deleteWithUndo(currentQuiz, idx, onUpdate) {
    if (!currentQuiz || !Array.isArray(currentQuiz.questions)) return;
    if (idx < 0 || idx >= currentQuiz.questions.length) return;

    // Clear any pending delete undo
    clearPendingDelete();

    const [deletedQ] = currentQuiz.questions.splice(idx, 1);
    const deletedNum = idx + 1;

    // Create floating undo banner / toast
    showDeleteUndoToast(deletedQ, idx, deletedNum, currentQuiz, onUpdate);

    if (onUpdate) onUpdate();
  }

  function showDeleteUndoToast(question, originalIndex, qNum, currentQuiz, onUpdate) {
    let container = document.getElementById('scorearBuilderToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'scorearBuilderToastContainer';
      container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = 'pointer-events:auto;background:#1e183d;border:2px solid #ef4444;border-radius:14px;padding:12px 18px;color:#fff;display:flex;align-items:center;gap:14px;box-shadow:0 10px 30px rgba(0,0,0,0.6);font-size:13px;font-weight:800;animation:enterFullBody 0.3s ease;';

    let secondsLeft = 5;
    toast.innerHTML = `
      <span>🗑️ تم حذف السؤال (${qNum})</span>
      <button id="scorearUndoDelBtn" type="button" style="background:#10b981;color:#fff;border:none;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:900;cursor:pointer;display:flex;align-items:center;gap:6px;">
        <span>تراجع ↩</span>
        <span id="scorearUndoSecPill" style="background:rgba(0,0,0,0.25);padding:1px 6px;border-radius:6px;font-size:11px;">5s</span>
      </button>
    `;

    container.appendChild(toast);

    const countdownInterval = setInterval(() => {
      secondsLeft--;
      const pill = toast.querySelector('#scorearUndoSecPill');
      if (pill) pill.textContent = secondsLeft + 's';
      if (secondsLeft <= 0) {
        clearInterval(countdownInterval);
        finalizeDelete();
      }
    }, 1000);

    const undoBtn = toast.querySelector('#scorearUndoDelBtn');
    if (undoBtn) {
      undoBtn.onclick = () => {
        clearInterval(countdownInterval);
        undoDelete(currentQuiz, onUpdate);
      };
    }

    lastDeletedInfo = {
      question,
      index: originalIndex,
      intervalId: countdownInterval,
      element: toast
    };
  }

  function undoDelete(currentQuiz, onUpdate) {
    if (!lastDeletedInfo || !currentQuiz) return;
    const { question, index, element } = lastDeletedInfo;
    const insertIdx = Math.min(index, currentQuiz.questions.length);
    currentQuiz.questions.splice(insertIdx, 0, question);

    if (element && element.parentNode) element.remove();
    lastDeletedInfo = null;

    if (global.toast) global.toast('تم استرجاع السؤال بنجاح ✓');
    if (onUpdate) onUpdate(insertIdx);
  }

  function finalizeDelete() {
    if (lastDeletedInfo) {
      if (lastDeletedInfo.question?.imageUrl && global.ScoreARQuizBuilderMedia?.deleteImageFromBlob) {
        global.ScoreARQuizBuilderMedia.deleteImageFromBlob(lastDeletedInfo.question.imageUrl);
      }
      if (lastDeletedInfo.element && lastDeletedInfo.element.parentNode) {
        lastDeletedInfo.element.remove();
      }
      lastDeletedInfo = null;
    }
  }

  function clearPendingDelete() {
    if (lastDeletedInfo) {
      clearInterval(lastDeletedInfo.intervalId);
      finalizeDelete();
    }
  }

  // --- 2. Drag & Drop Reordering ---
  function onDragStart(e, index) {
    draggedQIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    }
  }

  function onDragOver(e) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  }

  function onDrop(e, targetIndex, currentQuiz, onUpdate) {
    e.preventDefault();
    if (draggedQIndex === null || draggedQIndex === undefined) return;
    if (draggedQIndex === targetIndex || !currentQuiz || !Array.isArray(currentQuiz.questions)) {
      draggedQIndex = null;
      return;
    }

    const item = currentQuiz.questions.splice(draggedQIndex, 1)[0];
    currentQuiz.questions.splice(targetIndex, 0, item);
    draggedQIndex = null;

    if (global.toast) global.toast(`تم إعادة ترتيب السؤال بنجاح (${targetIndex + 1}) ✓`);
    if (onUpdate) onUpdate(targetIndex);
  }

  // --- 3. Points Generalization with Confirm & Undo ---
  function applyPointsToAll(currentQuiz, points, onUpdate) {
    if (!currentQuiz || !Array.isArray(currentQuiz.questions) || currentQuiz.questions.length === 0) return;

    const numPoints = Number(points);
    if (isNaN(numPoints) || numPoints < 0) {
      if (global.toast) global.toast('يرجى إدخال قيمة نقاط صحيحة.');
      return;
    }

    const confirmMsg = `هل تريد تعميم (${numPoints} نقطة) على جميع الأسئلة (${currentQuiz.questions.length} سؤالاً)؟`;
    if (!confirm(confirmMsg)) return;

    // Save previous state for undo
    const previousPoints = currentQuiz.questions.map(q => q.points ?? 1000);
    currentQuiz.questions.forEach(q => { q.points = numPoints; });

    showGeneralizationUndoToast('النقاط', `${numPoints} نقطة`, () => {
      currentQuiz.questions.forEach((q, i) => { q.points = previousPoints[i]; });
      if (onUpdate) onUpdate();
      if (global.toast) global.toast('تم التراجع عن تعميم النقاط ✓');
    });

    if (onUpdate) onUpdate();
    if (global.toast) global.toast(`تم تعميم (${numPoints} نقطة) على كافة الأسئلة ✓`);
  }

  // --- 4. Time Generalization with Confirm & Undo ---
  function applyTimeToAll(currentQuiz, seconds, onUpdate) {
    if (!currentQuiz || !Array.isArray(currentQuiz.questions) || currentQuiz.questions.length === 0) return;

    const numSec = Number(seconds);
    if (isNaN(numSec) || numSec < 5 || numSec > 240) {
      if (global.toast) global.toast('يرجى تحديد وقت بين 5 و 240 ثانية.');
      return;
    }

    const confirmMsg = `هل تريد تعميم وقت (${numSec} ثانية) على جميع الأسئلة (${currentQuiz.questions.length} سؤالاً)؟`;
    if (!confirm(confirmMsg)) return;

    const previousTimes = currentQuiz.questions.map(q => q.timeLimit ?? 20);
    currentQuiz.questions.forEach(q => { q.timeLimit = numSec; });

    showGeneralizationUndoToast('وقت الإجابة', `${numSec} ثانية`, () => {
      currentQuiz.questions.forEach((q, i) => { q.timeLimit = previousTimes[i]; });
      if (onUpdate) onUpdate();
      if (global.toast) global.toast('تم التراجع عن تعميم الوقت ✓');
    });

    if (onUpdate) onUpdate();
    if (global.toast) global.toast(`تم تعميم وقت (${numSec} ثانية) على كافة الأسئلة ✓`);
  }

  function showGeneralizationUndoToast(fieldTitle, valueStr, onUndo) {
    let container = document.getElementById('scorearBuilderToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'scorearBuilderToastContainer';
      container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = 'pointer-events:auto;background:#151833;border:2px solid #7550ef;border-radius:14px;padding:12px 18px;color:#fff;display:flex;align-items:center;gap:14px;box-shadow:0 10px 30px rgba(0,0,0,0.6);font-size:13px;font-weight:800;animation:enterFullBody 0.3s ease;';

    let secLeft = 10;
    toast.innerHTML = `
      <span>⚡ تم تعميم ${fieldTitle} (${valueStr})</span>
      <button id="genUndoBtn" type="button" style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:900;cursor:pointer;display:flex;align-items:center;gap:6px;">
        <span>تراجع ↩</span>
        <span id="genUndoSecPill" style="background:rgba(0,0,0,0.25);padding:1px 6px;border-radius:6px;font-size:11px;">10s</span>
      </button>
    `;

    container.appendChild(toast);

    const intId = setInterval(() => {
      secLeft--;
      const pill = toast.querySelector('#genUndoSecPill');
      if (pill) pill.textContent = secLeft + 's';
      if (secLeft <= 0) {
        clearInterval(intId);
        if (toast.parentNode) toast.remove();
      }
    }, 1000);

    const btn = toast.querySelector('#genUndoBtn');
    if (btn) {
      btn.onclick = () => {
        clearInterval(intId);
        if (toast.parentNode) toast.remove();
        if (onUndo) onUndo();
      };
    }
  }

  // --- 5. Drafts Manager ("تابع آخر مسودة") ---
  function getLastDraftInfo() {
    try {
      const lastId = localStorage.getItem('scorear_last_draft_id');
      if (!lastId) return null;
      const raw = localStorage.getItem('scorear_draft_backup_' + lastId);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        id: lastId,
        title: parsed.title || 'مسودة بدون عنوان',
        questionsCount: Array.isArray(parsed.questions) ? parsed.questions.length : 0,
        updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : null,
        data: parsed
      };
    } catch(e) {
      return null;
    }
  }

  const ScoreARQuizBuilderActions = {
    deleteWithUndo,
    undoDelete,
    onDragStart,
    onDragOver,
    onDrop,
    applyPointsToAll,
    applyTimeToAll,
    getLastDraftInfo
  };

  global.ScoreARQuizBuilderActions = ScoreARQuizBuilderActions;
  try { if (typeof globalThis !== 'undefined') globalThis.ScoreARQuizBuilderActions = ScoreARQuizBuilderActions; } catch(e){}
  if (typeof module !== 'undefined' && module.exports) module.exports = ScoreARQuizBuilderActions;
})(typeof window !== 'undefined' ? window : this);
