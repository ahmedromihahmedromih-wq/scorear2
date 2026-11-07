/**
 * ScoreAR Interactive Audio Engine (quiz-audio.js)
 * Manages Background Music (Worlds, Lobby, Victory) & Interactive Sound Effects (SFX)
 * Strictly Rule 7 Compliant (<500 lines).
 */
(function(global) {
  'use strict';

  let currentMusic = null;
  let currentTrackName = null;
  let isMuted = false;
  try {
    isMuted = (typeof localStorage !== 'undefined' && localStorage.getItem('scorear_audio_muted') === 'true');
  } catch(e){}
  let musicVolume = 0.28;
  let sfxVolume = 0.85;

  const MUSIC_TRACKS = {
    royal: 'assets/audio/music/royal.mp3',
    oasis: 'assets/audio/music/oasis.mp3',
    cosmic: 'assets/audio/music/cosmic.mp3',
    treasure: 'assets/audio/music/treasure.mp3',
    stadium: 'assets/audio/music/stadium.mp3',
    magic: 'assets/audio/music/magic.mp3',
    lobby: 'assets/audio/music/lobby_warm.mp3',
    victory: 'assets/audio/music/victory.mp3'
  };

  const SFX_FILES = {
    correct: 'assets/audio/sfx/correct.mp3',
    wrong: 'assets/audio/sfx/wrong.mp3',
    pop: 'assets/audio/sfx/pop.mp3',
    reveal: 'assets/audio/sfx/reveal.mp3',
    tick: 'assets/audio/sfx/tick.mp3',
    whoosh: 'assets/audio/sfx/whoosh.mp3',
    fanfare: 'assets/audio/sfx/fanfare.mp3'
  };

  function playMusic(trackId, customVol = null) {
    if (isMuted) return;
    const key = String(trackId || 'royal').toLowerCase();
    const url = MUSIC_TRACKS[key] || MUSIC_TRACKS.royal;

    if (currentMusic && currentTrackName === key) {
      if (currentMusic.paused) currentMusic.play().catch(() => {});
      return;
    }

    stopMusic();

    try {
      const aud = new Audio(url);
      aud.loop = true;
      aud.volume = (typeof customVol === 'number') ? customVol : musicVolume;
      aud.play().catch(e => {
        // Autoplay policy: unlock on first document touch/click
        const unlock = () => {
          if (currentMusic && !isMuted) currentMusic.play().catch(() => {});
          document.removeEventListener('click', unlock);
          document.removeEventListener('touchstart', unlock);
        };
        document.addEventListener('click', unlock, { once: true });
        document.addEventListener('touchstart', unlock, { once: true });
      });
      currentMusic = aud;
      currentTrackName = key;
    } catch(e) {
      console.warn('[ScoreAR Audio] Play music notice:', e);
    }
  }

  function stopMusic() {
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
    if (!url) return;

    try {
      const aud = new Audio(url);
      aud.volume = (typeof customVol === 'number') ? customVol : sfxVolume;
      aud.play().catch(() => {});
    } catch(e) {}
  }

  function toggleMute() {
    isMuted = !isMuted;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('scorear_audio_muted', String(isMuted));
      }
    } catch(e){}
    if (isMuted) {
      if (currentMusic) currentMusic.pause();
    } else {
      if (currentMusic) currentMusic.play().catch(() => {});
    }
    updateMuteIcons();
    return isMuted;
  }

  function updateMuteIcons() {
    const btns = document.querySelectorAll('.scorear-audio-btn');
    btns.forEach(b => {
      b.innerHTML = isMuted ? '🔇 الصوت: صامت' : '🔊 الصوت: يعمل';
      b.style.color = isMuted ? '#f87171' : '#52d9ed';
    });
  }

  global.ScoreARAudio = {
    playMusic,
    stopMusic,
    playSfx,
    toggleMute,
    isMuted: () => isMuted,
    setMusicVolume: (v) => { musicVolume = Math.max(0, Math.min(1, v)); if (currentMusic) currentMusic.volume = musicVolume; },
    setSfxVolume: (v) => { sfxVolume = Math.max(0, Math.min(1, v)); }
  };

})(typeof window !== 'undefined' ? window : this);
