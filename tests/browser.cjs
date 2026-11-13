const {chromium}=require('playwright');
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(__dirname,'.browser-data-')),port=31885;
const origin=`http://127.0.0.1:${port}/livenow`;
const server=spawn(process.execPath,['server/index.cjs'],{cwd:root,env:{...process.env,PORT:String(port),DATA_DIR:dir,APP_PASSWORD:''},stdio:['ignore','pipe','pipe']});
let browser;
async function run(){
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
 const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
 const executablePath=process.env.BROWSER_PATH||(fs.existsSync(edge)?edge:undefined);
 browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
 const errors=[],missing=[];
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390,reducedMotion:'reduce'});
  await context.addInitScript(()=>{
   for(const [key,title] of [['beijing-journal-v1','原北京记录'],['moving-journal-v1','原搬家记录']]){
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({food:[{title,done:false,date:'2026-11-14',details:'原详情'}],place:[]}));
   }
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('response',response=>{if(response.status()===404)missing.push(response.url())});
  await page.goto(origin+'/');
  await page.waitForFunction(()=>window.portalTabHost&&document.querySelectorAll('iframe').length===2&&[...document.querySelectorAll('iframe')].every(frame=>frame.contentDocument.querySelector('.sync-bar')));
  assert.deepEqual(await page.locator('.portal-header nav a').allTextContents(),['搬家','北京']);
  assert.equal(await page.title(),'碎银换今朝');
  const moving=page.frames().find(frame=>frame.url().endsWith('/moving/'));
  const beijing=page.frames().find(frame=>frame.url().endsWith('/beijing/'));
  await page.locator('.portal-header nav a').nth(0).click();await page.waitForFunction(()=>portalTabHost.active()===1);
  assert.match(page.url(),/\/moving\/$/);
  assert.equal(await moving.locator('.snowfall').count(),0);
  assert.equal(await moving.locator('#food .title').first().inputValue(),'原搬家记录');
  await moving.locator('[data-add="food"]').click();await moving.locator('#food .title').last().fill('重构后新增事项 '+width);
  await moving.locator('#food .details-toggle').last().click();await moving.locator('#food .item-details').last().fill('编辑、日期及同步正常');
  await moving.locator('#food .calendar-trigger').last().click();
  await moving.locator('.calendar-heading input').fill('2026');await moving.locator('.calendar-heading input').dispatchEvent('change');
  await moving.locator('.calendar-month-trigger').click();await moving.locator('.calendar-months button').nth(10).click();
  await moving.getByRole('button',{name:'2026年11月14日',exact:true}).click();await moving.locator('#food .check').last().click();
  await moving.waitForFunction(()=>document.querySelector('.sync-bar span').textContent==='已保存到服务器');
  await moving.evaluate(()=>window._retained='moving');
  await page.locator('.portal-header nav a').nth(1).click();await page.waitForFunction(()=>portalTabHost.active()===2);
  assert.match(page.url(),/\/beijing\/$/);assert.equal(await beijing.locator('#food .title').first().inputValue(),'原北京记录');
  await beijing.waitForFunction(()=>document.querySelectorAll('.scenic-layer').length===4);assert.equal(await beijing.locator('.snowfall').count(),1);
  await page.locator('.portal-header nav a').nth(0).click();await page.waitForFunction(()=>portalTabHost.active()===1);
  assert.equal(await moving.evaluate(()=>window._retained),'moving');assert.equal(await moving.locator('#food .title').last().inputValue(),'重构后新增事项 '+width);
  await page.locator('.portal-brand').click();await page.waitForFunction(()=>portalTabHost.active()===0);
  await page.goBack();await page.waitForFunction(()=>portalTabHost.active()===1);
  await page.locator('.portal-brand').click();await page.waitForFunction(()=>portalTabHost.active()===0);
  if(width===390){
   // Swipe over the covers; gestures over item editors intentionally do not switch tabs.
   for(const frame of [moving,beijing])await frame.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,behavior:'instant'})});
   const cdp=await context.newCDPSession(page);
   async function swipe(from,to){
    for(const [type,x] of [['touchStart',from],['touchMove',(from+to)/2],['touchMove',to],['touchEnd',to]]){
     await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y:180}]});await page.waitForTimeout(40);
    }
   }
   await swipe(300,90);await page.waitForFunction(()=>portalTabHost.active()===1);
   await swipe(300,90);await page.waitForFunction(()=>portalTabHost.active()===2);
   await swipe(90,300);await page.waitForFunction(()=>portalTabHost.active()===1);
   await swipe(90,300);await page.waitForFunction(()=>portalTabHost.active()===0);
  }
  // All three canonical URLs must support direct entry and returning home.
  for(const [tab,index] of [['moving',1],['beijing',2]]){
   const direct=await context.newPage();direct.on('pageerror',e=>errors.push(e.message));
   await direct.goto(origin+'/'+tab+'/');await direct.waitForFunction(index=>window.portalTabHost?.active()===index,index);
   assert.equal(await direct.locator('#food .title').first().inputValue(),tab==='moving'?'原搬家记录':'原北京记录');
   await direct.locator('.portal-brand').click();await direct.waitForFunction(()=>portalTabHost.active()===0);
   assert.equal(await direct.frameLocator('iframe[title="首页"]').locator('#portal-title').textContent(),'碎银换今朝');await direct.close();
  }
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);
  await context.setOffline(true);await page.goto(origin+'/beijing/');await page.waitForFunction(()=>window.portalTabHost?.active()===2);
  assert.equal(await page.locator('#food .title').first().inputValue(),'原北京记录');
  await context.setOffline(false);await context.close();
 }
 // Daily progress now belongs to the home module; verify the timezone boundary.
 const context=await browser.newContext({timezoneId:'America/Los_Angeles'}),page=await context.newPage();
 await page.clock.install({time:new Date('2026-11-13T15:59:58Z')});await page.goto(origin+'/');
 assert.equal(await page.locator('#life-progress-label').textContent(),'第 9,765 天 / 30,000');
 await page.clock.fastForward(3000);assert.equal(await page.locator('#life-progress-label').textContent(),'第 9,766 天 / 30,000');
 await context.close();assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 console.log('PASS: new tab order, swipes both ways, direct entry, history, existing records, editor/date/sync, frame persistence, offline reload and daily progress');
}
run().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{
 if(browser)await browser.close();await new Promise(resolve=>{server.once('exit',resolve);server.kill()});
 for(const name of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,name));fs.rmdirSync(dir);
});
