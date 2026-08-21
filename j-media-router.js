(()=>{
  let mediaTab=null;
  function parseVideoRequest(text){
    const raw=String(text||'').trim();
    const t=raw.toLowerCase();
    const action=/\b(pull up|put on|show me|open|find|search(?: for)?|play)\b/.test(t);
    const explicitVideo=/\b(youtube|yt|video|videos|tiktok|reel|clip)\b/.test(t);
    const implicitPlay=/\bplay\b/.test(t)&&raw.replace(/^\s*(?:hey\s+)?(?:j|jay|jarvis)\s*[,.:;-]?\s*/i,'').replace(/\bplay\b/i,'').trim().length>0;
    if(!action||(!explicitVideo&&!implicitPlay))return null;
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
    const platform=/\b(?:youtube|yt)\b/i.test(raw)?'youtube':/\btiktok\b/i.test(raw)?'tiktok':implicitPlay?'youtube':'video';
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
      const req=parseVideoRequest(text);
      if(req){
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
  window.JMediaRouter={parseVideoRequest,targetUrl,reserveMediaTab,openInMediaTab,install};
})();
