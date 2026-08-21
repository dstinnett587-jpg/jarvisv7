(()=>{
  function parseVideoRequest(text){
    const raw=String(text||'').trim();
    const t=raw.toLowerCase();
    const action=/\b(pull up|put on|show me|open|find|search(?: for)?|play)\b/.test(t);
    const video=/\b(youtube|yt|video|videos|tiktok|reel|clip)\b/.test(t);
    if(!action||!video)return null;
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
    const platform=/\b(?:youtube|yt)\b/i.test(raw)?'youtube':/\btiktok\b/i.test(raw)?'tiktok':'video';
    return {query:q||'latest videos',platform,explicitUrl};
  }
  function targetUrl(req){
    if(req.explicitUrl)return req.explicitUrl;
    if(req.platform==='youtube')return 'https://www.youtube.com/results?search_query='+encodeURIComponent(req.query);
    if(req.platform==='tiktok')return 'https://www.tiktok.com/search?q='+encodeURIComponent(req.query);
    return 'https://www.google.com/search?tbm=vid&q='+encodeURIComponent(req.query);
  }
  function openReliable(url){
    try{const w=window.open(url,'_blank');if(w)return {opened:true,fallback:false};}catch{}
    try{window.location.assign(url);return {opened:true,fallback:true};}catch{return {opened:false,fallback:false}}
  }
  function install(){
    const oldAsk=window.ask;
    if(typeof oldAsk!=='function'||oldAsk.__jMediaRouter)return false;
    const wrapped=async function(text){
      const req=parseVideoRequest(text);
      if(req){
        const url=targetUrl(req);
        window.JSafety?.log?.('media-router',`${req.platform} video: ${req.query}`);
        await window.speak?.(`Pulling up ${req.query}.`,{continueConversation:false});
        const r=openReliable(url);
        if(!r.opened)return oldAsk(text);
        return;
      }
      return oldAsk(text);
    };
    wrapped.__jMediaRouter=true;
    window.ask=wrapped;
    if(window.JConversation)window.JConversation.ask=wrapped;
    return true;
  }
  if(!install())window.addEventListener('load',install,{once:true});
  window.JMediaRouter={parseVideoRequest,targetUrl,openReliable,install};
})();
