(()=>{
  if(window.JLiveScreen)return;
  const style=document.createElement('style');
  style.textContent=`
    .jLiveLayer{position:absolute;inset:0;z-index:18;pointer-events:none;overflow:hidden}
    .jFloat{position:absolute;width:min(560px,70vw);height:min(360px,56vh);left:50%;top:50%;transform:translate(-50%,-50%) scale(.72);opacity:0;border:1px solid #ffffff30;border-radius:20px;background:linear-gradient(145deg,#0b0b0bf5,#020202f8);box-shadow:0 24px 90px #000,0 0 42px #ffffff13;backdrop-filter:blur(24px);overflow:hidden;pointer-events:auto;transition:.35s cubic-bezier(.2,.9,.2,1)}
    .jFloat.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
    .jFloatHead{height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;border-bottom:1px solid #ffffff14;cursor:grab}
    .jFloatHead b{font-size:10px;letter-spacing:.16em}.jFloatHead span{font-size:9px;color:#8e8e8e}.jFloatClose{border:1px solid #ffffff20;background:#ffffff08;color:#fff;border-radius:999px;width:28px;height:28px}
    .jFloatBody{height:calc(100% - 48px);position:relative;background:#000}.jFloatBody video,.jFloatBody iframe{width:100%;height:100%;border:0;background:#000;object-fit:contain}
    .jPanel{padding:16px;height:100%;overflow:auto}.jPanel h3{margin:0 0 12px;font-size:12px;letter-spacing:.12em}.jCard{border:1px solid #ffffff16;border-radius:12px;padding:11px;margin-bottom:8px;background:#ffffff05}.jCard .k{font-size:8px;color:#777;letter-spacing:.12em}.jCard .v{font-size:14px;font-weight:700;margin-top:4px}.jLiveChip{position:absolute;left:50%;bottom:122px;transform:translateX(-50%);z-index:17;padding:7px 12px;border:1px solid #ffffff22;border-radius:999px;background:#080808cc;color:#aaa;font-size:9px;letter-spacing:.14em;opacity:.72;pointer-events:none}
    .stage.jWindowActive .orbWrap{transform:scale(.82);filter:blur(.2px) drop-shadow(0 0 32px #ffffff3a)}
    .stage.jWindowActive .orbHalo{opacity:.28;transform:scale(1.25)}
    @media(max-width:700px){.jFloat{width:88vw;height:56vh}}
  `;
  document.head.appendChild(style);

  const stage=document.getElementById('stage')||document.body;
  const layer=document.createElement('div'); layer.className='jLiveLayer'; layer.id='jLiveLayer'; stage.appendChild(layer);
  const chip=document.createElement('div'); chip.className='jLiveChip'; chip.textContent='J LIVE CANVAS'; stage.appendChild(chip);
  let z=30, active=[];

  function drag(win,head){let sx=0,sy=0,sl=0,st=0,dragging=false;head.addEventListener('mousedown',e=>{dragging=true;sx=e.clientX;sy=e.clientY;const r=win.getBoundingClientRect();sl=r.left;st=r.top;win.style.transform='none';win.style.left=sl+'px';win.style.top=st+'px';win.style.zIndex=++z;e.preventDefault()});window.addEventListener('mousemove',e=>{if(!dragging)return;win.style.left=(sl+e.clientX-sx)+'px';win.style.top=(st+e.clientY-sy)+'px'});window.addEventListener('mouseup',()=>dragging=false)}
  function close(win){win.classList.remove('on');setTimeout(()=>{win.remove();active=active.filter(x=>x!==win);if(!active.length)stage.classList.remove('jWindowActive')},260)}
  function make(title,subtitle='LIVE'){
    const win=document.createElement('section');win.className='jFloat';win.style.zIndex=++z;
    win.innerHTML=`<div class="jFloatHead"><div><b>${title}</b><span style="margin-left:10px">${subtitle}</span></div><button class="jFloatClose">×</button></div><div class="jFloatBody"></div>`;
    layer.appendChild(win);active.push(win);stage.classList.add('jWindowActive');
    const head=win.querySelector('.jFloatHead');drag(win,head);win.querySelector('.jFloatClose').onclick=()=>close(win);win.addEventListener('mousedown',()=>win.style.zIndex=++z);
    requestAnimationFrame(()=>win.classList.add('on'));return win;
  }
  function openVideo(src,title='LATEST EDIT'){
    document.getElementById('workspace')?.closest('.workspaceOpen')?.classList?.remove('workspaceOpen');
    const win=make('J VIDEO',title);const body=win.querySelector('.jFloatBody');const v=document.createElement('video');v.controls=true;v.playsInline=true;v.autoplay=true;v.src=src||'http://localhost:8765/latest-video?t='+Date.now();body.appendChild(v);v.play().catch(()=>{});return win;
  }
  function openWeb(url,title='WEB'){
    const win=make('J BROWSER',title);const f=document.createElement('iframe');f.src=url;f.referrerPolicy='no-referrer';win.querySelector('.jFloatBody').appendChild(f);return win;
  }
  function openPanel(title,cards=[]){
    const win=make('J LIVE',title);const p=document.createElement('div');p.className='jPanel';p.innerHTML=`<h3>${title}</h3>`+cards.map(c=>`<div class="jCard"><div class="k">${c.k||''}</div><div class="v">${c.v||''}</div>${c.s?`<div style="font-size:9px;color:#888;margin-top:5px">${c.s}</div>`:''}</div>`).join('');win.querySelector('.jFloatBody').appendChild(p);return win;
  }
  function openEdit(){return openVideo('http://localhost:8765/latest-video?t='+Date.now(),'MV CHAOS V2')}
  function closeAll(){[...active].forEach(close)}

  function route(text){
    const t=String(text||'').toLowerCase();
    if(/\b(close|hide|dismiss|put away)\b/.test(t)&&/\b(window|screen|edit|video|panel|everything)\b/.test(t)){closeAll();return true}
    if(/\b(show|pull up|open|let me see|play)\b/.test(t)&&/\b(edit|render|video|cut)\b/.test(t)){openEdit();return true}
    if(/\b(show|pull up|open)\b/.test(t)&&/\b(stock|market|stocks)\b/.test(t)){openPanel('MARKET RADAR',[{k:'STATUS',v:'J STOCK RADAR ACTIVE',s:'Live alerts will appear here.'},{k:'MODE',v:'RESEARCH + APPROVAL',s:'No automatic trades.'}]);return true}
    if(/\b(show|pull up|open)\b/.test(t)&&/\b(leads|business|businesses)\b/.test(t)){openPanel('BUSINESS LEADS',[{k:'LEAD ENGINE',v:'DALLAS + PELL CITY',s:'Verified no-site / weak-site prospects.'},{k:'OUTREACH',v:'PHONE · DM · CONTACT FORM',s:'Email is optional.'}]);return true}
    return false;
  }

  window.addEventListener('j-command',e=>route(JSON.stringify(e.detail||'')));
  window.addEventListener('j-task-start',e=>route(JSON.stringify(e.detail||'')));
  window.addEventListener('message',e=>{const d=e.data||{};if(d?.type==='j-live-open'){if(d.kind==='video')openVideo(d.src,d.title);if(d.kind==='web')openWeb(d.url,d.title);if(d.kind==='panel')openPanel(d.title,d.cards||[])}});

  const oldAsk=window.ask;
  if(typeof oldAsk==='function'&&!oldAsk.__jLive){const wrapped=async function(text){if(route(text)){window.speak?.('Got it.',{continueConversation:true});return;}return oldAsk(text)};wrapped.__jLive=true;window.ask=wrapped;if(window.JConversation)window.JConversation.ask=wrapped;}

  window.JLiveScreen={make,openVideo,openWeb,openPanel,openEdit,closeAll,route};
})();
