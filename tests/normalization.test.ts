import {describe,it,expect} from 'vitest';
import {normalizeWriteFields} from '../src/plan';
describe('real Komga metadata storage semantics',()=>{
 it('trims/deduplicates/case-normalizes tags and genres without altering source titles or people',()=>{
  const original={tags:['NaMe:MixedCase',' 日本語 ','name:mixedcase'],genres:['Fantasy',' fantasy '],title:'Native Title',authors:[{name:'Author Name',role:'writer'}]};
  expect(normalizeWriteFields(original)).toEqual({tags:['name:mixedcase','日本語'],genres:['fantasy'],title:'Native Title',authors:[{name:'Author Name',role:'writer'}]});
  expect(original.tags).toEqual(['NaMe:MixedCase',' 日本語 ','name:mixedcase']);
 });
});
