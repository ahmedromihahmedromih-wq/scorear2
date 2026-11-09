import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

// 1. characters.html
const charHtmlPath = path.join(root, 'characters.html');
let charHtml = fs.readFileSync(charHtmlPath, 'utf8');
if (!charHtml.includes('href="podium.html"')) {
  charHtml = charHtml.replace(
    '<a href="index.html#worlds" class="btn dark small" style="text-decoration:none;">🚀 قاعة المنافسات</a>',
    '<a href="podium.html" class="btn small" style="text-decoration:none;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-weight:900;border:none;">👑 منصة التتويج (Kahoot)</a>\n      <a href="index.html#worlds" class="btn dark small" style="text-decoration:none;">🚀 قاعة المنافسات</a>'
  );
  fs.writeFileSync(charHtmlPath, charHtml, 'utf8');
  console.log('✓ Added podium link to characters.html!');
}

// 2. index.html
const idxHtmlPath = path.join(root, 'index.html');
let idxHtml = fs.readFileSync(idxHtmlPath, 'utf8');
if (!idxHtml.includes('href="podium.html"')) {
  idxHtml = idxHtml.replace(
    '<a href="characters.html" data-nav="heroes"><i data-icon="spark"></i><span>قاعة الأبطال (٢٠)</span></a>',
    '<a href="characters.html" data-nav="heroes"><i data-icon="spark"></i><span>قاعة الأبطال (٢٠)</span></a>\n    <a href="podium.html"><i data-icon="crown"></i><span>منصة التتويج (Kahoot)</span></a>'
  );
  fs.writeFileSync(idxHtmlPath, idxHtml, 'utf8');
  console.log('✓ Added podium link to index.html nav!');
}
