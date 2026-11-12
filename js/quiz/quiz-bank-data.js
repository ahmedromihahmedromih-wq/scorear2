/**
 * ScoreAR Quiz Bank Data Layer (quiz-bank-data.js)
 * Item 2 & 3: Teacher Question Bank & Quizzes Data Manager.
 * Strict ownerUid query-only RTDB rules compliance.
 * Paginated queries, 5-second undo delete queue, bulk actions (move, delete, copy),
 * Free-text subject & grade suggestions, and source/type metadata tracking.
 * Strictly Rule 7 Compliant (<500 lines).
 */
(function (global) {
  'use strict';

  let cachedQuizzes = [];
  let cachedQuestions = [];
  let cachedFolders = [];
  let currentUid = null;
  const pendingDeletions = new Map(); // id -> { type, data, timeout, timerId }

  function getDb() {
    return (global.ScoreARAuth && global.ScoreARAuth.getDb)
      ? global.ScoreARAuth.getDb()
      : (global.firebase && global.firebase.database ? global.firebase.database() : null);
  }

  async function ensureAuthUser() {
    const auth = (global.firebase && global.firebase.auth) ? global.firebase.auth() : null;
    if (!auth) return null;
    if (!auth.currentUser) {
      try { await auth.signInAnonymously(); } catch (e) {}
    }
    currentUid = auth.currentUser ? auth.currentUser.uid : null;
    return currentUid;
  }

  // --- 1. Query-Only Data Fetching (Strict ownerUid Indexing) ---
  async function refreshAllData() {
    await ensureAuthUser();
    const db = getDb();
    if (!db || !currentUid) return;

    try {
      // 1. Quizzes query strictly by ownerUid
      const snapQ = await db.ref('scorear_quizzes').orderByChild('ownerUid').equalTo(currentUid).once('value');
      const qVal = snapQ.val() || {};
      cachedQuizzes = Object.keys(qVal)
        .map(k => ({ ...qVal[k], id: k }))
        .filter(q => !pendingDeletions.has(q.id))
        .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

      // 2. Question Bank query strictly by ownerUid
      const snapB = await db.ref('scorear_question_bank').orderByChild('ownerUid').equalTo(currentUid).once('value');
      const bVal = snapB.val() || {};
      cachedQuestions = Object.keys(bVal)
        .map(k => ({
          ...bVal[k],
          id: k,
          source: bVal[k].source || 'manual',
          type: (bVal[k].opts && bVal[k].opts.length === 2) ? 'tf' : 'mcq'
        }))
        .filter(q => !pendingDeletions.has(q.id))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      // 3. Folders query strictly by ownerUid
      const snapF = await db.ref('scorear_folders').orderByChild('ownerUid').equalTo(currentUid).once('value');
      const fVal = snapF.val() || {};
      cachedFolders = Object.keys(fVal).map(k => ({ ...fVal[k], id: k }));

    } catch (err) {
      console.warn('[QuizBankData] Query notice:', err.message);
    }
  }

  // --- 2. Dynamic Free Suggestions ---
  function getUniqueSubjects() {
    const set = new Set();
    cachedQuestions.forEach(q => { if (q.subject && q.subject.trim()) set.add(q.subject.trim()); });
    return Array.from(set);
  }

  function getUniqueGrades() {
    const set = new Set();
    cachedQuestions.forEach(q => { if (q.grade && q.grade.trim()) set.add(q.grade.trim()); });
    return Array.from(set);
  }

  function getUniqueTags() {
    const set = new Set();
    cachedQuestions.forEach(q => {
      if (Array.isArray(q.tags)) q.tags.forEach(t => t && set.add(t.trim()));
      else if (q.tags && typeof q.tags === 'string') set.add(q.tags.trim());
    });
    return Array.from(set);
  }

  // --- 3. Paginated Filter Query ---
  function getFilteredQuestions(filters = {}) {
    const {
      search = '',
      subject = 'all',
      grade = 'all',
      tag = 'all',
      source = 'all',
      type = 'all',
      folderId = 'all',
      dateFilter = 'all',
      page = 1,
      pageSize = 12
    } = filters;

    const qStr = search.trim().toLowerCase();
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    const filtered = cachedQuestions.filter(item => {
      // 1. Search filter
      if (qStr) {
        const textMatch = (item.q || item.text || '').toLowerCase().includes(qStr);
        const optMatch = item.opts && item.opts.some(o => o.toLowerCase().includes(qStr));
        if (!textMatch && !optMatch) return false;
      }
      // 2. Subject filter
      if (subject !== 'all' && item.subject !== subject) return false;
      // 3. Grade filter
      if (grade !== 'all' && item.grade !== grade) return false;
      // 4. Folder filter
      if (folderId !== 'all' && item.folderId !== folderId) return false;
      // 5. Source filter ('manual' | 'import' | 'ai')
      if (source !== 'all' && item.source !== source) return false;
      // 6. Type filter ('mcq' | 'tf')
      if (type !== 'all' && item.type !== type) return false;
      // 7. Tag filter
      if (tag !== 'all') {
        const tags = Array.isArray(item.tags) ? item.tags : [item.tags];
        if (!tags.includes(tag)) return false;
      }
      // 8. Date filter
      if (dateFilter === 'today' && (now - (item.createdAt || 0)) > oneDay) return false;
      if (dateFilter === 'week' && (now - (item.createdAt || 0)) > 7 * oneDay) return false;
      if (dateFilter === 'month' && (now - (item.createdAt || 0)) > 30 * oneDay) return false;

      return true;
    });

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const curPage = Math.min(Math.max(1, page), totalPages);
    const startIdx = (curPage - 1) * pageSize;
    const pagedItems = filtered.slice(startIdx, startIdx + pageSize);

    return {
      items: pagedItems,
      totalItems,
      totalPages,
      currentPage: curPage,
      pageSize
    };
  }

  function getFilteredQuizzes(filters = {}) {
    const { search = '', folderId = 'all', page = 1, pageSize = 12 } = filters;
    const qStr = search.trim().toLowerCase();

    const filtered = cachedQuizzes.filter(qz => {
      if (qStr && !(qz.title || '').toLowerCase().includes(qStr)) return false;
      if (folderId !== 'all' && qz.folderId !== folderId) return false;
      return true;
    });

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const curPage = Math.min(Math.max(1, page), totalPages);
    const startIdx = (curPage - 1) * pageSize;
    const pagedItems = filtered.slice(startIdx, startIdx + pageSize);

    return {
      items: pagedItems,
      totalItems,
      totalPages,
      currentPage: curPage,
      pageSize
    };
  }

  // --- 4. 5-Second Undo Delete System ---
  function deleteWithUndo(type, id, onRefresh) {
    const db = getDb();
    if (!db) return;

    let targetItem = null;
    if (type === 'question') {
      const idx = cachedQuestions.findIndex(q => q.id === id);
      if (idx !== -1) {
        targetItem = cachedQuestions[idx];
        cachedQuestions.splice(idx, 1);
      }
    } else if (type === 'quiz') {
      const idx = cachedQuizzes.findIndex(q => q.id === id);
      if (idx !== -1) {
        targetItem = cachedQuizzes[idx];
        cachedQuizzes.splice(idx, 1);
      }
    }

    if (!targetItem) return;

    const timerId = setTimeout(async () => {
      pendingDeletions.delete(id);
      try {
        const path = type === 'question' ? 'scorear_question_bank/' : 'scorear_quizzes/';
        await db.ref(path + id).remove();
      } catch (e) {
        console.warn(`[QuizBankData] Commit delete error for ${id}:`, e.message);
      }
    }, 5000);

    pendingDeletions.set(id, {
      type,
      data: targetItem,
      timerId
    });

    if (typeof onRefresh === 'function') onRefresh();

    return {
      undo: () => {
        const entry = pendingDeletions.get(id);
        if (entry) {
          clearTimeout(entry.timerId);
          pendingDeletions.delete(id);
          if (type === 'question') {
            cachedQuestions.unshift(entry.data);
            cachedQuestions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          } else {
            cachedQuizzes.unshift(entry.data);
            cachedQuizzes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          }
          if (typeof onRefresh === 'function') onRefresh();
          return true;
        }
        return false;
      }
    };
  }

  // --- 5. Bulk Operations ---
  async function bulkMoveToFolder(itemType, itemIds, folderId) {
    const db = getDb();
    if (!db || !itemIds.length) return;
    const path = itemType === 'quiz' ? 'scorear_quizzes/' : 'scorear_question_bank/';
    const updates = {};
    for (const id of itemIds) {
      updates[`${path}${id}/folderId`] = folderId;
    }
    await db.ref().update(updates);
    await refreshAllData();
  }

  function bulkDeleteWithUndo(itemType, itemIds, onRefresh) {
    const undoFns = [];
    for (const id of itemIds) {
      const u = deleteWithUndo(itemType, id, null);
      if (u) undoFns.push(u.undo);
    }
    if (typeof onRefresh === 'function') onRefresh();
    return {
      undoAll: () => {
        undoFns.forEach(fn => fn());
        if (typeof onRefresh === 'function') onRefresh();
      }
    };
  }

  // --- 6. Save & Duplicate ---
  async function saveQuestion(qData, meta = {}) {
    await ensureAuthUser();
    const db = getDb();
    if (!db || !qData || !currentUid) return null;

    const qId = 'qb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const opts = (qData.opts || qData.options || []).map(o => String(o).trim()).filter(Boolean);
    const entry = {
      id: qId,
      ownerUid: currentUid,
      q: (qData.q || qData.text || '').trim(),
      opts,
      ans: Number(qData.ans !== undefined ? qData.ans : (qData.correct ? qData.correct[0] : 0)) || 0,
      explain: (qData.explain || qData.explanation || '').trim(),
      timeLimit: Number(qData.timeLimit) || 20,
      points: Number(qData.points) || 1000,
      subject: (meta.subject || '').trim(),
      grade: (meta.grade || '').trim(),
      tags: Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : []),
      folderId: meta.folderId || 'root',
      source: meta.source || 'manual',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.ref('scorear_question_bank/' + qId).set(entry);
    cachedQuestions.unshift(entry);
    return entry;
  }

  async function duplicateQuiz(quizId) {
    const original = cachedQuizzes.find(x => x.id === quizId);
    if (!original) return null;
    await ensureAuthUser();
    const db = getDb();
    if (!db || !currentUid) return null;

    const newId = 'quiz_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const clone = JSON.parse(JSON.stringify(original));
    clone.id = newId;
    clone.title = (original.title || 'مسابقة') + ' (نسخة)';
    clone.ownerUid = currentUid;
    clone.createdAt = Date.now();
    clone.updatedAt = Date.now();

    await db.ref('scorear_quizzes/' + newId).set(clone);
    cachedQuizzes.unshift(clone);
    return clone;
  }

  async function createFolder(name) {
    const fName = (name || '').trim();
    if (!fName) return null;
    await ensureAuthUser();
    const db = getDb();
    if (!db || !currentUid) return null;

    const fId = 'fld_' + Date.now();
    const fld = { id: fId, ownerUid: currentUid, name: fName, createdAt: Date.now() };
    await db.ref('scorear_folders/' + fId).set(fld);
    cachedFolders.push(fld);
    return fld;
  }

  async function deleteFolder(folderId) {
    const db = getDb();
    if (!db) return;
    await db.ref('scorear_folders/' + folderId).remove();
    const idx = cachedFolders.findIndex(f => f.id === folderId);
    if (idx !== -1) cachedFolders.splice(idx, 1);
  }

  global.ScoreARQuizBankData = {
    ensureAuthUser,
    refreshAllData,
    getQuizzes: () => [...cachedQuizzes],
    getQuestions: () => [...cachedQuestions],
    getFolders: () => [...cachedFolders],
    getUniqueSubjects,
    getUniqueGrades,
    getUniqueTags,
    getFilteredQuestions,
    getFilteredQuizzes,
    deleteWithUndo,
    bulkDeleteWithUndo,
    bulkMoveToFolder,
    saveQuestion,
    duplicateQuiz,
    createFolder,
    deleteFolder
  };

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
