(()=>{
  const BASES=['http://127.0.0.1:8765','http://localhost:8765'];
  const stage=document.getElementById('stage');
  const video=document.getElementById('editPreview');
  const empty=document.getElementById('monitorEmpty');
  const state=document.getElementById('wsState');
  const op=document.getElementById('opText');
  const fill=document.getElementById('progressFill');
  const monitor=document.querySelector('.monitor');
  const timeline=document.querySelector('.timeline');
  const actions=[...document.querySelectorAll('.wsActions button')];
  let currentKind='edit',loading=false,currentBase=BASES[0],blobUrl='';

  function setProgress(n,label){if(fill)fill.style.width=Math.max(0,Math.min(100,n))+'%';if(op&&label)op.textContent=String(label).toUpperCase()}
  function releaseBlob(){if(blobUrl){try{URL.revokeObjectURL(blobUrl)}catch{}blobUrl=''}}
  function showEmpty(title,sub){releaseBlob();if(video){video.pause();video.removeAttribute('src');video.hidden=true}if(empty){empty.hidden=false;empty.innerHTML=`<strong>${title}</strong>${sub||''}`}}
  function openLocalPreview(){window.open(currentBase+'/preview?t='+Date.now(),'j-local-preview')}
  function bridgeBlocked(){
    if(video){video.pause();video.hidden=true}
    if(empty){empty.hidden=false;empty.innerHTML='<strong>LOCAL VIDEO BRIDGE NEEDS UPDATE</strong><div style="margin:8px 0 12px;color:#aaa">J found the edit, but Opera is blocking the old local bridge.</div><button id="jOpenLocalPreview" style="border:1px solid #ffffff35;background:#111;color:#fff;border-radius:999px;padding:9px 13px;cursor:pointer">OPEN VIDEO LOCALLY</button>';
      empty.querySelector('#jOpenLocalPreview')?.addEventListener('click',openLocalPreview)}
    setProgress(0,'BRIDGE UPDATE')
  }
  function showVideo(src,name,kind='edit'){
    if(!video)return false;currentKind=kind;video.hidden=false;video.controls=true;video.playsInline=true;video.preload='metadata';video.src=src;if(empty)empty.hidden=true;if(state)state.textContent=(kind==='source'?'SOURCE · ':'PREVIEW · ')+String(name||'VIDEO').toUpperCase();video.onerror=bridgeBlocked;video.onloadedmetadata=()=>{if(empty)empty.hidden=true;setProgress(100,kind==='source'?'SOURCE':'READY')};video.load();video.play().catch(()=>{});return true
  }
  async function findBase(){
    for(const base of BASES){try{const r=await fetch(base+'/health?t='+Date.now(),{cache:'no-store',mode:'cors'});if(r.ok){const d=await r.json();if(d?.ok){currentBase=base;return base}}}catch{}}
    throw new Error('Local J video server unavailable')
  }
  async function getMeta(path='/latest-meta'){const base=await findBase();const r=await fetch(base+path+'?t='+Date.now(),{cache:'no-store',mode:'cors'});if(!r.ok)throw new Error('Local J video server unavailable');const d=await r.json();if(!d.ok)throw new Error(d.error||'No video found');return d}
  async function getVideoBlob(path='/latest-video'){
    const base=await findBase();
    const r=await fetch(base+path+'?t='+Date.now(),{cache:'no-store',mode:'cors'});
    if(!r.ok)throw new Error('Video fetch failed');
    const blob=await r.blob();
    if(!blob.size)throw new Error('Video was empty');
    releaseBlob();blobUrl=URL.createObjectURL(blob);return blobUrl
  }
  async function loadLatest(force=false){
    if(loading&&!force)return false;loading=true;setProgress(12,'CONNECTING');
    try{
      const meta=await getMeta('/latest-meta');setProgress(38,'LOADING VIDEO');
      try{const src=await getVideoBlob('/latest-video');showVideo(src,meta.name,meta.kind||'edit');return true}
      catch(blobErr){console.warn('J blob relay failed',blobErr);showVideo(currentBase+'/latest-video?t='+Date.now(),meta.name,meta.kind||'edit');return true}
    }catch(e){console.warn('J video bridge',e);bridgeBlocked();return false}
    finally{loading=false}
  }
  async function showSource(){try{setProgress(20,'SOURCE');const meta=await getMeta('/source-meta');try{const src=await getVideoBlob('/source-video');showVideo(src,meta.name,'source')}catch{showVideo(currentBase+'/source-video?t='+Date.now(),meta.name,'source')}}catch(e){showEmpty('SOURCE NOT FOUND','Put the raw video in Downloads, then ask J again.')}}
  async function renderAgain(){
    const start=Number(document.getElementById('jTrimStart')?.value||0),duration=Number(document.getElementById('jTrimDuration')?.value||15);const btn=actions.find(b=>/render again/i.test(b.textContent||''));if(btn)btn.disabled=true;setProgress(8,'ANALYZING');let fake=8;const timer=setInterval(()=>{fake=Math.min(88,fake+3);setProgress(fake,fake<30?'CUTTING':fake<55?'PUNCH-INS':fake<72?'COLOR + GRAIN':'EXPORTING')},700);
    try{const base=await findBase();const r=await fetch(base+'/render',{method:'POST',mode:'cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({start,duration,output:'MV-Chaos-Live.mp4'})});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||'Render failed');clearInterval(timer);setProgress(100,'READY');await loadLatest(true);video?.play().catch(()=>{})}
    catch(e){clearInterval(timer);setProgress(0,'RENDER FAILED');if(empty){empty.hidden=false;empty.innerHTML=`<strong>RENDER FAILED</strong>${String(e.message||e).slice(0,180)}`}}
    finally{if(btn)btn.disabled=false}
  }
  function injectControls(){const side=document.querySelector('.side');if(!side||document.getElementById('jEditControls'))return;const card=document.createElement('div');card.className='card';card.id='jEditControls';card.innerHTML=`<div class="label">LIVE EDIT CONTROLS</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:7px"><label style="font-size:8px;color:#888">START<input id="jTrimStart" type="number" min="0" max="60" step="0.1" value="0" style="width:100%;margin-top:4px;background:#000;border:1px solid #ffffff24;color:#fff;border-radius:7px;padding:6px"></label><label style="font-size:8px;color:#888">LENGTH<input id="jTrimDuration" type="number" min="1" max="60" step="0.5" value="15" style="width:100%;margin-top:4px;background:#000;border:1px solid #ffffff24;color:#fff;border-radius:7px;padding:6px"></label></div><div class="sub">Change the section, then press Render Again.</div>`;const actionBox=side.querySelector('.wsActions');side.insertBefore(card,actionBox||null)}
  injectControls();
  const beforeAfter=actions.find(b=>/before\s*\/\s*after/i.test(b.textContent||'')),renderBtn=actions.find(b=>/render again/i.test(b.textContent||'')),exportBtn=actions.find(b=>/export/i.test(b.textContent||''));beforeAfter?.addEventListener('click',()=>currentKind==='source'?loadLatest(true):showSource());renderBtn?.addEventListener('click',renderAgain);exportBtn?.addEventListener('click',()=>window.open(currentBase+'/latest-video?t='+Date.now(),'j-export'));
  timeline?.addEventListener('click',e=>{if(!video||!Number.isFinite(video.duration)||video.duration<=0)return;const r=timeline.getBoundingClientRect();video.currentTime=video.duration*Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))});
  monitor?.addEventListener('dblclick',()=>{if(video&&!video.hidden){if(video.paused)video.play().catch(()=>{});else video.pause()}});
  if(stage){let wasOpen=stage.classList.contains('workspaceOpen');new MutationObserver(()=>{const isOpen=stage.classList.contains('workspaceOpen');if(isOpen&&!wasOpen)loadLatest(true);wasOpen=isOpen}).observe(stage,{attributes:true,attributeFilter:['class']});if(wasOpen)loadLatest(true)}
  const original=window.JWorkspace?.openVideo;if(window.JWorkspace&&typeof original==='function'&&!window.JWorkspace.__realVideo){window.JWorkspace.openVideo=function(src){if(src)return original.call(window.JWorkspace,src);original.call(window.JWorkspace);return loadLatest(true)};window.JWorkspace.openLatestVideo=()=>loadLatest(true);window.JWorkspace.renderAgain=renderAgain;window.JWorkspace.__realVideo=true}
  window.JVideoWorkspace={loadLatest,showSource,renderAgain,openLocalPreview};
})();
