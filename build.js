import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Building and Synchronizing ScoreAR files (Organized Modular Structure)...');

const publicDir = path.join(__dirname, 'public');
const distDir = path.join(__dirname, 'dist');

function copyDirRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursiveSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Ensure output directories exist
[publicDir, distDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Root files to copy to public/ and dist/
const rootFiles = [
  'index.html', 'cards.html', 'characters.html', 'podium.html',
  'cards.json', 'manifest.json', 'sw.js', 'robots.txt', 'sitemap.xml',
  'google65739e9df66ba15c.html', 'firebase-config.js'
];

rootFiles.forEach(f => {
  const p = path.join(__dirname, f);
  if (fs.existsSync(p)) {
    fs.copyFileSync(p, path.join(publicDir, f));
    fs.copyFileSync(p, path.join(distDir, f));
  }
});
console.log('✅ Copied clean root HTML and metadata files to public/ and dist/');

// Synchronize organized folders: css/ and js/
['css', 'js'].forEach(folder => {
  const src = path.join(__dirname, folder);
  if (fs.existsSync(src)) {
    copyDirRecursiveSync(src, path.join(publicDir, folder));
    copyDirRecursiveSync(src, path.join(distDir, folder));
    console.log(`✅ Synchronized ${folder}/ directory to public/ and dist/`);
  }
});

// Copy assets, vendor, content, and src directories
['assets', 'vendor', 'content', 'src'].forEach(folder => {
  const src = path.join(__dirname, folder);
  if (fs.existsSync(src)) {
    copyDirRecursiveSync(src, path.join(publicDir, folder));
    copyDirRecursiveSync(src, path.join(distDir, folder));
    console.log(`✅ Synchronized ${folder}/ directory to public/ and dist/`);
  }
});

// Ensure js/engines/assets is synchronized so characters-v4.js (which resolves assets relative to its script URL) resolves 100% seamlessly
['public', 'dist'].forEach(target => {
  const dest = path.join(__dirname, target, 'js', 'engines', 'assets');
  copyDirRecursiveSync(path.join(__dirname, 'assets'), dest);
});
console.log('✅ Synchronized js/engines/assets fallback for characters-v4 engine');

// Clean legacy folders
['engine', 'public/engine', 'dist/engine'].forEach(d => {
  const p = path.join(__dirname, d);
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    console.log(`✅ Removed legacy folder: ${d}`);
  }
});

console.log('🎉 ScoreAR build completed successfully!');
