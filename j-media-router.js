(()=>{
  function videoRequest(text){
    const raw=String(text||'').trim();
    const t=raw.toLowerCase();
    const action=/\b(pull up|put on|show me|open|find|search(?: for)?|play)\b/.test(t);
    const video=/\b(youtube|yt|video|videos)\b/.test(t);
    if(!action||!video)return null;
    let q=raw
      .replace(/^\s*(?:hey\s+)?(?:j|jay|jarvis)\s*[,.:;-]?\s*/i,'')
      .replace(/\b(?:can you|could you|please)\b/ig,'')
      .replace(/\b(?:pull up|put on|show me|open|find|search(?: for)?|play)\b/ig,'')
      .replace(/\b(?:on|in)\s+(?:my\s+)?(?:mac|screen|computer)\b/ig,'')
      .replace(/\b(?:youtube|yt)\b/ig,'')
      .replace(/\b(?:a|the)\s+video\s+(?:of|about|for|on)?\b/ig,'')
      .replace(/\bvideos?\b/ig,'')
      .replace(/\s+/g,' ').trim();
    return q||'latest videos';
  }
  function openYouTubeSearch(query){
    const url='https://www.youtube.com/results?search_query='+encodeURIComponent(query);
    try{const w=window.open(url,'_blank','noopener,noreferrer');return {url,opened:!!w}}catch{return {url,opened:false}}
  }
  function install(){
    const oldAsk=window.ask;
    if(typeof oldAsk!=='function'||oldAsk.__jMediaRouter)return false;
    const wrapped=async function(text){
      const q=videoRequest(text);
      if(q){
        const r=openYouTubeSearch(q);
        window.JSafety?.log?.('media-router',`YouTube search: ${q}`);
        return window.speak?.(r.opened?`I pulled up YouTube results for ${q}.`:`I found the YouTube search for ${q}, but the browser blocked the new tab.`,{continueConversation:false});
      }
      return oldAsk(text);
    };
    wrapped.__jMediaRouter=true;
    window.ask=wrapped;
    if(window.JConversation)window.JConversation.ask=wrapped;
    return true;
  }
  if(!install())window.addEventListener('load',install,{once:true});
  window.JMediaRouter={videoRequest,openYouTubeSearch,install};
})();
