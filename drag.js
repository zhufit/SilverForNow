function bindDrag(text,row,lane,item){
  let timer,active=false,tracking=false,startX,startY,lastY,frame,suppressClick=false;
  const list=()=>document.getElementById(lane);
  let ghost,offsetY=0,targetIndex=0,mouseCleanup=()=>{};
  function move(y){
    const rows=[...list().children],old=rows.indexOf(row);
    // Use layout offsets rather than animated bounds to prevent target jitter.
    targetIndex=0;
    for(const el of rows){if(el===row)continue;const rect=el.getBoundingClientRect();const shift=Number(el.dataset.dragShift||0);if(y>rect.top-shift+rect.height/2)targetIndex++}
    rows.forEach((el,i)=>{
      const shift=i>old&&i<=targetIndex?-row.offsetHeight:i<old&&i>=targetIndex?row.offsetHeight:0;
      el.dataset.dragShift=shift;el.style.transform=el===row?'':`translateY(${shift}px)`;
    });
    if(ghost)ghost.style.top=`${y-offsetY}px`;
  }
  function tick(){
    if(!active)return;
    const delta=lastY<70?-Math.min(12,(70-lastY)/5):lastY>innerHeight-70?Math.min(12,(lastY-innerHeight+70)/5):0;
    if(delta){window.scrollBy(0,delta);move(lastY)}
    frame=requestAnimationFrame(tick);
  }
  function begin(x,y){
    if(tracking)return;
    tracking=true;startX=x;startY=lastY=y;
    timer=setTimeout(()=>{
      if(!tracking)return;
      active=true;suppressClick=true;text.blur();text.readOnly=true;
      const rect=row.getBoundingClientRect();offsetY=startY-rect.top;targetIndex=[...list().children].indexOf(row);
      ghost=row.cloneNode(true);ghost.classList.add('drag-ghost');ghost.setAttribute('aria-hidden','true');ghost.querySelectorAll('button,textarea').forEach(el=>el.tabIndex=-1);
      Object.assign(ghost.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});document.body.append(ghost);
      document.body.classList.add('sorting');window.getSelection()?.removeAllRanges();
      row.classList.add('dragging');status.textContent='拖动调整顺序，松手保存';tick();
    },420);
  }
  function update(x,y){
    if(!tracking)return;
    lastY=y;
    if(active)move(y);
    else if(Math.hypot(x-startX,y-startY)>10)clearTimeout(timer);
  }
  function finish(commit){
    clearTimeout(timer);cancelAnimationFrame(frame);tracking=false;mouseCleanup();
    if(!active)return;
    active=false;text.readOnly=false;row.classList.remove('dragging');
    document.body.classList.remove('sorting');ghost?.remove();ghost=null;
    list().querySelectorAll('.card').forEach(el=>{el.style.transform='';delete el.dataset.dragShift});
    if(commit){const old=data[lane].indexOf(item);data[lane].splice(old,1);data[lane].splice(targetIndex,0,item);save()}
    render();
    if(commit){const placed=list().children[targetIndex];placed?.classList.add('just-dropped');setTimeout(()=>placed?.classList.remove('just-dropped'),450)}
  }
  text.addEventListener('touchstart',e=>{if(e.touches.length===1)begin(e.touches[0].clientX,e.touches[0].clientY);else finish(false)},{passive:true});
  text.addEventListener('touchmove',e=>{if(active)e.preventDefault();if(e.touches.length===1)update(e.touches[0].clientX,e.touches[0].clientY)},{passive:false});
  text.addEventListener('touchend',e=>{if(active)e.preventDefault();finish(true)},{passive:false});
  text.addEventListener('touchcancel',()=>finish(false));
  text.addEventListener('pointerdown',e=>{
    if(e.pointerType==='touch'||e.button!==0)return;
    // Prevent the textarea's native text-selection gesture from taking over.
    // A short release restores normal editing; a hold starts sorting.
    e.preventDefault();
    begin(e.clientX,e.clientY);
    const onMove=event=>{if(active)event.preventDefault();update(event.clientX,event.clientY)};
    const onUp=()=>{const wasDragging=active;finish(true);if(!wasDragging){text.focus();text.setSelectionRange(text.value.length,text.value.length)}};
    const onCancel=()=>finish(false);
    document.addEventListener('pointermove',onMove,true);document.addEventListener('pointerup',onUp,true);document.addEventListener('pointercancel',onCancel,true);window.addEventListener('blur',onCancel);
    mouseCleanup=()=>{document.removeEventListener('pointermove',onMove,true);document.removeEventListener('pointerup',onUp,true);document.removeEventListener('pointercancel',onCancel,true);window.removeEventListener('blur',onCancel)};
  });
  text.addEventListener('dragstart',e=>e.preventDefault());
  text.addEventListener('click',e=>{if(suppressClick){e.preventDefault();suppressClick=false}});
  text.addEventListener('contextmenu',e=>{if(tracking||active)e.preventDefault()});
  text.addEventListener('keydown',e=>{
    if(e.key==='Escape'){finish(false);return}
    if(!e.altKey||!['ArrowUp','ArrowDown'].includes(e.key))return;
    e.preventDefault();const old=data[lane].indexOf(item),next=old+(e.key==='ArrowUp'?-1:1);
    if(next<0||next>=data[lane].length)return;
    [data[lane][old],data[lane][next]]=[data[lane][next],data[lane][old]];
    save();render();list().children[next].querySelector('.title').focus();
  });
  text.title='轻点编辑，长按拖动排序';
  text.setAttribute('aria-label','事项标题；轻点编辑，长按排序，键盘 Alt 加上下方向键排序');
}
