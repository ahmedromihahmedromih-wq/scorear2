/* ScoreAR Teacher Studio & Academy - Unified Purple Cover Identity */
window.renderTeacherStudio = function(){
  return `<div class="page teacher-space">
    <!-- STUDIO TOP IDENTITY BAR -->
    <div class="studio-heading reveal">
      <div style="display:flex;align-items:center;gap:18px;">
        <div class="studio-avatar-wrap">
          <img src="assets/characters/teacher_ahmed.webp?v=20261106_real" alt="أ. أحمد صلاح رميح" style="width:100%;height:100%;object-fit:cover;">
        </div>
        <div>
          <div class="launch-pill" style="margin-bottom:8px;"><span class="live-dot"></span> مساحتك للإلهام · أ. أحمد صلاح رميح</div>
          <h1 style="font-size:32px;font-weight:900;color:#f6f3ff;margin:4px 0 8px;">كل حصة، <span class="gradient-text">فرصة جديدة.</span></h1>
          <p style="color:#aaa9c1;font-size:14px;line-height:1.8;margin:0;">محتواك وأدواتك في مكان واحد. ابدأ بخطوة، وكمّل بطريقتك وبأعلى معايير التفاعل.</p>
        </div>
      </div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
        <button class="btn launch-primary" onclick="renderLiveLobby('royal', currentLobbyPin)" style="padding:12px 24px;font-weight:900;font-size:14px;">قاعة المنافسات الحية 🚀</button>
      </div>
    </div>

    <!-- TEACHER HERO BANNER -->
    <section class="teacher-banner spotlight reveal">
      <img src="assets/classroom.webp" alt="معلم مصري كرتوني مع طلابه وكتاب المعرفة">
      <div class="teacher-banner-overlay"></div>
      <div class="teacher-banner-content">
        <div class="launch-pill" style="margin-bottom:14px;"><span class="live-dot"></span> TEACHER STUDIO / استوديو المعلم المتقدم</div>
        <h2>إنت تصنع الفكرة.<br><span class="gradient-text">وهم يعيشوا المغامرة.</span></h2>
        <p>من أول سؤال في ملف الدرس إلى آخر لحظة اكتشاف وتتويج على منصة الأبطال.</p>
        <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:20px;">
          <button class="btn launch-primary" onclick="openToolModal('builder')" style="padding:13px 26px;font-weight:900;font-size:14px;display:inline-flex;align-items:center;gap:8px;">${icon('edit')} إنشاء مسابقة جديدة وبدء التحدي 🚀</button>
          <button class="btn launch-outline" onclick="renderLiveLobby('royal', currentLobbyPin)" style="padding:13px 22px;font-weight:800;font-size:14px;display:inline-flex;align-items:center;gap:8px;">${icon('planet')} فتح قاعة اللوبي المباشرة</button>
        </div>
      </div>
    </section>

    <!-- 3 STEPS JOURNEY -->
    <div class="launch-section-heading reveal" style="margin-top:45px;margin-bottom:24px;">
      <div>
        <span class="section-kicker">3 STEPS TO MASTERY / مسار الحصة المتكامل</span>
        <h2 style="font-size:28px;font-weight:900;color:#f6f3ff;">حصة كاملة.<br><span class="gradient-text">ثلاث خطوات سهلة ومباشرة.</span></h2>
      </div>
      <p style="color:#aaa9c1;font-size:13px;line-height:1.8;">اختر المهمة التي تحتاجها الآن للانطلاق مع فصولك.</p>
    </div>

    <div class="studio-steps">
      <div class="studio-step spotlight reveal" onclick="openToolModal('bank')" style="cursor:pointer;">
        <span class="experience-num">01 / للتحضير</span>
        <span class="experience-icon">${icon('book')}</span>
        <h3>جهّز المحتوى</h3>
        <p>بنك الأسئلة الشامل ومكتبة مسابقاتي الخاصة مع أدوات المراجعة والحفظ التلقائي.</p>
        <span class="experience-link">افتح مكتبتي وبنك الأسئلة ${icon('arrow')}</span>
      </div>

      <div class="studio-step spotlight reveal" onclick="renderLiveLobby('royal', currentLobbyPin)" style="cursor:pointer;">
        <span class="experience-num">02 / للانطلاق</span>
        <span class="experience-icon">${icon('planet')}</span>
        <h3>أطلق المنافسة</h3>
        <p>اختر نشاطك وعالمك الكرتوني، واجمع طلابك في اللوبي بانتظار 3D حي وتحدٍ فوري.</p>
        <span class="experience-link">انطلاق القاعة فوراً ${icon('arrow')}</span>
      </div>

      <div class="studio-step spotlight reveal" onclick="openToolModal('reports')" style="cursor:pointer;">
        <span class="experience-num">03 / للتحليل</span>
        <span class="experience-icon">${icon('chart')}</span>
        <h3>افهم النتائج <span class="step-badge"><span class="live-dot"></span> نشط الآن</span></h3>
        <p>نسب صواب الأسئلة الفعلية وتشخيص الأسئلة الأضعف ومتابعة مسودات وتقارير الطلاب.</p>
        <span class="experience-link">افتح التقارير والتحليلات ${icon('arrow')}</span>
      </div>
    </div>

    <!-- STUDIO FAST TOOLS & ACADEMY TEASER -->
    <div class="studio-bottom" style="margin-top:40px;">
      <section class="studio-tools-panel reveal">
        <div class="tools-head">
          <div>
            <span class="section-kicker">RAPID CREATION / أدوات المعلم</span>
            <h2 style="font-size:24px;font-weight:900;color:#ffffff;margin:4px 0 8px;">أدوات الإعداد السريعة</h2>
          </div>
          <span class="launch-pill"><span class="live-dot"></span> منشئ المسابقات الحقيقي</span>
        </div>

        <div class="studio-tools-grid">
          ${[
            ['edit','إنشاء مسابقة جديدة','أنشئ أسئلتك وخياراتها مع الحفظ التلقائي الفوري.','builder',true],
            ['spark','مساعد الأسئلة الذكي AI','توليد الأسئلة بالذكاء الاصطناعي مع مراجعة دقيقة.','ai',true],
            ['grid','بنك الأسئلة الشامل','بنك أسئلة منظم ومكتبة مسابقات خاصة بالمعلم.','bank',true],
            ['file','استيراد Excel / CSV','استيراد سريع بنفس ترتيب أعمدة كاهوت ومعاينة حية.','import',true],
            ['trophy','تقارير القاعة والنتائج','تحليلات دقيقة لنسب الصواب وتشخيص الثغرات.','reports',true],
            ['shield','إدارة المعلمين والمنصة','الموافقات والصلاحيات المتقدمة حسب الرتبة.','teachers',true]
          ].map(([ic,t,d,r,isActive])=>`
            <button type="button" class="studio-tool-card spotlight ${isActive?'':'disabled'}" onclick="openToolModal('${r}')" style="${isActive?'':'opacity:0.65;cursor:not-allowed;'}">
              <div class="tool-card-top">
                <span class="tool-icon">${icon(ic)}</span>
                ${isActive ? '<span class="step-badge"><span class="live-dot"></span> نشط</span>' : '<span class="step-badge soon">قريباً</span>'}
              </div>
              <div class="tool-card-body">
                <h4>${t}</h4>
                <p>${d}</p>
              </div>
              <span class="tool-card-link">فتح الأداة ${icon('arrow')}</span>
            </button>
          `).join('')}
        </div>
      </section>

      <a href="#academy" class="academy-teaser spotlight reveal">
        <img src="assets/academy.webp" alt="أكاديمية المعرفة العائمة">
        <div class="academy-teaser-overlay"></div>
        <div class="academy-teaser-content">
          <span class="section-kicker" style="color:#52d9ed;">FIRST UNIVERSE / أول عالم يتجدّد</span>
          <h2>وراء البوابة،<br><span class="gradient-text">حكاية تنتظر.</span></h2>
          <p>استكشف تصميم الدخول والانتظار والسؤال والنتيجة ومنصة التتويج ثلاثية الأبعاد.</p>
          <span class="experience-link" style="color:#7be8dc;">جرّب معاينة بوابة المعرفة ${icon('arrow')}</span>
        </div>
      </a>
    </div>

    <div class="reveal" style="margin-top:30px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:16px 20px;display:flex;align-items:center;gap:12px;color:#94a3b8;font-size:12px;">
      <span style="font-size:18px;">💡</span>
      <span>تُفتح أدوات الحساب بعد تسجيل الدخول. يمكنك بدء المسابقات في أي وقت وتعديل خياراتها وتخصيص تجربة فصولك بحرية تامة.</span>
    </div>
  </div>`;
};

let academyStage=0,academyAnswer=null;
const academyNames=['الدخول','الانتظار','السؤال','نتيجة الجولة','التتويج'];
window.renderAcademy=function(){
  const views=[
    `<div class="academy-intro"><span class="academy-seal">${icon('book')}</span><span class="studio-kicker">THE KNOWLEDGE GATE</span><h2>بوابة المعرفة</h2><p>كل سؤال مفتاح.<br>وكل فكرة تفتح عالمًا.</p><button class="btn launch-primary" data-academy="1">ادخل المعاينة ${icon('arrow')}</button></div>`,
    `<div class="academy-intro"><span class="studio-kicker">المغامرة تبدأ معًا</span><h2>مكانك بين الأبطال.</h2><p>في القاعة الفعلية يظهر رمز الانضمام والطلاب المتصلون هنا.</p><div class="academy-heroes"><span>✦</span><span>✧</span><span>✦</span></div><button class="btn launch-primary" data-academy="2">شاهد شاشة السؤال ${icon('arrow')}</button></div>`,
    `<div class="academy-question"><div class="academy-question-top"><span>تجربة سؤال / اللغة العربية</span><span>${icon('book')} النعت</span></div><h2>«قرأتُ كتابًا ممتعًا»</h2><p>ما إعراب «ممتعًا»؟</p><div class="academy-answers">${['حال منصوب','نعت منصوب','مفعول به منصوب','خبر مرفوع'].map((t,i)=>`<button data-academy-answer="${i}"><span>${['أ','ب','ج','د'][i]}</span>${t}</button>`).join('')}</div></div>`,
    `<div class="academy-intro"><span class="academy-seal">${icon(academyAnswer===1?'check':'book')}</span><span class="studio-kicker">لحظة فهم</span><h2>${academyAnswer===null?'الإجابة: نعت منصوب':academyAnswer===1?'أحسنت، فتحت بابًا جديدًا!':'خلّينا نفهمها معًا.'}</h2><p>«ممتعًا» تصف الكتاب وتتبعُه في النصب والتنكير؛ لذلك فهي نعت منصوب.</p><button class="btn launch-primary" data-academy="4">شاهد التتويج ${icon('arrow')}</button></div>`,
    `<div class="academy-intro"><span class="academy-seal gold">${icon('trophy')}</span><span class="studio-kicker">كل خطوة تستحق الاحتفال</span><h2>المعرفة هي المكسب.</h2><p>هنا تُعرض نتائج القاعة وأبطالها بعد نهاية المسابقة.</p><button class="btn launch-primary" onclick="renderLiveLobby('royal', currentLobbyPin)">جهّز منافسة فعلية الآن ${icon('arrow')}</button></div>`
  ];
  return `<div class="page academy-page">
    <div class="studio-heading">
      <div><div class="eyebrow">معاينة التصميم</div><h1>عالم واحد. خمس لحظات.</h1><p>تنقّل بين حالات القاعة.</p></div>
      <a href="#studio" class="btn launch-outline small">العودة للاستوديو</a>
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
