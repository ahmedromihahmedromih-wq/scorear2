/**
 * ScoreAR Smart Firebase Uploader Wrapper (deploy-fast.cjs)
 * Fixes Firebase CLI's default 200-file parallel upload congestion on home connections
 * by limiting concurrent file uploads to 3 at a time with a 5-minute timeout per file.
 */
const path = require('path');
const fs = require('fs');

const npmGlobal = path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'firebase-tools');
const uploaderPath = path.join(npmGlobal, 'lib', 'deploy', 'hosting', 'uploader.js');
const binPath = path.join(npmGlobal, 'lib', 'bin', 'firebase.js');

if (fs.existsSync(uploaderPath) && fs.existsSync(binPath)) {
  const uploaderMod = require(uploaderPath);
  const OrigUploader = uploaderMod.Uploader;

  class SmartSequentialUploader extends OrigUploader {
    constructor(options = {}) {
      options.uploadConcurrency = 2; // Upload 2 files at a time instead of 200 simultaneously!
      options.populateConcurrency = 2;
      super(options);
      if (this.uploadQueue) {
        this.uploadQueue.concurrency = 2;
        this.uploadQueue.retries = 10;
      }
    }
    uploadTimeout(filePath) {
      return 300000; // 5 minutes timeout per file
    }
  }

  uploaderMod.Uploader = SmartSequentialUploader;
  console.log('⚡ [ScoreAR Smart Uploader] تم تفعيل وضع الرفع المتتالي الذكي (ملفان في كل مرة بدلاً من 200 معاً لمنع انقطاع الاتصال)!');
  process.argv = [process.argv[0], binPath, 'deploy', '--only', 'hosting,database'];
  require(binPath);
} else {
  console.error('Could not locate global firebase-tools at:', npmGlobal);
  process.exit(1);
}
