/**
 * ScoreAR Quiz Podium Capture & Certificate Module (quiz-podium-capture.js)
 * Implements:
 * 1. 1280x720 Canvas Snapshot capture of the 3-winner podium with names, scores, and world theme.
 * 2. 1200x850 Luxury Certificate generation & download for Top 3 winners with gold seal.
 * Hardware-accelerated Canvas 2D, strictly Rule 7 compliant (<350 lines).
 */
(function(global) {
  'use strict';

  const WORLD_NAMES_AR = {
    royal: 'القصر الملكي الأندلسي', cosmic: 'محطة الفضاء العربية', treasure: 'جزيرة الكنز الأسطورية',
    stadium: 'استاد الأبطال الرياضي', oasis: 'واحة النخيل والرمال', magic: 'المملكة السحرية العائمة'
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
        const url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = fileName; document.body.appendChild(a); a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 300);
      }, 'image/png');
    } else {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png'); a.download = fileName;
      document.body.appendChild(a); a.click();
      setTimeout(() => document.body.removeChild(a), 300);
    }
  }

  function loadImg(src) {
    return new Promise((resolve) => {
      if (!src || typeof Image === 'undefined') return resolve(null);
      try {
        const img = new Image(); img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => {
          try {
            const alt = src.includes('_full.webp') ? src.replace('_full.webp', '-idle.webp').replace('assets/characters/', 'assets/characters/animated/') : null;
            if (alt) {
              const fallback = new Image(); fallback.crossOrigin = 'anonymous';
              fallback.onload = () => resolve(fallback); fallback.onerror = () => resolve(null);
              fallback.src = alt;
            } else { resolve(null); }
          } catch(e) { resolve(null); }
        };
        img.src = src;
        if (img.complete && img.naturalWidth > 0) resolve(img);
      } catch(e) { resolve(null); }
    });
  }

  function getCharFullSrc(player) {
    const raw = player?.avatarId || player?.avatar || 'char_01';
    const num = Math.max(1, Math.min(20, parseInt(String(raw).replace(/\D/g, '') || '1', 10)));
    return `assets/characters/char_${String(num).padStart(2, '0')}_full.webp`;
  }

  /**
   * Captures 1280x720 Podium Snapshot PNG including all 3 Hero characters
   */
  async function capturePodiumSnapshot(stageElement, currentRoom, top3Players) {
    const sorted = top3Players || (currentRoom?.players ? [...currentRoom.players].sort((a,b) => (b.score||0) - (a.score||0)).slice(0,3) : []);
    const p1 = sorted[0] || { name: 'البطل الأول', score: 0, avatarId: 'char_01' };
    const p2 = sorted[1] || { name: 'الوصيف الثاني', score: 0, avatarId: 'char_02' };
    const p3 = sorted[2] || { name: 'المركز الثالث', score: 0, avatarId: 'char_03' };

    const worldId = (currentRoom?.world?.id) || (currentRoom?.worldId) || 'royal';
    const pal = WORLD_PALETTES[worldId] || WORLD_PALETTES.royal;
    const worldName = WORLD_NAMES_AR[worldId] || WORLD_NAMES_AR.royal;

    const [bgImg, img2, img1, img3] = await Promise.all([
      loadImg(`assets/worlds/${worldId}/podium.jpg`),
      loadImg(getCharFullSrc(p2)),
      loadImg(getCharFullSrc(p1)),
      loadImg(getCharFullSrc(p3))
    ]);

    const canvas = document.createElement('canvas');
    canvas.width = 1280; canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background: photo if available + vignette gradient
    if (bgImg && typeof ctx.drawImage === 'function') {
      ctx.drawImage(bgImg, 0, 0, 1280, 720);
      const overlay = ctx.createLinearGradient(0, 0, 0, 720);
      overlay.addColorStop(0, 'rgba(12,13,30,0.55)'); overlay.addColorStop(0.5, 'rgba(12,13,30,0.3)'); overlay.addColorStop(1, 'rgba(12,13,30,0.85)');
      ctx.fillStyle = overlay; ctx.fillRect(0, 0, 1280, 720);
    } else {
      const bgGrad = ctx.createRadialGradient(640, 260, 50, 640, 360, 700);
      bgGrad.addColorStop(0, pal.bg1); bgGrad.addColorStop(1, pal.bg2);
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, 1280, 720);
    }

    // Sparkles & stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 97) % 1280, sy = (i * 73) % 400, sr = (i % 3) + 1.5;
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    }

    // Pedestals configuration
    const columns = [
      { p: p2, rank: 2, medal: '🥈', x: 300, y: 440, w: 220, h: 220, grad: ['#cbd5e1', '#475569'], title: 'المركز الثاني', img: img2, charW: 160, charH: 215 },
      { p: p1, rank: 1, medal: '🥇', x: 640, y: 380, w: 260, h: 280, grad: ['#fde047', '#b45309'], title: 'بطل الأبطال', img: img1, charW: 185, charH: 245 },
      { p: p3, rank: 3, medal: '🥉', x: 980, y: 480, w: 200, h: 180, grad: ['#fed7aa', '#78350f'], title: 'المركز الثالث', img: img3, charW: 145, charH: 195 }
    ];

    // Stage spotlights from bottom
    columns.forEach(col => {
      ctx.save();
      const spotGrad = ctx.createRadialGradient(col.x, col.y + col.h, 20, col.x, col.y - 120, 240);
      spotGrad.addColorStop(0, 'rgba(255,255,255,0.18)'); spotGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spotGrad; ctx.beginPath();
      ctx.moveTo(col.x - col.w * 0.7, col.y + col.h); ctx.lineTo(col.x - col.w * 0.4, col.y - 160);
      ctx.lineTo(col.x + col.w * 0.4, col.y - 160); ctx.lineTo(col.x + col.w * 0.7, col.y + col.h);
      if (ctx.closePath) ctx.closePath(); ctx.fill(); ctx.restore();
    });

    // Draw Pedestal Blocks & Heroes
    columns.forEach(col => {
      const pGrad = ctx.createLinearGradient(col.x - col.w/2, col.y, col.x + col.w/2, col.y + col.h);
      pGrad.addColorStop(0, col.grad[0]); pGrad.addColorStop(1, col.grad[1]);
      ctx.fillStyle = pGrad; ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 28;
      ctx.fillRect(col.x - col.w/2, col.y, col.w, col.h); ctx.shadowBlur = 0;

      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
      ctx.strokeRect(col.x - col.w/2, col.y, col.w, col.h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(col.x - col.w/2, col.y, col.w, 8);

      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 38px "Segoe UI", Tahoma, sans-serif'; ctx.fillText(col.medal, col.x, col.y + 55);
      ctx.font = 'bold 22px "Segoe UI", Tahoma, sans-serif'; ctx.fillText(col.title, col.x, col.y + 100);

      // Score Badge on pedestal
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'; ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(col.x - 75, col.y + 128, 150, 42, 12); else ctx.rect(col.x - 75, col.y + 128, 150, 42);
      ctx.fill(); ctx.strokeStyle = col.grad[0]; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#fcd34d'; ctx.font = 'bold 20px monospace';
      ctx.fillText(`${col.p.score || 0} نقطة`, col.x, col.y + 149);

      // Hero glow at pedestal top
      ctx.save(); ctx.beginPath();
      ctx.ellipse(col.x, col.y - 2, col.charW * 0.42, 12, 0, 0, Math.PI * 2);
      ctx.fillStyle = col.rank === 1 ? 'rgba(254,240,138,0.55)' : 'rgba(255,255,255,0.4)';
      ctx.fill(); ctx.restore();

      // Draw Hero Character Image
      if (col.img && typeof ctx.drawImage === 'function') {
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 18;
        const drawX = col.x - (col.charW / 2), drawY = col.y - col.charH + 6;
        ctx.drawImage(col.img, drawX, drawY, col.charW, col.charH);
        ctx.restore();
      }

      // Hero Name Plaque
      ctx.save(); ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'; ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(col.x - 90, col.y - 32, 180, 42, 12); else ctx.rect(col.x - 90, col.y - 32, 180, 42);
      ctx.fill(); ctx.strokeStyle = col.grad[0]; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px "Segoe UI", Tahoma, sans-serif';
      ctx.fillText(col.p.name || 'بطل', col.x, col.y - 11); ctx.restore();

      // Crown over 1st place
      if (col.rank === 1) {
        ctx.save(); ctx.font = '52px "Segoe UI", Tahoma, sans-serif';
        ctx.shadowColor = 'rgba(253, 224, 71, 0.8)'; ctx.shadowBlur = 20;
        ctx.fillText('👑', col.x, col.y - col.charH - 18); ctx.restore();
      }
    });

    // Header banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'; ctx.fillRect(0, 0, 1280, 95);
    ctx.strokeStyle = pal.gold; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(0, 95); ctx.lineTo(1280, 95); ctx.stroke();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 34px "Segoe UI", Tahoma, sans-serif'; ctx.fillText('👑 منصة تتويج أبطال ScoreAR 👑', 640, 40);
    ctx.font = '17px "Segoe UI", Tahoma, sans-serif'; ctx.fillStyle = pal.gold;
    ctx.fillText(`${worldName} • تاريخ التتويج: ${getArabicDate()}`, 640, 74);

    // Footer note
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; ctx.font = '15px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('منصة ScoreAR التفاعلية — منافسات تعليمية ريادية موثقة', 640, 695);

    downloadCanvasAsPng(canvas, `scorear-podium-${Date.now()}.png`);
    if (global.toast) global.toast('📸 تم حفظ لقطة منصة التتويج متضمنة صور الأبطال بنجاح!');
  }

  /**
   * Generates a 1200x850 Luxury Certificate PNG for top contender
   */
  function downloadCertificate(player, rank, score, worldId) {
    if (!player) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 850;
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
    bg.addColorStop(0, '#fefefe'); bg.addColorStop(0.5, '#fdfbf7'); bg.addColorStop(1, '#f7f2e7');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1200, 850);

    // Ornate Golden Borders
    ctx.strokeStyle = '#d97706'; ctx.lineWidth = 14; ctx.strokeRect(25, 25, 1150, 800);
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.strokeRect(38, 38, 1124, 774);
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)'; ctx.lineWidth = 1.5; ctx.strokeRect(46, 46, 1108, 758);

    // Corner rosettes
    const corners = [[52, 52], [1148, 52], [52, 798], [1148, 798]];
    corners.forEach(([cx, cy]) => {
      ctx.fillStyle = '#d97706'; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
    });

    // Header Calligraphy Title
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#78350f'; ctx.font = 'bold 46px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('شهادة تميز وتفوق', 600, 125);
    ctx.fillStyle = '#b45309'; ctx.font = 'bold 22px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('CERTIFICATE OF ACADEMIC EXCELLENCE', 600, 175);

    // Decorative ribbon divider
    ctx.fillStyle = '#d97706'; ctx.fillRect(400, 205, 400, 4);

    // Certificate Citation
    ctx.fillStyle = '#334155'; ctx.font = '22px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('تتشرف منصة ScoreAR التعليمية التفاعلية بمنح هذه الشهادة للبطل المتميز:', 600, 270);

    // Student Name Box
    ctx.fillStyle = '#1e293b'; ctx.font = 'bold 48px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText(player.name || 'بطل التحدي', 600, 355);
    ctx.fillStyle = '#d97706'; ctx.fillRect(320, 395, 560, 3);

    // Achievement statement
    ctx.fillStyle = '#475569'; ctx.font = '24px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText(`تقديراً لإحرازه ${info.label} في تحدي [${worldName}]`, 600, 460);
    ctx.font = 'bold 26px "Segoe UI", Tahoma, sans-serif'; ctx.fillStyle = info.color;
    ctx.fillText(`بمجموع نقاط بلغ (${score || player.score || 0}) نقطة بعد أداء باهر وسرعة فائقة`, 600, 515);

    // Golden Seal Stamp (Canvas radial)
    const sealX = 240, sealY = 660;
    ctx.save(); ctx.beginPath(); ctx.arc(sealX, sealY, 68, 0, Math.PI * 2);
    const sealGrad = ctx.createRadialGradient(sealX, sealY, 10, sealX, sealY, 68);
    sealGrad.addColorStop(0, '#fef08a'); sealGrad.addColorStop(0.7, '#f59e0b'); sealGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = sealGrad; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#78350f'; ctx.font = 'bold 36px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText(info.medal, sealX, sealY - 14);
    ctx.font = 'bold 13px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('ScoreAR SEAL', sealX, sealY + 22); ctx.fillText('★ OFFICIAL ★', sealX, sealY + 38);
    ctx.restore();

    // Date & Signature on the right
    ctx.textAlign = 'center'; ctx.fillStyle = '#334155'; ctx.font = '18px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText(`حررت بتاريخ: ${getArabicDate()}`, 920, 640);
    ctx.fillStyle = '#1e293b'; ctx.font = 'bold 22px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('إدارة مسابقات ScoreAR', 920, 685);
    ctx.font = 'italic 16px "Segoe UI", Tahoma, sans-serif'; ctx.fillStyle = '#64748b';
    ctx.fillText('منظومة التنافس الصفي الذكي', 920, 715);

    downloadCanvasAsPng(canvas, `scorear-certificate-${(player.name || 'winner').replace(/\s+/g, '_')}.png`);
  }

  function downloadAllTop3Certificates(top3Players, worldId) {
    if (!top3Players || !top3Players.length) return;
    top3Players.slice(0, 3).forEach((p, idx) => {
      setTimeout(() => { downloadCertificate(p, idx + 1, p.score, worldId); }, idx * 450);
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
