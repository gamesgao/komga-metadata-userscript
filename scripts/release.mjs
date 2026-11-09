import { readFile, appendFile } from 'node:fs/promises';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { repository, validateVersion, releaseDecision, newerVersion, findRelease } from './release-config.mjs';

function gh(args, optional404=false) {
  const r=spawnSync('gh',args,{encoding:'utf8'});
  if (r.error) throw r.error;
  if (r.status!==0) {
    if (optional404 && /HTTP 404/.test(r.stderr)) return null;
    throw new Error(`GitHub command failed: ${r.stderr.trim()}`);
  }
  return r.stdout;
}
function api(path, optional404=false) {
  const text=gh(['api',`repos/${repository}/${path}`],optional404);
  return text===null?null:JSON.parse(text);
}
async function releaseRequest(path, {method='GET', body, binary=false, upload=false}={}) {
  const token=process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if(!token) throw new Error('Release writes require the workflow token');
  const headers={Authorization:`Bearer ${token}`, 'X-GitHub-Api-Version':'2022-11-28',
    Accept:binary?'application/octet-stream':'application/vnd.github+json'};
  if(body!==undefined) headers['Content-Type']=upload?'application/octet-stream':'application/json';
  const url=`https://${upload?'uploads':'api'}.github.com/repos/${repository}/${path}`;
  let response=await fetch(url,{method,headers,body:body===undefined?undefined:upload?body:JSON.stringify(body),redirect:'manual'});
  // Signed asset redirects must not receive the GitHub workflow token.
  if(binary && response.status===302) {
    const location=new URL(response.headers.get('location'));
    if(location.protocol!=='https:' || !location.hostname.endsWith('.githubusercontent.com')) throw new Error('Unexpected asset redirect host');
    response=await fetch(location);
  }
  if(!response.ok) throw new Error(`GitHub ${method} ${path}: HTTP ${response.status}`);
  if(response.status===204) return null;
  return binary?Buffer.from(await response.arrayBuffer()):response.json();
}

async function output(name,value) {
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT,`${name}=${value}\n`);
  console.log(`${name}=${value}`);
}
function taggedCommit(tag) {
  let ref=api(`git/ref/tags/${tag}`,true)?.object;
  while(ref?.type==='tag') ref=api(`git/tags/${ref.sha}`).object;
  if (ref && ref.type!=='commit') throw new Error('Version tag is not a commit');
  return ref?.sha;
}
const mode=process.argv[2];
if (!['plan','publish'].includes(mode)) throw new Error('Use release.mjs plan|publish');
if (process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY!==repository) throw new Error('Unexpected release repository');
const version=validateVersion(JSON.parse(await readFile('package.json','utf8')).version);
const lock=JSON.parse(await readFile('package-lock.json','utf8'));
if (lock.version!==version || lock.packages[''].version!==version) throw new Error('Lockfile version mismatch');
const tag=`v${version}`;
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if (process.env.VERIFIED_SHA && process.env.VERIFIED_SHA!==commit) throw new Error('Checkout is not the CI-verified commit');
const existing=findRelease(api,tag);
if(existing?.draft) console.log(`Found draft ${existing.id} for ${existing.target_commitish}`);
if (!releaseDecision(existing,taggedCommit(tag),commit)) {
  await output('publish','false'); console.log(`Already published ${tag}; left untouched.`);
} else if (mode==='plan') {
  await output('tag',tag); await output('publish','true');
} else {
  if (!process.env.VERIFIED_SHA) throw new Error('Publishing requires VERIFIED_SHA from a successful trusted-main CI run');
  const directory=join('.runtime','release-artifacts',tag);
  const names=['komga-metadata.user.js','komga-metadata.meta.js',`komga-metadata-${tag}.zip`,'release-manifest.json','SHA256SUMS'];
  const manifest=JSON.parse(await readFile(join(directory,'release-manifest.json'),'utf8'));
  if (manifest.commit!==commit || manifest.version!==version) throw new Error('Package manifest does not match verified source');
  const sums=(await readFile(join(directory,'SHA256SUMS'),'utf8')).trim().split('\n');
  const expected=new Map();
  for(const name of names) {
    const bytes=await readFile(join(directory,name));
    const hash=createHash('sha256').update(bytes).digest('hex'); expected.set(name,hash);
    if(name!=='SHA256SUMS' && !sums.includes(`${hash}  ${name}`)) throw new Error(`Package checksum mismatch: ${name}`);
  }
  let draft=existing;
  if (!draft) {
    const notes=`## 安装与更新\n\n安装附件 komga-metadata.user.js；已有用户由 komga-metadata.meta.js 检查更新。\n\n本版本来自通过 Verify userscript 的提交 ${commit}，发布构建另跑浏览器回归。\n\nWorker/WASM 固定到 ${tag}，完整静态资源在 ZIP 内，SHA256SUMS 用于校验。**不包含预建数据库或来源归档。**\n\n项目仍为开发版；未完成的跨浏览器及认证来源验收不因创建 Release 而视为通过。见仓库 docs/UI.md 与 docs/RELEASING.md。\n`;
    // Keep the creation response ID. Tag/list lookups can lag a new draft.
    draft=await releaseRequest('releases',{method:'POST',body:{tag_name:tag,target_commitish:commit,name:tag,body:notes,draft:true}});
  } else {
    draft=await releaseRequest(`releases/${draft.id}`);
  }
  if (!draft?.draft || draft.target_commitish!==commit) throw new Error('Release is no longer our draft');
  if(draft.assets.some(a=>!names.includes(a.name))) throw new Error('Draft has unexpected assets');
  for(const name of names) {
    const old=draft.assets.find(a=>a.name===name);
    if(old) await releaseRequest(`releases/assets/${old.id}`,{method:'DELETE'});
    const asset=await releaseRequest(`releases/${draft.id}/assets?name=${encodeURIComponent(name)}`,{method:'POST',body:await readFile(join(directory,name)),upload:true});
    const bytes=await releaseRequest(`releases/assets/${asset.id}`,{binary:true});
    if(createHash('sha256').update(bytes).digest('hex')!==expected.get(name)) throw new Error(`Uploaded asset readback mismatch: ${name}`);
    console.log(`Verified uploaded bytes: ${name}`);
  }
  const latest=api('releases/latest',true);
  const makeLatest=!latest || newerVersion(version,latest.tag_name.replace(/^v/,''));
  const published=await releaseRequest(`releases/${draft.id}`,{method:'PATCH',body:{draft:false,make_latest:String(makeLatest)}});
  if(published.draft || taggedCommit(tag)!==commit) throw new Error('Published release/tag verification failed');
  await output('url',published.html_url);
}
