const {spawn}=require('node:child_process');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const dir=fs.mkdtempSync(path.join(__dirname,'.server-test-'));
const env={...process.env,PORT:'31879',DATA_DIR:dir,APP_PASSWORD:''};
let child;
async function start(){child=spawn(process.execPath,['server.cjs'],{env,stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',code=>reject(Error('early exit '+code)))})}
async function stop(){if(child){const p=new Promise(resolve=>child.once('exit',resolve));child.kill();await p;child=null}}
const endpoint='http://127.0.0.1:31879/livenow/beijing';
async function run(){
 await start();
 const redirect=await fetch(endpoint,{redirect:'manual'});assert.equal(redirect.status,308);
 const page=await fetch(endpoint+'/');assert.equal(page.status,200);assert.match(await page.text(),/sync.js/);
 for(const prefix of ['', '/livenow']){
   const origin='http://127.0.0.1:31879'+prefix;
   if(prefix){const entry=await fetch(origin,{redirect:'manual'});assert.equal(entry.status,308);assert.equal(entry.headers.get('location'),prefix+'/')}
   const home=await fetch(origin+'/');assert.equal(home.status,200);
   const cover=await home.text();assert.match(cover,/人生三万天<\/span><span>碎银换今朝/);assert.doesNotMatch(cover,/chapter-grid|<footer|home-cover-next|home-cover\.png|href="style.css"/);
   const coverAsset=cover.match(/assets\/home-cover\.[a-f0-9]{10}\.webp/)[0];
   const mobileAsset=cover.match(/assets\/home-cover-mobile\.[a-f0-9]{10}\.webp/)[0];
   assert.match(cover,/<source media="\(max-width: 600px\)" srcset="assets\/home-cover-mobile\./);
   const chapter=await fetch(origin+'/beijing/');assert.equal(chapter.status,200);
   const html=await chapter.text();assert.match(html,/<base href="\.\.\/">/);assert.match(html,/id="food"/);assert.match(html,/portal.js/);
   const redirect=await fetch(origin+'/beijing',{redirect:'manual'});assert.equal(redirect.headers.get('location'),prefix+'/beijing/');
   for(const asset of ['portal.js','portal.css','app.js','sw.js','assets/mobile/palace.svg',coverAsset])assert.equal((await fetch(origin+'/'+asset)).status,200);
   const image=await fetch(origin+'/'+coverAsset);assert.equal(image.headers.get('content-type'),'image/webp');assert.match(image.headers.get('cache-control'),/immutable/);
   const bytes=await image.arrayBuffer();assert.ok(bytes.byteLength>0&&bytes.byteLength<100000,'cover should stay below 100 KB');assert.equal(Number(image.headers.get('content-length')),bytes.byteLength);
   const mobile=await fetch(origin+'/'+mobileAsset);assert.equal(mobile.status,200);assert.equal(mobile.headers.get('content-type'),'image/webp');assert.match(mobile.headers.get('cache-control'),/immutable/);
   const mobileBytes=await mobile.arrayBuffer();assert.ok(mobileBytes.byteLength>0&&mobileBytes.byteLength<100000,'portrait cover should stay below 100 KB');
   for(const asset of [coverAsset,mobileAsset,'portal.css']){
     const assetResponse=await fetch(origin+'/'+asset);const tag=assetResponse.headers.get('etag');assert.ok(tag);
     const cached=await fetch(origin+'/'+asset,{headers:{'If-None-Match':tag}});assert.equal(cached.status,304);assert.equal((await cached.arrayBuffer()).byteLength,0);
   }
   const remote=await (await fetch(origin+'/api/journal')).json();assert.equal(remote.data,null);
 }
 assert.equal((await fetch(endpoint+'/server.cjs')).status,404);
 const empty=await (await fetch(endpoint+'/api/journal')).json();assert.equal(empty.data,null);
 const data={food:[{title:'测试',done:false,date:'2026-12-30',details:'详情'}],place:[]};
 const put=value=>fetch(endpoint+'/api/journal',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:value})});
 assert.equal((await put(data)).status,200);
 const latest={food:[{title:'最后一次保存',done:true}],place:[]};
 assert.equal((await put(latest)).status,200);
 await stop();await start();
 const saved=await (await fetch(endpoint+'/api/journal')).json();assert.deepEqual(saved.data,latest);
 assert.equal((await put(data)).status,200);assert.ok(fs.existsSync(path.join(dir,'journal.json.bak')));
 console.log('PASS: routing, optimized WebP under 100 KB, immutable caching, ETag revalidation, file isolation, persistence, backup');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await stop();for(const name of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,name));fs.rmdirSync(dir)});
