import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesTitlePhrases} from '../src/phrase.mjs';
const record=(...titles)=>({titles:titles.map(text=>({text}))});
test('Japanese phrases cannot be synthesized from scattered aliases',()=>{
 assert.equal(matchesTitlePhrases(record('東京都','京都大学'),'東京大学'),false);
 assert.equal(matchesTitlePhrases(record('東京大学物語'),'東京大学'),true);
 assert.equal(matchesTitlePhrases(record('葬送のフリーレン (1)'),'葬送のフリーレン'),true);
 assert.equal(matchesTitlePhrases(record('ＦＲＩＥＲＥＮ Vol. 1'),'frieren'),true);
 assert.equal(matchesTitlePhrases(record('葬送のフリーレン'),'葬送 フリーレン'),true);
});
