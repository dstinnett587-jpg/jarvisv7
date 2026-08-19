export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const apiKey=process.env.GROQ_API_KEY;
  if(!apiKey)return res.status(500).json({ok:false,error:'missing GROQ_API_KEY'});
  try{
    const r=await fetch('https://api.groq.com/openai/v1/audio/speech',{
      method:'POST',
      headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({model:process.env.JARVIS_TTS_MODEL||'canopylabs/orpheus-v1-english',voice:process.env.JARVIS_VOICE||'troy',input:'Alfred online.',response_format:'wav'})
    });
    const ct=r.headers.get('content-type')||'';
    if(!r.ok){let detail='request failed';try{const d=await r.json();detail=d?.error?.message||detail}catch{};return res.status(200).json({ok:false,status:r.status,error:detail})}
    const buf=Buffer.from(await r.arrayBuffer());
    return res.status(200).json({ok:true,status:r.status,contentType:ct,bytes:buf.length,voice:process.env.JARVIS_VOICE||'troy'});
  }catch(e){return res.status(200).json({ok:false,error:e.message||'probe failed'})}
}
