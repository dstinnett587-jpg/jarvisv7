(()=>{
  const state={inputLabel:'',outputs:[],bluetoothLikely:false,lastCheck:0};
  function isBtLabel(s=''){return /bluetooth|jlab|airpods|buds|headset|headphone|earbud/i.test(s)}
  async function inspectAudioDevices(){
    if(!navigator.mediaDevices?.enumerateDevices)return state;
    try{
      const devices=await navigator.mediaDevices.enumerateDevices();
      const inputs=devices.filter(d=>d.kind==='audioinput');
      const outputs=devices.filter(d=>d.kind==='audiooutput');
      state.inputLabel=inputs.find(d=>isBtLabel(d.label))?.label||inputs[0]?.label||'';
      state.outputs=outputs.map(d=>d.label).filter(Boolean);
      state.bluetoothLikely=isBtLabel(state.inputLabel)||state.outputs.some(isBtLabel);
      state.lastCheck=Date.now();
      window.dispatchEvent(new CustomEvent('j-phone-audio-route',{detail:{...state}}));
    }catch{}
    return state;
  }
  async function prepare(){return inspectAudioDevices()}
  function describe(){
    if(state.bluetoothLikely)return `Bluetooth audio ready${state.inputLabel?' · '+state.inputLabel:''}`;
    return state.inputLabel?`Audio ready · ${state.inputLabel}`:'Audio route ready';
  }
  function loadExtra(src,id){if(document.getElementById(id))return;const s=document.createElement('script');s.id=id;s.src=src;s.defer=true;document.head.appendChild(s)}
  if(navigator.mediaDevices?.addEventListener)navigator.mediaDevices.addEventListener('devicechange',()=>inspectAudioDevices());
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')inspectAudioDevices()});
  window.addEventListener('load',()=>setTimeout(inspectAudioDevices,700));
  window.JPhoneAudio={prepare,inspect:inspectAudioDevices,describe,state};
  loadExtra('./j-live-stocks.js?v=20260823-live-4','j-live-stocks-loader');
  loadExtra('./j-live-theme.js?v=20260823-ui-3','j-live-theme-loader');
  loadExtra('./j-strong-center.js?v=20260823-strong-1','j-strong-center-loader');
})();
