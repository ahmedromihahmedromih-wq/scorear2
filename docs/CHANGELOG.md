# سجل التغييرات التفصيلي والفروقات (CHANGELOG — ScoreAR v2.1.0)

تم تنفيذ جميع المهام بالترتيب الصارم بعد أخذ نسخة احتياطية كاملة في `backup_20261031_1615` وتهيئة مستودع Git.

## المهمة 1 (حرجة): إزالة الضبابية الكاملة في قاعة الأسئلة وإصلاح كشف الإجابة ولوحة الصدارة الحية
- **الملفات المعدلة**: `index.html`, `package.json`, ومزامنة `public/assets/themes/*/question.webp` من النسخة الحادة `2752×1536`.
- **ما تم تغييره**:
  1. إزالة `backdrop-filter: blur(2px)` من `.hall-graphic-stage[data-env-stage="question"]::before` و`.glass-card` و`#hostLiveRankingsModal`، وخفض `z-index` للعنصر الزائف `::before` إلى `0` مع رفع العناصر الأبناء إلى `z-index: 2` واستخدام تدرج داكن شفاف (`linear-gradient`) خلف المحتوى فقط.
  2. نقل تعريف `defaultCardClasses` إلى النطاق العام وإضافة حارس `isQuestionRoundRevealed` لمنع انهيار `ReferenceError: defaultCardClasses is not defined` في السطر 6899 عند استلام `6/6` إجابات.
  3. تحديث `showLiveRankings()` لعرض الطلاب أصحاب الإجابة الصحيحة مرتبين من الأسرع إلى الأبطأ مع زمن كل طالب بالثواني، يليهم أول 5 متسابقين بالنقاط، مع أزرار واضحة للمعلم للإغلاق أو الانتقال للسؤال التالي.

### الفروقات البرمجية للمهمة 1 (`git diff`):
```diff
diff --git a/index.html b/index.html
index 74a97b1..79f1981 100644
--- a/index.html
+++ b/index.html
@@ -170,10 +170,10 @@
 
     /* Glassmorphism Classes */
     .glass-card {
-      background: rgba(30, 41, 59, 0.75);
-      backdrop-filter: blur(16px);
-      -webkit-backdrop-filter: blur(16px);
-      border: 1px solid rgba(255, 255, 255, 0.1);
+      background: rgba(15, 23, 42, 0.88);
+      backdrop-filter: none;
+      -webkit-backdrop-filter: none;
+      border: 1px solid rgba(255, 255, 255, 0.14);
     }
     .neon-border-indigo {
       box-shadow: 0 0 20px rgba(99, 102, 241, 0.25);
@@ -320,14 +320,22 @@
       background-position: center;
       background-repeat: no-repeat;
       position: relative;
+      isolation: isolate;
     }
     .hall-graphic-stage::before {
       content: "";
       position: absolute;
       inset: 0;
-      background: linear-gradient(180deg, rgba(6, 16, 36, 0.55) 0%, rgba(6, 16, 36, 0.32) 50%, rgba(6, 16, 36, 0.72) 100%);
+      background: linear-gradient(180deg, rgba(6, 16, 36, 0.50) 0%, rgba(6, 16, 36, 0.30) 50%, rgba(6, 16, 36, 0.65) 100%);
       pointer-events: none;
-      z-index: 1;
+      z-index: 0;
+      backdrop-filter: none !important;
+      -webkit-backdrop-filter: none !important;
+      filter: none !important;
+    }
+    .hall-graphic-stage > *:not(.fixed) {
+      position: relative;
+      z-index: 2;
     }
 
 
@@ -553,8 +561,9 @@
       background-position: center 42% !important;
     }
     .hall-graphic-stage[data-env-stage="question"]::before {
-      background: radial-gradient(circle at 50% 35%, rgba(10, 25, 47, 0.58) 0%, rgba(5, 11, 24, 0.88) 85%) !important;
-      backdrop-filter: blur(2px);
+      background: linear-gradient(180deg, rgba(6, 14, 28, 0.52) 0%, rgba(6, 14, 28, 0.36) 50%, rgba(6, 14, 28, 0.68) 100%) !important;
+      backdrop-filter: none !important;
+      -webkit-backdrop-filter: none !important;
     }
     .hall-graphic-stage[data-env-stage="podium"] {
       background-size: 108% auto !important;
@@ -696,9 +705,9 @@
       50% { transform: scale(1.045); }
     }
     .kahoot-ans-dimmed {
-      opacity: 0.3 !important;
-      filter: grayscale(60%) !important;
-      transform: scale(0.97) !important;
+      opacity: 0.72 !important;
+      filter: none !important;
+      transform: scale(0.98) !important;
       pointer-events: none !important;
     }
     .dist-bar-fill {
@@ -2078,29 +2087,34 @@
     </section>
 
     <!-- FLOATING LIVE RANKINGS MODAL (ACCESSIBLE ANYTIME BY HOST WITHOUT DISTURBING QUESTION OR RESETTING TIMER) -->
-    <div id="hostLiveRankingsModal" class="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[75] hidden flex flex-col items-center justify-center p-4 sm:p-6">
-      <div class="max-w-2xl w-full navy-bar border-4 border-amber-400 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col" style="background: rgba(16, 26, 46, 0.98);">
-        <div class="flex items-center justify-between border-b border-white/15 pb-3">
+    <div id="hostLiveRankingsModal" class="fixed inset-0 bg-slate-950/85 z-[75] hidden flex flex-col items-center justify-center p-4 sm:p-6" style="backdrop-filter: none; -webkit-backdrop-filter: none;">
+      <div class="max-w-3xl w-full navy-bar border-4 border-amber-400 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[88vh] flex flex-col" style="background: rgba(12, 21, 38, 0.98);">
+        <div class="flex items-center justify-between border-b border-white/15 pb-3 gap-2 flex-wrap">
           <div class="flex items-center gap-3">
             <span class="text-2xl">📊</span>
             <div>
-              <h3 class="text-xl font-black text-white">لوحة الصدارة المباشرة الحالية</h3>
-              <p class="text-xs text-amber-300 font-bold">الترتيب اللحظي دون إيقاف السؤال أو فقدان إجابات المتسابقين</p>
+              <h3 class="text-lg sm:text-xl font-black text-white">لوحة الصدارة الحية ونتائج السرعة</h3>
+              <p id="hostLiveRankingsSub" class="text-xs text-amber-300 font-bold">أصحاب الإجابة الصحيحة من الأسرع للأبطأ بالثواني + أول 5 بالنقاط</p>
             </div>
           </div>
-          <button type="button" onclick="closeLiveRankingsOverlay()" class="btn-3d bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2 rounded-xl shadow-md transition transform active:scale-95 flex items-center gap-1">
-            <span>العودة للسؤال ↩️</span>
-          </button>
+          <div class="flex items-center gap-2">
+            <button type="button" onclick="closeLiveRankingsOverlay()" class="btn-3d bg-slate-700 hover:bg-slate-600 text-white font-black text-xs px-4 py-2 rounded-xl shadow-md transition transform active:scale-95 flex items-center gap-1">
+              <span>إغلاق والعودة للسؤال ↩️</span>
+            </button>
+            <button type="button" id="btnModalNextQuestion" onclick="closeLiveRankingsOverlay(); goToLeaderboardOrNext();" class="btn-3d bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs 
```

## المهمة 2: إعادة بناء بنية قاعة الأسئلة بـ CSS Grid بارتفاع `100dvh` ودون Scroll
- **الملفات المعدلة**: `index.html`.
- **ما تم تغييره**:
  1. إعادة هيكلة `#view-host-game` إلى شبكة `CSS Grid` بارتفاع `100dvh` وعرض `100vw` كامل للشاشة بدون أشرطة جانبية ملونة وبدون أي تمرير رأسي (`overflow: hidden`) بالترتيب الإلزامي المكون من 4 صفوف:
     - الصف 1 (`#hostTopThinBar`): شريط علوي رفيع يضم رقم السؤال، المؤقت الدائري، وعدّاد الإجابات (`6/6`).
     - الصف 2 (`#hostQuestionCard`): بطاقة السؤال بخط متجاوب عبر `clamp()`.
     - الصف 3 (`#hostAnswersGrid`): شبكة الاختيارات مباشرة أسفل بطاقة السؤال دون أي عنصر فاصل بينهما.
     - الصف 4 (`#hostBottomControlBar`): شريط تحكم المعلم الثابت والصغير في أسفل الشاشة مع الحفاظ على كافة الأزرار ووظائفها.
  2. ضبط شاشة الطالب (`#view-student` / `#studentGameActiveScreen`) على الهاتف بارتفاع `100dvh` لتظهر الاختيارات الأربعة كاملة دون أي Scroll.

### الفروقات البرمجية للمهمة 2 (`git diff`):
```diff
diff --git a/index.html b/index.html
index 79f1981..fbce5cf 100644
--- a/index.html
+++ b/index.html
@@ -754,6 +754,140 @@
       box-shadow: 0 0 15px rgba(99, 102, 241, 0.3) !important;
     }
 
+
+    /* =========================================================================
+       TASK 2: 100dvh ZERO-SCROLL CSS GRID FOR QUESTION HALL & STUDENT SCREEN
+       ========================================================================= */
+    body[data-active-view="host-game"] {
+      height: 100dvh !important;
+      max-height: 100dvh !important;
+      overflow: hidden !important;
+      background: #050b18 !important;
+    }
+    body[data-active-view="host-game"] > header,
+    body[data-active-view="host-game"] > footer,
+    body[data-active-view="host-game"] > #globalRejoinBanner {
+      display: none !important;
+    }
+    body[data-active-view="host-game"] > main#appContainer {
+      height: 100dvh !important;
+      max-height: 100dvh !important;
+      overflow: hidden !important;
+      margin: 0 !important;
+      padding: 0 !important;
+    }
+    #view-host-game:not(.hidden) {
+      display: grid !important;
+      grid-template-rows: auto minmax(0, auto) minmax(0, 1fr) auto;
+      width: 100vw !important;
+      max-width: 100vw !important;
+      height: 100dvh !important;
+      max-height: 100dvh !important;
+      overflow: hidden !important;
+      margin: 0 !important;
+      padding: clamp(0.45rem, 1.1vh, 0.9rem) clamp(0.75rem, 2vw, 1.75rem) !important;
+      gap: clamp(0.45rem, 1.1vh, 0.9rem) !important;
+      border-radius: 0 !important;
+      box-sizing: border-box !important;
+    }
+    #view-host-game .host-stage-bg-img {
+      position: absolute;
+      inset: 0;
+      width: 100%;
+      height: 100%;
+      object-fit: cover;
+      object-position: center;
+      z-index: 0 !important;
+      pointer-events: none;
+    }
+    #view-host-game::before {
+      z-index: 1 !important;
+    }
+    #view-host-game > *:not(.fixed):not(.host-stage-bg-img) {
+      position: relative;
+      z-index: 2 !important;
+    }
+    #hostTopThinBar {
+      min-height: 0;
+    }
+    #hostQuestionCard {
+      max-width: min(1400px, 96vw) !important;
+      margin: 0 auto !important;
+      padding: clamp(0.75rem, 1.8vh, 1.5rem) clamp(1rem, 2.5vw, 2.25rem) !important;
+    }
+    #hostQuestionText {
+      font-size: clamp(1.3rem, 2.4vw, 2.35rem) !important;
+      line-height: 1.35 !important;
+    }
+    #hostAnswersGrid {
+      max-width: min(1400px, 96vw) !important;
+      margin: 0 auto !important;
+      min-height: 0 !important;
+      height: 100% !important;
+      display: grid !important;
+      grid-template-columns: repeat(2, minmax(0, 1fr));
+      grid-template-rows: repeat(2, minmax(0, 1fr));
+      gap: clamp(0.5rem, 1.2vh, 1rem) !important;
+      align-content: stretch;
+    }
+    #hostAnswersGrid .kahoot-ans-card,
+    #hostAnswersGrid .kahoot-ans-correct {
+      min-height: 0 !important;
+      height: 100% !important;
+      padding: clamp(0.65rem, 1.5vh, 1.35rem) clamp(0.85rem, 1.8vw, 1.5rem) !important;
+      display: flex !important;
+      align-items: center !important;
+    }
+    #hostAnswersGrid [id^="hostAnsText-"] {
+      font-size: clamp(1.05rem, 1.75vw, 1.6rem) !important;
+      line-height: 1.3 !important;
+    }
+    @media (max-width: 767px) {
+      #hostAnswersGrid {
+        grid-template-columns: 1fr !important;
+        grid-template-rows: repeat(4, minmax(0, 1fr)) !important;
+        gap: 0.45rem !important;
+      }
+      #hostQuestionText {
+        font-size: clamp(1.1rem, 4.2vw, 1.5rem) !important;
+      }
+      #hostAnswersGrid [id^="hostAnsText-"] {
+        font-size: clamp(0.95rem, 3.6vw, 1.2rem) !important;
+      }
+    }
+    /* Student Active Question Mobile Fit (Zero Scroll) */
+    body[data-active-view="student"] > footer {
+      display: none !important;
+    }
+    body[data-active-view="student"] {
+      min-height: 100dvh !important;
+    }
+    #view-student:not(.hidden) {
+      height: calc(100dvh - 4rem) !important;
+      max-height: calc(100dvh - 4rem) !important;
+      padding: 0.5rem 0.75rem !important;
+      overflow-y: auto;
+    }
+    #studentGameActiveScreen:not(.hidden) {
+      height: 100% !important;
+      max-height: 100% !important;
+      overflow: hidden !important;
+      display: grid !important;
+      grid-template-rows: auto auto minmax(0, 1fr) auto !important;
+      gap: 0.5rem !important;
+      padding: 0.5rem !important;
+    }
+    #studentButtonsContainer:not(.hidden) {
+      height: 100% !important;
+      min-height: 0 !important;
+      margin: 0 !important;
+      gap: 0.6rem !important;
+    }
+    #studentLiveQuestionTitle {
+      font-size: clamp(1rem, 3.8vw, 1.35rem) !important;
+      line-height: 1.3 !important;
+    }
+
   </style>
 </head>
 <body data-surface-mode="admin" class="bg-white text-slate-900 min-h-screen flex flex-col antialiased selection:bg-
```

## المهمة 3: إصلاح أيقونات اللاعبين في اللوبي وإنشاء الأيقونات المصغرة `256×256`
- **الملفات المعدلة**: `index.html` وإنشاء `assets/characters/avatars/char_01.webp` … `char_24.webp`.
- **ما تم تغييره**:
  1. توليد 24 صورة أيقونة مصغرة بأبعاد `256×256` مقصوصة لأعلى الشخصية (الوجه والكتفين) داخل `assets/characters/avatars/` دون المساس بالملفات الأصلية.
  2. تعديل `renderHostLobby()` لعرض كل لاعب داخل دائرة كاملة (`border-radius: 50%`, `object-fit: cover`, `object-position: top`) دون أي مربع أو بطاقة بيضاء حولها.
  3. استخدام الأيقونات المصغرة `assets/characters/avatars/` في اللوبي والدوائر الصغيرة، والصورة الكاملة `assets/characters/` في بطاقات المعاينة الكبيرة ومنصة التتويج.

### الفروقات البرمجية للمهمة 3 (`git diff`):
```diff
diff --git a/index.html b/index.html
index fbce5cf..d9ae3ed 100644
--- a/index.html
+++ b/index.html
@@ -578,16 +578,17 @@
       position: relative;
       width: 100%;
       height: 100%;
-      border-radius: 9999px;
-      overflow: hidden;
-      box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.35), 0 6px 14px rgba(0, 0, 0, 0.45);
+      border-radius: 50% !important;
+      overflow: hidden !important;
+      box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.35), 0 8px 18px rgba(0, 0, 0, 0.55);
       background: radial-gradient(circle at 30% 30%, #1e3a8a, #0a192f);
     }
     .char-3d-portrait-img {
       width: 100%;
       height: 100%;
-      object-fit: cover;
-      border-radius: 9999px;
+      object-fit: cover !important;
+      object-position: top center !important;
+      border-radius: 50% !important;
       transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
     }
     .char-3d-portrait-wrap:hover .char-3d-portrait-img {
@@ -856,17 +857,26 @@
       }
     }
     /* Student Active Question Mobile Fit (Zero Scroll) */
-    body[data-active-view="student"] > footer {
+    body[data-active-view="student"] > header,
+    body[data-active-view="student"] > footer,
+    body[data-active-view="student"] > #globalRejoinBanner {
       display: none !important;
     }
     body[data-active-view="student"] {
-      min-height: 100dvh !important;
+      height: 100dvh !important;
+      max-height: 100dvh !important;
+      width: 100vw !important;
+      max-width: 100vw !important;
+      overflow: hidden !important;
     }
     #view-student:not(.hidden) {
-      height: calc(100dvh - 4rem) !important;
-      max-height: calc(100dvh - 4rem) !important;
+      height: 100dvh !important;
+      max-height: 100dvh !important;
+      width: 100% !important;
+      max-width: 28rem !important;
       padding: 0.5rem 0.75rem !important;
       overflow-y: auto;
+      overflow-x: hidden !important;
     }
     #studentGameActiveScreen:not(.hidden) {
       height: 100% !important;
@@ -3831,22 +3841,29 @@
       none: ''
     };
 
-    const AVATAR_SVGS = SCOREAR_24_CHARS_RAW.map(ch => ({
-      id: ch.id,
-      code: ch.code,
-      name: ch.name,
-      title: ch.title,
-      category: ch.category,
-      world: ch.world || 'royal',
-      worldName: ch.worldName || 'القصر الملكي',
-      stats: ch.stats || { iq: 90, speed: 90, focus: 90, luck: 90 },
-      ability: ch.ability || 'عقل مفكر وسرعة بديهة',
-      lore: ch.lore || 'بطل مميز في مسابقات سكور التعليمية.',
-      image: ch.image,
-      file: ch.file,
-      color: ch.category === 'human' ? 'bg-sky-500/20 text-sky-300 border-sky-400' : (ch.category === 'animal' ? 'bg-amber-500/20 text-amber-300 border-amber-400' : 'bg-purple-500/20 text-purple-300 border-purple-400'),
-      svg: '<div class="char-3d-portrait-wrap"><img src="' + ch.image + '" alt="' + ch.name + '" class="char-3d-portrait-img" loading="lazy"></div>'
-    }));
+    const AVATAR_SVGS = SCOREAR_24_CHARS_RAW.map(ch => {
+      const avatarPath = 'assets/characters/avatars/' + ch.code + '.webp';
+      const fullPath = 'assets/characters/' + ch.code + '.webp';
+      return {
+        id: ch.id,
+        code: ch.code,
+        name: ch.name,
+        title: ch.title,
+        category: ch.category,
+        world: ch.world || 'royal',
+        worldName: ch.worldName || 'القصر الملكي',
+        stats: ch.stats || { iq: 90, speed: 90, focus: 90, luck: 90 },
+        ability: ch.ability || 'عقل مفكر وسرعة بديهة',
+        lore: ch.lore || 'بطل مميز في مسابقات سكور التعليمية.',
+        image: ch.image,
+        avatarUrl: avatarPath,
+        fullUrl: fullPath,
+        file: ch.file,
+        color: ch.category === 'human' ? 'bg-sky-500/20 text-sky-300 border-sky-400' : (ch.category === 'animal' ? 'bg-amber-500/20 text-amber-300 border-amber-400' : 'bg-purple-500/20 text-purple-300 border-purple-400'),
+        svg: '<div class="char-3d-portrait-wrap" style="border-radius:50%;overflow:hidden;"><img src="' + avatarPath + '" onerror="this.onerror=null;this.src=\'' + ch.image + '\'" alt="' + ch.name + '" class="char-3d-portrait-img" style="border-radius:50%;object-fit:cover;object-position:top;" loading="lazy"></div>',
+        fullSvg: '<div class="char-3d-portrait-wrap" style="border-radius:50%;overflow:hidden;"><img src="' + fullPath + '" onerror="this.onerror=null;this.src=\'' + ch.image + '\'" alt="' + ch.name + '" class="char-3d-portrait-img" style="border-radius:50%;object-fit:cover;object-position:top;" loading="lazy"></div>'
+      };
+    });
 
     /* Extensible 3D Character Registry (Allows adding future 3D characters without rebuilding) */
     
@@ -3949,7 +3966,7 @@
       const avatarBox = document.getElementById('charInspectorAvatarBox');
       if (avatarBox) {
         avatarBox.className = 'w-28 h-28 rounded-full p-1.5 shadow-2xl relative flex items-center justify-center avatar-alive ' + rank.frameClass;
-        avatarBox.innerHTML = av.svg;
+      
```

## المهمة 4: دمج الأصول الخارجية، وملف `worlds.js`، والفيديو الافتتاحي، والصوتيات (`Howler.js`)، ولوحة الفحص (`?debug=assets`)
- **الملفات المضافة/المعدلة**: `worlds.js`, `index.html`, `build.js`, `assets/worlds/*/{lobby,question,podium}_{1920,1280}.webp`, `assets/videos/poster.webp`.
- **ما تم تغييره**:
  1. إنشاء ملف `worlds.js` المركزي لربط العوالم الستة بشاشاتها الخمس (`lobby`, `waiting`, `question`, `results`, `podium`) مع نسخ `1920w` و`1280w` WebP والرجوع التلقائي لـ `lobby.webp` لنفس العالم مع تسجيل تحذير عند غياب `waiting` أو `results`، وحفظ `worldId` في الغرفة وFirebase و`localStorage`.
  2. دمج الفيديو الافتتاحي `assets/videos/intro.mp4` مع `poster.webp` وشاشة "ابدأ" بنقرة واحدة تفتح الصوت والفيديو و`AudioContext`، وزر تخطٍّ واضح، وعدم التحميل التلقائي على الهاتف (`preload="none"`).
  3. ربط جميع ملفات الموسيقى (`assets/audio/music/*.wav`) والمؤثرات الصوتية السبعة (`assets/audio/sfx/*.wav`) عبر `Howler.js` مع انتقال متدرج `Crossfade` في آخر 5 ثوانٍ من السؤال إلى `tension.wav`، وقصر أجهزة الطلاب على المؤثرات فقط.
  4. إضافة لوحة الفحص المخفية افتراضيًا التي تُفتح عبر `?debug=assets` وإضافة رقم الإصدار `?v=2.1.0` لكافة روابط الأصول.

### الفروقات البرمجية للمهمة 4 (`git diff`):
```diff
diff --git a/index.html b/index.html
index d9ae3ed..69e4f72 100644
--- a/index.html
+++ b/index.html
@@ -28,6 +28,166 @@
   <!-- MQTT for Zero-Config Realtime Fallback -->
   <script src="https://unpkg.com/mqtt@5.3.5/dist/mqtt.min.js"></script>
   
+  <!-- Howler.js Audio Engine for Music & Crossfade -->
+  <script src="https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.4/howler.min.js"></script>
+
+  <!-- Centralized Worlds & Assets Configuration -->
+  <script src="worlds.js?v=2.1.0"></script>
+  <script>
+    if (typeof window.ScoreARWorlds === 'undefined') {
+/**
+ * ScoreAR v2.1.0 — Centralized Worlds & Assets Configuration (worlds.js)
+ * Maps each of the 6 worlds (royal, oasis, cosmic, treasure, stadium, magic)
+ * to its colors, 5 screen backgrounds (lobby, waiting, question, results, podium)
+ * with 1920w and 1280w WebP responsive variants + same-world lobby fallback,
+ * and calm/tense music tracks.
+ */
+(function(global) {
+  const CACHE_VER = '2.1.0';
+  global.SCOREAR_CACHE_VERSION = CACHE_VER;
+
+  const DEBUG_STATE = {
+    enabled: false,
+    currentWorldId: 'royal',
+    currentStage: 'lobby',
+    activeBgUrl: '',
+    activeBgDimensions: '—',
+    activeMusicTrack: 'متوقفة',
+    failedAssets: [],
+    warnings: []
+  };
+  global.SCOREAR_ASSET_DEBUG = DEBUG_STATE;
+
+  function makeWorldEntry(worldId, name, englishName, icon, colors) {
+    const baseDir = 'assets/worlds/' + worldId;
+    const mkBg = (screenFile, isFallback, requestedScreen) => ({
+      requestedScreen: requestedScreen || screenFile,
+      actualScreen: screenFile,
+      isFallbackToLobby: Boolean(isFallback),
+      original: baseDir + '/' + screenFile + '.webp?v=' + CACHE_VER,
+      w1920: baseDir + '/' + screenFile + '_1920.webp?v=' + CACHE_VER,
+      w1280: baseDir + '/' + screenFile + '_1280.webp?v=' + CACHE_VER,
+      jpg: baseDir + '/' + screenFile + '.jpg?v=' + CACHE_VER
+    });
+
+    return {
+      worldId: worldId,
+      name: name,
+      englishName: englishName,
+      icon: icon,
+      colors: colors,
+      backgrounds: {
+        lobby: mkBg('lobby', false, 'lobby'),
+        waiting: mkBg('lobby', true, 'waiting'),
+        question: mkBg('question', false, 'question'),
+        results: mkBg('lobby', true, 'results'),
+        podium: mkBg('podium', false, 'podium')
+      },
+      music: {
+        lobby: 'assets/audio/music/lobby.wav?v=' + CACHE_VER,
+        waiting: 'assets/audio/music/lobby.wav?v=' + CACHE_VER,
+        calm: 'assets/audio/music/' + worldId + '.wav?v=' + CACHE_VER,
+        tense: 'assets/audio/music/tension.wav?v=' + CACHE_VER,
+        podium: 'assets/audio/music/' + worldId + '.wav?v=' + CACHE_VER
+      }
+    };
+  }
+
+  const WORLDS = {
+    royal: makeWorldEntry('royal', 'القصر الملكي', 'Royal Palace', '🏰', {
+      primary: '#1E3A8A', accent: '#F5C76B', bg: '#080D1A', card: 'rgba(16, 26, 46, 0.92)',
+      border: '#F59E0B', glow: 'rgba(245, 199, 107, 0.45)', text: '#F8FAFC', badge: '#F5C76B'
+    }),
+    oasis: makeWorldEntry('oasis', 'الواحة العربية', 'Arabian Oasis', '🌴', {
+      primary: '#065F46', accent: '#34D399', bg: '#061A14', card: 'rgba(10, 35, 28, 0.92)',
+      border: '#10B981', glow: 'rgba(52, 211, 153, 0.45)', text: '#F8FAFC', badge: '#34D399'
+    }),
+    cosmic: makeWorldEntry('cosmic', 'محطة الفضاء', 'Cosmic Space Station', '🚀', {
+      primary: '#4F46E5', accent: '#22D3EE', bg: '#050816', card: 'rgba(15, 23, 42, 0.92)',
+      border: '#06B6D4', glow: 'rgba(34, 211, 238, 0.50)', text: '#F8FAFC', badge: '#22D3EE'
+    }),
+    treasure: makeWorldEntry('treasure', 'جزيرة الكنز', 'Treasure Island', '🏴‍☠️', {
+      primary: '#9A3412', accent: '#FBBF24', bg: '#140C06', card: 'rgba(30, 20, 10, 0.92)',
+      border: '#D97706', glow: 'rgba(251, 191, 36, 0.45)', text: '#F8FAFC', badge: '#FBBF24'
+    }),
+    stadium: makeWorldEntry('stadium', 'استاد الأبطال', 'Champions Stadium', '🏟️', {
+      primary: '#15803D', accent: '#38BDF8', bg: '#051A0D', card: 'rgba(12, 35, 20, 0.92)',
+      border: '#22C55E', glow: 'rgba(56, 189, 248, 0.50)', text: '#F8FAFC', badge: '#38BDF8'
+    }),
+    magic: makeWorldEntry('magic', 'مملكة السحر', 'Magic Kingdom', '🔮', {
+      primary: '#7E22CE', accent: '#F472B6', bg: '#130826', card: 'rgba(25, 12, 45, 0.92)',
+      border: '#A855F7', glow: 'rgba(244, 114, 182, 0.45)', text: '#F8FAFC', badge: '#F472B6'
+    })
+  };
+
+  global.SCOREAR_WORLDS_CONFIG = WORLDS;
+
+  function logWarning(msg) {
+    console.warn('[ScoreAR Asset Warning]', msg);
+    if (!DEBUG_STATE.warnings.includes(msg)) {
+      DEBUG_STATE.warnings.push(msg);
+    }
+    if (typeof global.refreshAssetDebugPanel === 'function') {
+      global.refreshAssetDebugPanel();
+    }
+  }
+
+  function logFailedAsset(assetPath, reason) {
+    const entry = assetPath + (reason ? ' (' + reason + ')' : '');
+    console.error('[ScoreAR Asset Error] Failed to load:', entry);
+    if (!DEBUG_STATE.failedAssets.includes(entry)) {
+      DEBUG_STATE.fail
```
