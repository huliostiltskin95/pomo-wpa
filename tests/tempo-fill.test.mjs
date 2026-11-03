import test from "node:test";
import assert from "node:assert/strict";
import { proposeSessionFill, grossAssignedToTask, reconcileSessionAllocations } from "../core/tempo-fill.js";
import { grossMinutesForTask, allocatedGrossMinutes, elapsedGrossForTask } from "../core/tempo-tasks.js";

const session=(id="s1",start="15:00",end="18:00")=>({
  id,title:"Studio",area:"Studio",date:"2026-11-06",start,end,
  workMinutes:25,breakEnabled:true,taskIds:[]
});
const task=(id,priority,estimateMinutes,dueDate)=>({
  id,title:id,area:"Studio",priority,estimateMinutes,dueDate,status:"todo",
  inbox:false,workDate:""
});
const tasks=[
  task("assiri","media",480,"2026-11-10"),
  task("latino","alta",60,"2026-11-07"),
  task("greco","bassa",180,"2026-11-08")
];

test("fills a gross session by priority without exceeding its 180-minute capacity",()=>{
  const s=session();
  const {session:filled,additions,freeMinutes}=proposeSessionFill(s,tasks,[s],{mode:"priority"});
  assert.deepEqual(additions.map(a=>[a.taskId,a.minutes]),[["latino",60],["assiri",120]]);
  assert.equal(allocatedGrossMinutes(filled),180);
  assert.equal(freeMinutes,0);
});

test("deducts earlier gross quotas before filling another session",()=>{
  const first=session();
  const filled=proposeSessionFill(first,tasks,[first]).session;
  const next=session("s2","10:00","11:00");
  const result=proposeSessionFill(next,tasks,[filled,next]);
  assert.deepEqual(result.additions.map(a=>[a.taskId,a.minutes]),[["assiri",60]]);
  assert.equal(grossAssignedToTask("assiri",[filled,result.session]),180);
});

test("legacy links retain their equal gross shares and fill no extra space",()=>{
  const legacy={...session(),taskIds:["assiri","greco"]};
  assert.equal(grossMinutesForTask(legacy,"assiri"),90);
  assert.equal(proposeSessionFill(legacy,tasks,[legacy]).additions.length,0);
});

test("disabling partial filling skips estimates that do not fit",()=>{
  const s=session("s3","15:00","16:00");
  assert.deepEqual(proposeSessionFill(s,tasks,[s],{partial:false}).additions.map(a=>a.taskId),["latino"]);
});

test("deleted sessions cannot contribute gross elapsed time",()=>{
  const now=new Date("2026-11-07T12:00:00");
  assert.equal(elapsedGrossForTask("latino",[],now),0);
});

test("editing session while preserving its task IDs retains gross quotas",()=>{
  const s={...session(),taskIds:["assiri","latino"],taskAllocations:{assiri:120,latino:60}};
  const moved={...s,start:"14:00",taskAllocations:undefined};
  const reconciled=reconcileSessionAllocations(s,moved);
  assert.deepEqual(reconciled.taskAllocations,s.taskAllocations);
});
