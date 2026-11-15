import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeArchive} from '../core/tempo-simple.js';
import {getActiveSession,getNextSession,getPhase} from '../core/tempo-core.js';
import {prepareDailyPlan,applyDailyPlan,daySessions,archivePlanningKey} from '../obsidian/daily-plan.js';
const date='2026-11-15',now=new Date(date+'T20:25:00'),blockId='daily';
const source=`date: ${date}
Personale +01:26-01:56 -30m
Studio +15:00-16:00 -60m
Svago +18:30-21:00 -120m
Studio +21:00-23:00 -60m`;
const empty=()=>normalizeArchive({sessions:[],defaults:{simple:{areas:['Studio','Lavoro','Personale','Svago'].map(name=>({name,description:''}))}}});
const old=(id,start,end,extra={})=>({id,date,start,end,title:'Studio',area:'Studio',workMinutes:25,breakEnabled:true,actualSeconds:0,...extra});
let sequence=0;
const plan=(state,text=source,extra={})=>prepareDailyPlan({source:text,date,now,blockId,state,id:()=>`new-${++sequence}`,...extra});
const apply=(state,p)=>{applyDailyPlan(state,p);return normalizeArchive(state);};
test('screenshot note replaces legacy unowned reservations and drives the 20:25 break timer',()=>{
 let state=empty();state.sessions=[old('old-record','18:00','22:00',{actualSeconds:3600,noteWork:{n:3600}}),old('old-future','23:00','23:45'),old('other-date','09:00','10:00',{date:'2026-11-16'})];
 state.history=[{sessionId:'old-record',date,title:'Studio',minutes:60,measured:true,noteWork:{n:3600}}];
 const proposal=plan(state);state=apply(state,proposal);
 assert.equal(proposal.sessions.length,5);assert.equal(proposal.unusedMinutes,30);
 assert.deepEqual(daySessions(state,date,blockId).map(s=>[s.area,s.start,s.end]),[['Personale','01:26','01:56'],['Studio','15:00','16:00'],['Svago','18:30','20:30'],['Studio','21:00','22:00'],['Studio','22:00','23:00']]);
 assert(state.syncDeleted.sessions.includes('old-future'));assert(state.sessions.some(s=>s.id==='other-date'));
 const retired=state.sessions.find(s=>s.id==='old-record');assert(retired.dailyRetired);assert.equal(retired.actualSeconds,0);assert.equal(retired.dailyOriginal.actualSeconds,3600);assert.deepEqual(retired.dailyOriginal.noteWork,{n:3600});assert.equal(state.history[0].minutes,0);
 const active=getActiveSession(state.sessions.filter(s=>!s.finished),now);assert.equal(active.area,'Svago');const phase=getPhase(active,now);assert.equal(phase.kind,'break');assert.equal(phase.remaining,300);
 assert.equal(state.sessions.reduce((sum,s)=>sum+s.actualSeconds,0),175*60);assert.equal(getNextSession(state.sessions.filter(s=>!s.finished),now).start,'21:00');
});
test('hidden old rows cannot prevent changes and source replay preserves current IDs and counters',()=>{
 let state=empty();state.sessions=[old('hidden','15:30','17:30',{noteBlockId:blockId,finished:true,actualSeconds:5000,actualSource:'manual'})];
 state=apply(state,plan(state));const ids=daySessions(state,date,blockId).map(s=>s.id),total=state.sessions.reduce((n,s)=>n+s.actualSeconds,0);
 state=apply(state,plan(state,source,{previousSource:source}));
 assert.deepEqual(daySessions(state,date,blockId).map(s=>s.id),ids);assert.equal(state.sessions.reduce((n,s)=>n+s.actualSeconds,0),total);assert.equal(state.sessions.find(s=>s.id==='hidden').dailyOriginal.actualSeconds,5000);
});
test('unrelated work remains archived but an omitted active timer is stopped',()=>{
 let state=empty();state.sessions=[old('morning','08:00','09:00',{actualSeconds:1200}),old('rogue-active','17:00','20:50',{actualSeconds:600})];
 state=apply(state,plan(state,'Studio +21:00-23:00 -60m'));
 assert.equal(daySessions(state,date,blockId).length,2);assert.equal(getActiveSession(state.sessions.filter(s=>!s.finished),now),null);
 for(const [id,seconds] of [['morning',1200],['rogue-active',600]]){const archived=state.sessions.find(s=>s.id===id);assert(archived.finished);assert.equal(archived.actualSeconds,seconds);assert(archived.dailyOriginal);}
});
test('overlap inside the note is still rejected before reconciling any data',()=>{
 const state=empty();state.sessions=[old('previous','10:00','12:00')];const before=JSON.stringify(state);
 assert.throws(()=>plan(state,'Studio +21:00-23:00 -60m\nSvago +21:30-22:30 -60m'),/nota si sovrappongono/);assert.equal(JSON.stringify(state),before);
});
test('actual records of another daily note are protected; orphaned binding IDs can be reconciled',()=>{
 const state=empty();state.sessions=[old('other','18:00','22:00',{noteBlockId:'other-note'})];
 assert.throws(()=>plan(state,source,{protectedBlockIds:['other-note']}),/altra nota|altr[ao] blocco|altra nota|un’altra nota/);
 const reconciled=apply(state,plan(state,source,{protectedBlockIds:[]}));assert.equal(daySessions(reconciled,date,blockId).length,5);
});
test('explicitly extending a finished record into the current slot reactivates only its corrected timer',()=>{
 let state=empty();state.sessions=[old('s','18:30','20:00',{noteBlockId:blockId,finished:true,actualSeconds:300})];
 state=apply(state,plan(state,'Svago +18:30-21:30 -180m',{previousSource:'Studio +18:30-20:00 -90m'}));
 const active=getActiveSession(state.sessions.filter(s=>!s.finished),now);assert(active);assert.equal(active.id,'s');assert.equal(active.area,'Svago');assert.equal(active.finished,false);
});
test('stale remote credits or timer flags cannot reactivate a retired overlapping record',()=>{
 let state=empty();state.sessions=[old('stale','18:00','22:00',{actualSeconds:3600})];state=apply(state,plan(state));
 Object.assign(state.sessions.find(s=>s.id==='stale'),{actualSeconds:10,noteWork:{n:10},finished:false});
 state=apply(state,plan(state,source,{previousSource:source}));
 const stale=state.sessions.find(s=>s.id==='stale');assert(stale.finished);assert.equal(stale.actualSeconds,0);assert.deepEqual(stale.noteWork,{});assert.equal(getActiveSession(state.sessions.filter(s=>!s.finished),now).area,'Svago');
});
