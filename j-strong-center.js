(()=>{
  if(window.JStrongCenter)return;
  const style=document.createElement('style');
  style.textContent=`
  .jStrongRail{position:absolute;right:18px;top:124px;bottom:74px;width:172px;z-index:5;display:grid;grid-template-rows:auto auto 1fr;gap:9px;pointer-events:none}
  .jStrongCard{border:1px solid #79e9ff2b;border-radius:15px;background:linear-gradient(145deg,#08151ddd,#04080cdf);box-shadow:inset 0 0 24px #5de2ff08,0 12px 35px #0008;padding:11px;pointer-events:auto;overflow:hidden}
  .jStrongCard .k{font-size:7px;letter-spacing:.18em;color:#6fdcf2}.jStrongCard .v{font-size:18px;font-weight:800;margin-top:5px;color:#f1fcff;text-shadow:0 0 16px #6ceaff35}.jStrongCard .s{font-size:8px;color:#8299a5;line-height:1.45;margin-top:4px}
  .jMoneyGoal{display:flex;align-items:end;justify-content:space-between;gap:8px}.jMoneyGoal small{font-size:8px;color:#7cecff;letter-spacing:.12em}.jMoneyBar{height:5px;background:#ffffff0d;border-radius:20px;margin-top:9px;overflow:hidden}.jMoneyBar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#55d9ff,#73ffa7);box-shadow:0 0 12px #69e9ff;transition:.45s}
  .jMiniList{display:grid;gap:6px;margin-top:7px}.jMiniRow{display:flex;justify-content:space-between;gap:8px;border-top:1px solid #78e8ff11;padding-top:6px;font-size:8px;color:#9db2bc}.jMiniRow b{color:#e9fbff}
  .jStrongActions{position:absolute;left:24px;bottom:68px;display:flex;gap:7px;z-index:5}.jStrongAction{border:1px solid #78e8ff28;background:#07131bdc;color:#bfefff;border-radius:999px;padding:7px 10px;font-size:8px;letter-spacing:.1em;cursor:pointer}.jStrongAction:hover{border-color:#78e8ff66;box-shadow:0 0 20px #55dfff15}
  .jBrief{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) scale(.94);width:min(760px,88vw);max-height:76vh;overflow:auto;z-index:100;border:1px solid #79e9ff44;border-radius:24px;background:radial-gradient(circle at 50% 0,#0c2633,#04090df7 36%,#020406fb);box-shadow:0 35px 120px #000,0 0 60px #62e4ff1c;opacity:0;pointer-events:none;transition:.2s}.jBrief.on{opacity:1;pointer-events:auto;transform:translate(-50%,-50%) scale(1)}
  .jBriefHead{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid #78e8ff1c}.jBriefHead b{font-size:13px;letter-spacing:.18em}.jBriefHead button{width:30px;height:30px;border-radius:50%;border:1px solid #78e8ff22;background:#ffffff06;color:#fff}.jBriefBody{padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:10px}.jBriefBox{border:1px solid #78e8ff18;border-radius:15px;background:#ffffff04;padding:12px}.jBriefBox h4{margin:0 0 8px;font-size:9px;letter-spacing:.15em;color:#73e5ff}.jBriefBox .big{font-size:22px}.jBriefBox .muted{font-size:9px;color:#8aa0ab;line-height:1.5}
  .jSyncDot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#73ffa7;box-shadow:0 0 10px #73ffa7;margin-right:5px}
  @media(max-width:1000px){.jStrongRail{display:none}.jStrongActions{left:18px;right:18px;overflow:auto}.jBriefBody{grid-template-columns:1fr}}
  `;document.head.appendChild(style);

  let brief=null;
  const MONEY_TARGET=2000;
  function dash(){return document.querySelector('.jDash')}
  function snap(){return window.JSharedState?.snapshot?.()||{tasks:[],events:[]}}
  function tasks(){return (snap().tasks||[]).filter(t=>t.status!=='done')}
  function events(){return (snap().events||[]).slice(-8).reverse()}
  function quotes(){return window.JLiveStocks?.data?.quotes||[]}
  function leadEvents(){return events().filter(e=>/lead|business|website|prospect/i.test(JSON.stringify(e))).slice(0,4)}
  function fmtMoney(n){return '$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0})}
  function moneyState(){let current=0;try{current=Number(localStorage.getItem('j_money_progress')||0)}catch{};return{current,target:MONEY_TARGET}}
  function render(){const d=dash();if(!d||d.dataset.strong==='1')return;d.dataset.strong='1';
    const rail=document.createElement('aside');rail.className='jStrongRail';rail.innerHTML=`
      <div class="jStrongCard" data-j-money><div class="k">J MONEY</div><div class="jMoneyGoal"><div class="v">${fmtMoney(MONEY_TARGET)}</div><small>GOAL</small></div><div class="s">Income target dashboard. Real balances stay separate until an account is connected.</div><div class="jMoneyBar"><i></i></div></div>
      <div class="jStrongCard"><div class="k">DEVICE MESH</div><div class="v" style="font-size:12px"><span class="jSyncDot"></span>SYNC READY</div><div class="s">Mac live screen · iPad/phone shared-state ready.</div></div>
      <div class="jStrongCard"><div class="k">J ALERT CENTER</div><div class="jMiniList" data-j-alerts></div></div>`;
    d.appendChild(rail);
    const actions=document.createElement('div');actions.className='jStrongActions';actions.innerHTML=`<button class="jStrongAction" data-jx="brief">MORNING BRIEF</button><button class="jStrongAction" data-jx="money">MONEY</button><button class="jStrongAction" data-jx="notify">ALERTS</button><button class="jStrongAction" data-jx="calendar">CALENDAR</button><button class="jStrongAction" data-jx="inbox">INBOX</button><button class="jStrongAction" data-jx="devices">DEVICES</button>`;d.appendChild(actions);
    actions.addEventListener('click',e=>{const b=e.target.closest('[data-jx]');if(b)action(b.dataset.jx)});
    update();
  }
  function update(){const d=dash();if(!d)return;const ms=moneyState();const bar=d.querySelector('.jMoneyBar i');if(bar)bar.style.width=Math.min(100,(ms.current/ms.target)*100)+'%';const a=d.querySelector('[data-j-alerts]');if(a){const ev=events().slice(0,4);a.innerHTML=ev.length?ev.map(x=>`<div class="jMiniRow"><span>${String(x.type||x.kind||'UPDATE').toUpperCase().slice(0,15)}</span><b>NEW</b></div>`).join(''):'<div class="s">No new synced alerts.</div>'}}
  function panel(title,cards){return window.JLiveScreen?.openPanel?.(title,cards)}
  function action(x){
    if(x==='brief')return openBrief();
    if(x==='money'){const ms=moneyState();return panel('J MONEY CENTER',[{k:'INCOME GOAL',v:fmtMoney(ms.target),s:'Your selected J money target.'},{k:'TRACKED PROGRESS',v:fmtMoney(ms.current),s:'Manual/shared-state progress only — not a bank balance.'},{k:'MONEY LANES',v:'STOCKS · LEADS · SERVICES',s:'J monitors opportunities; purchases/trades still require approval.'}])}
    if(x==='notify'){const ev=events();return panel('J NOTIFICATIONS',ev.length?ev.slice(0,6).map(e=>({k:String(e.type||e.kind||'UPDATE').toUpperCase(),v:String(e.text||e.message||'J activity').slice(0,55),s:e.createdAt||e.at||''})):[{k:'STATUS',v:'ALL CLEAR',s:'No synced alerts right now.'}])}
    if(x==='calendar')return panel('J CALENDAR',[{k:'CALENDAR BRIDGE',v:'READY TO CONNECT',s:'UI is installed. Live calendar data requires the account bridge.'},{k:'TODAY',v:'BRIEFING READY',s:'Once connected, J can surface meetings and deadlines here.'}]);
    if(x==='inbox')return panel('J INBOX',[{k:'EMAIL BRIDGE',v:'READY TO CONNECT',s:'The live inbox surface is installed; real Gmail data requires the account bridge.'},{k:'PRIORITY MODE',v:'ON',s:'J will separate important mail from noise when connected.'}]);
    if(x==='devices')return panel('J DEVICE MESH',[{k:'MAC',v:'LIVE SCREEN',s:'Primary workstation.'},{k:'IPAD',v:'SECOND SCREEN READY',s:'Uses shared-state/cross-device view.'},{k:'PHONE',v:'ALWAYS-ON RELAY READY',s:'Can become J’s mobile surface.'},{k:'GLASSES',v:'VOICE/VISUAL TARGET',s:'Device-specific integration remains separate.'}]);
  }
  function openBrief(){if(!brief){brief=document.createElement('section');brief.className='jBrief';brief.innerHTML='<div class="jBriefHead"><b>J MORNING BRIEFING</b><button>×</button></div><div class="jBriefBody"></div>';document.body.appendChild(brief);brief.querySelector('button').onclick=()=>brief.classList.remove('on')}const q=quotes(),t=tasks(),l=leadEvents(),top=q.slice().sort((a,b)=>(b.changePct||0)-(a.changePct||0)).slice(0,3);brief.querySelector('.jBriefBody').innerHTML=`
    <div class="jBriefBox"><h4>MONEY TARGET</h4><div class="big">${fmtMoney(MONEY_TARGET)}</div><div class="muted">J’s current income goal. This is a target, not a connected account balance.</div></div>
    <div class="jBriefBox"><h4>MARKET RADAR</h4><div class="big">${q.length} LIVE</div><div class="muted">${top.length?top.map(x=>`${x.symbol} ${Number(x.changePct||0)>=0?'+':''}${Number(x.changePct||0).toFixed(2)}%`).join(' · '):'Waiting for live quotes.'}</div></div>
    <div class="jBriefBox"><h4>OPEN TASKS</h4><div class="big">${t.length}</div><div class="muted">${t.slice(0,3).map(x=>String(x.text||'Task')).join(' · ')||'No synced open tasks.'}</div></div>
    <div class="jBriefBox"><h4>LEAD PIPELINE</h4><div class="big">${l.length}</div><div class="muted">${l.length?'Recent lead activity found in shared state.':'Lead engines are ready; verified prospects will surface here.'}</div></div>
    <div class="jBriefBox"><h4>INBOX</h4><div class="big">BRIDGE READY</div><div class="muted">Live Gmail cards are installed at the UI layer; account data connection still needs the secure bridge.</div></div>
    <div class="jBriefBox"><h4>CALENDAR + DEVICES</h4><div class="big">READY</div><div class="muted">Cross-device panel is active. Calendar data will populate after secure account connection.</div></div>`;brief.classList.add('on')}
  function route(text){const t=String(text||'').toLowerCase();if(/money|wallet|balance/.test(t)){action('money');return true}if(/morning brief|briefing|daily brief/.test(t)){action('brief');return true}if(/notification|alerts/.test(t)){action('notify');return true}if(/calendar|schedule/.test(t)){action('calendar');return true}if(/inbox|email/.test(t)){action('inbox');return true}if(/ipad|phone|device|glasses/.test(t)){action('devices');return true}return false}
  const oldRoute=window.JLiveScreen?.route;function hook(){if(!window.JLiveScreen||window.JLiveScreen.__strongHook)return;const base=window.JLiveScreen.route.bind(window.JLiveScreen);window.JLiveScreen.route=(text)=>route(text)||base(text);window.JLiveScreen.__strongHook=true}
  const obs=new MutationObserver(()=>{hook();render();update()});obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  window.addEventListener('j-shared-state',update);setInterval(()=>{if(dash())update()},12000);hook();render();window.JStrongCenter={render,update,openBrief,action,route,setMoneyProgress:n=>{try{localStorage.setItem('j_money_progress',String(Math.max(0,Number(n)||0)))}catch{}update()}};
})();