#!/usr/bin/env python3
"""Package only built software and notices. Never include catalogs or runtime data."""
import hashlib,json,re,subprocess,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
REPO='gamesgao/komga-metadata-userscript'
def digest(data):return hashlib.sha256(data).hexdigest()
def package():
 version=json.loads((ROOT/'package.json').read_text())['version']
 if not re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)',version):raise ValueError('Invalid release version')
 if json.loads((ROOT/'package-lock.json').read_text())['version']!=version:raise ValueError('Lockfile version mismatch')
 tag='v'+version;dist=ROOT/'dist';out=ROOT/'.runtime'/'release-artifacts'/tag;out.mkdir(parents=True,exist_ok=True)
 script=(dist/'komga-metadata.user.js').read_bytes();meta=(dist/'komga-metadata.meta.js').read_bytes()
 header=script.split(b'// ==/UserScript==',1)[0]+b'// ==/UserScript==\n'
 if meta!=header:raise ValueError('Metadata file differs from userscript header')
 expected={
  'version':version,
  'downloadURL':f'https://github.com/{REPO}/releases/latest/download/komga-metadata.user.js',
  'updateURL':f'https://github.com/{REPO}/releases/latest/download/komga-metadata.meta.js'}
 for key,value in expected.items():
  match=re.search(r'^// @'+key+r'\s+(.+)$',meta.decode(),re.M)
  if not match or match.group(1)!=value:raise ValueError('Incorrect '+key)
 pinned=f'https://raw.githubusercontent.com/{REPO}/{tag}/dist/catalog/'
 if pinned.encode() not in script:raise ValueError('Use KOMGA_METADATA_RELEASE=1: runtime assets must be version-pinned')
 files={'komga-metadata.user.js':script,'komga-metadata.meta.js':meta}
 for path in sorted((dist/'catalog').rglob('*')):
  if path.is_file():
   if path.is_symlink() or path.suffix not in {'.js','.mjs','.mts','.wasm','.txt'}:raise ValueError('Unexpected runtime artifact: '+path.name)
   files[path.relative_to(dist).as_posix()]=path.read_bytes()
 for name in ['catalog/catalog-worker.js','catalog/catalog-build-worker.js','catalog/sqlite/sqlite3.wasm']:
  if not files.get(name):raise ValueError('Missing runtime asset: '+name)
 if not files['catalog/sqlite/sqlite3.wasm'].startswith(b'\x00asm'):raise ValueError('Invalid WASM')
 for name in ['LICENSE','THIRD_PARTY.md','README.md','docs/RELEASING.md']:
  files[name]=(ROOT/name).read_bytes()
 commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
 manifest={'version':version,'tag':tag,'commit':commit,'runtime_base':pinned,
           'files':{name:{'bytes':len(data),'sha256':digest(data)} for name,data in sorted(files.items())}}
 manifest_data=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode()
 files['release-manifest.json']=manifest_data
 archive=out/f'komga-metadata-{tag}.zip'
 with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for name,data in sorted(files.items()):
   info=zipfile.ZipInfo(name,date_time=(1980,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
   info.external_attr=0o100644<<16;z.writestr(info,data)
 for name in ['komga-metadata.user.js','komga-metadata.meta.js','release-manifest.json']:(out/name).write_bytes(files[name])
 names=['komga-metadata.user.js','komga-metadata.meta.js','release-manifest.json',archive.name]
 (out/'SHA256SUMS').write_text(''.join(f'{digest((out/name).read_bytes())}  {name}\n' for name in sorted(names)))
 print(json.dumps({'version':version,'directory':str(out.relative_to(ROOT)),'assets':names+['SHA256SUMS']}))
 return out
if __name__=='__main__':package()
