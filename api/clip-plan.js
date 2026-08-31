export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const {streamer='',transcript=''}=req.body||{};
  if(!transcript.trim())return res.status(400).json({error:'Transcript required'});
  const system=`You are J's short-form clip editor. Analyze a streamer transcript and identify 5-8 high-retention moments suitable for short-form video. Return concise plain text. For each clip include: timestamp range if present, hook/title, why it could perform, recommended duration, and a transformation idea such as commentary, context, reaction framing, captions, or analysis. Do not encourage simple unaltered reposting of copyrighted footage. Optimize for YouTube Shorts, TikTok, Instagram Reels, and Facebook Reels.`;
  const input=`Streamer/source: ${streamer||'Unknown'}\n\nTranscript:\n${transcript.slice(0,24000)}`;
  try{
    if(process.env.GROQ_API_KEY){
      const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${process.env.GROQ_API_KEY}`},body:JSON.stringify({model:'llama-3.3-70b-versatile',temperature:.4,messages:[{role:'system',content:system},{role:'user',content:input}]})});
      const d=await r.json();
      if(!r.ok)throw new Error(d?.error?.message||'Groq request failed');
      return res.status(200).json({ok:true,plan:d.choices?.[0]?.message?.content||''});
    }
    if(process.env.OPENAI_API_KEY){
      const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',instructions:system,input})});
      const d=await r.json();
      if(!r.ok)throw new Error(d?.error?.message||'OpenAI request failed');
      const text=d.output_text||d.output?.flatMap(x=>x.content||[]).map(x=>x.text||'').join('\n')||'';
      return res.status(200).json({ok:true,plan:text});
    }
    return res.status(503).json({error:'No AI provider configured'});
  }catch(e){return res.status(500).json({error:e.message||'Clip planning failed'})}
}
