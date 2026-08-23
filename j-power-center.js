(()=>{
  if(window.JPowerCenter)return;
  const style=document.createElement('style');
  style.textContent=`
  .jPowerStrip{position:absolute;left:24px;right:24px;top:78px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;z-index:3;pointer-events:none}
  .jPowerChip{border:1px solid #78e8ff1f;border-radius:12px;background:#061017cc;padding:8px 10px;box-shadow:inset 0 0 18px #63e6ff06;min-width:0}
  .jPowerChip .k{font-size:7px;letter-spacing:.16em;color:#6fcfe4}.jPowerChip .v{font-size:10px;font-weight:700;color:#e9fbff;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .jPowerDeck{position:absolute;left:24px;right:24px;bottom:18px;display:grid;grid-template-columns:repeat(5,1fr);gap:8px;z-index:4}
  .jPowerBtn{border:1px solid #78e8ff24;background:linear-gradient(180deg,#0a1821,#061017);color:#dffaff;border-radius:12px;padding:10px 8px;font-size:9px;letter-spacing:.08em;cursor:pointer;box-shadow:inset 0 0 18px #70e6ff07;transition:.18s}
  .jPowerBtn:hover{transform:translateY(-1px);border-color:#78e8ff66;box-shadow:0 0 22px #4fdcff13,inset 0 0 22px #70e6ff0c}
  .jCmd{position:fixed;z-index:90;left:50%;top:18%;transform:translateX(-50%) scale(.95);width:min(620px,88vw);border:1px solid #78e8ff40;border-radius:18px;background:#041018f7;box-shadow:0 30px 100px #000,0 0 50px #5ae0ff1c;opacity:0;pointer-events:none;transition:.18s;overflow:hidden}
  .jCmd.on{opacity:1;pointer-events:auto;transform:translateX(-50%) scale(1)}
  .jCmd input{width:100%;border:0;outline:0;background:#08141d;color:#fff;padding:18px 18px;font-size:16px;border-bottom:1px solid #78e8ff20}
  .jCmdHints{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;padding:12px}.jCmdHint{border:1px solid #78e8ff18;border-radius:10px;padding:9px;color:#9fdff0;font-size:9px;background:#ffffff03}
  @media(max-width:850px){.jPowerStrip{grid-template-columns:repeat(3,1fr);top:76px}.jPowerChip:nth-child(n+4){display:none}.jPowerDeck{grid-template-columns:repeat(3,1fr)}.jPowerBtn:nth-child(n+4){display:none}}
  `;document.head.appendChild(style);
  let cmd=null,healthCache=null;
  function dash(){return document.querySelector('.jDash')}
  async function getHealth(){try{const r=await fetch('/api/health?t='+Date.now(),{cache:'no-store'});healthCache=await r.json()}catch{healthCache={ok:false,services:{}}}return healthCache}
  function taskCount(){const s=window.JSharedState?.snapshot?.()||{tasks:[]};return (s.tasks||[]).filter(t=>t.status!=='done').length}
  function render(){const d=dash();if(!d||d.dataset.power==='1')return;d.dataset.power='1';const strip=document.createElement('div');strip.className='jPowerStrip';strip.innerHTML=`
    <div class="jPowerChip"><div class="k">CORE</div><div class="v" data-p-core>CHECKING</div></div>
    <div class="jPowerChip"><div class="k">MARKETS</div><div class="v" data-p-market>RADAR ACTIVE</div></div>
    <div class="jPowerChip"><div class="k">TASKS</div><div class="v" data-p-tasks>${taskCount()} OPEN</div></div>
    <div class="jPowerChip"><div class="k">EDITOR</div><div class="v">LOCAL BRIDGE</div></div>
    <div class="jPowerChip"><div class="k">TIME</div><div class="v" data-p-clock>--:--</div></div>`;
    d.appendChild(strip);
    const deck=document.createElement('div');deck.className='jPowerDeck';deck.innerHTML=`<button class="jPowerBtn" data-p="stocks">STOCKS</button><button class="jPowerBtn" data-p="leads">LEADS</button><button class="jPowerBtn" data-p="edit">EDITOR</button><button class="jPowerBtn" data-p="system">SYSTEM</button><button class="jPowerBtn" data-p="command">ASK J</button>`;d.appendChild(deck);
    deck.addEventListener('click',e=>{const b=e.target.closest('[data-p]');if(!b)return;action(b.dataset.p)});
    update();
  }
  async function update(){const d=dash();if(!d)return;const h=await getHealth();const core=d.querySelector('[data-p-core]');if(core)core.textContent=h?.ok?'ONLINE':'CHECK';const t=d.querySelector('[data-p-tasks]');if(t)t.textContent=taskCount()+' OPEN';const m=d.querySelector('[data-p-market]');if(m)m.textContent=window.JLiveStocks?.data?.quotes?.length?window.JLiveStocks.data.quotes.length+' QUOTES':'RADAR ACTIVE';const c=d.querySelector('[data-p-clock]');if(c)c.textContent=new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});}
  function action(x){if(x==='stocks')return window.JLiveScreen?.route?.('show stocks');if(x==='leads')return window.JLiveScreen?.route?.('show leads');if(x==='edit')return window.JLiveScreen?.openEdit?.();if(x==='system')return openSystem();if(x==='command')return openCommand()}
  async function openSystem(){const h=await getHealth();const cards=[{k:'CORE',v:h?.ok?'ONLINE':'CHECK REQUIRED',s:'Live health endpoint'},{k:'TASKS',v:taskCount()+' OPEN',s:'Synced J tasks'},{k:'MARKET FEED',v:window.JLiveStocks?.data?.quotes?.length?'CONNECTED':'WAITING',s:'Live quote module'},{k:'DEVICE MODE',v:'CROSS-DEVICE',s:'Mac now · iPad/phone next'}];window.JLiveScreen?.openPanel?.('J SYSTEM STATUS',cards)}
  function ensureCmd(){if(cmd)return cmd;cmd=document.createElement('div');cmd.className='jCmd';cmd.innerHTML='<input placeholder="Tell J what to open or do…"><div class="jCmdHints"><div class="jCmdHint">show stocks</div><div class="jCmdHint">show leads</div><div class="jCmdHint">open the edit</div><div class="jCmdHint">show system status</div></div>';document.body.appendChild(cmd);const input=cmd.querySelector('input');input.addEventListener('keydown',e=>{if(e.key==='Enter'&&input.value.trim()){const q=input.value.trim();cmd.classList.remove('on');if(!window.JLiveScreen?.route?.(q))window.ask?.(q);input.value=''}if(e.key==='Escape')cmd.classList.remove('on')});cmd.addEventListener('click',e=>{if(e.target.classList.contains('jCmdHint')){input.value=e.target.textContent;input.focus()}});return cmd}
  function openCommand(){const c=ensureCmd();c.classList.add('on');setTimeout(()=>c.querySelector('input')?.focus(),30)}
  document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCommand()}if(e.key==='Escape'&&cmd?.classList.contains('on'))cmd.classList.remove('on')});
  const obs=new MutationObserver(()=>{render();if(dash())update()});obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  setInterval(()=>{if(dash())update()},15000);
  window.JPowerCenter={render,update,openCommand,openSystem};
})();