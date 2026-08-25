(()=>{
  let lastId='';
  let polling=true;
  const SOURCE='./data/latest-command-result.json';
  const MAC_ACTIONS=new Set(['open_url','open_app','focus_app','type_text','quit_app','run_shortcut']);
  const executedBuilds=new Set();
  const style=document.createElement('style');
  style.textContent=`.jRemoteCard{position:fixed;z-index:70;left:18px;bottom:120px;width:min(560px,calc(100vw - 36px));max-height:68vh;overflow:auto;border:1px solid #ffffff28;border-radius:18px;background:#080808ef;color:#fff;padding:14px;backdrop-filter:blur(18px);display:none}.jRemoteCard.open{display:block}.jRemoteHead{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px}.jRemoteHead b{font-size:10px;letter-spacing:.13em}.jRemoteHead button,.jRemoteOpen{border:1px solid #ffffff25;background:#121212;color:#fff;border-radius:999px;padding:9px 12px;text-decoration:none;display:inline-block;font-size:10px;font-weight:800;margin-top:10px;cursor:pointer}.jRemoteStatus{font-size:11px;color:#aaa;margin-bottom:10px}.jRemoteLead{padding:10px 0;border-bottom:1px solid #ffffff12}.jRemoteLead b{font-size:11px}.jRemoteLead small{display:block;color:#999;margin-top:4px;line-height:1.45}.jRemoteVideo{width:100%;aspect-ratio:16/9;border:0;border-radius:14px;background:#000;margin-top:10px}`;
  document.head.appendChild(style);
  const card=document.createElement('section');card.className='jRemoteCard';card.innerHTML='<div class="jRemoteHead"><b>J · REMOTE TASK</b><button type="button">×</button></div><div class="jRemoteStatus">Waiting for command…</div><div class="jRemoteBody"></div>';
  document.body.appendChild(card);
  card.querySelector('button').addEventListener('click',()=>card.classList.remove('open'));
  const status=card.querySelector('.jRemoteStatus'),body=card.querySelector('.jRemoteBody');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function youtubeInfo(u){try{const x=new URL(String(u));if(x.hostname==='www.youtube.com'&&x.pathname.startsWith('/embed/')){const id=x.pathname.split('/embed/')[1].split('/')[0];return id?{embed:`https://www.youtube.com/embed/${encodeURIComponent(id)}`,watch:`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`}:null}if((x.hostname==='www.youtube.com'||x.hostname==='youtube.com')&&x.pathname==='/watch'){const id=x.searchParams.get('v');return id?{embed:`https://www.youtube.com/embed/${encodeURIComponent(id)}`,watch:`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`}:null}return null}catch{return null}}
  function openNewTab(url){try{return !!window.open(url,'_blank','noopener,noreferrer')}catch{return false}}
  function loadCritical(src,globalName){if(globalName&&window[globalName])return;if(document.querySelector(`script[data-j-critical="${src}"]`))return;const s=document.createElement('script');s.src=`./${src}?boot=${Date.now()}`;s.async=false;s.dataset.jCritical=src;s.onerror=()=>console.error('J critical module failed',src);document.head.appendChild(s)}
  async function runBuild(d){
    if(!d?.command_id||!['build_site','build_site_v2'].includes(d.action)||d.status!=='queued')return;
    if(executedBuilds.has(d.command_id))return;
    executedBuilds.add(d.command_id);
    const details=String(d.payload?.business||d.business||'').trim();
    if(!details)return;
    card.classList.remove('open');
    window.dispatchEvent(new CustomEvent('j-command-seen',{detail:{source:'remote-sync-executor',command_id:d.command_id,action:d.action,status:d.status}}));
    try{
      window.JLiveScreen?.openBuilder?.(/maisonvere/i.test(details)?'MAISONVERE':'WEBSITE');
      const endpoint=new URL('/api/build-site',window.location.origin);
      endpoint.searchParams.set('business',details);
      endpoint.searchParams.set('command_id',d.command_id);
      endpoint.searchParams.set('_j',String(Date.now()));
      const r=await fetch(endpoint.href,{method:'GET',credentials:'include',cache:'no-store',redirect:'follow'});
      const data=await r.json().catch(()=>({}));
      window.dispatchEvent(new CustomEvent('j-build-http',{detail:{command_id:d.command_id,status:r.status,ok:r.ok,url:r.url,source:'remote-sync-executor'}}));
      if(!r.ok){window.JLiveScreen?.failBuilder?.(data?.error||`Site generation failed (${r.status})`);return}
      if(data?.html)window.JLiveScreen?.finishBuilder?.(data.html);
      else window.JLiveScreen?.failBuilder?.('Site generator returned no HTML');
    }catch(e){
      window.dispatchEvent(new CustomEvent('j-build-http',{detail:{command_id:d.command_id,status:0,ok:false,error:e?.message||String(e),source:'remote-sync-executor'}}));
      window.JLiveScreen?.failBuilder?.(e?.message||'Remote website build failed');
    }
  }
  function show(d){
    if(['build_site','build_site_v2'].includes(d.action)){runBuild(d);return}
    card.classList.add('open');
    if(MAC_ACTIONS.has(d.action)){status.textContent=d.status==='failed'?'Sent to Mac Agent':'Mac Agent command';body.innerHTML=`<div class="jRemoteLead"><b>J · MAC AGENT</b><small>${esc(d.display?.label||d.message||'Command sent to Mac.')}</small></div>`;return}
    status.textContent=d.status==='failed'?'Remote task failed':d.status==='complete'?'Remote task complete':'Remote task running';
    if(d.status==='failed'){const unsupported=/unsupported command/i.test(String(d.error||''));if(unsupported){status.textContent='Sent to Mac Agent';body.innerHTML='<div class="jRemoteLead"><b>J · MAC AGENT</b><small>This action is handled locally on your Mac.</small></div>';return}body.innerHTML=`<div class="jRemoteLead"><b>ERROR</b><small>${esc(d.error||'Unknown error')}</small></div>`;return}
    let html='';
    if(Array.isArray(d.leads)){html=`<div class="jRemoteLead"><b>${esc(d.title||'J REMOTE SEARCH')}</b><small>${esc(d.location||'')} · ${d.count||d.leads.length} results</small></div>`+d.leads.map((x,i)=>`<div class="jRemoteLead"><b>${i+1}. ${esc(x.name)}</b><small>${esc(String(x.category||'business').replaceAll('_',' '))}${x.address?' · '+esc(x.address):''}${x.phone?' · '+esc(x.phone):''}${x.website?' · website listed':''}</small></div>`).join('')}else if(Array.isArray(d.items)){html=`<div class="jRemoteLead"><b>${esc(d.title||'J REMOTE RESEARCH')}</b><small>${esc(d.message||'')} · ${d.count||d.items.length} results</small></div>`+d.items.map((x,i)=>`<div class="jRemoteLead"><b>${i+1}. ${esc(x.name||x.title||'Result')}</b><small>${esc(x.type||x.category||'')}${x.reason?' · '+esc(x.reason):''}${x.note?' · '+esc(x.note):''}</small></div>`).join('')}else html=`<div class="jRemoteLead"><b>${esc(d.message||'J remote bridge online')}</b></div>`;
    const yt=youtubeInfo(d.video_url||d.url||'');if(yt){html+=`<iframe class="jRemoteVideo" src="${esc(yt.embed)}" title="J video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe><a class="jRemoteOpen" target="_blank" rel="noopener noreferrer" href="${esc(yt.watch)}">OPEN VIDEO IN NEW TAB</a>`}body.innerHTML=html;if(yt){const opened=openNewTab(yt.watch);status.textContent=opened?'Opened video in a new tab':'Video ready — click OPEN VIDEO IN NEW TAB if your browser blocked the automatic tab.'}window.JSafety?.log?.('remote-command',`${d.action||'task'} ${d.status||''}`)
  }
  async function poll(){if(!polling)return;try{const r=await fetch(SOURCE+'?t='+Date.now(),{cache:'no-store',credentials:'include',headers:{'Cache-Control':'no-cache'}});if(!r.ok)throw new Error('sync unavailable');const d=await r.json();window.dispatchEvent(new CustomEvent('j-remote-health',{detail:{ok:true,commandId:d.command_id||'',action:d.action||'',status:d.status||''}}));if(d.command_id&&d.command_id!==lastId){lastId=d.command_id;show(d);if(d.status==='complete'&&!['build_site','build_site_v2'].includes(d.action)){const n=Array.isArray(d.leads)?d.leads.length:Array.isArray(d.items)?d.items.length:0;if(n)window.speak?.(`Remote task complete. I found ${n} results.`,{continueConversation:false})}}}catch(e){window.dispatchEvent(new CustomEvent('j-remote-health',{detail:{ok:false,error:e?.message||'sync unavailable'}}));console.warn('J remote sync',e)}setTimeout(poll,1000)}
  window.JRemoteSync={show,poll,runBuild,stop(){polling=false},start(){if(polling)return;polling=true;poll()}};
  poll();
  loadCritical('j-reliability.js','JReliability');
  loadCritical('j-meta-ads.js','JMetaAds');
})();
