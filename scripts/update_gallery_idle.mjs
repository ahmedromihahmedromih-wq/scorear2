import fs from 'fs';

// 1. Update characters.html
let charHtml = fs.readFileSync('characters.html', 'utf8');

// Match <div class="character-controls" ... </div>
charHtml = charHtml.replace(
  /<div class="character-controls"[\s\S]*?<\/div>/,
  `<div class="character-controls" aria-label="وضعية البطل" style="margin-top:18px;display:flex;justify-content:center;">
        <button type="button" data-character-pose="idle" onclick="ScoreARCharacters.preview(window.gallerySelected,'idle')" aria-pressed="true" style="background:linear-gradient(110deg,#7550ef,#9665ff);color:#ffffff;border:1px solid #c4a8ff50;box-shadow:0 4px 15px rgba(117,80,239,0.35);padding:8px 22px;border-radius:14px;font-weight:900;font-size:13px;display:inline-flex;align-items:center;gap:6px;">🧍 وضع الوقوف والاستعداد</button>
      </div>`
);
fs.writeFileSync('characters.html', charHtml, 'utf8');
console.log('✅ Updated characters.html');

// 2. Update app.js
let appJs = fs.readFileSync('app.js', 'utf8');

// Replace description in renderHeroesPage
appJs = appJs.replace(
  '٢٠ شخصية كرتونية أصلية بجسم كامل وتفاعل حي. اختر رفيق رحلتك في التحدي وتنقّل بين أوضاع الحركة.',
  '٢٠ شخصية كرتونية أصلية بجسم كامل وتفاعل ثلاثي الأبعاد. اختر بطلك المفضل ليمثّلك في قاعة التحدي وعلى منصة التتويج.'
);

// Replace character-controls in renderHeroesPage
appJs = appJs.replace(
  /<div class="character-controls"[\s\S]*?<\/div>/,
  `<div class="character-controls" aria-label="وضعية البطل" style="margin-top:16px;display:flex;justify-content:center;">
          <button type="button" class="btn light small" data-character-pose="idle" onclick="if(window.ScoreARCharacters)window.ScoreARCharacters.preview(window.gallerySelected||1,'idle')" style="background:linear-gradient(110deg,#7550ef,#9665ff);color:#ffffff;border:1px solid #c4a8ff50;box-shadow:0 4px 15px rgba(117,80,239,0.35);padding:8px 20px;border-radius:12px;font-weight:900;font-size:13px;">🧍 وضع الوقوف والاستعداد</button>
        </div>`
);
fs.writeFileSync('app.js', appJs, 'utf8');
console.log('✅ Updated app.js');
