import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Building and Synchronizing ScoreAR files (Unified Purple Identity matching target site)...');

const srcHtml = path.join(__dirname, 'index.html');
const publicDir = path.join(__dirname, 'public');
const distDir = path.join(__dirname, 'dist');
const assetsDir = path.join(__dirname, 'assets');
const vendorDir = path.join(__dirname, 'vendor');

if (!fs.existsSync(srcHtml)) {
  console.error('❌ index.html not found in root!');
  process.exit(1);
}

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
[publicDir, distDir, path.join(publicDir, 'vendor'), path.join(distDir, 'vendor')].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Copy root index.html to public/ and dist/
fs.copyFileSync(srcHtml, path.join(publicDir, 'index.html'));
fs.copyFileSync(srcHtml, path.join(distDir, 'index.html'));
console.log('✅ Copied clean root index.html to public/ and dist/');

// Copy modern styles & scripts
const portalFiles = [
  'styles.css', 'launch.css', 'workspace.css',
  'firebase-config.js', 'app.js', 'auth.js', 'auth-ui.js', 'auth-register-ui.js', 'quiz-student-join.js', 'realtime-engine.js',
  'quiz-evaluator.js', 'quiz-audio.js', 'quiz-host-leaderboard.js', 'quiz-host-events.js', 'quiz-host-view.js', 'quiz-host.js', 'quiz-bots.js', 'quiz-podium-effects.js', 'quiz-student-view.js', 'quiz-student.js',
  'quiz-builder-actions.js', 'quiz-builder-media.js', 'quiz-builder.js', 'quiz-bank-data.js', 'quiz-bank.js', 'quiz-importer.js', 'quiz-doc-extractor.js', 'quiz-ai-pipeline.js', 'quiz-ai-review.js', 'quiz-ai.js', 'quiz-reports.js', 'admin-management.js',
  'student-journey.js', 'mistake-scheduler.js', 'mistake-notebook.js', 'streak.js',
  'skill-engine.js', 'skill-map.js', 'nav.js', 'world-content-picker.js', 'world-flow.js', 'launch.js', 'workspace.js',
  'characters.html', 'characters-v4.js', 'characters-v4.css',
  'manifest.json', 'sw.js', 'interactive-character.js', 'interactive-character.css',
  'cards.json', 'worlds.js', 'robots.txt', 'sitemap.xml'
];
portalFiles.forEach(f => {
  const p = path.join(__dirname, f);
  if (fs.existsSync(p)) {
    fs.copyFileSync(p, path.join(publicDir, f));
    fs.copyFileSync(p, path.join(distDir, f));
  }
});
console.log('✅ Synchronized CSS, JS and manifest to public/ and dist/');

// Copy content directory (educational content, journey stations, CSV review)
const contentDir = path.join(__dirname, 'content');
if (fs.existsSync(contentDir)) {
  copyDirRecursiveSync(contentDir, path.join(publicDir, 'content'));
  copyDirRecursiveSync(contentDir, path.join(distDir, 'content'));
  console.log('✅ Synchronized content/ directory to public/ and dist/');
}

// Copy vendor directory
if (fs.existsSync(vendorDir)) {
  copyDirRecursiveSync(vendorDir, path.join(publicDir, 'vendor'));
  copyDirRecursiveSync(vendorDir, path.join(distDir, 'vendor'));
  console.log('✅ Synchronized vendor/ scripts (lucide, motion)');
}

// Copy assets directory if needed
if (fs.existsSync(assetsDir)) {
  copyDirRecursiveSync(assetsDir, path.join(publicDir, 'assets'));
  copyDirRecursiveSync(assetsDir, path.join(distDir, 'assets'));
  console.log('✅ Synchronized assets/ to public/ and dist/');
}

// Clean any leftover engine directories
['engine', 'public/engine', 'dist/engine'].forEach(d => {
  const p = path.join(__dirname, d);
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    console.log(`✅ Removed legacy folder: ${d}`);
  }
});

console.log('🎉 ScoreAR build completed successfully!');
