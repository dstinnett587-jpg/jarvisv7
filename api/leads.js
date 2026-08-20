const OVERPASS_ENDPOINTS=['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter','https://overpass.nchc.org.tw/api/interpreter'];
const QUERY_ALIASES={barber:['barber','hairdresser','beauty'],barbers:['barber','hairdresser','beauty'],salon:['salon','hairdresser','beauty'],salons:['salon','hairdresser','beauty'],restaurant:['restaurant','fast_food','cafe','food'],restaurants:['restaurant','fast_food','cafe','food'],plumber:['plumber','plumbing'],plumbers:['plumber','plumbing'],roofer:['roofer','roofing'],roofers:['roofer','roofing'],contractor:['contractor','construction'],contractors:['contractor','construction'],dentist:['dentist','dental'],dentists:['dentist','dental'],gym:['gym','fitness_centre','fitness'],gyms:['gym','fitness_centre','fitness'],store:['shop','retail'],stores:['shop','retail'],shop:['shop','retail'],shops:['shop','retail']};

function clean(value){return String(value??'').trim()}
function num(value){const n=Number(value);return Number.isFinite(n)?n:null}
function compactAddress(t={}){return [t['addr:housenumber'],t['addr:street'],t['addr:city'],t['addr:state'],t['addr:postcode']].filter(Boolean).join(' ').trim()||null}
function categoryOf(t={}){return t.shop||t.amenity||t.craft||t.office||t.tourism||t.leisure||t.healthcare||'local business'}
function websiteOf(t={}){return clean(t.website||t['contact:website']||t.url)||null}
function phoneOf(t={}){return clean(t.phone||t['contact:phone']||t['contact:mobile'])||null}
function emailOf(t={}){return clean(t.email||t['contact:email'])||null}

async function geocodeLocation(location){
  const q=clean(location);if(!q)return null;
  const url='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q='+encodeURIComponent(q);
  const r=await fetch(url,{headers:{'User-Agent':'J-Business-Data/2.0'}});
  if(!r.ok)throw new Error('Location lookup failed');
  const d=await r.json();const hit=d?.[0];if(!hit)return null;
  return {latitude:num(hit.lat),longitude:num(hit.lon),displayName:hit.display_name||q};
}

function buildOverpassQuery({latitude,longitude,radius}){
  return `[out:json][timeout:18];(nwr(around:${radius},${latitude},${longitude})[name][shop];nwr(around:${radius},${latitude},${longitude})[name][amenity];nwr(around:${radius},${latitude},${longitude})[name][craft];nwr(around:${radius},${latitude},${longitude})[name][office];nwr(around:${radius},${latitude},${longitude})[name][tourism];nwr(around:${radius},${latitude},${longitude})[name][healthcare];);out center tags 180;`;
}

function looselyMatches(t={},query=''){
  const q=clean(query).toLowerCase();if(!q||q==='local business')return true;
  const hay=[t.name,t.shop,t.amenity,t.craft,t.office,t.tourism,t.healthcare,t.description,t.brand].filter(Boolean).join(' ').toLowerCase().replaceAll('_',' ');
  const words=q.split(/\s+/).filter(Boolean);const expanded=new Set(words);
  for(const word of words)for(const alias of QUERY_ALIASES[word]||[])expanded.add(alias.replaceAll('_',' '));
  return [...expanded].some(word=>word.length>2&&hay.includes(word));
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'POST only'});
  try{
    let latitude=num(req.body?.latitude),longitude=num(req.body?.longitude);
    const location=clean(req.body?.location),query=clean(req.body?.query||req.body?.category);
    const onlyMissingWebsite=Boolean(req.body?.onlyMissingWebsite);
    let resolvedLocation=null;
    if(latitude===null||longitude===null){
      const geo=await geocodeLocation(location);if(!geo)return res.status(400).json({error:'Could not find that location'});
      latitude=geo.latitude;longitude=geo.longitude;resolvedLocation=geo.displayName;
    }
    const radius=Math.min(Math.max(Number(req.body?.radius)||12000,1000),30000);
    const limit=Math.min(Math.max(Number(req.body?.limit)||25,1),50);
    const overpassQuery=buildOverpassQuery({latitude,longitude,radius});
    let lastError='';
    for(const endpoint of OVERPASS_ENDPOINTS){
      try{
        const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),19000);
        const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'J-Business-Data/2.0'},body:'data='+encodeURIComponent(overpassQuery),signal:controller.signal});clearTimeout(timer);
        if(!r.ok){lastError=`${endpoint} returned ${r.status}`;continue}
        const d=await r.json();const seen=new Set(),businesses=[];
        for(const e of d.elements||[]){
          const t=e.tags||{},name=clean(t.name);if(!name||!looselyMatches(t,query))continue;
          const website=websiteOf(t);if(onlyMissingWebsite&&website)continue;
          const lat=num(e.lat??e.center?.lat),lon=num(e.lon??e.center?.lon);
          const key=`${name.toLowerCase()}|${lat?.toFixed?.(4)||''}|${lon?.toFixed?.(4)||''}`;if(seen.has(key))continue;seen.add(key);
          businesses.push({name,category:categoryOf(t),phone:phoneOf(t),email:emailOf(t),website,address:compactAddress(t),openingHours:clean(t.opening_hours)||null,latitude:lat,longitude:lon,brand:clean(t.brand)||null,source:'OpenStreetMap'});
          if(businesses.length>=limit)break;
        }
        return res.status(200).json({center:{latitude,longitude},resolvedLocation:resolvedLocation||location||null,query:query||null,radius,onlyMissingWebsite,businesses,leads:businesses,provider:'OpenStreetMap / Overpass'});
      }catch(e){lastError=e?.name==='AbortError'?'Map provider timed out':String(e?.message||e)}
    }
    console.error('Business data providers failed',{lastError});
    return res.status(502).json({error:'Business search is temporarily unavailable. Try again in a moment.'});
  }catch(e){console.error('Business search error',e);return res.status(500).json({error:'Business search failed'})}
}
