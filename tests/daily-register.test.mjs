import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeArchive} from '../core/tempo-simple.js';
import {prepareDailyPlan,applyDailyPlan} from '../obsidian/daily-plan.js';
import {creditedWork,parseRegister} from '../obsidian/daily-register.js';

test('registro giornaliero: lordo, sessioni senza orario, correzioni e cancellazioni',()=>{
 let state=normalizeArchive({sessions:[]}),sequence=0,previousSource;
 const apply=source=>{
  const proposal=prepareDailyPlan({state,source,previousSource,date:'1995-01-01',blockId:'daily',id:()=>String(++sequence)});
  applyDailyPlan(state,proposal);state=normalizeArchive(state);previousSource=source;
 };
 const source='date: 1995-01-01\nStudio @2h 14:00 = 4\n- [[Aritmetica]]\n- [[Geometria|Geo]]\n- [[Fisica]]\nPersonale @1h = 1\n- [[Spesa]]';
 apply(source);const ids=state.history.map(h=>h.sessionId);
 apply(source);assert.deepEqual(state.history.map(h=>h.sessionId),ids);
 assert.deepEqual(state.history.map(h=>h.start),['14:00','14:30','15:00','15:30',null]);
 assert.equal(state.sessions.length,4);
 state.sessions[0].actualSeconds=1500;
 const totals=()=>Object.fromEntries(creditedWork(state,()=>null,()=>null));
 assert.deepEqual(totals(),{'Aritmetica.md':1800,'Geometria.md':1800,'Fisica.md':1800,'Spesa.md':3600});
 apply('Studio @8h = 1\n- [[Fisica|Ripasso]]');
 assert.deepEqual(totals(),{'Fisica.md':28800});assert.equal(state.sessions.length,0);
 apply('date: 1995-01-01');assert.deepEqual(totals(),{});assert.equal(state.history.length,0);
});

test('ripartizione esatta e orario per sessione',()=>{
 const areas=normalizeArchive({sessions:[]}).defaults.simple.areas;
 const rows=parseRegister('Studio @1h = 7\n-\n- 23:55 [[A]]',areas);
 assert.deepEqual(rows.map(r=>r.minutes),[9,9,9,9,8,8,8]);
 assert.equal(rows[0].start,null);assert.equal(rows[2].dayOffset,1);
 assert.throws(()=>parseRegister('Studio @1h = 1\n- [[A]]\n- [[B]]',areas));
});

import {parseAreaRegister} from '../obsidian/area-register.js';
import {getPhase,sessionBounds} from '../core/tempo-core.js';
test('budget e tempo svolto indipendenti, timer con precisione al secondo',()=>{
 const state=normalizeArchive({sessions:[]}),date='2026-11-23',blockId='budget';
 let next=0;
 const plan=source=>prepareDailyPlan({source,date,blockId,state,id:()=>String(++next)});
 const source='Studio @8\n- [[Matematica#Fibonacci|Fibonacci]] @1 = 2\n- [[Geografia#Vaticano|Vaticano]] @60m = 1\n- [[Greco]] @6h = 12\nPersonale @4h\n- [[Personale#Budapest|Budapest]] @1h = 2 +02:50';
 const result=plan(source);
 assert.deepEqual(result.budgets.map(b=>[b.seconds,b.assigned]),[[28800,28800],[14400,3600]]);
 applyDailyPlan(state,result);assert.equal(state.history.length,17);
 assert.deepEqual(state.sessions.map(s=>[s.start,s.end]),[['02:50','03:20'],['03:20','03:50']]);
 assert.equal(creditedWork(state,()=>null,()=>null).get('Personale.md'),3600);
 const short=plan('Studio @60\n- [[Greco]] @65s = 2 +23:59');
 applyDailyPlan(state,short);normalizeArchive(state);
 assert.equal(short.budgets[0].seconds,216000);
 const [first,second]=state.sessions.map(sessionBounds);
 assert.equal(second.start-first.start,33000);assert.equal(second.end-second.start,32000);
 assert.equal(getPhase(state.sessions[0],new Date(+first.start+30000)).kind,'break');
 assert.deepEqual(state.history.map(h=>Math.round(h.minutes*60)),[33,32]);
 assert.equal(getPhase(state.sessions[1],second.start).kind,'work');
 const areas=state.defaults.simple.areas;
 for(const bad of ['[[Greco]] 1h 2 02:50','- [[Greco]] @1h 2 +02:50']){
  assert.throws(()=>parseAreaRegister('Studio @8h\n'+bad,areas),/Prova: - \[\[Greco\]\] @1h = 2 \+02:50/);
 }
 assert.throws(()=>plan('Studio @8h\n- [[A]] [[B]] @1h = 2'),/un solo wikilink/);
 assert.equal(plan('Personale @4h').records.length,0);
});
