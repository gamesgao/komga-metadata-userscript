// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { languageOf, languageFields, languagePreferences, wantsChineseTags } from '../src/languages';
import { mergeRecords, combineField, canMergeField } from '../src/merge';
import { createRegistry } from '../src/providers';
import type { MetadataRecord } from '../src/model';
const r: MetadataRecord = { provider:'anilist',id:'1',url:'https://anilist.co/manga/1',titles:[{text:'日本語の作品',type:'native',language:'ja'},{text:'English title',type:'localized',language:'en'},{text:'中文标题',type:'localized',language:'zh'},{text:'Nihongo no Sakuhin',type:'alias',language:'romaji'}],summary:'An English description',summaryLanguage:'en',authors:[{name:'山田',native:'山田',localized:'Yamada',localizedLanguage:'romaji',role:'writer'}],tags:[],genres:[],covers:[{url:'https://example.com/a.jpg',language:'ja'},{url:'https://example.com/b.jpg',language:'en'}],links:[],raw:{} };
describe('language-aware existing source values (not translation)',()=>{
 it('recognizes aliases without guessing Latin names or Han-only languages',()=>{
  expect(languageOf('','jp')).toBe('ja');expect(languageOf('','ch')).toBe('zh');expect(languageOf('','zh-Hant')).toBe('zh');expect(languageOf('','ja-ro')).toBe('romaji');
  expect(languageOf('Yamada')).toBe('other');expect(languageOf('山田')).toBe('other');expect(languageOf('物語の始まり')).toBe('ja');
 });
 it('filters text but only sorts covers without hiding other languages',()=>{
  expect(languageFields(r,['en'])).toMatchObject({title:'English title',summary:'An English description',authors:[]});
  expect(languageFields(r,['romaji'])).toMatchObject({title:'Nihongo no Sakuhin',summary:undefined,authors:[{name:'Yamada',role:'writer'}]});
  expect(languageFields(r,['zh']).title).toBe('中文标题');expect(languageFields(r,['ja']).title).toBe('日本語の作品');
  expect(mergeRecords([r],{},['en']).covers.map(c=>c.cover.url)).toEqual(['https://example.com/b.jpg','https://example.com/a.jpg']);
 });
 it('keeps MU, MangaBaka and AniList unlabelled covers with Other disabled or all text languages disabled',()=>{
  const records = (['mangaupdates','mangabaka','anilist'] as const).map(provider=>({...r,provider,covers:[{url:`https://example.com/${provider}.jpg`}]}));
  for(const languages of [['zh','ja','en'],[]] as import('../src/model').AcceptedLanguage[][]){
   const result=mergeRecords(records,{},languages);expect(result.covers.map(c=>c.provider)).toEqual(['mangaupdates','mangabaka','anilist']);
  }
  expect(mergeRecords([...records,{...records[0]!,id:'2'}],{},['ja']).covers).toHaveLength(3);
 });
 it('does not turn a missing accepted title into an ID or overwrite filtered fields',()=>{
  const result=languageFields({...r,titles:[{text:'Unknown Latin',type:'native'}]},['ja']);
  expect(result.title).toBeUndefined();expect(result.summary).toBeUndefined();
 });
 it('keeps title alternatives separately selectable and permits same-provider records',()=>{
  const merged=mergeRecords([r,{...r,id:'2'}]);expect(merged.options.title).toHaveLength(8);
  expect(new Set(merged.options.title!.map(e=>e.key)).size).toBe(8);
 });
});
describe('per-field composition',()=>{
 it('migrates old unknown selection into Other and preserves ordered settings',()=>{
  expect(languagePreferences(['unknown','other','en']).accepted).toEqual(['en','other']);
  expect(languagePreferences(['zh','ja','en'],['en','zh','ja']).accepted).toEqual(['en','zh','ja']);
  expect(languagePreferences([]).accepted).toEqual([]);
 });
 it('uses language priority before native and before source order, falling back per field',()=>{
  expect(languageFields(r,['en','ja']).title).toBe('English title');
  const first={...r,titles:r.titles.filter(t=>t.language==='en')};
  const second={...r,id:'2',titles:[{text:' ',type:'localized' as const,language:'zh'},...r.titles.filter(t=>t.language==='ja')],summary:'日本語の説明',summaryLanguage:'ja'};
  const merged=mergeRecords([first,second],{},['zh','ja','en']);
  expect(merged.values).toMatchObject({title:'日本語の作品',summary:'日本語の説明'});
  expect(mergeRecords([first,second],{summary:'anilist:1'},['zh','ja','en']).values.summary).toBe('An English description');
  expect(mergeRecords([first,{...second,summary:undefined}],{},['zh','ja','en']).values.summary).toBe('An English description');
 });
 it('selects each author name by priority without losing other contributors',()=>{
  const data={...r,authors:[{name:'Writer',language:'en',native:'日本語の作家',nativeLanguage:'ja',localized:'中文作者',localizedLanguage:'zh',role:'writer'},{name:'Second writer',language:'en',role:'writer'}]};
  expect(languageFields(data,['zh','ja','en']).authors).toEqual([{name:'中文作者',role:'writer'},{name:'Second writer',role:'writer'}]);
  expect(languageFields(data,['ja','zh','en']).authors).toEqual([{name:'日本語の作家',role:'writer'},{name:'Second writer',role:'writer'}]);
 });
 it('uses English EH tags when English precedes Chinese and skips unavailable Japanese',()=>{
  expect(wantsChineseTags(['en','zh'])).toBe(false);expect(wantsChineseTags(['ja','zh','en'])).toBe(true);expect(wantsChineseTags(['ja','other'])).toBe(false);
 });
 it('unions arrays by meaning and combines text only on request',()=>{
  expect(combineField('tags',[['a','b'],['b','c']])).toEqual(['a','b','c']);
  expect(combineField('links',[[{label:'A',url:'https://a.com'}],[{label:'Other label',url:'https://a.com'}]])).toEqual([{label:'A',url:'https://a.com'}]);
  expect(combineField('summary',['first','first','second'])).toBe('first\n\nsecond');
  expect(combineField('title',['A','B'])).toBe('A / B');expect(combineField('tags',[])).toBeUndefined();
 });
 it('refuses fabricated merged dates, numeric ratings and enum/status values',()=>{
  for(const field of ['releaseDate','ageRating','status','isbn','language'] as const){expect(canMergeField(field,'value')).toBe(false);expect(()=>combineField(field,['value','other'])).toThrow('单值');}
 });
 it('omits all three temporarily withdrawn sources from the runnable registry',()=>{
  const registry=createRegistry({request:async()=>{throw Error('must not fetch')}});
  for(const id of ['mangadex','webtoons','yenpress']){expect(registry.list().some(p=>p.id===id)).toBe(false);expect(()=>registry.get(id)).toThrow('未接入');}
 });
});
