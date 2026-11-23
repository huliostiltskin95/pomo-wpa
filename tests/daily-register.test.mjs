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
