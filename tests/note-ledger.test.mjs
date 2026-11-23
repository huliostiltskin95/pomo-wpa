import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeArchive} from '../core/tempo-simple.js';
import {prepareDailyPlan,applyDailyPlan} from '../obsidian/daily-plan.js';
import {creditedWork} from '../obsidian/daily-register.js';
import {updateLedger} from '../obsidian/note-ledger.js';

test('registro compatto: correzioni, aree e obiettivo facoltativo',()=>{
 const state=normalizeArchive({sessions:[]});
 let seq=0;
 function apply(source,date){
  const plan=prepareDailyPlan({state,source,date,blockId:date,id:()=>String(++seq)});
  applyDailyPlan(state,plan);
 }
 function totals(){
  const areas=new Map();
  creditedWork(state,()=>null,()=>'',areas);
  return areas.get('Nota.md')||new Map();
 }
 apply('- [[Nota#Lettura|Leggi]] 2h = 4 @Studio','2026-11-23');
 assert.deepEqual(state.history.map(r=>r.minutes),[30,30,30,30]);
 const initial=updateLedger('Testo',totals());
 assert.match(initial,/T: 2h @Studio/);
 const target=initial.replace('2h','2/7h');
 apply('- [[Nota]] 1h = 2 @Personale','2026-11-24');
 assert.match(updateLedger(target,totals()),/T: 2\/7h @Studio\nT: 1h @Personale/);
 apply('- [[Nota]] 30m = 1 @Studio','2026-11-23');
 const corrected=updateLedger(target,totals());
 assert.match(corrected,/T: 30m\/7h @Studio/);
 assert.equal(updateLedger(corrected,totals()),corrected);
 assert.match(updateLedger(corrected,new Map()),/T: 0\/7h @Studio/);
 assert.throws(()=>apply('- [[Nota]] 2h = 0 @Studio','2026-11-23'));
});

test('elenco libero con aree esplicite, riferimenti e fascia oltre mezzanotte',()=>{
 const state=normalizeArchive({sessions:[]});
 const plan=source=>prepareDailyPlan({state,source,date:'2026-11-24',blockId:'lista'});
 const result=plan('- [[Platone#Repubblica|Repubblica]] [[Bibliografia]] 30m +11:45 @Studio\n- [[Spesa]] 15m @Personale\nStudio +23:30-00:30 -30m');
 applyDailyPlan(state,result);
 assert.deepEqual(result.sessions.map(s=>[s.date,s.start]),[['2026-11-24','11:45'],['2026-11-24','23:30'],['2026-11-25','00:00']]);
 assert.deepEqual([...creditedWork(state,()=>null,()=>null)],[['Platone.md',1800],['Spesa.md',900]]);
 assert.equal(result.records[0].linkedNotes[1].path,'Bibliografia');
 assert.throws(()=>plan('- [[Nota]] 30m'),/area/);
 assert.throws(()=>plan('- [[Nota]] 30 @Studio'),/unità/);
 assert.throws(()=>plan('- [[Nota]] 30m +14:00 @Studio\nStudio +14:00-15:00 -30m'),/sovrappongono/);
});
