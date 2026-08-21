const stage=document.getElementById('stage');
const status=document.getElementById('status');
const responseEl=document.getElementById('response');
const activateBtn=document.getElementById('activateBtn');
const audioStatus=document.getElementById('audioStatus');
const sitePreview=document.getElementById('sitePreview');
const siteFrame=document.getElementById('siteFrame');
const closePreview=document.getElementById('closePreview');
const hudDrawer=document.getElementById('hudDrawer');
const drawerTitle=document.getElementById('drawerTitle');
const drawerBody=document.getElementById('drawerBody');
const closeDrawer=document.getElementById('closeDrawer');
const coreV=document.querySelector('.hud.h1 .v');
const coreS=document.querySelector('.hud.h1 .s');

const MEMORY_KEY='j_conversation_v2';
let history=[];
try{const saved=JSON.parse(localStorage.getItem(MEMORY_KEY)||'[]');history=Array.isArray(saved)?saved.slice(-40):[]}catch{}
let activated=false,isAsking=false,isSpeaking=false,processingAudio=false;
let stream=null,recorder=null,recordTimer=null,persistentAudio=null,audioCtx=null;
let locationContext=null,lastLeads=[];

function saveHistory(){try{localStorage.setItem(MEMORY_KEY,JSON.stringify(history.slice(-40)))}catch{}}
function setStatus(text,state=''){
  if(status)status.textContent=text;
  if(coreV)coreV.textContent=text;
  if(coreS)coreS.textContent=activated?'Conversation mode · just talk':'Tap J once to start';
  stage?.classList.remove('listening','thinking','speaking');
  if(state)stage?.classList.add(state);
}
function showResponse(text=''){if(responseEl)responseEl.textContent=text}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function splitSpeech(text){const out=[];let rest=String(text||'').replace(/\s+/g,' ').trim();while(rest){if(rest.length<=180){out.push(rest);break}let cut=Math.max(rest.lastIndexOf('. ',180),rest.lastIndexOf('? ',180),rest.lastIndexOf('! ',180),rest.lastIndexOf(', ',180),rest.lastIndexOf(' ',180));if(cut<80)cut=180;out.push(rest.slice(0,cut+1).trim());rest=rest.slice(cut+1).trim()}return out}

function ensureAudio(){if(!persistentAudio){persistentAudio=document.createElement('audio');persistentAudio.setAttribute('playsinline','');persistentAudio.preload='auto';persistentAudio.style.display='none';document.body.appendChild(persistentAudio)}return persistentAudio}
function ensureAudioContext(){if(!audioCtx){const AC=window.AudioContext||window.webkitAudioContext;if(AC)audioCtx=new AC()}return audioCtx}
async function unlockAudioContext(){const ctx=ensureAudioContext();if(!ctx)return false;try{if(ctx.state!=='running')await ctx.resume();const b=ctx.createBuffer(1,1,22050),s=ctx.createBufferSource();s.buffer=b;s.connect(ctx.destination);s.start(0);return true}catch{return false}}
async function playViaWebAudio(blob){const ctx=ensureAudioContext();if(!ctx)throw new Error('Web Audio unavailable');if(ctx.state!=='running')await ctx.resume();const decoded=await ctx.decodeAudioData((await blob.arrayBuffer()).slice(0));await new Promise((resolve,reject)=>{try{const src=ctx.createBufferSource();src.buffer=decoded;src.connect(ctx.destination);src.onended=resolve;src.start(0)}catch(e){reject(e)}})}
async function playViaElement(blob){const a=ensureAudio(),url=URL.createObjectURL(blob);try{a.pause();a.src=url;a.load();await new Promise((resolve,reject)=>{a.onended=resolve;a.onerror=()=>reject(new Error('Audio playback failed'));const p=a.play();if(p)p.catch(reject)})}finally{URL.revokeObjectURL(url)}}
async function playVoiceChunk(text){const r=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});if(!r.ok)throw new Error('Voice unavailable');const blob=await r.blob();try{await playViaWebAudio(blob)}catch{await playViaElement(blob)}}
function pickSystemVoice(){if(!('speechSynthesis'in window))return null;const voices=speechSynthesis.getVoices();return voices.find(v=>/Daniel|Arthur/i.test(v.name))||voices.find(v=>/en-GB/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang))||voices[0]||null}
async function systemSpeech(text){if(!('speechSynthesis'in window))throw new Error('System speech unavailable');const tracks=stream?.getAudioTracks?.()||[];tracks.forEach(t=>t.enabled=false);try{await new Promise(resolve=>{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text),v=pickSystemVoice();if(v)u.voice=v;u.lang=v?.lang||'en-US';u.rate=.94;u.pitch=.88;u.volume=1;u.onend=resolve;u.onerror=resolve;speechSynthesis.speak(u)})}finally{tracks.forEach(t=>t.enabled=true)}}

function stopRecording(){clearTimeout(recordTimer);recordTimer=null;if(recorder&&recorder.state!=='inactive'){try{recorder.stop()}catch{}}recorder=null}
function blobToBase64(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onloadend=()=>resolve(String(reader.result||'').split(',')[1]||'');reader.onerror=reject;reader.readAsDataURL(blob)})}
async function transcribe(blob){const audio=await blobToBase64(blob);const r=await fetch('/api/stt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio,mime:blob.type||'audio/mp4'})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Transcription failed');return String(d.text||'').trim()}

function requestLocation(){if(!navigator.geolocation)return;try{navigator.geolocation.getCurrentPosition(p=>{locationContext={latitude:+p.coords.latitude.toFixed(4),longitude:+p.coords.longitude.toFixed(4),accuracyMeters:Math.round(p.coords.accuracy||0),capturedAt:new Date().toISOString(),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||null}},()=>{}, {enableHighAccuracy:false,maximumAge:600000,timeout:7000})}catch{}}
function isWeatherQuestion(text){return /\b(weather|temperature|temp|rain|raining|storm|snow|forecast|hot|cold|outside)\b/i.test(text)}
function websiteRequest(text){const m=text.match(/\b(?:build|make|create|design)\s+(?:a\s+)?website\s+(?:for\s+)?(.+)/i);return m?m[1].trim():null}
function isLeadRequest(text){return /\b(find|search|get|look for|scan)\b.*\b(business|businesses|leads|clients)\b/i.test(text)}
function invoiceRequest(text){const m=text.match(/\b(?:invoice|bill|billing)\b[^$0-9]*\$?([0-9]+(?:\.[0-9]{1,2})?)/i);return m?Number(m[1]):null}
function outreachRequest(text){return /\b(?:draft|write|make|create|send)\b.*\b(?:email|message|outreach|pitch)\b/i.test(text)}
async function getWeatherReply(){if(!locationContext)return null;const r=await fetch('/api/weather',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({latitude:locationContext.latitude,longitude:locationContext.longitude})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Weather unavailable');return d.reply}

function openSitePreview(html){stopRecording();siteFrame.srcdoc=html;sitePreview.classList.add('open')}
function closeSite(){sitePreview.classList.remove('open');siteFrame.srcdoc='';if(activated&&!isAsking&&!isSpeaking)startAudioLoop(250)}
if(closePreview)closePreview.addEventListener('click',closeSite);
function openDrawer(title,html){stopRecording();if(drawerTitle)drawerTitle.textContent=title;if(drawerBody)drawerBody.innerHTML=html;hudDrawer?.classList.add('open')}
function closeHud(){hudDrawer?.classList.remove('open');if(activated&&!isAsking&&!isSpeaking)startAudioLoop(250)}
if(closeDrawer)closeDrawer.addEventListener('click',closeHud);

async function buildBusinessSite(details){setStatus('BUILDING','thinking');const r=await fetch('/api/build-site',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({business:details})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Website build failed');openSitePreview(d.html);return`I built a concept website preview for ${details}.`}
async function findLeads(){if(!locationContext)requestLocation();for(let i=0;i<12&&!locationContext;i++)await sleep(250);if(!locationContext)throw new Error('Location needed');setStatus('SEARCHING','thinking');const r=await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({latitude:locationContext.latitude,longitude:locationContext.longitude})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Lead search failed');lastLeads=d.leads||[];return lastLeads.length?`I found ${lastLeads.length} possible leads. I can review and verify them with you.`:'I did not find strong leads in that scan.'}
function showInvoice(amount){return`I made a draft invoice for $${amount.toFixed(2)}. Nothing has been sent or charged.`}

async function speak(text,{continueConversation=true}={}){if(!text)return;isSpeaking=true;stopRecording();setStatus('SPEAKING','speaking');showResponse(text);try{for(const part of splitSpeech(text))await playVoiceChunk(part)}catch{try{await systemSpeech(text)}catch{}}finally{isSpeaking=false;if(continueConversation&&activated)startAudioLoop(180);else setStatus('READY')}}

async function ask(text){text=String(text||'').trim();if(!text||isAsking)return;isAsking=true;stopRecording();setStatus('THINKING','thinking');showResponse(text);try{
  let reply=null;const site=websiteRequest(text),amount=invoiceRequest(text);
  if(site)reply=await buildBusinessSite(site);
  else if(isLeadRequest(text))reply=await findLeads();
  else if(amount)reply=showInvoice(amount);
  else if(isWeatherQuestion(text)){if(!locationContext)requestLocation();for(let i=0;i<8&&!locationContext;i++)await sleep(250);if(locationContext)reply=await getWeatherReply()}
  if(!reply){let enhanced=text;if(outreachRequest(text)&&lastLeads[0])enhanced+=`\nUse this lead context only: ${JSON.stringify(lastLeads[0])}. Draft only unless the owner explicitly approves sending.`;const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:enhanced,history:history.slice(-40),context:{location:locationContext,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||null,localTime:new Date().toISOString(),device:'phone',conversationMode:true}})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Request failed');reply=d.reply}
  history.push({role:'user',content:text},{role:'assistant',content:reply});history=history.slice(-40);saveHistory();
  if(!sitePreview?.classList.contains('open')&&!hudDrawer?.classList.contains('open'))await speak(reply,{continueConversation:true});else showResponse(reply);
}catch(e){console.warn(e);await speak('I had trouble with that. Try me again.',{continueConversation:true})}finally{isAsking=false}}

async function handleTranscript(said){said=String(said||'').trim();if(!said)return;const clean=said.replace(/^\s*(?:hey\s+)?(?:j|jay|jarvis)\s*[,.:;-]?\s*/i,'').trim();await ask(clean||said)}

function startAudioLoop(delay=180){if(!activated||!stream||isAsking||isSpeaking||processingAudio||sitePreview?.classList.contains('open')||hudDrawer?.classList.contains('open'))return;clearTimeout(recordTimer);recordTimer=setTimeout(()=>{if(!activated||isAsking||isSpeaking||processingAudio)return;const chunks=[];let mr;try{const preferred=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(t=>MediaRecorder.isTypeSupported?.(t));mr=preferred?new MediaRecorder(stream,{mimeType:preferred}):new MediaRecorder(stream)}catch{mr=new MediaRecorder(stream)}recorder=mr;mr.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};mr.onstop=async()=>{recorder=null;if(!chunks.length){startAudioLoop(120);return}processingAudio=true;try{const blob=new Blob(chunks,{type:chunks[0]?.type||mr.mimeType||'audio/mp4'});const said=await transcribe(blob);if(said)await handleTranscript(said)}catch(e){console.warn('STT error',e)}finally{processingAudio=false;if(activated&&!isAsking&&!isSpeaking)startAudioLoop(120)}};mr.start();setStatus('LISTENING','listening');setTimeout(()=>{if(mr.state!=='inactive')mr.stop()},3200)},delay)}

async function activate(){if(activated)return;if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){setStatus('VOICE NOT SUPPORTED');return}if(activateBtn){activateBtn.disabled=true;activateBtn.textContent='Starting…'}if(audioStatus)audioStatus.textContent='Enabling microphone…';try{
  await unlockAudioContext();
  await window.JPhoneAudio?.prepare?.();
  stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
  activated=true;requestLocation();
  if(activateBtn)activateBtn.classList.add('hidden');
  if(audioStatus)audioStatus.textContent=window.JPhoneAudio?.describe?.()||'Audio ready · conversation mode';
  await speak(history.length?'J online. I am listening.':'J online. Just talk to me.',{continueConversation:true});
}catch(e){activated=false;if(activateBtn){activateBtn.disabled=false;activateBtn.textContent='J';activateBtn.classList.remove('hidden')}if(audioStatus)audioStatus.textContent='Microphone permission needed';setStatus('MIC PERMISSION NEEDED')}}

if('speechSynthesis'in window)speechSynthesis.onvoiceschanged=()=>speechSynthesis.getVoices();
if(activateBtn)activateBtn.addEventListener('click',activate);
window.addEventListener('load',()=>setStatus('READY'));
document.addEventListener('visibilitychange',()=>{if(activated&&!isAsking&&!isSpeaking&&!processingAudio)startAudioLoop(120)});
window.ask=ask;window.speak=speak;window.activateJ=activate;window.JConversation={start:activate,ask,speak,get active(){return activated}};
