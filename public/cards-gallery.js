/**
 * ScoreAR Cards Gallery Engine (Non-Destructive)
 * Interactive showcase and educational guide for all 20 tactical competition cards.
 * Strictly Rule 7 compliant (<380 lines).
 */
(function(global) {
  'use strict';

  const CATEGORIES = {
    all: { id: 'all', nameAr: 'الكل · ٢٠', count: 20 },
    game_changer: { id: 'game_changer', nameAr: 'نقاط وانقلاب · ٥', count: 5, color: '#f59e0b' },
    attack: { id: 'attack', nameAr: 'هجوم وتعطيل · ٥', count: 5, color: '#ef4444' },
    defense: { id: 'defense', nameAr: 'دروع وفخاخ · ٥', count: 5, color: '#38bdf8' },
    boost: { id: 'boost', nameAr: 'تعزيز ومكافآت · ٥', count: 5, color: '#10b981' }
  };

  const CARDS = [
    // 1. نقاط وانقلاب (Game Changers)
    { id: 'SWAP_STUDENT', nameAr: 'تبديل المراكز', titleEn: 'SWAP STUDENT', cat: 'game_changer', color: '#f59e0b', img: 'assets/cards/card_swap_student.jpg', typeAr: 'هجوم مباشر على طالب', desc: 'الكارت الأكثر إثارة ورعباً في القاعة! بدّل نقاطك ومركزك بالكامل مع أي طالب آخر في نفس اللحظة.', tactics: 'استخدمه عندما تكون متأخراً لتقفز للمركز الأول بضربة واحدة.', counter: 'يُصد بمانع التبديل (STOP SWAP) أو الدرع، وينعكس بمرآة القاضي!', quote: '«مركزك أصبح مركزي.. والقمة تنتظرني!»' },
    { id: 'POINT_LEECH', nameAr: 'سارق النقاط', titleEn: 'POINT LEECH', cat: 'game_changer', color: '#f59e0b', img: 'assets/cards/card_point_leech.jpg', typeAr: 'هجوم استنزاف على طالب', desc: 'يسحب 20% كاملة من رصيد نقاط أي طالب تختاره ويضيفها فوراً إلى رصيدك.', tactics: 'استهدف به المتصدر لتقليص الفارق بينك وبينه للنصف.', counter: 'يحبطه مانع التبديل أو درع الحصانة، وتنعكس السرقة عليك بمرآة القاضي!', quote: '«نقاطك الثمينة تعزز مسيرتي نحو الصدارة.»' },
    { id: 'MULTIPLIER_2X', nameAr: 'مضاعف النقاط 2X', titleEn: 'MULTIPLIER 2X', cat: 'game_changer', color: '#f59e0b', img: 'assets/cards/card_multiplier_2x.jpg', typeAr: 'تعزيز ذاتي للسؤال القادم', desc: 'يضاعف نقاط إجابتك الصحيحة القادمة بنسبة 100% (2X) شاملاً مكافأة السرعة والـ Streak.', tactics: 'فعّله قبل سؤال أنت واثق من إجابته وسرعتك فيه.', counter: 'كارت ذاتي آمن لا يتأثر بفخاخ الخصوم.', quote: '«ضاعف إنجازك بضعف النقاط وقوة المعرفة!»' },
    { id: 'ASK_QUESTION', nameAr: 'رهان المائة', titleEn: 'ASK ME A QUESTION', cat: 'game_changer', color: '#f59e0b', img: 'assets/cards/card_ask_question.jpg', typeAr: 'تحدٍّ فردي سريع', desc: 'سؤال تحدي خاص على هاتفك: الإجابة الصحيحة تمنحك +100 نقطة، والخاطئة تخصم منك 100 نقطة.', tactics: 'للشجعان وأصحاب الثقة العالية لكسر الجمود وجمع النقاط.', counter: 'تحدٍّ فردي خالص لا يحتاج إلى هدف.', quote: '«المعرفة قوة.. والرهان على نفسك هو الفوز الحقيقي.»' },
    { id: 'SCORE_EQUALIZER', nameAr: 'معادل النقاط', titleEn: 'SCORE EQUALIZER', cat: 'game_changer', color: '#f59e0b', img: 'assets/cards/card_equalizer.jpg', typeAr: 'إنقاذ فوري ذاتي', desc: 'يحسب متوسط نقاط الطلاب الثلاثة الأوائل ويرفع نقاطك فوراً لتساوي هذا المتوسط.', tactics: 'أقوى كارت إنقاذ للعودة للمنافسة في النصف الثاني من المسابقة.', counter: 'كارت ذاتي لا يمكن صده أو عكسه.', quote: '«العدالة التنافسية تعيدني لقلب المعركة!»' },

    // 2. هجوم وتعطيل (Attack & Sabotage)
    { id: 'PIN_STUDENT', nameAr: 'تثبيت طالب', titleEn: 'PIN A STUDENT', cat: 'attack', color: '#ef4444', img: 'assets/cards/card_pin_student.jpg', typeAr: 'تجميد وتعطيل على طالب', desc: 'يجمّد شاشة خصمك ويقفل أزرار الإجابة لديه في السؤال الحالي مانعاً إياه من تقديم الإجابة.', tactics: 'عطّل به أقرب منافس لك خلفك أو المتصدر قبل سؤال حاسم.', counter: 'يُكسر بكارت (كاسر القيد UNPIN)، أو الدرع الشامل، أو مرآة القاضي!', quote: '«قيد الجليد يوقف حركتك.. فهل تملك كاسر القيد؟»' },
    { id: 'MINUS_50', nameAr: 'قذيفة الخصم (-50)', titleEn: '-50 POINTS', cat: 'attack', color: '#ef4444', img: 'assets/cards/card_minus_50.jpg', typeAr: 'هجوم خصم فوري', desc: 'يطلق قذيفة نقطية مباشرة تخصم 50 نقطة صافية من رصيد أي منافس بالقاعة فوراً.', tactics: 'استخدمه لكسر تعادل النقاط أو إسقاط منافس عن منصة التتويج.', counter: 'يُصد بالدرع الذهبي، وينعكس ليخصم 50 نقطة منك بمرآة القاضي!', quote: '«ضربة محسوبة تبعدك عن مضمار الصدارة.»' },
    { id: 'SCREEN_FOG', nameAr: 'ضباب الرؤية', titleEn: 'SCREEN FOG', cat: 'attack', color: '#ef4444', img: 'assets/cards/card_screen_fog.jpg', typeAr: 'تشويش بصري تفاعلي', desc: 'يغطي شاشة موبايل الخصم بطبقة كثيفة من الضباب تحجب السؤال، وعليه مسحها بإصبعه للرؤية!', tactics: 'مثالي لإرباك المتسابقين السريعين وسرقة ثواني المكافأة منهم.', counter: 'يُصد بالدرع الذهبي أو ينعكس بمرآة القاضي ليغطي شاشتك أنت!', quote: '«امسح شاشتك سريعاً.. فالوقت يمر والمعرفة لا تنتظر!»' },
    { id: 'TIME_SLICER', nameAr: 'مقص الوقت', titleEn: 'TIME SLICER', cat: 'attack', color: '#ef4444', img: 'assets/cards/card_time_slicer.jpg', typeAr: 'تقليص وقت على طالب', desc: 'يقص 50% من مؤقت السؤال المتبقي لدى خصمك فيجبره على الإجابة تحت ضغط زمني هائل.', tactics: 'أطلقه على الأسئلة الطويلة التي تتطلب قراءة متأنية.', counter: 'ينعكس بمرآة القاضي ليقلص وقتك أنت للنصف!', quote: '«عقارب الساعة تجري.. نصف وقتك تبخر في الهواء!»' },
    { id: 'BLOCK_DRAW', nameAr: 'مانع السحب', titleEn: 'BLOCK CARD DRAW', cat: 'attack', color: '#ef4444', img: 'assets/cards/card_block_draw.jpg', typeAr: 'تعطيل حقيبة الكروت', desc: 'يقفل حقيبة الكروت لدى الخصم المستهدف لمدة جولتين متتاليتين مانعاً سحبه لكروت جديدة.', tactics: 'شل به حركة اللاعبين النشطين في استخدام الكروت التكتيكية.', counter: 'يُصد بالدرع الشامل أو ينعكس على المهاجم نفسه.', quote: '«حقيبتك مغلقة بأقفال تكتيكية.. لا كروت لك اليوم!»' },

    // 3. دروع وفخاخ تلقائية (Defense & Traps)
    { id: 'REVERSE_JUDGE', nameAr: 'مرآة القاضي (عكس الحكم)', titleEn: 'REVERSE JUDGE', cat: 'defense', color: '#38bdf8', img: 'assets/cards/card_reverse_judge.jpg', typeAr: 'فخ دفاعي تلقائي (Trap Slot)', desc: 'يوضع في خانة الفخاخ: يعكس أي كارت هجومي (تبديل، تثبيت، خصم 50، ضباب، مقص) ليرتد على المهاجم نفسه!', tactics: 'ضعه دائماً في خانة الفخ وأنت متصدر لتجعل المهاجم يندم فوراً.', counter: 'يعكس كل الهجمات تلقائياً دون أي تدخل يدوي منك لحظة الهجوم.', quote: '«من حفر حفرة لمنافسه.. سقط فيها بقوة مرآة القاضي!»' },
    { id: 'STOP_SWAP', nameAr: 'مانع التبديل', titleEn: 'STOP SWAP', cat: 'defense', color: '#38bdf8', img: 'assets/cards/card_stop_swap.jpg', typeAr: 'فخ دفاعي تلقائي (Trap Slot)', desc: 'يوضع في خانة الفخاخ: يحبط تلقائياً أي محاولة لتبديل مركزك أو سرقة 20% من نقاطك!', tactics: 'الدرع الأساسي لحماية مقعد المركز الأول من كروت التبديل المفاجئة.', counter: 'يحبط كروت (تبديل المراكز) و(سارق النقاط) تلقائياً.', quote: '«مقعدي في الصدارة محمي بحصن لا يخترقه تبديل.»' },
    { id: 'UNPIN_STUDENT', nameAr: 'كاسر القيد', titleEn: 'UNPIN A STUDENT', cat: 'defense', color: '#38bdf8', img: 'assets/cards/card_unpin_student.jpg', typeAr: 'فك قيود فوري أو فخ', desc: 'ضعه في خانة الفخاخ للصد التلقائي، أو اضغط عليه فوراً إذا أُصبت بتثبيت أو ضباب لكسر القيد في جزء من الثانية!', tactics: 'احتفظ به دائماً كطوق نجاة عند دخول الأسئلة الحاسمة.', counter: 'يفك التجميد والضباب ويعيد لك السيطرة الكاملة فوراً.', quote: '«لا قيد يدوم أمام عزيمة البطل المتيقظ!»' },
    { id: 'IMMUNITY_SHIELD', nameAr: 'الدرع الذهبي الشامل', titleEn: 'IMMUNITY SHIELD', cat: 'defense', color: '#38bdf8', img: 'assets/cards/card_immunity_shield.jpg', typeAr: 'فخ حماية شاملة (Trap Slot)', desc: 'يوضع في خانة الفخاخ ويوفر حصانة تامة 100% ضد أول هجوم قادم من أي نوع (خصم، تجميد، تبديل، ضباب، سحب).', tactics: 'الحماية المثلى عند عدم معرفة نوع الهجوم الذي يخطط له خصومك.', counter: 'يصد أي كارت هجومي تلقائياً ويتحطم بعد الصد.', quote: '«حصانة ملكية تحميك من كافة المفاجآت الهجومية.»' },
    { id: 'STREAK_SAVER', nameAr: 'حامي السلسلة', titleEn: 'STREAK SAVER', cat: 'defense', color: '#38bdf8', img: 'assets/cards/card_streak_saver.jpg', typeAr: 'فخ سلبي ذاتي (Trap Slot)', desc: 'يوضع في خانة الفخاخ: إذا أخطأت في إجابة سؤال، يحمي عداد إجاباتك المتتالية ومكافآته التراكمية من التصفير!', tactics: 'استخدمه عندما يكون الـ Streak لديك عالياً (3+) وخائفاً من سؤال صعب.', counter: 'فخ ذاتي ينقذك من هبوط المكافآت عند الخطأ.', quote: '«خطوة خاطئة واحدة لن تكسر عزيمة السلسلة الذهبية!»' },

    // 4. تعزيز ومكافآت (Boosts & Wildcards)
    { id: 'PLUS_50', nameAr: 'دفعة النقاط (+50)', titleEn: '+50 POINTS', cat: 'boost', color: '#10b981', img: 'assets/cards/card_plus_50.jpg', typeAr: 'إضافة فورية للرصيد', desc: 'يمنحك +50 نقطة صافية وفورية تضاف إلى رصيدك الإجمالي في القاعة بمجرد الضغط عليه.', tactics: 'كارت هدية نظيف لتعزيز موقعك وتأمين فارق النقاط.', counter: 'كارت فوري آمن ومباشر.', quote: '«خمسون نقطة ذهبية تلمع في رصيد بطلنا!»' },
    { id: 'ERASER_50_50', nameAr: 'حاذف الإجابتين (50/50)', titleEn: '50/50 ERASER', cat: 'boost', color: '#10b981', img: 'assets/cards/card_eraser.jpg', typeAr: 'مساعدة ذكية على السؤال', desc: 'يحذف خيارين خاطئين فوراً من شاشة السؤال الحالي، تاركاً خيارين فقط لتختار من بينهما بنسبة 50%!', tactics: 'الكارت المفضل في الأسئلة النحوية أو البلاغية المعقدة.', counter: 'مساعد شخصي لا يمكن صده أو إحباطه.', quote: '«تشتت الخيارات يزول.. والطريق للحق بات واضحاً!»' },
    { id: 'FREE_GIFT', nameAr: 'هدية الطالب المجانية', titleEn: 'FREE STUDENT GIFT', cat: 'boost', color: '#10b981', img: 'assets/cards/card_free_gift.jpg', typeAr: 'صندوق حظ مفاجئ', desc: 'يفتح لك صندوق جوائز كرتوني عشوائي يمنحك إما مكافأة نقطية (+75 نقطة)، أو كارتين إضافيين للحقيبة!', tactics: 'افتحه كلما حصلت عليه للاستفادة الفورية من مفاجآت الصندوق.', counter: 'مكافأة ذاتية فورية بدون خصوم.', quote: '«افتح هديتك.. فالمفاجأة السارة بانتظارك!»' },
    { id: 'DRAW_ALL', nameAr: 'السحب الشامل', titleEn: 'DRAW ALL CARDS', cat: 'boost', color: '#10b981', img: 'assets/cards/card_draw_all.jpg', typeAr: 'شحن فوري للحقيبة', desc: 'يسحب كروتاً جديدة حتى يملأ حقيبة يدك بالكامل (3 كروت) في ثانية واحدة لتملك ترسانة كاملة.', tactics: 'استخدمه بعد إفراغ حقيبتك أو وضع كروتك في خانات الفخاخ.', counter: 'تعبئة ذاتية لا تعتمد على الآخرين.', quote: '«ترسانتك ممتلئة الآن بأقوى كروت التكتيك!»' },
    { id: 'BETTER_LUCK', nameAr: 'حظ أوفر (المراوغة)', titleEn: 'BETTER LUCK NEXT TIME', cat: 'boost', color: '#10b981', img: 'assets/cards/card_better_luck.jpg', typeAr: 'كارت تبديل حظ', desc: 'كارت مرح ومراوغ: يتيح لك إعادة سحب كارت بديل فوراً مع مكافأة رمزية +10 نقاط لتجربة حظك من جديد.', tactics: 'بدّله فوراً للبحث عن كروت الهجوم أو الدفاع الأنسب لخطتك.', counter: 'إعادة سحب ذاتية ممتعة وسريعة.', quote: '«الحظ مع الشجعان.. والفرصة القادمة تصنع المعجزات!»' }
  ];

  function getCards(cat = 'all') {
    return cat === 'all' ? CARDS : CARDS.filter(c => c.cat === cat);
  }

  function getCardById(id) {
    return CARDS.find(c => c.id === id) || CARDS[0];
  }

  let selectedId = 'SWAP_STUDENT';
  let activeCat = 'all';

  function renderGrid(container, cat = 'all', selId = 'SWAP_STUDENT') {
    if (!container) return;
    const cards = getCards(cat);
    container.innerHTML = cards.map(c => {
      const isSel = (c.id === selId);
      return `
        <article class="character-card scorear-card-thumb ${isSel ? 'active' : ''}" onclick="ScoreARCardsGallery.selectCard('${c.id}')" aria-pressed="${isSel}" style="cursor:pointer;position:relative;background:linear-gradient(160deg,#1b1a32,#131427);border:1.5px solid ${isSel ? c.color : 'rgba(255,255,255,0.08)'};border-radius:20px;padding:12px;transition:all 0.2s cubic-bezier(0.2,0.8,0.2,1);transform:${isSel ? 'translateY(-4px)' : 'none'};box-shadow:${isSel ? `0 10px 28px ${c.color}40` : 'none'};text-align:right;">
          <div style="position:relative;width:100%;height:130px;border-radius:14px;overflow:hidden;margin-bottom:10px;background:#0d0e1d;">
            <img src="${c.img}" alt="${c.nameAr}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.opacity='0.25'">
            <span style="position:absolute;top:8px;right:8px;background:${c.color};color:#fff;font-size:10px;font-weight:900;padding:2px 8px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.5);">${c.typeAr.split(' ')[0]}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <h4 style="font-size:14px;font-weight:900;color:${isSel ? '#ffffff' : '#e2e8f0'};margin:0;">${c.nameAr}</h4>
            <span style="color:${c.color};font-size:12px;">✦</span>
          </div>
          <small style="font-size:10px;color:#94a3b8;font-weight:700;display:block;margin-bottom:6px;">${c.titleEn}</small>
          <p style="font-size:11px;color:#b1a2e9;line-height:1.45;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${c.desc}</p>
        </article>
      `;
    }).join('');
  }

  function renderPreview(stageBox, titleBox, cardId) {
    const card = getCardById(cardId);
    if (stageBox) {
      stageBox.innerHTML = `
        <div style="perspective:1000px;display:flex;flex-direction:column;align-items:center;">
          <div id="hologramCardWrapper" style="width:220px;height:300px;border-radius:20px;overflow:hidden;border:2px solid ${card.color};box-shadow:0 15px 45px ${card.color}40, 0 0 25px ${card.color}25;transition:transform 0.15s ease-out;background:#0d0e1f;position:relative;cursor:pointer;">
            <img src="${card.img}" alt="${card.nameAr}" style="width:100%;height:100%;object-fit:cover;display:block;">
            <div style="position:absolute;inset:0;background:linear-gradient(to top, rgba(12,13,29,0.92) 0%, transparent 60%);"></div>
            <div style="position:absolute;bottom:12px;right:14px;left:14px;text-align:right;">
              <span style="background:${card.color};color:#fff;font-size:10px;font-weight:900;padding:2px 8px;border-radius:6px;display:inline-block;margin-bottom:4px;">${card.typeAr}</span>
              <h3 style="color:#ffffff;font-size:16px;font-weight:900;margin:0;">${card.nameAr}</h3>
              <small style="color:#cbd5e1;font-size:10px;letter-spacing:1px;">${card.titleEn}</small>
            </div>
          </div>
        </div>
      `;
      setupHoloTilt();
    }

    if (titleBox) {
      titleBox.innerHTML = `
        <div style="text-align:right;animation:fadeIn 0.2s ease;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
            <span style="background:${card.color}22;border:1px solid ${card.color};color:${card.color};font-size:11px;font-weight:900;padding:3px 10px;border-radius:10px;">${card.typeAr}</span>
            <span style="color:#fcd34d;font-size:12px;font-weight:800;">${card.quote}</span>
          </div>
          <h2 style="font-size:22px;font-weight:900;color:#ffffff;margin:4px 0 8px;">${card.nameAr} <small style="font-size:13px;color:#a89bff;font-weight:700;">(${card.titleEn})</small></h2>
          
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:12px 14px;margin-bottom:12px;line-height:1.65;font-size:13px;color:#ddd8ff;">
            <b style="color:#52d9ed;display:block;margin-bottom:4px;">🎯 التأثير المباشر في القاعة:</b>
            ${card.desc}
          </div>

          <div style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:14px;font-size:12px;">
            <div style="background:rgba(142,100,239,0.12);border:1px solid rgba(142,100,239,0.25);border-radius:12px;padding:10px 12px;color:#e9d5ff;">
              <b style="color:#c084fc;">⚡ نصيحة التكتيك:</b> ${card.tactics}
            </div>
            <div style="background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.25);border-radius:12px;padding:10px 12px;color:#bae6fd;">
              <b style="color:#38bdf8;">🛡️ الرد العكسي والصد:</b> ${card.counter}
            </div>
          </div>

          <button type="button" onclick="ScoreARCardsGallery.playCardDemoSound('${card.id}')" style="width:100%;background:linear-gradient(135deg, ${card.color}, #6d28d9);border:none;color:#fff;padding:10px 16px;border-radius:12px;font-size:13px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 16px ${card.color}35;">
            <span>تجربة صوت وتأثير الكارت 🔊</span>
          </button>
        </div>
      `;
    }
  }

  function setupHoloTilt() {
    if (typeof document === 'undefined') return;
    const wrap = document.getElementById('hologramCardWrapper');
    if (!wrap) return;
    wrap.addEventListener('mousemove', (e) => {
      const rect = wrap.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const rotateX = -(y / rect.height) * 20;
      const rotateY = (x / rect.width) * 20;
      wrap.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
    });
    wrap.addEventListener('mouseleave', () => {
      wrap.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
    });
  }

  function selectCard(cardId) {
    selectedId = cardId;
    renderGrid(document.getElementById('cardsGrid'), activeCat, selectedId);
    renderPreview(
      document.getElementById('cardPreviewBox'),
      document.getElementById('cardPreviewInfo'),
      selectedId
    );
  }

  function filterCards(cat) {
    activeCat = cat;
    ['all', 'game_changer', 'attack', 'defense', 'boost'].forEach(c => {
      const btn = document.getElementById('cardTab-' + c);
      if (btn) btn.setAttribute('aria-pressed', String(c === cat));
    });
    renderGrid(document.getElementById('cardsGrid'), activeCat, selectedId);
  }

  function playCardDemoSound(cardId) {
    const c = getCardById(cardId);
    if (global.ScoreARAudio && typeof global.ScoreARAudio.playSfx === 'function') {
      const sfxType = c.cat === 'attack' ? 'wrong' : (c.cat === 'defense' ? 'whoosh' : 'fanfare');
      global.ScoreARAudio.playSfx(sfxType);
    }
    if (global.toast) global.toast(`⚡ تم تفعيل محاكاة: ${c.nameAr}`);
  }

  global.ScoreARCardsGallery = {
    CATEGORIES,
    CARDS,
    getCards,
    getCardById,
    renderGrid,
    renderPreview,
    selectCard,
    filterCards,
    playCardDemoSound
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.ScoreARCardsGallery;
  }
})(typeof window !== 'undefined' ? window : global);
