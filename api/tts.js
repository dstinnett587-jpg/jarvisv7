async function groqSpeech(text){
  const apiKey=process.env.GROQ_API_KEY;
  if(!apiKey)return null;
  const directed=`[formally] [calmly] ${text}`.slice(0,200);
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
  if(response.ok)return {audio:Buffer.from(await response.arrayBuffer()),provider:'groq'};
  let detail='ALFRED voice request failed';
  try{const data=await response.json();detail=data?.error?.message||detail}catch{}
  console.error('Groq TTS error',response.status,detail);
  return {error:detail,status:response.status};
}

async function openAISpeech(text){
  const apiKey=process.env.OPENAI_API_KEY;
  if(!apiKey)return null;
  const response=await fetch('https://api.openai.com/v1/audio/speech',{
    method:'POST',
    headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      model:process.env.ALFRED_OPENAI_TTS_MODEL||'gpt-4o-mini-tts',
      voice:process.env.ALFRED_OPENAI_VOICE||'onyx',
      input:text.slice(0,200),
      instructions:'Calm, polished, intelligent British-inspired personal assistant. Speak naturally and clearly.',
      response_format:'wav'
    })
  });
  if(response.ok)return {audio:Buffer.from(await response.arrayBuffer()),provider:'openai'};
  let detail='OpenAI backup voice request failed';
  try{const data=await response.json();detail=data?.error?.message||detail}catch{}
  console.error('OpenAI TTS error',response.status,detail);
  return {error:detail,status:response.status};
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'&&req.method!=='GET'){
    res.setHeader('Allow','GET, POST');
    return res.status(405).json({error:'Method not allowed'});
  }
  const text=req.method==='GET'
    ? 'ALFRED online. At your service.'
    : (typeof req.body?.text==='string'?req.body.text.trim():'');
  if(!text)return res.status(400).json({error:'Text is required'});
  if(text.length>200)return res.status(400).json({error:'Voice text must be 200 characters or less'});

  try{
    const primary=await groqSpeech(text);
    let result=primary&&primary.audio?primary:null;
    if(!result){
      const backup=await openAISpeech(text);
      if(backup&&backup.audio)result=backup;
      else if(!process.env.GROQ_API_KEY&&!process.env.OPENAI_API_KEY)return res.status(500).json({error:'ALFRED voice is not configured'});
      else return res.status(502).json({error:backup?.error||primary?.error||'ALFRED voice request failed'});
    }
    res.setHeader('Content-Type','audio/wav');
    res.setHeader('Content-Length',String(result.audio.length));
    res.setHeader('X-Alfred-Voice-Provider',result.provider);
    return res.status(200).send(result.audio);
  }catch(error){
    console.error('ALFRED TTS failure',error);
    return res.status(500).json({error:'ALFRED voice service is unavailable'});
  }
}
