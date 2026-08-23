(()=>{
  let mediaTab=null;
  let lastPlatform=null;
  let mediaContextUntil=0;
  const rememberPlatform=p=>{lastPlatform=p;mediaContextUntil=Date.now()+10*60*1000};
  const currentPlatform=()=>Date.now()<mediaContextUntil?lastPlatform:null;

  function isLocalEditRequest(text){
    const t=String(text||'').toLowerCase();
    return /\b(edit|editing|render|cut|mv chaos)\b/.test(t)&&/\b(show|let me see|pull up|open|bring up|play|watch)\b/.test(t);
  }

  function parseVideoRequest(text){
    const raw=String(text||'').trim();
    if(isLocalEditRequest(raw))return null;
    const t=raw.toLowerCase();
    const action=/\b(pull up|put on|show me|open|find|search(?: for)?|play)\b/.test(t);
    const explicitVideo=/\b(youtube|yt|video|videos|tiktok|reel|clip)\b/.test(t);
    const implicitPlay=/\bplay\b/.test(t)&&raw.replace(/^\s*(?:hey\s+)?(?:j|jay|jarvis)\s*[,.:;-]?\s*/i,'').replace(/\bplay\b/i,'').trim().length>0;
    const contextualPlatform=currentPlatform();
    const contextualAction=!!contextualPlatform&&/\b(search(?: for)?|find|open|show me|play|put on|pull up)\b/.test(t);
    if(!action||(!explicitVideo&&!implicitPlay&&!contextualAction))return null;
    const explicitUrl=(raw.match(/https?:\/\/[^\s]+/i)||[])[0]||null;
    let q=raw
      .replace(/^\s*(?:hey\s+)?(?:j|jay|jarvis)\s*[,.:;-]?\s*/i,'')
      .replace(/https?:\/\/[^\s]+/ig,'')
      .replace(/\b(?:can you|could you|please)\b/ig,'')
      .replace(/\b(?:pull up|put on|show me|open|find|search(?: for)?|play)\b/ig,'')
      .replace(/\b(?:on|in)\s+(?:my\s+)?(?:mac|screen|computer)\b/ig,'')
      .replace(/\b(?:a|the)\s+(?:youtube|yt|tiktok)?\s*videos?\s*(?:of|about|for|on)?\b/ig,'')
      .replace(/\b(?:youtube|yt|tiktok|reel|clip|videos?)\b/ig,'')
      .replace(/\s+/g,' ').trim();
    const platform=/\b(?:youtube|yt)\b/i.test(raw)?'youtube':/\btiktok\b/i.test(raw)?'tiktok':implicitPlay?'youtube':contextualPlatform||'video';
    return {query:q||'latest videos',platform,explicitUrl};
  }

  function targetUrl(req){
    if(req.explicitUrl)return req.explicitUrl;
    if(req.platform==='youtube')return 'https://www.youtube.com/results?search_query='+encodeURIComponent(req.query);
    if(req.platform==='tiktok')return 'https://www.tiktok.com/search?q='+encodeURIComponent(req.query);
    return 'https://www.google.com/search?tbm=vid&q='+encodeURIComponent(req.query);
  }

  function reserveMediaTab(){
    if(mediaTab&&!mediaTab.closed)return mediaTab;
    try{mediaTab=window.open('about:blank','j-media');if(mediaTab){mediaTab.document.title='J Media';mediaTab.document.body.innerHTML='<div style="font-family:-apple-system;padding:24px;background:#000;color:#fff;height:100vh">J media ready.</div>';}}catch{}
    return mediaTab;
  }

  function openInMediaTab(url){
    try{
      if(mediaTab&&!mediaTab.closed){mediaTab.location.href=url;mediaTab.focus();return true;}
      const w=window.open(url,'j-media');if(w){mediaTab=w;return true;}
    }catch{}
    return false;
  }

  async function loadLatestEdit(){
    const ws=window.JWorkspace;
    if(!ws)return false;
    try{
      const metaUrl='http://127.0.0.1:8765/latest-meta?t='+Date.now();
      const r=await fetch(metaUrl,{cache:'no-store'});
      if(!r.ok)throw new Error('No local render available');
      const meta=await r.json();
      if(!meta.ok)throw new Error(meta.error||'No local render available');
      const src='http://127.0.0.1:8765/latest-video?t='+Date.now();
      const base=ws.__baseOpenVideo||ws.openVideo;
      base.call(ws,src);
      const state=document.getElementById('wsState');
      if(state)state.textContent='PREVIEW · '+String(meta.name||'LATEST EDIT').toUpperCase();
      window.JSafety?.log?.('video-preview','Loaded latest local J edit: '+(meta.name||'unknown'));
      return true;
    }catch(e){
      const base=ws.__baseOpenVideo||ws.openVideo;
      base.call(ws);
      const empty=document.getElementById('monitorEmpty');
      if(empty)empty.innerHTML='<strong>VIDEO NOT CONNECTED</strong>Start J Preview Server on this Mac.';
      console.warn('J local edit preview unavailable',e);
      return false;
    }
  }

  function installWorkspaceBridge(){
    const ws=window.JWorkspace;
    if(!ws||ws.__latestBridge)return false;
    const base=ws.openVideo.bind(ws);
    ws.__baseOpenVideo=base;
    ws.openVideo=function(src){
      if(src)return base(src);
      return loadLatestEdit();
    };
    ws.openLatestVideo=loadLatestEdit;
    ws.__latestBridge=true;
    return true;
  }

  installWorkspaceBridge();
  const btn=document.getElementById('activateBtn');
  if(btn)btn.addEventListener('click',reserveMediaTab);

  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:String(input?.url||'');
    if(/\/api\/chat(?:\?|$)/.test(url)&&String(init?.method||'GET').toUpperCase()==='POST'){
      try{
        const body=JSON.parse(init?.body||'{}');
        const req=parseVideoRequest(body.message||'');
        if(req){
          rememberPlatform(req.platform);
          const target=targetUrl(req),opened=openInMediaTab(target);
          window.JSafety?.log?.('media-router',`${req.platform} voice video: ${req.query}`);
          const reply=opened?`I pulled up ${req.query}.`:`I found ${req.query}, but I need you to tap J once so I can reserve the media tab.`;
          return new Response(JSON.stringify({reply,continueConversation:true}),{status:200,headers:{'Content-Type':'application/json'}});
        }
      }catch(e){console.warn('J media intercept',e)}
    }
    return nativeFetch(input,init);
  };

  function install(){
    const oldAsk=window.ask;
    if(typeof oldAsk!=='function'||oldAsk.__jMediaRouter)return false;
    const wrapped=async function(text){
      if(isLocalEditRequest(text))return oldAsk(text);
      const req=parseVideoRequest(text);
      if(req){
        rememberPlatform(req.platform);
        const opened=openInMediaTab(targetUrl(req));
        window.JSafety?.log?.('media-router',`${req.platform} typed video: ${req.query}`);
        return window.speak?.(opened?`I pulled up ${req.query}.`:`Tap J once and ask me again so I can open the media tab.`,{continueConversation:true});
      }
      return oldAsk(text);
    };
    wrapped.__jMediaRouter=true;
    window.ask=wrapped;
    if(window.JConversation)window.JConversation.ask=wrapped;
    return true;
  }

  install();
  window.JMediaRouter={parseVideoRequest,targetUrl,reserveMediaTab,openInMediaTab,install,isLocalEditRequest,loadLatestEdit};
})();
