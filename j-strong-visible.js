(()=>{
  if(window.JStrongVisible)return;
  const style=document.createElement('style');
  style.textContent=`
  @media(max-width:1000px){
    .jStrongRail{display:grid!important;right:12px!important;top:116px!important;bottom:118px!important;width:150px!important;gap:7px!important}
    .jStrongCard{padding:9px!important;border-radius:13px!important}
    .jStrongCard .v{font-size:15px!important}
    .jStrongCard .s{font-size:7px!important}
    .jStrongActions{left:18px!important;right:178px!important;bottom:62px!important;overflow:auto!important;flex-wrap:nowrap!important;padding-bottom:2px!important}
    .jStrongAction{flex:0 0 auto!important;padding:7px 9px!important}
  }
  @media(max-width:760px){
    .jStrongRail{position:absolute!important;left:14px!important;right:14px!important;top:auto!important;bottom:112px!important;width:auto!important;height:104px!important;display:grid!important;grid-template-columns:repeat(3,1fr)!important;grid-template-rows:1fr!important}
    .jStrongCard{min-height:0!important}
    .jStrongCard .s{display:none!important}
    .jStrongActions{right:14px!important;bottom:62px!important}
  }
  .jStrongVersion{position:absolute;z-index:12;right:18px;top:82px;border:1px solid #7ae9ff38;background:#041018e8;color:#9feeff;border-radius:999px;padding:5px 8px;font-size:7px;letter-spacing:.12em;box-shadow:0 0 18px #56ddff18}
  `;
  document.head.appendChild(style);
  function mark(){
    const d=document.querySelector('.jDash');
    if(!d||d.querySelector('.jStrongVersion'))return;
    const b=document.createElement('div');
    b.className='jStrongVersion';
    b.textContent='J STRONG · V2';
    d.appendChild(b);
  }
  const obs=new MutationObserver(mark);
  obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  window.addEventListener('load',()=>setTimeout(()=>{window.JStrongCenter?.render?.();mark()},250));
  setTimeout(()=>{window.JStrongCenter?.render?.();mark()},500);
  window.JStrongVisible={mark};
})();