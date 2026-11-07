# CREDITS.md — مصادر ومكتبات وتراخيص منصة سكور آر (ScoreAR)
> منصة «سكور آر | ScoreAR» — من محتوى الدرس إلى رحلة تعلم ومنافسة داخل الفصل.
> آخر تحديث: 4 نوفمبر 2026 | الإصدار النهائي: v7.0.0

---

## 1. المكتبات والأطر البرمجية المفتوحة المصدر (Open Source Libraries)

| المكتبة / الأداة | الإصدار | الرخصة | الرابط المرجعي | الاستخدام في المنصة |
|---|---|---|---|---|
| **Tailwind CSS** | 3.4.1 | MIT | [tailwindcss.com](https://tailwindcss.com) | نظام التصميم الحديث والألوان والشبكة المتجاوبة |
| **Firebase Web SDK** | 10.8.0 | Apache 2.0 | [firebase.google.com](https://firebase.google.com) | المصادقة وقواعد البيانات اللحظية (RTDB + Firestore) |
| **SheetJS (xlsx)** | 0.18.5 | Apache 2.0 | [sheetjs.com](https://sheetjs.com) | محرك استيراد وتصدير ملفات Excel و CSV |
| **Mammoth.js** | 1.6.0 | BSD-2-Clause | [github.com/mwilliamson/mammoth.js](https://github.com/mwilliamson/mammoth.js) | استخراج ومعالجة نصوص ملفات Word (.docx) |
| **PDF.js** | 3.11.174 | Apache 2.0 | [mozilla.github.io/pdf.js](https://mozilla.github.io/pdf.js) | معالجة ملفات الكتب والمذكرات الدراسية PDF |
| **JSZip** | 3.10.1 | MIT / GPLv3 | [stuk.github.io/jszip](https://stuk.github.io/jszip) | فك ضغط ملفات PPTX والشرائح التعليمية |
| **Tesseract.js** | 5.0.4 | Apache 2.0 | [tesseract.projectnaptha.com](https://tesseract.projectnaptha.com) | محرك التعرف الضوئي على النصوص والصور العربية (OCR) |
| **KaTeX** | 0.16.9 | MIT | [katex.org](https://katex.org) | تنسيق وعرض المعادلات الرياضية والرموز العلمية بسرعة فائقة |
| **GSAP (GreenSock)** | 3.12.5 | GreenSock Standard | [greensock.com](https://greensock.com) | الحركات الميكروية المتطورة ومؤثرات التتويج والمنصة |
| **Canvas Confetti** | 1.9.2 | ISC | [github.com/catdad/canvas-confetti](https://github.com/catdad/canvas-confetti) | مؤثرات الاحتفال وقصاصات الورق الملونة للمراكز الأولى |
| **Howler.js** | 2.2.4 | MIT | [howlerjs.com](https://howlerjs.com) | إدارة وتشغيل الموسيقى التصويرية التفاعلية والمؤثرات الصوتية |

---

## 2. الخطوط الطباعية المرخصة (Licensed Web Fonts)

جميع الخطوط المستخدمة في المنصة مرخصة عبر رخصة الخطوط المفتوحة SIL Open Font License (OFL):
- **Cairo:** خط العناوين والنصوص العربية المعاصرة من Google Fonts.
- **Tajawal:** خط الواجهات والأزرار الهادئة من Google Fonts.
- **Fredoka:** خط الأرقام والمؤشرات الكرتونية اللطيفة من Google Fonts.
- **Quicksand:** خط الحروف والرموز الإنجليزية من Google Fonts.

---

## 3. الأصول البصرية والشخصيات والعوالم

- **العوالم الستة (The 6 Worlds):**
  - القصر الملكي (Royal Palace)
  - الواحة الخضراء (Green Oasis)
  - الفضاء الكوني (Cosmic Space)
  - جزيرة الكنز (Treasure Island)
  - استاد الأبطال (Champions Stadium)
  - مملكة السحر (Magic Realm)
- **أبطال المنصة الـ 24:**
  - نماذج ثلاثية الأبعاد (3D Avatars & Busts & Full-Body) تم إنشاؤها وتوليدها خصيصاً لمنصة «سكور آر | ScoreAR» بأسلوب كرتوني عصري يناسب الفئات العمرية المدرسية، مع حفظ حقوق الملكية الفكرية لصالح منصة سكور آر والمعلم أحمد رميح.
- **كروت اللعب الـ 12 التكتيكية:**
  - رسوم كروت فريدة مستوحاة من ألعاب البطاقات الاستراتيجية لكسر الجليد وإشعال التحدي الصفي.

---

## 4. البنية السحابية وواجهات الذكاء الاصطناعي (Cloud & AI Architecture)

- **Google Gemini API (Interactions API / 1.5 Flash):**
  - يتم استدعاؤها بشكل آمن وحصري عبر دوال خادم وسيطة (Serverless Functions) في Vercel (`/api/generate-questions`) و Netlify (`/.netlify/functions/generate-questions`) بدون تسريب أي مفاتيح API للمتصفح.
- **Firebase Cloud Platform:**
  - استضافة وإدارة الجلسات الحية والتشفير وقواعد الأمان المشروطة بالدور والمصادقة.
