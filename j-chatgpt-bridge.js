(()=>{
  if(window.JChatGPTBridge)return;
  const SOURCE='/data/latest-command-result.json';
  let lastId='';
  let running=true;

  async function execute(d){
    if(!d||!d.command_id||d.command_id===lastId)return;
    if(!['build_site','build_site_v2'].includes(d.action)){lastId=d.command_id;return;}
    const details=String(d.payload?.business||d.business||'').trim();
    if(!details)return;
    lastId=d.command_id;
    window.__J_SITE_BUILD_LOCKS=window.__J_SITE_BUILD_LOCKS||new Set();
    if(window.__J_SITE_BUILD_LOCKS.has(d.command_id))return;
    window.__J_SITE_BUILD_LOCKS.add(d.command_id);
    try{
      window.JLiveScreen?.openBuilder?.(/maisonvere/i.test(details)?'MAISONVERE':'WEBSITE');
      window.dispatchEvent(new CustomEvent('j-command',{detail:{source:'chatgpt',action:'build_site_v2',command_id:d.command_id,text:`Build website: ${details.slice(0,240)}`}}));
      const endpoint='/api/build-site?business='+encodeURIComponent(details)+'&command_id='+encodeURIComponent(d.command_id)+'&t='+Date.now();
      const r=await fetch(endpoint,{method:'GET',credentials:'include',cache:'no-store'});
      const data=await r.json().catch(()=>({}));
      window.dispatchEvent(new CustomEvent('j-build-http',{detail:{command_id:d.command_id,status:r.status,ok:r.ok,url:r.url}}));
      if(!r.ok){window.JLiveScreen?.failBuilder?.(data?.error||`Site generation failed (${r.status})`);return;}
      if(data?.html)window.JLiveScreen?.finishBuilder?.(data.html);
      else window.JLiveScreen?.failBuilder?.('Site generator returned no HTML');
    }catch(e){
      window.dispatchEvent(new CustomEvent('j-build-http',{detail:{command_id:d.command_id,status:0,ok:false,error:e?.message||String(e)}}));
      window.JLiveScreen?.failBuilder?.(e?.message||'Remote website build failed');
    }
  }

  async function poll(){
    if(!running)return;
    try{const r=await fetch(SOURCE+'?t='+Date.now(),{cache:'no-store',credentials:'include'});if(r.ok)await execute(await r.json())}catch(e){console.warn('J ChatGPT bridge',e)}
    setTimeout(poll,1000);
  }

  window.JChatGPTBridge={execute,poll,stop(){running=false},start(){if(running)return;running=true;poll()},get lastId(){return lastId}};
  poll();
})();
