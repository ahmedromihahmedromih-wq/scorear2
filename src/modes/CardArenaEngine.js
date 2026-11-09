/**
 * ============================================================================
 * SCORE ARABI - GAME MODES & REAL-TIME CARD ARENA ENGINE (NON-DESTRUCTIVE)
 * ============================================================================
 * Works seamlessly on top of existing Worlds, Halls, and Question Engines.
 * Supports:
 *  1. SOLO (Classic speed + streak rules)
 *  2. SQUADS (Competing teams with shared score)
 *  3. CARD_ARENA (20 tactical cards, instant mobile delivery, Hand + Trap slots, AI Bots)
 */

export const CARDS_DATABASE = {
  // --- 1. فئة النقاط والانقلاب (Game Changers - 5 Cards) ---
  SWAP_STUDENT: {
    id: 'SWAP_STUDENT',
    nameAr: 'تبديل المراكز',
    titleEn: 'SWAP STUDENT',
    category: 'GAME_CHANGER',
    type: 'TARGET_ATTACK',
    img: 'assets/cards/card_swap_student.jpg',
    desc: 'بدّل نقاطك ومركزك بالكامل مع أي طالب آخر في القاعة فوراً!'
  },
  POINT_LEECH: {
    id: 'POINT_LEECH',
    nameAr: 'سارق النقاط',
    titleEn: 'POINT LEECH',
    category: 'GAME_CHANGER',
    type: 'TARGET_ATTACK',
    img: 'assets/cards/card_point_leech.jpg',
    desc: 'اسحب 20% من نقاط الطالب المستهدف وأضفها لرصيدك فوراً!'
  },
  MULTIPLIER_2X: {
    id: 'MULTIPLIER_2X',
    nameAr: 'مضاعف النقاط 2X',
    titleEn: 'MULTIPLIER 2X',
    category: 'GAME_CHANGER',
    type: 'BUFF_SELF',
    img: 'assets/cards/card_multiplier_2x.jpg',
    desc: 'ضاعف نقاط سؤالك القادم (2X) لتقفز في جدول الترتيب!'
  },
  ASK_QUESTION: {
    id: 'ASK_QUESTION',
    nameAr: 'رهان المائة',
    titleEn: 'ASK ME A QUESTION',
    category: 'GAME_CHANGER',
    type: 'MODAL_CHALLENGE',
    img: 'assets/cards/card_ask_question.jpg',
    desc: 'سؤال تحدي خاص على هاتفك: الإجابة الصحيحة +100 نقطة، والخاطئة -100!'
  },
  SCORE_EQUALIZER: {
    id: 'SCORE_EQUALIZER',
    nameAr: 'معادل النقاط',
    titleEn: 'SCORE EQUALIZER',
    category: 'GAME_CHANGER',
    type: 'INSTANT_SELF',
    img: 'assets/cards/card_equalizer.jpg',
    desc: 'ارفع نقاطك فوراً لتساوي متوسط نقاط أول 3 متصدرين في القاعة!'
  },

  // --- 2. فئة الهجوم والتعطيل اللحظي (Sabotage & Attack - 5 Cards) ---
  PIN_STUDENT: {
    id: 'PIN_STUDENT',
    nameAr: 'تثبيت طالب',
    titleEn: 'PIN A STUDENT',
    category: 'ATTACK',
    type: 'TARGET_ATTACK',
    img: 'assets/cards/card_pin_student.jpg',
    desc: 'جمّد شاشة خصمك وامنع تغير نقاطه أو إجابته لمدة جولة كاملة!'
  },
  MINUS_50: {
    id: 'MINUS_50',
    nameAr: 'قذيفة الخصم (-50)',
    titleEn: '-50 POINTS',
    category: 'ATTACK',
    type: 'TARGET_ATTACK',
    img: 'assets/cards/card_minus_50.jpg',
    desc: 'اخصم 50 نقطة فورية من رصيد أي طالب منافس!'
  },
  SCREEN_FOG: {
    id: 'SCREEN_FOG',
    nameAr: 'ضباب الرؤية',
    titleEn: 'SCREEN FOG',
    category: 'ATTACK',
    type: 'TARGET_ATTACK',
    img: 'assets/cards/card_screen_fog.jpg',
    desc: 'غطِّ شاشة هاتف خصمك بضباب كثيف يخفي خيارات السؤال القادم!'
  },
  TIME_SLICER: {
    id: 'TIME_SLICER',
    nameAr: 'مقص الوقت',
    titleEn: 'TIME SLICER',
    category: 'ATTACK',
    type: 'TARGET_ATTACK',
    img: 'assets/cards/card_time_slicer.jpg',
    desc: 'اقطع نصف الوقت المتاح لخصمك في السؤال القادم!'
  },
  BLOCK_DRAW: {
    id: 'BLOCK_DRAW',
    nameAr: 'مانع السحب',
    titleEn: 'BLOCK CARD DRAW',
    category: 'ATTACK',
    type: 'TARGET_ATTACK',
    img: 'assets/cards/card_block_draw.jpg',
    desc: 'أغلق درج الكروت لدى خصمك وامنع حصوله على كروت جديدة لجولتين!'
  },

  // --- 3. فئة الدروع والفخاخ التلقائية (Shields & Auto-Traps - 5 Cards) ---
  REVERSE_JUDGE: {
    id: 'REVERSE_JUDGE',
    nameAr: 'مرآة القاضي (عكس الحكم)',
    titleEn: 'REVERSE JUDGE',
    category: 'DEFENSE',
    type: 'TRAP_DEFENSE',
    counters: ['MINUS_50', 'PIN_STUDENT', 'SWAP_STUDENT', 'POINT_LEECH', 'SCREEN_FOG', 'TIME_SLICER', 'BLOCK_DRAW'],
    img: 'assets/cards/card_reverse_judge.jpg',
    desc: 'يوضع في خانة الفخ: يعكس أي كارت هجومي تلقائياً ليرتد على من أطلقه!'
  },
  STOP_SWAP: {
    id: 'STOP_SWAP',
    nameAr: 'مانع التبديل',
    titleEn: 'STOP SWAP',
    category: 'DEFENSE',
    type: 'TRAP_DEFENSE',
    counters: ['SWAP_STUDENT', 'POINT_LEECH'],
    img: 'assets/cards/card_stop_swap.jpg',
    desc: 'يوضع في خانة الفخ: يحبط تلقائياً أي محاولة لتبديل مركزك أو سرقة نقاطك!'
  },
  UNPIN_STUDENT: {
    id: 'UNPIN_STUDENT',
    nameAr: 'كاسر القيد',
    titleEn: 'UNPIN A STUDENT',
    category: 'DEFENSE',
    type: 'TRAP_DEFENSE',
    counters: ['PIN_STUDENT', 'SCREEN_FOG', 'TIME_SLICER'],
    img: 'assets/cards/card_unpin_student.jpg',
    desc: 'يوضع في الفخ أو يُفعل فوراً: يكسر التثبيت والضباب ويعيدك للعب!'
  },
  IMMUNITY_SHIELD: {
    id: 'IMMUNITY_SHIELD',
    nameAr: 'الدرع الذهبي الشامل',
    titleEn: 'IMMUNITY SHIELD',
    category: 'DEFENSE',
    type: 'TRAP_DEFENSE',
    counters: ['ALL'],
    img: 'assets/cards/card_immunity_shield.jpg',
    desc: 'يوضع في خانة الفخ: يصد أي كارت هجومي قادم نحوك تلقائياً بنسبة 100%!'
  },
  STREAK_SAVER: {
    id: 'STREAK_SAVER',
    nameAr: 'حامي السلسلة',
    titleEn: 'STREAK SAVER',
    category: 'DEFENSE',
    type: 'TRAP_PASSIVE',
    counters: ['WRONG_ANSWER'],
    img: 'assets/cards/card_streak_saver.jpg',
    desc: 'يوضع في خانة الفخ: يحمي عداد إجاباتك المتتالية (Streak) من التصفير عند الخطأ!'
  },

  // --- 4. فئة الدعم والمفاجآت التكتيكية (Boosts & Wildcards - 5 Cards) ---
  PLUS_50: {
    id: 'PLUS_50',
    nameAr: 'دفعة النقاط (+50)',
    titleEn: '+50 POINTS',
    category: 'BOOST',
    type: 'INSTANT_SELF',
    img: 'assets/cards/card_plus_50.jpg',
    desc: 'أضف +50 نقطة صافية لرصيدك فوراً في أي لحظة!'
  },
  ERASER_50_50: {
    id: 'ERASER_50_50',
    nameAr: 'حاذف الإجابتين (50/50)',
    titleEn: '50/50 ERASER',
    category: 'BOOST',
    type: 'INSTANT_SELF',
    img: 'assets/cards/card_eraser.jpg',
    desc: 'احذف إجابتين خاطئتين فوراً من شاشة السؤال الحالي!'
  },
  FREE_GIFT: {
    id: 'FREE_GIFT',
    nameAr: 'هدية الطالب المجانية',
    titleEn: 'FREE STUDENT GIFT',
    category: 'BOOST',
    type: 'INSTANT_SELF',
    img: 'assets/cards/card_free_gift.jpg',
    desc: 'افتح صندوق الهدية الفوري للحصول على مكافأة عشوائية (+75 نقطة أو كارت إضافي)!'
  },
  DRAW_ALL: {
    id: 'DRAW_ALL',
    nameAr: 'السحب الشامل',
    titleEn: 'DRAW ALL CARDS',
    category: 'BOOST',
    type: 'INSTANT_SELF',
    img: 'assets/cards/card_draw_all.jpg',
    desc: 'املأ حقيبة يدك بكروت جديدة دفعة واحدة!'
  },
  BETTER_LUCK: {
    id: 'BETTER_LUCK',
    nameAr: 'حظ أوفر (كارت المراوغة)',
    titleEn: 'BETTER LUCK NEXT TIME',
    category: 'BOOST',
    type: 'TARGET_BLUFF',
    img: 'assets/cards/card_better_luck.jpg',
    desc: 'أرسل إنذاراً وهمياً يهز شاشة خصمك ويربكه دون خصم فعلي!'
  }
};

export class GameModeManager {
  constructor(syncCallbacks = {}) {
    this.onStateChange = syncCallbacks.onStateChange || (() => {});
    this.onCardEvent = syncCallbacks.onCardEvent || (() => {});
    this.onPlayerToast = syncCallbacks.onPlayerToast || (() => {});
    this.mode = 'CARD_ARENA'; // 'SOLO' | 'SQUADS' | 'CARD_ARENA'
    this.players = {};
    this.teams = {
      FALCONS: { id: 'FALCONS', name: 'فريق الصقور الذهبية', score: 0, color: '#f59e0b' },
      LIONS: { id: 'LIONS', name: 'فريق أسود المجرة', score: 0, color: '#38bdf8' }
    };
    this.aiTimer = null;
    this.aiEnabled = false;
  }

  setGameMode(mode, enableAI = true, minPlayers = 4) {
    this.mode = mode;
    this.aiEnabled = enableAI;
    if (enableAI) {
      this.ensureAIBots(minPlayers);
    }
    this.notifyState();
  }

  registerPlayer(id, name, isAI = false, preferredTeam = null) {
    const count = Object.keys(this.players).length;
    const assignedTeam = preferredTeam || (count % 2 === 0 ? 'FALCONS' : 'LIONS');
    this.players[id] = {
      id,
      name,
      isAI,
      team: assignedTeam,
      score: 0,
      streak: 0,
      hand: [],      // Max 3 cards in hand
      trapSlots: [], // Max 2 active trap cards for instant auto-counter
      status: {
        isPinned: false,
        hasFog: false,
        timeSliced: false,
        blockDrawTurns: 0,
        multiplier: 1
      }
    };
    this.notifyState();
    return this.players[id];
  }

  ensureAIBots(minPlayers = 4) {
    const botProfiles = [
      { id: 'bot_1', name: '🤖 أرجون الذكي (AI)' },
      { id: 'bot_2', name: '🤖 سارة المجرة (AI)' },
      { id: 'bot_3', name: '🤖 فارس الزمن (AI)' },
      { id: 'bot_4', name: '🤖 ليلى الرقمية (AI)' }
    ];
    let i = 0;
    while (Object.keys(this.players).length < minPlayers && i < botProfiles.length) {
      if (!this.players[botProfiles[i].id]) {
        this.registerPlayer(botProfiles[i].id, botProfiles[i].name, true);
      }
      i++;
    }
    this.startAILoop();
  }

  // Standard answer calculation (preserves existing question rules across all 3 modes)
  submitAnswer(playerId, isCorrect, timeTakenMs = 4000, maxTimeMs = 20000) {
    const p = this.players[playerId];
    if (!p) return null;

    if (p.status.isPinned) {
      p.status.isPinned = false;
      this.onPlayerToast(playerId, '❄️ كنت مثبتاً في هذه الجولة! تم فك القيد الآن.');
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

      // Grant card immediately to student phone in CARD_ARENA mode
      if (this.mode === 'CARD_ARENA') {
        this.grantRandomCard(playerId);
      }
    } else {
      // Check if STREAK_SAVER is in trapSlots
      const saverIdx = p.trapSlots.findIndex(c => c.id === 'STREAK_SAVER');
      if (saverIdx !== -1) {
        const usedTrap = p.trapSlots.splice(saverIdx, 1)[0];
        this.onCardEvent({
          type: 'TRAP_SAVED_STREAK',
          sourcePlayer: p,
          targetPlayer: p,
          card: usedTrap,
          message: `🔥 فخ "${usedTrap.nameAr}" حمى سلسلة إجابات ${p.name} من التصفير!`
        });
      } else {
        p.streak = 0;
      }
    }

    this.notifyState();
    return { pointsEarned, newScore: p.score, streak: p.streak };
  }

  grantRandomCard(playerId, specificCardId = null) {
    const p = this.players[playerId];
    if (!p) return null;

    if (p.status.blockDrawTurns > 0) {
      p.status.blockDrawTurns -= 1;
      this.onPlayerToast(playerId, '⛓️ درج الكروت مقفل بكارت منع السحب! متبقي: ' + p.status.blockDrawTurns);
      this.notifyState();
      return null;
    }

    if (p.hand.length >= 3) {
      this.onPlayerToast(playerId, '🎒 حقيبة اليد ممتلئة (3/3)! استخدم كارتاً أو ضعه في الفخ أولاً.');
      return null;
    }

    const keys = Object.keys(CARDS_DATABASE);
    const chosenKey = specificCardId || keys[Math.floor(Math.random() * keys.length)];
    const template = CARDS_DATABASE[chosenKey];
    const cardInstance = {
      ...template,
      instanceId: 'card_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
    };

    p.hand.push(cardInstance);
    this.onPlayerToast(playerId, `🃏 حصلت على كارت جديد: ${cardInstance.nameAr}`);
    this.notifyState();
    return cardInstance;
  }

  // Option 1: Move defensive card from Hand to Active Trap Slot (Max 2)
  equipToTrapSlot(playerId, instanceId) {
    const p = this.players[playerId];
    if (!p) return { ok: false, msg: 'طالب غير موجود' };
    if (p.trapSlots.length >= 2) return { ok: false, msg: 'خانة الفخاخ ممتلئة (2/2)!' };

    const idx = p.hand.findIndex(c => c.instanceId === instanceId);
    if (idx === -1) return { ok: false, msg: 'الكارت غير موجود باليد' };

    const card = p.hand[idx];
    if (!card.type.startsWith('TRAP_')) {
      return { ok: false, msg: 'فقط كروت الدفاع والفخاخ يمكن وضعها في خانة الرد التلقائي!' };
    }

    p.hand.splice(idx, 1);
    p.trapSlots.push(card);
    this.onPlayerToast(playerId, `🛡️ تم تجهيز "${card.nameAr}" في خانة الفخ للرد التلقائي اللحظي!`);
    this.notifyState();
    return { ok: true, card };
  }

  // Option 2: Activate a card immediately (Self or Target) with Zero-Latency Trap Counter Check
  activateCard(senderId, instanceId, targetId = null) {
    const sender = this.players[senderId];
    if (!sender) return;

    const idx = sender.hand.findIndex(c => c.instanceId === instanceId);
    if (idx === -1) return;

    const card = sender.hand.splice(idx, 1)[0];
    let target = targetId && this.players[targetId] ? this.players[targetId] : sender;

    // --- REAL-TIME AUTO-COUNTER CHECK ON TARGET'S TRAP SLOTS ---
    if (target.id !== sender.id && card.type === 'TARGET_ATTACK') {
      const matchingTrapIdx = target.trapSlots.findIndex(
        trap => trap.counters && (trap.counters.includes('ALL') || trap.counters.includes(card.id))
      );

      if (matchingTrapIdx !== -1) {
        const triggeredTrap = target.trapSlots.splice(matchingTrapIdx, 1)[0];

        if (triggeredTrap.id === 'REVERSE_JUDGE') {
          // Reflect the attack back onto the sender!
          target = sender;
          this.applyCardEffect(card, sender, target);
          this.onCardEvent({
            type: 'REFLECTED',
            sourcePlayer: sender,
            targetPlayer: this.players[targetId],
            card,
            trapCard: triggeredTrap,
            message: `⚖️ انقلاب مذهل! ${this.players[targetId].name} عكس كارت "${card.nameAr}" بمرآة القاضي ليرتد على ${sender.name}!`
          });
          this.notifyState();
          return;
        } else {
          // Completely block and shatter the incoming attack
          this.onCardEvent({
            type: 'BLOCKED',
            sourcePlayer: sender,
            targetPlayer: target,
            card,
            trapCard: triggeredTrap,
            message: `🛡️ صد فوري! درع "${triggeredTrap.nameAr}" لدى ${target.name} حطّم هجوم "${card.nameAr}" من ${sender.name}!`
          });
          this.notifyState();
          return;
        }
      }
    }

    // --- EXECUTE CARD EFFECT ---
    const effectSummary = this.applyCardEffect(card, sender, target);
    this.onCardEvent({
      type: 'EXECUTED',
      sourcePlayer: sender,
      targetPlayer: target,
      card,
      message: effectSummary
    });
    this.notifyState();
  }

  applyCardEffect(card, sender, target) {
    switch (card.id) {
      case 'PLUS_50':
        sender.score += 50;
        return `✨ ${sender.name} فعّل "${card.nameAr}" وأضاف +50 نقطة لرصيده!`;

      case 'MINUS_50':
        target.score = Math.max(0, target.score - 50);
        return `💥 ${sender.name} قصف ${target.name} بكارت "${card.nameAr}" وخصم منه 50 نقطة!`;

      case 'SWAP_STUDENT': {
        const temp = sender.score;
        sender.score = target.score;
        target.score = temp;
        return `🔄 انقلاب الصدارة! ${sender.name} بدّل نقاطه بالكامل مع ${target.name}!`;
      }

      case 'POINT_LEECH': {
        const stolen = Math.max(25, Math.round(target.score * 0.20));
        target.score = Math.max(0, target.score - stolen);
        sender.score += stolen;
        return `🧛 ${sender.name} امتص ${stolen} نقطة (20%) من رصيد ${target.name}!`;
      }

      case 'PIN_STUDENT':
        target.status.isPinned = true;
        return `❄️ ${sender.name} ثبّت وجمد شاشة ${target.name} للجولة القادمة!`;

      case 'UNPIN_STUDENT':
        sender.status.isPinned = false;
        sender.status.hasFog = false;
        sender.status.timeSliced = false;
        return `🔓 ${sender.name} حطم جميع القيود والضباب بكارت "${card.nameAr}"!`;

      case 'BLOCK_DRAW':
        target.status.blockDrawTurns = 2;
        return `⛓️ ${sender.name} أغلق درج الكروت لدى ${target.name} لمدة جولتين!`;

      case 'SCREEN_FOG':
        target.status.hasFog = true;
        return `🌫️ ${sender.name} أطلق ضباب الرؤية على شاشة هاتف ${target.name}!`;

      case 'TIME_SLICER':
        target.status.timeSliced = true;
        return `⏳ ${sender.name} قطع نصف وقت السؤال القادم على ${target.name}!`;

      case 'MULTIPLIER_2X':
        sender.status.multiplier = 2;
        return `⚡ ${sender.name} فعّل مضاعف النقاط (2X) لسؤاله القادم!`;

      case 'SCORE_EQUALIZER': {
        const sorted = Object.values(this.players).map(p => p.score).sort((a, b) => b - a);
        const topAvg = Math.round(sorted.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, sorted.length));
        if (sender.score < topAvg) sender.score = topAvg;
        else sender.score += 50;
        return `⚖️ ${sender.name} عادل الكفة ورفع رصيده إلى ${sender.score} نقطة!`;
      }

      case 'DRAW_ALL':
        this.grantRandomCard(sender.id);
        this.grantRandomCard(sender.id);
        return `🌀 ${sender.name} فعّل السحب الشامل وملأ حقيبته بالكروت!`;

      case 'FREE_GIFT':
        sender.score += 75;
        return `🎁 ${sender.name} فتح صندوق الهدية وحصل على +75 نقطة مجانية!`;

      case 'ERASER_50_50':
        return `✂️ ${sender.name} استخدم حاذف الإجابتين (50/50) لتسهيل السؤال!`;

      case 'ASK_QUESTION': {
        const wonChallenge = Math.random() >= 0.3;
        const delta = wonChallenge ? 100 : -100;
        sender.score = Math.max(0, sender.score + delta);
        return wonChallenge
          ? `🎯 ${sender.name} نجح في سؤال التحدي الخاص وكسب +100 نقطة!`
          : `💣 ${sender.name} أخفق في رهان المائة وخسر 100 نقطة!`;
      }

      case 'BETTER_LUCK':
        return `🃏 ${sender.name} أرسل إنذاراً وهمياً (حظ أوفر) أربك شاشة ${target.name}!`;

      default:
        return `✨ ${sender.name} استخدم ${card.nameAr}`;
    }
  }

  // Smart AI Bot simulation loop (answers questions, equips traps, attacks leaders)
  startAILoop() {
    if (this.aiTimer) clearInterval(this.aiTimer);
    this.aiTimer = setInterval(() => {
      if (!this.aiEnabled) return;
      const all = Object.values(this.players);
      const bots = all.filter(p => p.isAI);
      if (bots.length === 0) return;

      const randomBot = bots[Math.floor(Math.random() * bots.length)];

      // 1. If bot has a defensive card in hand and free trap slot, equip it!
      if (this.mode === 'CARD_ARENA') {
        const trapInHand = randomBot.hand.find(c => c.type.startsWith('TRAP_'));
        if (trapInHand && randomBot.trapSlots.length < 2) {
          this.equipToTrapSlot(randomBot.id, trapInHand.instanceId);
          return;
        }

        // 2. If bot has offensive/boost cards, use them smartly against the current leader
        if (randomBot.hand.length > 0 && Math.random() < 0.55) {
          const cardToPlay = randomBot.hand[0];
          const sortedLeaders = [...all].sort((a, b) => b.score - a.score);
          const topTarget = sortedLeaders.find(p => p.id !== randomBot.id) || randomBot;

          if (cardToPlay.type === 'TARGET_ATTACK' || cardToPlay.type === 'TARGET_BLUFF') {
            if (cardToPlay.id === 'SWAP_STUDENT' && randomBot.score >= topTarget.score) {
              // Don't swap if already ahead
              return;
            }
            this.activateCard(randomBot.id, cardToPlay.instanceId, topTarget.id);
            return;
          } else if (
            cardToPlay.type === 'INSTANT_SELF' ||
            cardToPlay.type === 'BUFF_SELF' ||
            cardToPlay.type === 'MODAL_CHALLENGE'
          ) {
            this.activateCard(randomBot.id, cardToPlay.instanceId, randomBot.id);
            return;
          }
        }
      }
    }, 4500);
  }

  stopAILoop() {
    if (this.aiTimer) clearInterval(this.aiTimer);
  }

  notifyState() {
    this.onStateChange({
      mode: this.mode,
      players: this.players,
      teams: this.teams
    });
  }
}

// Universal browser & module export
if (typeof window !== 'undefined') {
  window.CARDS_DATABASE = CARDS_DATABASE;
  window.GameModeManager = GameModeManager;
  window.ScoreARCardArenaEngine = { CARDS_DATABASE, GameModeManager };
}

