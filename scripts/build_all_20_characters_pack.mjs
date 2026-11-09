import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const CHARACTERS = [
  { id: 1, code: 'char_01', nameAr: 'زياد', nameEn: 'Ziyad', title: 'المستكشف', category: 'Human', color: '#39d8ce' },
  { id: 2, code: 'char_02', nameAr: 'نور', nameEn: 'Nour', title: 'صانعة الأفكار', category: 'Human', color: '#ba9aff' },
  { id: 3, code: 'char_03', nameAr: 'سليم', nameEn: 'Salim', title: 'العالِم', category: 'Human', color: '#ffd066' },
  { id: 4, code: 'char_04', nameAr: 'فريدة', nameEn: 'Farida', title: 'الفنانة', category: 'Human', color: '#ff8c94' },
  { id: 5, code: 'char_05', nameAr: 'ياسين', nameEn: 'Yaseen', title: 'الرياضي', category: 'Human', color: '#73dc98' },
  { id: 6, code: 'char_06', nameAr: 'ملك', nameEn: 'Malak', title: 'حارسة المعرفة', category: 'Human', color: '#f8a8d1' },
  { id: 7, code: 'char_07', nameAr: 'عمر', nameEn: 'Omar', title: 'المخترع', category: 'Human', color: '#ffb66b' },
  { id: 8, code: 'char_08', nameAr: 'هنا', nameEn: 'Hana', title: 'رائدة الفضاء', category: 'Human', color: '#bba8ff' },
  { id: 9, code: 'char_09', nameAr: 'ليث', nameEn: 'Laith', title: 'الأسد الشجاع', category: 'Animal', color: '#ffd066' },
  { id: 10, code: 'char_10', nameAr: 'فلفل', nameEn: 'Felfel', title: 'الثعلب الرحّال', category: 'Animal', color: '#ffaf76' },
  { id: 11, code: 'char_11', nameAr: 'قفزة', nameEn: 'Qafza', title: 'الأرنب السريع', category: 'Animal', color: '#ffa3bc' },
  { id: 12, code: 'char_12', nameAr: 'بندق', nameEn: 'Bondoq', title: 'الباندا الفضولي', category: 'Animal', color: '#b3df93' },
  { id: 13, code: 'char_13', nameAr: 'مشمش', nameEn: 'Mishmish', title: 'القط المخترع', category: 'Animal', color: '#80caff' },
  { id: 14, code: 'char_14', nameAr: 'حكيم', nameEn: 'Hakeem', title: 'البومة القارئة', category: 'Animal', color: '#c0a3ff' },
  { id: 15, code: 'char_15', nameAr: 'نبض', nameEn: 'Nabd', title: 'الروبوت الودود', category: 'Fantasy', color: '#70ead9' },
  { id: 16, code: 'char_16', nameAr: 'وميض', nameEn: 'Wameed', title: 'رفيق المستقبل', category: 'Fantasy', color: '#bfa2ff' },
  { id: 17, code: 'char_17', nameAr: 'شرارة', nameEn: 'Sharara', title: 'التنين الصغير', category: 'Fantasy', color: '#78d9b8' },
  { id: 18, code: 'char_18', nameAr: 'غيمة', nameEn: 'Ghaima', title: 'صديق السماء', category: 'Fantasy', color: '#b3e5ff' },
  { id: 19, code: 'char_19', nameAr: 'نجم', nameEn: 'Najm', title: 'ساحر النجوم', category: 'Fantasy', color: '#ffe395' },
  { id: 20, code: 'char_20', nameAr: 'بلّور', nameEn: 'Ballour', title: 'فارس الكريستال', category: 'Fantasy', color: '#89e8f3' }
];

async function buildPack() {
  console.log('🚀 Building Complete 20-Character Pack for ChatGPT...');
  const packDir = path.join(root, 'all_20_characters_studio');
  if (fs.existsSync(packDir)) fs.rmSync(packDir, { recursive: true, force: true });
  fs.mkdirSync(packDir, { recursive: true });

  const whiteDir = path.join(packDir, '01_Studio_White_Reference_For_ChatGPT');
  const transDir = path.join(packDir, '02_Transparent_Fullbody_PNG');
  fs.mkdirSync(whiteDir, { recursive: true });
  fs.mkdirSync(transDir, { recursive: true });

  for (const c of CHARACTERS) {
    const srcWebp = path.join(root, 'assets', 'characters', `${c.code}_full.webp`);
    if (!fs.existsSync(srcWebp)) {
      console.warn(`Warning: Missing ${srcWebp}`);
      continue;
    }

    const baseName = `${String(c.id).padStart(2, '0')}_${c.nameEn}_${c.nameAr}`;

    // 1. Transparent PNG
    await sharp(srcWebp).png().toFile(path.join(transDir, `${baseName}.png`));

    // 2. Pure White Studio Background 1024x1024 centered
    const charBuffer = await sharp(srcWebp).resize({ height: 860, fit: 'inside' }).toBuffer();
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite([{ input: charBuffer, gravity: 'center' }])
    .png()
    .toFile(path.join(whiteDir, `${baseName}.png`));

    console.log(`✓ Prepared Character ${c.id}: ${c.nameAr} (${c.nameEn})`);
  }

  // 3. Write Master Instructions & Prompt text file
  const promptText = `======================================================================
ScoreAR 20 Characters — Master Animation Atlas Prompt for ChatGPT (GPT-4o)
======================================================================

HOW TO USE IN CHATGPT:
1. Open ChatGPT (GPT-4o).
2. Attach the reference image of ANY character from folder "01_Studio_White_Reference_For_ChatGPT".
3. Copy and paste the prompt below.
4. If you upload multiple characters at once, ChatGPT will generate the master sheet for each!

----------------------------------------------------------------------
COPY THE MASTER PROMPT BELOW:
----------------------------------------------------------------------

You are a senior 3D character game animator and artist (Pixar & Supercell standard).
I have attached the exact canonical reference image of Character from ScoreAR platform.

MANDATORY CHARACTER LOCK:
Maintain 100% STRICT IDENTITY CONSISTENCY with the attached reference picture:
- Same face structure, facial expression, eyes, hair / fur / helmet, and exact colors.
- Same costume, clothing details, accessories, accents, and materials.
- Identical 3D Pixar claymation CGI render style, soft studio rim lighting, zero style deviation.
- Do NOT alter the character's facial features or proportions. It must be the EXACT same character across all poses.

OUTPUT FORMAT:
Generate ONE SINGLE MASTER ANIMATION ATLAS image featuring a 3x4 grid (3 horizontal rows with 4 sequential poses each, total 12 poses) on a SOLID PURE WHITE BACKGROUND (#FFFFFF) with no background graphics, gradients, or shadows:

• ROW 1 (TOP) — [ATHLETIC SPRINT / RUN CYCLE] (4 frames from left to right):
  1. Contact: Right foot planted forward, 20° forward lean, trailing left leg back, left fist forward.
  2. Airborne: High leap in mid-air, both feet off ground, right knee driving high like an Olympic sprinter.
  3. Opposite Plant: Left foot planted firmly under center of gravity, right leg extending back.
  4. Spring: Explosive push-off into the next stride with aerodynamic forward momentum.

• ROW 2 (MIDDLE) — [VERTICAL ROCK CLIMBING CYCLE] (4 frames from left to right):
  1. High Reach: Head looking up, right arm extended high gripping a rock ledge, left foot braced.
  2. Body Pull: Elbows flexed, pulling body weight upward close to the vertical rock face.
  3. Step & Switch: Left hand reaching higher for the next ledge, right foot stepping up on high rock shelf.
  4. Summit Crest: Both hands pushing down on the top cliff edge, torso cresting the summit with a proud exertion smile.

• ROW 3 (BOTTOM) — [SUPERHERO FLIGHT / GLIDE CYCLE] (4 frames from left to right):
  1. Arrow Glide: Torso tilted horizontally at 70°, both arms outstretched forward like an arrow cutting the wind.
  2. Banking Turn: Dynamic 20° aerodynamic roll/bank, arms tilted like airplane wings to steer airflow.
  3. Soaring Ascent: Chest arched upwards, head looking toward the sky with an exhilarated smile, arms spread wide like wings.
  4. Bullet Dive: Streamlined aerodynamic dive, arms tucked tightly along sides, body straight and streamlined.

Ensure all 12 characters are full-body, sharp silhouettes, studio-lit, and cleanly aligned in their respective rows.
`;

  fs.writeFileSync(path.join(packDir, 'PROMPT_ALL_CHARACTERS.txt'), promptText, 'utf8');

  // 4. Create zip archive using powershell Compress-Archive
  const zipName = 'scorear_all_20_characters_pack.zip';
  const zipPath = path.join(root, zipName);
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  console.log('Compressing all 20 characters into zip archive...');
  execSync(`powershell -Command "Compress-Archive -Path '${packDir}\\*' -DestinationPath '${zipPath}' -Force"`, { cwd: root });

  // Copy to public/ and brain artifacts
  fs.copyFileSync(zipPath, path.join(root, 'public', zipName));
  const brainDir = 'C:/Users/Ahmed Romih/.gemini/antigravity/brain/37cfadfe-728c-4d48-aa00-5433ce9cb355';
  fs.copyFileSync(zipPath, path.join(brainDir, zipName));

  console.log(`✅ Success! Created ${zipName} (${fs.statSync(zipPath).size} bytes).`);
}

buildPack().catch(console.error);
