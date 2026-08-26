(()=>{
const body=document.getElementById('tabletBody');
if(!body)return;
const AXIOM='https://axiom.trade';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function openUrl(url){window.JSafety?.log?.('axiom-open',url);window.open(url,'_blank','noopener,noreferrer')}
function render(){window.JTablet?.open?.('money');body.innerHTML=`<div class="statusHero">AXIOM WATCH</div><div class="muted">Axiom is now Jay's primary meme-coin workspace. Jay can open the live Axiom views you use and keep DexScreener as a read-only market-data fallback for scoring. Trading still requires your approval.</div><div class="tabletGrid" style="margin-top:12px"><button data-ax="discover"><b>Discover</b><span>Trending / DEX surge</span></button><button data-ax="pulse"><b>Pulse</b><span>Live meme flow</span></button><button data-ax="trackers"><b>Trackers</b><span>Wallets / live trades</span></button><button data-ax="vision"><b>Vision</b><span>KOL / flow view</span></button></div><div style="display:flex;gap:8px;margin-top:12px"><input id="jaxca" placeholder="Paste Solana token CA" style="flex:1;background:#0d0d0d;border:1px solid #333;color:#fff;border-radius:10px;padding:10px"><button id="jaxopen" style="background:#171717;border:1px solid #444;color:#fff;border-radius:10px;padding:10px 12px">Open Token</button></div><div class="log" style="margin-top:12px"><b>HOW J USES AXIOM</b><small>Watch Discover/Pulse for emerging tokens → inspect token page → compare liquidity, volume, buys/sells and momentum → save promising contracts → ask for approval before any trade.</small></div><div class="muted">Axiom pages are highly dynamic and account/session dependent, so Jay will not pretend to have a private Axiom API. The current safe setup watches Axiom as the main interface while using public market data for independent scoring.</div>`;
const routes={discover:'/t/H9kr9cDFdhv3',pulse:'/pulse',trackers:'/trackers',vision:'/vision?chain=sol'};
body.querySelectorAll('[data-ax]').forEach(b=>b.onclick=()=>openUrl(AXIOM+routes[b.dataset.ax]));
body.querySelector('#jaxopen').onclick=()=>{const ca=body.querySelector('#jaxca').value.trim();if(!ca)return;openUrl(`${AXIOM}/meme/${encodeURIComponent(ca)}`)};
}
window.JAxiom={render,open:openUrl};
})();
