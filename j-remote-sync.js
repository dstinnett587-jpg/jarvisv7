(()=>{
  let lastId='';
  let polling=true;
  const SOURCE='https://raw.githubusercontent.com/dstinnett587-jpg/jarvisv7/feature/j-vision-screen/data/latest-command-result.json';
  const style=document.createElement('style');
  style.textContent=`.jRemoteCard{position:fixed;z-index:70;left:18px;bottom:120px;width:min(560px,calc(100vw - 36px));max-height:68vh;overflow:auto;border:1px solid #ffffff28;border-radius:18px;background:#080808ef;color:#fff;padding:14px;backdrop-filter:blur(18px);display:none}.jRemoteCard.open{display:block}.jRemoteHead{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px}.jRemoteHead b{font-size:10px;letter-spacing:.13em}.jRemoteHead button,.jRemoteOpen{border:1px solid #ffffff25;background:#121212;color:#fff;border-radius:999px;padding:9px 12px;text-decoration:none;display:inline-block;font-size:10px;font-weight:800;margin-top:10px}.jRemoteStatus{font-size:11px;color:#aaa;margin-bottom:10px}.jRemoteLead{padding:10px 0;border-bottom:1px solid #ffffff12}.jRemoteLead b{font-size:11px}.jRemoteLead small{display:block;color:#999;margin-top:4px;line-height:1.45}.jRemoteVideo{width:100%;aspect-ratio:16/9;border:0;border-radius:14px;background:#000;margin-top:10px}`;
  document.head.appendChild(style);
  const card=document.createElement('section');card.className='jRemoteCard';card.innerHTML='<div class="jRemoteHead"><b>J · REMOTE TASK</b><button type="button">×</button></div><div class="jRemoteStatus">Waiting for command…</div><div class="jRemoteBody"></div>';
  document.body.appendChild(card);
  card.querySelector('button').addEventListener('click',()=>card.classList.remove('open'));
  const status=card.querySelector('.jRemoteStatus'),body=card.querySelector('.jRemoteBody');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function youtubeInfo(u){try{const x=new URL(String(u));if(x.hostname==='www.youtube.com'&&x.pathname.startsWith('/embed/')){const id=x.pathname.split('/embed/')[1].split('/')[0];return id?{embed:`https://www.youtube.com/embed/${encodeURIComponent(id)}`,watch:`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`} : null;}if((x.hostname==='www.youtube.com'||x.hostname==='youtube.com')&&x.pathname==='/watch'){const id=x.searchParams.get('v');return id?{embed:`https://www.youtube.com/embed/${encodeURIComponent(id)}`,watch:`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`} : null;}return null}catch{return null}}
  function openNewTab(url){try{const w=window.open(url,'_blank','noopener,noreferrer');return !!w}catch{return false}}
  function show(d){
    card.classList.add('open');
    status.textContent=d.status==='failed'?'Remote task failed':d.status==='complete'?'Remote task complete':'Remote task running';
    if(d.status==='failed'){body.innerHTML=`<div class="jRemoteLead"><b>ERROR</b><small>${esc(d.error||'Unknown error')}</small></div>`;return;}
    let html='';
    if(Array.isArray(d.leads)){
      html=`<div class="jRemoteLead"><b>${esc(d.title||'J REMOTE SEARCH')}</b><small>${esc(d.location||'')} · ${d.count||d.leads.length} results</small></div>`+d.leads.map((x,i)=>`<div class="jRemoteLead"><b>${i+1}. ${esc(x.name)}</b><small>${esc(String(x.category||'business').replaceAll('_',' '))}${x.address?' · '+esc(x.address):''}${x.phone?' · '+esc(x.phone):''}${x.website?' · website listed':''}</small></div>`).join('');
    } else if(Array.isArray(d.items)){
      html=`<div class="jRemoteLead"><b>${esc(d.title||'J REMOTE RESEARCH')}</b><small>${esc(d.message||'')} · ${d.count||d.items.length} results</small></div>`+d.items.map((x,i)=>`<div class="jRemoteLead"><b>${i+1}. ${esc(x.name||x.title||'Result')}</b><small>${esc(x.type||x.category||'')}${x.reason?' · '+esc(x.reason):''}${x.note?' · '+esc(x.note):''}</small></div>`).join('');
    } else html=`<div class="jRemoteLead"><b>${esc(d.message||'J remote bridge online')}</b></div>`;
    const yt=youtubeInfo(d.video_url||d.url||'');
    if(yt){html+=`<iframe class="jRemoteVideo" src="${esc(yt.embed)}" title="J video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe><a class="jRemoteOpen" target="_blank" rel="noopener noreferrer" href="${esc(yt.watch)}">OPEN VIDEO IN NEW TAB</a>`;}
    body.innerHTML=html;
    if(yt){const opened=openNewTab(yt.watch);status.textContent=opened?'Opened video in a new tab':'Video ready — click OPEN VIDEO IN NEW TAB if your browser blocked the automatic tab.';}
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
