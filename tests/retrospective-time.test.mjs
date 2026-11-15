import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeArchive,planSessions} from '../core/tempo-simple.js';
import {estimateProgress} from '../core/tempo-estimates.js';
import {sessionBounds} from '../core/tempo-core.js';
import {prepareDailyPlan,applyDailyPlan,serializeDailyPlan} from '../obsidian/daily-plan.js';
const date='2026-11-10',now=new Date(date+'T18:00:00'),blockId='log';
let count=0;const empty=()=>normalizeArchive({sessions:[]});
const prepare=(state,source,previousSource,clock=now)=>prepareDailyPlan({state,source,previousSource,date,blockId,now:clock,id:()=>`log-${++count}`});
const apply=(state,proposal)=>{applyDailyPlan(state,proposal);return normalizeArchive(state);};
const total=state=>state.sessions.reduce((n,s)=>n+(s.actualSeconds||0),0);
const original='Studio +10:00-12:00 -30m';
test('past range records net completed work; unchanged reload neither doubles nor increases it',()=>{
 let s=empty();s=apply(s,prepare(s,original));assert.equal(s.sessions.length,4);assert.equal(total(s),100*60);
 assert(s.sessions.every(s=>s.finished&&s.actualSource==='manual'));
 const before=JSON.stringify(s);s=apply(s,prepare(s,original,original));assert.equal(total(s),100*60);assert.equal(JSON.stringify(s),before);
});
test('elapsed old planning is not automatically promoted to completed work on reopening',()=>{
 let s=empty();s=apply(s,prepare(s,original,undefined,new Date(date+'T09:00:00')));assert.equal(total(s),0);
 const ids=s.sessions.map(s=>s.id);s=apply(s,prepare(s,original,original));assert.equal(total(s),0);assert.deepEqual(s.sessions.map(s=>s.id),ids);
});
test('plain historical correction retains IDs and records the entire corrected row as work',()=>{
 let s=empty();s=apply(s,prepare(s,original,undefined,new Date(date+'T09:00:00')));
 const ids=s.sessions.map(s=>s.id);s.sessions[0].actualSeconds=17;
 const source='Studio +10:15-12:15 -30m';s=apply(s,prepare(s,source,original));
 assert.deepEqual(s.sessions.map(s=>s.id),ids);assert.equal(total(s),100*60);assert.equal(s.sessions[0].start,'10:15');assert.equal(s.sessions[0].manualOriginal.actualSeconds,17);
});
test('shortening a past range reduces actual statistics without duplicating surplus slots',()=>{
 let s=empty();s=apply(s,prepare(s,original));const ids=s.sessions.map(s=>s.id),source='Studio +10:00-11:00 -30m';
 const plan=prepare(s,source,original);s=apply(s,plan);assert.equal(total(s),50*60);assert.equal(plan.supersededIds.length,2);
 assert.equal(s.sessions.length,4);assert(s.sessions.filter(s=>s.manualSuperseded).every(s=>s.actualSeconds===0&&s.manualOriginal.actualSeconds===1500));
 const visible=s.sessions.filter(s=>!plan.retainedIds.includes(s.id));assert.equal(serializeDailyPlan(visible,date),source);
 s=apply(s,prepare(s,source,source));assert.equal(total(s),50*60);assert.deepEqual(s.sessions.map(s=>s.id).sort(),ids.sort());
});
test('changing the gross duration or extending a historical range credits exactly the new range',()=>{
 let s=empty();s=apply(s,prepare(s,original));let source='Studio +10:00-12:00 -1h';s=apply(s,prepare(s,source,original));assert.equal(total(s),100*60);assert.equal(s.sessions.filter(s=>!s.manualSuperseded).length,2);
 const extended='Studio +10:00-13:00 -1h';s=apply(s,prepare(s,extended,source));assert.equal(total(s),150*60);
});
test('omitting an entire completed row keeps its previous history and actual credit',()=>{
 let s=empty();const source=original+'\nLavoro +14:00-15:00 -1h';s=apply(s,prepare(s,source));
 const totalBefore=total(s),plan=prepare(s,'Lavoro +14:00-15:00 -1h',source);s=apply(s,plan);
 assert.equal(total(s),totalBefore);assert.equal(plan.retainedIds.length,4);assert.equal(plan.supersededIds.length,0);
});
test('manual correction updates history and assigned note progress without double credit',()=>{
 let s=empty();const source='Studio +10:00-11:00 -1h';s=apply(s,prepare(s,source));
 const session=s.sessions[0];session.actualSeconds=1200;session.noteEstimateId='n';session.noteWork={n:600,other:300};
 s.history=[{sessionId:session.id,title:'Studio',area:session.area,areaId:session.areaId,date,minutes:20,measured:true,noteWork:{n:600,other:300}}];
 const corrected='Studio +10:00-12:00 -2h';s=apply(s,prepare(s,corrected,source));assert.equal(total(s),6000);
 const changed=s.sessions[0];assert.equal(changed.noteWork.n,3000);assert.equal(changed.noteWork.other,1500);assert.equal(s.history[0].minutes,100);
 const note={id:'n',entries:[{area:'Studio',areaId:session.areaId,count:4,minutes:30}]};assert.equal(estimateProgress(note,s,{now}).done,3000);
});
test('active interval corrections clear obsolete immediate-timer bounds and credit only elapsed focus',()=>{
 let s=empty();const source='Studio +10:00-11:00 -1h';s=apply(s,prepare(s,source,undefined,new Date(date+'T09:00:00')));
 Object.assign(s.sessions[0],{timerStartedAt:date+'T10:00:53',timerEndsAt:date+'T11:00:53',actualSeconds:5,paused:true});
 s=apply(s,prepare(s,'Studio +10:10-11:10 -1h',source,new Date(date+'T10:40:00')));
 const session=s.sessions[0];assert.equal(session.actualSeconds,30*60);assert.equal(session.timerStartedAt,undefined);assert.equal(session.timerEndsAt,undefined);assert.equal(session.paused,true);assert(!session.finished);assert.equal(sessionBounds(session).start.getMinutes(),10);
});
test('new future reservations remain unrecorded and core PWA planning still rejects past starts',()=>{
 const s=empty(),plan=prepare(s,'Studio +19:00-20:00 -1h');assert.equal(plan.sessions[0].actualSeconds,0);assert.equal(plan.sessions[0].actualSource,undefined);
 assert.throws(()=>planSessions([{area:'Studio',minutes:60,start:'10:00'}],[],[],s.defaults,now,()=> 'x',date),/passato/);
});
test('overlapping historical corrections are refused and source archive stays untouched',()=>{
 let s=empty();s=apply(s,prepare(s,original+'\nLavoro +14:00-15:00 -1h'));const before=JSON.stringify(s);
 assert.throws(()=>prepare(s,'Studio +14:00-16:00 -30m\nLavoro +14:00-15:00 -1h',original+'\nLavoro +14:00-15:00 -1h'),/sovrappongono/);
 assert.equal(JSON.stringify(s),before);
});
test('manual work after midnight has correct day offsets and exact net pause deduction',()=>{
 const s=empty(),source='Studio +23:00-01:00 -1h',plan=prepare(s,source,undefined,new Date('2026-11-11T02:00:00'));
 assert.deepEqual(plan.sessions.map(s=>s.date),[date,'2026-11-11']);assert.equal(plan.sessions.reduce((n,s)=>n+s.actualSeconds,0),100*60);
 const custom=prepare(empty(),'Studio @45m +10:00 !5m').sessions[0];assert.equal(custom.actualSeconds,40*60);
});
test('formatting and equivalent duration units never convert unchanged old plans to work',()=>{
 let s=empty();s=apply(s,prepare(s,original,undefined,new Date(date+'T09:00:00')));
 s=apply(s,prepare(s,'  Studio   + 10:00 - 12:00   - 0,5 h',original));assert.equal(total(s),0);
});
