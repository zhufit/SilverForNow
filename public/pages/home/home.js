// November 13, 2026 is day 9,765. Count calendar days at UTC+8,
// independent of the visitor's time zone, clock time and page reloads.
function lifeDayNumber(now=new Date()){
  const day=86400000,beijingOffset=8*3600000;
  return Math.max(0,9765+Math.floor((now.getTime()+beijingOffset)/day)-Date.UTC(2026,10,13)/day);
}
function bindLifeProgress(cover){
  const progress=cover.querySelector('#life-progress'),label=cover.querySelector('#life-progress-label');
  if(!progress||!label)return;
  let timer;
  function update(){
    clearTimeout(timer);
    const now=new Date(),days=lifeDayNumber(now),total=30000;
    progress.value=Math.min(total,days);
    progress.textContent=(progress.value/total*100).toFixed(2)+'%';
    label.textContent=`第 ${days.toLocaleString('en-US')} 天 / ${total.toLocaleString('en-US')}`;
    // Recalculate at the next Beijing midnight, including after sleep/resume.
    const day=86400000,beijingTime=now.getTime()+8*3600000;
    timer=setTimeout(update,day-((beijingTime%day+day)%day)+50);
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
  window.addEventListener('focus',update);
  window.addEventListener('pageshow',update);
  update();
}

(()=>{
  const base=new URL('../../',document.currentScript.src);
  const cover=document.getElementById('home-cover');
  if(cover){
    bindLifeProgress(cover);
    const image=cover.querySelector('.home-cover-art');
    if(image.complete&&image.naturalWidth){cover.classList.add('cover-ready','cover-cached')}
    else{
      const loader=document.createElement('span');loader.className='cover-loader';loader.setAttribute('role','status');loader.setAttribute('aria-label','封面加载中');
      cover.append(loader);cover.classList.add('cover-loading');let settled=false;
      function reveal(){if(settled)return;settled=true;cover.classList.remove('cover-loading');cover.classList.add('cover-ready');loader.remove()}
      function loaded(){if(image.decode)image.decode().then(reveal,reveal);else reveal()}
      image.addEventListener('load',loaded,{once:true});image.addEventListener('error',reveal,{once:true});
      if(image.complete){if(image.naturalWidth)loaded();else reveal()}
    }
  }
  if(cover&&window.parent===window&&'serviceWorker' in navigator&&location.protocol!=='file:'){
    const register=()=>navigator.serviceWorker.register(new URL('sw.js',base)).catch(()=>{});
    const defer=()=>{if('requestIdleCallback' in window)window.requestIdleCallback(register,{timeout:3000});else setTimeout(register,1000)};
    if(document.readyState==='complete')defer();else window.addEventListener('load',defer,{once:true});
  }
})();
