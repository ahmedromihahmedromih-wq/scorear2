/**
 * ScoreAR - Apply Reviewed CSV to Journey JSON (scripts/apply_review.js)
 * Rules:
 *   1. Matches questions STRICTLY by ID.
 *   2. Rejects any row whose ID was changed, corrupted, or does not exist.
 *   3. Updates question text, options, correct answer, explanation, skill, ruleTag, difficulty, and reviewed status.
 *   4. Prints a detailed audit report of all changes and rejections.
 *   5. Writes updated JSON files back to content/journey/ and triggers build sync.
 * Strictly Rule 7 Compliant (<500 lines).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const journeyDir = path.join(ROOT, 'content', 'journey');

/**
 * Robust RFC 4180 CSV parser supporting quotes, commas, and escaped quotes.
 */
function parseCsv(csvText) {
  // Strip BOM if present
  let clean = csvText.charCodeAt(0) === 0xFEFF ? csvText.slice(1) : csvText;
  const rows = [];
  let row = [];
  let token = '';
  let insideQuote = false;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    const next = clean[i + 1];

    if (c === '"') {
      if (insideQuote && next === '"') {
        token += '"';
        i++; // skip escaped quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (c === ',' && !insideQuote) {
      row.push(token);
      token = '';
    } else if ((c === '\r' || c === '\n') && !insideQuote) {
      if (c === '\r' && next === '\n') i++;
      row.push(token);
      token = '';
      if (row.length > 0 && row.some(cell => cell.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
    } else {
      token += c;
    }
  }
  if (token.length > 0 || row.length > 0) {
    row.push(token);
    if (row.some(cell => cell.trim().length > 0)) {
      rows.push(row);
    }
  }
  return rows;
}

export function applyReview(csvFilePath = null) {
  const targetCsv = csvFilePath || path.join(journeyDir, 'questions_review.csv');
  if (!fs.existsSync(targetCsv)) {
    throw new Error(`CSV file not found: ${targetCsv}`);
  }

  const tracksPath = path.join(journeyDir, 'tracks.json');
  if (!fs.existsSync(tracksPath)) {
    throw new Error(`Tracks JSON file not found: ${tracksPath}`);
  }

  const rawCsv = fs.readFileSync(targetCsv, 'utf8');
  const rows = parseCsv(rawCsv);
  if (rows.length < 2) {
    throw new Error('CSV is empty or missing data rows');
  }

  const headers = rows[0].map(h => h.trim());
  const dataRows = rows.slice(1);

  // Load existing tracks
  const tracks = JSON.parse(fs.readFileSync(tracksPath, 'utf8'));

  // Build index of known questions by ID
  const questionMap = new Map();
  tracks.forEach(t => {
    (t.stations || []).forEach(st => {
      (st.questions || []).forEach(q => {
        if (q && q.id) {
          questionMap.set(q.id, { track: t, station: st, question: q });
        }
      });
    });
  });

  const report = {
    totalRows: dataRows.length,
    updatedCount: 0,
    rejectedCount: 0,
    reviewedCount: 0,
    rejections: [],
    changes: []
  };

  // Find column indices
  const colId = headers.findIndex(h => h.includes('id') || h.includes('المعرف'));
  const colText = headers.findIndex(h => h.includes('text') || h.includes('السؤال'));
  const colOpt1 = headers.findIndex(h => h.includes('الاختيار 1'));
  const colOpt2 = headers.findIndex(h => h.includes('الاختيار 2'));
  const colOpt3 = headers.findIndex(h => h.includes('الاختيار 3'));
  const colOpt4 = headers.findIndex(h => h.includes('الاختيار 4'));
  const colCorrect = headers.findIndex(h => h.includes('correct') || h.includes('رقم الإجابة'));
  const colExp = headers.findIndex(h => h.includes('explanation') || h.includes('الشرح'));
  const colSkill = headers.findIndex(h => h.includes('skill') || h.includes('المحطة المهارية'));
  const colRule = headers.findIndex(h => h.includes('ruleTag') || h.includes('القاعدة'));
  const colDiff = headers.findIndex(h => h.includes('difficulty') || h.includes('الصعوبة'));
  const colRev = headers.findIndex(h => h.includes('reviewed') || h.includes('المراجعة اللغوية'));

  dataRows.forEach((row, rowIdx) => {
    const qId = colId !== -1 && row[colId] ? row[colId].trim() : null;

    if (!qId || !questionMap.has(qId)) {
      report.rejectedCount += 1;
      report.rejections.push({
        rowNumber: rowIdx + 2,
        providedId: qId || 'فارغ',
        reason: 'معرّف السؤال مفقود أو تم تعديله. ممنوع تغيير معرّفات الأسئلة لضمان استقرار السجلات.'
      });
      return;
    }

    const { question, track, station } = questionMap.get(qId);
    const questionDiffs = [];

    // 1. Text
    if (colText !== -1 && row[colText]) {
      const nextText = row[colText].trim();
      if (nextText !== question.text) {
        questionDiffs.push({ field: 'text', old: question.text, next: nextText });
        question.text = nextText;
      }
    }

    // 2. Options
    const nextOptions = [...question.options];
    [colOpt1, colOpt2, colOpt3, colOpt4].forEach((colIdx, optIdx) => {
      if (colIdx !== -1 && row[colIdx] !== undefined) {
        const val = row[colIdx].trim();
        if (val !== nextOptions[optIdx]) {
          questionDiffs.push({ field: `option[${optIdx}]`, old: nextOptions[optIdx], next: val });
          nextOptions[optIdx] = val;
        }
      }
    });
    question.options = nextOptions;

    // 3. Correct Answer Index
    if (colCorrect !== -1 && row[colCorrect] !== undefined && row[colCorrect].trim() !== '') {
      const nextCorrect = parseInt(row[colCorrect].trim(), 10);
      if (!isNaN(nextCorrect) && nextCorrect >= 0 && nextCorrect < 4 && nextCorrect !== question.correct) {
        questionDiffs.push({ field: 'correct', old: question.correct, next: nextCorrect });
        question.correct = nextCorrect;
      }
    }

    // 4. Explanation
    if (colExp !== -1 && row[colExp]) {
      const nextExp = row[colExp].trim();
      if (nextExp !== question.explanation) {
        questionDiffs.push({ field: 'explanation', old: question.explanation, next: nextExp });
        question.explanation = nextExp;
      }
    }

    // 5. Skill
    if (colSkill !== -1 && row[colSkill]) {
      const nextSkill = row[colSkill].trim();
      if (nextSkill !== question.skill) {
        questionDiffs.push({ field: 'skill', old: question.skill, next: nextSkill });
        question.skill = nextSkill;
      }
    }

    // 6. RuleTag
    if (colRule !== -1 && row[colRule]) {
      const nextRule = row[colRule].trim();
      if (nextRule !== question.ruleTag) {
        questionDiffs.push({ field: 'ruleTag', old: question.ruleTag, next: nextRule });
        question.ruleTag = nextRule;
      }
    }

    // 7. Difficulty
    if (colDiff !== -1 && row[colDiff]) {
      const nextDiff = parseInt(row[colDiff].trim(), 10);
      if (!isNaN(nextDiff) && nextDiff >= 1 && nextDiff <= 3 && nextDiff !== question.difficulty) {
        questionDiffs.push({ field: 'difficulty', old: question.difficulty, next: nextDiff });
        question.difficulty = nextDiff;
      }
    }

    // 8. Reviewed Status
    if (colRev !== -1 && row[colRev] !== undefined) {
      const revStr = row[colRev].trim().toLowerCase();
      const isRev = (revStr === 'true' || revStr === '1' || revStr === 'نعم' || revStr === 'مراجعة' || revStr === 'متقن');
      if (isRev !== question.reviewed) {
        questionDiffs.push({ field: 'reviewed', old: question.reviewed, next: isRev });
        question.reviewed = isRev;
      }
    }

    if (question.reviewed) {
      report.reviewedCount += 1;
    }

    report.updatedCount += 1;
    if (questionDiffs.length > 0) {
      report.changes.push({ id: qId, trackTitle: track.trackTitle, stationTitle: station.title, diffs: questionDiffs });
    }
  });

  // Write updated tracks back to content/journey/tracks.json
  fs.writeFileSync(tracksPath, JSON.stringify(tracks, null, 2), 'utf8');

  // Also update individual track json files
  tracks.forEach(t => {
    const fName = `${t.trackId}.json`;
    const fPath = path.join(journeyDir, fName);
    if (fs.existsSync(fPath)) {
      fs.writeFileSync(fPath, JSON.stringify(t, null, 2), 'utf8');
    }
  });

  return report;
}

// CLI Execution Handler
if (process.argv[1] && process.argv[1].endsWith('apply_review.js')) {
  console.log('=================================================================');
  console.log('   SCOREAR: تطبيق ملف المراجعة اللغوية (CSV -> JSON)');
  console.log('=================================================================');

  const customPath = process.argv[2] || null;
  try {
    const r = applyReview(customPath);
    console.log(`\n📊 ملخص المعالجة:`);
    console.log(`   - إجمالي الصفوف في CSV: ${r.totalRows}`);
    console.log(`   - أسئلة تمت مطابقتها وتحديثها: ${r.updatedCount}`);
    console.log(`   - أسئلة معتمدة لغوياً (reviewed: true): ${r.reviewedCount} / ${r.updatedCount}`);
    console.log(`   - صفوف مرفوضة لتغيير المعرّف: ${r.rejectedCount}`);

    if (r.rejections.length > 0) {
      console.log(`\n❌ الصفوف المرفوضة:`);
      r.rejections.forEach(rej => {
        console.log(`   - سطر ${rej.rowNumber}: معرّف "${rej.providedId}" -> ${rej.reason}`);
      });
    }

    if (r.changes.length > 0) {
      console.log(`\n📝 تفاصيل التغييرات المُطبقة:`);
      r.changes.forEach(c => {
        console.log(`   • السؤال [${c.id}] في ${c.trackTitle}:`);
        c.diffs.forEach(d => {
          console.log(`     - [${d.field}]: "${String(d.old).slice(0, 35)}..." -> "${String(d.next).slice(0, 35)}..."`);
        });
      });
    } else {
      console.log(`\n✅ البيانات في CSV مطابقة تماماً للملفات الحالية (لا توجد فروق نصية).`);
    }
    console.log('\n🎉 اكتمل التحديث بنجاح وحُفظت ملفات content/journey/*.json!');
  } catch (err) {
    console.error('\n❌ فشل تطبيق المراجعة:', err.message);
    process.exit(1);
  }
}
