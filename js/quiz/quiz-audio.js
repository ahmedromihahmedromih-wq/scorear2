/**
 * ScoreAR Interactive Audio Engine (quiz-audio.js)
 * Manages Background Music (Worlds, Lobby, Victory), SFX & Web Audio Unblock/Fallback
 * Strictly Rule 7 Compliant (<500 lines).
 */
(function(global) {
  'use strict';

  let currentMusic = null;
  let currentTrackName = null;
  let desiredTrack = null;
  let desiredVol = null;
  let autoplayBlocked = false;
  let audioCtx = null;
  let isMuted = false;
  try {
    isMuted = (typeof localStorage !== 'undefined' && localStorage.getItem('scorear_audio_muted') === 'true');
  } catch(e){}
  let musicVolume = 0.28;
  let sfxVolume = 0.85;

  const MUSIC_TRACKS = {
    lobby: 'assets/audio/music/treasure.mp3',
    waiting: 'assets/audio/music/treasure.mp3',
    question: 'assets/audio/music/magic.mp3',
    royal: 'assets/audio/music/magic.mp3',
    oasis: 'assets/audio/music/magic.mp3',
    cosmic: 'assets/audio/music/magic.mp3',
    treasure: 'assets/audio/music/magic.mp3',
    stadium: 'assets/audio/music/magic.mp3',
    magic: 'assets/audio/music/magic.mp3',
    victory: 'assets/audio/music/magic.mp3'
  };

  const SFX_FILES = {
    correct: 'assets/audio/sfx/correct.mp3',
    wrong: 'assets/audio/sfx/wrong.mp3',
    pop: 'assets/audio/sfx/pop.mp3',
    reveal: 'assets/audio/sfx/reveal.mp3',
    tick: 'assets/audio/sfx/tick.mp3',
    whoosh: 'assets/audio/sfx/whoosh.mp3',
    fanfare: 'assets/audio/sfx/fanfare.mp3',
    drumroll: 'assets/audio/sfx/fanfare.mp3'
  };

  function getCtx() {
    if (audioCtx) return audioCtx;
    try {
      const Ctx = global.AudioContext || global.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    } catch(e) {}
    return audioCtx;
  }

  function tone(freq, dur, type, vol, delay = 0, freqEnd = null) {
    const ctx = getCtx();
    if (!ctx || ctx.state !== 'running') return;
    try {
      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, now);
      if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, now + dur);
      gain.gain.setValueAtTime(Math.max(0.001, vol), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch(e) {}
  }

  function playSynthSfx(type, vol) {
    const v = Math.min(0.4, (vol || 0.7) * 0.35);
    if (type === 'tick') return tone(920, 0.06, 'triangle', v, 0, 440);
    if (type === 'pop') return tone(540, 0.08, 'sine', v, 0, 820);
    if (type === 'whoosh') return tone(380, 0.18, 'sine', v * 0.8, 0, 140);
    if (type === 'reveal') { tone(523, 0.11, 'triangle', v, 0); return tone(784, 0.16, 'triangle', v, 0.08); }
    if (type === 'correct') { [523, 659, 784].forEach((f, i) => tone(f, 0.16, 'triangle', v, i * 0.07)); return; }
    if (type === 'wrong') return tone(230, 0.24, 'sawtooth', v * 0.75, 0, 145);
    if (type === 'fanfare' || type === 'drumroll') { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', v, i * 0.08)); }
  }

  function unlockAudio() {
    const ctx = getCtx();
    if (ctx && ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      ctx.resume().catch(() => {});
    }
    if (isMuted) return;
    if (currentMusic && (currentMusic.paused || autoplayBlocked)) {
      const p = currentMusic.play();
      if (p && typeof p.then === 'function') {
        p.then(() => { autoplayBlocked = false; updateMuteIcons(); }).catch(() => {});
      }
    } else if (!currentMusic && desiredTrack) {
      playMusic(desiredTrack, desiredVol);
    }
  }

  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    ['pointerdown', 'click', 'touchstart', 'keydown'].forEach(evt => {
      document.addEventListener(evt, unlockAudio, { passive: true, capture: true });
    });
  }

  function playMusic(trackId, customVol = null) {
    const rawKey = String(trackId || 'magic').toLowerCase().trim();
    const key = (rawKey === 'lobby' || rawKey === 'waiting') ? 'lobby' : (MUSIC_TRACKS[rawKey] ? rawKey : 'magic');
    const vol = (typeof customVol === 'number') ? customVol : musicVolume;
    desiredTrack = key;
    desiredVol = vol;
    if (isMuted) { updateMuteIcons(); return; }
    const url = MUSIC_TRACKS[key] || 'assets/audio/music/magic.mp3';

    if (currentMusic && currentTrackName === key) {
      currentMusic.volume = vol;
      if (currentMusic.paused || autoplayBlocked) {
        const p = currentMusic.play();
        if (p && typeof p.then === 'function') {
          p.then(() => { autoplayBlocked = false; updateMuteIcons(); }).catch(() => { autoplayBlocked = true; updateMuteIcons(); });
        }
      }
      return;
    }

    stopMusic(false);

    try {
      const aud = new Audio(url);
      aud.loop = true;
      aud.volume = vol;
      currentMusic = aud;
      currentTrackName = key;
      const p = aud.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          autoplayBlocked = false;
          updateMuteIcons();
        }).catch(() => {
          autoplayBlocked = true;
          updateMuteIcons();
        });
      }
    } catch(e) {
      console.warn('[ScoreAR Audio] Play music notice:', e);
    }
  }

  function stopMusic(clearDesired = true) {
    if (clearDesired) { desiredTrack = null; autoplayBlocked = false; }
    if (currentMusic) {
      try {
        currentMusic.pause();
        currentMusic.currentTime = 0;
      } catch(e){}
      currentMusic = null;
      currentTrackName = null;
    }
  }

  function playSfx(type, customVol = null) {
    if (isMuted) return;
    const url = SFX_FILES[type];
    const vol = (typeof customVol === 'number') ? customVol : sfxVolume;
    if (!url) { playSynthSfx(type, vol); return; }

    try {
      const aud = new Audio(url);
      aud.volume = vol;
      const p = aud.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => { playSynthSfx(type, vol); });
      }
    } catch(e) {
      playSynthSfx(type, vol);
    }
  }

  function toggleMute() {
    const ctx = getCtx();
    if (ctx && ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      ctx.resume().catch(() => {});
    }
    if (!isMuted && autoplayBlocked) {
      autoplayBlocked = false;
      try { if (typeof localStorage !== 'undefined') localStorage.setItem('scorear_audio_muted', 'false'); } catch(e){}
      if (currentMusic) currentMusic.play().catch(() => {});
      else if (desiredTrack) playMusic(desiredTrack, desiredVol);
      updateMuteIcons();
      return false;
    }

    isMuted = !isMuted;
    autoplayBlocked = false;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('scorear_audio_muted', String(isMuted));
      }
    } catch(e){}
    if (isMuted) {
      if (currentMusic) currentMusic.pause();
    } else {
      if (currentMusic) {
        const p = currentMusic.play();
        if (p && typeof p.catch === 'function') p.catch(() => { autoplayBlocked = true; updateMuteIcons(); });
      } else if (desiredTrack) {
        playMusic(desiredTrack, desiredVol);
      }
    }
    updateMuteIcons();
    return isMuted;
  }

  function updateMuteIcons() {
    if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
    const btns = document.querySelectorAll('.scorear-audio-btn, #hostAudioMuteBtn, #scAudioBtn');
    btns.forEach(b => {
      if (!b) return;
      const compact = (b.id === 'scAudioBtn');
      if (isMuted) {
        b.innerHTML = compact ? '🔇' : '🔇 الصوت: صامت';
        if (b.style) { b.style.color = '#f87171'; b.style.borderColor = 'rgba(248,113,113,0.5)'; }
      } else if (autoplayBlocked) {
        b.innerHTML = compact ? '🔇' : '🔊 اضغط لتفعيل الصوت';
        if (b.style) { b.style.color = '#fbbf24'; b.style.borderColor = '#fbbf24'; }
      } else {
        b.innerHTML = compact ? '🔊' : '🔊 الصوت: يعمل';
        if (b.style) { b.style.color = '#52d9ed'; b.style.borderColor = 'rgba(82,217,237,0.45)'; }
      }
    });
  }

  global.ScoreARAudio = {
    playMusic,
    stopMusic,
    playSfx,
    toggleMute,
    updateMuteIcons,
    unlock: unlockAudio,
    isMuted: () => isMuted,
    isAutoplayBlocked: () => autoplayBlocked,
    getCurrentTrack: () => currentTrackName || desiredTrack,
    setMusicVolume: (v) => { musicVolume = Math.max(0, Math.min(1, v)); if (currentMusic) currentMusic.volume = musicVolume; },
    setSfxVolume: (v) => { sfxVolume = Math.max(0, Math.min(1, v)); }
  };

})(typeof window !== 'undefined' ? window : this);
