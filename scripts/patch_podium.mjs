import fs from 'fs';

const filePath = 'E:\\MY PRO\\New folder (4)\\SCOREAR_FINAL_RELEASE\\quiz-podium-effects.js';
let js = fs.readFileSync(filePath, 'utf8');

// Update crown top position
js = js.replace('top:-30px;font-size:38px;', 'top:-46px;font-size:38px;');

// Update revealAll
const oldRevealAll = 'function revealAll() { if(cTimer){clearTimeout(cTimer);cTimer=null;} revealStep=0;advanceReveal();advanceReveal();advanceReveal(); }';
const newRevealAll = `function revealAll() {
    if(cTimer){clearTimeout(cTimer);cTimer=null;}
    revealStep=3;
    const wid=room?.world?.id||room?.worldId||'royal';
    const veil=$('scVeil'), drum=$('scDrum'), rig=$('podiumCameraRig'), btn=$('scRevBtn');
    if(veil) veil.style.opacity='0';
    if(drum) drum.style.display='none';
    if(rig) rig.style.transform='scale(1.05) translate(0,1%)';
    [1,2,3].forEach(r=>{
      const ped=$('ped_' + r), h=$('hero_' + r), hm=$('hm_' + r);
      if(ped) ped.style.transform='translateY(0)';
      if(h){h.style.display='flex';h.style.opacity='1';h.style.transform='translateY(0) scale(1)';}
      const pl=players[r===1?0:r===2?1:2];
      if(pl&&hm) mountHero(hm,pl.avatarId,currentPose);
      const scr=$('pedScore_' + r); if(scr&&pl) scr.textContent=pl.score||0;
    });
    const crown=$('scCrown'), pc=$('scPart'), sc=$('scSpot');
    if(crown) crown.style.visibility='visible';
    if(pc) pc.style.opacity='1';
    if(sc){cancelAnimationFrame(rafId);runSpotlights(sc,wid,3);}
    $('scExport')?.style.setProperty('display','flex');
    if(btn){btn.textContent='📋 الترتيب النهائي الكامل';btn.style.background='linear-gradient(135deg,#4f46e5,#3730a3)';}
  }`;

if (js.includes(oldRevealAll)) {
  js = js.replace(oldRevealAll, newRevealAll);
  console.log('revealAll replaced successfully');
} else {
  console.log('oldRevealAll not found exactly');
}

fs.writeFileSync(filePath, js, 'utf8');
console.log('quiz-podium-effects.js updated, total lines:', js.split('\n').length);
