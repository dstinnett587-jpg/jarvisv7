(()=>{
  if(window.JChatGPTBridge)return;
  const SOURCE='https://raw.githubusercontent.com/dstinnett587-jpg/jarvisv7/feature/j-vision-screen/data/latest-command-result.json';
  let lastId='';
  let running=true;

  async function execute(d){
    if(!d||!d.command_id||d.command_id===lastId)return;
    lastId=d.command_id;
    if(d.action!=='build_site')return;

    const details=String(d.payload?.business||d.business||'').trim();
    if(!details)return;

    try{
      window.JLiveScreen?.openBuilder?.(/maisonvere/i.test(details)?'MAISONVERE':'WEBSITE');
      window.dispatchEvent(new CustomEvent('j-command',{detail:{source:'chatgpt',action:'build_site',text:`Build website: ${details.slice(0,240)}`}}));
      const r=await fetch('/api/build-site',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({business:details})});
      const data=await r.json().catch(()=>({}));
      if(!r.ok){window.JLiveScreen?.failBuilder?.(data?.error||'Site generation failed');return;}
      if(data?.html)window.JLiveScreen?.finishBuilder?.(data.html);
    }catch(e){
      window.JLiveScreen?.failBuilder?.(e?.message||'Remote website build failed');
    }
  }

  async function poll(){
    if(!running)return;
    try{
      const r=await fetch(SOURCE+'?t='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
      if(r.ok)await execute(await r.json());
    }catch(e){console.warn('J ChatGPT bridge',e)}
    setTimeout(poll,1000);
  }

  window.JChatGPTBridge={execute,poll,stop(){running=false},start(){if(running)return;running=true;poll()}};
  poll();
})();
