import json, urllib.parse, urllib.request, datetime
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
CMD=ROOT/'commands'/'latest.json'
OUT=ROOT/'data'/'latest-command-result.json'
OUT.parent.mkdir(parents=True,exist_ok=True)

def fetch_json(url,data=None,headers=None,timeout=25):
    req=urllib.request.Request(url,data=data,headers=headers or {})
    with urllib.request.urlopen(req,timeout=timeout) as r:
        return json.loads(r.read().decode('utf-8'))

def geocode(place):
    q=urllib.parse.urlencode({'q':place,'format':'jsonv2','limit':1})
    d=fetch_json('https://nominatim.openstreetmap.org/search?'+q,headers={'User-Agent':'JRemote/1.0'})
    if not d: raise RuntimeError('Could not find location')
    return float(d[0]['lat']),float(d[0]['lon']),d[0].get('display_name',place)

def scan(lat,lon,radius_m,limit):
    q=f'''[out:json][timeout:20];(nwr(around:{radius_m},{lat},{lon})[name][shop];nwr(around:{radius_m},{lat},{lon})[name][amenity];nwr(around:{radius_m},{lat},{lon})[name][craft];nwr(around:{radius_m},{lat},{lon})[name][office];);out center tags 180;'''
    body=('data='+urllib.parse.quote(q)).encode()
    endpoints=['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter','https://overpass.nchc.org.tw/api/interpreter']
    last=None
    for ep in endpoints:
        try:
            d=fetch_json(ep,data=body,headers={'Content-Type':'application/x-www-form-urlencoded','User-Agent':'JRemote/1.0'},timeout=30)
            seen=set(); leads=[]
            for e in d.get('elements',[]):
                t=e.get('tags',{}); name=(t.get('name') or '').strip()
                if not name: continue
                key=name.lower()
                if key in seen: continue
                seen.add(key)
                la=e.get('lat',e.get('center',{}).get('lat')); lo=e.get('lon',e.get('center',{}).get('lon'))
                website=t.get('website') or t.get('contact:website') or t.get('url')
                leads.append({'name':name,'category':t.get('shop') or t.get('amenity') or t.get('craft') or t.get('office') or 'local business','phone':t.get('phone') or t.get('contact:phone'),'website':website,'address':' '.join(x for x in [t.get('addr:housenumber'),t.get('addr:street'),t.get('addr:city')] if x) or None,'latitude':la,'longitude':lo,'source':'OpenStreetMap'})
                if len(leads)>=limit: break
            return leads,ep
        except Exception as e: last=e
    raise RuntimeError(f'Business data providers unavailable: {last}')

def main():
    cmd=json.loads(CMD.read_text())
    now=datetime.datetime.now(datetime.timezone.utc).isoformat()
    result={'command_id':cmd.get('id'),'action':cmd.get('action'),'status':'complete','completed_at':now,'display':cmd.get('display') or {}}
    try:
        action=cmd.get('action')
        p=cmd.get('payload') or {}
        if action=='status': result['message']='J remote command bridge is online.'
        elif action in ('find_leads','scan_map'):
            place=str(p.get('location') or 'Dallas, TX')[:120]
            limit=max(1,min(int(p.get('limit') or 10),50)); radius=max(1609,min(int(p.get('radius_m') or 12000),30000))
            lat,lon,label=geocode(place); leads,provider=scan(lat,lon,radius,limit)
            result.update({'title':f'J · {label.upper()} SCAN','location':label,'center':{'latitude':lat,'longitude':lon},'radius_m':radius,'provider':provider,'count':len(leads),'leads':leads})
        else: raise RuntimeError('Unsupported command')
    except Exception as e:
        result={'command_id':cmd.get('id'),'action':cmd.get('action'),'status':'failed','completed_at':now,'error':str(e),'display':cmd.get('display') or {}}
    OUT.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')

if __name__=='__main__': main()
