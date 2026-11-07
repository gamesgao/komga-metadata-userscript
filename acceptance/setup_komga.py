#!/usr/bin/env python3
"""Prepare generated CBZ fixtures on the dedicated loopback Komga instance.
Never points at a NAS or a user library. Run with uv --with requests.
"""
import argparse,hashlib,json,secrets,struct,time,zipfile,zlib
from pathlib import Path
import requests
ROOT=Path(__file__).resolve().parents[1]/'.runtime'
BASE='http://127.0.0.1:18767'
ROOT.mkdir(exist_ok=True)
p=argparse.ArgumentParser();p.add_argument('--download',action='store_true',help='download the official Komga 1.30.0 JAR, then exit');args=p.parse_args()
if args.download:
 release=requests.get('https://api.github.com/repos/gotson/komga/releases/tags/1.30.0',timeout=30);release.raise_for_status()
 assets=[a for a in release.json()['assets'] if a['name'].endswith('.jar')]
 if len(assets)!=1:raise SystemExit('Expected one official JAR release asset')
 asset=assets[0];target=ROOT/'komga.jar';tmp=ROOT/'komga.jar.part';h=hashlib.sha256()
 with requests.get(asset['browser_download_url'],stream=True,timeout=60) as r:
  r.raise_for_status()
  with tmp.open('wb') as f:
   for b in r.iter_content(1024*1024):h.update(b);f.write(b)
 if asset.get('digest') and asset['digest']!='sha256:'+h.hexdigest():raise SystemExit('Release asset hash mismatch')
 tmp.replace(target);print(json.dumps({'file':str(target),'sha256':h.hexdigest(),'bytes':target.stat().st_size}));raise SystemExit(0)
config=ROOT/'e2e-config.json';s=requests.Session();claim=s.get(BASE+'/api/v1/claim',timeout=10);claim.raise_for_status()
if config.exists():auth=json.loads(config.read_text())
else:
 if claim.json()['isClaimed']:raise SystemExit('Refusing to modify an existing claimed server without this test project\'s local credentials')
 auth={'baseUrl':BASE,'email':'test@example.test','password':secrets.token_urlsafe(24)}
 config.write_text(json.dumps(auth));config.chmod(0o600)
if not claim.json()['isClaimed']:
 s.post(BASE+'/api/v1/claim',headers={'X-Komga-Email':auth['email'],'X-Komga-Password':auth['password']},timeout=10).raise_for_status()
s.auth=(auth['email'],auth['password']);r=s.get(BASE+'/api/v1/libraries',timeout=10);r.raise_for_status();libs=r.json()
def png(seed):
 w,h=320,480
 def chunk(name,b):return struct.pack('>I',len(b))+name+b+struct.pack('>I',zlib.crc32(name+b)&0xffffffff)
 raw=b''.join(b'\0'+bytes(v for x in range(w) for v in [(x+seed)%256,(y+seed)%256,(x+y+seed)%256]) for y in range(h))
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
media=ROOT/'media';media.mkdir(exist_ok=True)
for folder,title,number,seed in [('Frieren Test','Frieren Test Vol. 01',1,10),('Frieren Test','Frieren Test Vol. 02',2,80),('_oneshots','One-shot Test',1,160)]:
 path=media/folder/(title+'.cbz');path.parent.mkdir(exist_ok=True)
 if not path.exists():
  with zipfile.ZipFile(path,'w') as archive:
   for n in range(1,4):archive.writestr(f'{n:03}.png',png(seed+n))
   archive.writestr('ComicInfo.xml',f'<ComicInfo><Title>{title}</Title><Series>{folder}</Series><Number>{number}</Number><Summary>Synthetic development fixture; no real manga pages.</Summary><Tags>keep:original</Tags></ComicInfo>')
(ROOT/'test-cover.png').write_bytes(png(220))
targets=[x for x in libs if x['name']=='Isolated acceptance']
if not targets:
 schema=s.get(BASE+'/v3/api-docs',timeout=10).json()['components']['schemas']['LibraryCreationDto']
 payload: dict[str,object]={k:False for k,v in schema['properties'].items() if v.get('type')=='boolean'}
 payload.update(name='Isolated acceptance',root=str(media),oneshotsDirectory='_oneshots',scanCbx=True,analyzeDimensions=True,importComicInfoBook=True,importComicInfoSeries=True,scanInterval='DISABLED',scanDirectoryExclusions=[],seriesCover='FIRST')
 r=s.post(BASE+'/api/v1/libraries',json=payload,timeout=10);r.raise_for_status();targets=[r.json()]
if len(targets)!=1:raise SystemExit('Ambiguous test library')
lib=targets[0];s.post(BASE+f"/api/v1/libraries/{lib['id']}/scan",timeout=10).raise_for_status()
for _ in range(60):
 r=s.get(BASE+'/api/v1/series',params={'size':100,'library_id':lib['id']},timeout=10);r.raise_for_status();series=r.json().get('content',[])
 books=s.get(BASE+'/api/v1/books',params={'size':100,'library_id':lib['id']},timeout=10).json().get('content',[])
 if len(books)==3 and all(b['media']['status']=='READY' for b in books):break
 time.sleep(1)
else:raise SystemExit('Generated media did not finish analysis')
state={'libraries':[{k:lib[k] for k in ['id','name']}],'series':[{k:x.get(k) for k in ['id','name','oneshot','booksCount']} for x in series],'books':[{k:x.get(k) for k in ['id','name','seriesId']} for x in books]}
(ROOT/'e2e-state.json').write_text(json.dumps(state,ensure_ascii=False,indent=2));print(json.dumps(state,ensure_ascii=False,indent=2))
