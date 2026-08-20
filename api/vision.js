function getText(data){if(typeof data?.output_text==='string'&&data.output_text.trim())return data.output_text.trim();const parts=[];for(const item of data?.output||[]){if(item?.type!=='message')continue;for(const c of item.content||[])if(c?.type==='output_text'&&typeof c.text==='string')parts.push(c.text)}return parts.join('\n').trim()}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'POST only'});
  if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:'Vision is not configured yet. Add OPENAI_API_KEY on Vercel.'});
  const image=typeof req.body?.image==='string'?req.body.image:'';
  const question=typeof req.body?.question==='string'&&req.body.question.trim()?req.body.question.trim():'Describe what is on this screen and identify anything important or actionable.';
  if(!/^data:image\/(png|jpeg|webp);base64,/i.test(image))return res.status(400).json({error:'Valid image frame required'});
  if(image.length>7000000)return res.status(413).json({error:'Image frame is too large'});
  try{
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_VISION_MODEL||'gpt-5.6',instructions:'You are J Vision. Analyze only what is visibly present in the supplied frame. Do not invent hidden details. Be concise, practical, and safety-conscious. If the user asks for an action that changes their computer or account, describe the action but require explicit approval before any execution.',input:[{role:'user',content:[{type:'input_text',text:question},{type:'input_image',image_url:image}]}],max_output_tokens:800})});
    const data=await r.json();
    if(!r.ok)return res.status(r.status>=500?502:r.status).json({error:data?.error?.message||'Vision request failed'});
    const reply=getText(data);if(!reply)return res.status(502).json({error:'Vision returned no analysis'});
    return res.status(200).json({reply,model:data.model||process.env.OPENAI_VISION_MODEL||'gpt-5.6'});
  }catch(e){console.error('J vision failure',e);return res.status(500).json({error:'J could not analyze the frame'})}
}
