(()=>{
  if(!('speechSynthesis' in window))return;
  const stage=document.getElementById('stage');
  const response=document.getElementById('response');
  let speaking=false,lastWorkspacePhrase='';
  function voices(){return speechSynthesis.getVoices()||[]}
  function pick(){const all=voices();const preferred=['Daniel','Arthur','Aaron','Oliver','Alex'];for(const name of preferred){const v=all.find(x=>x.name.toLowerCase().includes(name.toLowerCase()));if(v)return v}return all.find(v=>/^en-GB/i.test(v.lang))||all.find(v=>/^en-US/i.test(v.lang))||all.find(v=>/^en/i.test(v.lang))||all[0]||null}
  function chunks(text){const clean=String(text||'').replace(/\s+/g,' ').trim();if(clean.length<=240)return[clean];const out=[];let s=clean;while(s.length){if(s.length<=240){out.push(s);break}let cut=Math.max(s.lastIndexOf('. ',230),s.lastIndexOf('? ',230),s.lastIndexOf('! ',230),s.lastIndexOf(', ',220),s.lastIndexOf(' ',220));if(cut<90)cut=230;out.push(s.slice(0,cut+1).trim());s=s.slice(cut+1).trim()}return out}
  async function sayOne(text){await new Promise(resolve=>{const u=new SpeechSynthesisUtterance(text),v=pick();if(v)u.voice=v;u.lang=v?.lang||'en-GB';u.rate=.94;u.pitch=.88;u.volume=1;u.onend=resolve;u.onerror=resolve;speechSynthesis.speak(u)})}
  function maybeHandleWorkspaceVoice(text){
    const t=String(text||'').trim();
    if(!t||t===lastWorkspacePhrase)return false;
    lastWorkspacePhrase=t;
    const showVideo=/(?:let me see|show me|pull up|open|bring up).*(?:video|edit|editing)|(?:video|edit|editing).*(?:let me see|show me|pull up|open|bring up)/i;
    const hideVideo=/(?:hide|close|put away|minimi[sz]e).*(?:video|edit|workspace)|(?:video|edit|workspace).*(?:hide|close|put away|minimi[sz]e)/i;
    if(showVideo.test(t)){
      window.JWorkspace?.openVideo?.();
      return true;
    }
    if(hideVideo.test(t)){
      window.JWorkspace?.close?.();
      return true;
    }
    return false;
  }
  window.speak=async function(text,{continueConversation=false}={}){const msg=String(text||'').trim();if(!msg||speaking)return;speaking=true;speechSynthesis.cancel();stage?.classList.remove('listening','thinking');stage?.classList.add('speaking');if(response)response.textContent=msg;try{for(const part of chunks(msg))await sayOne(part)}finally{speaking=false;stage?.classList.remove('speaking');window.JSafety?.log?.('voice','J spoke with desktop voice');if(continueConversation&&typeof window.startAudioLoop==='function')window.startAudioLoop(250)}};
  if(response){
    new MutationObserver(()=>maybeHandleWorkspaceVoice(response.textContent)).observe(response,{childList:true,subtree:true,characterData:true});
  }
  window.addEventListener('j-transcript',e=>maybeHandleWorkspaceVoice(e.detail?.text||e.detail||''));
  speechSynthesis.onvoiceschanged=()=>pick();
  window.JVoice={preview:()=>window.speak('J online. Voice system ready.',{continueConversation:false}),handleWorkspaceVoice:maybeHandleWorkspaceVoice,get voice(){return pick()?.name||'System voice'}};
})();