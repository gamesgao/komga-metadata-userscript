import { readFile, appendFile, writeFile, mkdtemp, rm, mkdir } from 'node:fs/promises';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { repository, validateVersion, releaseDecision, newerVersion } from './release-config.mjs';

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
const existing=api(`releases/tags/${tag}`,true);
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
  if (!existing) {
    const notes=`## 安装与更新\n\n安装附件 komga-metadata.user.js；已有用户由 komga-metadata.meta.js 检查更新。\n\n本版本来自通过 Verify userscript 的提交 ${commit}，发布构建另跑浏览器回归。\n\nWorker/WASM 固定到 ${tag}，完整静态资源在 ZIP 内，SHA256SUMS 用于校验。**不包含预建数据库或来源归档。**\n\n项目仍为开发版；未完成的跨浏览器及认证来源验收不因创建 Release 而视为通过。见仓库 docs/UI.md 与 docs/RELEASING.md。\n`;
    await writeFile(join(directory,'notes.md'),notes);
    gh(['release','create',tag,'--repo',repository,'--draft','--target',commit,'--title',tag,'--notes-file',join(directory,'notes.md')]);
  }
  // Recheck before --clobber: never update assets of an already-published release.
  const draft=api(`releases/tags/${tag}`);
  if (!draft.draft || draft.target_commitish!==commit) throw new Error('Release is no longer our draft');
  gh(['release','upload',tag,'--repo',repository,'--clobber',...names.map(n=>join(directory,n))]);
  const uploaded=api(`releases/tags/${tag}`).assets.map(a=>a.name).sort();
  if (JSON.stringify(uploaded)!==JSON.stringify([...names].sort())) throw new Error('Draft has unexpected/missing assets');
  await mkdir('.runtime',{recursive:true});
  const check=await mkdtemp(join('.runtime','release-readback-'));
  try {
    gh(['release','download',tag,'--repo',repository,'--dir',check]);
    for (const [name,hash] of expected) {
      if(createHash('sha256').update(await readFile(join(check,name))).digest('hex')!==hash) throw new Error(`Uploaded asset readback mismatch: ${name}`);
    }
  } finally { await rm(check,{recursive:true,force:true}); }
  const latest=api('releases/latest',true);
  const makeLatest=!latest || newerVersion(version,latest.tag_name.replace(/^v/,''));
  gh(['release','edit',tag,'--repo',repository,'--draft=false',`--latest=${makeLatest}`]);
  const published=api(`releases/tags/${tag}`);
  if(published.draft || taggedCommit(tag)!==commit) throw new Error('Published release/tag verification failed');
  await output('url',published.html_url);
}
