/**
 * ScoreAR Document Extractor (quiz-doc-extractor.js)
 * Client-side streaming extraction for PDF, DOCX, PPTX, and Images.
 * Zero server storage. Safe under 100MB without full memory bloat.
 * Rule 7 Compliant: Strictly < 500 lines.
 */
(function (global) {
  'use strict';

  // Helper: create a cancellation & pause token
  function createCancellationToken() {
    let cancelled = false;
    let paused = false;
    let resumeResolver = null;

    return {
      cancel() { cancelled = true; if (resumeResolver) resumeResolver(); },
      pause() { paused = true; },
      resume() { paused = false; if (resumeResolver) { resumeResolver(); resumeResolver = null; } },
      get isCancelled() { return cancelled; },
      get isPaused() { return paused; },
      async waitIfPaused() {
        if (!paused || cancelled) return;
        await new Promise(resolve => { resumeResolver = resolve; });
      }
    };
  }

  // Helper: yield execution to avoid blocking UI thread
  function yieldThread(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // --- 1. PDF Extractor (Streaming Page-by-Page) ---
  async function extractPdf(fileOrBuffer, options = {}, token, onProgress) {
    let pdfjs = global.pdfjsLib;
    if (!pdfjs) {
      try {
        pdfjs = await import('/vendor/pdf.min.mjs');
        if (pdfjs && pdfjs.GlobalWorkerOptions) {
          pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.mjs';
        }
      } catch (err) {
        try {
          const mod = await import('pdfjs-dist/legacy/build/pdf.mjs');
          pdfjs = mod.default || mod;
        } catch (e2) {
          throw new Error('تعذر تحميل مكتبة معالجة PDF (pdf.js). يرجى التحقق من الاتصال.');
        }
      }
    }

    let rawBuffer = fileOrBuffer instanceof ArrayBuffer ? fileOrBuffer : (fileOrBuffer.arrayBuffer ? await fileOrBuffer.arrayBuffer() : fileOrBuffer);
    const data = rawBuffer instanceof Uint8Array ? rawBuffer : new Uint8Array(rawBuffer.slice ? rawBuffer.slice(0) : rawBuffer);
    const loadingTask = pdfjs.getDocument({
      data,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
      cMapPacked: true
    });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const startPage = Math.max(1, Math.min(options.startPage || 1, numPages));
    const endPage = Math.max(startPage, Math.min(options.endPage || numPages, numPages));
    const pages = [];

    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      if (token && token.isCancelled) throw new Error('CANCELED_BY_USER');
      if (token && token.waitIfPaused) await token.waitIfPaused();

      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const rawStrings = textContent.items.map(item => item.str || '').filter(Boolean);
      let pageText = rawStrings.join(' ').replace(/\s+/g, ' ').trim();
      let isScanned = false;
      let imageBase64 = null;

      // If text layer is nearly empty (< 30 chars), treat page as scanned
      if (pageText.length < 30 && typeof document !== 'undefined') {
        isScanned = true;
        try {
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const maxDim = 1280;
          let scale = 1.5;
          if (viewport.width > maxDim || viewport.height > maxDim) {
            scale = maxDim / Math.max(viewport.width, viewport.height) * 1.5;
          }
          const scaledViewport = page.getViewport({ scale });
          canvas.width = scaledViewport.width;
          canvas.height = scaledViewport.height;

          await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
          imageBase64 = canvas.toDataURL('image/webp', 0.82);
          if (!imageBase64 || imageBase64.length < 50) {
            imageBase64 = canvas.toDataURL('image/jpeg', 0.82);
          }
        } catch (e) {
          console.warn(`[DocExtractor] Could not render canvas for page ${pageNum}:`, e.message);
        }
      }

      pages.push({
        pageNum,
        title: `الصفحة ${pageNum}`,
        text: pageText,
        isScanned,
        imageBase64,
        charCount: pageText.length
      });

      if (onProgress) {
        const percent = Math.round(((pageNum - startPage + 1) / (endPage - startPage + 1)) * 100);
        onProgress({
          percent,
          currentPage: pageNum,
          totalPages: numPages,
          statusText: `استخراج صفحة ${pageNum} من ${numPages}...`,
          stage: 'extracting'
        });
      }

      await yieldThread(10);
    }

    return {
      type: 'pdf',
      totalPages: numPages,
      extractedPagesCount: pages.length,
      pages
    };
  }

  // --- 2. Word Extractor (.docx via mammoth) ---
  async function extractWord(fileOrBuffer, options = {}, token, onProgress) {
    let mammoth = global.mammoth;
    if (!mammoth) {
      try {
        const mod = await import('mammoth');
        mammoth = mod.default || mod;
      } catch (e) {
        throw new Error('تعذر تحميل مكتبة قراءة ملفات Word (mammoth). يرجى التحقق من الاتصال.');
      }
    }

    const arrayBuffer = fileOrBuffer instanceof ArrayBuffer ? fileOrBuffer : await fileOrBuffer.arrayBuffer();
    if (onProgress) onProgress({ percent: 30, statusText: 'قراءة بنية ملف Word...', stage: 'extracting' });

    const mammothInput = {
      arrayBuffer,
      buffer: typeof Buffer !== 'undefined' ? Buffer.from(arrayBuffer) : undefined
    };
    const result = await mammoth.extractRawText(mammothInput);
    const fullText = (result.value || '').trim();

    if (!fullText) {
      throw new Error('الملف فارغ أو لا يحتوي على نصوص مقروءة.');
    }

    // Split document into logical chapters/sections (~2500 characters each)
    const paragraphs = fullText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const pages = [];
    let currentChunk = [];
    let currentLen = 0;
    let sectionIdx = 1;

    for (const p of paragraphs) {
      if (token && token.isCancelled) throw new Error('CANCELED_BY_USER');
      currentChunk.push(p);
      currentLen += p.length;

      if (currentLen >= 2000) {
        pages.push({
          pageNum: sectionIdx,
          title: `قسم ${sectionIdx}`,
          text: currentChunk.join('\n\n'),
          isScanned: false,
          charCount: currentLen
        });
        sectionIdx++;
        currentChunk = [];
        currentLen = 0;
      }
    }

    if (currentChunk.length > 0) {
      pages.push({
        pageNum: sectionIdx,
        title: `قسم ${sectionIdx}`,
        text: currentChunk.join('\n\n'),
        isScanned: false,
        charCount: currentLen
      });
    }

    if (onProgress) onProgress({ percent: 100, statusText: `اكتمل استخراج ${pages.length} قسماً بنجاح`, stage: 'extracting' });

    return {
      type: 'docx',
      totalPages: pages.length,
      extractedPagesCount: pages.length,
      pages
    };
  }

  // --- 3. PowerPoint Extractor (.pptx via JSZip) ---
  async function extractPptx(fileOrBuffer, options = {}, token, onProgress) {
    let JSZip = global.JSZip;
    if (!JSZip) {
      try {
        const mod = await import('jszip');
        JSZip = mod.default || mod;
      } catch (e) {
        throw new Error('تعذر تحميل مكتبة معالجة PowerPoint (JSZip). يرجى التحقق من الاتصال.');
      }
    }

    const arrayBuffer = fileOrBuffer instanceof ArrayBuffer ? fileOrBuffer : await fileOrBuffer.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Discover slide files
    const slideFileNames = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide[0-9]+\.xml$/i.test(name));
    slideFileNames.sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
      return numA - numB;
    });

    if (!slideFileNames.length) {
      throw new Error('لم يتم العثور على أي شرائح عرض داخل ملف PowerPoint.');
    }

    const totalSlides = slideFileNames.length;
    const startSlide = Math.max(1, Math.min(options.startPage || 1, totalSlides));
    const endSlide = Math.max(startSlide, Math.min(options.endPage || totalSlides, totalSlides));
    const pages = [];

    for (let idx = startSlide - 1; idx < endSlide; idx++) {
      if (token && token.isCancelled) throw new Error('CANCELED_BY_USER');
      if (token && token.waitIfPaused) await token.waitIfPaused();

      const slidePath = slideFileNames[idx];
      const slideNum = idx + 1;
      const slideXml = await zip.file(slidePath).async('string');

      // Extract text from <a:t> tags
      const textMatches = [];
      const textRegex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/gi;
      let m;
      while ((m = textRegex.exec(slideXml)) !== null) {
        const txt = m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
        if (txt) textMatches.push(txt);
      }

      // Check for corresponding speaker notes
      let notesText = '';
      const notesPath = `ppt/notesSlides/notesSlide${slideNum}.xml`;
      const notesFile = zip.file(notesPath) || zip.file(new RegExp(`ppt/notesSlides/.*slide${slideNum}`, 'i'));
      if (notesFile) {
        try {
          const notesXml = await notesFile.async('string');
          const notesMatches = [];
          let nm;
          while ((nm = textRegex.exec(notesXml)) !== null) {
            const ntxt = nm[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
            if (ntxt && !ntxt.includes('Slide') && !/^[0-9]+$/.test(ntxt)) {
              notesMatches.push(ntxt);
            }
          }
          notesText = notesMatches.join(' ').trim();
        } catch (e) {}
      }

      const combinedText = [textMatches.join(' '), notesText ? `[ملاحظات الشريحة: ${notesText}]` : ''].filter(Boolean).join('\n\n').trim();

      pages.push({
        pageNum: slideNum,
        title: `الشريحة ${slideNum}`,
        text: combinedText,
        isScanned: false,
        charCount: combinedText.length
      });

      if (onProgress) {
        const percent = Math.round(((slideNum - startSlide + 1) / (endSlide - startSlide + 1)) * 100);
        onProgress({
          percent,
          currentPage: slideNum,
          totalPages: totalSlides,
          statusText: `استخراج الشريحة ${slideNum} من ${totalSlides}...`,
          stage: 'extracting'
        });
      }

      await yieldThread(10);
    }

    return {
      type: 'pptx',
      totalPages: totalSlides,
      extractedPagesCount: pages.length,
      pages
    };
  }

  // --- 4. Image Extractor & Downscaler (Max 1280px WebP) ---
  async function extractImage(file, options = {}, token, onProgress) {
    if (onProgress) onProgress({ percent: 25, statusText: 'تجهيز الصورة وضغطها بصرياً...', stage: 'extracting' });

    let dataUrl = null;
    if (typeof file === 'string' && file.startsWith('data:')) {
      dataUrl = file;
    } else {
      dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('فشل قراءة ملف الصورة.'));
        reader.readAsDataURL(file);
      });
    }

    // Downscale image via canvas if in browser
    if (typeof document !== 'undefined') {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('صيغة الصورة غير مدعومة أو الملف تالف.'));
        img.src = dataUrl;
      });

      const maxDim = 1280;
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      let compressed = canvas.toDataURL('image/webp', 0.85);
      if (!compressed || compressed.length < 50) {
        compressed = canvas.toDataURL('image/jpeg', 0.85);
      }
      dataUrl = compressed;
    }

    if (onProgress) onProgress({ percent: 100, statusText: 'تم تجهيز الصورة للقراءة البصرية بنجاح', stage: 'extracting' });

    return {
      type: 'image',
      totalPages: 1,
      extractedPagesCount: 1,
      pages: [{
        pageNum: 1,
        title: 'صورة المستند',
        text: '',
        isScanned: true,
        imageBase64: dataUrl,
        charCount: 0
      }]
    };
  }

  // --- 5. Plain Text Extractor (.txt, .md) ---
  async function extractText(fileOrString, options = {}, token, onProgress) {
    let rawText = '';
    if (typeof fileOrString === 'string') {
      rawText = fileOrString;
    } else if (fileOrString.text) {
      rawText = await fileOrString.text();
    } else {
      const buf = await fileOrString.arrayBuffer();
      rawText = new TextDecoder('utf-8').decode(buf);
    }

    rawText = rawText.trim();
    if (!rawText) throw new Error('الملف النصي فارغ.');

    const sections = rawText.split(/\n\s*\n/).filter(Boolean);
    const pages = [];
    let chunk = [];
    let len = 0;
    let idx = 1;

    for (const sec of sections) {
      chunk.push(sec);
      len += sec.length;
      if (len >= 2000) {
        pages.push({ pageNum: idx, title: `قسم ${idx}`, text: chunk.join('\n\n'), isScanned: false, charCount: len });
        idx++; chunk = []; len = 0;
      }
    }
    if (chunk.length) {
      pages.push({ pageNum: idx, title: `قسم ${idx}`, text: chunk.join('\n\n'), isScanned: false, charCount: len });
    }

    return { type: 'text', totalPages: pages.length, extractedPagesCount: pages.length, pages };
  }

  // --- Main Dispatcher ---
  async function extractDocument(file, options = {}, token, onProgress) {
    if (!file) throw new Error('يرجى اختيار ملف صالح للاستخراج.');
    const fileName = (file.name || '').toLowerCase();
    const mimeType = (file.type || '').toLowerCase();

    if (fileName.endsWith('.pdf') || mimeType === 'application/pdf') {
      return extractPdf(file, options, token, onProgress);
    }
    if (fileName.endsWith('.docx') || mimeType.includes('wordprocessingml')) {
      return extractWord(file, options, token, onProgress);
    }
    if (fileName.endsWith('.pptx') || mimeType.includes('presentationml')) {
      return extractPptx(file, options, token, onProgress);
    }
    if (/\.(png|jpe?g|webp)$/i.test(fileName) || mimeType.startsWith('image/')) {
      return extractImage(file, options, token, onProgress);
    }
    if (fileName.endsWith('.txt') || fileName.endsWith('.md') || mimeType.startsWith('text/')) {
      return extractText(file, options, token, onProgress);
    }

    throw new Error(`صيغة الملف (${file.name || mimeType}) غير مدعومة. يدعم النظام ملفات PDF و Word و PowerPoint والصور.`);
  }

  global.ScoreARDocExtractor = {
    extractDocument,
    extractPdf,
    extractWord,
    extractPptx,
    extractImage,
    extractText,
    createCancellationToken
  };

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
