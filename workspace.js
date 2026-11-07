/* Presentation layer: Teacher Studio and Academy */
window.renderTeacherStudio=function(){
  return `<div class="page teacher-space">
    <div class="studio-heading">
      <div style="display:flex;align-items:center;gap:18px;">
        <div style="width:70px;height:70px;border-radius:20px;border:2px solid #8e64ef;box-shadow:0 0 20px rgba(142,100,239,0.4);overflow:hidden;background:#1b1c33;flex-shrink:0;">
          <img src="assets/characters/teacher_ahmed.webp?v=20261106_real" alt="أ. أحمد صلاح رميح" style="width:100%;height:100%;object-fit:cover;">
        </div>
        <div>
          <div class="eyebrow">مساحتك للإلهام · أ. أحمد صلاح رميح</div>
          <h1>كل حصة، فرصة جديدة.</h1>
          <p>محتواك وأدواتك في مكان واحد. ابدأ بخطوة، وكمل بطريقتك.</p>
        </div>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn dark" onclick="renderLiveLobby('royal', currentLobbyPin)">قاعة المنافسات الحية 🚀</button>
      </div>
    </div>

    <!-- TEACHER BANNER -->
    <section class="teacher-banner">
      <img src="assets/classroom.webp" alt="معلم مصري كرتوني مع طلابه وكتاب المعرفة">
      <div>
        <span class="studio-kicker">TEACHER STUDIO / استوديو المعلم</span>
        <h2>إنت تصنع الفكرة.<br><em>وهم يعيشوا المغامرة.</em></h2>
        <p>من أول سؤال إلى آخر لحظة اكتشاف.</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px;">
          <button class="btn dark" onclick="openToolModal('builder')" style="font-weight:900;box-shadow:0 8px 25px rgba(117,80,239,0.5);">${icon('edit')} إنشاء مسابقة جديدة وبدء التحدي 🚀</button>
          <button class="btn light" onclick="renderLiveLobby('royal', currentLobbyPin)" style="font-weight:800;">${icon('planet')} فتح قاعة اللوبي المباشرة</button>
        </div>
      </div>
    </section>

    <!-- 3 STEPS -->
    <div class="studio-heading compact">
      <div>
        <h2>حصة كاملة. ثلاث خطوات.</h2>
        <p>اختر المهمة التي تحتاجها الآن.</p>
      </div>
    </div>
    <div class="studio-steps">
      <div class="studio-step" onclick="openToolModal('bank')" style="cursor:pointer;">
        <span class="step-index">01</span>
        <span class="entry-icon">${icon('book')}</span>
        <h3>جهّز المحتوى</h3>
        <p>بنك الأسئلة الشامل ومكتبة مسابقاتي الخاصة.</p>
        <strong style="color:#52d9ed;">افتح مكتبتي وبنك الأسئلة ${icon('arrow')}</strong>
      </div>
      <div class="studio-step" onclick="renderLiveLobby('royal', currentLobbyPin)" style="cursor:pointer;">
        <span class="step-index">02</span>
        <span class="entry-icon">${icon('planet')}</span>
        <h3>أطلق المنافسة</h3>
        <p>اختر نشاطك وعالمك، واجمع طلابك في اللوبي.</p>
        <strong style="color:#52d9ed;">انطلاق القاعة فوراً ${icon('arrow')}</strong>
      </div>
      <div class="studio-step" onclick="openToolModal('reports')" style="cursor:pointer;">
        <span class="step-index">03</span>
        <span class="entry-icon">${icon('chart')}</span>
        <h3>افهم النتائج <span style="background:rgba(16,185,129,0.2);color:#34d399;font-size:10px;padding:2px 8px;border-radius:6px;font-weight:800;margin-inline-start:4px;">نشط الآن ✓</span></h3>
        <p>نسب صواب الأسئلة الفعلية والأسئلة الأضعف ومتابعة المسودات.</p>
        <strong style="color:#52d9ed;">افتح التقارير والتحليلات ${icon('arrow')}</strong>
      </div>
    </div>

    <!-- STUDIO TOOLS -->
    <div class="studio-bottom">
      <section class="panel studio-tools">
        <div class="studio-heading compact">
          <h2>أدوات الإعداد السريعة</h2>
          <span class="studio-kicker">منشئ المسابقات الحقيقي</span>
        </div>
        ${[
          ['edit','إنشاء مسابقة جديدة','أنشئ أسئلتك وخياراتها مع الحفظ التلقائي وانطلق بالقاعة.','builder',true],
          ['spark','مساعد الأسئلة الذكي AI','توليد الأسئلة بالذكاء الاصطناعي عبر الخادم مع مراجعة المعلم.','ai',true],
          ['grid','بنك الأسئلة الشامل','بنك أسئلة مخصص ومكتبة مسابقات خاصة بالمعلم.','bank',true],
          ['file','استيراد Excel / CSV','استيراد سريع بنفس ترتيب أعمدة كاهوت ومعاينة تفاعلية.','import',true],
          ['trophy','تقارير القاعة والنتائج','تحليلات دقيقة لنسب صواب الأسئلة والأسئلة الأضعف.','reports',true],
          ['shield','إدارة المعلمين والمنصة','الموافقات والحسابات حسب صلاحيتك.','teachers',true]
        ].map(([ic,t,d,r,isActive])=>`
          <button class="studio-tool ${isActive?'':'disabled'}" onclick="openToolModal('${r}')" style="${isActive?'':'opacity:0.65;cursor:not-allowed;'}">
            <span class="entry-icon">${icon(ic)}</span>
            <span>
              <b>${t} ${isActive ? '<span style=\"background:rgba(16,185,129,0.2);color:#34d399;font-size:10px;padding:2px 8px;border-radius:6px;font-weight:800;margin-inline-start:6px;\">نشط الآن ✓</span>' : '<span style=\"background:rgba(142,100,239,0.25);color:#c4b5fd;font-size:10px;padding:2px 8px;border-radius:6px;font-weight:800;margin-inline-start:6px;\">قريبًا</span>'}</b>
              <small>${d}</small>
            </span>
            ${icon('arrow')}
          </button>
        `).join('')}
      </section>

      <a href="#academy" class="academy-teaser">
        <img src="assets/academy.webp" alt="أكاديمية المعرفة العائمة">
        <div>
          <span class="studio-kicker">أول عالم يتجدّد</span>
          <h2>وراء البوابة،<br>حكاية تنتظر.</h2>
          <p>استكشف تصميم الدخول والانتظار والسؤال والنتيجة والتتويج.</p>
          <strong>جرّب معاينة بوابة المعرفة ${icon('arrow')}</strong>
        </div>
      </a>
    </div>

    <p class="note">تُفتح أدوات الحساب بعد تسجيل الدخول. يمكنك بدء المسابقات في أي وقت وتعديل خياراتها بحرية.</p>
  </div>`;
};

let academyStage=0,academyAnswer=null;
const academyNames=['الدخول','الانتظار','السؤال','نتيجة الجولة','التتويج'];
window.renderAcademy=function(){
  const views=[
    `<div class="academy-intro"><span class="academy-seal">${icon('book')}</span><span class="studio-kicker">THE KNOWLEDGE GATE</span><h2>بوابة المعرفة</h2><p>كل سؤال مفتاح.<br>وكل فكرة تفتح عالمًا.</p><button class="btn dark" data-academy="1">ادخل المعاينة ${icon('arrow')}</button></div>`,
    `<div class="academy-intro"><span class="studio-kicker">المغامرة تبدأ معًا</span><h2>مكانك بين الأبطال.</h2><p>في القاعة الفعلية يظهر رمز الانضمام والطلاب المتصلون هنا.</p><div class="academy-heroes"><span>✦</span><span>✧</span><span>✦</span></div><button class="btn dark" data-academy="2">شاهد شاشة السؤال ${icon('arrow')}</button></div>`,
    `<div class="academy-question"><div class="academy-question-top"><span>تجربة سؤال / اللغة العربية</span><span>${icon('book')} النعت</span></div><h2>«قرأتُ كتابًا ممتعًا»</h2><p>ما إعراب «ممتعًا»؟</p><div class="academy-answers">${['حال منصوب','نعت منصوب','مفعول به منصوب','خبر مرفوع'].map((t,i)=>`<button data-academy-answer="${i}"><span>${['أ','ب','ج','د'][i]}</span>${t}</button>`).join('')}</div></div>`,
    `<div class="academy-intro"><span class="academy-seal">${icon(academyAnswer===1?'check':'book')}</span><span class="studio-kicker">لحظة فهم</span><h2>${academyAnswer===null?'الإجابة: نعت منصوب':academyAnswer===1?'أحسنت، فتحت بابًا جديدًا!':'خلّينا نفهمها معًا.'}</h2><p>«ممتعًا» تصف الكتاب وتتبعُه في النصب والتنكير؛ لذلك فهي نعت منصوب.</p><button class="btn dark" data-academy="4">شاهد التتويج ${icon('arrow')}</button></div>`,
    `<div class="academy-intro"><span class="academy-seal gold">${icon('trophy')}</span><span class="studio-kicker">كل خطوة تستحق الاحتفال</span><h2>المعرفة هي المكسب.</h2><p>هنا تُعرض نتائج القاعة وأبطالها بعد نهاية المسابقة.</p><button class="btn dark" onclick="renderLiveLobby('royal', currentLobbyPin)">جهّز منافسة فعلية الآن ${icon('arrow')}</button></div>`
  ];
  return `<div class="page academy-page">
    <div class="studio-heading">
      <div><div class="eyebrow">معاينة التصميم</div><h1>عالم واحد. خمس لحظات.</h1><p>تنقّل بين حالات القاعة.</p></div>
      <a href="#studio" class="btn light small">العودة للاستوديو</a>
    </div>
    <nav class="academy-tabs" aria-label="شاشات القاعة">${academyNames.map((t,i)=>`<button data-academy="${i}" aria-pressed="${i===academyStage}"><span>0${i+1}</span>${t}</button>`).join('')}</nav>
    <section class="academy-stage" aria-live="polite"><div class="academy-top"><span>✦ بوابة المعرفة</span><span>معاينة مستقلة</span></div>${views[academyStage]}</section>
  </div>`;
};

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-academy],[data-academy-answer]');
  if(!b)return;
  if(b.hasAttribute('data-academy-answer')){
    academyAnswer=Number(b.dataset.academyAnswer);
    academyStage=3;
  }else{
    academyStage=Number(b.dataset.academy);
    if(academyStage===0||academyStage===2)academyAnswer=null;
  }
  if(academyStage<0||academyStage>4)academyStage=0;
  render();
  document.querySelector('.academy-stage')?.scrollIntoView({block:'nearest'});
});
