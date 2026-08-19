export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({error:'Method not allowed'});
  }

  const apiKey=process.env.GROQ_API_KEY;
  if(!apiKey)return res.status(500).json({error:'ALFRED voice is not configured'});

  const text=typeof req.body?.text==='string'?req.body.text.trim():'';
  if(!text)return res.status(400).json({error:'Text is required'});
  if(text.length>200)return res.status(400).json({error:'Voice text must be 200 characters or less'});

  // Orpheus supports bracketed vocal directions. Keep them subtle for a polished cinematic assistant feel.
  const directed=`[formally] [calmly] ${text}`.slice(0,200);

  try{
    const response=await fetch('https://api.groq.com/openai/v1/audio/speech',{
      method:'POST',
      headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:process.env.ALFRED_TTS_MODEL||process.env.JARVIS_TTS_MODEL||'canopylabs/orpheus-v1-english',
        voice:process.env.ALFRED_VOICE||process.env.JARVIS_VOICE||'troy',
        input:directed,
        response_format:'wav'
      })
    });

    if(!response.ok){
      let detail='ALFRED voice request failed';
      try{const data=await response.json();detail=data?.error?.message||detail}catch{}
      console.error('Groq TTS error',response.status,detail);
      return res.status(502).json({error:detail});
    }

    const audio=Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type','audio/wav');
    res.setHeader('Content-Length',String(audio.length));
    return res.status(200).send(audio);
  }catch(error){
    console.error('ALFRED TTS failure',error);
    return res.status(500).json({error:'ALFRED voice service is unavailable'});
  }
}
