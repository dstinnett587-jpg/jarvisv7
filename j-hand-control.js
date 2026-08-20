import { FilesetResolver, HandLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm';

const tablet=document.getElementById('jTablet');
const movable=()=>[tablet,...document.querySelectorAll('.hud')].filter(Boolean);
let stream=null,video=null,landmarker=null,running=false,grabbed=null,grabOffset={x:0,y:0};
let lastX=null,lastY=null,lastT=0,lastSwipe=0,palmSince=0;

const style=document.createElement('style');
style.textContent=`
.jHands{position:fixed;z-index:85;right:14px;top:14px;width:210px;border:1px solid #ffffff28;border-radius:16px;background:#080808e8;color:#fff;padding:11px;backdrop-filter:blur(16px);font:11px/1.35 -apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;display:none}
.jHands.open{display:block}.jHandsHead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.jHandsHead b{font-size:10px;letter-spacing:.12em}.jHandsHead button,.jHandsBtns button{border:1px solid #ffffff25;background:#121212;color:#fff;border-radius:999px;padding:7px 9px;font-size:9px;font-weight:800}.jHandsStatus{color:#aaa;font-size:9px;line-height:1.5;margin-bottom:8px}.jHandsBtns{display:flex;gap:6px;flex-wrap:wrap}.jHandCursor{position:fixed;z-index:90;width:22px;height:22px;margin:-11px 0 0 -11px;border:2px solid #fff;border-radius:50%;pointer-events:none;display:none;box-shadow:0 0 18px #fff8}.jHandCursor.on{display:block}.jHandCursor.pinch{background:#fff3;transform:scale(.72)}.jHandToast{position:fixed;z-index:91;left:50%;top:16px;transform:translateX(-50%);padding:8px 12px;border:1px solid #ffffff2a;border-radius:999px;background:#090909e8;color:#fff;font-size:10px;font-weight:800;letter-spacing:.08em;opacity:0;transition:.18s;pointer-events:none}.jHandToast.show{opacity:1}
`;
document.head.appendChild(style);

const panel=document.createElement('section');panel.className='jHands';panel.innerHTML='<div class="jHandsHead"><b>J · HAND CONTROL</b><button data-hclose>×</button></div><div class="jHandsStatus" data-hstatus>Ready. Camera permission is required.</div><div class="jHandsBtns"><button data-hstart>Start Hands</button><button data-hstop>Stop</button></div><div class="jHandsStatus" style="margin-top:8px">Pinch = grab/move · Point = select · Swipe = switch tab · Open palm = pause Business Mode</div>';
document.body.appendChild(panel);
const cursor=document.createElement('div');cursor.className='jHandCursor';document.body.appendChild(cursor);
const toast=document.createElement('div');toast.className='jHandToast';document.body.appendChild(toast);
const status=panel.querySelector('[data-hstatus]');
let toastTimer=null;
function note(text){status.textContent=text;toast.textContent=text;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),1200);window.JSafety?.log?.('hand-control',text)}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function extended(lm,tip,pip){return lm[tip].y<lm[pip].y}
function openPalm(lm){return extended(lm,8,6)&&extended(lm,12,10)&&extended(lm,16,14)&&extended(lm,20,18)}
function pointPose(lm){return extended(lm,8,6)&&!extended(lm,12,10)&&!extended(lm,16,14)&&!extended(lm,20,18)}
function nearestTarget(x,y){let best=null,bd=Infinity;for(const el of movable()){if(!el||getComputedStyle(el).display==='none')continue;const r=el.getBoundingClientRect();const cx=Math.max(r.left,Math.min(x,r.right)),cy=Math.max(r.top,Math.min(y,r.bottom));const d=Math.hypot(x-cx,y-cy);if(d<bd&&d<90){best=el;bd=d}}return best}
function setPos(el,x,y){const r=el.getBoundingClientRect(),nx=Math.max(6,Math.min(innerWidth-r.width-6,x)),ny=Math.max(6,Math.min(innerHeight-r.height-6,y));el.style.left=nx+'px';el.style.top=ny+'px';el.style.right='auto';el.style.bottom='auto';el.style.transform='none'}
function swipe(dir){const tabs=[...document.querySelectorAll('[data-jtab]')];if(!tabs.length)return;const active=Math.max(0,tabs.findIndex(x=>x.classList.contains('active')));const next=(active+(dir==='left'?1:-1)+tabs.length)%tabs.length;tabs[next].click();note(`Switched to ${tabs[next].textContent.trim()}`)}
function clickAt(x,y){const el=document.elementFromPoint(x,y);const btn=el?.closest?.('button,[data-panel]');if(btn){btn.click();note('Selected')}}
function process(lm,now){const index=lm[8],thumb=lm[4];const x=(1-index.x)*innerWidth,y=index.y*innerHeight;cursor.style.left=x+'px';cursor.style.top=y+'px';cursor.classList.add('on');const pinch=dist(index,thumb)<.055;cursor.classList.toggle('pinch',pinch);
  if(pinch&&!grabbed){const target=nearestTarget(x,y);if(target){const r=target.getBoundingClientRect();grabbed=target;grabOffset={x:x-r.left,y:y-r.top};note('Grabbed panel')}}
  if(pinch&&grabbed)setPos(grabbed,x-grabOffset.x,y-grabOffset.y);
  if(!pinch&&grabbed){grabbed=null;note('Released panel')}
  if(pointPose(lm)&&!pinch){if(lastX!==null&&now-lastT<220&&now-lastSwipe>850){const dx=x-lastX;if(Math.abs(dx)>150){swipe(dx<0?'left':'right');lastSwipe=now}}}
  if(openPalm(lm)){if(!palmSince)palmSince=now;if(now-palmSince>900&&window.JSafety&&!window.JSafety.paused()){window.JSafety.setPaused(true);note('Business Mode paused');palmSince=now+999999}}else palmSince=0;
  if(pointPose(lm)&&!pinch&&lastX!==null&&Math.hypot(x-lastX,y-lastY)<12&&now-lastT>0){/* hover only; click stays deliberate via pinch release */}
  if(!pinch&&lastX!==null&&Math.hypot(x-lastX,y-lastY)<8&&now-lastT>650&&pointPose(lm)){clickAt(x,y);lastT=now+1000}else{lastX=x;lastY=y;lastT=now}
}
async function initModel(){if(landmarker)return;note('Loading hand tracker…');const vision=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm');landmarker=await HandLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:'GPU'},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.55,minHandPresenceConfidence:.55,minTrackingConfidence:.5});}
async function start(){if(running)return;await initModel();stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:960},height:{ideal:540}},audio:false});video=document.createElement('video');video.srcObject=stream;video.muted=true;video.playsInline=true;await video.play();running=true;note('Hand control live');requestAnimationFrame(loop)}
function stop(){running=false;grabbed=null;cursor.classList.remove('on','pinch');stream?.getTracks?.().forEach(t=>t.stop());stream=null;video=null;note('Hand control stopped')}
function loop(now){if(!running||!video||!landmarker)return;try{const r=landmarker.detectForVideo(video,now);const lm=r.landmarks?.[0];if(lm)process(lm,now);else{cursor.classList.remove('on');grabbed=null}}catch(e){console.warn('J hand control',e)}requestAnimationFrame(loop)}
function open(){panel.classList.add('open')}
panel.querySelector('[data-hclose]').onclick=()=>panel.classList.remove('open');
panel.querySelector('[data-hstart]').onclick=()=>start().catch(e=>note(e?.message||'Hand control failed'));
panel.querySelector('[data-hstop]').onclick=stop;
const quick=document.querySelector('.jQuick');if(quick&&!quick.querySelector('[data-jq="hands"]')){const b=document.createElement('button');b.dataset.jq='hands';b.textContent='Hand Control';quick.prepend(b);b.addEventListener('click',open)}
const oldAsk=window.ask;if(typeof oldAsk==='function'){window.ask=async function(text){const t=String(text||'').toLowerCase();if(/\b(hand control|hands|gesture control|move.*hand)\b/.test(t)){open();if(/\b(start|enable|turn on)\b/.test(t))try{await start()}catch(e){note(e?.message||'Hand control failed')}if(/\b(stop|disable|turn off)\b/.test(t))stop();return}return oldAsk(text)}}
window.JHands={open,start,stop,get running(){return running}};
