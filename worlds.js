/**
 * ScoreAR (سكور عربي) — Unified 6 Worlds Registry, Video & Audio Resolver (v3.0.0)
 * Enforces strict world consistency across all 5 stages (lobby, waiting, question, results, podium),
 * real MP4 cinematic videos, and Suno MP3 interactive soundtracks & SFX via Howler.js.
 */
(function (window) {
  'use strict';

  const ASSET_VERSION = '3.0.0';

  function versioned(path) {
    if (!path || path.startsWith('data:')) return path;
    return path.includes('?') ? path : path + '?v=' + ASSET_VERSION;
  }

  function makeScreen(worldId, stage) {
    const jpgPath = versioned('assets/worlds/' + worldId + '/' + stage + '.jpg');
    return {
      original: jpgPath,
      jpg2k: jpgPath,
      w1920: jpgPath,
      w1280: jpgPath,
      fallbackLobby: versioned('assets/worlds/' + worldId + '/lobby.jpg')
    };
  }

  function makeMusic(worldTrack) {
    return {
      lobby: versioned('assets/audio/music/lobby_warm.mp3'),
      waiting: versioned('assets/audio/music/' + worldTrack + '.mp3'),
      calm: versioned('assets/audio/music/treasure.mp3'),
      tense: versioned('assets/audio/music/treasure.mp3'),
      results: versioned('assets/audio/music/' + worldTrack + '.mp3'),
      podium: versioned('assets/audio/music/victory.mp3'),
      fallbackWav: versioned('assets/audio/music/treasure.wav')
    };
  }

  const SFX_LIBRARY = {
    correct: versioned('assets/audio/sfx/correct.mp3'),
    wrong: versioned('assets/audio/sfx/wrong.mp3'),
    countdown: versioned('assets/audio/sfx/tick.mp3'),
    tick: versioned('assets/audio/sfx/tick.mp3'),
    pop: versioned('assets/audio/sfx/pop.mp3'),
    fanfare: versioned('assets/audio/sfx/fanfare.mp3'),
    reveal: versioned('assets/audio/sfx/reveal.mp3'),
    whoosh: versioned('assets/audio/sfx/whoosh.mp3'),
    click: versioned('assets/audio/sfx/pop.mp3')
  };

  const WORLDS = {
    royal: {
      id: 'royal',
      name: 'القصر الملكي',
      englishName: 'Royal Palace',
      icon: '🏰',
      tagline: 'قاعة العرش الذهبي والأعمدة الرخامية الفاخرة',
      palette: {
        primary: '#1E1B4B',
        secondary: '#311042',
        accent: '#F5C76B',
        glow: 'rgba(245, 199, 107, 0.48)',
        border: '#F59E0B',
        cardBg: 'rgba(20, 16, 48, 0.84)'
      },
      video: {
        intro: versioned('assets/videos/worlds/royal_intro.mp4'),
        loop: versioned('assets/videos/worlds/royal.mp4')
      },
      screens: {
        lobby: makeScreen('royal', 'lobby'),
        waiting: makeScreen('royal', 'waiting'),
        question: makeScreen('royal', 'question'),
        results: makeScreen('royal', 'results'),
        podium: makeScreen('royal', 'podium')
      },
      music: makeMusic('royal'),
      sfx: SFX_LIBRARY
    },
    oasis: {
      id: 'oasis',
      name: 'الواحة العربية',
      englishName: 'Arabian Oasis',
      icon: '🌴',
      tagline: 'واحة النخيل الذهبية والينابيع الفيروزية تحت نجوم الصحراء',
      palette: {
        primary: '#064E3B',
        secondary: '#451A03',
        accent: '#34D399',
        glow: 'rgba(52, 211, 153, 0.48)',
        border: '#10B981',
        cardBg: 'rgba(6, 46, 35, 0.84)'
      },
      video: {
        intro: versioned('assets/videos/worlds/oasis.mp4'),
        loop: versioned('assets/videos/worlds/oasis.mp4')
      },
      screens: {
        lobby: makeScreen('oasis', 'lobby'),
        waiting: makeScreen('oasis', 'waiting'),
        question: makeScreen('oasis', 'question'),
        results: makeScreen('oasis', 'results'),
        podium: makeScreen('oasis', 'podium')
      },
      music: makeMusic('oasis'),
      sfx: SFX_LIBRARY
    },
    cosmic: {
      id: 'cosmic',
      name: 'محطة الفضاء',
      englishName: 'Space Station',
      icon: '🚀',
      tagline: 'مختبر المدار الكوني المطل على السدم والمجرات المضيئة',
      palette: {
        primary: '#090D16',
        secondary: '#1E1B4B',
        accent: '#22D3EE',
        glow: 'rgba(34, 211, 238, 0.52)',
        border: '#06B6D4',
        cardBg: 'rgba(9, 15, 32, 0.85)'
      },
      video: {
        intro: versioned('assets/videos/worlds/cosmic.mp4'),
        loop: versioned('assets/videos/worlds/cosmic.mp4')
      },
      screens: {
        lobby: makeScreen('cosmic', 'lobby'),
        waiting: makeScreen('cosmic', 'waiting'),
        question: makeScreen('cosmic', 'question'),
        results: makeScreen('cosmic', 'results'),
        podium: makeScreen('cosmic', 'podium')
      },
      music: makeMusic('cosmic'),
      sfx: SFX_LIBRARY
    },
    treasure: {
      id: 'treasure',
      name: 'جزيرة الكنز',
      englishName: 'Treasure Island',
      icon: '🏴‍☠️',
      tagline: 'خليج القراصنة الاستوائي وكهوف الصناديق الذهبية المتوهجة',
      palette: {
        primary: '#0F2942',
        secondary: '#451A03',
        accent: '#FBBF24',
        glow: 'rgba(251, 191, 36, 0.48)',
        border: '#D97706',
        cardBg: 'rgba(12, 32, 52, 0.84)'
      },
      video: {
        intro: versioned('assets/videos/worlds/treasure.mp4'),
        loop: versioned('assets/videos/worlds/treasure.mp4')
      },
      screens: {
        lobby: makeScreen('treasure', 'lobby'),
        waiting: makeScreen('treasure', 'waiting'),
        question: makeScreen('treasure', 'question'),
        results: makeScreen('treasure', 'results'),
        podium: makeScreen('treasure', 'podium')
      },
      music: makeMusic('treasure'),
      sfx: SFX_LIBRARY
    },
    stadium: {
      id: 'stadium',
      name: 'استاد الأبطال',
      englishName: 'Champions Stadium',
      icon: '🏟️',
      tagline: 'ملعب البطولات العالمي تحت الأضواء الكاشفة وهتاف الجماهير',
      palette: {
        primary: '#052E16',
        secondary: '#0F172A',
        accent: '#38BDF8',
        glow: 'rgba(56, 189, 248, 0.50)',
        border: '#22C55E',
        cardBg: 'rgba(7, 34, 22, 0.85)'
      },
      video: {
        intro: versioned('assets/videos/worlds/stadium.mp4'),
        loop: versioned('assets/videos/worlds/stadium.mp4')
      },
      screens: {
        lobby: makeScreen('stadium', 'lobby'),
        waiting: makeScreen('stadium', 'waiting'),
        question: makeScreen('stadium', 'question'),
        results: makeScreen('stadium', 'results'),
        podium: makeScreen('stadium', 'podium')
      },
      music: makeMusic('stadium'),
      sfx: SFX_LIBRARY
    },
    magic: {
      id: 'magic',
      name: 'مملكة السحر',
      englishName: 'Magic Kingdom',
      icon: '🔮',
      tagline: 'القلعة الكريستالية العائمة ومكتبة المخطوطات السحرية المضيئة',
      palette: {
        primary: '#2E1065',
        secondary: '#3B0764',
        accent: '#F472B6',
        glow: 'rgba(244, 114, 182, 0.48)',
        border: '#A855F7',
        cardBg: 'rgba(36, 12, 68, 0.84)'
      },
      video: {
        intro: versioned('assets/videos/worlds/magic.mp4'),
        loop: versioned('assets/videos/worlds/magic.mp4')
      },
      screens: {
        lobby: makeScreen('magic', 'lobby'),
        waiting: makeScreen('magic', 'waiting'),
        question: makeScreen('magic', 'question'),
        results: makeScreen('magic', 'results'),
        podium: makeScreen('magic', 'podium')
      },
      music: makeMusic('magic'),
      sfx: SFX_LIBRARY
    }
  };

  window.SCOREAR_ASSET_DEBUG = {
    enabled: new URLSearchParams(window.location.search).get('debug') === 'assets',
    currentWorldId: 'royal',
    currentStage: 'lobby',
    activeBgUrl: '',
    activeBgDimensions: 'قيد الفحص...',
    activeMusicTrack: 'متوقفة',
    activeVideoUrl: '—',
    failedAssets: [],
    warnings: []
  };

  function getWorld(worldId) {
    if (worldId && WORLDS[worldId]) return WORLDS[worldId];
    return WORLDS.royal;
  }

  function resolveBackground(worldId, stageKey) {
    const world = getWorld(worldId);
    const validStage = (world.screens && world.screens[stageKey]) ? stageKey : 'lobby';
    const scr = world.screens[validStage] || world.screens.lobby;
    const isMobile = window.innerWidth <= 900;
    const chosenUrl = isMobile ? scr.w1280 : scr.original;

    return {
      worldId: world.id,
      stage: validStage,
      url: chosenUrl,
      originalUrl: scr.original,
      jpg2kUrl: scr.jpg2k || scr.original,
      w1920Url: scr.w1920,
      w1280Url: scr.w1280,
      fallbackLobbyUrl: scr.fallbackLobby,
      srcset: scr.w1280 + ' 1280w, ' + scr.w1920 + ' 1920w, ' + scr.original + ' 2752w',
      imageSetCss: 'image-set(url("' + scr.w1280 + '") 1x, url("' + scr.w1920 + '") 1.5x, url("' + scr.original + '") 2x)'
    };
  }

  function resolveVideo(worldId, type) {
    const world = getWorld(worldId);
    if (!world.video) return versioned('assets/videos/worlds/royal.mp4');
    return type === 'intro' ? (world.video.intro || world.video.loop) : (world.video.loop || world.video.intro);
  }

  function logFailedAsset(url, reason) {
    const entry = url + (reason ? ' (' + reason + ')' : '');
    if (!window.SCOREAR_ASSET_DEBUG.failedAssets.includes(entry)) {
      window.SCOREAR_ASSET_DEBUG.failedAssets.push(entry);
    }
    console.warn('[ScoreAR Asset Warning] Failed to load:', entry);
    if (typeof window.refreshAssetDebugPanel === 'function') {
      window.refreshAssetDebugPanel();
    }
  }

  function logWarning(msg) {
    if (!window.SCOREAR_ASSET_DEBUG.warnings.includes(msg)) {
      window.SCOREAR_ASSET_DEBUG.warnings.push(msg);
    }
    console.warn('[ScoreAR World Warning]:', msg);
    if (typeof window.refreshAssetDebugPanel === 'function') {
      window.refreshAssetDebugPanel();
    }
  }

  window.ScoreARWorlds = {
    ASSET_VERSION: ASSET_VERSION,
    WORLDS: WORLDS,
    SFX: SFX_LIBRARY,
    getWorld: getWorld,
    resolveBackground: resolveBackground,
    resolveVideo: resolveVideo,
    logFailedAsset: logFailedAsset,
    logWarning: logWarning
  };
})(window);
