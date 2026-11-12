# جرد الأصول وجداول المطابقة (ASSET_MANIFEST — ScoreAR v2.1.0)

## 1. خلفيات العوالم الستة (`assets/themes/` و`assets/worlds/`)
تم الحفاظ على الملفات الأصلية عالية الدقة (`2752×1536`) وتوليد نسخ متجاوبة بعرض `1920×1072` (`_1920.webp`) و`1280×714` (`_1280.webp`) لكل عالم، مع نقل النسخ القديمة منخفضة الدقة (`1376×768`) إلى `assets_old/`.

| العالم (`worldId`) | الشاشة | المسار الأصلي (`2752×1536`) | نسخ العرض المتجاوبة (`srcset` / `image-set`) | الحالة وموضع الاستخدام |
| :--- | :--- | :--- | :--- | :--- |
| `royal` (القصر الملكي) | `lobby`, `question`, `podium` | `assets/worlds/royal/{lobby,question,podium}.webp` | `*_1920.webp`, `*_1280.webp` | مستخدم في `worlds.js` و`index.html:applyThemeEnvironment` |
| `oasis` (الواحة العربية) | `lobby`, `question`, `podium` | `assets/worlds/oasis/{lobby,question,podium}.webp` | `*_1920.webp`, `*_1280.webp` | مستخدم في `worlds.js` و`index.html:applyThemeEnvironment` |
| `cosmic` (محطة الفضاء) | `lobby`, `question`, `podium` | `assets/worlds/cosmic/{lobby,question,podium}.webp` | `*_1920.webp`, `*_1280.webp` | مستخدم في `worlds.js` و`index.html:applyThemeEnvironment` |
| `treasure` (جزيرة الكنز) | `lobby`, `question`, `podium` | `assets/worlds/treasure/{lobby,question,podium}.webp` | `*_1920.webp`, `*_1280.webp` | مستخدم في `worlds.js` و`index.html:applyThemeEnvironment` |
| `stadium` (استاد الأبطال) | `lobby`, `question`, `podium` | `assets/worlds/stadium/{lobby,question,podium}.webp` | `*_1920.webp`, `*_1280.webp` | مستخدم في `worlds.js` و`index.html:applyThemeEnvironment` |
| `magic` (مملكة السحر) | `lobby`, `question`, `podium` | `assets/worlds/magic/{lobby,question,podium}.webp` | `*_1920.webp`, `*_1280.webp` | مستخدم في `worlds.js` و`index.html:applyThemeEnvironment` |
| جميع العوالم الستة | `waiting`, `results` | غير متوفرة كملفات منفصلة في الحزمة | ترجع تلقائيًا إلى `lobby_1920.webp` / `lobby_1280.webp` لنفس العالم | رجوع آمن لنفس العالم مع تحذير في `worlds.js` ولوحة `?debug=assets` |

---

## 2. ملفات الموسيقى والمؤثرات الصوتية (`assets/audio/`)

| الملف المرفوع | النوع والمدة | الحجم | الدور في المشروع (`worlds.js` / `REAL_SFX_MAP`) |
| :--- | :--- | :--- | :--- |
| `assets/audio/music/lobby.wav` | WAV (`3.00s`, 44.1kHz) | 264,644 بايت | موسيقى اللوبي (`music_lobby`) والانتظار (`music_waiting`) |
| `assets/audio/music/royal.wav` | WAV (`3.00s`, 44.1kHz) | 264,644 بايت | موسيقى عالم القصر الملكي الهادئة (`music_royal_calm`) والتتويج |
| `assets/audio/music/oasis.wav` | WAV (`3.00s`, 44.1kHz) | 264,644 بايت | موسيقى عالم الواحة الهادئة (`music_oasis_calm`) |
| `assets/audio/music/cosmic.wav` | WAV (`3.00s`, 44.1kHz) | 264,644 بايت | موسيقى عالم الفضاء الهادئة (`music_cosmic_calm`) |
| `assets/audio/music/treasure.wav` | WAV (`3.00s`, 44.1kHz) | 264,644 بايت | موسيقى عالم جزيرة الكنز الهادئة (`music_treasure_calm`) |
| `assets/audio/music/stadium.wav` | WAV (`3.00s`, 44.1kHz) | 264,644 بايت | موسيقى عالم استاد الأبطال الهادئة (`music_stadium_calm`) |
| `assets/audio/music/magic.wav` | WAV (`3.00s`, 44.1kHz) | 264,644 بايت | موسيقى عالم مملكة السحر الهادئة (`music_magic_calm`) |
| `assets/audio/music/tension.wav` | WAV (`2.00s`, 44.1kHz) | 176,444 بايت | الموسيقى المتوترة في آخر 5 ثوانٍ من السؤال (`music_{world}_tense` عبر Crossfade) |
| `assets/audio/sfx/correct.wav` | WAV (`0.60s`, 44.1kHz) | 52,964 بايت | مؤثر الإجابة الصحيحة (`sfx_correct`) |
| `assets/audio/sfx/wrong.wav` | WAV (`0.50s`, 44.1kHz) | 44,144 بايت | مؤثر الإجابة الخاطئة وانتهاء الوقت (`sfx_wrong`) |
| `assets/audio/sfx/countdown.wav` | WAV (`0.15s`, 44.1kHz) | 13,274 بايت | مؤثر العد التنازلي (`sfx_countdown_tick`) |
| `assets/audio/sfx/fanfare.wav` | WAV (`1.80s`, 44.1kHz) | 158,804 بايت | مؤثر الفوز والتتويج وكشف الترتيب (`sfx_win` / `sfx_reveal`) |
| `assets/audio/sfx/whoosh.wav` | WAV (`0.35s`, 44.1kHz) | 30,912 بايت | مؤثر الانتقال بين الأسئلة والشاشات (`sfx_whoosh`) |
| `assets/audio/sfx/pop.wav` | WAV (`0.12s`, 44.1kHz) | 10,628 بايت | مؤثر الفقاعات والظهور (`sfx_pop`) |
| `assets/audio/sfx/click.wav` | WAV (`0.05s`, 44.1kHz) | 4,454 بايت | مؤثر النقرات واختيار الإجابة (`click` / `answer_select`) |

---

## 3. الفيديو الافتتاحي (`assets/videos/`)

| الملف | النوع والأبعاد / المدة | الحجم | الدور في المشروع |
| :--- | :--- | :--- | :--- |
| `assets/videos/intro.mp4` | MP4 (`1280×720`, `51.42s`, 24fps) | 3,036,710 بايت | فيديو الافتتاحية للمعلم قبل اللوبي (`#hostCinematicVideo`) |
| `assets/videos/intro.webm` | WebM (`1280×720`, `51.42s`, 24fps) | 9,671,616 بايت | صيغة بديلة لفيديو الافتتاحية |
| `assets/videos/poster.webp` | WebP (`1280×720`) | مستخرج من `scene_0.jpg` | صورة غلاف الفيديو (`poster`) قبل النقر على زر "ابدأ" |

---

## 4. الشخصيات الـ 24 (`assets/characters/` و`assets/characters/avatars/`) وتقرير الخلفيات غير الشفافة
- جميع ملفات الشخصيات الـ 24 (`char_01.webp` … `char_24.webp`) بأبعاد `240×240`، وتم إنشاء نسخ الأيقونات المصغرة بأبعاد `256×256` (قصّ أعلى الشخصية) في `assets/characters/avatars/char_01.webp` … `char_24.webp` دون تعديل الملفات الأصلية.
- **تقرير الخلفيات غير الشفافة (بناءً على طلبك في المهمة 3 دون تعديلها)**:
  1. **ملفات بخلفية بيضاء صلبة (`RGB` غير شفافة)**:
     - `assets/characters/ahmed_character_sheet.jpg` (`2048×2048`، لون الزاوية `#FDFDFD`)
     - `assets/characters/teacher_ahmed.jpg` و`assets/images/teacher_ahmed.jpg` (`512×512`، لون الزاوية `#FBFBFB`)
     - `assets/characters/teacher_ahmed.webp` و`assets/images/teacher_ahmed.webp` (`512×512`، لون الزاوية `#FCFBFC`)
  2. **ملفات شخصيات بصيغة `RGB` بدون قناة شفافية Alpha (خلفية داكنة خارج الدائرة)**:
     - `char_01.webp` إلى `char_16.webp`: زوايا الصورة خارج الإطار الدائري بلون كحلي داكن (`#070B11` إلى `#151F27`).
     - `char_17.webp` إلى `char_24.webp`: زوايا الصورة خارج الإطار الدائري بلون رمادي داكن (`#1F1F23`).
     *(ملاحظة: عند عرضها بـ `border-radius: 50%` و`object-fit: cover` تختفي الزوايا الخارجية تمامًا).*

---

## 5. الكروت التفاعلية الـ 12 (`cards/` و`assets/cards/`)

| ملف الكرت | المعرّف في الكود (`id`) | الاسم بالعربية | الأبعاد والحجم |
| :--- | :--- | :--- | :--- |
| `cards/card_swap_student.jpg` | `card_swap_student` | تبديل طالب | `380×380` (34,611 بايت) |
| `cards/card_minus_50.jpg` | `card_minus_50` | خصم 50 نقطة | `380×380` (35,656 بايت) |
| `cards/card_block_draw.jpg` | `card_block_draw` | حظر سحب كرت | `380×380` (36,985 بايت) |
| `cards/card_free_gift.jpg` | `card_free_gift` | هدية مجانية | `380×380` (33,470 بايت) |
| `cards/card_pin_student.jpg` | `card_pin_student` | تثبيت طالب | `380×380` (35,465 بايت) |
| `cards/card_ask_question.jpg` | `card_ask_question` | تحدي السؤال | `380×380` (32,129 بايت) |
| `cards/card_better_luck.jpg` | `card_better_luck` | حظ أوفر المرة القادمة | `380×380` (30,892 بايت) |
| `cards/card_plus_50.jpg` | `card_plus_50` | إضافة 50 نقطة | `380×380` (35,206 بايت) |
| `cards/card_unpin_student.jpg` | `card_unpin_student` | فك التثبيت | `380×569` (60,921 بايت) |
| `cards/card_reverse_judge.jpg` | `card_reverse_judge` | عكس الحكم | `380×380` (35,062 بايت) |
| `cards/card_draw_all.jpg` | `card_draw_all` | سحب جميع الكروت | `380×380` (37,615 بايت) |
| `cards/card_stop_swap.jpg` | `card_stop_swap` | درع إيقاف التبديل | `380×380` (37,756 بايت) |
