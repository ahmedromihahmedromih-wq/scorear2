(function(global){
  'use strict';
  const base = (document.currentScript && document.currentScript.src) ? new URL('assets/characters/animated/', document.currentScript.src).href : 'assets/characters/animated/';
  const rows = [
    ['زياد','المستكشف','human','#39d8ce'],['نور','صانعة الأفكار','human','#ba9aff'],
    ['سليم','العالِم','human','#ffd066'],['فريدة','الفنانة','human','#ff8c94'],
    ['ياسين','الرياضي','human','#73dc98'],['ملك','حارسة المعرفة','human','#f8a8d1'],
    ['عمر','المخترع','human','#ffb66b'],['هنا','رائدة الفضاء','human','#bba8ff'],
    ['ليث','الأسد الشجاع','animal','#ffd066'],['فلفل','الثعلب الرحّال','animal','#ffaf76'],
    ['قفزة','الأرنب السريع','animal','#ffa3bc'],['بندق','الباندا الفضولي','animal','#b3df93'],
    ['مشمش','القط المخترع','animal','#80caff'],['حكيم','البومة القارئة','animal','#c0a3ff'],
    ['نبض','الروبوت الودود','fantasy','#70ead9'],['وميض','رفيق المستقبل','fantasy','#bfa2ff'],
    ['شرارة','التنين الصغير','fantasy','#78d9b8'],['غيمة','صديق السماء','fantasy','#b3e5ff'],
    ['نجم','ساحر النجوم','fantasy','#ffe395'],['بلّور','فارس الكريستال','fantasy','#89e8f3']
  ];
  const list = rows.map(([name,title,category,accent],i)=>{
    const id=i+1,code='char_'+String(id).padStart(2,'0');
    return {
      id,code,name,title,category,accent,
      image:base+code+'-idle.webp',
      avatarUrl:base+code+'-idle.webp',
      fullUrl:'assets/characters/'+code+'_full.webp',
      atlas:base+code+'-atlas.webp',
      runAtlas:base+code+'-run.webp',
      climbAtlas:base+code+'-climb.webp',
      flyAtlas:base+code+'-fly.webp',
      world:'royal',worldName:'عالم المعرفة',stats:{iq:90,speed:90,focus:90,luck:90},
      ability:'مظهر اختياري؛ لا يغيّر النقاط أو فرص الفوز',
      lore:'رفيقك في رحلة التعلم والمنافسة. اختر الشخصية التي تعبّر عنك.',
      color:'bg-purple-500/20 text-purple-300 border-purple-400'
    };
  });
  function get(id){
    if (!id && id !== 0) return list[0];
    const s = String(id).trim();
    const codeMatch = list.find(c => c.code === s);
    if (codeMatch) return codeMatch;
    const num = Number(id);
    if (!isNaN(num)) {
      const idMatch = list.find(c => c.id === num);
      if (idMatch) return idMatch;
    }
    const digits = s.match(/\d+/);
    if (digits) {
      const dNum = parseInt(digits[0], 10);
      const digitMatch = list.find(c => c.id === dNum);
      if (digitMatch) return digitMatch;
    }
    return list[0];
  }
  function render(id,state='idle'){
    const c=get(id);state=['idle','walk','celebrate'].includes(state)?state:'idle';
    return '<span class="scorear-character character-'+state+'" role="img" aria-label="'+c.name+'" style="--character-atlas:url(\''+c.atlas+'\')"><img src="'+c.image+'" alt="" loading="lazy" decoding="async"><span class="character-frames" aria-hidden="true"></span></span>';
  }
  list.forEach(c=>{c.svg=render(c.id);c.fullSvg=render(c.id,'walk');});
  let paused=false;
  try{paused=localStorage.getItem('scorear_character_motion')==='off';}catch(e){}
  function applyMotion(){
    document.documentElement.classList.toggle('characters-paused',paused);
    document.querySelectorAll('[data-character-motion]').forEach(b=>{b.textContent=paused?'تشغيل الحركة':'إيقاف الحركة';b.setAttribute('aria-pressed',String(paused));});
  }
  function toggleMotion(){paused=!paused;try{localStorage.setItem('scorear_character_motion',paused?'off':'on');}catch(e){}applyMotion();}
  function preview(id,state='walk'){
    const c=get(id),box=document.getElementById('studentCustomPreviewBox'),title=document.getElementById('studentCustomPreviewTitle');
    if(box){const ornament=box.querySelector('.character-ornament')?.outerHTML||'';box.innerHTML=render(id,state)+ornament;}
    if(title)title.innerHTML='<h3>'+c.name+'</h3><p>'+c.title+'</p>';
    const stage=document.querySelector('.character-stage');if(stage)stage.style.setProperty('--character-accent',c.accent);
    document.querySelectorAll('[data-character-pose]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.characterPose===state)));
    applyMotion();
  }
  function grid(el,category,selected,onSelect){
    const focused=document.activeElement?.dataset?.characterId;
    el.replaceChildren();
    list.filter(c=>category==='all'||!category||c.category===category).forEach(c=>{
      const b=document.createElement('button');b.type='button';b.className='character-card';b.dataset.characterId=c.id;
      b.setAttribute('aria-pressed',String(c.id===selected));b.setAttribute('aria-label',c.name+'، '+c.title);
      b.style.setProperty('--character-accent',c.accent);
      b.innerHTML=render(c.id)+'<span class="character-card-name">'+c.name+'</span><span class="character-card-title">'+c.title+'</span><span class="character-check" aria-hidden="true">✓</span>';
      b.onclick=()=>onSelect(c.id);el.appendChild(b);
    });
    if(focused)el.querySelector('[data-character-id="'+focused+'"]')?.focus({preventScroll:true});
  }
  global.ScoreARCharacters={list,get,render,grid,preview,toggleMotion,applyMotion};
  document.addEventListener('visibilitychange',()=>document.documentElement.classList.toggle('characters-background',document.hidden));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyMotion);else applyMotion();
})(window);
