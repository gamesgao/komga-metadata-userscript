import {it,expect,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {hash} from '../src/writer';
it('hashes covers on insecure HTTP without WebCrypto and with bounded reads',async()=>{
 const bytes=new Uint8Array(2*1024*1024+57).fill(93);
 const source=new Blob([bytes]);
 const slice=vi.spyOn(source,'slice');
 const whole=vi.spyOn(source,'arrayBuffer');
 vi.stubGlobal('crypto',undefined);
 try{
  expect(await hash(source)).toBe(createHash('sha256').update(bytes).digest('hex'));
  expect(whole).not.toHaveBeenCalled();
  expect(slice.mock.calls.every(([start=0,end=0])=>end-start<=1024*1024)).toBe(true);
  expect(await hash(new Blob([]))).toBe(createHash('sha256').digest('hex'));
 }finally{vi.unstubAllGlobals();}
});
