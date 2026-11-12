const CACHE='beijing-journal-v69';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','./index.html','./style.css','./background.css','./cover.svg','./scenes.js','./drag.js','./calendar.js','./app.js','./sync.js',...['cover','palace','hutong','lake','temple','wall'].map(name=>'./assets/mobile/'+name+'.svg')])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);if(e.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.includes('/api/'))return;e.respondWith(caches.open(CACHE).then(c=>c.match(e.request)).then(hit=>hit||fetch(e.request)))});
