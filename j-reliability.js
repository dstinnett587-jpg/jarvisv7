(()=>{
  if(window.JReliability)return;
  const COMMAND_SOURCE='/data/latest-command-result.json';
  const state={health:null,lastCommand:null,lastCommandAt:0,lastError:'',checks:0,lastExecutedCommandId:''};
  const style=document.createElement('style');
  style.textContent=`.jReliability{position:fixed;left:14px;top:14px;z-index:120;min-width:165px;border:1px solid #ffffff22;border-radius:13px;background:#070707e8;color:#fff;padding:9px 10px;backdrop-filter:blur(16px);font:10px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 10px 30px #0008}.jReliability b{font-size:9px;letter-spacing:.13em}.jReliability .jrLine{display:flex;justify-content:space-between;gap:12px;margin-top:5px;color:#8d8d8d}.jReliability .jrLine strong{color:#fff}.jReliability.bad{border-color:#ffffff44}.jReliability .jrErr{display:none;margin-top:6px;color:#bbb;max-width:250px}.jReliability.bad .jrErr{display:block}`;
  document.head.appendChild(style);
  const box=document.createElement('div');
  box.className='jReliability';
  box.innerHTML='<b>J · SYSTEM LINK</b><div class="jrLine"><span>CORE</span><strong id="jrCore">CHECKING</strong></div><div class="jrLine"><span>REMOTE</span><strong id="jrRemote">CHECKING</strong></div><div class="jrLine"><span>COMMAND</span><strong id="jrCommand">WAITING</strong></div><div class="jrErr" id="jrErr"></div>';
  document.body.appendChild(box);
  const core=box.querySelector('#jrCore'),remote=box.querySelector('#jrRemote'),command=box.querySelector('#jrCommand'),err=box.querySelector('#jrErr');
  function setError(msg){state.lastError=String(msg||'');err.textContent=state.lastError;box.classList.toggle('bad',!!state.lastError)}
  function ensureBridges(){if(window.JRemoteSync&&typeof window.JRemoteSync.start==='function'){try{window.JRemoteSync.start()}catch{}}if(window.JChatGPTBridge&&typeof window.JChatGPTBridge.start==='function'){try{window.JChatGPTBridge.start()}catch{}}}
  async function checkHealth(){try{const r=await fetch('/api/health?jr='+Date.now(),{cache:'no-store',credentials:'include'});const d=await r.json();state.health=d;state.checks++;core.textContent=d?.ok?'ONLINE':'DEGRADED';if(!d?.ok)setError('J core health check is degraded.');else if(!state.lastError.includes('Website build'))setError('')}catch(e){core.textContent='OFFLINE';setError('J core health check failed. '+(e?.message||''))}}
  async function executeBuild(d){
    if(!d?.command_id||!['build_site','build_site_v2'].includes(d.action)||d.status!=='queued')return;
    window.__J_SITE_BUILD_LOCKS=window.__J_SITE_BUILD_LOCKS||new Set();
    if(window.__J_SITE_BUILD_LOCKS.has(d.command_id))return;
    window.__J_SITE_BUILD_LOCKS.add(d.command_id);
    state.lastExecutedCommandId=d.command_id;
    const details=String(d.payload?.business||d.business||'').trim();
    if(!details)return;
    try{
      command.textContent='BUILDING';
      window.JLiveScreen?.openBuilder?.(/maisonvere/i.test(details)?'MAISONVERE':'WEBSITE');
      const endpoint='/api/build-site?business='+encodeURIComponent(details)+'&command_id='+encodeURIComponent(d.command_id)+'&t='+Date.now();
      const r=await fetch(endpoint,{method:'GET',credentials:'include',cache:'no-store'});
      const data=await r.json().catch(()=>({}));
      window.dispatchEvent(new CustomEvent('j-build-http',{detail:{command_id:d.command_id,status:r.status,ok:r.ok,url:r.url}}));
      if(!r.ok){window.JLiveScreen?.failBuilder?.(data?.error||`Site generation failed (${r.status})`);return}
      if(data?.html){window.JLiveScreen?.finishBuilder?.(data.html);command.textContent='BUILD OK'}else window.JLiveScreen?.failBuilder?.('Site generator returned no HTML')
    }catch(e){window.dispatchEvent(new CustomEvent('j-build-http',{detail:{command_id:d.command_id,status:0,ok:false,error:e?.message||String(e)}}));window.JLiveScreen?.failBuilder?.(e?.message||'Remote website build failed')}
  }
  async function checkCommand(){try{const r=await fetch(COMMAND_SOURCE+'?jr='+Date.now(),{cache:'no-store',credentials:'include'});if(!r.ok)throw new Error('command source '+r.status);const d=await r.json();remote.textContent='ONLINE';if(d?.command_id){state.lastCommand=d;state.lastCommandAt=Date.now();command.textContent=String(d.status||'seen').toUpperCase();await executeBuild(d)}else command.textContent='WAITING'}catch(e){remote.textContent='OFFLINE';setError('Remote command channel unavailable. '+(e?.message||''))}}
  async function tick(){ensureBridges();await checkHealth();await checkCommand();setTimeout(tick,5000)}
  window.addEventListener('j-build-http',e=>{const d=e.detail||{};command.textContent=d.ok?'BUILD OK':d.status?`HTTP ${d.status}`:'BUILD ERR';if(!d.ok)setError('Website build request failed. '+(d.error||d.status||''))});
  window.addEventListener('error',e=>{const m=String(e?.message||'');if(m)setError('JS error: '+m.slice(0,140))});
  window.addEventListener('unhandledrejection',e=>{const m=String(e?.reason?.message||e?.reason||'');if(m)setError('Async error: '+m.slice(0,140))});
  window.JReliability={state,checkHealth,checkCommand,ensureBridges,setError,executeBuild};setTimeout(tick,800);
})();
