# منصة سكور عربي (ScoreAR v2.1.0) — دليل التشغيل والمعاينة والنشر والتراجع

منصة مسابقات تعليمية عربية تفاعلية لحظية (RTL) مصممة للأستاذ **أحمد صلاح رميح** (معلم أول أ اللغة العربية).

---

## 1. تشغيل المشروع محليًا
1. تأكد من وجود Node.js (الإصدار 18 أو أحدث).
2. لمزامنة التعديلات من الملفات المصدرية (`index.html`, `worlds.js`, `cards.json`, `assets/`, `cards/`) إلى مجلدي `public/` و`dist/`:
   ```bash
   npm run build
   # أو مباشرة:
   node build.js
   ```
3. لتشغيل خادم محلي للمعاينة:
   ```bash
   npx serve public -l 5000
   # أو باستخدام بايثون:
   python3 -m http.server 5000 --directory public
   ```
4. لفحص الأصول والخلفيات والموسيقى الجارية وأبعاد الصور الفعلية، افتح الرابط مع معامل الفحص:
   ```
   http://localhost:5000/?debug=assets
   ```

---

## 2. النشر على قناة معاينة (Preview Channel) دون المساس بالرابط الحي
يُمنع النشر المباشر على الرابط الحي قبل المعاينة. لنشر النسخة على قناة معاينة مستقلة (`preview`):

```bash
# 1. بناء ومزامنة مجلد public/
node build.js

# 2. النشر على قناة معاينة باسم preview صالحة لمدة 7 أيام
firebase hosting:channel:deploy preview --expires 7d
```
سيُخرج لك الأمر رابط معاينة مؤقت (مثل `https://scorear-e4186--preview-xxxx.web.app`) يمكنك فتحه وتجربته بالكامل على الحاسوب والهاتف دون أي تأثير على الموقع الحي.

---

## 3. اعتماد نسخة المعاينة أو التراجع عن أي نشر (Rollback)

### أ) ترقية نسخة المعاينة إلى الرابط الحي (بعد اعتمادها فقط):
```bash
firebase hosting:clone scorear-e4186:preview scorear-e4186:live
```

### ب) التراجع الفوري عن أي نشر على Firebase Hosting:
1. **عبر لوحة تحكم Firebase Console (الأسرع)**:
   - افتح [Firebase Console](https://console.firebase.google.com/) ← اختر مشروع `scorear-e4186` ← ادخل إلى قسم **Hosting**.
   - في جدول **Release history (سجل الإصدارات)**، اضغط على النقاط الثلاث بجانب الإصدار السابق السليم واختر **Rollback (تراجع)**.
2. **عبر سطر الأوامر (Firebase CLI)**:
   - يمكنك استنساخ أي إصدار سابق أو إعادة نشر النسخة الاحتياطية المحفوظة في `backup_20261031_1615`:
     ```bash
     cp -a backup_20261031_1615/public/* public/
     firebase deploy --only hosting
     ```
3. **التراجع في الكود عبر Git**:
   ```bash
   git log --oneline
   git revert <commit-hash>
   # أو للعودة الكاملة للنسخة الأولية قبل التعديلات:
   git checkout 86466a5
   ```
