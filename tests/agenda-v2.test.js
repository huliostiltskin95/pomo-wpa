import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTask, validTask } from "../core/tempo-tasks.js";
import { createAgendaV2 } from "../agenda-v2.js";
import { localDateString } from "../core/tempo-core.js";

const sample = (id, title, overrides = {}) => normalizeTask({
  id, title, area:"Studio", priority:"media", status:"todo",
  description:"- [ ] Prima verifica", tags:[], estimateMinutes:60, dueDate:localDateString(new Date()),
  ...overrides
});

test("legacy tasks migrate without losing Markdown and remain valid", () => {
  const item = sample("old", "Vecchia attività");
  assert.ok(item);
  assert.equal(validTask(item), true);
  assert.equal(item.description, "- [ ] Prima verifica");
  assert.deepEqual(item.subtasks, []);
  assert.equal(item.important, null);
  assert.equal(item.urgent, null);
});

test("structured subtasks and Eisenhower classification persist through normalization", () => {
  const item = sample("new","Attività",{
    important:true,urgent:false,subtasks:[{id:"a",title:"Passo 1",done:true}]
  });
  assert.equal(item.important,true);
  assert.equal(item.urgent,false);
  assert.deepEqual(item.subtasks,[{id:"a",title:"Passo 1",done:true}]);
  const reopened = normalizeTask({...item,status:"done",completed:true});
  assert.equal(reopened.status,"done");
  assert.deepEqual(reopened.subtasks,item.subtasks);
});

test("all five agenda views render and task status remains manual", () => {
  const orig={document:globalThis.document,localStorage:globalThis.localStorage,window:globalThis.window,CustomEvent:globalThis.CustomEvent};
  let root;
  const handlers={};
  const events={};
  const state={tasks:[sample("one","Preparare verifica"),sample("two","Ripassare il latino",{status:"in_progress"})],sessions:[]};
  const statusChanges=[];
  globalThis.document={
    querySelector:()=>({querySelector:()=>({after:value=>{root=value;}}),classList:{add:()=>{}}}),
    createElement:()=>({innerHTML:"",addEventListener:(type,fn)=>{handlers[type]=fn;}}),
    getElementById:()=>({value:""})
  };
  globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
  globalThis.window={addEventListener:(type,fn)=>{events[type]=fn;},dispatchEvent:()=>{}};
  globalThis.CustomEvent=class { constructor(type,options){this.type=type;this.detail=options?.detail;} };
  try {
    let app;
    app=createAgendaV2({
      getState:()=>state,
      saveMutation:fn=>{fn(state);app.render();return true;},
      setTaskStatus:(id,status)=>statusChanges.push([id,status]),
      openTask:()=>{},openPlan:()=>{},showToast:()=>{}
    });
    app.render();
    assert.match(root.innerHTML,/Preparare verifica/);
    assert.match(root.innerHTML,/Liste intelligenti/);
    const changeView=value=>handlers.click({target:{closest:()=>({dataset:{view:value},hasAttribute:()=>false})}});
    for(const [value,fragment] of [["calendar","av2-calendar-day"],["kanban","av2-board"],["timeline","av2-timeline"],["matrix","av2-matrix"],["list","av2-group"]]){
      changeView(value);
      assert.ok(root.innerHTML.includes(fragment), "View "+value+" missing expected markup");
    }
    handlers.click({target:{closest:()=>({dataset:{complete:"one"},hasAttribute:()=>false})}});
    assert.deepEqual(statusChanges,[["one","done"]]);
    assert.equal(state.tasks[0].status,"todo","Rendering must not complete tasks automatically");
    // New fields are edited via the detail pane, not separate independent stores.
    const extra={innerHTML:"",addEventListener:()=>{}};
    events["tempo:task-detail-rendered"]({detail:{taskId:"one",container:extra}});
    assert.match(extra.innerHTML,/Sottotask strutturate/);
    assert.match(extra.innerHTML,/Importante/);
  } finally {
    for(const [key,value] of Object.entries(orig)){
      if(value===undefined)delete globalThis[key];else globalThis[key]=value;
    }
  }
});
