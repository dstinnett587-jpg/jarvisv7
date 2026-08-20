import json, sys, urllib.parse, urllib.request, datetime
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
CMD=ROOT/'commands'/'latest.json'
OUT=ROOT/'data'/'latest-leads.json'
OUT.parent.mkdir(parents=True,exist_ok=True)

def fetch_json(url, data=None, headers=None, timeout=25):
    req=urllib.request.Request(url,data=data,headers=headers or {})
    with urllib.request.urlopen(req,timeout=timeout) as r:
        return json.loads(r.read().decode('utf-8'))

def geocode(place):
    q=urllib.parse.urlencode({'q':place,'format':'jsonv2','limit':1})
    d=fetch_json('https://nominatim.openstreetmap.org/search?'+q,headers={'User-Agent':'JLeadResearch/1.0'})
    if not d: raise RuntimeError('Could not geocode location')
    return float(d[0]['lat']),float(d[0]['lon']),d[0].get('display_name',place)

def scan(lat,lon,radius_m,limit):
    q=f'''[out:json][timeout:20];(nwr(around:{radius_m},{lat},{lon})[name][shop];nwr(around:{radius_m},{lat},{lon})[name][amenity];nwr(around:{radius_m},{lat},{lon})[name][craft];nwr(around:{radius_m},{lat},{lon})[name][office];);out center tags 160;'''
    body=('data='+urllib.parse.quote(q)).encode()
    endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.nchc.org.tw/api/interpreter']
    last=None
    for ep in endpoints:
        try:
            d=fetch_json(ep,data=body,headers={'Content-Type':'application/x-www-form-urlencoded','User-Agent':'JLeadResearch/1.0'},timeout=30)
            seen=set(); leads=[]
            for e in d.get('elements',[]):
                t=e.get('tags',{}); name=(t.get('name') or '').strip()
                if not name: continue
                if t.get('website') or t.get('contact:website') or t.get('url'): continue
                key=name.lower()
                if key in seen: continue
                seen.add(key)
                la=e.get('lat',e.get('center',{}).get('lat')); lo=e.get('lon',e.get('center',{}).get('lon'))
                leads.append({'name':name,'category':t.get('shop') or t.get('amenity') or t.get('craft') or t.get('office') or 'local business','phone':t.get('phone') or t.get('contact:phone'),'address':' '.join(x for x in [t.get('addr:housenumber'),t.get('addr:street'),t.get('addr:city')] if x) or None,'latitude':la,'longitude':lo,'reason':'No website is listed in the public OpenStreetMap business data. Verify before outreach.'})
                if len(leads)>=limit: break
            return leads,ep
        except Exception as e: last=e
    raise RuntimeError(f'Business data providers unavailable: {last}')

def main():
    cmd=json.loads(CMD.read_text())
    now=datetime.datetime.now(datetime.timezone.utc).isoformat()
    result={'command_id':cmd.get('id'),'action':cmd.get('action'),'status':'complete','completed_at':now}
    try:
        action=cmd.get('action')
        if action=='status':
            result['message']='J remote research bridge is ready.'
        elif action in ('find_leads','scan_map'):
            p=cmd.get('payload') or {}; place=str(p.get('location') or 'Dallas, TX')[:120]
            limit=max(1,min(int(p.get('limit') or 20),50)); radius=max(1609,min(int(p.get('radius_m') or 8047),25000))
            lat,lon,label=geocode(place); leads,provider=scan(lat,lon,radius,limit)
            result.update({'location':label,'center':{'latitude':lat,'longitude':lon},'radius_m':radius,'provider':provider,'count':len(leads),'leads':leads})
        else:
            raise RuntimeError('Unsupported command')
    except Exception as e:
        result={'command_id':cmd.get('id'),'action':cmd.get('action'),'status':'failed','completed_at':now,'error':str(e)}
    OUT.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')

if __name__=='__main__': main()
