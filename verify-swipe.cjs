const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('portal.js','utf8').split('(()=>{')[0];
function setup(index=0){
  const handlers={},windowHandlers={},previews=[],releases=[];
  const state={sorting:false,editing:false,calendar:false,busy:false,active:index};
  const view={defaultView:{innerWidth:390,addEventListener:(type,fn)=>windowHandlers[type]=fn},body:{classList:{contains:()=>state.sorting}},querySelector:()=>state.calendar,activeElement:{matches:()=>state.editing},addEventListener:(type,fn)=>handlers[type]=fn};
  const host={busy:()=>state.busy,active:()=>state.active,preview:(next,progress)=>previews.push({next,progress}),release:commit=>releases.push(commit)};
  const context={};vm.createContext(context);vm.runInContext(source,context);
  context.bindTabSwipe(['home','beijing','next'],index,view,host);
  function event(type,x,y=200,options={}){
    const touch={identifier:1,clientX:x,clientY:y};
    const e={target:{closest:()=>!!options.control},touches:type==='touchend'?[]:[touch],changedTouches:[touch],cancelable:true,prevented:false,preventDefault(){this.prevented=true},...options};
    handlers[type](e);return e;
  }
  return {state,previews,releases,event,blur:()=>windowHandlers.blur()};
}
let s=setup();s.event('touchstart',280);assert.ok(s.event('touchmove',240).prevented);
const first=s.previews.at(-1).progress;assert.ok(first>0&&first<1);assert.equal(s.releases.length,0,'preview happens before release');
s.event('touchmove',150);assert.ok(s.previews.at(-1).progress>first,'progress follows distance');
s.event('touchmove',230);assert.ok(s.previews.at(-1).progress<.3,'reversing the finger reverses the transition');
s.event('touchend',140);assert.equal(s.previews.at(-1).next,1);assert.deepEqual(s.releases,[true]);
s=setup(1);s.event('touchstart',100);s.event('touchmove',230);s.event('touchend',230);assert.equal(s.previews.at(-1).next,0);assert.deepEqual(s.releases,[true]);
s=setup(1);s.event('touchstart',280);s.event('touchmove',150);s.event('touchend',140);assert.equal(s.previews.at(-1).next,2);
s=setup();s.event('touchstart',280);s.event('touchmove',245);s.event('touchend',245);assert.deepEqual(s.releases,[false],'short swipe rolls back');
for(const mode of ['vertical','edge','control','editing','sorting','calendar','busy','inactive']){
  s=setup();if(['editing','sorting','calendar','busy'].includes(mode))s.state[mode]=true;
  if(mode==='inactive')s.state.active=1;
  s.event('touchstart',mode==='edge'?5:280,200,{control:mode==='control'});
  if(mode==='vertical')assert.equal(s.event('touchmove',270,300).prevented,false);
  else s.event('touchmove',150);
  s.event('touchend',140);assert.equal(s.previews.length,0,mode+' must not start a transition');
}
for(const mode of ['cancel','blur','multi','sort-during-drag']){
  s=setup();s.event('touchstart',280);s.event('touchmove',150);
  if(mode==='cancel')s.event('touchcancel',150);
  if(mode==='blur')s.blur();
  if(mode==='multi')s.event('touchmove',150,200,{touches:[{},{}]});
  if(mode==='sort-during-drag'){s.state.sorting=true;s.event('touchmove',140)}
  s.event('touchend',140);assert.deepEqual(s.releases,[false],mode+' cancels preview');
}
s=setup();s.event('touchstart',280);s.event('touchmove',150);s.event('touchmove',350);s.event('touchend',350);assert.equal(s.previews.at(-1).next,null);assert.deepEqual(s.releases,[false]);
console.log('PASS: live finger progress, reversal, commit/rollback, both directions, future tabs, scroll/edit exclusions, cancellation, inactive pages and boundaries');
