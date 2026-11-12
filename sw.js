const CACHE='silverfornow-v89';
// Previously installed chapter-scoped workers must also load the new portal.
const base=new URL(self.location.pathname.endsWith('/beijing/sw.js')?'../':'./',self.location.href);
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','./index.html','./beijing/','./portal.css','./portal.js','./assets/home-cover.f773bf83cd.webp','./assets/home-cover-mobile.63d20eccfb.webp','./style.css','./background.css','./cover.svg','./scenes.js','./drag.js','./calendar.js','./app.js','./sync.js',...['cover','palace','hutong','lake','temple','wall'].map(name=>'./assets/mobile/'+name+'.svg')].map(path=>new URL(path,base).href))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);if(e.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.includes('/api/'))return;e.respondWith(caches.open(CACHE).then(c=>c.match(e.request)).then(hit=>hit||fetch(e.request)))});
