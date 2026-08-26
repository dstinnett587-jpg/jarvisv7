const UA='J-Meme-Discovery/1.0';
const n=v=>Number(v||0);
function normalize(p,source='discovery'){
  return {source,chainId:p.chainId||'',dexId:p.dexId||'',pairAddress:p.pairAddress||'',baseToken:p.baseToken||{},quoteToken:p.quoteToken||{},priceUsd:n(p.priceUsd),liquidityUsd:n(p.liquidity?.usd),fdv:n(p.fdv),marketCap:n(p.marketCap),volume24h:n(p.volume?.h24),volume6h:n(p.volume?.h6),volume1h:n(p.volume?.h1),buys24h:n(p.txns?.h24?.buys),sells24h:n(p.txns?.h24?.sells),buys1h:n(p.txns?.h1?.buys),sells1h:n(p.txns?.h1?.sells),change24h:n(p.priceChange?.h24),change6h:n(p.priceChange?.h6),change1h:n(p.priceChange?.h1),pairCreatedAt:p.pairCreatedAt||null,url:p.url||'',boosts:n(p.boosts?.active),hasWebsite:Boolean(p.info?.websites?.length),socialCount:Array.isArray(p.info?.socials)?p.info.socials.length:0};
}
async function json(url){const r=await fetch(url,{headers:{accept:'application/json','user-agent':UA}});if(!r.ok)throw new Error(`Market data provider returned ${r.status}`);return r.json()}
export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  try{
    const [profiles,boosted]=await Promise.all([
      json('https://api.dexscreener.com/token-profiles/latest/v1').catch(()=>[]),
      json('https://api.dexscreener.com/token-boosts/top/v1').catch(()=>[])
    ]);
    const seeds=[];const seen=new Set();
    for(const [source,list] of [['new-profile',profiles],['boosted',boosted]]){
      for(const x of Array.isArray(list)?list:[]){const chain=String(x.chainId||'').trim(),addr=String(x.tokenAddress||'').trim();const key=chain+':'+addr;if(!chain||!addr||seen.has(key))continue;seen.add(key);seeds.push({chain,addr,source,boostAmount:n(x.amount),boostTotal:n(x.totalAmount)});if(seeds.length>=24)break}
      if(seeds.length>=24)break;
    }
    const groups={};for(const s of seeds)(groups[s.chain]||(groups[s.chain]=[])).push(s);
    const all=[];
    for(const [chain,list] of Object.entries(groups)){
      for(let i=0;i<list.length;i+=30){
        const batch=list.slice(i,i+30),addresses=batch.map(x=>x.addr).join(',');
        const pairs=await json(`https://api.dexscreener.com/tokens/v1/${encodeURIComponent(chain)}/${encodeURIComponent(addresses)}`).catch(()=>[]);
        for(const p of Array.isArray(pairs)?pairs:[]){const addr=p.baseToken?.address||'';const seed=batch.find(x=>x.addr===addr);all.push({...normalize(p,seed?.source||'discovery'),boostAmount:seed?.boostAmount||0,boostTotal:seed?.boostTotal||0})}
      }
    }
    const bestByToken=new Map();
    for(const p of all){const key=p.chainId+':'+(p.baseToken?.address||p.pairAddress);const prev=bestByToken.get(key);if(!prev||p.liquidityUsd>prev.liquidityUsd)bestByToken.set(key,p)}
    const candidates=[...bestByToken.values()].filter(p=>p.priceUsd>0&&p.liquidityUsd>0).sort((a,b)=>(b.volume1h+b.liquidityUsd*.05)-(a.volume1h+a.liquidityUsd*.05)).slice(0,30);
    return res.status(200).json({ok:true,source:'DexScreener',readOnly:true,scannedAt:new Date().toISOString(),candidates});
  }catch(e){return res.status(500).json({error:e.message||'Meme discovery failed'})}
}
