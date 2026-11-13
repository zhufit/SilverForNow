// Browser-local edits remain usable when the shared server is unreachable.
(()=>{
  if(location.protocol==='file:')return;
  const metaKey=journalConfig.syncKey;
  const endpoint=journalConfig.endpoint;
  let meta={dirty:false},busy=false,timer,edit=0;
  try{meta=Object.assign(meta,JSON.parse(localStorage.getItem(metaKey)||'{}'))}catch{}
  const bar=document.createElement('div');bar.className='sync-bar';
  const message=document.createElement('span');message.textContent='正在连接共享事项…';message.setAttribute('role','status');
  const retry=document.createElement('button');retry.textContent='同步';retry.type='button';
  bar.append(message,retry);document.getElementById('journey').append(bar);
  const persist=()=>{try{localStorage.setItem(metaKey,JSON.stringify(meta))}catch{message.textContent='本地存储不可用，请勿关闭页面'}};
  const localSave=save;
  save=function(){localSave();edit++;meta.dirty=true;persist();message.textContent=navigator.onLine?'修改待同步':'离线编辑中';clearTimeout(timer);timer=setTimeout(sync,700)};
  function apply(remote){const position=scrollY;data=remote.data;localSave();meta.dirty=false;persist();render();scrollTo({top:position,behavior:'instant'})}
  async function sync(){
    if(busy)return;
    busy=true;
    try{
      const response=await fetch(endpoint,{cache:'no-store'});
      if(!response.ok)throw Error('连接失败');
      const remote=await response.json();
      if(remote.data!==null&&!valid(remote.data))throw Error('服务器数据无效');
      if(!meta.dirty&&remote.data){
        if(JSON.stringify(data)!==JSON.stringify(remote.data))apply(remote);
        message.textContent='已与服务器同步';return;
      }
      if(!remote.data){meta.dirty=true;persist()}
      if(meta.dirty){
        const version=edit;
        const result=await fetch(endpoint,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data})});
        if(!result.ok)throw Error('保存失败');
        meta.dirty=edit!==version;persist();
        message.textContent=meta.dirty?'修改待同步':'已保存到服务器';
        if(meta.dirty)timer=setTimeout(sync,700);
      }
    }catch{message.textContent=meta.dirty?'未连接服务器 · 修改保留在本机':'未连接服务器 · 使用本机内容'}
    finally{busy=false}
  }
  retry.onclick=sync;addEventListener('online',sync);addEventListener('focus',()=>{if(!document.querySelector('.title:focus,.item-details:focus,.calendar-popover')&&!document.body.classList.contains('sorting'))sync()});
  setInterval(()=>{if(!document.hidden&&!document.querySelector('textarea:focus,.calendar-popover')&&!document.body.classList.contains('sorting'))sync()},30000);
  sync();
})();
