import test from "node:test";
import assert from "node:assert/strict";
import { proposeSessionFill, grossAssignedToTask, reconcileSessionAllocations, pomodoroSlots } from "../core/tempo-fill.js";
import { grossMinutesForTask, allocatedGrossMinutes, elapsedGrossForTask, normalizeTask, isTaskInInbox } from "../core/tempo-tasks.js";

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

test("two long-term Studio tasks share a two-hour session in whole Pomodoros",()=>{
  const s=session("s","09:00","11:00");
  const ts=[task("A","media",240,""),task("B","media",360,"")];
  const r=proposeSessionFill(s,ts,[s]);
  assert.deepEqual(r.additions.map(x=>[x.taskId,x.minutes,x.pomodoros]),[["A",60,2],["B",60,2]]);
  assert.deepEqual(r.session.pomodoroTaskIds,["A","A","B","B"]);
  assert.equal(r.freeMinutes,0);
});

test("a three-hour Lavoro session gives the 30m task one Pomodoro, the other five",()=>{
  const s={...session("work","09:00","12:00"),title:"Lavoro",area:"Lavoro"};
  const ts=[{...task("short","media",30,""),area:"Lavoro"},
    {...task("long","media",180,""),area:"Lavoro"}];
  const r=proposeSessionFill(s,ts,[s]);
  assert.deepEqual(r.additions.map(x=>[x.taskId,x.minutes,x.pomodoros]),
    [["short",30,1],["long",150,5]]);
});

test("already scheduled gross quotas reduce the estimate in later sessions",()=>{
  const s=session("first","09:00","11:00");
  const second=session("second","12:00","13:00");
  const ts=[task("short","media",60,""),task("long","media",240,"")];
  const first=proposeSessionFill(s,ts,[s,second]);
  const later=proposeSessionFill(second,ts,[first.session,second]);
  assert.equal(grossAssignedToTask("short",[first.session,later.session]),60);
  assert.equal(later.additions.find(x=>x.taskId==="short"),undefined);
});

test("50-minute focus periods produce 60-minute gross Pomodoros",()=>{
  const s={...session("longFocus","09:00","11:00"),workMinutes:50};
  const r=proposeSessionFill(s,[task("a","media",300,""),task("b","media",300,"")],[s]);
  assert.equal(r.slots.length,2);
  assert.deepEqual(r.additions.map(x=>x.minutes),[60,60]);
});

test("a final incomplete focus block cannot be assigned to any task",()=>{
  const s=session("partial","09:00","11:10");
  const r=proposeSessionFill(s,[task("a","media",300,"")],[s]);
  assert.equal(r.slots.length,4);
  assert.equal(r.unassignableMinutes,10);
  assert.equal(r.freeMinutes,10);
});

test("when breaks are disabled, each slot lasts exactly one focus period",()=>{
  const s={...session("nobreak","09:00","10:30"),workMinutes:30,breakEnabled:false};
  const r=proposeSessionFill(s,[task("a","media",300,""),task("b","media",300,"")],[s]);
  assert.deepEqual(r.additions.map(x=>x.minutes),[60,30]);
});

test("manual assignment changes complete slots, never fractions",()=>{
  const s=session("custom","09:00","11:00");
  const ts=[task("a","media",240,""),task("b","media",360,"")];
  const r=proposeSessionFill(s,ts,[s],{taskIds:["a","b"],slotTaskIds:["a","b","b","b"]});
  assert.deepEqual(r.additions.map(x=>[x.taskId,x.minutes]),[["a",30],["b",90]]);
  assert.throws(()=>proposeSessionFill(s,ts,[s],{taskIds:["a","b"],slotTaskIds:["a","unknown","b","b"]}));
});

test("legacy sessions preserve their original equal-share gross durations",()=>{
  const legacy={...session(),taskIds:["assiri","greco"]};
  assert.equal(grossMinutesForTask(legacy,"assiri"),90);
});


test("deleted sessions cannot contribute gross elapsed time",()=>{
  const now=new Date("2026-11-07T12:00:00");
  assert.equal(elapsedGrossForTask("latino",[],now),0);
});

test("editing session while preserving its task IDs retains gross quotas",()=>{
  const s={...session(),taskIds:["assiri","latino"],taskAllocations:{assiri:120,latino:60}};
  const moved={...s,start:"14:00",end:"17:00",taskAllocations:undefined};
  const reconciled=reconcileSessionAllocations(s,moved);
  assert.deepEqual(reconciled.taskAllocations,s.taskAllocations);
});

test("Inbox classification depends on explicit area, gross estimate and a deadline",()=>{
  const base={id:"test",title:"Studiare gli Assiri",priority:"media",status:"todo"};
  for(const partial of [{},{area:"Studio"},{area:"Studio",estimateMinutes:120},
    {area:"Studio",dueDate:"2026-11-15"},{area:"Studio",longTerm:true}]){
    assert.equal(isTaskInInbox(normalizeTask({...base,...partial})),true);
  }
  assert.equal(isTaskInInbox(normalizeTask({...base,area:"Studio",estimateMinutes:120,dueDate:"2026-11-15"})),false);
  assert.equal(isTaskInInbox(normalizeTask({...base,area:"Studio",estimateMinutes:120,longTerm:true})),false);
});

test("legacy Inbox flags are reclassified without changing task identity",()=>{
  const base={id:"legacy",title:"Leggere Tucidide",area:"Studio",estimateMinutes:120,dueDate:"2026-12-15",
    priority:"media",status:"todo",inbox:true};
  const migrated=normalizeTask(base);
  assert.equal(migrated.id,"legacy");
  assert.equal(migrated.inbox,false);
  assert.equal(normalizeTask({...base,dueDate:"",inbox:false}).inbox,true);
});

test("changing a session's focus duration invalidates old Pomodoro allocations",()=>{
  const previous={...session(),taskIds:["assiri"],taskAllocations:{assiri:180},
    pomodoroTaskIds:["assiri","assiri","assiri","assiri","assiri","assiri"]};
  const edited={...previous,workMinutes:50,taskAllocations:undefined,pomodoroTaskIds:undefined};
  assert.equal(reconcileSessionAllocations(previous,edited).taskAllocations,undefined);
});
