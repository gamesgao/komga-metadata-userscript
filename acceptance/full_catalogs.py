#!/usr/bin/env python3
"""Full-source native builds. Inputs must be supplied in .runtime/catalog-inputs.
Outputs are local only; source catalogs are not redistributed by this test.
"""
import hashlib,json,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
RUNTIME=ROOT/'.runtime';OUT=RUNTIME/'catalogs';OUT.mkdir(parents=True,exist_ok=True)
JOBS=[('bookwalker','bookwalker.sqlite.zst'),('bangumi','bangumi.zip'),('mangabaka','mangabaka.sqlite.tar.gz'),('ehentai','ehentai.db.zstd')]
CODE=['catalog/src/build-cli.mjs','catalog/src/analyzer.mjs','catalog/src/mappings.mjs']
def digest(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()
results=[]
for provider,filename in JOBS:
 source=RUNTIME/'catalog-inputs'/filename
 if not source.is_file():raise SystemExit('Missing public source archive: '+str(source))
 before={name:digest(ROOT/name) for name in CODE};source_sha=digest(source)
 print('START FULL BUILD',provider,flush=True);start=time.monotonic()
 command=['node','catalog/src/build-cli.mjs','--provider',provider,'--input',str(source),'--output',str(OUT/(provider+'.sqlite')),'--source-version',f'sha256:{source_sha}']
 if sys.platform=='darwin':command=['/usr/bin/time','-l']+command
 run=subprocess.run(command,cwd=ROOT,text=True,capture_output=True)
 output=OUT/(provider+'.sqlite')
 result={'provider':provider,'exitCode':run.returncode,'seconds':round(time.monotonic()-start,2),'sourceBytes':source.stat().st_size,'sourceSha256':source_sha,'builderSha256':before,'builderUnchanged':before=={name:digest(ROOT/name) for name in CODE},'stdout':run.stdout,'resourceLog':run.stderr,'outputBytes':output.stat().st_size if run.returncode==0 and output.exists() else None}
 if run.returncode==0:result['outputSha256']=digest(output)
 (RUNTIME/(provider+'-full-build.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2));results.append(result)
 (RUNTIME/'full-build-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print(json.dumps(result,ensure_ascii=False),flush=True)
raise SystemExit(0 if all(r['exitCode']==0 and r['builderUnchanged'] for r in results) else 1)
