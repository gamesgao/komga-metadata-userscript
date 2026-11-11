// @vitest-environment jsdom
import { describe,it,expect,vi } from 'vitest';
import { EhTagTranslation, dictionaryKey, parseDictionary, translateExisting } from '../src/eh-tag-translation';
import { languageFields, wantsChineseTags } from '../src/languages';
import type { MetadataRecord } from '../src/model';
const db=JSON.stringify({version:7,head:{sha:'sample'},data:[{namespace:'female',data:{glasses:{name:'眼镜👓'}}},{namespace:'male',data:{glasses:{name:'眼镜👓'}}},{namespace:'character',data:{alice:{name:'爱丽丝'}}},{namespace:'parody',data:{test:{name:'作品'}}}]});
const record:MetadataRecord={provider:'ehentai',id:'1/x',url:'https://e-hentai.org/g/1/x/',titles:[{text:'日本語の作品',type:'native',language:'ja'}],authors:[],tags:['female:glasses','male:glasses','character:alice','parody:test','other:glasses','unknown:never'],genres:[],covers:[],links:[],raw:{}};
const signal=()=>new AbortController().signal;
function setup(){let value:unknown;let now=100;const store={get:<T>(_k:string,f:T)=>(value??f) as T,set:vi.fn((_k:string,v:unknown)=>{value=v})};const request=vi.fn(async()=>({status:200,text:db,headers:{},finalUrl:''}));const translator=new EhTagTranslation({request},store,()=>now);return{store,request,translator,time:(t:number)=>{now=t},reopen:()=>new EhTagTranslation({request},store,()=>now)};}
describe('EhTagTranslation',()=>{
 it('loads names, preserves raw records and simplifies descriptive prefixes without filtering',async()=>{
  const s=setup();await s.translator.load(signal());const a=s.translator.project(record);
  expect(a.record.tags).toEqual(record.tags);expect(a.record.translatedTags).toEqual(['眼镜','眼镜','character:爱丽丝','parody:作品','other:glasses','unknown:never']);
  expect(a.matched).toBe(4);
  expect(s.translator.project({...record,provider:'bangumi'}).record).toEqual({...record,provider:'bangumi'});
 });
 it('Chinese preference controls output; mixed Chinese/Japanese works and other languages retain raw keys',async()=>{
  const s=setup();await s.translator.load(signal());const p=s.translator.project(record);
  expect(wantsChineseTags(['zh','ja'])).toBe(true);expect(wantsChineseTags(['en','ja'])).toBe(false);
  expect(languageFields(p.record,['zh','ja']).tags).toEqual(['眼镜','character:爱丽丝','parody:作品','other:glasses','unknown:never']);
  for(const languages of [['en'],['ja'],[]] as const) expect(languageFields(p.record,[...languages]).tags).toEqual(record.tags);
  expect(languageFields(p.record,['ja']).title).toBe('日本語の作品');
  expect(translateExisting(['Female:Glasses','手动保留','female:unrelated'],p.replacements)).toEqual(['眼镜','手动保留','female:unrelated']);
 });
 it('uses persistent fresh cache and refreshes after a day',async()=>{
  const s=setup();await s.translator.load(signal());await s.reopen().load(signal());expect(s.request).toHaveBeenCalledTimes(1);expect(s.store.set).toHaveBeenCalledWith(dictionaryKey,expect.objectContaining({format:1}));
  s.time(86400101);await s.reopen().load(signal());expect(s.request).toHaveBeenCalledTimes(2);
 });
 it('keeps stale valid cache after HTTP/invalid-body failure',async()=>{
  const s=setup();await s.translator.load(signal());s.time(86400101);s.request.mockResolvedValue({status:502,text:'bad',headers:{},finalUrl:''});
  expect((await s.reopen().load(signal())).warning).toContain('缓存');expect(s.store.set).toHaveBeenCalledTimes(1);
  s.request.mockResolvedValue({status:200,text:'{}',headers:{},finalUrl:''});expect((await s.reopen().load(signal())).warning).toContain('缓存');expect(s.store.set).toHaveBeenCalledTimes(1);
 });
 it('refuses invalid fresh data without a cache, and cancellation never silently falls back',async()=>{
  const s=setup();s.request.mockResolvedValue({status:200,text:'<html>fail</html>',headers:{},finalUrl:''});await expect(s.translator.load(signal())).rejects.toThrow('词库不可用');expect(s.store.set).not.toHaveBeenCalled();
  s.request.mockResolvedValue({status:200,text:db,headers:{},finalUrl:''});await s.translator.load(signal());s.time(86400101);
  const c=new AbortController();s.request.mockImplementation(async()=>{c.abort();return{status:200,text:db,headers:{},finalUrl:''}});await expect(s.translator.load(c.signal)).rejects.toThrow('取消');
 });
 it('rejects empty or malformed dictionaries and does not use prototype entries',async()=>{
  for(const body of ['{}','{"data":[]}','{"data":[{"namespace":"female","data":{}}]}']) expect(()=>parseDictionary(body)).toThrow();
  const s=setup();await s.translator.load(signal());expect(s.translator.project({...record,tags:['female:constructor','__proto__:glasses']}).matched).toBe(0);
 });
});
