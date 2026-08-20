const ALLOWED=new Set(['find_leads','scan_map','status']);
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'})}
 const secret=process.env.J_REMOTE_COMMAND_TOKEN;
 if(!secret)return res.status(503).json({error:'Remote command bridge is not configured'});
 const auth=req.headers.authorization||'';
 if(auth!==`Bearer ${secret}`)return res.status(401).json({error:'Unauthorized'});
 const action=String(req.body?.action||'').trim();
 if(!ALLOWED.has(action))return res.status(400).json({error:'Unsupported action'});
 const payload=req.body?.payload&&typeof req.body.payload==='object'?req.body.payload:{};
 // Read-only/research commands only. Sending outreach, publishing, and money actions remain approval-gated elsewhere.
 if(action==='status')return res.status(200).json({ok:true,action,status:'ready',at:new Date().toISOString()});
 if(action==='find_leads'||action==='scan_map'){
   const location=String(payload.location||'Dallas, TX').slice(0,120);
   const limit=Math.min(Math.max(Number(payload.limit)||20,1),50);
   return res.status(202).json({ok:true,accepted:true,action,job:{location,limit,criteria:'businesses with no listed website or weak/outdated website'},status:'accepted',note:'Command bridge accepted the research job. Durable worker execution/status wiring is the next layer.'});
 }
}