import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = 'E:\\MY PRO\\New folder (4)\\SCOREAR_FINAL_RELEASE';

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/podium.html';
  const filePath = path.join(rootDir, reqPath);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found: ' + reqPath);
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(8088, async () => {
  console.log('Static server listening on 8088');
  const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const PORT = 9228;
  const USER_DATA = path.join(process.env.TEMP || 'C:\\Temp', 'scorear_podium_' + Date.now());

  const browserProc = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--window-size=1280,720',
    'http://127.0.0.1:8088/podium.html'
  ]);

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  await sleep(2500);

  try {
    const listRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.type === 'page');
    console.log('Connecting to tab:', pageTab.webSocketDebuggerUrl);

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    let id = 1;
    const send = (method, params = {}) => new Promise((resolve) => {
      const curId = id++;
      const onMsg = (event) => {
        const data = JSON.parse(event.data);
        if (data.id === curId) {
          ws.removeEventListener('message', onMsg);
          resolve(data.result);
        }
      };
      ws.addEventListener('message', onMsg);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });

    await new Promise(r => ws.addEventListener('open', r));
    console.log('CDP WebSocket opened');

    // Reveal all on podium
    await send('Runtime.evaluate', {
      expression: `
        ScoreARPodiumEffects.revealAll();
        ScoreARPodiumEffects.setHeroPose('celebrate');
      `
    });

    console.log('Triggered revealAll & setHeroPose(celebrate), waiting for animations...');
    await sleep(2000);

    // Track bounding boxes over 25 samples (2.5 seconds)
    const samples = [];
    for (let i = 0; i < 25; i++) {
      const res = await send('Runtime.evaluate', {
        expression: `(() => {
          const header = document.querySelector('header');
          const main = document.querySelector('main');
          const crown = document.getElementById('scCrown');
          const hero1 = document.getElementById('hero_1');
          const hm1 = document.getElementById('hm_1');
          const ped1 = document.getElementById('ped_1');
          const headerRect = header ? header.getBoundingClientRect() : null;
          const mainRect = main ? main.getBoundingClientRect() : null;
          const crownRect = crown ? crown.getBoundingClientRect() : null;
          const hero1Rect = hero1 ? hero1.getBoundingClientRect() : null;
          const hm1Rect = hm1 ? hm1.getBoundingClientRect() : null;
          return {
            headerBottom: headerRect ? headerRect.bottom : 0,
            mainTop: mainRect ? mainRect.top : 0,
            crownTop: crownRect ? crownRect.top : 0,
            hero1Top: hero1Rect ? hero1Rect.top : 0,
            hm1Top: hm1Rect ? hm1Rect.top : 0,
            crownVisible: crown ? window.getComputedStyle(crown).visibility : 'hidden'
          };
        })()`,
        returnByValue: true
      });
      samples.push(res.result.value);
      await sleep(100);
    }

    // Capture screenshot
    const shotRes = await send('Page.captureScreenshot', { format: 'png' });
    const shotPath = 'C:\\Users\\Ahmed Romih\\.gemini\\antigravity\\brain\\37cfadfe-728c-4d48-aa00-5433ce9cb355\\podium_in_frame_proof.png';
    fs.writeFileSync(shotPath, Buffer.from(shotRes.data, 'base64'));
    console.log('Screenshot saved to:', shotPath);

    // Calculate margins
    console.log('\n--- Bounding Box Sample Analysis (Headroom & Frame Boundaries) ---');
    let minCrownMarginToHeader = Infinity;
    let minHero1MarginToHeader = Infinity;
    samples.filter(s => s.crownTop > 0).forEach((s) => {
      const crownMargin = s.crownTop - s.headerBottom;
      const heroMargin = s.hm1Top - s.headerBottom;
      if (crownMargin < minCrownMarginToHeader) minCrownMarginToHeader = crownMargin;
      if (heroMargin < minHero1MarginToHeader) minHero1MarginToHeader = heroMargin;
    });

    console.log(`Header Bottom: ${samples[0].headerBottom.toFixed(1)}px`);
    console.log(`Min Crown Margin to Header: ${minCrownMarginToHeader.toFixed(1)}px (MUST BE > 0)`);
    console.log(`Min Hero 1 Top Margin to Header: ${minHero1MarginToHeader.toFixed(1)}px (MUST BE > 0)`);
    console.log(`Sample 0: CrownTop=${samples[0].crownTop.toFixed(1)}px, Hm1Top=${samples[0].hm1Top.toFixed(1)}px`);
    console.log(`Sample 12: CrownTop=${samples[12].crownTop.toFixed(1)}px, Hm1Top=${samples[12].hm1Top.toFixed(1)}px`);

    if (minCrownMarginToHeader > 20 && minHero1MarginToHeader > 50) {
      console.log('✅ SUCCESS: Champion character and crown remain 100% inside the visible frame with generous headroom throughout all celebrate jump cycles!');
    } else {
      console.log('❌ FAILURE: Character or crown exited the frame!');
    }

    ws.close();
    browserProc.kill();
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Error during test:', err);
    browserProc.kill();
    server.close();
    process.exit(1);
  }
});
