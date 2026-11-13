function createCalendar(item,onChange){
  const button=document.createElement('button');button.type='button';button.className='item-date calendar-trigger';button.setAttribute('aria-label','选择事项日期');button.setAttribute('aria-haspopup','dialog');
  function label(){button.textContent=item.date?item.date.replaceAll('-',' / '):'选择日期';button.setAttribute('aria-label',item.date?'日期 '+item.date+'，点击修改':'选择事项日期')}
  label();
  let closeCurrent=null;
  button.onclick=()=>{
    if(closeCurrent){closeCurrent(true);return}
    document.querySelector('.calendar-popover')?.dispatchEvent(new Event('calendar-close'));
    let selected=/^\d{4}-\d{2}-\d{2}$/.test(item.date||'')?new Date(item.date+'T12:00:00'):new Date();
    if(Number.isNaN(selected.getTime()))selected=new Date();
    let year=selected.getFullYear(),month=selected.getMonth(),choosingMonth=false,animateGrid=false;
    const overlay=document.createElement('div');overlay.className='calendar-popover';
    const panel=document.createElement('div');panel.className='calendar-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','选择日期');
    button.setAttribute('aria-expanded','true');
    let closing=false,onScroll=()=>{};
    const onOutside=e=>{if(!overlay.contains(e.target)&&e.target!==button)close(false)};
    const close=(restoreFocus=false)=>{if(closing)return;closing=true;document.removeEventListener('pointerdown',onOutside,true);removeEventListener('scroll',onScroll,true);removeEventListener('resize',onScroll);button.setAttribute('aria-expanded','false');closeCurrent=null;overlay.remove();if(restoreFocus)button.focus({preventScroll:true})};
    closeCurrent=close;overlay.addEventListener('calendar-close',()=>close(false));
    function redraw(){
      panel.replaceChildren();
      const header=document.createElement('div');header.className='calendar-header';
      const prev=document.createElement('button');prev.type='button';prev.textContent='‹';prev.setAttribute('aria-label',choosingMonth?'上一年':'上个月');prev.onclick=()=>{if(choosingMonth)year=Math.max(1,year-1);else if(month===0){if(year>1){month=11;year--}}else month--;animateGrid=true;redraw()};
      const heading=document.createElement('div');heading.className='calendar-heading';
      const yearInput=document.createElement('input');yearInput.type='number';yearInput.min='1';yearInput.max='9999';yearInput.value=year;yearInput.setAttribute('aria-label','年份');
      yearInput.onchange=()=>{const n=Number(yearInput.value);if(Number.isInteger(n)&&n>=1&&n<=9999){year=n;redraw()}else yearInput.value=year};
      const yearSuffix=document.createElement('span');yearSuffix.textContent='年';
      const monthSelect=document.createElement('button');monthSelect.type='button';monthSelect.className='calendar-month-trigger';monthSelect.textContent=(month+1)+'月';monthSelect.setAttribute('aria-label','选择月份');monthSelect.setAttribute('aria-expanded',String(choosingMonth));
      monthSelect.onclick=()=>{choosingMonth=!choosingMonth;animateGrid=true;redraw();panel.querySelector('.calendar-month-trigger').focus()};
      heading.append(yearInput,yearSuffix,monthSelect);
      const next=document.createElement('button');next.type='button';next.textContent='›';next.setAttribute('aria-label',choosingMonth?'下一年':'下个月');next.onclick=()=>{if(choosingMonth)year=Math.min(9999,year+1);else if(month===11){if(year<9999){month=0;year++}}else month++;animateGrid=true;redraw()};
      header.append(prev,heading,next);panel.append(header);
      if(choosingMonth){
        const months=document.createElement('div');months.className='calendar-months calendar-changing';months.setAttribute('aria-label','选择月份');
        for(let i=0;i<12;i++){const b=document.createElement('button');b.type='button';b.textContent=(i+1)+'月';if(i===month){b.classList.add('selected');b.setAttribute('aria-current','true')}b.onclick=()=>{month=i;choosingMonth=false;animateGrid=true;redraw();panel.querySelector('.calendar-month-trigger').focus()};months.append(b)}
        panel.append(months);return;
      }
      const grid=document.createElement('div');grid.className='calendar-grid';
      if(animateGrid){grid.classList.add('calendar-changing');animateGrid=false}
      for(const day of ['日','一','二','三','四','五','六']){const name=document.createElement('span');name.className='calendar-weekday';name.textContent=day;grid.append(name)}
      const first=new Date(0);first.setFullYear(year,month,1);first.setHours(12,0,0,0);
      const last=new Date(first);last.setMonth(month+1,0);
      for(let i=0;i<first.getDay();i++)grid.append(document.createElement('span'));
      const today=new Date();
      for(let day=1;day<=last.getDate();day++){
        const value=String(year).padStart(4,'0')+'-'+String(month+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
        const b=document.createElement('button');b.type='button';b.textContent=day;b.setAttribute('aria-label',year+'年'+(month+1)+'月'+day+'日');
        if(value===item.date){b.classList.add('selected');b.setAttribute('aria-current','date')}
        if(today.getFullYear()===year&&today.getMonth()===month&&today.getDate()===day)b.classList.add('today');
        b.onclick=()=>{item.date=value;label();onChange();close(true)};grid.append(b);
      }
      panel.append(grid);
      const footer=document.createElement('div');footer.className='calendar-footer';
      const clear=document.createElement('button');clear.type='button';clear.textContent='清空';clear.onclick=()=>{item.date='';label();onChange();close(true)};
      const cancel=document.createElement('button');cancel.type='button';cancel.textContent='关闭';cancel.onclick=()=>close(true);
      footer.append(clear,cancel);panel.append(footer);
    }
    overlay.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close(true)}};
    redraw();overlay.append(panel);document.body.append(overlay);
    const position=()=>{
      const anchor=button.getBoundingClientRect(),gap=8,margin=12;
      const width=overlay.offsetWidth,height=overlay.offsetHeight;
      const left=Math.max(margin,Math.min(anchor.left,innerWidth-width-margin));
      const below=innerHeight-anchor.bottom;
      const top=below>=height+gap||anchor.top<height+gap?Math.min(anchor.bottom+gap,Math.max(margin,innerHeight-height-margin)):anchor.top-height-gap;
      overlay.style.left=left+'px';overlay.style.top=Math.max(margin,top)+'px';
    };
    position();
    onScroll=()=>{if(button.isConnected)position();else close(false)};
    addEventListener('scroll',onScroll,true);addEventListener('resize',onScroll);
    document.addEventListener('pointerdown',onOutside,true);
  };
  return button;
}
