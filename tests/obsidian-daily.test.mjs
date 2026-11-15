import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeArchive} from '../core/tempo-simple.js';
import {blockIdentity,resolveDailyDate,findDailyBlocks,replaceDailyBlock,prepareDailyPlan,applyDailyPlan,serializeDailyPlan,archivePlanningKey} from '../obsidian/daily-plan.js';
const date='2099-11-06',now=new Date('2099-11-01T00:00:00'),blockId='block-test';
const empty=()=>normalizeArchive({sessions:[]});
let sequence=0;const prepare=(source,state=empty(),extra={})=>prepareDailyPlan({source,date,blockId,state,now,id:()=>`s-${++sequence}`,...extra});
const apply=(state,proposal)=>{applyDailyPlan(state,proposal);return normalizeArchive(state);};
test('daily date comes from ISO title, explicit directive, frontmatter or configured daily format',()=>{
 assert.equal(resolveDailyDate('',{basename:date}),date);
 assert.equal(resolveDailyDate('date: '+date,{basename:'Una nota'}),date);
 assert.equal(resolveDailyDate('',{basename:'Una nota'},{frontmatter:{date}}),date);
 assert.equal(resolveDailyDate('',{basename:'custom'},{format:'DD-MM-YYYY',moment:(name,format,strict)=>{assert.equal(format,'DD-MM-YYYY');assert.equal(strict,true);return {isValid:()=>true,format:()=>date};}}),date);
 assert.throws(()=>resolveDailyDate('',{basename:'Una nota'}),/date:/);
 assert.throws(()=>resolveDailyDate('date: 2099-02-30',{basename:date}),/non valida/);
});
test('code block location ignores surrounding/nested examples and preserves CRLF and adjacent text',()=>{
 const markdown='Prima\r\n````md\r\n```TEMPVS\r\nEsempio\r\n```\r\n````\r\n~~~tempvs\r\nStudio +10:00-12:00 -30m\r\n~~~\r\nDopo';
 const blocks=findDailyBlocks(markdown);assert.equal(blocks.length,1);
 assert.equal(blocks[0].source,'Studio +10:00-12:00 -30m');
 const result=replaceDailyBlock(markdown,blocks[0],'date: '+date+'\nLavoro +14:00-15:00 -30m');
 assert(result.startsWith('Prima\r\n````md'));assert(result.endsWith('~~~\r\nDopo'));assert(result.includes('date: '+date+'\r\nLavoro'));
 assert.equal(findDailyBlocks('```TEMPVS\nNon ancora chiuso').length,0);
});
test('daily snippet expands into whole gross sessions and roundtrips identities without duplicates',()=>{
 const plan=prepare('Studio +10:00-12:00 -30m');assert.equal(plan.sessions.length,4);
 let state=apply(empty(),plan);const originalIds=state.sessions.map(s=>s.id);
 const source=serializeDailyPlan(state.sessions,date,blockId);
 assert.equal(blockIdentity(source),blockId);
 const next=prepare(source,state);state=apply(state,next);
 assert.deepEqual(state.sessions.map(s=>s.id),originalIds);assert.equal(state.sessions.length,4);
});
test('overnight rows retain the next-day offset and leave unused minutes explicit',()=>{
 const plan=prepare('Studio +23:50-01:00 -30m');assert.equal(plan.unusedMinutes,10);
 const state=apply(empty(),plan),source=serializeDailyPlan(state.sessions,date,blockId);
 assert(source.includes('+1d'));const next=prepare(source,state);
 assert.deepEqual(next.sessions.map(s=>[s.date,s.start,s.end]),[[date,'23:50','00:20'],['2099-11-07','00:20','00:50']]);
 const added=prepare(source+'\nStudio +00:50-01:20 -30m +1d',state);assert.equal(added.sessions.at(-1).date,'2099-11-07');
});
test('matching existing plugin sessions adopts stable IDs and preserves custom pauses',()=>{
 let state=apply(empty(),prepare('Studio @45m +10:00 !5m'));
 delete state.sessions[0].noteBlockId;const id=state.sessions[0].id;
 const plan=prepare('Studio +10:00-10:45 -45m',state);
 assert.equal(plan.sessions[0].id,id);assert.equal(plan.sessions[0].customBreakMinutes,5);
 assert.equal(plan.sessions[0].noteBlockId,blockId);
});
test('editing a linked future row retains identity and deleting it creates a tombstone',()=>{
 let state=apply(empty(),prepare('Studio +10:00-11:00 -30m'));
 const id=state.sessions[0].id;
 let source=serializeDailyPlan(state.sessions,date,blockId).replace('Studio +10:00-10:30','Lavoro +14:00-14:30');
 state=apply(state,prepare(source,state));assert.equal(state.sessions[0].id,id);assert.equal(state.sessions[0].area,'Lavoro');assert.equal(state.sessions[0].start,'14:00');
 source=serializeDailyPlan(state.sessions,date,blockId).split('\n').filter(line=>!line.includes('tempvs-session:'+id)).join('\n');
 state=apply(state,prepare(source,state));assert.equal(state.sessions.length,1);assert(state.syncDeleted.sessions.includes(id));
});
test('started and completed rows stay visible and cannot be moved or removed',()=>{
 for(const properties of [{actualSeconds:60},{finished:true},{timerStartedAt:'2099-11-06T10:00:13',timerEndsAt:'2099-11-06T10:30:13'}]){
  const state=apply(empty(),prepare('Studio +10:00-10:30 -30m'));Object.assign(state.sessions[0],properties);
  const source=serializeDailyPlan(state.sessions,date,blockId);
  assert.equal(prepare(source,state).sessions[0].id,state.sessions[0].id);
  assert.throws(()=>prepare(source.replace('+10:00-10:30','+14:00-14:30'),state),/avviate o concluse/);
  assert.throws(()=>prepare('',state),/avviata o conclusa/);
 }
});
test('rows cannot claim IDs owned by another block or silently resurrect deleted sessions',()=>{
 const state=apply(empty(),prepare('Studio +10:00-10:30 -30m'));
 const source=serializeDailyPlan(state.sessions,date,blockId);
 assert.throws(()=>prepare(source,state,{blockId:'another'}),/altro blocco/);
 state.syncDeleted.sessions.push(state.sessions[0].id);state.sessions=[];
 assert.throws(()=>prepare(source,state),/eliminata/);
});
test('invalid later rows, duplicate IDs, overlaps and past new sessions are rejected atomically',()=>{
 const state=empty(),before=JSON.stringify(state);
 for(const source of ['Studio +10:00-12:00 -30m\nSconosciuta +14:00-15:00 -30m','Studio +10:00-11:00 -30m\nLavoro +10:15-11:15 -30m'])assert.throws(()=>prepare(source,state));
 assert.equal(JSON.stringify(state),before);
 const saved=apply(empty(),prepare('Studio +10:00-10:30 -30m'));
 const source=serializeDailyPlan(saved.sessions,date,blockId),line=source.split('\n').at(-1);
 assert.throws(()=>prepare(source+'\n'+line,saved),/duplicati/);
 assert.throws(()=>prepare('Studio +10:00-10:30 -30m',empty(),{now:new Date('2099-11-07')}),/passato/);
});
test('range edits preserve pause settings, explicit legacy modifiers replace conflicting settings',()=>{
 let state=apply(empty(),prepare('Studio @1h +10:00 -60m'));
 const id=state.sessions[0].id;
 const plan=prepare(`Studio @45m +14:00 !5m <!-- tempvs-session:${id} -->`,state);
 assert.equal(plan.sessions[0].customBreakMinutes,5);assert.equal(plan.sessions[0].cycleMinutes,undefined);
 state=apply(state,plan);
 assert.throws(()=>prepare(`Studio +14:00-14:03 -3m <!-- tempvs-session:${id} -->`,state),/sessioni non valido/);
});
test('timer observations do not invalidate previews and measured focus is never overwritten',()=>{
 const state=apply(empty(),prepare('Studio +10:00-10:30 -30m'));
 const source=serializeDailyPlan(state.sessions,date,blockId),plan=prepare(source,state),key=archivePlanningKey(state);
 state.sessions[0].actualSeconds=10;assert.equal(archivePlanningKey(state),key);
 applyDailyPlan(state,plan);assert.equal(state.sessions[0].actualSeconds,10);
});
