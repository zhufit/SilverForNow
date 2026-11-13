(()=>{
  const base=new URL('../',document.currentScript.src);
  const pages=[{title:'首页',href:new URL('#home-cover',base).href},...chapters.map(chapter=>({title:chapter.navTitle||chapter.title,href:new URL(chapter.href,base).href}))];
  const path=location.pathname.replace(/\/$/,'');
  const index=Math.max(0,pages.findIndex(page=>new URL(page.href).pathname.replace(/\/$/,'')===path));
  if(window.parent!==window&&window.parent.portalTabHost){
    window.parent.portalTabHost.attach(document,index);
  }else{
    const header=document.createElement('header');header.className='portal-header';
    const brand=document.createElement('a');brand.className='portal-brand';brand.href=pages[0].href;
    brand.setAttribute('aria-label','人生三万天 · 返回首页封面');brand.title='返回首页封面';
    brand.innerHTML='<svg viewBox="0 0 32 32" width="30" height="30" fill="currentColor" aria-hidden="true" focusable="false"><path d="m7 10 9-4 3 10-8 5-5-5Z"/><path d="m22 11 5 3-2 7-5-3Z"/><path d="m13 25 5-4 5 4-6 3Z"/></svg>';
    const nav=document.createElement('nav');nav.setAttribute('aria-label','篇章导航');
    const links=[brand];
    pages.slice(1).forEach(page=>{const link=document.createElement('a');link.href=page.href;link.textContent=page.title;nav.append(link);links.push(link)});
    header.append(brand,nav);document.body.prepend(header);
    const select=active=>{
      links.forEach((link,i)=>{if(i===active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')});
      header.style.color=active===0?'#526159':chapters[active-1].color||'#d8d0c3';
      document.title=active===0?'人生三万天':pages[active].title+'篇 · 人生三万天';
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
})();
