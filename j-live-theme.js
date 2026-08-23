(()=>{
  if(window.JLiveTheme)return;
  const style=document.createElement('style');
  style.textContent=`
  :root{--j-cyan:#78e8ff;--j-blue:#4da3ff;--j-line:#78e8ff25;--j-panel:#071017ee;--j-glow:0 0 28px #45c8ff22}
  .jDash{inset:3.5% 3.2%!important;border-radius:30px!important;border:1px solid #74e8ff36!important;background:
    radial-gradient(circle at 18% 12%,#0b2230dd 0,transparent 28%),
    radial-gradient(circle at 84% 8%,#10213add 0,transparent 24%),
    linear-gradient(145deg,#05090df7,#020406fb)!important;
    box-shadow:0 35px 130px #000,0 0 85px #43d8ff1f,inset 0 0 80px #4ed8ff09!important}
  .jDash:before{content:'';position:absolute;inset:0;pointer-events:none;background:
    linear-gradient(90deg,transparent 49.8%,#6ee7ff0b 50%,transparent 50.2%),
    linear-gradient(transparent 49.8%,#6ee7ff08 50%,transparent 50.2%);
    background-size:58px 58px;opacity:.38;mask-image:linear-gradient(#000 0,transparent 85%)}
  .jDash:after{content:'';position:absolute;left:0;right:0;top:-35%;height:35%;pointer-events:none;background:linear-gradient(180deg,transparent,#7eeeff0d,transparent);animation:jScan 8s linear infinite}
  @keyframes jScan{to{top:110%}}
  .jDashHead{height:72px!important;padding:0 24px!important;background:linear-gradient(90deg,#07131ae8,#04070bdd)!important;border-bottom:1px solid #78e8ff28!important;box-shadow:0 12px 32px #0008!important}
  .jDashHead b{font-size:16px!important;letter-spacing:.22em!important;text-shadow:0 0 18px #78e8ff66}
  .jDashStatus{color:#9edfff!important;letter-spacing:.14em!important}
  .jDashClose{border-color:#78e8ff38!important;background:#0d1b25cc!important;box-shadow:inset 0 0 16px #78e8ff12!important}
  .jDashGrid{height:calc(100% - 72px)!important;grid-template-columns:1.15fr 1fr .88fr!important;gap:14px!important;padding:16px!important}
  .jTile{position:relative;border:1px solid #78e8ff22!important;border-radius:20px!important;background:linear-gradient(145deg,#0a151ddc,#05080ddf)!important;padding:16px!important;box-shadow:0 18px 45px #0007,inset 0 0 26px #68ddff07!important;transition:.22s ease;overflow:hidden!important}
  .jTile:before{content:'';position:absolute;left:0;top:0;width:44px;height:1px;background:#83ecff;box-shadow:0 0 14px #83ecff}
  .jTile:after{content:'';position:absolute;right:0;bottom:0;width:44px;height:1px;background:#4da3ff70}
  .jTile:hover{transform:translateY(-2px);border-color:#78e8ff55!important;box-shadow:0 22px 50px #0009,0 0 34px #4edcff12!important}
  .jTile.hero{background:
    radial-gradient(circle at 50% 42%,#0e2f3b88 0,transparent 37%),
    linear-gradient(145deg,#0a151ddd,#05080df0)!important}
  .jTile.hero:before{width:90px}
  .jTile .eyebrow{color:#65dfff!important;font-size:8px!important;letter-spacing:.22em!important}
  .jTile h3{font-size:16px!important;letter-spacing:.02em!important;margin:8px 0 10px!important}
  .jTile .big{font-size:30px!important;letter-spacing:.08em!important;text-shadow:0 0 20px #7ceaff33}
  .jTile .muted{color:#91a5b1!important;line-height:1.6!important}
  .jRow{border-top:1px solid #78e8ff12!important;padding:10px 0!important;align-items:center!important}
  .jRow span{color:#b8cbd4}.jRow strong{font-size:9px;letter-spacing:.12em;color:#bff5ff;text-shadow:0 0 10px #69e3ff44}
  .jPulse{background:#85efff!important;box-shadow:0 0 14px #73e6ff!important}
  .jStockGrid{gap:4px!important}.jStockRow{grid-template-columns:48px 1fr 78px!important;border-top:1px solid #78e8ff12!important;padding:8px 4px!important;border-radius:8px;transition:.18s}
  .jStockRow:hover{background:#78e8ff0a!important;box-shadow:inset 2px 0 #73e7ff}
  .jStockRow b{color:#dffaff!important;letter-spacing:.06em}.jStockPrice{font-weight:700;color:#fff}.jStockUp{color:#91ffc1!important}.jStockDown{color:#ff9aa7!important}
  .jStockMeta{color:#6f8c9b!important;border-top:1px dashed #78e8ff16;padding-top:7px}
  .jFloat{border-color:#78e8ff36!important;background:linear-gradient(145deg,#071118f7,#020407fb)!important;box-shadow:0 28px 100px #000,0 0 55px #58d9ff1b!important}
  .jFloatHead{background:#08131be8;border-bottom-color:#78e8ff20!important}.jFloatHead b{color:#dffaff;text-shadow:0 0 12px #72e6ff40}
  .jLiveChip{border-color:#78e8ff2e!important;color:#8fdfff!important;background:#041015dd!important;box-shadow:0 0 20px #4fdcff14}
  .jHeard{border-color:#78e8ff2d!important;color:#a7eaff!important;background:#061116ec!important}
  .jDash .jTile:nth-child(2){box-shadow:0 18px 45px #0007,inset 0 0 38px #315dff09!important}
  .jDash .jTile:nth-child(3){box-shadow:0 18px 45px #0007,inset 0 0 38px #8a5dff08!important}
  .jDash .jTile:nth-child(4){box-shadow:0 18px 45px #0007,inset 0 0 38px #34ffab08!important}
  .jDash .jTile:nth-child(5){box-shadow:0 18px 45px #0007,inset 0 0 38px #ffd65c08!important}
  .jDashBrandOrb{width:92px;height:92px;margin:18px auto 12px;border-radius:50%;position:relative;background:radial-gradient(circle,#d9fbff 0 2%,#79e8ff22 12%,transparent 58%);box-shadow:0 0 38px #6ee8ff24}
  .jDashBrandOrb:before,.jDashBrandOrb:after{content:'';position:absolute;border-radius:50%;inset:10px;border:1px solid #75e8ff52;animation:jRing 9s linear infinite}.jDashBrandOrb:after{inset:25px;border-style:dashed;animation-duration:5s;animation-direction:reverse}
  @keyframes jRing{to{transform:rotate(360deg)}}
  .jDashTopline{display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap}.jHudPill{font-size:8px;letter-spacing:.12em;padding:6px 8px;border:1px solid #78e8ff20;border-radius:999px;background:#07131a;color:#8fdfff}
  @media(max-width:850px){.jDashGrid{grid-template-columns:1fr 1fr!important}.jTile.hero{grid-column:1/3!important}}
  `;
  document.head.appendChild(style);
  function enhance(){
    const dash=document.querySelector('.jDash');
    if(!dash||dash.dataset.cool==='1')return;
    dash.dataset.cool='1';
    const hero=dash.querySelector('.jTile.hero');
    if(hero){
      const big=hero.querySelector('.big');
      if(big&&!hero.querySelector('.jDashBrandOrb')){
        const orb=document.createElement('div');orb.className='jDashBrandOrb';big.after(orb);
        const pills=document.createElement('div');pills.className='jDashTopline';pills.innerHTML='<span class="jHudPill">CORE ONLINE</span><span class="jHudPill">RADAR ACTIVE</span><span class="jHudPill">CROSS-DEVICE</span>';orb.after(pills);
      }
    }
  }
  const obs=new MutationObserver(enhance);obs.observe(document.documentElement,{subtree:true,childList:true});
  enhance();
  window.JLiveTheme={enhance};
})();