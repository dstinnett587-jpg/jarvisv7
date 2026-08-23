const DEFAULT=['AAPL','NVDA','TSLA','AMD','META','AMZN','MSFT','SPY'];
const clean=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9.^-]/g,'').slice(0,12);
async function quote(symbol){
  const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d&includePrePost=true`;
  const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'}});
  if(!r.ok)throw new Error(`Quote failed for ${symbol}`);
  const d=await r.json();
  const c=d?.chart?.result?.[0];
  if(!c)throw new Error(`No quote for ${symbol}`);
  const m=c.meta||{},closes=c.indicators?.quote?.[0]?.close||[];
  let price=Number(m.regularMarketPrice);
  if(!Number.isFinite(price)){for(let i=closes.length-1;i>=0;i--){if(Number.isFinite(closes[i])){price=closes[i];break}}}
  const prev=Number(m.chartPreviousClose ?? m.previousClose);
  const change=Number.isFinite(price)&&Number.isFinite(prev)?price-prev:null;
  const changePct=Number.isFinite(change)&&prev?change/prev*100:null;
  return {symbol,price,previousClose:prev,change,changePct,currency:m.currency||'USD',exchange:m.exchangeName||'',marketState:m.marketState||'',timestamp:m.regularMarketTime?m.regularMarketTime*1000:Date.now()};
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'})}
  const requested=String(req.query?.symbols||'').split(',').map(clean).filter(Boolean).slice(0,12);
  const symbols=requested.length?requested:DEFAULT;
  const settled=await Promise.allSettled(symbols.map(quote));
  const quotes=settled.filter(x=>x.status==='fulfilled').map(x=>x.value);
  if(!quotes.length)return res.status(502).json({error:'Live market data unavailable'});
  return res.status(200).json({quotes,updatedAt:Date.now(),source:'Yahoo Finance chart feed',note:'Quotes may be delayed depending on exchange/data policy.'});
}