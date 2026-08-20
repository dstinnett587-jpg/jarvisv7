(()=>{
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function geo(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(new Error('Location unavailable'));navigator.geolocation.getCurrentPosition(p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude}),()=>reject(new Error('Location permission needed')),{enableHighAccuracy:false,maximumAge:300000,timeout:8000})})}
  function render(data){
    window.JTablet?.open?.('business');
    const body=document.getElementById('tabletBody');if(!body)return;
    const rows=(data.businesses||data.leads||[]).map((x,i)=>`<div class="lead" style="padding:12px;border-bottom:1px solid #222"><b>${i+1}. ${esc(x.name)}</b><small style="display:block;color:#aaa;margin-top:5px;line-height:1.5">${esc(String(x.category||'business').replaceAll('_',' '))}${x.address?'<br>'+esc(x.address):''}${x.phone?'<br>Phone: '+esc(x.phone):''}${x.email?'<br>Email: '+esc(x.email):''}${x.website?'<br>Website: '+esc(x.website):'<br>Website: none listed'}${x.openingHours?'<br>Hours: '+esc(x.openingHours):''}</small></div>`).join('');
    body.innerHTML=`<div class="mediaTop"><b>J · BUSINESS DATA · ${(data.businesses||[]).length} RESULTS</b><button data-new-business-search>New Search</button></div><div class="muted" style="padding:10px 0">${esc(data.query||'Businesses')}${data.resolvedLocation?' · '+esc(data.resolvedLocation):''}</div><div>${rows||'<div class="muted">No matching businesses found. Try a broader search.</div>'}</div>`;
    body.querySelector('[data-new-business-search]')?.addEventListener('click',start);
  }
  async function search({query='',location='',onlyMissingWebsite=false,latitude,longitude}={}){
    const payload={query,location,onlyMissingWebsite,radius:18000,limit:30};
    if(Number.isFinite(latitude)&&Number.isFinite(longitude)){payload.latitude=latitude;payload.longitude=longitude}
    if(!location&&!Number.isFinite(latitude)){const p=await geo();payload.latitude=p.latitude;payload.longitude=p.longitude}
    const r=await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw new Error(d.error||'Business search failed');render(d);window.JSafety?.log?.('business-search',`${query||'businesses'} · ${(d.businesses||[]).length} results`);return d;
  }
  async function start(){
    const query=window.prompt('What type of business should J find?','barbers');if(query===null)return;
    const location=window.prompt('What city or area? Leave blank to use your location.','Dallas, TX');if(location===null)return;
    try{window.JTablet?.open?.('business');const body=document.getElementById('tabletBody');if(body)body.innerHTML='<div class="tload">SEARCHING LIVE BUSINESS DATA…</div>';const d=await search({query,location});await window.speak?.(`I found ${(d.businesses||[]).length} businesses. I put the details on the tablet.`,{continueConversation:false})}catch(e){await window.speak?.(e.message||'Business search failed.',{continueConversation:false})}
  }
  function parse(raw){
    const text=String(raw||'').trim();const lower=text.toLowerCase();
    if(!/\b(find|search|show|get|pull)\b/.test(lower))return null;
    if(!/\b(business|businesses|company|companies|shop|shops|store|stores|restaurant|restaurants|barber|barbers|salon|salons|plumber|plumbers|roofer|roofers|contractor|contractors|dentist|dentists|gym|gyms|lead|leads)\b/.test(lower))return null;
    const nearMe=/\b(near me|nearby|around me)\b/i.test(text);
    const m=text.match(/\b(?:in|around|near)\s+(.+)$/i);const location=nearMe?'':(m?.[1]?.trim()||'');
    let query=text.replace(/^.*?\b(find|search|show|get|pull)\b\s*/i,'').replace(/\b(?:in|around|near)\s+.+$/i,'').replace(/\b(near me|nearby|around me)\b/ig,'').replace(/\b(business data|businesses|business|leads?)\b/ig,'').trim();
    if(!query)query='local business';return {query,location,nearMe};
  }
  const previousAsk=window.ask;
  if(typeof previousAsk==='function')window.ask=async function(text){const parsed=parse(text);if(!parsed)return previousAsk(text);try{window.JTablet?.open?.('business');const body=document.getElementById('tabletBody');if(body)body.innerHTML='<div class="tload">PULLING LIVE BUSINESS DATA…</div>';const d=await search({query:parsed.query,location:parsed.location});await window.speak?.(`I found ${(d.businesses||[]).length} matching businesses and loaded their details.`,{continueConversation:false});return d}catch(e){await window.speak?.(e.message||'Business search failed.',{continueConversation:false});return null}};
  window.JBusiness={search,start,parse};
})();
