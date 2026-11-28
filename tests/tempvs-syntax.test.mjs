import test from 'node:test';
import assert from 'node:assert/strict';
import {syntaxTokens} from '../obsidian/syntax.js';
import {findDailyBlocks} from '../obsidian/daily-plan.js';

test('syntax styling preserves the complete task, including its anchor and alias',()=>{
 const line='- [[Personale#Budapest|Budapest]] @1h = 2 +02:50';
 const styled=syntaxTokens(line).map(({from,to,kind})=>[line.slice(from,to),kind]);
 assert.deepEqual(styled,[['-','punctuation'],['[[','punctuation'],['Personale','link'],['#Budapest','section'],['|','punctuation'],['Budapest','alias'],[']]','punctuation'],['@1h','duration'],['= 2','count'],['+02:50','time']]);
 for(const [line,kinds] of [['Studio = 8h',['area','punctuation','duration']],['Studio @8h',['area','duration']],['date: 1995-01-01',['keyword','date']],['@Studio 10h',['area','duration']]]){
  assert.deepEqual(syntaxTokens(line).map(t=>t.kind),kinds);
 }
});
test('editor includes an unfinished TEMPVS fence and excludes examples inside other fences',()=>{
 const text=['````md','```TEMPVS','Studio @8h','```','````','~~~tempus','Personale @4h'].join('\n');
 assert.deepEqual(findDailyBlocks(text),[]);
 const [block]=findDailyBlocks(text,true);
 assert.equal(text.slice(block.start,block.end),'Personale @4h');
});

import {parseAreaRegister} from '../obsidian/area-register.js';
import {parseDailySource,serializeDailyPlan} from '../obsidian/daily-plan.js';
import {flexibleAllocation} from '../obsidian/plain-syntax.js';

test('a reminder survives write-back without creating a session',()=>{
 const reminder='[[Tacito#Agricola|Agricola]]';
 assert.deepEqual(parseDailySource(reminder,[]),[]);
 assert.equal(serializeDailyPlan([],'2026-11-28',reminder),reminder);
});

test('flexible allocations retain the source row, optional clock and full note target',()=>{
 const areas=[{name:'Studio personale',id:'s'}];
 const note='[[Tacito#Agricola|Agricola]]';
 for(const [row,start] of [
  ['30m @Studio personale '+note,null],
  [note+' 14:30 @Studio personale 30m','14:30'],
  ['@Studio personale 30m '+note+' +14:30','14:30']
 ]){
  const {slots}=parseAreaRegister(note+'\n'+row,areas);
  assert.equal(slots.length,1);
  assert.deepEqual([slots[0].minutes,slots[0].start,slots[0].planned,slots[0].sourceRow],[30,start,true,1]);
  assert.equal(slots[0].linkedNotes[0].path,'Tacito#Agricola');
 }
 assert.equal(flexibleAllocation('@Studio 2h'),null);
 assert.throws(()=>parseAreaRegister('25:00 30m @Studio personale '+note,areas),/Riga 1/);
});
