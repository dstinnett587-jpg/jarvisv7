(()=>{
  if(window.JFreezeGuard)return;
  const style=document.createElement('style');
  style.textContent=`
    body.jLiteMotion #orb{filter:none!important}
    body.jLiteMotion .orbWrap{filter:none!important;transition:transform .2s ease!important}
    body.jLiteMotion .orbHalo{filter:blur(8px)!important;animation:none!important;opacity:.28!important}
    body.jLiteMotion .workspace{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;clip-path:none!important;transition:opacity .16s ease,transform .2s ease!important}
    body.jLiteMotion .jDash,body.jLiteMotion .jStrongCard,body.jLiteMotion .jBrief{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
  `;
  document.head.appendChild(style);
  const lowPower=()=>{const c=navigator.hardwareConcurrency||4;const mem=navigator.deviceMemory||4;return c<=4||mem<=4||innerWidth<1200};
  if(lowPower())document.body.classList.add('jLiteMotion');
  const btn=document.getElementById('activateBtn');
  if(btn)btn.addEventListener('pointerdown',()=>document.body.classList.add('jLiteMotion'),{passive:true,capture:true});
  let last=performance.now(),bad=0;
  function watch(now){const gap=now-last;last=now;if(gap>180)bad++;else bad=Math.max(0,bad-1);if(bad>=2){document.body.classList.add('jLiteMotion');bad=0}setTimeout(()=>requestAnimationFrame(watch),350)}
  requestAnimationFrame(watch);
  window.JFreezeGuard={lite:()=>document.body.classList.add('jLiteMotion'),normal:()=>document.body.classList.remove('jLiteMotion')};
})();