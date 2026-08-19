export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({error:'Method not allowed'});
  }
  const apiKey=process.env.GROQ_API_KEY;
  if(!apiKey)return res.status(500).json({error:'ALFRED transcription is not configured'});
  const audio=typeof req.body?.audio==='string'?req.body.audio:'';
  const mime=typeof req.body?.mime==='string'?req.body.mime:'audio/webm';
  if(!audio)return res.status(400).json({error:'Audio is required'});
  try{
    const bytes=Buffer.from(audio,'base64');
    if(bytes.length>8*1024*1024)return res.status(413).json({error:'Audio chunk too large'});
    const form=new FormData();
    form.append('file',new Blob([bytes],{type:mime}),'speech.webm');
    form.append('model',process.env.ALFRED_STT_MODEL||'whisper-large-v3-turbo');
    form.append('language','en');
    form.append('response_format','json');
    form.append('temperature','0');
    const response=await fetch('https://api.groq.com/openai/v1/audio/transcriptions',{
      method:'POST',headers:{Authorization:`Bearer ${apiKey}`},body:form
    });
    const data=await response.json();
    if(!response.ok){
      console.error('Groq STT error',response.status,data?.error?.message||'unknown');
      return res.status(502).json({error:data?.error?.message||'Transcription failed'});
    }
    return res.status(200).json({text:typeof data?.text==='string'?data.text.trim():''});
  }catch(error){
    console.error('ALFRED STT failure',error);
    return res.status(500).json({error:'ALFRED transcription service is unavailable'});
  }
}
