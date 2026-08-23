function originFrom(req){const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim();const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();return host?`${proto}://${host}`:''}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const configured=Boolean(process.env.STRIPE_SECRET_KEY);
  if(req.method==='GET') return res.status(200).json({ok:true,configured,mode:process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')?'live':'test'});
  if(req.method!=='POST') return res.status(405).json({ok:false,error:'GET or POST only'});
  if(!configured) return res.status(503).json({ok:false,error:'Stripe is not connected to this Vercel project yet.'});
  try{
    const amount=Number(req.body?.amount);
    const description=String(req.body?.description||'Website design services').trim().slice(0,120);
    if(!Number.isFinite(amount)||amount<1||amount>25000) return res.status(400).json({ok:false,error:'Amount must be between $1 and $25,000.'});
    const unitAmount=Math.round(amount*100);
    const origin=process.env.NEXT_PUBLIC_APP_URL||process.env.APP_URL||originFrom(req);
    if(!origin) return res.status(500).json({ok:false,error:'App URL is not configured.'});
    const form=new URLSearchParams();
    form.set('mode','payment');
    form.set('success_url',`${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`);
    form.set('cancel_url',`${origin}/?payment=cancelled`);
    form.set('line_items[0][quantity]','1');
    form.set('line_items[0][price_data][currency]','usd');
    form.set('line_items[0][price_data][unit_amount]',String(unitAmount));
    form.set('line_items[0][price_data][product_data][name]',description||'Website design services');
    form.set('payment_intent_data[description]',description||'Website design services');
    form.set('metadata[source]','jarvis-wallet');
    const stripeRes=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`,'Content-Type':'application/x-www-form-urlencoded'},body:form});
    const data=await stripeRes.json();
    if(!stripeRes.ok) return res.status(stripeRes.status).json({ok:false,error:data?.error?.message||'Stripe could not create the checkout.'});
    return res.status(200).json({ok:true,url:data.url,id:data.id,amount,description,mode:process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')?'live':'test'});
  }catch(e){return res.status(500).json({ok:false,error:e?.message||'Payment link failed.'})}
}
