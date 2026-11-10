// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { languageOf, languageFields } from '../src/languages';
import { mergeRecords, combineField, canMergeField } from '../src/merge';
import { createRegistry } from '../src/providers';
import type { MetadataRecord } from '../src/model';
const r: MetadataRecord = { provider:'anilist',id:'1',url:'https://anilist.co/manga/1',titles:[{text:'日本語の作品',type:'native',language:'ja'},{text:'English title',type:'localized',language:'en'},{text:'中文标题',type:'localized',language:'zh'},{text:'Nihongo no Sakuhin',type:'alias',language:'romaji'}],summary:'An English description',summaryLanguage:'en',authors:[{name:'山田',native:'山田',localized:'Yamada',localizedLanguage:'romaji',role:'writer'}],tags:[],genres:[],covers:[{url:'https://example.com/a.jpg',language:'ja'},{url:'https://example.com/b.jpg',language:'en'}],links:[],raw:{} };
describe('language-aware existing source values (not translation)',()=>{
 it('recognizes aliases without guessing Latin names or Han-only languages',()=>{
  expect(languageOf('','jp')).toBe('ja');expect(languageOf('','ch')).toBe('zh');expect(languageOf('','zh-Hant')).toBe('zh');expect(languageOf('','ja-ro')).toBe('romaji');
  expect(languageOf('Yamada')).toBe('unknown');expect(languageOf('山田')).toBe('unknown');expect(languageOf('物語の始まり')).toBe('ja');
 });
 it('filters titles, summaries, author alternatives and covers without changing original work language',()=>{
  expect(languageFields(r,['en'])).toMatchObject({title:'English title',summary:'An English description',authors:[]});
  expect(languageFields(r,['romaji'])).toMatchObject({title:'Nihongo no Sakuhin',summary:undefined,authors:[{name:'Yamada',role:'writer'}]});
  expect(languageFields(r,['zh']).title).toBe('中文标题');expect(languageFields(r,['ja']).title).toBe('日本語の作品');
  expect(mergeRecords([r],{},['en']).covers.map(c=>c.cover.url)).toEqual(['https://example.com/b.jpg']);
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
