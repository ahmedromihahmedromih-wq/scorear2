'use strict';
const icons={home:'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',planet:'M19 12a7 7 0 1 1-7-7M20 4C14 1 0 15 4 19S24 9 20 4Z',route:'M6 4a2 2 0 1 0 0 .1M6 6v6a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V8M18 5a2 2 0 1 0 0 .1M18 18v3M16 19h4',book:'M12 5v16M12 5C9 2 4 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-2-10 1Z',arrow:'M19 12H5m6-6-6 6 6 6',key:'M15 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12ZM10 13l-7 7m0-4v4h4M16 7h.01',motion:'M3 8h4M1 12h4M3 16h4M14 3a9 9 0 1 1-4 17M14 7v5l3 2',info:'M12 11v6M12 7h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z',menu:'M4 6h16M4 12h16M4 18h16',close:'m6 6 12 12M6 18 18 6',play:'m8 4 13 8-13 8Z',check:'m5 12 4 4L19 6',spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z',trophy:'M7 3h10v6a5 5 0 0 1-10 0V3ZM7 5H3v3a4 4 0 0 0 4 4M17 5h4v3a4 4 0 0 1-4 4M12 14v7m-4 0h8',users:'M9 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM2 21v-3a7 7 0 0 1 14 0v3M16 4a4 4 0 0 1 0 8m3 2a6 6 0 0 1 3 5v2',clock:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM12 6v6l4 2',upload:'M12 16V3m-5 5 5-5 5 5M3 15v6h18v-6',file:'M14 2H4v20h16V8l-6-6ZM14 2v6h6M8 13h8M8 17h5',trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',chart:'M4 3v18h17M8 16v-5m5 5V7m5 9V4',shield:'M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6L12 2Zm-5 10 3 3 7-7',edit:'m16 3 5 5-12 12-6 1 1-6L16 3Zm-2 2 5 5',search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6',download:'M12 3v13m-5-5 5 5 5-5M3 16v5h18v-5'};
const fallbackIcon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[n]||icons.spark}"/></svg>`;
const lucideMap={home:'House',grid:'PanelsTopLeft',planet:'Orbit',route:'Route',book:'BookOpen',arrow:'ArrowLeft',key:'KeyRound',motion:'Waves',info:'Info',menu:'Menu',close:'X',play:'Play',check:'Check',spark:'Sparkles',trophy:'Trophy',users:'UsersRound',clock:'Clock3',upload:'CloudUpload',file:'FileText',trash:'Trash2',chart:'ChartNoAxesCombined',shield:'ShieldCheck',edit:'PenLine',search:'Search',download:'Download'};
const icon=n=>{const data=window.lucide?.[lucideMap[n]];if(!data)return fallbackIcon(n);const attrs=o=>Object.entries(o).map(([k,v])=>`${k}="${String(v).replace(/"/g,'&quot;')}"`).join(' ');return `<svg ${attrs({...data[1],'stroke-width':1.7,'aria-hidden':true})}>${data[2].map(([tag,a])=>`<${tag} ${attrs(a)}/>`).join('')}</svg>`;};
const $=s=>document.querySelector(s);const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function hydrate(root=document){root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));}
function readStore(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function writeStore(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{toast('تعذّر الحفظ على هذا الجهاز.');return false;}}

// ALL 6 WORLDS
const worlds=[
  {id:'royal',image:'academy',name:'القصر الملكي',label:'ابدأ الاكتشاف',tag:'مغامرة ملكية',desc:'أبهة الأقواس الإسلامية والفخامة الملكية التراثية.',mode:'سباق المعرفة',color:'#e5d8b8'},
  {id:'oasis',image:'oasis',name:'الواحة العربية',label:'تعلّم على مهل',tag:'واحة النخيل',desc:'واحة النخيل والغسق الصحراوي الساحر.',mode:'تحدي الإتقان',color:'#dcecdf'},
  {id:'cosmic',image:'cosmic',name:'محطة الفضاء',label:'فكّر أبعد',tag:'رحلة فضائية',desc:'أفق المجرات ومستقبل العلوم والتكنولوجيا.',mode:'مهمة الفريق',color:'#e5e0f1'},
  {id:'treasure',image:'treasure',name:'جزيرة الكنز',label:'خض المغامرة',tag:'مغامرة القراصنة',desc:'شاطئ استوائي غامض وكنوز متوهجة في أعماق البحار.',mode:'سباق المعرفة',color:'#fae5c8'},
  {id:'stadium',image:'stadium',name:'استاد الأبطال',label:'حماس البطولة',tag:'ملعب الكبار',desc:'أضواء الملاعب الكبرى وهتافات الجماهير الحماسية.',mode:'مهمة الفريق',color:'#d0f0dc'},
  {id:'magic',image:'magic',name:'مملكة السحر',label:'عالم الأساطير',tag:'سحر وبلورات',desc:'قلعة سحرية عائمة بين الغيوم الأرجوانية والتعاويذ.',mode:'تحدي الإتقان',color:'#f0d6fa'}
];

// 20 OFFICIAL CANONICAL ANIMATED HEROES WITH SPRITE ATLASES (IDLE / WALK / CELEBRATE)
const cleanCharacterRoster = [
  {id:'char_01', name:'زياد', title:'المستكشف', category:'human', color:'#39d8ce'},
  {id:'char_02', name:'نور', title:'صانعة الأفكار', category:'human', color:'#ba9aff'},
  {id:'char_03', name:'سليم', title:'العالِم', category:'human', color:'#ffd066'},
  {id:'char_04', name:'فريدة', title:'الفنانة', category:'human', color:'#ff8c94'},
  {id:'char_05', name:'ياسين', title:'الرياضي', category:'human', color:'#73dc98'},
  {id:'char_06', name:'ملك', title:'حارسة المعرفة', category:'human', color:'#f8a8d1'},
  {id:'char_07', name:'عمر', title:'المخترع', category:'human', color:'#ffb66b'},
  {id:'char_08', name:'هنا', title:'رائدة الفضاء', category:'human', color:'#bba8ff'},
  {id:'char_09', name:'ليث', title:'الأسد الشجاع', category:'animal', color:'#ffd066'},
  {id:'char_10', name:'فلفل', title:'الثعلب الرحّال', category:'animal', color:'#ffaf76'},
  {id:'char_11', name:'قفزة', title:'الأرنب السريع', category:'animal', color:'#ffa3bc'},
  {id:'char_12', name:'بندق', title:'الباندا الفضولي', category:'animal', color:'#b3df93'},
  {id:'char_13', name:'مشمش', title:'القط المخترع', category:'animal', color:'#80caff'},
  {id:'char_14', name:'حكيم', title:'البومة القارئة', category:'animal', color:'#c0a3ff'},
  {id:'char_15', name:'نبض', title:'الروبوت الودود', category:'fantasy', color:'#70ead9'},
  {id:'char_16', name:'وميض', title:'رفيق المستقبل', category:'fantasy', color:'#bfa2ff'},
  {id:'char_17', name:'شرارة', title:'التنين الصغير', category:'fantasy', color:'#78d9b8'},
  {id:'char_18', name:'غيمة', title:'صديق السماء', category:'fantasy', color:'#b3e5ff'},
  {id:'char_19', name:'نجم', title:'ساحر النجوم', category:'fantasy', color:'#ffe395'},
  {id:'char_20', name:'بلّور', title:'فارس الكريستال', category:'fantasy', color:'#89e8f3'}
];
window.cleanCharacterRoster = cleanCharacterRoster;

let contestQuestions=[
  {
    skill: 'النحو العربي',
    q: '«قرأتُ كتابًا ممتعًا». ما إعراب كلمة «ممتعًا» في الجملة؟',
    opts: ['حال منصوب وعلامة نصبه الفتحة', 'نعت منصوب وعلامة نصبه الفتحة', 'مفعول به ثانٍ منصوب', 'تمييز منصوب وعلامة نصبه الفتحة'],
    answer: 1,
    why: '«ممتعًا» اسم نكرة يصف الاسم النكرة الذي قبله «كتابًا» ويتبعه في الإعراب والنصب والتنكير والتذكير، فهو نعت حقيقي منصوب.'
  },
  {
    skill: 'البلاغة والبيان',
    q: '«العلم نور يضيء الدروب». ما نوع الصورة البيانية في «العلم نور»؟',
    opts: ['استعارة تصريحية', 'تشبيه تمثيلي', 'تشبيه بليغ (مبتدأ وخبر)', 'كناية عن موصوف'],
    answer: 2,
    why: 'حُذفت أداة التشبيه ووجه الشبه، وجاء التشبيه على صورة المبتدأ والخبر (المشبه: العلم، المشبه به: نور)؛ لذا فهو تشبيه بليغ.'
  },
  {
    skill: 'النحو العربي',
    q: 'أيّ من الجمل الآتية تشتمل على «نعت جملة فعلية»؟',
    opts: ['رأيتُ الطالبَ مسرعاً إلى فصله', 'هذا بطلٌ تاريخيٌّ عظيم', 'قرأتُ قصةً تُثيرُ الخيالَ والتفكير', 'إنّ الامتحانَ سهلٌ وميسور'],
    answer: 2,
    why: 'الجمل بعد النكرات صفات؛ فجملة «تُثير الخيال» جاءت بعد نكرة «قصةً» وفيها ضمير مستتر يعود عليها في محل نصب نعت.'
  },
  {
    skill: 'القراءة والفهم القرائي',
    q: '«نظّم أحمد وقته واستثمر جهده، فأنجز عمله مبكرًا». ما علاقة جملة «فأنجز عمله» بما قبلها؟',
    opts: ['علاقة تعليل وسبب', 'علاقة نتيجة وترتّب', 'علاقة تفسير وتوضيح', 'علاقة تقابل وتضاد'],
    answer: 1,
    why: 'إنجاز العمل مبكراً هو الثمرة والنتيجة الطبيعية لتنظيم الوقت، وحرف العطف (الفاء) يفيد السببية والترتيب مع التعقيب.'
  },
  {
    skill: 'الإملاء والرسم الكتابي',
    q: 'اختر الرسم الإملائي الصحيح للكلمة: «إنّ ... يعتزون بلغتهم العربية».',
    opts: ['علماؤنا', 'علمائنا', 'علماءَنا', 'علماءُنا'],
    answer: 2,
    why: 'اسم «إنّ» يكون منصوباً، والهمزة المتطرفة إذا اتصل بها ضمير وكانت منصوبة تُكتب على السطر (علماءَنا).'
  }
];
window.contestQuestions = contestQuestions;

let currentLobbyPin = '849201';
let currentLobbyWorldId = 'royal';

const state={
  progress:readStore('scorear_v3_progress',{done:{},mistakes:[],xp:0}),
  files:readStore('scorear_v3_files',[]),
  filter:'all',
  quiz:null,
  lobbyParticipants: readStore('scorear_lobby_participants', [])
};

function worldCard(w){
  return `<article class="world-card" data-world-id="${w.id}">
    <div class="world-thumb">
      <img src="assets/${w.image}.webp" alt="${w.name}" loading="lazy" width="768" height="512">
      <span class="world-chip">${w.tag}</span>
    </div>
    <div class="world-body">
      <div class="world-body-top">
        <h3>${w.name}</h3>
        <span style="color:#FFD93D;font-size:15px">✦</span>
      </div>
      <p>${w.desc}</p>
      <div class="world-actions-stack" style="margin-top:14px;display:flex;flex-direction:column;gap:8px;">
        <button class="btn dark small" data-action="launchworld" data-world="${w.id}" style="width:100%;justify-content:center;font-weight:900;">🚀 انطلاق القاعة بهذا العالم</button>
        <div style="display:flex;gap:6px;">
          <button class="btn light small" data-action="preview" data-world="${w.id}" style="flex:1;justify-content:center;">🎬 معاينة الفيديو</button>
          <button class="btn outline small" data-action="worldquiz" data-world="${w.id}" style="flex:1;justify-content:center;">🎯 تجربة سؤال</button>
        </div>
      </div>
    </div>
  </article>`;
}

function home(){return window.renderLaunchHome();}
function studio(){
  const user = window.ScoreARAuth ? window.ScoreARAuth.getUser() : null;
  const isAuthorized = user && (user.role === 'admin' || user.role === 'teacher');
  if (!isAuthorized) {
    if (user && (user.role === 'pending_teacher' || user.status === 'pending')) {
      return `<div class="page" style="text-align:center;padding:70px 20px;"><div style="max-width:520px;margin:0 auto;background:#13152a;border:1px solid rgba(245,158,11,0.4);border-radius:24px;padding:36px 24px;box-shadow:0 12px 40px rgba(0,0,0,0.5);"><div style="font-size:48px;margin-bottom:12px;">⏳</div><h2 style="color:#ffffff;font-size:22px;font-weight:900;margin-bottom:8px;">حسابك قيد المراجعة والاعتماد</h2><p style="color:#fde68a;font-size:14px;line-height:1.6;margin-bottom:20px;">أهلاً بك أ. ${esc(user.displayName || 'المعلم')}. طلب تسجيلك تم استلامه وهو قيد المراجعة والاعتماد من قبل إدارة سكور آر. لا يمكنك دخول استوديو المعلم قبل اعتماد الإدارة وتفعيل البريد.</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;"><button class="btn dark" onclick="if(window.ScoreARAuth&&window.ScoreARAuth.checkApprovalStatus)window.ScoreARAuth.checkApprovalStatus();" style="padding:12px 20px;font-size:14px;font-weight:900;border-radius:12px;background:#7550ef;cursor:pointer;">تحقق من الاعتماد 🔄</button><a href="#home" class="btn outline" style="padding:12px 20px;font-size:14px;font-weight:900;border-radius:12px;text-decoration:none;display:inline-block;">الرئيسية ↩</a></div></div></div>`;
    }
    if (user && user.role === 'student') {
      return `<div class="page" style="text-align:center;padding:70px 20px;"><div style="max-width:520px;margin:0 auto;background:#13152a;border:1px solid rgba(16,185,129,0.4);border-radius:24px;padding:36px 24px;box-shadow:0 12px 40px rgba(0,0,0,0.5);"><div style="font-size:48px;margin-bottom:12px;">🎒</div><h2 style="color:#ffffff;font-size:22px;font-weight:900;margin-bottom:8px;">استوديو المعلم مخصص للمعلمين فقط</h2><p style="color:#a7f3d0;font-size:14px;line-height:1.6;margin-bottom:20px;">أهلاً بك يا بطل (${esc(user.displayName || 'طالب')})! هذا القسم مخصص للمعلمين لإعداد المسابقات وإدارة الفصول. مكانك هو في رحلتك التعليمية وقاعة المنافسات.</p><a href="#journey" class="btn dark" style="padding:12px 24px;font-size:14px;font-weight:900;border-radius:12px;text-decoration:none;display:inline-block;background:#10b981;">الانتقال لرحلتي التعليمية 🌟</a></div></div>`;
    }
    return `<div class="page" style="text-align:center;padding:70px 20px;"><div style="max-width:500px;margin:0 auto;background:#13152a;border:1px solid rgba(142,100,239,0.3);border-radius:24px;padding:36px 24px;box-shadow:0 12px 40px rgba(0,0,0,0.5);"><div style="width:84px;height:84px;margin:0 auto 16px;border-radius:22px;border:2px solid #8e64ef;box-shadow:0 0 20px rgba(142,100,239,0.4);overflow:hidden;background:#1b1c33;"><img src="assets/characters/teacher_ahmed.webp?v=20261106_real" alt="المعلم" style="width:100%;height:100%;object-fit:cover;"></div><h2 style="color:#ffffff;font-size:22px;font-weight:900;margin-bottom:8px;">استوديو المعلم والإدارة محمي 🔒</h2><p style="color:#b1a2e9;font-size:14px;line-height:1.6;margin-bottom:24px;">يتطلب الدخول إلى استوديو المعلم وإنشاء المسابقات تسجيل الدخول بحساب معتمد بصلاحيات المعلم أو المشرف.</p><button class="btn dark" onclick="if(window.ScoreARAuthUI)window.ScoreARAuthUI.openUnifiedLoginModal();else if(window.openTeacherLoginModal)openTeacherLoginModal();" style="padding:14px 28px;font-size:15px;font-weight:900;border-radius:14px;">تسجيل الدخول الآن 🚀</button></div></div>`;
  }
  return window.renderTeacherStudio();
}
function worldPage(){
  const shown=state.filter==='all'?worlds:worlds.filter(w=>w.id===state.filter);
  return `<div class="page worlds-page">
    <div class="page-title">
      <div class="eyebrow">قاعة المنافسات</div>
      <h1>اختر عالم الحصة القادمة.</h1>
      <p>6 عوالم كرتونية عربية بدقة 2K وفيديو 1080p سينمائي. انطلق بالقاعة أو عاين العالم.</p>
    </div>
    <div class="section-head" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:14px;">
      <div class="tabs" style="margin:0;flex-wrap:wrap;gap:6px;">
        ${[['all','كل العوالم'],['royal','القصر الملكي'],['oasis','الواحة'],['cosmic','الفضاء'],['treasure','جزيرة الكنز'],['stadium','الاستاد'],['magic','السحر']].map(([id,t])=>`<button class="tab ${state.filter===id?'active':''}" data-action="filter" data-filter="${id}" aria-pressed="${state.filter===id}">${t}</button>`).join('')}
      </div>
      <button class="btn dark small" data-action="setup" data-world="royal">جهّز القاعة ${icon('arrow')}</button>
    </div>
    <div class="world-grid">${shown.map(worldCard).join('')}</div>
  </div>`;
}

function journey(){
  if (window.ScoreARJourney && typeof window.ScoreARJourney.renderJourneyPage === 'function') {
    return window.ScoreARJourney.renderJourneyPage();
  }
  let done=Object.keys(state.progress.done).length;
  return `<div class="page">
    <div class="page-title">
      <div class="eyebrow">رحلتي التعليمية</div>
      <h1>خطوتك الصغيرة، تصنع فرقًا.</h1>
      <p>تدريبات عربية قصيرة. جرب، افهم، ثم عد إلى ما يحتاج مراجعة.</p>
    </div>
    <div class="journey-summary" style="display:flex;gap:16px;margin-bottom:30px;flex-wrap:wrap;">
      <div class="stat" style="flex:1;min-width:180px;"><strong>${done} / 3</strong><span>مسارات مكتملة</span></div>
      <div class="stat" style="flex:1;min-width:180px;"><strong>${state.progress.xp}</strong><span>نقطة تعلّم</span></div>
      <div class="stat" style="flex:1;min-width:180px;"><strong>${state.progress.mistakes.length}</strong><span>سؤال للمراجعة</span></div>
    </div>
  </div>`;
}

function library(){
  return `<div class="page">
    <div class="page-title">
      <div class="eyebrow">مكتبة المحتوى</div>
      <h1>محتواك المنظم، جاهز لكل حصة.</h1>
      <p>ارفع ملفات الشرح، أوراق العمل، وبنوك الأسئلة للاستخدام المباشر في قاعاتك.</p>
    </div>
    <div class="drop-zone" id="dropZone" style="border:2px dashed rgba(142,100,239,0.4);border-radius:24px;padding:45px 20px;text-align:center;background:#15172a;cursor:pointer;">
      <div style="font-size:48px;margin-bottom:12px;">📁</div>
      <h3 style="color:#ffffff;font-size:22px;font-weight:900;margin-bottom:8px;">اسحب الملفات هنا أو اضغط للاختيار</h3>
      <p style="color:#a1a4be;font-size:13px;margin-bottom:20px;">ندعم ملفات PDF، Word، والـ Excel لتحويلها تلقائياً إلى أسئلة مسابقة</p>
      <input type="file" id="fileInput" style="display:none;" accept=".pdf,.doc,.docx,.xlsx,.txt">
      <button class="btn dark" onclick="$('#fileInput').click()">تصفح ملفات جهازك 📂</button>
    </div>
  </div>`;
}

function about(){
  return `<div class="page">
    <div class="page-title">
      <div class="eyebrow">عن سكور آر</div>
      <h1>تعلّم عربي، بروح جيل جديد.</h1>
    </div>
    <div class="panel" style="line-height:2;color:#ddd8ff;font-size:15px;">
      <p style="margin-bottom:16px;"><b>سكور آر (ScoreAR)</b> منصة مسابقات تعليمية تفاعلية عربية، أسسها ويشرف عليها الأستاذ <b>أحمد صلاح رميح</b>، لتمكين المعلم من إدارة أنشطة الحصة بأسلوب الألعاب والتحديات المشوقة.</p>
      <p>تجمع المنصة بين إعداد الأسئلة بالذكاء الاصطناعي، وعرض العوالم الكرتونية بدقة 2K وفيديوهات حية في الخلفية، مع تنافس حي بين شخصيات وأبطال يمثلون كل طالب داخل الفصل.</p>
    </div>
  </div>`;
}

// =========================================================================
// TEACHER & STUDENT AUTHENTICATION SYSTEM
// Implemented via modular auth.js and auth-ui.js (Rule 7: < 500 lines per file)
// =========================================================================
function openTeacherLoginModal(){
  if (window.ScoreARAuthUI && typeof window.ScoreARAuthUI.openModal === 'function') {
    window.ScoreARAuthUI.openModal('teacher');
  } else if (typeof window.openAuthModal === 'function') {
    window.openAuthModal('teacher');
  } else {
    openModal('بوابة الدخول', '<div class="modal-body-pad"><p>جارٍ تحميل وحدة المصادقة...</p></div>');
  }
}

function join(initialPin = ''){
  if (window.ScoreARStudentJoin && typeof window.ScoreARStudentJoin.openJoinModal === 'function') {
    window.ScoreARStudentJoin.openJoinModal(initialPin);
  } else if (window.ScoreARStudentJoin && typeof window.ScoreARStudentJoin.init === 'function') {
    openModal('انضم إلى قاعة الاختبار 🎮', '<div id="scorearStudentJoinMount" style="padding:4px 0;"></div>');
    const mount = document.getElementById('scorearStudentJoinMount');
    if (mount) window.ScoreARStudentJoin.init(mount, initialPin);
  } else {
    openModal('انضم إلى قاعتك بالـ PIN', '<div class="modal-body-pad"><p>جارٍ تحميل وحدة الانضمام...</p></div>');
  }
}

function updateTopActionsTeacher(teacher){
  if (window.ScoreARAuthUI && typeof window.ScoreARAuthUI.updateTopActionsTeacher === 'function') {
    window.ScoreARAuthUI.updateTopActionsTeacher(teacher);
  }
}

// =========================================================================
// NEVER-BLACK CARTOON WORLDS LIVE LOBBY
// =========================================================================
function renderLiveLobby(worldId='royal', pin=null, bypassPicker=false, bypassModePicker=false){
  if (window.ScoreARQuizHost && typeof window.ScoreARQuizHost.startHostLobby === 'function') {
    return window.ScoreARQuizHost.startHostLobby(worldId, pin, bypassPicker, bypassModePicker);
  }
  if (!bypassPicker && window.ScoreARWorldFlow && typeof window.ScoreARWorldFlow.openWorldPicker === 'function') {
    return window.ScoreARWorldFlow.openWorldPicker({
      defaultWorldId: worldId,
      pin: pin,
      onConfirm: (chosenWorld) => renderLiveLobby(chosenWorld, pin, true, false)
    });
  }
  currentLobbyWorldId = worldId;
  currentLobbyPin = pin || (window.ScoreARRealtime ? window.ScoreARRealtime.generatePin() : String(Math.floor(100000 + Math.random() * 900000)));
  const w = worlds.find(x => x.id === worldId) || worlds[0];
  const participants = readStore('scorear_lobby_participants', []);

  let existing = document.getElementById('liveLobbyStage');
  if (!existing) {
    existing = document.createElement('div');
    existing.id = 'liveLobbyStage';
    existing.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0c0d1d;overflow:hidden;font-family:Cairo,Tajawal,sans-serif;direction:rtl;';
    document.body.appendChild(existing);
  }

  existing.innerHTML = `
    <!-- LAYER 1: Permanent Crisp Cartoon Background (NEVER BLACK, ZERO JITTER) -->
    <div style="position:absolute;inset:0;background:url('assets/${w.image}.webp') center/cover no-repeat;z-index:1;"></div>

    <!-- LAYER 2: 1080p Ultra-Smooth Seamless Looping Cartoon Video (100% Opaque, No Ghosting) -->
    <video src="assets/videos/worlds/${w.id}.mp4?v=20261106_smooth" poster="assets/${w.image}.webp" autoplay loop muted playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2;opacity:1;"></video>

    <!-- LAYER 3: Dark Vignette / Atmosphere -->
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center, rgba(12,13,29,0.2) 0%, rgba(12,13,29,0.7) 100%);z-index:3;"></div>

    <!-- LAYER 4: Top Action Header -->
    <div style="position:absolute;top:20px;left:24px;right:24px;display:flex;justify-content:space-between;align-items:center;z-index:20;">
      <div style="display:flex;align-items:center;gap:12px;background:rgba(17,18,37,0.85);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,0.15);padding:10px 18px;border-radius:18px;">
        <span style="font-size:22px;">🌍</span>
        <div>
          <b style="color:#ffffff;font-size:15px;display:block;">عالم ${w.name}</b>
          <small style="color:#52d9ed;font-size:11px;">${w.tag} · جاهز للمنافسة</small>
        </div>
      </div>

      <div style="display:flex;gap:10px;align-items:center;">
        <button class="btn dark" onclick="startActiveContest('${w.id}')" style="font-size:15px;padding:12px 24px;font-weight:900;border-radius:14px;box-shadow:0 0 25px rgba(117,80,239,0.75);">🚀 بدء المنافسة فوراً</button>
        <button class="btn light" onclick="openAddHeroModal('${w.id}', '${pin}')" style="font-size:13px;padding:10px 16px;border-radius:12px;">+ إضافة بطل تجريبي</button>
        <button class="btn outline" onclick="closeLiveLobby()" style="background:rgba(0,0,0,0.5);border-radius:12px;padding:10px 16px;color:#fff;">✕ مغادرة القاعة</button>
      </div>
    </div>

    <!-- LAYER 5: 3D Pure White Floating PIN Box -->
    <div style="position:absolute;top:90px;left:50%;transform:translateX(-50%);z-index:20;">
      <div class="lobby-white-3d-box" style="padding:16px 36px;display:flex;align-items:center;gap:28px;text-align:right;">
        <div id="lobbyQrCodeHolder" style="width:76px;height:76px;background:#fff;border-radius:12px;padding:4px;box-shadow:0 4px 12px rgba(0,0,0,0.15);"></div>
        <div>
          <span style="font-size:11px;font-weight:900;letter-spacing:1px;color:#7550ef;text-transform:uppercase;display:block;">رمز القاعة المباشر (PIN)</span>
          <div style="font-size:42px;font-weight:900;letter-spacing:10px;line-height:1.1;color:#0c0d1d;font-family:Arial,sans-serif;margin:4px 0;">${pin}</div>
          <small style="color:#4b5563;font-size:12px;font-weight:700;">ادخل على <b>scorear-e4186.web.app</b> واكتب الرمز</small>
        </div>
        <button onclick="navigator.clipboard?.writeText('${pin}'); toast('تم نسخ رمز القاعة: ' + '${pin}');" style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:12px;padding:10px 14px;font-size:12px;font-weight:800;color:#1f2937;cursor:pointer;">نسخ 📋</button>
      </div>
    </div>

    <!-- LAYER 6: Fullbody 3D Characters Roster -->
    <div style="position:absolute;bottom:0;left:0;right:0;height:55vh;display:flex;align-items:flex-end;justify-content:center;gap:35px;padding:0 50px 30px;z-index:15;pointer-events:none;">
      ${participants.length === 0 ? `
        <div style="background:rgba(17,18,37,0.78);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.15);border-radius:24px;padding:24px 36px;text-align:center;pointer-events:auto;margin-bottom:60px;">
          <div style="font-size:42px;margin-bottom:8px;">⏳</div>
          <h3 style="color:#ffffff;font-size:20px;font-weight:900;">في انتظار انضمام الطلاب والأبطال...</h3>
          <p style="color:#b1a2e9;font-size:13px;margin:8px 0 16px;">شارك رمز القاعة الموضح بالأعلى، أو اضغط أدناه لإضافة أبطال تجريبيين فوراً</p>
          <button class="btn dark small" onclick="openAddHeroModal('${w.id}', '${pin}')" style="margin:0 auto;display:inline-flex;">+ انضمام أبطال تجريبيين للقاعة</button>
        </div>
      ` : participants.map((p, idx) => `
        <div class="animate-enter-fullbody" style="position:relative;display:flex;flex-direction:column;align-items:center;pointer-events:auto;animation-delay:${idx*0.08}s;">
          <div class="player-name-floating-pill" style="margin-bottom:12px;">
            <span>🛡️</span>
            <span>${esc(p.name)}</span>
            <button onclick="removeHeroIndex(${idx}, '${w.id}', '${pin}')" style="background:none;border:0;color:#ef4444;font-size:12px;cursor:pointer;padding:0 0 0 4px;" title="حذف">✕</button>
          </div>
          <div style="position:relative;width:150px;height:240px;display:flex;align-items:flex-end;justify-content:center;">
            <span class="scorear-character character-walk" style="--character-atlas:url('assets/characters/animated/${p.avatarId || 'char_01'}-atlas.webp');width:140px;height:190px;">
              <img src="assets/characters/animated/${p.avatarId || 'char_01'}-idle.webp" alt="${esc(p.name)}" style="object-fit:contain;filter:drop-shadow(0 15px 25px rgba(0,0,0,0.6));">
              <span class="character-frames" aria-hidden="true"></span>
            </span>
            <div style="position:absolute;bottom:0;width:120px;height:18px;background:radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 70%);border-radius:50%;z-index:-1;"></div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Bottom Status Bar -->
    <div style="position:absolute;bottom:12px;left:24px;display:flex;gap:16px;align-items:center;z-index:20;">
      <span style="background:rgba(17,18,37,0.85);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);padding:6px 14px;border-radius:12px;color:#ddd8ff;font-size:12px;font-weight:700;">
        👥 المتسابقون المتصلون: <b style="color:#52d9ed;">${participants.length}</b>
      </span>
      ${participants.length > 0 ? `
        <button onclick="clearLobbyParticipants('${w.id}', '${pin}')" style="color:#ff8a8a;background:rgba(255,107,107,0.15);border:1px solid rgba(255,107,107,0.3);padding:6px 12px;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;">تفريغ القاعة</button>
      ` : ''}
    </div>
  `;

  // Generate QR Code if library available
  setTimeout(() => {
    const qrH = document.getElementById('lobbyQrCodeHolder');
    if (qrH && window.QRCode) {
      qrH.innerHTML = '';
      new window.QRCode(qrH, {
        text: 'https://scorear-e4186.web.app/#join',
        width: 68,
        height: 68,
        colorDark: '#0c0d1d',
        colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.M
      });
    }
  }, 100);
}

function closeLiveLobby(){
  const s = document.getElementById('liveLobbyStage');
  if (s) s.remove();
}

function openAddHeroModal(worldId, pin){
  openModal('إضافة بطل للقاعة', `
    <div class="modal-body-pad">
      <h3 style="color:#ffffff;font-size:18px;font-weight:900;margin-bottom:8px;">إضافة بطل / فريق إلى ساحة الانتظار</h3>
      <p style="color:#b1a2e9;font-size:12px;margin-bottom:16px;">اختر الشخصية المناسبة واكتب اسم الفريق لدخوله فوراً أمام الجميع.</p>
      
      <div style="margin-bottom:14px;">
        <label style="display:block;color:#ddd8ff;font-size:12px;font-weight:700;margin-bottom:6px;">اسم المتسابق أو الفريق:</label>
        <input class="field" id="quickHeroName" value="فريق الفرسان" placeholder="مثال: أبطال المستقبل" style="background:#111426;border-radius:12px;">
      </div>

      <div>
        <label style="display:block;color:#ddd8ff;font-size:12px;font-weight:700;margin-bottom:8px;">الشخصية الكرتونية المتحركة (من قاعة الأبطال):</label>
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:10px;max-height:220px;overflow-y:auto;padding-right:4px;">
          ${cleanCharacterRoster.map((c, i) => `
            <div class="avatar-card-picker ${i===0?'selected':''}" data-avatar-id="${c.id}" onclick="selectAvatarCard('${c.id}', this)" style="display:flex;flex-direction:column;align-items:center;background:#181729;border:1px solid rgba(136,128,183,0.3);border-radius:14px;padding:8px 4px;cursor:pointer;">
              <img src="assets/characters/animated/${c.id}-idle.webp" alt="${c.name}" loading="lazy" style="width:68px;height:84px;object-fit:contain;">
              <span style="font-size:12px;font-weight:800;color:#fff;margin-top:4px;">${c.name}</span>
              <span style="font-size:10px;color:#a1a4be;">${c.title}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <button class="btn dark full" style="margin-top:18px;padding:12px;font-weight:900;" onclick="submitQuickHero('${worldId}', '${pin}')">دخول البطل إلى اللوبي الآن 🚀</button>
    </div>
  `);
}

window.submitQuickHero = function(worldId, pin){
  const name = $('#quickHeroName')?.value.trim() || 'فريق جديد';
  const participants = readStore('scorear_lobby_participants', []);
  participants.push({
    id: 'p_' + Date.now(),
    name: name,
    avatarId: selectedAvatarId || 'char_01'
  });
  writeStore('scorear_lobby_participants', participants);
  closeModal();
  renderLiveLobby(worldId, pin);
};

function removeHeroIndex(idx, worldId, pin){
  const participants = readStore('scorear_lobby_participants', []);
  participants.splice(idx, 1);
  writeStore('scorear_lobby_participants', participants);
  renderLiveLobby(worldId, pin);
}

function clearLobbyParticipants(worldId, pin){
  writeStore('scorear_lobby_participants', []);
  renderLiveLobby(worldId, pin);
}

// =========================================================================
// ACTIVE INTERACTIVE CONTEST GAMEPLAY (NO IFRAMES, COMPLETE LIVE ENGINE!)
// =========================================================================
let currentContestIndex = 0;
let contestScore = 0;
let contestTimerInterval = null;
let contestTimeRemaining = 15;

function startActiveContest(worldId='royal'){
  currentContestIndex = 0;
  contestScore = 0;
  closeLiveLobby();

  let stage = document.getElementById('activeContestStage');
  if(!stage){
    stage = document.createElement('div');
    stage.id = 'activeContestStage';
    stage.style.cssText = 'position:fixed;inset:0;z-index:10000;background:#0c0d1d;overflow:hidden;font-family:Cairo,Tajawal,sans-serif;direction:rtl;';
    document.body.appendChild(stage);
  }

  // Dramatic 3-Second Animated Countdown
  const w = worlds.find(x => x.id === worldId) || worlds[0];
  stage.innerHTML = `
    <div style="position:absolute;inset:0;background:url('assets/${w.image}.webp') center/cover no-repeat;filter:blur(8px) brightness(0.6);z-index:1;"></div>
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10;color:#fff;">
      <div style="font-size:24px;font-weight:900;color:#52d9ed;margin-bottom:16px;letter-spacing:2px;">استعدوا للمنافسة!</div>
      <div id="countdownNumber" style="font-size:120px;font-weight:900;color:#ffffff;text-shadow:0 0 50px rgba(117,80,239,0.9);animation:countdownPop 1s ease-in-out infinite;">٣</div>
      <div style="font-size:18px;color:#b1a2e9;margin-top:16px;">المسابقة في عالم: <b>${w.name}</b></div>
    </div>
  `;

  let count = 3;
  const numEl = document.getElementById('countdownNumber');
  const cdTimer = setInterval(() => {
    count--;
    if (count === 2) numEl.textContent = '٢';
    else if (count === 1) numEl.textContent = '١';
    else if (count === 0) {
      numEl.textContent = 'انطلاق! 🚀';
      numEl.style.fontSize = '80px';
      numEl.style.color = '#52d9ed';
    } else {
      clearInterval(cdTimer);
      renderActiveQuestionStage(worldId);
    }
  }, 900);
}

function renderActiveQuestionStage(worldId='royal'){
  const stage = document.getElementById('activeContestStage');
  if(!stage) return;

  const w = worlds.find(x => x.id === worldId) || worlds[0];
  const qData = contestQuestions[currentContestIndex];
  if(!qData){
    renderContestPodium(worldId);
    return;
  }

  contestTimeRemaining = 15;
  clearInterval(contestTimerInterval);

  stage.innerHTML = `
    <!-- Background Artwork: World Crisp Large Background (No Video during question) -->
    <div style="position:absolute;inset:0;background:url('assets/${w.image}.webp') center/cover no-repeat;filter:brightness(0.35) saturate(1.05);z-index:1;"></div>

    <!-- Top Status Bar -->
    <div style="position:absolute;top:20px;left:28px;right:28px;display:flex;justify-content:space-between;align-items:center;z-index:20;">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="background:#272044;color:#52d9ed;border:1px solid #8e64ef;padding:6px 16px;border-radius:14px;font-size:13px;font-weight:900;">${esc(qData.skill || 'مسابقة سكور آر')}</span>
        <span style="color:#ffffff;font-size:14px;font-weight:800;background:rgba(0,0,0,0.5);padding:6px 14px;border-radius:12px;">سؤال ${currentContestIndex + 1} من ${contestQuestions.length}</span>
      </div>

      <div style="display:flex;align-items:center;gap:14px;">
        <div style="background:rgba(255,255,255,0.1);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.2);padding:6px 18px;border-radius:14px;color:#f5c518;font-weight:900;font-size:15px;">
          🏆 نقاطك: <span id="contestLiveScore">${contestScore}</span>
        </div>
        <button onclick="closeActiveContest()" style="background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:8px 14px;border-radius:12px;font-size:12px;cursor:pointer;">✕ إنهاء</button>
      </div>
    </div>

    <!-- Timer Bar -->
    <div style="position:absolute;top:76px;left:28px;right:28px;height:8px;background:rgba(255,255,255,0.15);border-radius:8px;overflow:hidden;z-index:20;">
      <div id="contestProgressBar" style="width:100%;height:100%;background:linear-gradient(90deg, #7550ef, #52d9ed);transition:width 1s linear;"></div>
    </div>

    <!-- Center Question Area -->
    <div style="position:absolute;inset:100px 30px 40px;display:flex;flex-direction:column;justify-content:center;align-items:center;max-width:1100px;margin:0 auto;z-index:20;">
      
      <!-- Massive Question Box -->
      <div style="width:100%;background:rgba(21, 23, 42, 0.92);backdrop-filter:blur(18px);border:2px solid rgba(142,100,239,0.35);border-radius:26px;padding:34px 40px;text-align:center;margin-bottom:28px;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
        <span style="font-size:12px;color:#a1a4be;letter-spacing:1px;font-weight:800;display:block;margin-bottom:10px;">اختر الإجابة الصحيحة بالضغط عليها:</span>
        <h2 style="color:#ffffff;font-size:clamp(22px, 3.2vw, 36px);font-weight:900;line-height:1.55;">${esc(qData.q)}</h2>
      </div>

      <!-- 4 Massive Choices Grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;width:100%;">
        ${qData.opts.map((opt, i) => `
          <button class="contest-choice-btn" data-choice-index="${i}" onclick="handleContestAnswer(${i}, ${qData.answer}, '${worldId}')">
            <span style="width:36px;height:36px;border-radius:12px;background:rgba(255,255,255,0.1);display:grid;place-items:center;font-size:16px;font-weight:900;color:#52d9ed;flex-shrink:0;">${['أ','ب','ج','د'][i]}</span>
            <span style="flex:1;">${esc(opt)}</span>
          </button>
        `).join('')}
      </div>

      <!-- Feedback & Explanation Drawer -->
      <div id="contestFeedbackDrawer" style="display:none;width:100%;margin-top:20px;background:rgba(17,18,37,0.96);border:1px solid #8e64ef;border-radius:18px;padding:18px 24px;text-align:right;">
        <div id="contestFeedbackTitle" style="font-weight:900;font-size:16px;margin-bottom:6px;"></div>
        <div id="contestFeedbackText" style="color:#ddd8ff;font-size:14px;line-height:1.7;"></div>
        <button class="btn dark" id="btnNextQuestion" style="margin-top:14px;padding:10px 24px;font-weight:900;" onclick="goToNextContestStep('${worldId}')">السؤال التالي ➔</button>
      </div>

    </div>
  `;

  // Card Arena integration for Solo Test Mode
  if (window.ScoreARCardArena && typeof window.ScoreARCardArena.mountStudentDeck === 'function') {
    const curMode = (window.ScoreARGameModes && typeof window.ScoreARGameModes.getMode === 'function') ? window.ScoreARGameModes.getMode() : 'CARD_ARENA';
    if (curMode === 'CARD_ARENA') {
      window.ScoreARCardArena.initArena('000000', 'solo_player', false);
      window.ScoreARCardArena.mountStudentDeck(stage);
      
    }
  }

  // Start Live Countdown
  const bar = document.getElementById('contestProgressBar');
  contestTimerInterval = setInterval(() => {
    contestTimeRemaining--;
    if (bar) bar.style.width = ((contestTimeRemaining / 15) * 100) + '%';
    if (contestTimeRemaining <= 0) {
      clearInterval(contestTimerInterval);
      handleContestAnswer(-1, qData.answer, worldId); // Timeout
    }
  }, 1000);
}

window.handleContestAnswer = function(selectedIndex, correctIndex, worldId){
  clearInterval(contestTimerInterval);
  const btns = document.querySelectorAll('.contest-choice-btn');
  btns.forEach(b => b.disabled = true);

  const drawer = document.getElementById('contestFeedbackDrawer');
  const title = document.getElementById('contestFeedbackTitle');
  const text = document.getElementById('contestFeedbackText');
  const qData = contestQuestions[currentContestIndex];

  const isAnsCorrect = (window.ScoreAREvaluator && window.ScoreAREvaluator.isCorrect)
    ? window.ScoreAREvaluator.isCorrect(qData, selectedIndex)
    : (selectedIndex >= 0 && selectedIndex === correctIndex);

  const correctIndices = (window.ScoreAREvaluator && window.ScoreAREvaluator.getCorrectIndices)
    ? window.ScoreAREvaluator.getCorrectIndices(qData)
    : (correctIndex !== undefined ? [correctIndex] : [0]);

  if (isAnsCorrect) {
    contestScore += 100;
    const sEl = document.getElementById('contestLiveScore');
    if (sEl) sEl.textContent = contestScore;

    correctIndices.forEach(idx => btns[idx]?.classList.add('correct'));
    if (window.confetti) window.confetti({particleCount: 70, spread: 60, origin: {y: 0.6}});

    title.style.color = '#34d399';
    title.innerHTML = '✨ أحسنت! إجابة صحيحة مبهرة (+100 نقطة)';
    if (window.ScoreARCardArena && typeof window.ScoreARCardArena.onCorrectAnswerGranted === 'function') {
      window.ScoreARCardArena.onCorrectAnswerGranted('solo_player', true);
    }
  } else {
    if (selectedIndex >= 0) btns[selectedIndex]?.classList.add('wrong');
    correctIndices.forEach(idx => btns[idx]?.classList.add('correct'));

    title.style.color = '#f87171';
    title.innerHTML = selectedIndex === -1 ? '⏰ انتهى الوقت المخصص للسؤال!' : '✕ إجابة غير دقيقة!';
  }

  text.innerHTML = '<b>التوضيح التعليمي:</b> ' + esc(qData.why || qData.explain || '');
  drawer.style.display = 'block';
};

window.goToNextContestStep = function(worldId){
  currentContestIndex++;
  renderActiveQuestionStage(worldId);
};

function renderContestPodium(worldId){
  const stage = document.getElementById('activeContestStage');
  if(!stage) return;
  const w = worlds.find(x => x.id === worldId) || worlds[0];

  if (window.confetti) {
    window.confetti({particleCount: 120, spread: 90, origin: {y: 0.5}});
    setTimeout(() => window.confetti({particleCount: 150, spread: 100, origin: {y: 0.4}}), 800);
  }

  stage.innerHTML = `
    <div style="position:absolute;inset:0;background:url('assets/${w.image}.webp') center/cover no-repeat;filter:brightness(0.35);z-index:1;"></div>
    <video src="assets/videos/worlds/${w.id}.mp4?v=20261106_smooth" poster="assets/${w.image}.webp" autoplay loop muted playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2;opacity:1;filter:brightness(0.4) saturate(1.1);"></video>
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:30px;z-index:20;color:#fff;">
      <div style="font-size:64px;margin-bottom:8px;">🏆</div>
      <div style="margin:12px auto;width:150px;height:190px;position:relative;">
        <span class="scorear-character character-celebrate" style="--character-atlas:url('assets/characters/animated/char_01-atlas.webp');width:140px;height:190px;">
          <img src="assets/characters/animated/char_01-idle.webp" alt="الفائز" style="object-fit:contain;filter:drop-shadow(0 15px 30px rgba(0,0,0,0.7));">
          <span class="character-frames" aria-hidden="true"></span>
        </span>
      </div>
      <span style="color:#52d9ed;font-size:14px;font-weight:900;letter-spacing:1px;text-transform:uppercase;">نهاية الجولة والتتويج</span>
      <h1 style="color:#ffffff;font-size:40px;font-weight:900;margin:8px 0;">مبارك لجميع الأبطال المشاركين!</h1>
      <p style="color:#ddd8ff;font-size:15px;max-width:550px;margin-bottom:20px;">لقد حققت أداءً متميزاً في عالم ${w.name}، بمجموع نقاط نهائي:</p>

      <div style="background:rgba(21,23,42,0.9);border:2px solid #8e64ef;border-radius:24px;padding:18px 48px;margin-bottom:26px;box-shadow:0 0 45px rgba(117,80,239,0.5);">
        <span style="font-size:13px;color:#b1a2e9;font-weight:800;display:block;">مجموع النقاط المحققة</span>
        <div style="font-size:52px;font-weight:900;color:#f5c518;">${contestScore} XP</div>
      </div>

      <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
        <button class="btn dark" onclick="startActiveContest('${worldId}')" style="font-weight:900;padding:14px 28px;font-size:15px;">🔁 إعادة المسابقة وتحدٍ جديد</button>
        <button class="btn light" onclick="closeActiveContest()" style="font-weight:800;padding:14px 24px;">✕ العودة إلى المنصة</button>
      </div>
    </div>
  `;
}

function closeActiveContest(){
  clearInterval(contestTimerInterval);
  const stage = document.getElementById('activeContestStage');
  if(stage) stage.remove();
  const deck = document.getElementById('studentMobileDeckWrap');
  if(deck) deck.style.display = 'none';
}

// =========================================================================
// STUDIO TOOLS (BUILDER, AI, BANK) - REAL IMPLEMENTATION & PROPER SOON GUARDS
// =========================================================================
function openToolModal(route){
  if (route === 'builder') {
    if (window.ScoreARQuizBuilder && window.ScoreARQuizBuilder.openBuilder) {
      window.ScoreARQuizBuilder.openBuilder();
    }
    return;
  }
  if (route === 'bank' || route === 'quizzes') {
    if (window.ScoreARQuizBank && window.ScoreARQuizBank.openBankHub) {
      window.ScoreARQuizBank.openBankHub(route === 'quizzes' ? 'quizzes' : 'bank');
    }
    return;
  }
  if (route === 'import' || route === 'excel') {
    if (window.ScoreARQuizImporter && window.ScoreARQuizImporter.openImporter) {
      window.ScoreARQuizImporter.openImporter({ mode: 'hub' });
    }
    return;
  }
  if (route === 'ai') {
    if (window.ScoreARQuizAI && window.ScoreARQuizAI.openAiStudio) {
      window.ScoreARQuizAI.openAiStudio({ mode: 'hub' });
    }
    return;
  }
  if (route === 'reports') {
    if (window.ScoreARQuizReports && window.ScoreARQuizReports.openReportsHub) {
      window.ScoreARQuizReports.openReportsHub();
    }
    return;
  }
  if (route === 'teachers' || route === 'admin') {
    if (window.ScoreARAdminManagement) window.ScoreARAdminManagement.openAdminHub();
    return;
  }
  const toolNames = { ai: 'مساعد الأسئلة الذكي بالذكاء الاصطناعي', import: 'استيراد الأسئلة من Excel / CSV', reports: 'تقارير ونسب صواب الأسئلة' };
  const name = toolNames[route] || 'هذه الأداة';
  if (window.toast) {
    window.toast(`«${name}» ستتوفر قريباً في البند المخصص لها.`);
  }
}

// =========================================================================
// PREVIEWS & MINI QUIZZES
// =========================================================================
function preview(id){
  const w=worlds.find(w=>w.id===id)||worlds[0];
  openModal(w.name,`<div class="preview-scene" style="border-radius:18px;overflow:hidden;background:#050f0c;position:relative;">
    <img src="assets/${w.image}.webp" alt="${w.name}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;">
    <video src="assets/videos/worlds/${w.id}.mp4?v=20261106_smooth" poster="assets/${w.image}.webp" autoplay loop muted playsinline style="position:relative;z-index:2;width:100%;height:320px;object-fit:cover;"></video>
    <span class="preview-badge" style="z-index:3;">🎬 معاينة كرتونية 1080p عالية الدقة · عالم ${w.name}</span>
  </div>
  <div class="preview-controls" style="padding-top:14px;">
    <h3 style="color:#fff;font-size:18px;font-weight:800;">عالم ${w.name} — ${w.tag}</h3>
    <p style="color:#b1a2e9;font-size:13px;line-height:1.7;">${w.desc}</p>
    <div class="preview-actions" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;">
      <button class="btn dark small" onclick="closeModal(); renderLiveLobby('${w.id}', null, true, false);" style="flex:2;justify-content:center;font-weight:900;">🚀 انطلاق القاعة بهذا العالم الآن</button>
      <button class="btn outline small" data-action="close" style="justify-content:center;">✕ إغلاق</button>
    </div>
  </div>`);
}

function intro(){
  openModal('سكور آر — كل سؤال، بداية مغامرة',`<video class="intro-video" controls playsinline preload="metadata" poster="assets/film-poster.webp" src="assets/scorear-launch.mp4"><track kind="captions" src="assets/launch-ar.vtt" srclang="ar" label="العربية"></video><p class="video-caption">فيلم موشن جرافيك · ٢٤ ثانية · شخصيات كرتونية وهوية جديدة</p>`);
  $('#modal video')?.play().catch(()=>{});
}

function syncSidebar(){const sb=$('#sidebar');if(!sb)return;const open=sb.classList.contains('open');sb.inert=!open;document.querySelectorAll('.mobile-menu,[data-action="menu"]').forEach(b=>b.setAttribute('aria-expanded',open?'true':'false'));}

// =========================================================================
// HASH ROUTER WITH LEGACY INTERCEPTION (ZERO BROKEN PAGES!)
// =========================================================================

function renderHeroesPage(){
  return `<div class="page heroes-page">
    <div class="page-title">
      <div class="eyebrow">قاعة الأبطال الكرتونية</div>
      <h1>لكل بطل حكاية.. وهنا تبدأ مغامرتك.</h1>
      <p>٢٠ شخصية كرتونية أصلية بجسم كامل وتفاعل ثلاثي الأبعاد. اختر بطلك المفضل ليمثّلك في قاعة التحدي وعلى منصة التتويج.</p>
    </div>

    <div class="character-picker" style="margin-top:24px;align-items:start;">
      <aside class="character-stage" aria-label="معاينة الشخصية" style="background:radial-gradient(ellipse at 50% 50%, rgba(115,91,192,0.35), transparent 70%), linear-gradient(160deg,#1d1a36,#111326);border:1px solid rgba(142,100,239,0.3);border-radius:24px;padding:24px;text-align:center;box-shadow:0 15px 40px rgba(0,0,0,0.5);">
        <small style="color:#52d9ed;font-weight:800;letter-spacing:1px;display:block;margin-bottom:8px;">✦ البطل المختار حالياً ✦</small>
        <div id="studentCustomPreviewBox" style="width:220px;height:280px;margin:8px auto;display:flex;align-items:center;justify-content:center;"></div>
        <div id="studentCustomPreviewTitle" aria-live="polite" style="margin-top:10px;"></div>
        
        <div class="character-controls" aria-label="وضعية البطل" style="margin-top:16px;display:flex;justify-content:center;flex-wrap:wrap;gap:8px;">
          <button type="button" data-character-pose="idle" aria-pressed="true" onclick="if(window.ScoreARCharacters)window.ScoreARCharacters.preview(window.gallerySelected||1,'idle')">🧍 وقوف</button>
          <button type="button" data-character-pose="walk" aria-pressed="false" onclick="if(window.ScoreARCharacters)window.ScoreARCharacters.preview(window.gallerySelected||1,'walk')">🚶 مشي</button>
          <button type="button" data-character-pose="celebrate" aria-pressed="false" onclick="if(window.ScoreARCharacters)window.ScoreARCharacters.preview(window.gallerySelected||1,'celebrate')">🤸 قفز</button>
          <button type="button" data-character-pose="run" aria-pressed="false" onclick="if(window.ScoreARCharacters)window.ScoreARCharacters.preview(window.gallerySelected||1,'run')">🏃 جري</button>
        </div>
      </aside>

      <div class="character-collection" style="background:#13152a;border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:24px;">
        <div class="character-section-head" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
          <h4 style="font-size:20px;font-weight:900;color:#ffffff;margin:0;">اختر رفيق رحلتك في التحدي</h4>
          <span style="background:rgba(117,80,239,0.2);color:#c9baff;border:1px solid rgba(117,80,239,0.4);padding:6px 14px;border-radius:20px;font-size:12px;font-weight:800;">٢٠ شخصية جاهزة</span>
        </div>

        <div class="character-tabs" aria-label="فئات الشخصيات" style="display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap;">
          <button type="button" id="charTab-all" onclick="window.galleryFilter('all')" class="tab active" style="padding:8px 16px;">الكل · ٢٠</button>
          <button type="button" id="charTab-human" onclick="window.galleryFilter('human')" class="tab" style="padding:8px 16px;">مستكشفون · ٨</button>
          <button type="button" id="charTab-animal" onclick="window.galleryFilter('animal')" class="tab" style="padding:8px 16px;">أصدقاء · ٦</button>
          <button type="button" id="charTab-fantasy" onclick="window.galleryFilter('fantasy')" class="tab" style="padding:8px 16px;">خيال · ٦</button>
        </div>

        <div id="avatarsGrid" style="margin-top:14px;"></div>
        <p style="color:#b1a2e9;font-size:12px;margin-top:18px;line-height:1.7;">
          💡 جميع الشخصيات متاحة لجميع الطلاب. اختيارك يحدد مظهر بطلك في قاعة الانتظار وعلى منصة التتويج، بينما المعرفة وسرعة الإجابة هي التي تصنع الفوز.
        </p>
      </div>
    </div>
  </div>`;
}

function render(){
  const hash = location.hash.slice(1);
  const parts = hash.split('/');
  let p = parts[0] || 'home';
  const sub = parts[1] || '';

  // Intercept legacy routes
  if (p === 'engine') {
    if (sub === 'login') {
      location.hash = '#studio';
      openTeacherLoginModal();
      return;
    } else if (sub === 'builder') {
      location.hash = '#studio';
      openToolModal('builder');
      return;
    } else if (sub === 'student') {
      location.hash = '#home';
      join();
      return;
    } else if (sub === 'lobby') {
      location.hash = '#worlds';
      renderLiveLobby('royal', currentLobbyPin);
      return;
    } else {
      location.hash = '#studio';
      return;
    }
  }

  if (p === 'admin') {
    location.hash = '#studio';
    if (window.ScoreARAdminManagement) window.ScoreARAdminManagement.openAdminHub();
    return;
  }
  if (p === 'login') {
    location.hash = '#studio';
    openTeacherLoginModal();
    return;
  }
  if (p === 'join') {
    location.hash = '#home';
    join();
    return;
  }
  if (p === 'contest') {
    startActiveContest('royal');
    return;
  }
  if (p === 'lobby') {
    renderLiveLobby('royal', currentLobbyPin);
    return;
  }

  const renders={home,studio,worlds:worldPage,heroes:renderHeroesPage,cards:()=>{window.location.href='cards.html';return '';},journey,library,about,academy:()=>window.renderAcademy()};
  const mainEl = document.getElementById('main');
  if (mainEl && renders[p]) mainEl.innerHTML=renders[p]();
  
  document.querySelectorAll('[data-nav]').forEach(a=>{let active=a.dataset.nav===p;a.classList.toggle('active',active);});
  $('#breadcrumb').textContent=({home:'مساحة للتعلّم. عالم للاكتشاف.',studio:'مساحتك / استوديو المعلم',worlds:'مساحتك / قاعة المنافسات',journey:'مساحتك / رحلتي التعليمية',library:'مساحتك / مكتبة المحتوى',about:'مساحتك / عن سكور آر'})[p]||'سكور آر';
  
  syncSidebar();hydrate();
  if(window.initLaunch) window.initLaunch(p);
  if(p==='journey') {
    if (window.ScoreARJourney && typeof window.ScoreARJourney.bindJourneyEvents === 'function') window.ScoreARJourney.bindJourneyEvents();
    if (window.ScoreARSkillMap && typeof window.ScoreARSkillMap.mount === 'function') window.ScoreARSkillMap.mount();
  }
  if(p==='library') bindUpload();
  if(p==='heroes') {
    window.gallerySelected = window.gallerySelected || 1;
    window.galleryCategory = window.galleryCategory || 'all';
    if (window.ScoreARCharacters) {
      window.galleryRender = function(){
        const gridEl = document.getElementById('avatarsGrid');
        if (gridEl) {
          window.ScoreARCharacters.grid(gridEl, window.galleryCategory, window.gallerySelected, id => {
            window.gallerySelected = id;
            window.galleryRender();
          });
        }
        window.ScoreARCharacters.preview(window.gallerySelected);
      };
      window.galleryFilter = function(c){
        window.galleryCategory = c;
        ['all','human','animal','fantasy'].forEach(x => {
          const btn = document.getElementById('charTab-' + x);
          if (btn) btn.classList.toggle('active', x === c);
        });
        window.galleryRender();
      };
      setTimeout(() => { if (window.galleryRender) window.galleryRender(); }, 40);
    }
  }
  if (window.ScoreARAuth && window.updateTopActionsTeacher) {
    window.updateTopActionsTeacher(window.ScoreARAuth.getUser());
  }
  window.scrollTo(0,0);
}

function openModal(title,body){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=body;if(!$('#modal').open)$('#modal').showModal();hydrate($('#modal'));}
function closeModal(){const v=$('#modal video');if(v)v.pause();$('#modal').close();$('#modalBody').innerHTML='';}
let toastTimer;function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4000);}

function bindUpload(){
  $('#fileInput').onchange=e=>{toast('تم اختيار الملف');};
  const drop=$('#dropZone');
  if(!drop) return;
  drop.ondragover=e=>{e.preventDefault();drop.classList.add('drag');};
  drop.ondragleave=()=>drop.classList.remove('drag');
  drop.ondrop=e=>{e.preventDefault();drop.classList.remove('drag');toast('تم استقبال الملف بنجاح');};
}

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');
  if(!b)return;
  const a=b.dataset.action;
  switch(a){
    case 'menu':$('#sidebar').classList.toggle('open');syncSidebar();break;
    case 'close-sidebar':$('#sidebar').classList.remove('open');syncSidebar();if(document.body)document.body.style.overflow='';break;
    case 'close':closeModal();break;
    case 'join':join();break;
    case 'intro':intro();break;
    case 'teacher-login':openTeacherLoginModal();break;
    case 'engine':{
      const r = b.dataset.route;
      if (r === 'login') openTeacherLoginModal();
      else openToolModal(r);
      break;
    }
    case 'logout':{
      if (window.ScoreARAuth) {
        window.ScoreARAuth.logout();
      }
      try {
        localStorage.removeItem('scorear_teacher_session');
        sessionStorage.removeItem('scorear_teacher_session');
      } catch(e){}
      toast('تم تسجيل الخروج بنجاح.');
      updateTopActionsTeacher(null);
      location.hash = '#home';
      render();
      break;
    }
    case 'library':location.hash='library';break;
    case 'motion':
      document.documentElement.classList.toggle('reduced');
      writeStore('scorear_v3_reduced',document.documentElement.classList.contains('reduced'));
      $('#motionButton').setAttribute('aria-pressed',document.documentElement.classList.contains('reduced'));
      toast(document.documentElement.classList.contains('reduced')?'تم تقليل الحركة.':'تم تفعيل الحركة.');
      break;
    case 'filter':state.filter=b.dataset.filter;render();break;
    case 'preview':preview(b.dataset.world);break;
    case 'launchworld':renderLiveLobby(b.dataset.world || 'royal', null, true, false);break;
    case 'worldquiz':startActiveContest(b.dataset.world || 'royal');break;
    case 'setup':renderLiveLobby(b.dataset.world || 'royal');break;
    case 'upload':$('#fileInput').click();break;
  }
});

$('#modal').addEventListener('click',e=>{if(e.target===$('#modal'))closeModal();});
$('#modal').addEventListener('cancel',()=>{const v=$('#modal video');if(v)v.pause();});
document.addEventListener('click',e=>{const sb=$('#sidebar');if(sb&&sb.classList.contains('open')&&!e.target.closest('#sidebar,.mobile-menu,.launch-menu')){$('#sidebar').classList.remove('open');syncSidebar();if(document.body)document.body.style.overflow='';}});
window.addEventListener('hashchange',()=>{const sb=$('#sidebar');if(sb){sb.classList.remove('open');syncSidebar();}if(document.body)document.body.style.overflow='';closeModal();render();});

document.documentElement.classList.toggle('reduced',readStore('scorear_v3_reduced',false));
$('#motionButton').setAttribute('aria-pressed',document.documentElement.classList.contains('reduced'));

// Auth State Observer (Strictly driven by Firebase Auth JWT Custom Claims)
if (window.ScoreARAuth) {
  window.ScoreARAuth.onAuthStateChanged((user) => {
    if (user && (user.role === 'admin' || user.role === 'teacher')) {
      updateTopActionsTeacher(user);
    } else {
      updateTopActionsTeacher(null);
    }
    if (location.hash === '#studio') {
      render();
    }
  });
}

// Expose globals for inline onclick handlers
window.closeLiveLobby = closeLiveLobby;
window.startActiveContest = startActiveContest;
window.closeActiveContest = closeActiveContest;
window.openAddHeroModal = openAddHeroModal;
window.clearLobbyParticipants = clearLobbyParticipants;
window.removeHeroIndex = removeHeroIndex;
window.handleContestAnswer = handleContestAnswer;
window.goToNextContestStep = goToNextContestStep;
window.renderLiveLobby = renderLiveLobby;
window.openToolModal = openToolModal;
window.currentLobbyPin = currentLobbyPin;
window.preview = preview;
window.openModal = openModal;
window.closeModal = closeModal;
window.toast = toast;
window.render = render;
window.hydrate = hydrate;
window.openTeacherLoginModal = openTeacherLoginModal;
window.join = join;

hydrate();
render();
matchMedia('(max-width:1000px)').addEventListener('change',syncSidebar);
