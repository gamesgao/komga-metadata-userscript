import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateVersion, releaseDecision, newerVersion, assetBase, latestBase, userFilename, metaFilename } from '../release-config.mjs';

test('release versions are canonical stable semver and safe tag names',()=>{
  assert.equal(validateVersion('0.2.1'),'0.2.1');
  for(const value of ['01.2.3','1.2','1.2.3-beta','v1.2.3','1.2.3\n','../../main','1.2.3;exit',null,'9007199254740992.0.0'])
    assert.throws(()=>validateVersion(value));
});
test('published releases stay immutable and only matching drafts can resume',()=>{
  assert.equal(releaseDecision(null,undefined,'abc'),true);
  assert.equal(releaseDecision(null,'abc','abc'),true);
  assert.equal(releaseDecision({draft:true,target_commitish:'abc'},undefined,'abc'),true);
  assert.equal(releaseDecision({draft:false},'previous','new'),false);
  assert.throws(()=>releaseDecision(null,'other','abc'));
  assert.throws(()=>releaseDecision({draft:true,target_commitish:'other'},'abc','abc'));
});
test('latest version comparisons do not downgrade or sort numbers lexicographically',()=>{
  assert.equal(newerVersion('0.2.1','0.2.0'),true);
  assert.equal(newerVersion('0.10.0','0.9.9'),true);
  assert.equal(newerVersion('1.0.0','0.99.99'),true);
  assert.equal(newerVersion('0.2.0','0.2.1'),false);
  assert.equal(newerVersion('0.2.1','0.2.1'),false);
});
test('metadata-only update file matches generated userscript and package version',async()=>{
  const pkg=JSON.parse(await readFile('package.json','utf8'));
  const lock=JSON.parse(await readFile('package-lock.json','utf8'));
  const script=await readFile(`dist/${userFilename}`,'utf8');
  const meta=await readFile(`dist/${metaFilename}`,'utf8');
  assert.equal(meta,script.slice(0,script.indexOf('// ==/UserScript==')+'// ==/UserScript=='.length)+'\n');
  assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
  assert.equal(meta.match(/^\/\/ @version\s+(.+)$/m)[1],pkg.version);
  assert.equal(meta.match(/^\/\/ @updateURL\s+(.+)$/m)[1],latestBase+metaFilename);
  assert.equal(meta.match(/^\/\/ @downloadURL\s+(.+)$/m)[1],latestBase+userFilename);
  assert.ok(!meta.includes('function '));
});
test('release runtime is version-pinned while developer builds retain main assets',async()=>{
  const version=JSON.parse(await readFile('package.json','utf8')).version;
  const script=await readFile(`dist/${userFilename}`,'utf8');
  assert.ok(assetBase(version,true).includes(`/v${version}/dist/catalog/`));
  assert.ok(assetBase(version,false).includes('/main/dist/catalog/'));
  assert.ok(script.includes(process.env.KOMGA_METADATA_ASSET_BASE || assetBase(version,process.env.KOMGA_METADATA_RELEASE==='1')));
});
