import test from 'node:test';
import assert from 'node:assert/strict';
import {syntaxTokens} from '../obsidian/syntax.js';
import {findDailyBlocks} from '../obsidian/daily-plan.js';

test('syntax styling preserves the complete task, including its anchor and alias',()=>{
 const line='- [[Personale#Budapest|Budapest]] @1h = 2 +02:50';
 const styled=syntaxTokens(line).map(({from,to,kind})=>[line.slice(from,to),kind]);
 assert.deepEqual(styled,[['-','punctuation'],['[[','punctuation'],['Personale','link'],['#Budapest','section'],['|','punctuation'],['Budapest','alias'],[']]','punctuation'],['@1h','duration'],['= 2','count'],['+02:50','time']]);
 for(const [line,kinds] of [['Studio @8h',['area','duration']],['date: 1995-01-01',['keyword','date']],['@Studio 10h',['area','duration']]]){
  assert.deepEqual(syntaxTokens(line).map(t=>t.kind),kinds);
 }
});
test('editor includes an unfinished TEMPVS fence and excludes examples inside other fences',()=>{
 const text=['````md','```TEMPVS','Studio @8h','```','````','~~~tempus','Personale @4h'].join('\n');
 assert.deepEqual(findDailyBlocks(text),[]);
 const [block]=findDailyBlocks(text,true);
 assert.equal(text.slice(block.start,block.end),'Personale @4h');
});
