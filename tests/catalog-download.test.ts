// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { downloadArchive } from '../src/catalog-download';
afterEach(()=>vi.unstubAllGlobals());
function harness(status=200, finalBytes=6, hold=false) {
 const write=vi.fn(async()=>{}),close=vi.fn(async()=>{}),abort=vi.fn(async()=>{}),removeEntry=vi.fn(async()=>{});
 const file=new File(['source'],'source.zip');const handle={createWritable:async()=>({write,close,abort}),getFile:async()=>file};
 const directory={getFileHandle:async()=>handle,removeEntry};
 vi.stubGlobal('isSecureContext',true);vi.stubGlobal('navigator',{storage:{getDirectory:async()=>({getDirectoryHandle:async()=>directory})}});
 vi.stubGlobal('GM_xmlhttpRequest',(options:any)=>{
  const stream=new ReadableStream<Uint8Array>({start(controller){if(!hold){controller.enqueue(new Uint8Array([1,2,3]));controller.enqueue(new Uint8Array([4,5,6]));controller.close();}}});
  queueMicrotask(()=>{options.onloadstart({status:0,response:stream});if(!hold)options.onload({status,responseHeaders:`Content-Length: ${finalBytes}`});});
  return {abort:()=>options.onabort()};
 });
 return {write,close,abort,removeEntry,file};
}
it('streams status=0 onloadstart, waits for final HTTP status, writes chunks then returns file',async()=>{
 const h=harness(),progress=vi.fn();const result=await downloadArchive('https://example.test/data','archive.zip',new AbortController().signal,progress);
 expect(result.file).toBe(h.file);expect(h.write).toHaveBeenCalledTimes(2);expect(h.close).toHaveBeenCalledTimes(1);expect(progress).toHaveBeenLastCalledWith(6,6);expect(h.removeEntry).not.toHaveBeenCalled();await result.cleanup();expect(h.removeEntry).toHaveBeenCalledTimes(1);
});
it('rejects final HTTP errors and short data without committing partial archive',async()=>{
 for(const [status,size,message] of [[403,6,'HTTP 403'],[200,8,'长度不符']] as const){
  const h=harness(status,size);await expect(downloadArchive('https://example.test/data','archive.zip',new AbortController().signal,()=>{})).rejects.toThrow(message);expect(h.close).not.toHaveBeenCalled();expect(h.abort).toHaveBeenCalled();expect(h.removeEntry).toHaveBeenCalled();
 }
});
it('cancellation aborts stream and clears temporary file',async()=>{
 const h=harness(200,6,true),c=new AbortController();const task=downloadArchive('https://example.test/data','archive.zip',c.signal,()=>{});const assertion=expect(task).rejects.toThrow('取消');await new Promise(r=>setTimeout(r,5));c.abort();await assertion;expect(h.removeEntry).toHaveBeenCalled();expect(h.close).not.toHaveBeenCalled();
});
