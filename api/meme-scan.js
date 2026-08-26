export default async function handler(req,res){
  if(req.method!=='GET'&&req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  try{
    const input=req.method==='GET'?req.query:(req.body||{});
    const q=String(input.q||input.symbol||input.token||'').trim();
    if(!q) return res.status(400).json({error:'Token symbol, name, or address required'});
    const url=`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`;
    const r=await fetch(url,{headers:{accept:'application/json','user-agent':'J-Meme-Watcher/1.0'}});
    if(!r.ok) throw new Error(`Market data provider returned ${r.status}`);
    const data=await r.json();
    const pairs=(Array.isArray(data.pairs)?data.pairs:[]).slice(0,20).map(p=>({
      chainId:p.chainId||'',dexId:p.dexId||'',pairAddress:p.pairAddress||'',
      baseToken:p.baseToken||{},quoteToken:p.quoteToken||{},priceUsd:Number(p.priceUsd||0),
      liquidityUsd:Number(p.liquidity?.usd||0),fdv:Number(p.fdv||0),marketCap:Number(p.marketCap||0),
      volume24h:Number(p.volume?.h24||0),volume6h:Number(p.volume?.h6||0),volume1h:Number(p.volume?.h1||0),
      buys24h:Number(p.txns?.h24?.buys||0),sells24h:Number(p.txns?.h24?.sells||0),
      change24h:Number(p.priceChange?.h24||0),change6h:Number(p.priceChange?.h6||0),change1h:Number(p.priceChange?.h1||0),
      pairCreatedAt:p.pairCreatedAt||null,url:p.url||''
    }));
    return res.status(200).json({ok:true,query:q,source:'DexScreener',pairs,readOnly:true,scannedAt:new Date().toISOString()});
  }catch(e){
    return res.status(500).json({error:e.message||'Meme scan failed'});
  }
}
