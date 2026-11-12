import test from 'node:test';
import assert from 'node:assert/strict';
import {rowRequest,requestSummary} from '../planner-table.js';
import {planSessions} from '../core/tempo-simple.js';
const areas=[{name:'Studio'}];
const row={area:'Studio',minutes:'45',placement:'fixed',start:'09:00',mode:'custom',pause:'5',focus:''};
test('table converts gross duration and custom pause without changing occupied time',()=>{
 const request=rowRequest(row,areas,25);
 assert.deepEqual(request,{area:'Studio',minutes:45,start:'09:00',customBreakMinutes:5});
 assert.equal(requestSummary(request,'2026-12-20'),'40 min focus + 5 min pausa · fine 09:45');
 const plan=planSessions([request],[],[],{workMinutes:25,breakEnabled:true},new Date('2026-12-01'),()=> 'id','2026-12-20');
 assert.equal(plan.sessions[0].end,'09:45');
});
test('table validates incomplete fields and pauses before scheduling',()=>{
 for(const patch of [{minutes:''},{minutes:'2.5'},{area:'Missing'},{start:''},{pause:''},{pause:'45'},{pause:'-1'},{mode:'unknown'}])assert.throws(()=>rowRequest({...row,...patch},areas,25));
});
test('automatic focus defaults, overrides and no-pause rows stay distinct',()=>{
 const automatic=rowRequest({...row,mode:'auto'},areas,25);
 assert.equal(automatic.focusMinutes,25);assert.equal(automatic.customBreakMinutes,undefined);
 assert.equal(requestSummary(automatic,'2026-12-20'),'40 min focus + 5 min pause · cicli 25/5 · fine 09:45');
 assert.equal(rowRequest({...row,mode:'auto',focus:'40'},areas,25).focusMinutes,40);
 assert.equal(rowRequest({...row,mode:'none',pause:'bad'},areas,25).customBreakMinutes,0);
});
test('availability rows omit fixed start and summaries mark next-day ends',()=>{
 assert.equal(rowRequest({...row,placement:'windows',start:''},areas,25).start,undefined);
 assert.match(requestSummary(rowRequest({...row,start:'23:45'},areas,25),'2026-12-20'),/00:30 \(\+1 giorno\)/);
});
test('gross-cycle imports survive table conversion and summary',()=>{
 const request=rowRequest({...row,minutes:'120',mode:'cycle',cycle:'60'},areas,25);
 assert.deepEqual(request,{area:'Studio',minutes:120,start:'09:00',cycleMinutes:60});
 assert.match(requestSummary(request,'2026-12-20'),/100 min focus \+ 20 min pause · cicli 50\/10/);
 assert.throws(()=>rowRequest({...row,mode:'cycle',cycle:''},areas,25));
});
