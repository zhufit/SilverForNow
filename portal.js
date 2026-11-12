// Each entry adds a chapter to the navigation.
const chapters=[{id:'beijing',title:'北京篇',navTitle:'北京',href:'beijing/'}];

function bindTabSwipe(pages,index,view,host){
  let gesture=null;
  const controls='a,button,input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="slider"],.portal-header,.calendar-popover';
  const blocked=()=>host.busy()||host.active()!==index||view.body.classList.contains('sorting')||view.querySelector('.calendar-popover')||view.activeElement?.matches('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
  const cancel=()=>{if(gesture?.horizontal)host.release(false);gesture=null};
  view.addEventListener('touchstart',event=>{
    cancel();
    if(event.touches.length!==1||event.target.closest(controls)||blocked())return;
    const touch=event.touches[0],width=view.defaultView.innerWidth;
    if(touch.clientX<24||touch.clientX>width-24)return;
    gesture={id:touch.identifier,x:touch.clientX,y:touch.clientY,horizontal:false};
  },{passive:true});
  function update(touch){
    const dx=touch.clientX-gesture.x,dy=touch.clientY-gesture.y;
    if(!gesture.horizontal){
      if(Math.hypot(dx,dy)<12)return false;
      if(Math.abs(dx)<Math.abs(dy)*1.6){gesture=null;return false}
      gesture.horizontal=true;
    }
    const next=index+(dx<0?1:-1);
    if(!pages[next]){host.preview(null,0);return true}
    host.preview(next,Math.min(1,Math.abs(dx)/(view.defaultView.innerWidth*.6)));
    return true;
  }
  view.addEventListener('touchmove',event=>{
    if(!gesture)return;
    if(event.touches.length!==1||blocked()){cancel();return}
    const touch=[...event.touches].find(t=>t.identifier===gesture.id);
    if(touch&&update(touch)&&event.cancelable)event.preventDefault();
  },{passive:false});
  view.addEventListener('touchend',event=>{
    if(!gesture)return;
    const touch=[...event.changedTouches].find(t=>t.identifier===gesture.id);
    if(!touch)return;
    if(event.touches.length||blocked()){cancel();return}
    const dx=touch.clientX-gesture.x,dy=touch.clientY-gesture.y;
    const horizontal=update(touch);
    if(horizontal){
      if(event.cancelable)event.preventDefault();
      host.release(Math.abs(dx)>=72&&Math.abs(dx)>Math.abs(dy)*1.6&&!!pages[index+(dx<0?1:-1)]);
    }
    gesture=null;
  },{passive:false});
  view.addEventListener('touchcancel',cancel,{passive:true});
  view.defaultView.addEventListener('blur',cancel);
}

// Keep chapter documents alive in same-origin frames. Each chapter retains its
// own scrolling, editor globals and storage; only the visual layers crossfade.
function createTabHost(pages,start,header,onSelect){
  let active=start,session=null,settling=false,frameRequest=0,finishTimer=0;
  const original=[...document.body.children].filter(el=>el!==header&&!['SCRIPT','IFRAME'].includes(el.tagName));
  const originalOverflow=document.documentElement.style.overflow;
  const records=new Map([[start,{index:start,nodes:original,ready:true}]]);
  const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Freeze the original base before pushState changes the outer URL.
  const baseElement=document.querySelector('base')||document.createElement('base');
  baseElement.href=new URL('./',document.baseURI).href;
  if(!baseElement.isConnected)document.head.prepend(baseElement);
  function nodes(record,styles){record.nodes.forEach(node=>Object.assign(node.style,styles))}
  function visible(record,value){
    nodes(record,{visibility:value?'visible':'hidden'});
    record.nodes.forEach(node=>{node.inert=!value;node.setAttribute('aria-hidden',String(!value))});
  }
  function ensure(index){
    if(records.has(index))return records.get(index);
    const iframe=document.createElement('iframe');iframe.className='tab-frame';
    iframe.title=pages[index].title;iframe.src=pages[index].href;iframe.tabIndex=-1;
    const record={index,nodes:[iframe],ready:false};
    records.set(index,record);visible(record,false);
    record.promise=new Promise(resolve=>{
      let done=false;
      const complete=ok=>{
        if(done)return;done=true;clearTimeout(timeout);record.ready=ok;resolve(ok);
        if(!ok){iframe.remove();records.delete(index);if(session?.next===index)finish(false)}
        if(ok&&session?.next===index){paint(session.progress);if(session.released!==undefined)settle(session.released)}
      };
      const timeout=setTimeout(()=>complete(false),10000);
      iframe.addEventListener('load',()=>{
        let ok=false;
        try{ok=!!iframe.contentDocument.querySelector('#home-cover,#journey')}catch{}
        complete(ok);
      },{once:true});
      iframe.addEventListener('error',()=>complete(false),{once:true});
    });
    document.body.append(iframe);return record;
  }
  function reset(){
    records.forEach(record=>{
      const selected=record.index===active;
      nodes(record,{transition:'none',opacity:'1',filter:'none',zIndex:record.index===start?'':'1',willChange:'',pointerEvents:selected?'auto':'none'});
      visible(record,selected);
    });
    document.documentElement.style.overflow=active===start?originalOverflow:'hidden';
    onSelect(active);
  }
  function paint(progress){
    if(!session)return;
    const from=records.get(active),to=records.get(session.next);
    if(!to?.ready)return;
    visible(from,true);visible(to,true);
    // One opaque layer always remains underneath, avoiding a white flash.
    const toOriginal=session.next===start;
    nodes(from,{opacity:toOriginal?String(1-progress):'1',filter:reduced()?'none':`blur(${progress*4}px)`,willChange:'opacity,filter'});
    nodes(to,{opacity:toOriginal?'1':String(progress),filter:reduced()?'none':`blur(${(1-progress)*6}px)`,zIndex:toOriginal?'':'2',willChange:'opacity,filter',pointerEvents:'none'});
  }
  function finish(commit){
    if(!session)return;
    if(commit){
      active=session.next;
      if(session.history!==false)history.pushState({tab:active},'',pages[active].href);
    }
    session=null;settling=false;reset();
  }
  function settle(commit){
    if(!session)return;
    const to=records.get(session.next);
    if(!to){finish(false);return}
    if(!to?.ready){
      if(!commit){finish(false);return}
      session.released=true;settling=true;
      // Retain the current page while the adjacent document is warming up.
      const pending=session;
      to.promise.then(ok=>{if(!ok&&session===pending)finish(false)});
      return;
    }
    session.released=commit;settling=true;
    cancelAnimationFrame(frameRequest);
    paint(session.progress);
    if(reduced()){paint(commit?1:0);finish(commit);return}
    // Flush the last finger position before starting the short completion.
    to.nodes[0].getBoundingClientRect();
    const styles={transition:'opacity 180ms ease-out, filter 180ms ease-out'};
    nodes(records.get(active),styles);nodes(to,styles);
    paint(commit?1:0);
    finishTimer=setTimeout(()=>finish(commit),190);
  }
  const host={
    active:()=>active,busy:()=>settling,
    attach(view,index){
      view.documentElement.style.overscrollBehaviorY='contain';
      bindTabSwipe(pages,index,view,host);
    },
    preview(next,progress){
      if(settling)return;
      if(next===null){session=null;cancelAnimationFrame(frameRequest);reset();return}
      if(session?.next!==next){session=null;reset();ensure(next);session={next,progress:0}}
      session.progress=progress;
      cancelAnimationFrame(frameRequest);frameRequest=requestAnimationFrame(()=>paint(progress));
    },
    release:commit=>settle(commit),
    select(next,writeHistory=true){
      if(settling||next===active)return;
      host.preview(next,0);session.history=writeHistory;settle(true);
    }
  };
  window.addEventListener('popstate',()=>{
    const path=location.pathname.replace(/\/$/,'');
    const next=pages.findIndex(page=>new URL(page.href).pathname.replace(/\/$/,'')===path);
    if(next<0)return;
    clearTimeout(finishTimer);cancelAnimationFrame(frameRequest);session=null;settling=false;
    reset();host.select(next,false);
  });
  reset();host.attach(document,start);
  const warm=()=>setTimeout(()=>pages.forEach((page,index)=>{if(index!==start)ensure(index)}),300);
  if(document.readyState==='complete')warm();else window.addEventListener('load',warm,{once:true});
  return host;
}

(()=>{
  const base=new URL('./',document.currentScript.src);
  const pages=[{title:'首页',href:new URL('#home-cover',base).href},...chapters.map(chapter=>({title:chapter.navTitle||chapter.title,href:new URL(chapter.href,base).href}))];
  const path=location.pathname.replace(/\/$/,'');
  const index=Math.max(0,pages.findIndex(page=>new URL(page.href).pathname.replace(/\/$/,'')===path));
  if(window.parent!==window&&window.parent.portalTabHost){
    window.parent.portalTabHost.attach(document,index);
  }else{
    const header=document.createElement('header');header.className='portal-header';
    const brand=document.createElement('a');brand.className='portal-brand';brand.href=pages[0].href;
    brand.setAttribute('aria-label','碎银换今朝 · 返回首页封面');brand.title='返回首页封面';
    brand.innerHTML='<svg viewBox="0 0 32 32" width="30" height="30" fill="currentColor" aria-hidden="true" focusable="false"><path d="m7 10 9-4 3 10-8 5-5-5Z"/><path d="m22 11 5 3-2 7-5-3Z"/><path d="m13 25 5-4 5 4-6 3Z"/></svg>';
    const nav=document.createElement('nav');nav.setAttribute('aria-label','篇章导航');
    const links=[brand];
    pages.slice(1).forEach(page=>{const link=document.createElement('a');link.href=page.href;link.textContent=page.title;nav.append(link);links.push(link)});
    header.append(brand,nav);document.body.prepend(header);
    const select=active=>{
      links.forEach((link,i)=>{if(i===active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')});
      header.style.color=active===0?'#3e5362':'#d8d0c3';
      document.title=active===0?'人生三万天 · 碎银换今朝':pages[active].title+'篇 · 碎银换今朝';
    };
    const boot=()=>{
      window.portalTabHost=createTabHost(pages,index,header,select);
      links.forEach((link,i)=>link.addEventListener('click',event=>{
        if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
        event.preventDefault();window.portalTabHost.select(i);
      }));
    };
    select(index);
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  }
  const cover=document.getElementById('home-cover');
  if(cover){
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
