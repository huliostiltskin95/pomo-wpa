import test from "node:test";
import assert from "node:assert/strict";
import {mergeSnapshots} from "../core/tempo-merge.js";

const task=(id,title=id,more={})=>({id,title,status:"todo",completed:false,description:"",...more});
const session=(id,start,end)=>({
  id,title:"Studio",date:"2026-11-04",start,end,workMinutes:25,breakEnabled:true
});
const state=(tasks=[],sessions=[],other={})=>({
  tasks,sessions,history:[],
  defaults:{workMinutes:25,breakEnabled:true},
  appearance:{theme:"light"},
  syncDeleted:{tasks:[],sessions:[]},
  ...other
});
const ids=items=>items.map(item=>item.id).sort();

test("unites different tasks without duplicates",()=>{
  const result=mergeSnapshots(null,state([task("one")]),state([task("two")]));
  assert.deepEqual(ids(result.merged.tasks),["one","two"]);
  assert.equal(result.conflicts.length,0);
});

test("merges independent fields on the same task",()=>{
  const base=state([task("one")]);
  const left=state([task("one","one",{description:"Locally edited"})]);
  const right=state([task("one","Renamed")]);
  const result=mergeSnapshots(base,left,right);
  assert.equal(result.merged.tasks[0].description,"Locally edited");
  assert.equal(result.merged.tasks[0].title,"Renamed");
  assert.equal(result.conflicts.length,0);
});

test("protects two edits of the same field and lets the user choose",()=>{
  const base=state([task("one")]);
  const left=state([task("one","Local")]),right=state([task("one","Dropbox")]);
  const blocked=mergeSnapshots(base,left,right);
  assert.deepEqual(blocked.conflicts.map(c=>c.key),["tasks:one.title"]);
  const chosen=mergeSnapshots(base,left,right,{"tasks:one.title":"remote"});
  assert.equal(chosen.merged.tasks[0].title,"Dropbox");
  assert.equal(chosen.conflicts.length,0);
});

test("preserves explicit completed status alongside remote description edits",()=>{
  const base=state([task("one")]);
  const left=state([task("one","one",{status:"done",completed:true})]);
  const right=state([task("one","one",{description:"New description"})]);
  const merged=mergeSnapshots(base,left,right);
  assert.equal(merged.merged.tasks[0].status,"done");
  assert.equal(merged.merged.tasks[0].completed,true);
  assert.equal(merged.merged.tasks[0].description,"New description");
});

test("propagates a deletion when the other side is unchanged",()=>{
  const base=state([task("one")]);
  const result=mergeSnapshots(base,state([]),state([task("one")]));
  assert.deepEqual(result.merged.tasks,[]);
  assert.deepEqual(result.merged.syncDeleted.tasks,["one"]);
  assert.equal(result.conflicts.length,0);
});

test("never silently deletes a remote edit",()=>{
  const base=state([task("one")]);
  const result=mergeSnapshots(base,state([]),state([task("one","changed")]));
  assert.equal(result.conflicts[0].key,"tasks:one:exists");
  const keepRemote=mergeSnapshots(base,state([]),state([task("one","changed")]),
    {"tasks:one:exists":"remote"});
  assert.equal(keepRemote.merged.tasks[0].title,"changed");
});

test("does not resurrect old records when a tombstone is present",()=>{
  const deleted=state([],[],{syncDeleted:{tasks:["one"],sessions:[]}});
  const result=mergeSnapshots(null,deleted,state([task("one")]));
  assert.equal(result.conflicts[0].key,"tasks:one:exists");
});

test("union of sessions detects overlaps even when IDs differ",()=>{
  const left=state([],[session("a","09:00","10:00")]);
  const right=state([],[session("b","09:30","10:30")]);
  const blocked=mergeSnapshots(null,left,right);
  assert.equal(blocked.conflicts[0].key,"overlap:a:b");
  const resolved=mergeSnapshots(null,left,right,{"overlap:a:b":"b"});
  assert.deepEqual(ids(resolved.merged.sessions),["b"]);
  assert.deepEqual(resolved.merged.syncDeleted.sessions,["a"]);
});

test("does not block separate sessions and preserves history entries",()=>{
  const local=state([],[session("a","09:00","10:00")]);
  local.history=[{sessionId:"a",taskId:"",date:"2026-11-04",minutes:50}];
  const remote=state([],[session("b","10:00","11:00")]);
  remote.history=[{sessionId:"b",taskId:"",date:"2026-11-04",minutes:50}];
  const result=mergeSnapshots(null,local,remote);
  assert.equal(result.conflicts.length,0);
  assert.deepEqual(ids(result.merged.sessions),["a","b"]);
  assert.equal(result.merged.history.length,2);
});

test("unknown common ancestor merges non-overlapping additions",()=>{
  const left=state([task("one","one",{localOnly:"x"})]);
  const right=state([task("one","one",{remoteOnly:"y"})]);
  const merged=mergeSnapshots(null,left,right);
  assert.equal(merged.conflicts.length,0);
  assert.equal(merged.merged.tasks[0].localOnly,"x");
  assert.equal(merged.merged.tasks[0].remoteOnly,"y");
});
