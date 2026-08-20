(()=>{
  let lastId='';
  let polling=true;
  const SOURCE='https://raw.githubusercontent.com/dstinnett587-jpg/jarvisv7/feature/j-vision-screen/data/latest-command-result.json';
  const style=document.createElement('style');
  style.textContent=`.jRemoteCard{position:fixed;z-index:70;left:18px;bottom:120px;width:min(420px,calc(100vw - 36px));max-height:50vh;overflow:auto;border:1px solid #ffffff28;border-radius:18px;background:#080808ef;color:#fff;padding:14px;backdrop-filter:blur(18px);display:none}.jRemoteCard.open{display:block}.jRemoteHead{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px}.jRemoteHead b{font-size:10px;letter-spacing:.13em}.jRemoteHead button{border:1px solid #ffffff25;background:#121212;color:#fff;border-radius:999px;padding:7px 9px}.jRemoteStatus{font-size:11px;color:#aaa;margin-bottom:10px}.jRemoteLead{padding:10px 0;border-bottom:1px solid #ffffff12}.jRemoteLead b{font-size:11px}.jRemoteLead small{display:block;color:#999;margin-top:4px;line-height:1.45}`;
  document.head.appendChild(style);
  const card=document.createElement('section');card.className='jRemoteCard';card.innerHTML='<div class="jRemoteHead"><b>J · REMOTE TASK</b><button type="button">×</button></div><div class="jRemoteStatus">Waiting for command…</div><div class="jRemoteBody"></div>';
  document.body.appendChild(card);
  card.querySelector('button').addEventListener('click',()=>card.classList.remove('open'));
  const status=card.querySelector('.jRemoteStatus'),body=card.querySelector('.jRemoteBody');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function show(d){
    card.classList.add('open');
    status.textContent=d.status==='failed'?'Remote task failed':d.status==='complete'?'Remote task complete':'Remote task running';
    if(d.status==='failed'){body.innerHTML=`<div class="jRemoteLead"><b>ERROR</b><small>${esc(d.error||'Unknown error')}</small></div>`;return;}
    if(Array.isArray(d.leads)){
      body.innerHTML=`<div class="jRemoteLead"><b>${esc(d.title||'J REMOTE SEARCH')}</b><small>${esc(d.location||'')} · ${d.count||d.leads.length} results</small></div>`+d.leads.map((x,i)=>`<div class="jRemoteLead"><b>${i+1}. ${esc(x.name)}</b><small>${esc(String(x.category||'business').replaceAll('_',' '))}${x.address?' · '+esc(x.address):''}${x.phone?' · '+esc(x.phone):''}${x.website?' · website listed':''}</small></div>`).join('');
    } else if(Array.isArray(d.items)){
      body.innerHTML=`<div class="jRemoteLead"><b>${esc(d.title||'J REMOTE RESEARCH')}</b><small>${esc(d.message||'')} · ${d.count||d.items.length} results</small></div>`+d.items.map((x,i)=>`<div class="jRemoteLead"><b>${i+1}. ${esc(x.name||x.title||'Result')}</b><small>${esc(x.type||x.category||'')}${x.reason?' · '+esc(x.reason):''}${x.note?' · '+esc(x.note):''}</small></div>`).join('');
    } else body.innerHTML=`<div class="jRemoteLead"><b>${esc(d.message||'J remote bridge online')}</b></div>`;
    window.JSafety?.log?.('remote-command',`${d.action||'task'} ${d.status||''}`);
  }
  async function poll(){
    if(!polling)return;
    try{
      const r=await fetch(SOURCE+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('sync unavailable');const d=await r.json();
      if(d.command_id&&d.command_id!==lastId){lastId=d.command_id;show(d);if(d.status==='complete'){const n=Array.isArray(d.leads)?d.leads.length:Array.isArray(d.items)?d.items.length:0;if(n)window.speak?.(`Remote task complete. I found ${n} results.`,{continueConversation:false});}}
    }catch(e){console.warn('J remote sync',e)}
    setTimeout(poll,5000);
  }
  window.JRemoteSync={show,poll,stop(){polling=false},start(){if(polling)return;polling=true;poll()}};
  poll();
})();
