const CACHE='silverfornow-v94';
// Previously installed chapter-scoped workers must also load the new portal.
const base=new URL(/\/(beijing|moving)\/sw\.js$/.test(self.location.pathname)?'../':'./',self.location.href);
importScripts(new URL('shared/precache.js',base).href);
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(PRECACHE_URLS.map(path=>new URL(path,base).href))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);if(e.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.includes('/api/'))return;e.respondWith(caches.open(CACHE).then(c=>c.match(e.request)).then(hit=>hit||fetch(e.request)))});
