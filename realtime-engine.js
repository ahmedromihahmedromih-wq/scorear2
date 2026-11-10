/**
 * ScoreAR Realtime Engine Module
 * Unified event bus over Firebase Realtime Database (scorear_rooms/<pin>) + BroadcastChannel
 * Strictly adheres to legacy event format: { type, _timestamp, _senderRole, _msgId, ...payload }
 * Rule 7 compliant (<250 lines)
 */
(function(global) {
  'use strict';

  let currentRole = null; // 'host' or 'student'
  let currentPin = null;
  let onMessageCallback = null;
  let broadcastChannel = null;
  let rtdbRef = null;
  let rtdbListener = null;
  let connRef = null;
  let connListener = null;
  let sessionStartTime = 0;
  const processedMsgIds = new Set();
  const subscribers = new Set();
  let isConnected = false;

  function dispatchIncoming(msg) {
    if (!msg || typeof msg !== 'object') return;
    
    // Strict leak prevention: Students must NEVER receive or process answers from other students
    if (currentRole === 'student' && (msg.type === 'STUDENT_ANSWER' || msg._senderRole === 'student' || msg.optionIndex !== undefined || msg._scChoice !== undefined)) {
      return;
    }

    // Ignore messages sent by self
    const isSelf = msg._senderRole && (
      msg._senderRole === currentRole ||
      ((currentRole === 'host' || currentRole === 'teacher') && (msg._senderRole === 'host' || msg._senderRole === 'teacher'))
    );
    if (isSelf) return;
    if (msg._timestamp && (Date.now() - msg._timestamp > 180000)) return;

    // Deduplicate by _msgId across channels (BroadcastChannel & Firebase RTDB)
    if (msg._msgId) {
      if (processedMsgIds.has(msg._msgId)) return;
      processedMsgIds.add(msg._msgId);
      if (processedMsgIds.size > 2000) {
        const first = processedMsgIds.values().next().value;
        processedMsgIds.delete(first);
      }
    }

    // Restore sealed student choice exclusively for Host/Teacher role
    if ((currentRole === 'host' || currentRole === 'teacher') && msg._scChoice !== undefined && msg.optionIndex === undefined) {
      msg = { ...msg, optionIndex: Number(msg._scChoice), chosenIndices: [Number(msg._scChoice)] };
    }

    console.log(`[ScoreAR Realtime] [${currentRole}] Received event: ${msg.type}`);

    subscribers.forEach(sub => {
      try { sub(msg); } catch(err) { console.error('[ScoreAR Realtime] Subscriber error:', err); }
    });
    if (onMessageCallback && !subscribers.has(onMessageCallback)) {
      try { onMessageCallback(msg); } catch(err) { console.error('[ScoreAR Realtime] Callback execution error:', err); }
    }
  }

  function subscribe(fn) {
    if (typeof fn === 'function') subscribers.add(fn);
  }

  function init(arg1, arg2, onMessage) {
    cleanup();
    subscribers.clear();

    let role = 'student';
    let pin = '';
    if (/^\d{6}$/.test(String(arg1 || '').trim())) {
      pin = String(arg1).trim();
      role = arg2 || 'host';
    } else {
      role = arg1 || 'student';
      pin = String(arg2 || '').trim();
    }
    if (role === 'teacher' || role === 'admin') role = 'host';

    currentRole = role;
    currentPin = pin;
    sessionStartTime = Date.now() - 3000;
    onMessageCallback = (typeof onMessage === 'function') ? onMessage : null;
    if (onMessageCallback) subscribers.add(onMessageCallback);
    processedMsgIds.clear();

    // 1. Same-device local BroadcastChannel (Zero latency)
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        broadcastChannel = new BroadcastChannel('scorear_room_' + currentPin);
        broadcastChannel.onmessage = (event) => {
          if (event && event.data) {
            dispatchIncoming(event.data);
          }
        };
      }
    } catch(e) {
      console.warn('[ScoreAR Realtime] BroadcastChannel init notice:', e);
    }

    // 2. Firebase Realtime Database bus
    try {
      const db = (window.ScoreARAuth && window.ScoreARAuth.getDb) ? 
                 window.ScoreARAuth.getDb() : 
                 (window.firebase && window.firebase.database ? window.firebase.database() : null);

      if (db) {
        const setupListener = () => {
          if (rtdbListener && rtdbRef) rtdbRef.off('child_added', rtdbListener);
          rtdbRef = db.ref('scorear_rooms/' + currentPin);
          rtdbListener = rtdbRef.limitToLast(100).on('child_added', (snapshot) => {
            const val = snapshot.val();
            if (val) dispatchIncoming(val);
          }, (err) => {
            console.warn('[ScoreAR Realtime] RTDB listen notice:', err.message);
          });
        };

        const auth = window.firebase && window.firebase.auth ? window.firebase.auth() : null;
        if (auth && !auth.currentUser) {
          auth.signInAnonymously().then(() => setupListener()).catch(() => setupListener());
        } else {
          setupListener();
        }

        // Monitor RTDB connection state
        if (connRef && connListener) {
          try { connRef.off('value', connListener); } catch(e) {}
        }
        connRef = db.ref('.info/connected');
        connListener = (snap) => {
          isConnected = (snap.val() === true);
          updateBadge(isConnected);
        };
        connRef.on('value', connListener);
      }
    } catch(e) {
      console.warn('[ScoreAR Realtime] Firebase RTDB init error:', e);
    }

    updateBadge(true);
    console.log(`[ScoreAR Realtime] Initialized as [${role}] on room PIN: ${currentPin}`);
  }

  function publish(type, payload = {}) {
    if (!currentPin) {
      console.warn('[ScoreAR Realtime] Cannot publish: No active room PIN');
      return;
    }

    // Strict wire defense: Never broadcast raw optionIndex/chosenIndices on public room bus
    const cleanPayload = { ...payload };
    let cleanType = type;
    if (currentRole === 'student') {
      if (cleanPayload.optionIndex !== undefined) {
        cleanPayload._scChoice = Number(cleanPayload.optionIndex);
      }
      delete cleanPayload.optionIndex;
      delete cleanPayload.chosenIndices;
      delete cleanPayload.optionOrder;
      delete cleanPayload.answer;
      delete cleanPayload.correct;
      if (cleanType === 'STUDENT_ANSWER') cleanType = 'STUDENT_ANSWERED';
    }

    const message = {
      ...cleanPayload,
      type: cleanType,
      _msgId: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      _timestamp: Date.now(),
      _senderRole: currentRole
    };

    // Mark as seen so local broadcast ignores self
    processedMsgIds.add(message._msgId);

    // 1. BroadcastChannel dispatch
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage(message);
      } catch(e) {}
    }

    // 2. Firebase RTDB dispatch (with automatic auth-ready retry on cold mobile start)
    const activeDb = (window.ScoreARAuth && window.ScoreARAuth.getDb) ? window.ScoreARAuth.getDb() : (window.firebase && window.firebase.database ? window.firebase.database() : null);
    const activeRef = rtdbRef || (activeDb && currentPin ? activeDb.ref('scorear_rooms/' + currentPin) : null);
    if (activeRef) {
      try {
        activeRef.push(message).catch(err => {
          const auth = window.firebase && window.firebase.auth ? window.firebase.auth() : null;
          if (auth && !auth.currentUser && typeof auth.signInAnonymously === 'function') {
            auth.signInAnonymously().then(() => activeRef.push(message).catch(() => {})).catch(() => {});
          } else {
            console.warn('[ScoreAR Realtime] Firebase push warning:', err.message);
          }
        });
      } catch(e) {
        console.warn('[ScoreAR Realtime] Firebase push error:', e);
      }
    }

    return message;
  }

  function cleanup() {
    if (broadcastChannel) {
      try { broadcastChannel.close(); } catch(e){}
      broadcastChannel = null;
    }
    if (rtdbRef && rtdbListener) {
      try { rtdbRef.off('child_added', rtdbListener); } catch(e){}
      rtdbRef = null;
      rtdbListener = null;
    }
    if (connRef && connListener) {
      try { connRef.off('value', connListener); } catch(e){}
      connRef = null;
      connListener = null;
    }
    currentRole = null;
    currentPin = null;
    onMessageCallback = null;
    processedMsgIds.clear();
  }

  function generatePin() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function updateBadge(connected) {
    const badge = document.getElementById('connectionStatusBadge');
    const text = document.getElementById('connectionStatusText');
    if (!badge || !text) return;
    if (connected) {
      badge.className = "text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      text.innerText = "متصل لحظياً ✓";
    } else {
      badge.className = "text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition bg-amber-500/10 border-amber-500/30 text-amber-400";
      text.innerText = "جاري الاتصال...";
    }
  }

  // Export module globally
  global.ScoreARRealtime = {
    init,
    publish,
    subscribe,
    cleanup,
    generatePin,
    getRole: () => currentRole,
    getPin: () => currentPin,
    isConnected: () => isConnected
  };

  // Legacy alias for full backward compatibility
  global.RealtimeEngine = global.ScoreARRealtime;

})(typeof window !== 'undefined' ? window : this);
