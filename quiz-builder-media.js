/**
 * ScoreAR Quiz Builder Media Module
 * Item 8: Client-side Image compression to WebP (max 1280px, ~300KB), Drag & Drop,
 * Alt text, Preview, Delete, and Direct Vercel Blob Upload via /api/upload-token.
 * Strictly Rule 7 Compliant (<500 lines).
 */
(function(global) {
  'use strict';

  /**
   * Resizes and compresses an image file to WebP format in the browser.
   * Max width: 1280px. Target size: ~300KB.
   * Returns Promise<{ blob: Blob, base64: string, width: number, height: number, sizeKB: number }>
   */
  async function compressImageToWebP(file, maxDimension = 1280, targetQuality = 0.82) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        return reject(new Error('يرجى اختيار ملف صورة صالح (PNG, JPEG, WebP).'));
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة.'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('تعذر تحميل بيانات الصورة.'));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Test WebP export support
          let mime = 'image/webp';
          let quality = targetQuality;
          let dataUrl = canvas.toDataURL(mime, quality);

          // Fallback if browser doesn't support WebP canvas export
          if (!dataUrl.startsWith('data:image/webp')) {
            mime = 'image/jpeg';
            dataUrl = canvas.toDataURL(mime, quality);
          }

          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('فشل ضغط الصورة.'));
            const sizeKB = Math.round(blob.size / 1024);

            // If exceeds 350KB, compress with slightly lower quality
            if (sizeKB > 350 && quality > 0.65) {
              compressImageToWebP(file, maxDimension, 0.68).then(resolve).catch(reject);
              return;
            }

            resolve({
              blob,
              base64: dataUrl,
              width,
              height,
              sizeKB,
              mime
            });
          }, mime, quality);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Uploads compressed image blob/base64 to Vercel Blob via /api/upload-token.
   */
  async function uploadImageToVercelBlob(compressedResult) {
    let idToken = '';
    try {
      const auth = window.firebase && window.firebase.auth ? window.firebase.auth() : null;
      if (auth && auth.currentUser) {
        idToken = await auth.currentUser.getIdToken(false);
      }
    } catch(e){}

    if (!idToken) {
      try {
        const sess = localStorage.getItem('scorear_teacher_session');
        if (sess) {
          const parsed = JSON.parse(sess);
          if (parsed.idToken) idToken = parsed.idToken;
        }
      } catch(e){}
    }

    if (!idToken) {
      // Local fallback for offline/development test
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        idToken = 'test_teacher_token_' + Date.now();
      } else {
        throw new Error('يجب تسجيل دخول المعلم أولاً لرفع الصور.');
      }
    }

    const response = await fetch('/api/upload-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        imageBase64: compressedResult.base64,
        contentType: compressedResult.mime || 'image/webp'
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `فشل رفع الصورة (رمز الخطأ: ${response.status})`);
    }

    const data = await response.json();
    if (!data.url) throw new Error('لم يرجع الخادم رابطاً صالحاً للصورة.');
    return data.url;
  }

  /**
   * Renders the Media Dropzone & Preview UI for a question.
   */
  function renderMediaZone(q, qIndex) {
    const hasImage = Boolean(q && q.imageUrl);
    const imgUrl = hasImage ? q.imageUrl : '';
    const imgAlt = (q && q.imageAlt) ? q.imageAlt : '';

    return `
      <div id="qMediaBox_${qIndex}" style="background:#13142c;border:1px solid rgba(142,100,239,0.3);border-radius:14px;padding:12px 16px;margin:10px 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:13px;font-weight:800;color:#ddd8ff;display:flex;align-items:center;gap:6px;">
            🖼️ صورة توضيحية مع السؤال (اختياري)
            <small style="color:#94a3b8;font-size:11px;font-weight:600;">(تُضغط تلقائياً إلى WebP بعرض 1280px ونحو 300KB)</small>
          </span>
          ${hasImage ? `
            <button type="button" onclick="ScoreARQuizBuilderMedia.removeQuestionImage(${qIndex})" style="background:rgba(239,68,68,0.15);border:1px solid #ef4444;color:#ff8a8a;border-radius:8px;padding:3px 10px;font-size:11px;font-weight:800;cursor:pointer;">✕ حذف الصورة</button>
          ` : ''}
        </div>

        ${hasImage ? `
          <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;">
            <div style="position:relative;max-width:240px;max-height:160px;background:#090a16;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;">
              <img src="${imgUrl}" alt="${imgAlt}" style="max-width:100%;max-height:160px;object-fit:contain;display:block;">
            </div>
            <div style="flex:1;min-width:220px;display:flex;flex-direction:column;gap:8px;">
              <div>
                <label style="display:block;font-size:11px;color:#a89bff;font-weight:700;margin-bottom:4px;">نص بديل للصورة (Alt Text - اختياري):</label>
                <input type="text" value="${imgAlt}" oninput="ScoreARQuizBuilderMedia.updateImageAlt(${qIndex}, this.value)" placeholder="وصف موجز لمحتوى الصورة لسهولة الوصول..." style="width:100%;background:#1a1c3b;border:1px solid rgba(142,100,239,0.3);color:#fff;font-size:12px;font-weight:700;padding:6px 10px;border-radius:8px;font-family:inherit;">
              </div>
              <div style="font-size:11px;color:#34d399;font-weight:700;">✓ الصورة مرفوعة وجاهزة للعرض بنسبتها الأصلية في شاشتي المعلم والطلاب</div>
            </div>
          </div>
        ` : `
          <div id="qDropzone_${qIndex}"
               ondragover="ScoreARQuizBuilderMedia.handleDragOver(event, ${qIndex})"
               ondragleave="ScoreARQuizBuilderMedia.handleDragLeave(event, ${qIndex})"
               ondrop="ScoreARQuizBuilderMedia.handleDrop(event, ${qIndex})"
               style="border:2px dashed rgba(142,100,239,0.4);border-radius:12px;padding:16px;text-align:center;background:rgba(255,255,255,0.02);transition:all 0.2s;cursor:pointer;"
               onclick="document.getElementById('qFileInput_${qIndex}').click()">
            <input type="file" id="qFileInput_${qIndex}" accept="image/*" style="display:none;" onchange="ScoreARQuizBuilderMedia.handleFileSelect(event, ${qIndex})">
            <div style="font-size:26px;margin-bottom:4px;">📤</div>
            <div style="font-size:13px;font-weight:800;color:#c9baff;">اسحب وأفلت الصورة هنا، أو اضغط للاختيار من جهازك</div>
            <div style="font-size:11px;color:#78729c;margin-top:2px;">PNG, JPEG, WebP (الحد الأقصى الموصى به: 1280px)</div>
            <div id="qUploadProgress_${qIndex}" style="display:none;margin-top:8px;font-size:12px;color:#fcd34d;font-weight:800;">
              <span style="display:inline-block;animation:spin 1s linear infinite;">⏳</span> جارٍ ضغط ورفع الصورة إلى Vercel Blob...
            </div>
          </div>
        `}
      </div>
    `;
  }

  function handleDragOver(e, qIndex) {
    e.preventDefault();
    e.stopPropagation();
    const dz = document.getElementById('qDropzone_' + qIndex);
    if (dz) {
      dz.style.borderColor = '#10b981';
      dz.style.background = 'rgba(16,185,129,0.08)';
    }
  }

  function handleDragLeave(e, qIndex) {
    e.preventDefault();
    e.stopPropagation();
    const dz = document.getElementById('qDropzone_' + qIndex);
    if (dz) {
      dz.style.borderColor = 'rgba(142,100,239,0.4)';
      dz.style.background = 'rgba(255,255,255,0.02)';
    }
  }

  async function handleDrop(e, qIndex) {
    e.preventDefault();
    e.stopPropagation();
    handleDragLeave(e, qIndex);
    const files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length > 0) {
      await processAndUploadFile(files[0], qIndex);
    }
  }

  async function handleFileSelect(e, qIndex) {
    const file = e.target.files && e.target.files[0];
    if (file) {
      await processAndUploadFile(file, qIndex);
    }
  }

  async function processAndUploadFile(file, qIndex) {
    const progressEl = document.getElementById('qUploadProgress_' + qIndex);
    if (progressEl) progressEl.style.display = 'block';

    try {
      if (global.toast) global.toast('جارٍ ضغط الصورة محلياً داخل المتصفح إلى WebP…');
      const compressed = await compressImageToWebP(file, 1280, 0.82);

      if (global.toast) global.toast(`تم الضغط بنجاح (${compressed.sizeKB}KB). جارٍ الرفع السحابي…`);
      const url = await uploadImageToVercelBlob(compressed);

      if (global.ScoreARQuizBuilder && global.ScoreARQuizBuilder.setQuestionImage) {
        global.ScoreARQuizBuilder.setQuestionImage(qIndex, url);
      }
      if (global.toast) global.toast('تم رفع وحفظ صورة السؤال بنجاح ✓');
    } catch (err) {
      console.error('[ScoreAR Media] Upload error:', err);
      if (global.toast) global.toast('تعذر رفع الصورة: ' + (err.message || 'خطأ غير معروف'));
      if (progressEl) progressEl.style.display = 'none';
    }
  }

  function removeQuestionImage(qIndex) {
    if (global.ScoreARQuizBuilder && global.ScoreARQuizBuilder.setQuestionImage) {
      global.ScoreARQuizBuilder.setQuestionImage(qIndex, null);
    }
    if (global.toast) global.toast('تمت إزالة صورة السؤال.');
  }

  function updateImageAlt(qIndex, altText) {
    if (global.ScoreARQuizBuilder && global.ScoreARQuizBuilder.setQuestionImageAlt) {
      global.ScoreARQuizBuilder.setQuestionImageAlt(qIndex, altText);
    }
  }

  const ScoreARQuizBuilderMedia = {
    compressImageToWebP,
    uploadImageToVercelBlob,
    renderMediaZone,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    removeQuestionImage,
    updateImageAlt
  };

  global.ScoreARQuizBuilderMedia = ScoreARQuizBuilderMedia;
  try { if (typeof globalThis !== 'undefined') globalThis.ScoreARQuizBuilderMedia = ScoreARQuizBuilderMedia; } catch(e){}
  if (typeof module !== 'undefined' && module.exports) module.exports = ScoreARQuizBuilderMedia;
})(typeof window !== 'undefined' ? window : this);
