/**
 * ScoreAR Game Modes & Real-Time Card Arena Engine (Non-Destructive)
 * Supports: SOLO, SQUADS, and CARD_ARENA (20 tactical cards, Hand + Trap slots, smart AI bots).
 * Enforces Exclusive Single-Use Card Pool (no duplicates room-wide except BETTER_LUCK).
 * Strictly Rule 7 Compliant (<350 lines).
 */
(function(global) {
  'use strict';

  const CARDS_DATABASE = {
    SWAP_STUDENT: { id: 'SWAP_STUDENT', nameAr: 'تبديل المراكز', titleEn: 'SWAP STUDENT', category: 'GAME_CHANGER', type: 'TARGET_ATTACK', img: 'assets/cards/card_swap_student.jpg', desc: 'بدّل نقاطك ومركزك بالكامل مع أي طالب آخر في القاعة فوراً!' },
    POINT_LEECH: { id: 'POINT_LEECH', nameAr: 'سارق النقاط', titleEn: 'POINT LEECH', category: 'GAME_CHANGER', type: 'TARGET_ATTACK', img: 'assets/cards/card_point_leech.jpg', desc: 'اسحب 20% من نقاط الطالب المستهدف وأضفها لرصيدك فوراً!' },
    MULTIPLIER_2X: { id: 'MULTIPLIER_2X', nameAr: 'مضاعف النقاط 2X', titleEn: 'MULTIPLIER 2X', category: 'GAME_CHANGER', type: 'BUFF_SELF', img: 'assets/cards/card_multiplier_2x.jpg', desc: 'ضاعف نقاط سؤالك القادم (2X) لتقفز في جدول الترتيب!' },
    ASK_QUESTION: { id: 'ASK_QUESTION', nameAr: 'رهان المائة', titleEn: 'ASK ME A QUESTION', category: 'GAME_CHANGER', type: 'MODAL_CHALLENGE', img: 'assets/cards/card_ask_question.jpg', desc: 'سؤال تحدي خاص على هاتفك: الإجابة الصحيحة +100 نقطة، والخاطئة -100!' },
    SCORE_EQUALIZER: { id: 'SCORE_EQUALIZER', nameAr: 'معادل النقاط', titleEn: 'SCORE EQUALIZER', category: 'GAME_CHANGER', type: 'INSTANT_SELF', img: 'assets/cards/card_equalizer.jpg', desc: 'ارفع نقاطك فوراً لتساوي متوسط نقاط أول 3 متصدرين في القاعة!' },

    PIN_STUDENT: { id: 'PIN_STUDENT', nameAr: 'تثبيت طالب', titleEn: 'PIN A STUDENT', category: 'ATTACK', type: 'TARGET_ATTACK', img: 'assets/cards/card_pin_student.jpg', desc: 'جمّد شاشة خصمك وامنع تغير نقاطه أو إجابته لمدة جولة كاملة!' },
    MINUS_50: { id: 'MINUS_50', nameAr: 'قذيفة الخصم (-50)', titleEn: '-50 POINTS', category: 'ATTACK', type: 'TARGET_ATTACK', img: 'assets/cards/card_minus_50.jpg', desc: 'اخصم 50 نقطة فورية من رصيد أي طالب منافس!' },
    SCREEN_FOG: { id: 'SCREEN_FOG', nameAr: 'ضباب الرؤية', titleEn: 'SCREEN FOG', category: 'ATTACK', type: 'TARGET_ATTACK', img: 'assets/cards/card_screen_fog.jpg', desc: 'غطِّ شاشة هاتف خصمك بضباب كثيف يخفي خيارات السؤال القادم!' },
    TIME_SLICER: { id: 'TIME_SLICER', nameAr: 'مقص الوقت', titleEn: 'TIME SLICER', category: 'ATTACK', type: 'TARGET_ATTACK', img: 'assets/cards/card_time_slicer.jpg', desc: 'اقطع نصف الوقت المتاح لخصمك في السؤال القادم!' },
    BLOCK_DRAW: { id: 'BLOCK_DRAW', nameAr: 'مانع السحب', titleEn: 'BLOCK CARD DRAW', category: 'ATTACK', type: 'TARGET_ATTACK', img: 'assets/cards/card_block_draw.jpg', desc: 'امنع الخصم المستهدف من سحب أي كارت جديد لجولتين قادمتين!' },

    REVERSE_JUDGE: { id: 'REVERSE_JUDGE', nameAr: 'مرآة القاضي', titleEn: 'REVERSE JUDGE', category: 'DEFENSE', type: 'TRAP_AUTO_COUNTER', counters: ['ALL'], img: 'assets/cards/card_reverse_judge.jpg', desc: 'خانة الفخ: تعكس أي هجوم قادم ليرتد على المهاجم نفسه تلقائياً!' },
    STOP_SWAP: { id: 'STOP_SWAP', nameAr: 'مانع التبديل', titleEn: 'STOP SWAP', category: 'DEFENSE', type: 'TRAP_AUTO_COUNTER', counters: ['SWAP_STUDENT', 'POINT_LEECH'], img: 'assets/cards/card_stop_swap.jpg', desc: 'خانة الفخ: تمنع أي محاولة لتبديل مركزك أو سرقة نقاطك تلقائياً!' },
    UNPIN_STUDENT: { id: 'UNPIN_STUDENT', nameAr: 'كاسر القيد', titleEn: 'UNPIN A STUDENT', category: 'DEFENSE', type: 'TRAP_AUTO_COUNTER', counters: ['PIN_STUDENT', 'SCREEN_FOG'], img: 'assets/cards/card_unpin_student.jpg', desc: 'خانة الفخ: تفك قيد التجميد والضباب فوراً وتلغي أثرهما!' },
    IMMUNITY_SHIELD: { id: 'IMMUNITY_SHIELD', nameAr: 'الدرع الذهبي الشامل', titleEn: 'IMMUNITY SHIELD', category: 'DEFENSE', type: 'TRAP_AUTO_COUNTER', counters: ['ALL'], img: 'assets/cards/card_immunity_shield.jpg', desc: 'خانة الفخ: تحصين شامل 100% يمتص ويحطم أول هجوم من أي نوع!' },
    STREAK_SAVER: { id: 'STREAK_SAVER', nameAr: 'حامي السلسلة', titleEn: 'STREAK SAVER', category: 'DEFENSE', type: 'TRAP_PASSIVE', counters: ['STREAK_BREAK'], img: 'assets/cards/card_streak_saver.jpg', desc: 'خانة الفخ: تحمي سلسلة إجاباتك المتتالية (Streak) من التصفير عند الخطأ!' },

    PLUS_50: { id: 'PLUS_50', nameAr: 'دفعة (+50)', titleEn: '+50 POINTS', category: 'BOOST', type: 'INSTANT_SELF', img: 'assets/cards/card_plus_50.jpg', desc: 'أضف 50 نقطة فورية مباشرة لرصيدك الإجمالي بالقاعة!' },
    ERASER_50_50: { id: 'ERASER_50_50', nameAr: 'حاذف 50/50', titleEn: '50/50 ERASER', category: 'BOOST', type: 'INSTANT_SELF', img: 'assets/cards/card_eraser.jpg', desc: 'احذف خيارين خاطئين من السؤال الحالي لتزيد فرصة إجابتك الصحيحة!' },
    FREE_GIFT: { id: 'FREE_GIFT', nameAr: 'هدية الطالب المجانية', titleEn: 'FREE STUDENT GIFT', category: 'BOOST', type: 'INSTANT_SELF', img: 'assets/cards/card_free_gift.jpg', desc: 'صندوق مكافآت عشوائي: يمنحك +75 نقطة هدية أو شحن كروت إضافية!' },
    DRAW_ALL: { id: 'DRAW_ALL', nameAr: 'السحب الشامل', titleEn: 'DRAW ALL CARDS', category: 'BOOST', type: 'INSTANT_SELF', img: 'assets/cards/card_draw_all.jpg', desc: 'اسحب كروت جديدة لتملأ حقيبة يدك بالكامل (3 كروت) في لحظة واحدة!' },
    BETTER_LUCK: { id: 'BETTER_LUCK', nameAr: 'حظ أوفر', titleEn: 'BETTER LUCK NEXT TIME', category: 'BOOST', type: 'INSTANT_SELF', img: 'assets/cards/card_better_luck.jpg', desc: 'بدّل هذا الكارت بكارت جديد فوراً واحصل على +10 نقاط ترضية!' }
  };

  class GameModeManager {
    constructor(options = {}) {
      this.mode = 'SOLO';
      this.aiEnabled = true;
      this.minPlayers = 4;
      this.players = {};
      this.claimedCards = new Set(); // Exclusive pool: no card repeats except BETTER_LUCK
      this.teams = {
        FALCONS: { id: 'FALCONS', nameAr: 'فريق الصقور الذهبية', score: 0, color: '#f59e0b' },
        LIONS: { id: 'LIONS', nameAr: 'فريق أسود المجرة', score: 0, color: '#38bdf8' }
      };
      this.onStateChange = options.onStateChange || (() => {});
      this.onCardEvent = options.onCardEvent || (() => {});
      this.onPlayerToast = options.onPlayerToast || (() => {});
      this.aiTimer = null;
    }

    setGameMode(mode, aiEnabled = true, minPlayers = 4) {
      this.mode = mode || 'SOLO';
      this.aiEnabled = Boolean(aiEnabled);
      this.minPlayers = minPlayers;
      if (this.aiEnabled && Object.keys(this.players).length < minPlayers) {
        this.populateAIBots(minPlayers);
      }
    }

    registerPlayer(id, name, isAI = false, preferredTeam = null) {
      const count = Object.keys(this.players).length;
      const assignedTeam = preferredTeam || (count % 2 === 0 ? 'FALCONS' : 'LIONS');
      this.players[id] = {
        id,
        name: name || (isAI ? '🤖 بطل ذكي' : 'طالب جديد'),
        isAI,
        team: assignedTeam,
        score: 0,
        streak: 0,
        hand: [], // Strictly empty at start - earned only upon fast correct answer!
        trapSlots: [],
        status: { isPinned: false, hasFog: false, timeSliced: false, blockDrawTurns: 0, multiplier: 1 }
      };
      this.notifyState();
      return this.players[id];
    }

    populateAIBots(minPlayers = 4) {
      const botProfiles = [
        { id: 'bot_1', name: '🤖 أرجون الذكي' },
        { id: 'bot_2', name: '🤖 سارة المجرة' },
        { id: 'bot_3', name: '🤖 فارس الزمن' }
      ];
      let i = 0;
      while (Object.keys(this.players).length < minPlayers && i < botProfiles.length) {
        const b = botProfiles[i];
        if (!this.players[b.id]) {
          this.registerPlayer(b.id, b.name, true);
        }
        i++;
      }
      this.startAILoop();
    }

    submitAnswer(playerId, isCorrect, timeTakenMs = 4000, maxTimeMs = 20000, isTop2 = false) {
      const p = this.players[playerId];
      if (!p) return null;

      if (p.status.isPinned) {
        p.status.isPinned = false;
        this.onPlayerToast(playerId, '❄️ تم فك التثبيت عنك للسؤال القادم!');
        this.notifyState();
        return { pointsEarned: 0, blockedByPin: true };
      }

      let pointsEarned = 0;
      if (isCorrect) {
        p.streak += 1;
        const speedBonus = Math.max(10, Math.round((1 - Math.min(timeTakenMs, maxTimeMs) / maxTimeMs) * 50));
        const streakBonus = Math.min(p.streak * 15, 60);
        pointsEarned = (100 + speedBonus + streakBonus) * p.status.multiplier;
        p.status.multiplier = 1;
        p.score += pointsEarned;
        if (this.mode === 'SQUADS' && p.team && this.teams[p.team]) {
          this.teams[p.team].score += pointsEarned;
        }
        if (this.mode === 'CARD_ARENA' && isTop2) {
          this.grantRandomCard(playerId);
        }
      } else {
        const saverIdx = p.trapSlots.findIndex(c => c.id === 'STREAK_SAVER');
        if (saverIdx !== -1) {
          const usedSaver = p.trapSlots.splice(saverIdx, 1)[0];
          this.onCardEvent({ type: 'EXECUTED', sourcePlayer: p, targetPlayer: p, card: usedSaver, message: `🛡️ كارت "حامي السلسلة" أنقذ سلسلة إجابات ${p.name} المتتالية!` });
        } else {
          p.streak = 0;
        }
      }

      p.status.hasFog = false;
      p.status.timeSliced = false;
      this.notifyState();
      return { pointsEarned, totalScore: p.score, streak: p.streak };
    }

    grantRandomCard(playerId, specificCardId = null) {
      let p = this.players[playerId];
      if (!p) {
        p = this.registerPlayer(playerId, 'طالب', false);
      }
      if (p.status.blockDrawTurns > 0) {
        p.status.blockDrawTurns -= 1;
        this.onPlayerToast(playerId, '🚫 لا يمكنك سحب كروت جديدة (تأثير مانع السحب نشط)!');
        return null;
      }
      if (p.hand.length >= 3) return null;

      // Exclusive room pool: once claimed, card never appears to anyone else (except BETTER_LUCK)
      const allKeys = Object.keys(CARDS_DATABASE);
      let availableKeys = allKeys.filter(k => k === 'BETTER_LUCK' || !this.claimedCards.has(k));
      if (availableKeys.length === 0) availableKeys = ['BETTER_LUCK'];

      let chosenKey = (specificCardId && CARDS_DATABASE[specificCardId])
        ? specificCardId
        : availableKeys[Math.floor(Math.random() * availableKeys.length)];

      if (chosenKey !== 'BETTER_LUCK') {
        this.claimedCards.add(chosenKey);
      }

      const template = CARDS_DATABASE[chosenKey];
      const cardInstance = { ...template, instanceId: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6) };

      p.hand.push(cardInstance);
      this.onPlayerToast(playerId, `🃏 كسبت كارت: ${cardInstance.nameAr}`);
      this.notifyState();
      return cardInstance;
    }

    equipToTrapSlot(playerId, instanceId) {
      const p = this.players[playerId];
      if (!p || p.trapSlots.length >= 2) return { ok: false };
      const idx = p.hand.findIndex(c => c.instanceId === instanceId);
      if (idx === -1) return { ok: false };
      const card = p.hand[idx];
      if (!card.type.startsWith('TRAP_')) return { ok: false };

      p.hand.splice(idx, 1);
      p.trapSlots.push(card);
      this.onPlayerToast(playerId, `🛡️ تم تجهيز "${card.nameAr}" في خانة الفخ للرد التلقائي!`);
      this.notifyState();
      return { ok: true, card };
    }

    activateCard(senderId, instanceId, targetId = null) {
      const sender = this.players[senderId];
      if (!sender) return;
      const idx = sender.hand.findIndex(c => c.instanceId === instanceId);
      if (idx === -1) return;
      const card = sender.hand.splice(idx, 1)[0];
      let target = targetId && this.players[targetId] ? this.players[targetId] : sender;

      if (target.id !== sender.id && card.type === 'TARGET_ATTACK') {
        const trapIdx = target.trapSlots.findIndex(t => t.counters && (t.counters.includes('ALL') || t.counters.includes(card.id)));
        if (trapIdx !== -1) {
          const trap = target.trapSlots.splice(trapIdx, 1)[0];
          if (trap.id === 'REVERSE_JUDGE') {
            target = sender;
            this.applyCardEffect(card, sender, target);
            this.onCardEvent({ type: 'REFLECTED', sourcePlayer: sender, targetPlayer: this.players[targetId], card, trapCard: trap, message: `⚖️ انقلاب مذهل! ${this.players[targetId].name} عكس "${card.nameAr}" بمرآة القاضي لترتد على ${sender.name}!` });
            this.notifyState();
            return;
          } else {
            this.onCardEvent({ type: 'BLOCKED', sourcePlayer: sender, targetPlayer: target, card, trapCard: trap, message: `🛡️ صد فوري! درع "${trap.nameAr}" لدى ${target.name} حطّم هجوم "${card.nameAr}" من ${sender.name}!` });
            this.notifyState();
            return;
          }
        }
      }

      const msg = this.applyCardEffect(card, sender, target);
      this.onCardEvent({ type: 'EXECUTED', sourcePlayer: sender, targetPlayer: target, card, message: msg });
      this.notifyState();
    }

    applyCardEffect(card, sender, target) {
      switch (card.id) {
        case 'PLUS_50': sender.score += 50; return `✨ ${sender.name} أضاف +50 نقطة لرصيده!`;
        case 'MINUS_50': target.score = Math.max(0, target.score - 50); return `💥 ${sender.name} خصم 50 نقطة من رصيد ${target.name}!`;
        case 'SWAP_STUDENT': {
          const tmp = sender.score; sender.score = target.score; target.score = tmp;
          return `🔄 انقلاب مراكز! ${sender.name} بدّل نقاطه (${sender.score}) مع ${target.name} (${target.score})!`;
        }
        case 'POINT_LEECH': {
          const stolen = Math.round(target.score * 0.20);
          target.score = Math.max(0, target.score - stolen);
          sender.score += stolen;
          return `🩸 ${sender.name} سرق ${stolen} نقطة (20%) من ${target.name}!`;
        }
        case 'SCORE_EQUALIZER': {
          const allScores = Object.values(this.players).map(p => p.score).sort((a,b) => b - a);
          const top3 = allScores.slice(0, 3);
          const avg = Math.round(top3.reduce((a,b) => a + b, 0) / (top3.length || 1));
          sender.score = Math.max(sender.score, avg);
          return `⚖️ معادل النقاط رفع نقاط ${sender.name} إلى ${sender.score}!`;
        }
        case 'MULTIPLIER_2X': sender.status.multiplier = 2; return `⚡ ${sender.name} فعّل مضاعف النقاط 2X لسؤاله القادم!`;
        case 'PIN_STUDENT': target.status.isPinned = true; return `❄️ ${sender.name} قام بتجميد ${target.name} للسؤال القادم!`;
        case 'SCREEN_FOG': target.status.hasFog = true; return `💨 ضباب الرؤية غطى شاشة هاتف ${target.name}!`;
        case 'TIME_SLICER': target.status.timeSliced = true; return `⏳ مقص الوقت اقتطع نصف وقت الإجابة لـ ${target.name}!`;
        case 'BLOCK_DRAW': target.status.blockDrawTurns = 2; return `🚫 تم حظر سحب الكروت لـ ${target.name} لجولتين!`;
        case 'ERASER_50_50': return `✂️ ${sender.name} استخدم ممحاة 50/50 لحذف خيارين خاطئين!`;
        case 'FREE_GIFT': sender.score += 75; return `🎁 هدية مجانية! ${sender.name} ربح +75 نقطة ذهبية!`;
        case 'DRAW_ALL': this.grantRandomCard(sender.id); this.grantRandomCard(sender.id); return `🎒 ${sender.name} ملأ حقيبة كروته بالكامل!`;
        case 'BETTER_LUCK': sender.score += 10; this.grantRandomCard(sender.id); return `🍀 ${sender.name} أعاد تدوير حظه مع +10 نقاط ترضية!`;
        case 'ASK_QUESTION': return `❓ ${sender.name} بدأ رهان المائة!`;
        default: return `⚡ ${sender.name} استخدم كارت "${card.nameAr}"!`;
      }
    }

    startAILoop() {
      if (this.aiTimer) clearInterval(this.aiTimer);
      this.aiTimer = setInterval(() => {
        if (!this.aiEnabled || this.mode !== 'CARD_ARENA') return;
        const all = Object.values(this.players);
        const bots = all.filter(p => p.isAI);
        if (bots.length === 0) return;

        const bot = bots[Math.floor(Math.random() * bots.length)];
        // Bots ONLY play cards if they earned them by answering fast & correct!
        if (bot.hand.length === 0) return;

        const trapInHand = bot.hand.find(c => c.type && c.type.startsWith('TRAP_'));
        if (trapInHand && bot.trapSlots.length < 2 && Math.random() < 0.65) {
          this.equipToTrapSlot(bot.id, trapInHand.instanceId);
          return;
        }

        if (bot.hand.length > 0 && Math.random() < 0.55) {
          const card = bot.hand[0];
          const sorted = [...all].sort((a,b) => b.score - a.score);
          const topTarget = sorted.find(p => p.id !== bot.id) || bot;

          if (card.type === 'TARGET_ATTACK' || card.type === 'TARGET_BLUFF') {
            if (card.id === 'SWAP_STUDENT' && bot.score >= topTarget.score) return;
            this.activateCard(bot.id, card.instanceId, topTarget.id);
          } else {
            this.activateCard(bot.id, card.instanceId, bot.id);
          }
        }
      }, 5000);
    }

    stopAILoop() {
      if (this.aiTimer) clearInterval(this.aiTimer);
    }

    resetRoomPool() {
      this.claimedCards.clear();
    }

    notifyState() {
      this.onStateChange({ mode: this.mode, players: this.players, teams: this.teams });
    }
  }

  global.CARDS_DATABASE = CARDS_DATABASE;
  global.GameModeManager = GameModeManager;
  global.ScoreARCardArenaEngine = { CARDS_DATABASE, GameModeManager };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CARDS_DATABASE, GameModeManager };
  }
})(typeof window !== 'undefined' ? window : global);
