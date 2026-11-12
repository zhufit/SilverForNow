let metricsDirty=true;
function resizeTitle(el){el.style.height='auto';el.style.height=el.scrollHeight+'px';metricsDirty=true}
const key='beijing-journal-v1';
const initial={food:['吃一顿热气腾腾的涮羊肉','去胡同里，找一碗炸酱面','尝尝刚出炉的北京烤鸭'],place:['等一场故宫的雪','登上景山，看一眼紫禁城','沿着什刹海，慢慢走']};
let data=Object.fromEntries(Object.entries(initial).map(([k,v])=>[k,v.map(title=>({title,done:false}))]));
const status=document.querySelector('#status');
const backToTimeline=document.createElement('button');
backToTimeline.type='button';backToTimeline.className='back-to-timeline';
backToTimeline.textContent='↑';backToTimeline.setAttribute('aria-label','回到事件轴顶部');
backToTimeline.onclick=()=>document.getElementById('journey').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
document.getElementById('journey').append(backToTimeline);
document.querySelectorAll('[data-add]').forEach(button=>{
  button.textContent='+';
  button.setAttribute('aria-label',button.dataset.add==='food'?'新增美食':'新增景点');
  button.title=button.getAttribute('aria-label');
});
function valid(d){return d&&['food','place'].every(k=>Array.isArray(d[k])&&d[k].length<=1000&&d[k].every(x=>x&&typeof x.title==='string'&&x.title.length<=200&&typeof x.done==='boolean'))}
try{const saved=localStorage.getItem(key);if(saved){const parsed=JSON.parse(saved);if(!valid(parsed))throw Error();data=parsed}}catch{status.textContent='无法读取本地记录，请导入备份'}
function save(){try{localStorage.setItem(key,JSON.stringify(data));status.textContent='已保存在此设备'}catch{status.textContent='保存失败，请导出备份'}count()}
function count(){const all=[...data.food,...data.place];document.querySelector('#count').textContent=`${all.length} 份期待 · 已遇见 ${all.filter(x=>x.done).length} 份`}
function removeItem(row,lane,item){
  if(row.dataset.removing)return;
  row.dataset.removing='true';
  const commit=()=>{
    const index=data[lane].indexOf(item);
    if(index<0)return;
    const position=window.scrollY;
    data[lane].splice(index,1);save();render();
    window.scrollTo({top:position,behavior:'instant'});
  };
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){commit();return}
  row.style.height=`${row.offsetHeight}px`;
  row.classList.remove('item-added','revealing');
  row.classList.add('item-removing');
  // A timer also completes deletion when the tab becomes hidden mid-animation.
  let finished=false;
  const finish=()=>{if(finished)return;finished=true;clearTimeout(fallback);commit()};
  const fallback=setTimeout(finish,400);
  row.addEventListener('animationend',event=>{if(event.animationName==='item-remove')finish()},{once:true});
}
const expandedItems=new WeakSet();
function render(){
  metricsDirty=true;
  for(const lane of ['food','place']){
    const root=document.getElementById(lane);root.replaceChildren();
    data[lane].forEach(item=>{
      const card=document.createElement('article');card.className='card'+(item.done?' done':'');
      const top=document.createElement('div');top.className='card-top';
      const check=document.createElement('button');check.className='check';check.textContent=item.done?'✓':'';
      check.setAttribute('aria-label',item.done?'标记为未完成':'标记为已完成');check.setAttribute('aria-pressed',item.done);
      check.onclick=()=>{item.done=!item.done;card.classList.toggle('done',item.done);check.textContent=item.done?'✓':'';check.setAttribute('aria-label',item.done?'标记为未完成':'标记为已完成');check.setAttribute('aria-pressed',String(item.done));save()};
      const fields=document.createElement('div');fields.className='item-fields';
      const date=createCalendar(item,save);
      const title=document.createElement('textarea');title.rows=1;title.className='title';title.value=item.title;title.maxLength=200;title.placeholder='事项标题';title.setAttribute('aria-label','编辑事项标题');
      title.oninput=()=>{item.title=title.value;resizeTitle(title);save()};bindDrag(title,card,lane,item);
      fields.append(date,title);top.append(check,fields);
      const actions=document.createElement('div');actions.className='actions';
      const toggle=document.createElement('button');toggle.className='details-toggle';toggle.type='button';
      const details=document.createElement('textarea');details.className='item-details';details.rows=2;details.maxLength=4000;details.value=item.details||'';details.placeholder='添加详情';details.setAttribute('aria-label','事项详情');details.hidden=!expandedItems.has(item);
      function syncToggle(){const open=!details.hidden;toggle.textContent='▸';toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'收起详情':'展开详情')}
      syncToggle();toggle.onclick=()=>{
        metricsDirty=true;
        details.hidden=!details.hidden;
        if(details.hidden)expandedItems.delete(item);
        else{expandedItems.add(item);details.classList.remove('details-enter');void details.offsetWidth;details.classList.add('details-enter');resizeTitle(details)}
        syncToggle();
      };
      details.oninput=()=>{item.details=details.value;resizeTitle(details);save()};
      const del=document.createElement('button');del.textContent='×';del.setAttribute('aria-label','删除事项');del.onclick=()=>removeItem(card,lane,item);
      actions.append(toggle,del);card.append(top,actions,details);root.append(card);resizeTitle(title);if(!details.hidden)resizeTitle(details);
    });
  }
  count();
}
// Animate each item only once, without hiding content when observers are unavailable.
const revealedItems=new WeakSet();
const revealTargets=new WeakMap();
let nextRevealAt=0;
const itemObserver='IntersectionObserver' in window?new IntersectionObserver(entries=>{
  const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top||a.boundingClientRect.left-b.boundingClientRect.left);
  if(!visible.length)return;
  const now=performance.now();
  nextRevealAt=Math.max(now,nextRevealAt);
  for(const entry of visible){
    const row=entry.target,item=revealTargets.get(row);
    if(item)revealedItems.add(item);
    row.style.setProperty('--reveal-delay',`${Math.min(900,nextRevealAt-now)}ms`);
    nextRevealAt+=120;
    row.classList.remove('awaiting-reveal');row.classList.add('revealing');itemObserver.unobserve(row);
    row.addEventListener('animationend',()=>{row.classList.remove('revealing');row.style.removeProperty('--reveal-delay')},{once:true});
  }
},{threshold:.08}):null;
const renderItems=render;
render=function(){
  itemObserver?.disconnect();
  renderItems();
  if(!itemObserver||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  for(const lane of ['food','place']){
    [...document.getElementById(lane).children].forEach((row,i)=>{
      const item=data[lane][i];
      if(revealedItems.has(item))return;
      revealTargets.set(row,item);
      row.classList.add('awaiting-reveal');itemObserver.observe(row);
    });
  }
};
document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{
  const lane=b.dataset.add;
  const scrollPosition=window.scrollY;
  data[lane].push({title:'',date:'',details:'',done:false});
  save();render();
  const title=document.getElementById(lane).lastElementChild.querySelector('.title');
  const newRow=title.closest('.card');
  itemObserver?.unobserve(newRow);
  newRow.classList.remove('awaiting-reveal','revealing');
  newRow.classList.add('item-added');
  newRow.addEventListener('animationend',()=>newRow.classList.remove('item-added'),{once:true});
  window.scrollTo({top:scrollPosition,behavior:'instant'});
  requestAnimationFrame(()=>{
    const rect=title.getBoundingClientRect();
    if(rect.bottom>innerHeight-32)window.scrollBy({top:rect.bottom-innerHeight+32,behavior:'smooth'});
    else if(rect.top<0)window.scrollBy({top:rect.top-24,behavior:'smooth'});
  });
});
// Keep the cover outside the hero so it remains behind the entire document.
const backdrop=document.createElement('div');

backdrop.className='global-backdrop';
backdrop.setAttribute('aria-hidden','true');
backdrop.append(document.querySelector('.scene'));
const sceneLayers=[];
const scenesReady=document.createElement('script');
scenesReady.src='./scenes.js';
scenesReady.onload=()=>{
  window.beijingScenes.forEach((scene,i)=>{
    const layer=document.createElement('div');
    layer.className='scenic-layer';
    layer.dataset.scene=['hutong','lake','temple','wall'][i];
    layer.innerHTML=`<svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="scene-sky-${i}" x2="0" y2="1"><stop stop-color="${scene.sky[0]}"/><stop offset="1" stop-color="${scene.sky[1]}"/></linearGradient></defs><path fill="url(#scene-sky-${i})" d="M0 0h1440v900H0z"/>${scene.art}</svg>`;
    backdrop.insertBefore(layer,backdrop.querySelector('.backdrop-snow'));
    sceneLayers.push(layer);
  });
  fitBackgrounds();
  scrollEffect();
};
document.head.append(scenesReady);
for(const name of ['snow','teal','veil']){const layer=document.createElement('div');layer.className='backdrop-'+name;backdrop.append(layer)}
document.body.prepend(backdrop);
function fitBackgrounds(){
  const viewportHeight=backdrop.clientHeight||innerHeight;
  const portrait=innerWidth<=900&&viewportHeight>innerWidth;
  const svgs=[backdrop.querySelector('.scene'),...sceneLayers.map(layer=>layer.querySelector('svg'))];
  const focalPoints=[1050,720,880,1010,900];
  svgs.forEach((svg,i)=>{
    if(!svg)return;
    const baseHeight=i===0?800:900;
    // A narrower portrait viewBox fills the screen without extending empty sky.
    const height=baseHeight;
    const width=portrait?Math.max(1,Math.min(1440,baseHeight*innerWidth/viewportHeight)):1440;
    const x=portrait?Math.max(0,Math.min(1440-width,focalPoints[i]-width/2)):0;
    svg.setAttribute('viewBox',`${x} 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio','xMidYMid slice');
    const sky=svg.querySelector('path');
    if(sky)sky.setAttribute('d','M-2000 -6000h6000v10000h-6000z');
  });
}
fitBackgrounds();
let backgroundWidth=innerWidth;
addEventListener('resize',()=>{
  // Mobile address-bar changes only alter height; retain the composition.
  if(innerWidth!==backgroundWidth){backgroundWidth=innerWidth;fitBackgrounds()}
});
addEventListener('orientationchange',()=>requestAnimationFrame(fitBackgrounds));
const snowfall=document.createElement('div');
snowfall.className='snowfall';
snowfall.setAttribute('aria-hidden','true');
// Random depth: mostly small flakes, with occasional medium and large flakes.
for(let i=0;i<56;i++){
  const flake=document.createElement('span');
  const roll=Math.random();
  const depth=roll<.5?0:roll<.82?1:2;
  const size=[1.5,3.5,6][depth]+Math.random()*[1.5,2,3][depth];
  const duration=[38,30,24][depth]+Math.random()*14;
  flake.style.setProperty('--left',`${Math.random()*100}%`);
  flake.style.setProperty('--size',`${size}px`);
  flake.style.setProperty('--duration',`${duration}s`);
  flake.style.setProperty('--delay',`${-Math.random()*duration}s`);
  flake.style.setProperty('--drift',`${(Math.random()-.5)*150}px`);
  flake.style.setProperty('--opacity',`${[.18,.28,.35][depth]+Math.random()*.18}`);
  snowfall.append(flake);
}
backdrop.append(snowfall);
document.addEventListener('visibilitychange',()=>{snowfall.classList.toggle('paused',document.hidden)});
let ticking=false;
let displayedSceneProgress=0,sceneTarget=0,sceneFrame=0,sceneLastTime=0;
const reducedBackgroundMotion=matchMedia('(prefers-reduced-motion: reduce)');
function paintScenes(time){
  const elapsed=sceneLastTime?Math.min(64,time-sceneLastTime):16;
  sceneLastTime=time;
  const difference=sceneTarget-displayedSceneProgress;
  displayedSceneProgress=reducedBackgroundMotion.matches||Math.abs(difference)<.0001?sceneTarget:displayedSceneProgress+difference*(1-Math.exp(-elapsed/520));
  sceneLayers.forEach((layer,i)=>{
    const stage=Math.min(sceneLayers.length,Math.floor(displayedSceneProgress*sceneLayers.length));
    const visible=i===stage||i===stage-1;
    layer.style.visibility=visible?'visible':'hidden';
    layer.style.willChange=visible?'opacity':'auto';
    if(!visible)return;
    const t=Math.max(0,Math.min(1,displayedSceneProgress*sceneLayers.length-i));
    const opacity=String(t*t*(3-2*t));
    if(layer.style.opacity!==opacity)layer.style.opacity=opacity;
  });
  if(displayedSceneProgress!==sceneTarget)sceneFrame=requestAnimationFrame(paintScenes);
  else{sceneFrame=0;sceneLastTime=0}
}
function eventBackgroundProgress(rows,readingLine,layerCount){
  let passed=0;
  for(const row of rows){
    // Layout coordinates exclude the slide-in and drag animation transforms.
    let top=0,node=row;
    while(node){top+=node.offsetTop;node=node.offsetParent}
    const height=Math.max(1,row.offsetHeight);
    if(readingLine>=top+height)passed++;
    else{if(readingLine>top)passed+=(readingLine-top)/height;break}
  }
  // Crossfade over each group of three instead of delaying the first group.
  return Math.max(0,Math.min(1,passed/Math.max(1,layerCount*3)));
}
let layoutMetrics={rows:[],top:0,length:1};
const axisNode=document.querySelector('.axis');
function measureTimeline(){
  const position=el=>{let top=0;while(el){top+=el.offsetTop;el=el.offsetParent}return top};
  const lanes=['food','place'].map(id=>document.getElementById(id));
  const lane=lanes[0].children.length>=lanes[1].children.length?lanes[0]:lanes[1];
  layoutMetrics={top:position(axisNode),length:Math.max(0,...lanes.map(el=>position(el)+el.offsetHeight-position(axisNode))),rows:[...lane.children].map(row=>({offsetTop:position(row),offsetHeight:row.offsetHeight,offsetParent:null}))};
  axisNode.style.setProperty('--axis-length',`${layoutMetrics.length}px`);
  metricsDirty=false;
}
function scrollEffect(){
  if(ticking)return;
  ticking=true;
  requestAnimationFrame(()=>{
    if(metricsDirty)measureTimeline();
    axisNode.style.setProperty('--axis-progress',Math.max(0,Math.min(1,(scrollY+innerHeight*.65-layoutMetrics.top)/Math.max(1,layoutMetrics.length))));
    // Use the longer lane as the ruler: three events per background.
    // Account for expanded details and wrapped titles through actual row bounds.
    const readingLine=scrollY+(window.visualViewport?.height||innerHeight)*.5;
    const progress=eventBackgroundProgress(layoutMetrics.rows,readingLine,sceneLayers.length);
    sceneTarget=progress;
    if(!sceneFrame)sceneFrame=requestAnimationFrame(paintScenes);
    const snow=progress*.22;
    const teal=progress*.12;
    backdrop.style.setProperty('--snow-opacity',snow);
    backdrop.style.setProperty('--teal-opacity',teal);
    ticking=false;
  });
}
addEventListener('scroll',scrollEffect,{passive:true});
let titleLayoutWidth=innerWidth;
addEventListener('resize',()=>{if(titleLayoutWidth!==innerWidth){titleLayoutWidth=innerWidth;document.querySelectorAll('.title,.item-details:not([hidden])').forEach(resizeTitle)}scrollEffect()});
if(document.fonts)document.fonts.ready.then(()=>document.querySelectorAll('.title').forEach(resizeTitle));
render();
if('ResizeObserver' in window)new ResizeObserver(()=>{metricsDirty=true;scrollEffect()}).observe(document.querySelector('.timeline'));
scrollEffect();
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{status.textContent='本地保存可用，离线缓存未启用'});
