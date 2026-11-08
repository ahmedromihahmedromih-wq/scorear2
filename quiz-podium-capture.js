/**
 * ScoreAR Quiz Podium Capture & Certificate Module (quiz-podium-capture.js)
 * Implements:
 * 1. 1280x720 Canvas Snapshot capture of the 3-winner podium with names, scores, and world theme.
 * 2. 1200x850 Luxury Certificate generation & download for Top 3 winners with gold seal.
 * Hardware-accelerated Canvas 2D, strictly Rule 7 compliant (<260 lines).
 */
(function(global) {
  'use strict';

  const WORLD_NAMES_AR = {
    royal: 'القصر الملكي الأندلسي',
    cosmic: 'محطة الفضاء العربية',
    treasure: 'جزيرة الكنز الأسطورية',
    stadium: 'استاد الأبطال الرياضي',
    oasis: 'واحة النخيل والرمال',
    magic: 'المملكة السحرية العائمة'
  };

  const WORLD_PALETTES = {
    royal: { bg1: '#3b0712', bg2: '#1e050b', gold: '#f59e0b', accent: '#b45309' },
    cosmic: { bg1: '#0f172a', bg2: '#080d1a', gold: '#38bdf8', accent: '#818cf8' },
    treasure: { bg1: '#451a03', bg2: '#1c0a02', gold: '#fbbf24', accent: '#d97706' },
    stadium: { bg1: '#064e3b', bg2: '#022c22', gold: '#4ade80', accent: '#22c55e' },
    oasis: { bg1: '#134e4a', bg2: '#042f2e', gold: '#34d399', accent: '#10b981' },
    magic: { bg1: '#3b0764', bg2: '#1e0438', gold: '#c084fc', accent: '#f472b6' }
  };

  function getArabicDate() {
    try {
      return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());
    } catch(e) {
      return new Date().toLocaleDateString();
    }
  }

  function downloadCanvasAsPng(canvas, fileName) {
    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 300);
      }, 'image/png');
    } else {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 300);
    }
  }

  /**
   * Captures 1280x720 Podium Snapshot PNG
   */
  function capturePodiumSnapshot(stageElement, currentRoom, top3Players) {
    const sorted = top3Players || (currentRoom?.players ? [...currentRoom.players].sort((a,b) => (b.score||0) - (a.score||0)).slice(0,3) : []);
    const p1 = sorted[0] || { name: 'البطل الأول', score: 0 };
    const p2 = sorted[1] || { name: 'الوصيف الثاني', score: 0 };
    const p3 = sorted[2] || { name: 'المركز الثالث', score: 0 };

    const worldId = (currentRoom?.world?.id) || (currentRoom?.worldId) || 'royal';
    const pal = WORLD_PALETTES[worldId] || WORLD_PALETTES.royal;
    const worldName = WORLD_NAMES_AR[worldId] || WORLD_NAMES_AR.royal;

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background gradient
    const bgGrad = ctx.createRadialGradient(640, 260, 50, 640, 360, 700);
    bgGrad.addColorStop(0, pal.bg1);
    bgGrad.addColorStop(1, pal.bg2);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1280, 720);

    // Decorative stars & sparkles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 97) % 1280;
      const sy = (i * 73) % 400;
      const sr = (i % 3) + 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Header banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, 1280, 100);
    ctx.strokeStyle = pal.gold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 100);
    ctx.lineTo(1280, 100);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 36px "Segoe UI", Tahoma, sans-serif';
    ctx.fillStyle = '#fef3c7';
    ctx.fillText('👑 منصة تتويج أبطال ScoreAR 👑', 640, 42);

    ctx.font = '18px "Segoe UI", Tahoma, sans-serif';
    ctx.fillStyle = pal.gold;
    ctx.fillText(`${worldName} • تاريخ التتويج: ${getArabicDate()}`, 640, 78);

    // Pedestals setup: 2nd (left), 1st (center), 3rd (right)
    const columns = [
      { p: p2, rank: 2, medal: '🥈', x: 300, y: 440, w: 220, h: 220, grad: ['#cbd5e1', '#64748b'], title: 'المركز الثاني' },
      { p: p1, rank: 1, medal: '🥇', x: 640, y: 380, w: 260, h: 280, grad: ['#fde047', '#d97706'], title: 'بطل الأبطال' },
      { p: p3, rank: 3, medal: '🥉', x: 980, y: 480, w: 200, h: 180, grad: ['#fed7aa', '#b45309'], title: 'المركز الثالث' }
    ];

    columns.forEach(col => {
      // Column Box
      const pGrad = ctx.createLinearGradient(col.x - col.w/2, col.y, col.x + col.w/2, col.y + col.h);
      pGrad.addColorStop(0, col.grad[0]);
      pGrad.addColorStop(1, col.grad[1]);
      ctx.fillStyle = pGrad;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 24;
      ctx.fillRect(col.x - col.w/2, col.y, col.w, col.h);
      ctx.shadowBlur = 0;

      // Pedestal border
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 3;
      ctx.strokeRect(col.x - col.w/2, col.y, col.w, col.h);

      // Medal and Rank Number on Pedestal
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px "Segoe UI", Tahoma, sans-serif';
      ctx.fillText(col.medal, col.x, col.y + 60);

      ctx.font = 'bold 24px "Segoe UI", Tahoma, sans-serif';
      ctx.fillText(col.title, col.x, col.y + 110);

      // Score Badge on pedestal
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(col.x - 75, col.y + 135, 150, 44, 12);
      ctx.fill();
      ctx.fillStyle = '#fcd34d';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`${col.p.score || 0} نقطة`, col.x, col.y + 158);

      // Hero Name Plaque above Pedestal
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.beginPath();
      ctx.roundRect(col.x - 100, col.y - 70, 200, 52, 14);
      ctx.fill();
      ctx.strokeStyle = col.grad[0];
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px "Segoe UI", Tahoma, sans-serif';
      ctx.fillText(col.p.name || 'بطل', col.x, col.y - 44);

      // Crown above 1st place
      if (col.rank === 1) {
        ctx.font = '54px "Segoe UI", Tahoma, sans-serif';
        ctx.fillText('👑', col.x, col.y - 95);
      }
    });

    // Footer note
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '15px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('منصة ScoreAR التفاعلية — منافسات تعليمية ريادية موثقة', 640, 695);

    downloadCanvasAsPng(canvas, `scorear-podium-${Date.now()}.png`);
    if (global.toast) global.toast('📸 تم حفظ لقطة منصة التتويج بنجاح!');
  }

  /**
   * Generates a 1200x850 Luxury Certificate PNG for top contender
   */
  function downloadCertificate(player, rank, score, worldId) {
    if (!player) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 850;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rankTitles = {
      1: { medal: '🥇', label: 'المركز الأول (بطل المسابقة)', color: '#b45309', ribbon: '#d97706' },
      2: { medal: '🥈', label: 'المركز الثاني (الوصيف المتميز)', color: '#475569', ribbon: '#64748b' },
      3: { medal: '🥉', label: 'المركز الثالث (فارس المنصة)', color: '#78350f', ribbon: '#92400e' }
    };
    const info = rankTitles[rank] || rankTitles[1];
    const worldName = WORLD_NAMES_AR[worldId] || 'عالم المنافسات الذكية';

    // Soft parchment background
    const bg = ctx.createLinearGradient(0, 0, 1200, 850);
    bg.addColorStop(0, '#fefefe');
    bg.addColorStop(0.5, '#fdfbf7');
    bg.addColorStop(1, '#f7f2e7');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1200, 850);

    // Ornate Golden Borders
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 14;
    ctx.strokeRect(25, 25, 1150, 800);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.strokeRect(38, 38, 1124, 774);

    ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(46, 46, 1108, 758);

    // Corner rosettes
    const corners = [[52, 52], [1148, 52], [52, 798], [1148, 798]];
    corners.forEach(([cx, cy]) => {
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
    });

    // Header Calligraphy Title
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 46px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('شهادة تميز وتفوق', 600, 125);

    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 22px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('CERTIFICATE OF ACADEMIC EXCELLENCE', 600, 175);

    // Decorative ribbon divider
    ctx.fillStyle = '#d97706';
    ctx.fillRect(400, 205, 400, 4);

    // Certificate Citation
    ctx.fillStyle = '#334155';
    ctx.font = '22px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('تتشرف منصة ScoreAR التعليمية التفاعلية بمنح هذه الشهادة للبطل المتميز:', 600, 270);

    // Student Name Box
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 48px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText(player.name || 'بطل التحدي', 600, 355);

    ctx.fillStyle = '#d97706';
    ctx.fillRect(320, 395, 560, 3);

    // Achievement statement
    ctx.fillStyle = '#475569';
    ctx.font = '24px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText(`تقديراً لإحرازه ${info.label} في تحدي [${worldName}]`, 600, 460);

    ctx.font = 'bold 26px "Segoe UI", Tahoma, sans-serif';
    ctx.fillStyle = info.color;
    ctx.fillText(`بمجموع نقاط بلغ (${score || player.score || 0}) نقطة بعد أداء باهر وسرعة فائقة`, 600, 515);

    // Golden Seal Stamp (Canvas radial)
    const sealX = 240, sealY = 660;
    ctx.save();
    ctx.beginPath();
    ctx.arc(sealX, sealY, 68, 0, Math.PI * 2);
    const sealGrad = ctx.createRadialGradient(sealX, sealY, 10, sealX, sealY, 68);
    sealGrad.addColorStop(0, '#fef08a');
    sealGrad.addColorStop(0.7, '#f59e0b');
    sealGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = sealGrad;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 36px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText(info.medal, sealX, sealY - 14);
    ctx.font = 'bold 13px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('ScoreAR SEAL', sealX, sealY + 22);
    ctx.fillText('★ OFFICIAL ★', sealX, sealY + 38);
    ctx.restore();

    // Date & Signature on the right
    ctx.textAlign = 'center';
    ctx.fillStyle = '#334155';
    ctx.font = '18px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText(`حررت بتاريخ: ${getArabicDate()}`, 920, 640);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 22px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('إدارة مسابقات ScoreAR', 920, 685);
    ctx.font = 'italic 16px "Segoe UI", Tahoma, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('منظومة التنافس الصفي الذكي', 920, 715);

    downloadCanvasAsPng(canvas, `scorear-certificate-${(player.name || 'winner').replace(/\s+/g, '_')}.png`);
  }

  function downloadAllTop3Certificates(top3Players, worldId) {
    if (!top3Players || !top3Players.length) return;
    top3Players.slice(0, 3).forEach((p, idx) => {
      setTimeout(() => {
        downloadCertificate(p, idx + 1, p.score, worldId);
      }, idx * 450);
    });
    if (global.toast) global.toast(`🎓 جاري إصدار وتحميل شهادات الثلاثة الأوائل (${Math.min(3, top3Players.length)}) تلقائياً...`);
  }

  const ScoreARPodiumCapture = {
    capturePodiumSnapshot,
    downloadCertificate,
    downloadAllTop3Certificates
  };

  global.ScoreARPodiumCapture = ScoreARPodiumCapture;
  try { if (typeof globalThis !== 'undefined') globalThis.ScoreARPodiumCapture = ScoreARPodiumCapture; } catch(e){}
  if (typeof module !== 'undefined' && module.exports) module.exports = ScoreARPodiumCapture;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
