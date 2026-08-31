const INSTRUCTIONS=`You are J, the user's personal AI companion. Reply naturally and briefly for a phone chat. Preserve context supplied in history. Be action-oriented, but never claim an external action completed unless a connected tool actually completed it.`;
function provider(){if(process.env.GROQ_API_KEY)return{key:process.env.GROQ_API_KEY,base:'https://api.groq.com/openai/v1',model:process.env.GROQ_MODEL||'openai/gpt-oss-20b'};if(process.env.OPENAI_API_KEY)return{key:process.env.OPENAI_API_KEY,base:'https://api.openai.com/v1',model:process.env.OPENAI_MODEL||'gpt-5.6'};return null}
function history(v){return Array.isArray(v)?v.slice(-20).filter(x=>x&&(x.role==='user'||x.role==='assistant')&&typeof x.content==='string').map(x=>({role:x.role,content:x.content.slice(0,6000)})):[]}
function text(data){if(typeof data?.output_text==='string')return data.output_text.trim();const out=[];for(const item of data?.output||[])for(const c of item?.content||[])if(c?.type==='output_text'&&c.text)out.push(c.text);return out.join('\n').trim()}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'})}
 const secret=process.env.J_REMOTE_COMMAND_TOKEN;
 if(!secret)return res.status(503).json({error:'Remote J bridge is not configured'});
 if((req.headers.authorization||'')!==`Bearer ${secret}`)return res.status(401).json({error:'Unauthorized'});
 const message=String(req.body?.message||'').trim();if(!message)return res.status(400).json({error:'Message is required'});if(message.length>6000)return res.status(400).json({error:'Message is too long'});
 const p=provider();if(!p)return res.status(503).json({error:'J has no AI provider configured'});
 try{const r=await fetch(`${p.base}/responses`,{method:'POST',headers:{Authorization:`Bearer ${p.key}`,'Content-Type':'application/json'},body:JSON.stringify({model:p.model,instructions:INSTRUCTIONS,input:[...history(req.body?.history),{role:'user',content:message}]})});const d=await r.json();if(!r.ok)return res.status(502).json({error:d?.error?.message||'J remote chat failed'});const reply=text(d);if(!reply)return res.status(502).json({error:'J returned an empty response'});return res.status(200).json({ok:true,reply,model:d.model||p.model})}catch(e){console.error('J remote chat error',e);return res.status(500).json({error:'J remote chat could not reach the AI service'})}
}