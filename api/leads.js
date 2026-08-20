export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'POST only'});
  const lat=Number(req.body?.latitude),lon=Number(req.body?.longitude);
  if(!Number.isFinite(lat)||!Number.isFinite(lon))return res.status(400).json({error:'Location required'});
  const radius=Math.min(Math.max(Number(req.body?.radius)||7000,1000),15000);
  const q=`[out:json][timeout:20];(nwr(around:${radius},${lat},${lon})[name][shop];nwr(around:${radius},${lat},${lon})[name][amenity];nwr(around:${radius},${lat},${lon})[name][craft];nwr(around:${radius},${lat},${lon})[name][office];);out center tags 120;`;
  try{
    const r=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent(q)});
    if(!r.ok)return res.status(502).json({error:'Business search unavailable'});
    const d=await r.json();
    const seen=new Set(),leads=[];
    for(const e of d.elements||[]){
      const t=e.tags||{},name=(t.name||'').trim();if(!name)continue;
      const website=t.website||t['contact:website']||t.url||'';
      if(website)continue;
      const key=name.toLowerCase();if(seen.has(key))continue;seen.add(key);
      const category=t.shop||t.amenity||t.craft||t.office||'local business';
      const phone=t.phone||t['contact:phone']||null;
      const address=[t['addr:housenumber'],t['addr:street'],t['addr:city']].filter(Boolean).join(' ')||null;
      const latitude=Number(e.lat??e.center?.lat),longitude=Number(e.lon??e.center?.lon);
      leads.push({name,category,phone,address,website:null,latitude:Number.isFinite(latitude)?latitude:null,longitude:Number.isFinite(longitude)?longitude:null,source:'OpenStreetMap public business data'});
      if(leads.length>=20)break;
    }
    return res.status(200).json({center:{latitude:lat,longitude:lon},radius,leads});
  }catch(e){
    console.error('Lead finder failed',e);
    return res.status(500).json({error:'Could not search nearby businesses'});
  }
}
