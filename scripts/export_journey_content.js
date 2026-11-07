import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const journeyDir = path.join(ROOT, 'content', 'journey');

if (!fs.existsSync(journeyDir)) {
  fs.mkdirSync(journeyDir, { recursive: true });
}

const naatData = {
  trackId: 'grammar_naat',
  trackTitle: 'مسار النعت وأقسامه (المفرد والجملة)',
  trackIcon: '📘',
  category: 'النحو العربي',
  desc: 'تدريب هادئ على شروط النعت وتطابقه مع المنعوت، مع تطبيق عملي على الجمل بعد النكرات.',
  stations: [
    {
      id: 'station_naat_01',
      title: 'محطة النعت المفرد والجملة',
      order: 1,
      minPassRate: 0.70, // 70% threshold
      questions: [
        {
          id: 'q_naat_01',
          type: 'mcq',
          text: '«قرأتُ كتابًا ممتعًا». ما إعراب كلمة «ممتعًا» في الجملة؟',
          options: [
            'نعت منصوب وعلامة نصبه الفتحة',
            'حال منصوب وعلامة نصبه الفتحة',
            'مفعول به ثانٍ منصوب',
            'تمييز منصوب وعلامة نصبه الفتحة'
          ],
          correct: 0,
          explanation: '«ممتعًا» اسم نكرة يصف اسماً نكرة قبله «كتابًا» ويتبعه في الإعراب (النصب) والتنكير والتذكير، فهو نعت حقيقي منصوب.',
          skill: 'النعت المفرد وتطابقه',
          difficulty: 1,
          ruleTag: 'النعت المفرد',
          reviewed: false
        },
        {
          id: 'q_naat_02',
          type: 'mcq',
          text: 'أيّ من الجمل الآتية تشتمل على «نعت جملة فعلية»؟',
          options: [
            'هذا بطلٌ تاريخيٌّ عظيم',
            'قرأتُ قصةً تُثيرُ الخيالَ والتفكير',
            'رأيتُ الطالبَ مسرعاً إلى فصله',
            'إنّ الامتحانَ سهلٌ وميسور'
          ],
          correct: 1,
          explanation: 'القاعدة الذهبية: الجمل بعد النكرات صفات. جملة «تُثير الخيال» جاءت بعد نكرة «قصةً» وفيها رابط يعود عليها.',
          skill: 'نعت الجملة الفعلية',
          difficulty: 2,
          ruleTag: 'نعت الجملة',
          reviewed: false
        },
        {
          id: 'q_naat_03',
          type: 'mcq',
          text: '«سكنتُ في بيتٍ حديقتُهُ واسعةٌ». ما المحل الإعرابي لجملة «حديقتُهُ واسعةٌ»؟',
          options: [
            'في محل رفع خبر مبتدأ',
            'في محل نصب حال',
            'في محل جر نعت',
            'في محل جزم جواب شرط'
          ],
          correct: 2,
          explanation: 'المنعوت «بيتٍ» اسم مجرور نكرة، وجملة المبتدأ والخبر «حديقته واسعة» جاءت وصفاً له؛ لذا فهي في محل جر نعت.',
          skill: 'نعت الجملة الاسمية',
          difficulty: 2,
          ruleTag: 'نعت الجملة',
          reviewed: false
        },
        {
          id: 'q_naat_04',
          type: 'mcq',
          text: '«كرّمت المدرسةُ الطالبتينِ ...». اختر النعت المناسب لإكمال الجملة:',
          options: [
            'المجتهدتانِ',
            'المجتهدتينِ',
            'المجتهداتِ',
            'المجتهدونَ'
          ],
          correct: 1,
          explanation: 'المنعوت «الطالبتين» مفعول به منصوب بالياء لأنه مثنى، والنعت يتبع المنعوت في الإعراب؛ لذا الصواب «المجتهدتينِ».',
          skill: 'تطابق النعت في التثنية',
          difficulty: 2,
          ruleTag: 'تطابق النعت',
          reviewed: false
        },
        {
          id: 'q_naat_05',
          type: 'mcq',
          text: '«العصفورُ فوقَ الشجرةِ يغرّدُ بجمالٍ». النعت شبه الجملة في هذه العبارة:',
          options: [
            'فوقَ الشجرةِ',
            'يغرّدُ',
            'بجمالٍ',
            'لا يوجد نعت في العبارة (شبه الجملة هنا خبر)'
          ],
          correct: 3,
          explanation: 'دقة نحوية: «العصفور» معرفة وليس نكرة، وشبه الجملة «فوق الشجرة» وقع خبراً للمبتدأ وليس نعتاً؛ فالنعت يتبع منعوتاً نكرة.',
          skill: 'تمييز شبه الجملة بعد المعارف',
          difficulty: 3,
          ruleTag: 'شبه الجملة',
          reviewed: false
        }
      ]
    }
  ]
};

const rhetoricData = {
  trackId: 'rhetoric_intro',
  trackTitle: 'مسار التشبيه والاستعارة (الجمال البلاغي)',
  trackIcon: '🎨',
  category: 'البلاغة والبيان',
  desc: 'استكشف الفروق الدقيقة بين التشبيه البليغ والاستعارات بنوعيها المكنية والتصريحية.',
  stations: [
    {
      id: 'station_rhetoric_01',
      title: 'محطة أركان التشبيه والاستعارة',
      order: 1,
      minPassRate: 0.70,
      questions: [
        {
          id: 'q_rhetoric_01',
          type: 'mcq',
          text: '«العلم نور يضيء الدروب». ما نوع الصورة البيانية في «العلم نور»؟',
          options: [
            'تشبيه بليغ (مبتدأ وخبر)',
            'استعارة تصريحية',
            'تشبيه تمثيلي',
            'كناية عن موصوف'
          ],
          correct: 0,
          explanation: 'حُذفت أداة التشبيه ووجه الشبه، وبقي الطرفان الأساسيان (المشبه: العلم، والمشبه به: نور)؛ لذا فهو تشبيه بليغ.',
          skill: 'أركان التشبيه البليغ',
          difficulty: 1,
          ruleTag: 'التشبيه البليغ',
          reviewed: false
        },
        {
          id: 'q_rhetoric_02',
          type: 'mcq',
          text: '«أقبلَ البحرُ يوزّع الهدايا على المتفوقين». ما نوع الاستعارة في كلمة «البحر»؟',
          options: [
            'استعارة مكنية',
            'استعارة تصريحية',
            'تشبيه مجمل',
            'مجاز مرسل'
          ],
          correct: 1,
          explanation: 'شُبِّه الرجل الكريم بالبحر، وحُذف المشبه وصُرِّح بلفظ المشبه به؛ لذا فهي استعارة تصريحية.',
          skill: 'الاستعارة التصريحية',
          difficulty: 2,
          ruleTag: 'الاستعارة',
          reviewed: false
        },
        {
          id: 'q_rhetoric_03',
          type: 'mcq',
          text: '«فلا تكن كالقوسِ يرمي بسهمِهِ ...». نوع التشبيه عند حذف وجه الشبه وبقاء الأداة:',
          options: [
            'تشبيه مؤكد',
            'تشبيه مجمل',
            'تشبيه بليغ',
            'تشبيه مقلوب'
          ],
          correct: 1,
          explanation: 'التشبيه المجمل هو ما حُذف منه وجه الشبه مع بقاء أداة التشبيه.',
          skill: 'أنواع التشبيه',
          difficulty: 2,
          ruleTag: 'أنواع التشبيه',
          reviewed: false
        },
        {
          id: 'q_rhetoric_04',
          type: 'mcq',
          text: '«ابتسمت لنا الأيامُ بعد طولِ عناءٍ». سر الجمال البلاغي في الاستعارة المكنية هنا:',
          options: [
            'التجسيم والتوضيح',
            'التشخيص',
            'التفخيم والمبالغة',
            'الإيجاز بالحذف'
          ],
          correct: 1,
          explanation: 'شُبّهت الأيام بإنسان يبتسم، ومنح الصفات البشرية لغير العاقل سر جماله التشخيص.',
          skill: 'أسرار الجمال البلاغي',
          difficulty: 2,
          ruleTag: 'سر الجمال',
          reviewed: false
        }
      ]
    }
  ]
};

const spellingData = {
  trackId: 'spelling_rules',
  trackTitle: 'مسار قواعد الإملاء والرسم الكتابي',
  trackIcon: '✍️',
  category: 'الإملاء والرسم',
  desc: 'قواعد الهمزات المتطرفة والمتوسطة والألف اللينة مع تدريبات ترسيخ الفهم.',
  stations: [
    {
      id: 'station_spelling_01',
      title: 'محطة الهمزات والألف اللينة',
      order: 1,
      minPassRate: 0.70,
      questions: [
        {
          id: 'q_spelling_01',
          type: 'mcq',
          text: 'اختر الرسم الإملائي الصحيح: «إنّ ... يعتزون بلغتهم العربية».',
          options: [
            'علمائنا',
            'علماؤنا',
            'علماءَنا',
            'علماءُنا'
          ],
          correct: 2,
          explanation: 'اسم «إنّ» يكون منصوباً، والهمزة المتطرفة إذا اتصل بها ضمير وكانت منصوبة كُتبت على السطر (علماءَنا).',
          skill: 'رسم الهمزة المتطرفة عند الاتصال بضمير',
          difficulty: 2,
          ruleTag: 'الهمزة المتطرفة',
          reviewed: false
        },
        {
          id: 'q_spelling_02',
          type: 'mcq',
          text: '«استمعَ الطالبُ لنصيحةِ معلّمه». نوع الهمزة في الفعل «استمعَ»:',
          options: [
            'همزة وصل لأنه ماضٍ خماسي',
            'همزة قطع لأنه ماضٍ سداسي',
            'همزة وصل لأنه أمر ثلاثي',
            'همزة قطع لأنه مضارع'
          ],
          correct: 0,
          explanation: 'الفعل «استَمَعَ» ماضٍ خماسي (5 أحرف)، وماضي الخماسي وأمره ومصدره همزتها دائماً همزة وصل.',
          skill: 'همزتا الوصل والقطع في الأفعال',
          difficulty: 1,
          ruleTag: 'همزة الوصل والقطع',
          reviewed: false
        },
        {
          id: 'q_spelling_03',
          type: 'mcq',
          text: 'اختر الكتابة الصحيحة لكلمة «...» في جملة: «قضى القاضي بالعدل بين الخصوم».',
          options: [
            'قضى بالألف المقصورة (الياء المهملة)',
            'قضا بالألف القائمة',
            'قظى بالظاء',
            'قضِ بحذف حرف العلة'
          ],
          correct: 0,
          explanation: 'الفعل ثلاثي وأصل ألفه ياء (قضى - يقضي)؛ لذا تُكتب الألف اللينة مقصورة على صورة الياء.',
          skill: 'رسم الألف اللينة في أواخر الأفعال الثلاثية',
          difficulty: 2,
          ruleTag: 'الألف اللينة',
          reviewed: false
        },
        {
          id: 'q_spelling_04',
          type: 'mcq',
          text: 'ما كتابة الهمزة في كلمة «دفء» عند تنوينها بالفتح؟',
          options: [
            'دفءً (على السطر مع ألف)',
            'دفئاً (على نبرة)',
            'دفؤاً (على واو)',
            'دفاءً'
          ],
          correct: 1,
          explanation: 'الحرف الذي قبل الهمزة (الفاء) يتصل بما بعده؛ لذا تُكتب الهمزة عند التنوين بالفتح على نبرة (دفئاً).',
          skill: 'تنوين الهمزة المتطرفة بالفتح',
          difficulty: 2,
          ruleTag: 'الهمزة المتطرفة والتنوين',
          reviewed: false
        }
      ]
    }
  ]
};

// Write individual JSON files
fs.writeFileSync(path.join(journeyDir, 'grammar_naat.json'), JSON.stringify(naatData, null, 2), 'utf8');
fs.writeFileSync(path.join(journeyDir, 'rhetoric_intro.json'), JSON.stringify(rhetoricData, null, 2), 'utf8');
fs.writeFileSync(path.join(journeyDir, 'spelling_rules.json'), JSON.stringify(spellingData, null, 2), 'utf8');

// Write combined tracks.json
const allTracks = [naatData, rhetoricData, spellingData];
fs.writeFileSync(path.join(journeyDir, 'tracks.json'), JSON.stringify(allTracks, null, 2), 'utf8');

// Build CSV
const allQuestions = [];
allTracks.forEach(t => {
  t.stations.forEach(st => {
    st.questions.forEach(q => {
      allQuestions.push({
        trackId: t.trackId,
        trackTitle: t.trackTitle,
        stationId: st.id,
        stationTitle: st.title,
        ...q
      });
    });
  });
});

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

const csvHeaders = [
  'المعرف (id)',
  'المسار (track)',
  'المحطة (station)',
  'المحطة المهارية (skill)',
  'نص السؤال (text)',
  'الاختيار 1',
  'الاختيار 2',
  'الاختيار 3',
  'الاختيار 4',
  'رقم الإجابة الصحيحة (0-3)',
  'نص الإجابة الصحيحة',
  'الشرح والتعليل (explanation)',
  'القاعدة (ruleTag)',
  'الصعوبة (1-3)',
  'تمت المراجعة اللغوية؟ (reviewed)'
];

const csvRows = [csvHeaders.map(escapeCsv).join(',')];

allQuestions.forEach(q => {
  const row = [
    q.id,
    q.trackTitle,
    q.stationTitle,
    q.skill,
    q.text,
    q.options[0] || '',
    q.options[1] || '',
    q.options[2] || '',
    q.options[3] || '',
    q.correct,
    q.options[q.correct] || '',
    q.explanation,
    q.ruleTag,
    q.difficulty,
    q.reviewed ? 'true' : 'false'
  ];
  csvRows.push(row.map(escapeCsv).join(','));
});

// UTF-8 BOM (\uFEFF)
const csvContent = '\uFEFF' + csvRows.join('\r\n');
fs.writeFileSync(path.join(journeyDir, 'questions_review.csv'), csvContent, 'utf8');

console.log('Successfully generated JSON files and questions_review.csv!');
console.log('Total questions exported:', allQuestions.length);
