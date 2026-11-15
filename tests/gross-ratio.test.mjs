import test from 'node:test';
import assert from 'node:assert/strict';
import {parseQuick,planSessions,normalizeArchive,measuredFocus} from '../core/tempo-simple.js';
import {getPhase,sessionBounds} from '../core/tempo-core.js';
import {rowRequest} from '../planner-table.js';
import {prepareDailyPlan,applyDailyPlan} from '../obsidian/daily-plan.js';
const date='2099-11-15',now=new Date('2099-11-15T09:00:00'),areas=[{name:'Personale'}];
const defaults={workMinutes:17,breakEnabled:false,customBreakMinutes:1};
let id=0;
for(const minutes of [1,3,7,30,45,60,90,300,1439])test(`range ${minutes} minutes has exact 5:1 through table, timer and backup`,()=>{
 const source=minutes<=60?`Personale +15:00-16:00 -${minutes}m`:`Personale +00:00-23:59 -${minutes}m`;
 const requests=parseQuick(source,areas);
 // PWA imports a cycle row; changing defaults cannot replace its explicit ratio.
 const rows=requests.map(r=>rowRequest({area:r.area,minutes:r.minutes,placement:'fixed',start:r.start,mode:'cycle',cycle:r.cycleMinutes},areas,17));
 const plan=planSessions(rows,[],[],defaults,new Date('2099-11-14'),()=>String(++id),date);
 assert.equal(plan.sessions.length,Math.floor((minutes<=60?60:1439)/minutes));
 for(const s of plan.sessions){
  assert.equal(s.breakEnabled,true);assert.equal(s.customBreakMinutes,undefined);
  const {start,end}=sessionBounds(s),boundary=+start+minutes*50000;
  assert.equal(+getPhase(s,start).end,boundary);
  assert.equal(getPhase(s,new Date(boundary-1)).kind,'work');
  assert.equal(getPhase(s,new Date(boundary)).kind,'break');
  assert.equal(+getPhase(s,new Date(boundary)).end,+end);
  assert.equal(measuredFocus(s,boundary-5000,boundary+5000),5);
  assert.equal(normalizeArchive({sessions:[s]}).sessions[0].workMinutes,minutes*5/6);
 }
});
test('daily migration corrects future rows once, retaining IDs and historical settings',()=>{
 const state=normalizeArchive({sessions:[],defaults});
 const source='Personale +15:00-16:00 -60m';
 const prepare=()=>prepareDailyPlan({source,date,blockId:'b',state,now,id:()=>String(++id)});
 applyDailyPlan(state,prepare());const original=state.sessions[0].id;
 delete state.sessions[0].cycleMinutes;Object.assign(state.sessions[0],{workMinutes:25,breakEnabled:false,customBreakMinutes:5});
 applyDailyPlan(state,prepare());assert.equal(state.sessions[0].id,original);assert.equal(state.sessions[0].workMinutes,50);assert.equal(state.sessions[0].customBreakMinutes,undefined);
 delete state.sessions[0].cycleMinutes;Object.assign(state.sessions[0],{workMinutes:25,finished:true});
 applyDailyPlan(state,prepare());assert.equal(state.sessions[0].workMinutes,25);assert.equal(state.sessions[0].finished,true);
});
