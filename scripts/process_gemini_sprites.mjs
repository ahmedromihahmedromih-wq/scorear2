import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const inputDir = 'E:\\MY PRO\\New folder';
const outputAnimDir = 'E:\\MY PRO\\New folder (4)\\SCOREAR_FINAL_RELEASE\\assets\\characters\\animated';
const outputCharDir = 'E:\\MY PRO\\New folder (4)\\SCOREAR_FINAL_RELEASE\\assets\\characters';

const MAPPING = {
  char_01: 'Gemini_Generated_Image_bdbrgmbdbrgmbdbr.jpg', // زياد
  char_02: 'Gemini_Generated_Image_blslzgblslzgblsl.jpg', // نور
  char_03: 'Gemini_Generated_Image_8cjwbm8cjwbm8cjw.jpg', // سليم
  char_04: 'Gemini_Generated_Image_r4wj4r4wj4r4wj4r.jpg', // فريدة
  char_05: 'Gemini_Generated_Image_jfxzkyjfxzkyjfxz.jpg', // ياسين
  char_06: 'Gemini_Generated_Image_s6grh3s6grh3s6gr.jpg', // ملك
  char_07: 'Gemini_Generated_Image_1seo551seo551seo.jpg', // عمر
  char_08: 'Gemini_Generated_Image_5ivg4a5ivg4a5ivg.jpg', // هنا
  char_09: 'Gemini_Generated_Image_ntqlosntqlosntql.jpg', // ليث
  char_10: 'Gemini_Generated_Image_cspwpdcspwpdcspw.jpg', // فلفل
  char_11: 'Gemini_Generated_Image_fzjk0rfzjk0rfzjk.jpg', // قفزة
  char_12: 'Gemini_Generated_Image_plqnmaplqnmaplqn.jpg', // بندق
  char_13: 'Gemini_Generated_Image_tcewkatcewkatcew.jpg', // مشمش
  char_14: 'Gemini_Generated_Image_cxiokicxiokicxio.jpg', // حكيم
  char_15: 'Gemini_Generated_Image_azpteiazpteiazpt.jpg', // نبض
  char_16: 'Gemini_Generated_Image_3jedle3jedle3jed.jpg', // وميض
  char_17: 'Gemini_Generated_Image_sjiw6msjiw6msjiw.jpg', // شرارة
  char_18: 'Gemini_Generated_Image_k0iuvnk0iuvnk0iu.jpg', // غيمة
  char_19: 'Gemini_Generated_Image_udlloludlloludll.jpg', // نجم
  char_20: 'Gemini_Generated_Image_2dkvbs2dkvbs2dkv.jpg'  // بلّور
};

async function processOneCharacter(code, filename) {
  console.log(`Processing ${code} from ${filename}...`);
  const filePath = path.join(inputDir, filename);
  const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const maxY = Math.floor(H * 0.90); // Exclude text labels at bottom

  // 1. Identify foreground pixels (non-white studio)
  const isFg = new Uint8Array(W * H);
  for (let y = 0; y < maxY; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 3;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const brightness = (r + g + b) / 3;
      const diff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
      if (brightness < 246 || diff > 10) {
        isFg[y * W + x] = 1;
      }
    }
  }

  // 2. Connected component labeling via BFS
  const labels = new Int32Array(W * H).fill(-1);
  let currentLabel = 0;
  const components = [];

  for (let y = 0; y < maxY; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (isFg[idx] && labels[idx] === -1) {
        let minX = x, maxX = x, minY = y, maxYBox = y, count = 0;
        const queue = [idx];
        labels[idx] = currentLabel;

        let head = 0;
        while (head < queue.length) {
          const cur = queue[head++];
          count++;
          const cy = Math.floor(cur / W);
          const cx = cur % W;
          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxYBox) maxYBox = cy;

          const neighbors = [cur - 1, cur + 1, cur - W, cur + W];
          for (const n of neighbors) {
            if (n >= 0 && n < W * maxY && isFg[n] && labels[n] === -1) {
              labels[n] = currentLabel;
              queue.push(n);
            }
          }
        }

        if (count > 5000) {
          components.push({
            label: currentLabel,
            count,
            minX, maxX, minY, maxY: maxYBox,
            centerX: (minX + maxX) / 2
          });
        }
        currentLabel++;
      }
    }
  }

  components.sort((a, b) => a.centerX - b.centerX);
  console.log(`  Found ${components.length} components for ${code}`);

  // We need 4 poses. If 4 found, use them. If more, pick 4 largest from left to right.
  let poses = components;
  if (poses.length > 4) {
    // Sort by count, keep top 4, then re-sort by centerX
    poses = [...components].sort((a, b) => b.count - a.count).slice(0, 4).sort((a, b) => a.centerX - b.centerX);
  }

  // Extract each pose into clean transparent RGBA buffer
  const extractedPoses = [];
  for (let pIdx = 0; pIdx < poses.length; pIdx++) {
    const comp = poses[pIdx];
    const cropW = comp.maxX - comp.minX + 1;
    const cropH = comp.maxY - comp.minY + 1;
    const rgba = Buffer.alloc(cropW * cropH * 4);

    for (let cy = comp.minY; cy <= comp.maxY; cy++) {
      for (let cx = comp.minX; cx <= comp.maxX; cx++) {
        const srcIdx = (cy * W + cx);
        const dstIdx = ((cy - comp.minY) * cropW + (cx - comp.minX)) * 4;
        if (labels[srcIdx] === comp.label) {
          const r = data[srcIdx * 3];
          const g = data[srcIdx * 3 + 1];
          const b = data[srcIdx * 3 + 2];
          const brightness = (r + g + b) / 3;
          let a = 255;
          if (brightness > 235) {
            if (brightness >= 248) a = 0;
            else a = Math.floor((248 - brightness) / 13 * 255);
          }
          rgba[dstIdx] = r;
          rgba[dstIdx + 1] = g;
          rgba[dstIdx + 2] = b;
          rgba[dstIdx + 3] = a;
        } else {
          rgba[dstIdx + 3] = 0; // transparent
        }
      }
    }

    const pngBuf = await sharp(rgba, { raw: { width: cropW, height: cropH, channels: 4 } }).png().toBuffer();
    extractedPoses.push(pngBuf);
  }

  // Ensure we have 4 frames (if only 3 found, duplicate run/walk)
  while (extractedPoses.length < 4) {
    extractedPoses.push(extractedPoses[extractedPoses.length - 1]);
  }

  // Build standard 1280 x 400 atlas
  const atlasW = 1280, atlasH = 400, frameW = 320;
  const atlasComposites = [];

  for (let s = 0; s < 4; s++) {
    const poseBuf = extractedPoses[s];
    const targetH = s === 3 ? 355 : 345; // celebrate pose slightly taller
    const resized = await sharp(poseBuf)
      .resize({ height: targetH, fit: 'inside' })
      .toBuffer({ resolveWithObject: true });

    const posX = s * frameW + Math.floor((frameW - resized.info.width) / 2);
    const posY = 380 - resized.info.height; // consistent ground baseline

    atlasComposites.push({
      input: resized.data,
      top: Math.max(0, posY),
      left: posX
    });
  }

  // 1. Save char_XX-atlas.webp
  const atlasWebp = await sharp({
    create: { width: atlasW, height: atlasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
  .composite(atlasComposites)
  .webp({ quality: 90 })
  .toBuffer();

  fs.writeFileSync(path.join(outputAnimDir, `${code}-atlas.webp`), atlasWebp);

  // 2. Save char_XX-idle.webp (single 320x400 transparent frame)
  const idleWebp = await sharp({
    create: { width: frameW, height: atlasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
  .composite([{
    input: atlasComposites[0].input,
    top: atlasComposites[0].top,
    left: atlasComposites[0].left
  }])
  .webp({ quality: 90 })
  .toBuffer();

  fs.writeFileSync(path.join(outputAnimDir, `${code}-idle.webp`), idleWebp);

  // 3. Save char_XX_full.webp and char_XX.webp
  const fullWebp = await sharp(extractedPoses[0])
    .resize({ height: 600, fit: 'inside' })
    .webp({ quality: 92 })
    .toBuffer();
  fs.writeFileSync(path.join(outputCharDir, `${code}_full.webp`), fullWebp);
  fs.writeFileSync(path.join(outputCharDir, `${code}.webp`), fullWebp);

  // 4. Save char_XX-run.webp (dedicated 1280x400 run sheet)
  const runComposites = [];
  // Use Walk (frame 1) and Run (frame 2) for dynamic 4-step run cycle [1, 2, 1, 2]
  const runSequence = [1, 2, 1, 2];
  for (let s = 0; s < 4; s++) {
    const srcPose = extractedPoses[runSequence[s]];
    const resized = await sharp(srcPose)
      .resize({ height: 345, fit: 'inside' })
      .toBuffer({ resolveWithObject: true });
    runComposites.push({
      input: resized.data,
      top: Math.max(0, 380 - resized.info.height),
      left: s * frameW + Math.floor((frameW - resized.info.width) / 2)
    });
  }
  const runWebp = await sharp({
    create: { width: atlasW, height: atlasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
  .composite(runComposites)
  .webp({ quality: 90 })
  .toBuffer();
  fs.writeFileSync(path.join(outputAnimDir, `${code}-run.webp`), runWebp);

  // 5. Keep climb & fly sheets for test parity
  fs.writeFileSync(path.join(outputAnimDir, `${code}-climb.webp`), runWebp);
  fs.writeFileSync(path.join(outputAnimDir, `${code}-fly.webp`), atlasWebp);

  console.log(`✅ ${code} completed successfully!`);
}

async function run() {
  const codes = Object.keys(MAPPING);
  console.log(`Starting batch processing of ${codes.length} characters...`);
  for (const code of codes) {
    try {
      await processOneCharacter(code, MAPPING[code]);
    } catch (err) {
      console.error(`❌ Error processing ${code}:`, err);
    }
  }
  console.log(`\n🎉 All characters processed!`);
}
run();
