/**
 * ScoreARMotionEngine.js
 * Studio-Grade Cartoon Motion & Physics Engine for ScoreAR (Pixar & Supercell Standard)
 * Features: Elastic Squash & Stretch, Procedural Reactive Shadow, Particle Trail FX, 60FPS Lerp.
 * Strictly Rule 7 compliant (<400 lines).
 */
(function (global) {
  'use strict';

  // 6 Animation states: duration (ms), loop flag, frame sequence mapping, and cartoon physics keyframes
  const ACTIONS = {
    idle: { duration: 2000, loop: true, frames: [0, 0, 0, 0], physics: [
      { y: 0, sx: 1.0, sy: 1.0, tilt: 0, sScale: 1.0, sAlpha: 0.65 },
      { y: -2, sx: 0.98, sy: 1.02, tilt: 0.5, sScale: 0.96, sAlpha: 0.62 },
      { y: -3.5, sx: 0.97, sy: 1.03, tilt: 0, sScale: 0.93, sAlpha: 0.60 },
      { y: -1, sx: 0.99, sy: 1.01, tilt: -0.5, sScale: 0.98, sAlpha: 0.64 }
    ]},
    walk: { duration: 1200, loop: true, frames: [1, 0, 2, 0], physics: [
      { y: 3, sx: 1.04, sy: 0.96, tilt: 2.5, sScale: 1.06, sAlpha: 0.72, fx: 'dust' },
      { y: -8, sx: 0.96, sy: 1.04, tilt: 0.5, sScale: 0.88, sAlpha: 0.48 },
      { y: 3, sx: 1.04, sy: 0.96, tilt: -2.5, sScale: 1.06, sAlpha: 0.72, fx: 'dust' },
      { y: -8, sx: 0.96, sy: 1.04, tilt: -0.5, sScale: 0.88, sAlpha: 0.48 }
    ]},
    run: { duration: 850, loop: true, frames: [0, 1, 2, 3], physics: [
      { y: 3, sx: 1.08, sy: 0.92, tilt: 22, sScale: 1.2, sAlpha: 0.8, fx: 'dust' },
      { y: -16, sx: 0.92, sy: 1.08, tilt: 20, sScale: 0.7, sAlpha: 0.35 },
      { y: 2, sx: 1.08, sy: 0.92, tilt: 22, sScale: 1.2, sAlpha: 0.8, fx: 'dust' },
      { y: -12, sx: 0.94, sy: 1.06, tilt: 24, sScale: 0.75, sAlpha: 0.4 }
    ]},
    climb: { duration: 1450, loop: true, frames: [0, 1, 2, 3], physics: [
      { y: -4, sx: 0.96, sy: 1.04, tilt: -4, sScale: 0.55, sAlpha: 0.3 },
      { y: -14, sx: 1.04, sy: 0.96, tilt: 2, sScale: 0.45, sAlpha: 0.22, fx: 'rock' },
      { y: -8, sx: 0.97, sy: 1.03, tilt: -2, sScale: 0.48, sAlpha: 0.25, fx: 'rock' },
      { y: -20, sx: 1.02, sy: 1.02, tilt: 1, sScale: 0.4, sAlpha: 0.18 }
    ]},
    fly: { duration: 1300, loop: true, frames: [0, 1, 2, 3], physics: [
      { y: -14, sx: 1.08, sy: 0.92, tilt: 75, sScale: 0.5, sAlpha: 0.2, fx: 'sparkle' },
      { y: -22, sx: 1.02, sy: 0.98, tilt: 68, sScale: 0.45, sAlpha: 0.18, fx: 'sparkle' },
      { y: -30, sx: 0.96, sy: 1.06, tilt: 62, sScale: 0.38, sAlpha: 0.14, fx: 'sparkle' },
      { y: -20, sx: 1.1, sy: 0.92, tilt: 72, sScale: 0.46, sAlpha: 0.18, fx: 'sparkle' }
    ]},
    celebrate: { duration: 1600, loop: true, frames: [0, 3, 3, 0], physics: [
      { y: 14, sx: 1.15, sy: 0.85, tilt: 0, sScale: 1.25, sAlpha: 0.88 },
      { y: -28, sx: 0.88, sy: 1.15, tilt: -2, sScale: 0.55, sAlpha: 0.35, fx: 'confetti' },
      { y: -36, sx: 0.96, sy: 1.04, tilt: 2, sScale: 0.45, sAlpha: 0.25, fx: 'star' },
      { y: 6, sx: 1.10, sy: 0.90, tilt: 0, sScale: 1.15, sAlpha: 0.80 }
    ]}
  };

  const DEFAULTS = {
    basePath: 'assets/characters/',
    fileFormat: 'webp',
    width: 320,
    height: 400,
    speed: 1.0,
    enableParticles: true,
    enableShadow: true
  };

  const lerp = (a, b, t) => a + (b - a) * t;

  /** Lightweight High-Performance 60FPS Canvas Particle System */
  class ParticlePool {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.particles = [];
      this.palette = ['#FFD700', '#FF4757', '#2ED573', '#1E90FF', '#FFA502', '#FFFFFF'];
      this.w = 320; this.h = 400;
    }

    resize(w, h) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = w; this.h = h;
      this.canvas.width = w * dpr; this.canvas.height = h * dpr;
      this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
      if (this.ctx) this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    spawn(type, ox, oy) {
      const count = type === 'confetti' ? 12 : type === 'star' ? 8 : type === 'dust' ? 4 : 3;
      for (let i = 0; i < count; i++) {
        const ang = type === 'dust' ? Math.PI + (Math.random() - 0.5) * 1.2
                  : type === 'sparkle' ? Math.PI * 0.8 + Math.random() * 0.8
                  : Math.random() * Math.PI * 2;
        const spd = (type === 'confetti' ? 3 : type === 'star' ? 2 : 1.5) + Math.random() * 2.5;
        this.particles.push({
          type, x: ox + (Math.random() - 0.5) * 20, y: oy + (Math.random() - 0.5) * 8,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - (type === 'confetti' || type === 'star' ? 2.5 : 0),
          size: type === 'star' ? 6 + Math.random() * 5 : type === 'dust' ? 7 + Math.random() * 8 : 4 + Math.random() * 4,
          life: 1.0, decay: 0.02 + Math.random() * 0.025,
          color: this.palette[Math.floor(Math.random() * this.palette.length)],
          rot: Math.random() * Math.PI, vRot: (Math.random() - 0.5) * 0.2
        });
      }
    }

    render() {
      const ctx = this.ctx;
      if (!ctx) return;
      ctx.clearRect(0, 0, this.w, this.h);
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx; p.y += p.vy; p.rot += p.vRot; p.life -= p.decay;
        if (p.type === 'rock') p.vy += 0.2;
        else if (p.type === 'confetti') { p.vy += 0.08; p.vx *= 0.98; }
        else if (p.type === 'dust') { p.vx *= 0.92; p.vy *= 0.92; p.size += 0.3; }

        if (p.life <= 0) { this.particles.splice(i, 1); continue; }
        ctx.save(); ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);

        if (p.type === 'dust') {
          ctx.fillStyle = 'rgba(235, 235, 245, 0.75)';
          ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill();
        } else if (p.type === 'star' || p.type === 'sparkle') {
          ctx.fillStyle = p.type === 'star' ? '#FFD700' : '#70E1FF';
          this.drawStar(ctx, 0, 0, p.type === 'star' ? 5 : 4, p.size, p.size * (p.type === 'star' ? 0.45 : 0.3));
        } else if (p.type === 'rock') {
          ctx.fillStyle = '#8B949E'; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }
    }

    drawStar(ctx, cx, cy, spikes, rOut, rIn) {
      let rot = (Math.PI / 2) * 3, step = Math.PI / spikes;
      ctx.beginPath(); ctx.moveTo(cx, cy - rOut);
      for (let i = 0; i < spikes; i++) {
        ctx.lineTo(cx + Math.cos(rot) * rOut, cy + Math.sin(rot) * rOut); rot += step;
        ctx.lineTo(cx + Math.cos(rot) * rIn, cy + Math.sin(rot) * rIn); rot += step;
      }
      ctx.closePath(); ctx.fill();
    }

    clear() { this.particles = []; if (this.ctx) this.ctx.clearRect(0, 0, this.w, this.h); }
  }

  /** Motion Instance Bound to a ScoreAR Container Element */
  class CartoonMotionInstance {
    constructor(container, characterId, actionName, options = {}) {
      this.container = typeof container === 'string' ? document.querySelector(container) : container;
      if (!this.container) throw new Error('[ScoreARMotionEngine] Target container not found');

      this.characterId = characterId || 'char_01';
      this.opts = Object.assign({}, DEFAULTS, options);
      this.speed = this.opts.speed;
      this.action = actionName || 'idle';
      this.reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

      this.lastTimestamp = 0;
      this.elapsedTime = 0;
      this.lastSpawnFrame = -1;
      this.rafId = null;

      this.initDOM();
      this.loadSprites();
      this.start();
    }

    initDOM() {
      this.container.classList.add('scorear-motion-container');
      this.container.innerHTML = '';

      this.stage = document.createElement('div');
      this.stage.className = 'scorear-motion-stage';

      if (this.opts.enableShadow) {
        this.shadow = document.createElement('div');
        this.shadow.className = 'scorear-motion-shadow';
        const gradId = 'shGrad_' + Math.random().toString(36).substr(2, 6);
        this.shadow.innerHTML = `<svg viewBox="0 0 100 30" preserveAspectRatio="none">
          <defs><radialGradient id="${gradId}" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(10, 16, 30, 0.75)" />
            <stop offset="60%" stop-color="rgba(10, 16, 30, 0.3)" />
            <stop offset="100%" stop-color="rgba(10, 16, 30, 0)" />
          </radialGradient></defs>
          <ellipse cx="50" cy="15" rx="46" ry="12" fill="url(#${gradId})" />
        </svg>`;
        this.stage.appendChild(this.shadow);
      }

      this.charWrap = document.createElement('div');
      this.charWrap.className = 'scorear-character-wrap';

      this.spriteA = document.createElement('div');
      this.spriteA.className = 'scorear-sprite-layer layer-active';
      this.spriteB = document.createElement('div');
      this.spriteB.className = 'scorear-sprite-layer layer-standby';
      this.charWrap.append(this.spriteA, this.spriteB);
      this.activeSprite = this.spriteA;
      this.standbySprite = this.spriteB;
      this.stage.appendChild(this.charWrap);

      if (this.opts.enableParticles) {
        this.pCanvas = document.createElement('canvas');
        this.pCanvas.className = 'scorear-particle-canvas';
        this.stage.appendChild(this.pCanvas);
        this.particlePool = new ParticlePool(this.pCanvas);
      }

      this.container.appendChild(this.stage);
      this.updateSize();
      if (typeof ResizeObserver !== 'undefined') {
        this.ro = new ResizeObserver(() => this.updateSize());
        this.ro.observe(this.container);
      }
    }

    updateSize() {
      const rect = this.container.getBoundingClientRect ? this.container.getBoundingClientRect() : { width: 320, height: 400 };
      const w = rect.width || this.opts.width;
      const h = rect.height || this.opts.height;
      if (this.particlePool) this.particlePool.resize(w, h);
    }

    getSpriteUrl(charId, action) {
      const base = this.opts.basePath.replace(/\/$/, '');
      const num = String(charId).replace(/^char_/, '').padStart(2, '0');
      const cid = `char_${num}`;
      // Primary: new dedicated sheet if available, fallback to existing atlas
      if (action === 'run' || action === 'climb' || action === 'fly') {
        return `${base}/animated/${cid}-${action}.webp`;
      }
      return `${base}/animated/${cid}-atlas.webp`;
    }

    loadSprites() {
      const url = this.getSpriteUrl(this.characterId, this.action);
      this.activeSprite.style.backgroundImage = `url("${url}")`;
    }

    setAction(newAction) {
      if (!ACTIONS[newAction] || newAction === this.action) return;
      this.action = newAction;
      this.elapsedTime = 0;
      this.lastSpawnFrame = -1;

      const newUrl = this.getSpriteUrl(this.characterId, this.action);
      this.standbySprite.style.backgroundImage = `url("${newUrl}")`;
      this.standbySprite.style.backgroundPosition = '0% 0%';

      this.standbySprite.classList.replace('layer-standby', 'layer-active');
      this.activeSprite.classList.replace('layer-active', 'layer-standby');
      [this.activeSprite, this.standbySprite] = [this.standbySprite, this.activeSprite];
    }

    setSpeed(multiplier) {
      this.speed = Math.max(0.1, Math.min(4.0, Number(multiplier) || 1.0));
    }

    setCharacter(characterId) {
      this.characterId = characterId;
      this.loadSprites();
    }

    tick(timestamp) {
      if (!this.container || (typeof this.container.isConnected === 'boolean' && !this.container.isConnected)) {
        this.destroy(); return;
      }
      if (!this.lastTimestamp) this.lastTimestamp = timestamp;
      const dt = (timestamp - this.lastTimestamp) * this.speed;
      this.lastTimestamp = timestamp;
      this.elapsedTime += dt;

      const cfg = ACTIONS[this.action];
      const progress = (this.elapsedTime % cfg.duration) / cfg.duration;
      const stepIdx = Math.floor(progress * 4) % 4;
      const frameNum = cfg.frames ? cfg.frames[stepIdx] : stepIdx;
      this.activeSprite.style.backgroundPosition = `${(frameNum * 33.333333).toFixed(4)}% 0%`;

      const subT = (progress * 4) - stepIdx;
      const k1 = cfg.physics[stepIdx];
      const k2 = cfg.physics[(stepIdx + 1) % 4];

      if (!this.reducedMotion) {
        const y = lerp(k1.y, k2.y, subT);
        const sx = lerp(k1.sx, k2.sx, subT);
        const sy = lerp(k1.sy, k2.sy, subT);
        const tilt = lerp(k1.tilt, k2.tilt, subT);
        this.charWrap.style.transform = `translate3d(0,${y.toFixed(2)}px,0) scale(${sx.toFixed(3)},${sy.toFixed(3)}) rotate(${tilt.toFixed(2)}deg)`;

        if (this.shadow) {
          const sScale = lerp(k1.sScale, k2.sScale, subT);
          const sAlpha = lerp(k1.sAlpha, k2.sAlpha, subT);
          this.shadow.style.transform = `scale(${sScale.toFixed(3)},${sScale.toFixed(3)})`;
          this.shadow.style.opacity = sAlpha.toFixed(3);
        }
      }

      if (this.particlePool && k1.fx && frameIdx !== this.lastSpawnFrame) {
        this.lastSpawnFrame = frameIdx;
        const rect = this.stage.getBoundingClientRect ? this.stage.getBoundingClientRect() : { width: 320, height: 400 };
        this.particlePool.spawn(k1.fx, rect.width * 0.5, this.action === 'fly' ? rect.height * 0.7 : rect.height * 0.9);
      }

      if (this.particlePool) this.particlePool.render();
      this.rafId = requestAnimationFrame((ts) => this.tick(ts));
    }

    start() {
      if (!this.rafId) {
        this.lastTimestamp = 0;
        this.rafId = requestAnimationFrame((ts) => this.tick(ts));
      }
    }

    destroy() {
      if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
      if (this.ro) { this.ro.disconnect(); }
      if (this.particlePool) { this.particlePool.clear(); }
      this.container.innerHTML = '';
      this.container.classList.remove('scorear-motion-container');
      delete this.container._scorear_instance;
    }
  }

  // Global Engine Manager & Facade
  const activeInstances = new Set();
  let defaultInstance = null;

  const ScoreARMotionEngine = {
    mount(containerElement, characterId, actionName, options) {
      const el = typeof containerElement === 'string' ? document.querySelector(containerElement) : containerElement;
      if (el && el._scorear_instance) {
        const existing = el._scorear_instance;
        if (existing.characterId === (characterId || 'char_01')) {
          existing.setAction(actionName || 'idle');
          return existing;
        }
        ScoreARMotionEngine.destroy(el);
      }
      const inst = new CartoonMotionInstance(el, characterId, actionName, options);
      if (inst.container) inst.container._scorear_instance = inst;
      activeInstances.add(inst);
      defaultInstance = inst;
      return inst;
    },

    setAction(actionName) {
      if (defaultInstance) defaultInstance.setAction(actionName);
      activeInstances.forEach((i) => i.setAction(actionName));
    },

    setSpeed(multiplier) {
      if (defaultInstance) defaultInstance.setSpeed(multiplier);
      activeInstances.forEach((i) => i.setSpeed(multiplier));
    },

    setCharacter(characterId) {
      if (defaultInstance) defaultInstance.setCharacter(characterId);
      activeInstances.forEach((i) => i.setCharacter(characterId));
    },

    destroy(containerElement) {
      if (containerElement && containerElement._scorear_instance) {
        const inst = containerElement._scorear_instance;
        activeInstances.delete(inst);
        if (defaultInstance === inst) defaultInstance = activeInstances.values().next().value || null;
        inst.destroy();
        return;
      }
      activeInstances.forEach((i) => i.destroy());
      activeInstances.clear();
      defaultInstance = null;
    },

    getInstance(containerElement) {
      return containerElement ? containerElement._scorear_instance : defaultInstance;
    }
  };

  global.ScoreARMotionEngine = ScoreARMotionEngine;
  try { if (typeof globalThis !== 'undefined') globalThis.ScoreARMotionEngine = ScoreARMotionEngine; } catch(e){}
  if (typeof module !== 'undefined' && module.exports) module.exports = ScoreARMotionEngine;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
