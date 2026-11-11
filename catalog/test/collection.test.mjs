import test from 'node:test';
import assert from 'node:assert/strict';
import { CatalogCollection } from '../src/collection.mjs';
class WorkerStub {
 postMessage(message){queueMicrotask(()=>{
  if(this.stopped)return;
  const {id,method,args}=message;
  if(method==='open'){
   if(args[0].name==='bad')return this.onmessage({data:{id,error:'invalid fixture'}});
   this.provider=args[0].name;this.manifest={provider:this.provider,source_version:'fixture',schema_version:1,analyzer_version:1};
  }
  const result=method==='search'?[{provider:this.provider,id:'1'}]:this.manifest;
  this.onmessage({data:{id,result}});
 });}
 terminate(){this.stopped=true;}
}
test('provider catalogs coexist, invalid replacement is atomic, cancelled startup cannot publish a reader',async()=>{
 let release;let hold=false;
 const c=new CatalogCollection(undefined,{workerFactory:async()=>{if(hold)await new Promise(r=>release=r);return new WorkerStub();}});
 const a=new File(['a'],'bangumi'),b=new File(['b'],'bookwalker');await c.open(a);await c.open(b);
 assert.equal(c.fileFor('bangumi'),a);assert.equal(c.fileFor('bookwalker'),b);assert.equal(c.hasProvider('ehentai'),false);
 assert.equal((await c.search('test','bangumi'))[0].provider,'bangumi');assert.equal((await c.search('test','bookwalker'))[0].provider,'bookwalker');
 await assert.rejects(c.open(new File(['bad'],'bad')));assert.equal(c.fileFor('bangumi'),a);
 hold=true;const task=c.open(new File(['new'],'ehentai'));const rejected=assert.rejects(task,/取消/);await Promise.resolve();c.cancel();release();await rejected;assert.equal(c.hasProvider('ehentai'),false);assert.equal(c.fileFor('bookwalker'),b);c.dispose();
});
