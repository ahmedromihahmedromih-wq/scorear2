(function () {
  'use strict';

  const ICON_MAP = {
    home: 'House',
    grid: 'PanelsTopLeft',
    planet: 'Orbit',
    route: 'Route',
    book: 'BookOpen',
    arrow: 'ArrowLeft',
    key: 'KeyRound',
    motion: 'Waves',
    info: 'Info',
    menu: 'Menu',
    close: 'X',
    play: 'Play',
    check: 'Check',
    spark: 'Sparkles',
    sparkles: 'Sparkles',
    wand: 'WandSparkles',
    trophy: 'Trophy',
    crown: 'Crown',
    star: 'Star',
    users: 'UsersRound',
    clock: 'Clock3',
    history: 'History',
    upload: 'CloudUpload',
    file: 'FileText',
    folder: 'Folder',
    folderOpen: 'FolderOpen',
    spreadsheet: 'FileSpreadsheet',
    presentation: 'Presentation',
    image: 'Image',
    trash: 'Trash2',
    chart: 'ChartNoAxesCombined',
    shield: 'ShieldCheck',
    edit: 'PenLine',
    search: 'Search',
    download: 'Download',
    flame: 'Flame',
    award: 'Award',
    target: 'Target',
    layers: 'Layers',
    eye: 'Eye',
    copy: 'Copy',
    plus: 'Plus',
    checkCircle: 'CircleCheck',
    alert: 'TriangleAlert',
    sliders: 'SlidersHorizontal',
    zap: 'Zap',
    refresh: 'RefreshCw',
    rotateCcw: 'RotateCcw',
    layoutGrid: 'LayoutGrid',
    list: 'List',
    brain: 'Brain',
    bot: 'Bot',
    bookMarked: 'BookMarked',
    graduation: 'GraduationCap',
    calendarCheck: 'CalendarCheck',
    lock: 'Lock',
    unlock: 'Unlock',
    help: 'CircleHelp',
    wrench: 'Wrench',
    send: 'Send',
    chevronLeft: 'ChevronLeft',
    chevronDown: 'ChevronDown'
  };

  const FALLBACK_PATHS = {
    home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    planet: 'M19 12a7 7 0 1 1-7-7M20 4C14 1 0 15 4 19S24 9 20 4Z',
    route: 'M6 4a2 2 0 1 0 0 .1M6 6v6a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V8M18 5a2 2 0 1 0 0 .1M18 18v3M16 19h4',
    book: 'M12 5v16M12 5C9 2 4 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-2-10 1Z',
    arrow: 'M19 12H5m6-6-6 6 6 6',
    key: 'M15 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12ZM10 13l-7 7m0-4v4h4M16 7h.01',
    motion: 'M3 8h4M1 12h4M3 16h4M14 3a9 9 0 1 1-4 17M14 7v5l3 2',
    info: 'M12 11v6M12 7h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z',
    menu: 'M4 6h16M4 12h16M4 18h16',
    close: 'm6 6 12 12M6 18 18 6',
    play: 'm8 4 13 8-13 8Z',
    check: 'm5 12 4 4L19 6',
    spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z',
    sparkles: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z',
    wand: 'm21 3-9 9M15 4V2m0 14v-2M8 9H6m14 0h-2M4 20l9-9',
    trophy: 'M7 3h10v6a5 5 0 0 1-10 0V3ZM7 5H3v3a4 4 0 0 0 4 4M17 5h4v3a4 4 0 0 1-4 4M12 14v7m-4 0h8',
    crown: 'M2 6l4.5 4.5L12 4l5.5 6.5L22 6l-2.5 11h-15L2 6ZM5 21h14',
    star: 'm12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z',
    users: 'M9 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM2 21v-3a7 7 0 0 1 14 0v3M16 4a4 4 0 0 1 0 8m3 2a6 6 0 0 1 3 5v2',
    clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM12 6v6l4 2',
    upload: 'M12 16V3m-5 5 5-5 5 5M3 15v6h18v-6',
    file: 'M14 2H4v20h16V8l-6-6ZM14 2v6h6M8 13h8M8 17h5',
    folder: 'M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z',
    spreadsheet: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM8 13h8M8 17h8M12 13v8',
    presentation: 'M2 3h20M4 3v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3M12 16v5m-4 0h8',
    image: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5ZM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM21 15l-5-5L5 21',
    trash: 'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
    chart: 'M4 3v18h17M8 16v-5m5 5V7m5 9V4',
    shield: 'M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6L12 2Zm-5 10 3 3 7-7',
    edit: 'm16 3 5 5-12 12-6 1 1-6L16 3Zm-2 2 5 5',
    search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6',
    download: 'M12 3v13m-5-5 5 5 5-5M3 16v5h18v-5',
    flame: 'M12 2c2 3 5 5 5 10a5 5 0 1 1-10 0c0-2.5 1.5-4.5 2.5-6 0 2 1.5 3 2.5 3 0-3-1-5 0-7Z',
    award: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM8.21 13.89 7 23l5-3 5 3-1.21-9.12',
    target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-6a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-3a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
    layers: 'm12 2 10 5-10 5L2 7l10-5Zm0 15 10-5M2 17l10 5 10-5M2 12l10 5 10-5',
    eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    copy: 'M9 9h11v11H9zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
    plus: 'M12 5v14M5 12h14',
    checkCircle: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm-3-10 2 2 4-4',
    alert: 'm21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3ZM12 9v4m0 4h.01',
    zap: 'M13 2 3 14h9l-1 8 10-12h-9l1-8Z',
    bot: 'M12 8V4H8M4 8h16v12H4zM9 14v.01M15 14v.01',
    lock: 'M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z'
  };

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function attrsStr(obj) {
    return Object.entries(obj)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
      .join(' ');
  }

  function icon(name, options = {}) {
    const key = ICON_MAP[name] || name;
    const size = options.size || 20;
    const strokeWidth = options.strokeWidth || 1.5;
    const cls = options.className ? ` ${options.className}` : '';
    const styleAttr = options.style ? ` style="${escapeHtml(options.style)}"` : '';
    const data = typeof window !== 'undefined' && window.lucide ? window.lucide[key] : null;
    if (Array.isArray(data) && data[1] && Array.isArray(data[2])) {
      const merged = {
        ...data[1],
        width: size,
        height: size,
        'stroke-width': strokeWidth,
        'aria-hidden': 'true'
      };
      if (cls) merged.class = merged.class ? `${merged.class}${cls}` : cls.trim();
      const children = data[2].map(([tag, a]) => `<${tag} ${attrsStr(a)}/>`).join('');
      return `<svg ${attrsStr(merged)}${styleAttr}>${children}</svg>`;
    }
    const path = FALLBACK_PATHS[name] || FALLBACK_PATHS.spark;
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${cls ? ` class="${escapeHtml(cls.trim())}"` : ''}${styleAttr}><path d="${path}"/></svg>`;
  }

  function iconBox(name, options = {}) {
    const size = options.size || 'md'; // sm | md | lg
    const tone = options.tone || 'violet'; // violet | cyan | muted | danger
    const tiltClass = options.tilted ? ' is-tilted' : '';
    const extraClass = options.className ? ` ${escapeHtml(options.className)}` : '';
    const svgSize = options.svgSize || (size === 'lg' ? 28 : size === 'sm' ? 16 : 21);
    return `<span class="scorear-icon-box size-${escapeHtml(size)} tone-${escapeHtml(tone)}${tiltClass}${extraClass}" aria-hidden="true">${icon(name, { size: svgSize, strokeWidth: options.strokeWidth || 1.45 })}</span>`;
  }

  function orbShowcase(name, options = {}) {
    const tone = options.tone || 'violet'; // violet | cyan
    const compact = options.compact ? ' is-compact' : '';
    const svgSize = options.svgSize || (options.compact ? 25 : 34);
    return `<div class="scorear-orb-display tone-${escapeHtml(tone)}${compact}" aria-hidden="true">
      <span class="orb-ring r1"></span>
      <span class="orb-ring r2"></span>
      <span class="orb-ring r3"></span>
      <div class="scorear-orb-core">${icon(name, { size: svgSize, strokeWidth: 1.35 })}</div>
      <span class="orb-star s1">&#10022;</span>
      <span class="orb-star s2">&#10022;</span>
    </div>`;
  }

  function cosmicBackdrop() {
    return '<div class="aurora" aria-hidden="true"><span></span><span></span><span></span></div><div class="hero-grid" aria-hidden="true"></div>';
  }

  function getFileMeta(filename, explicitExt) {
    const raw = (explicitExt || String(filename || '').split('.').pop() || '').toLowerCase().trim();
    if (raw === 'xlsx' || raw === 'xls' || raw === 'csv') {
      return { icon: 'spreadsheet', extLabel: raw.toUpperCase(), tone: 'cyan' };
    }
    if (raw === 'pptx' || raw === 'ppt') {
      return { icon: 'presentation', extLabel: 'PPTX', tone: 'violet' };
    }
    if (raw === 'png' || raw === 'jpg' || raw === 'jpeg' || raw === 'webp' || raw === 'gif') {
      return { icon: 'image', extLabel: 'IMG', tone: 'violet' };
    }
    if (raw === 'doc' || raw === 'docx') {
      return { icon: 'file', extLabel: 'DOCX', tone: 'violet' };
    }
    if (raw === 'pdf') {
      return { icon: 'file', extLabel: 'PDF', tone: 'violet' };
    }
    return { icon: 'file', extLabel: raw ? raw.toUpperCase().slice(0, 4) : 'TXT', tone: 'violet' };
  }

  function fileIconBox(filename, options = {}) {
    const meta = getFileMeta(filename, options.ext);
    const size = options.size || 'md';
    return `<div class="scorear-file-badge">${iconBox(meta.icon, { size, tone: meta.tone })}<span class="scorear-file-ext-pill">${escapeHtml(meta.extLabel)}</span></div>`;
  }

  window.ScoreARUI = {
    ICON_MAP,
    icon,
    iconBox,
    orbShowcase,
    cosmicBackdrop,
    getFileMeta,
    fileIconBox,
    escapeHtml
  };
})();
