import test from 'node:test';
import assert from 'node:assert/strict';
import {bangumi,bookwalker,bookwalkerBook,mangabaka} from '../src/mappings.mjs';

test('Bangumi maps real contributor roles, not publishers/magazines as authors',()=>{
 const s={id:1,name:'テスト (1)',series:false,date:'2020-08-18',infobox:'{{Infobox\n|原作= 作者A\n|作画= 作者B\n|出版社= 出版社\n}}'};
 const persons=[{person:{id:1,name:'作者A',summary:'Biography'},relation:{position:2007}},{person:{id:2,name:'作者B'},relation:{position:2002}},{person:{id:3,name:'雑誌'},relation:{position:2005}},{person:{id:4,name:'出版社'},relation:{position:2004}}];
 const r=bangumi(s,persons);
 assert.deepEqual(r.authors,[{name:'作者A',role:'writer'},{name:'作者B',role:'penciller'}]);
 assert.equal(r.volume,1);assert.equal(r.publisher,'出版社');assert.equal(r.releaseDate,'2020-08-18');
 assert.equal(r.raw.persons[0].person.summary,undefined);assert.equal(persons[0].person.summary,'Biography');
 assert.equal(r.raw.persons.length,4);assert.deepEqual(r.covers,[]);
});
test('BookWalker uses full display title, source sale day and series contributor union',()=>{
 const b=bookwalkerBook({id:'PRD_1',content_id:'CNT_1',level:2,title:'Volume 1',display_title:'作品, Vol. 1',on_sale_at:'2021-11-09T08:00:00.000Z'},[{name:'作者',role:1}],[],null);
 assert.equal(b.titles[0].text,'作品, Vol. 1');assert.equal(b.releaseDate,'2021-11-09');assert.equal(b.volume,1);
 const s=bookwalker({id:'CNT_SERIES',title:'作品',listed_at:'2024-11-26T08:00:00.000Z'},[],null,[b,b]);
 assert.deepEqual(s.authors,[{name:'作者',role:'writer'}]);assert.equal(s.releaseDate,undefined);
});
test('dates preserve precision and reject impossible dates rather than making up a day',()=>{
 for(const value of ['2020','2020-08','2020-02-31','不明'])assert.equal(bangumi({id:1,name:'作品',date:value}).releaseDate,undefined);
 assert.equal(bangumi({id:1,name:'作品',date:'2020年8月18日'}).releaseDate,'2020-08-18');
 assert.equal(mangabaka({id:1,titles:[{title:'作品',language:'ja'}],original_language:'ja',published_start_date:'2021-11-09T08:00:00.000Z'}).releaseDate,'2021-11-09');
});
