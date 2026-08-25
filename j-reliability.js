(()=>{
  if(window.JReliability)return;
  const COMMAND_SOURCE='https://raw.githubusercontent.com/dstinnett587-jpg/jarvisv7/feature/j-vision-screen/data/latest-command-result.json';
  const state={health:null,lastCommand:null,lastCommandAt:0,lastError:'',checks:0,bridgeRestarts:0};
  const style=document.createElement('style');
  style.textContent=`.jReliability{position:fixed;left:14px;top:14px;z-index:120;min-width:165px;border:1px solid #ffffff22;border-radius:13px;background:#070707e8;color:#fff;padding:9px 10px;backdrop-filter:blur(16px);font:10px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 10px 30px #0008}.jReliability b{font-size:9px;letter-spacing:.13em}.jReliability .jrLine{display:flex;justify-content:space-between;gap:12px;margin-top:5px;color:#8d8d8d}.jReliability .jrLine strong{color:#fff}.jReliability.bad{border-color:#ffffff44}.jReliability .jrErr{display:none;margin-top:6px;color:#bbb;max-width:250px}.jReliability.bad .jrErr{display:block}`;
  document.head.appendChild(style);
  const box=document.createElement('div');
  box.className='jReliability';
  box.innerHTML='<b>J · SYSTEM LINK</b><div class="jrLine"><span>CORE</span><strong id="jrCore">CHECKING</strong></div><div class="jrLine"><span>REMOTE</span><strong id="jrRemote">CHECKING</strong></div><div class="jrLine"><span>COMMAND</span><strong id="jrCommand">WAITING</strong></div><div class="jrErr" id="jrErr"></div>';
  document.body.appendChild(box);
  const core=box.querySelector('#jrCore'),remote=box.querySelector('#jrRemote'),command=box.querySelector('#jrCommand'),err=box.querySelector('#jrErr');
  function setError(msg){state.lastError=String(msg||'');err.textContent=state.lastError;box.classList.toggle('bad',!!state.lastError)}
  function ensureBridges(){
    if(window.JRemoteSync&&typeof window.JRemoteSync.start==='function'){
      try{window.JRemoteSync.start()}catch{}
    }
    if(window.JChatGPTBridge&&typeof window.JChatGPTBridge.start==='function'){
      try{window.JChatGPTBridge.start()}catch{}
    }
    remote.textContent=(window.JRemoteSync||window.JChatGPTBridge)?'ONLINE':'BOOTING';
  }
  async function checkHealth(){
    try{
      const r=await fetch('/api/health?jr='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
      const d=await r.json();state.health=d;state.checks++;
      core.textContent=d?.ok?'ONLINE':'DEGRADED';
      if(!d?.ok)setError('J core health check is degraded.');else if(!state.lastError.includes('command'))setError('');
    }catch(e){core.textContent='OFFLINE';setError('J core health check failed. '+(e?.message||''))}
  }
  async function checkCommand(){
    try{
      const r=await fetch(COMMAND_SOURCE+'?jr='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
      if(!r.ok)throw new Error('command source '+r.status);
      const d=await r.json();
      if(d?.command_id){
        state.lastCommand=d;command.textContent=String(d.status||'seen').toUpperCase();
        if(state.lastCommandAt===0||state.lastCommand?.command_id!==d.command_id)state.lastCommandAt=Date.now();
        if(d.action==='build_site'&&d.status==='queued'){
          const builderOpen=!!document.querySelector('.jBuild.on');
          if(!builderOpen){
            if(window.JChatGPTBridge?.execute){await window.JChatGPTBridge.execute(d)}
            else if(window.JRemoteSync?.show){window.JRemoteSync.show(d)}
          }
        }
      }else command.textContent='WAITING';
    }catch(e){remote.textContent='OFFLINE';setError('Remote command channel unavailable. '+(e?.message||''))}
  }
  async function tick(){ensureBridges();await Promise.all([checkHealth(),checkCommand()]);setTimeout(tick,5000)}
  window.addEventListener('error',e=>{const m=String(e?.message||'');if(m)setError('JS error: '+m.slice(0,140))});
  window.addEventListener('unhandledrejection',e=>{const m=String(e?.reason?.message||e?.reason||'');if(m)setError('Async error: '+m.slice(0,140))});
  window.JReliability={state,checkHealth,checkCommand,ensureBridges,setError};
  setTimeout(tick,800);
})();