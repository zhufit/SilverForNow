const {spawn}=require('node:child_process');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const dir=fs.mkdtempSync(path.join(__dirname,'.server-test-'));
const env={...process.env,PORT:'31879',DATA_DIR:dir,APP_PASSWORD:''};
let child;
async function start(){child=spawn(process.execPath,['server.cjs'],{env,stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',code=>reject(Error('early exit '+code)))})}
async function stop(){if(child){const p=new Promise(resolve=>child.once('exit',resolve));child.kill();await p;child=null}}
const endpoint='http://127.0.0.1:31879/beijing';
async function run(){
 await start();
 const redirect=await fetch(endpoint,{redirect:'manual'});assert.equal(redirect.status,308);
 const page=await fetch(endpoint+'/');assert.equal(page.status,200);assert.match(await page.text(),/sync.js/);
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
 console.log('PASS: subpath redirect, assets, private file isolation, last-write-wins, restart persistence, backup');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await stop();for(const name of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,name));fs.rmdirSync(dir)});
