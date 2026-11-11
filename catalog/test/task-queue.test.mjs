import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TaskQueue } from '../src/task-queue.mjs';
const tick = () => new Promise(resolve => setImmediate(resolve));
test('task queue accepts four jobs, limits concurrent work and drains after failure', async () => {
  const queue=new TaskQueue(2), releases=[];let active=0,peak=0,started=0;
  const jobs=Array.from({length:4},(_,i)=>queue.run(async()=>{started++;peak=Math.max(peak,++active);await new Promise(r=>releases.push(r));active--;if(i===0)throw Error('failure');return i;}).catch(e=>e.message));
  await tick();assert.equal(started,2);releases.shift()();await tick();assert.equal(started,3);
  releases.shift()();await tick();assert.equal(started,4);for(const release of releases)release();
  assert.deepEqual(await Promise.all(jobs),['failure',1,2,3]);assert.equal(peak,2);
});
test('cancelling a queued build never cancels the running provider', async()=>{
  const queue=new TaskQueue(1);let release,ran=false;
  const first=queue.run(()=>new Promise(r=>release=r));await tick();
  const controller=new AbortController();const second=queue.run(()=>{ran=true},controller.signal).catch(e=>e.name);
  controller.abort();assert.equal(await second,'AbortError');assert.equal(ran,false);assert.equal(queue.active,1);
  release();await first;await tick();assert.equal(queue.active,0);
});
