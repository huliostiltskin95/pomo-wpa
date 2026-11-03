import { localDateString, sessionBounds, hasSessionOverlaps } from "./core/tempo-core.js";
import { sessionHasTask, getTaskAttention } from "./core/tempo-tasks.js";

// TEMPVS Agenda 2.0. Presentation preferences are device-local; tasks remain in the existing state.
export function createAgendaV2({getState,saveMutation,setTaskStatus,openTask,openPlan,showToast}) {
  const section = document.querySelector(".agenda-section");
  const root = document.createElement("div");
  root.id = "tempo-agenda-v2";
  section.querySelector(".tempo-quick-task")?.after(root);
  section.classList.add("tempo-agenda-v2-enabled");
  const legacyStatus = document.getElementById("agenda-status-filter");
  legacyStatus.value = "all"; // Legacy cards remain available to the Markdown editor and details drawer.
  const PREF = "tempvs-agenda-v2-device";
  let pref = {};
  try {pref = JSON.parse(localStorage.getItem(PREF) || "{}");} catch {}
  const ui = Object.assign({list:"today",view:"list",group:"date",sort:"date",calendar:"week",anchor:localDateString(new Date()),taskLayer:true,sessionLayer:true,area:"",search:"",completed:false},pref);
  const savePref = () => { try {localStorage.setItem(PREF,JSON.stringify(ui));} catch {} };
  const escape = value => String(value == null ? "" : value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const day = (iso,n=0) => {const d = new Date(iso+"T12:00:00");d.setDate(d.getDate()+n);return localDateString(d);};
  const today = () => localDateString(new Date());
  const formatDate = iso => iso ? new Date(iso+"T12:00:00").toLocaleDateString("it-IT",{day:"numeric",month:"short"}) : "Senza data";
  const priorities={alta:"!1",media:"!2",bassa:"!3",nessuna:"!4"};
  const statusNames={todo:"Da fare",in_progress:"In corso",done:"Completate"};
  const menus=[["today","Oggi"],["tomorrow","Domani"],["week","Prossimi 7 giorni"],["overdue","Scadute"],["nodate","Senza data"],["attention","Da riprogrammare"],["all","Tutte"],["done","Completate"]];
  function linked(s,t){return sessionHasTask(s,t.id);}
  function sessionDates(t,state){return state.sessions.filter(s=>linked(s,t)).map(s=>s.date);}
  function hasDate(t,state,date){return t.dueDate===date || sessionDates(t,state).includes(date);}
  function isListed(t,state){
    if(ui.list==="done")return t.status==="done";
    if(t.inbox)return false;
    if(t.status==="done")return false;
    const current=today(), tomorrow=day(current,1), last=day(current,6);
    const dates=sessionDates(t,state);
    switch(ui.list){
      case "today":return t.workDate===current || (t.dueDate && t.dueDate<=current) || dates.includes(current);
      case "tomorrow":return t.workDate===tomorrow || t.dueDate===tomorrow || dates.includes(tomorrow);
      case "week":return (t.workDate>=current&&t.workDate<=last) || (t.dueDate && t.dueDate<=last) || dates.some(d=>d>=current&&d<=last);
      case "overdue":return !!t.dueDate && t.dueDate<current;
      case "nodate":return !t.dueDate && !t.workDate && dates.length===0;
      case "attention":return getTaskAttention(t,state.sessions,new Date())?.kind==="reschedule";
      default:return true;
    }
  }
  function visibleTasks(state){
    const query=ui.search.trim().toLocaleLowerCase("it");
    const filtered=state.tasks.filter(t=>isListed(t,state) && (!ui.area || t.area===ui.area) &&
      (!query || (t.title+" "+t.description+" "+t.tags.join(" ")).toLocaleLowerCase("it").includes(query)));
    const priorityOrder=["alta","media","bassa","nessuna"];
    return filtered.sort((a,b)=>{
      if(ui.sort==="priority")return priorityOrder.indexOf(a.priority)-priorityOrder.indexOf(b.priority) || a.title.localeCompare(b.title,"it");
      if(ui.sort==="title")return a.title.localeCompare(b.title,"it");
      if(ui.sort==="area")return a.area.localeCompare(b.area,"it") || a.title.localeCompare(b.title,"it");
      return (a.dueDate||"9999").localeCompare(b.dueDate||"9999") ||
        priorityOrder.indexOf(a.priority)-priorityOrder.indexOf(b.priority) || a.title.localeCompare(b.title,"it");
    });
  }
  function card(t,kanban=false){
    return '<div class="av2-task" data-area="'+escape(t.area)+'" data-drag-id="'+escape(t.id)+'" '+(kanban?'draggable="true"':'')+'>'+
      '<button class="av2-check" data-complete="'+escape(t.id)+'" aria-label="'+(t.status==="done"?"Riapri":"Completa")+' '+escape(t.title)+'">'+(t.status==="done"?"☑":"□")+'</button>'+
      '<button class="av2-task-title '+(t.status==="done"?"av2-done":"")+'" data-task="'+escape(t.id)+'">'+escape(t.title)+'</button>'+
      '<span class="av2-area" title="'+escape(t.area)+'">'+escape(t.area)+'</span>'+
      '<span class="av2-priority av2-priority-'+escape(t.priority)+'">'+priorities[t.priority]+'</span>'+
      (t.workDate?'<span class="av2-date">Lavoro '+escape(formatDate(t.workDate))+'</span>':'')+
      (t.dueDate?'<span class="av2-date">Scade '+escape(formatDate(t.dueDate))+'</span>':'')+
      '<button class="av2-more" data-plan="'+escape(t.id)+'" title="Programma una sessione">◷</button></div>';
  }
  function groupKey(t,state) {
    if(ui.group==="area")return t.area;
    if(ui.group==="priority")return priorities[t.priority];
    if(ui.group==="status")return statusNames[t.status];
    if(t.workDate)return t.workDate;
    if(!t.dueDate) {
      const dates=sessionDates(t,state).sort();
      if(dates.length)return dates[0];
      return "zzzz";
    }
    return t.dueDate<today()?"0000":t.dueDate;
  }
  function groupTitle(key) {
    if(key==="0000")return "Scadute";
    if(key==="zzzz")return "Senza scadenza";
    if(/^\d{4}-\d\d-\d\d$/.test(key)) return key===today()?"Oggi":key===day(today(),1)?"Domani":formatDate(key);
    return key;
  }
  function renderList(tasks,state) {
    let open=tasks.filter(t=>t.status!=="done"),done=tasks.filter(t=>t.status==="done");
    if(ui.list==="done"){open=done;done=[];}
    const groups=new Map();
    for(const t of open){const key=groupKey(t,state);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(t);}
    const keys=[...groups.keys()].sort((a,b)=>a.localeCompare(b,"it"));
    let html=keys.map(k=>'<section class="av2-group"><h3>'+escape(groupTitle(k))+' <small>'+groups.get(k).length+'</small></h3>'+
      groups.get(k).map(t=>card(t)).join("")+'</section>').join("");
    if(ui.list!=="done"){
      const completed=state.tasks.filter(t=>t.status==="done" && (!ui.area||t.area===ui.area));
      html+='<section class="av2-group"><button class="av2-fold" data-toggle-completed="1">Completate ('+completed.length+') '+(ui.completed?"▾":"▸")+'</button>'+
        (ui.completed?completed.map(t=>card(t)).join(""):"")+'</section>';
    }
    return html || '<p class="av2-empty">Nessuna attività in questa lista.</p>';
  }
  function renderKanban(tasks){
    const headings=[["todo","Da fare"],["in_progress","In corso"],["done","Completate"]];
    return '<div class="av2-board">'+headings.map(([status,label])=>{
      const entries= status==="done" ? (ui.list==="done"?tasks:getState().tasks.filter(t=>t.status==="done"&&(!ui.area||t.area===ui.area))) : tasks.filter(t=>t.status===status);
      return '<section class="av2-column" data-drop-status="'+status+'"><h3>'+label+' <small>'+entries.length+'</small></h3>'+
        entries.map(t=>card(t,true)).join("")+'<p class="av2-drop-hint">Trascina qui per cambiare stato</p></section>';
    }).join("")+'</div>';
  }
  function range(){
    const anchor=ui.anchor;
    if(ui.calendar==="day")return [anchor];
    if(ui.calendar==="week"){const d=new Date(anchor+"T12:00:00"); const offset=(d.getDay()+6)%7;return Array.from({length:7},(_,i)=>day(anchor,i-offset));}
    const d=new Date(anchor+"T12:00:00"),first=anchor.slice(0,7)+"-01";
    const shift=(new Date(first+"T12:00:00").getDay()+6)%7;
    const start=day(first,-shift);
    return Array.from({length:42},(_,i)=>day(start,i));
  }
  function renderCalendar(state) {
    const dates=range(),shown=state.tasks.filter(t=>t.status!=="done"&&(!ui.area||t.area===ui.area));
    let html='<div class="av2-cal-grid av2-cal-'+ui.calendar+'">';
    for(const date of dates){
      const items=ui.taskLayer?shown.filter(t=>t.dueDate===date||t.workDate===date):[];
      const blocks=ui.sessionLayer?state.sessions.filter(s=>s.date===date&&(!ui.area||(s.area||s.title)===ui.area)).sort((a,b)=>a.start.localeCompare(b.start)):[];
      html+='<section class="av2-calendar-day '+(date===today()?"av2-is-today":"")+'" data-date="'+date+'"><h3>'+escape(new Date(date+"T12:00:00").toLocaleDateString("it-IT",{weekday:"short",day:"numeric"}))+'</h3>';
      html+=items.map(t=>'<button class="av2-event av2-event-task" draggable="true" data-drag-id="'+escape(t.id)+'" data-task="'+escape(t.id)+'" data-area="'+escape(t.area)+'">'+escape(t.title)+'</button>').join("");
      html+=blocks.map(s=>'<button type="button" class="av2-event av2-event-session" draggable="true" data-drag-session="'+escape(s.id)+'" data-session="'+escape(s.id)+'" data-area="'+escape(s.area||s.title)+'"><strong>'+escape(s.start)+'–'+escape(s.end)+'</strong> '+escape(s.area||s.title)+'</button>').join("");
      html+='</section>';
    }
    return html+'</div>';
  }
  function renderTimeline(state) {
    const tasks=state.tasks.filter(t=>t.status!=="done"&&(!ui.area||t.area===ui.area));
    const all = new Map();
    for(const t of tasks){const d=t.workDate||t.dueDate;if(!d)continue;if(!all.has(d))all.set(d,[]);all.get(d).push({type:"task",task:t});}
    for(const s of state.sessions){if(ui.area&&(s.area||s.title)!==ui.area)continue;if(!all.has(s.date))all.set(s.date,[]);all.get(s.date).push({type:"session",session:s});}
    return '<div class="av2-timeline">'+[...all.keys()].sort().map(d=>'<section class="av2-timeline-day"><h3>'+escape(formatDate(d))+'</h3><div>'+
      all.get(d).sort((a,b)=>(a.session?.start||"").localeCompare(b.session?.start||"")).map(entry=>entry.type==="task"?card(entry.task):
      '<button type="button" class="av2-timeline-session" data-session="'+escape(entry.session.id)+'" data-area="'+escape(entry.session.area||entry.session.title)+'">'+escape(entry.session.start)+'–'+escape(entry.session.end)+' · Sessione '+escape(entry.session.area||entry.session.title)+'</button>').join("")+'</div></section>').join("")+'</div>';
  }
  function quadrant(t) {return (t.important==null||t.urgent==null)?"unassigned":(t.important?"1":"0")+(t.urgent?"1":"0");}
  function renderMatrix(tasks){
    const options=[["11","Importante e urgente"],["10","Importante, non urgente"],["01","Urgente, non importante"],["00","Non importante né urgente"]];
    let html='<div class="av2-matrix">'+options.map(([key,label])=>'<section class="av2-quadrant" data-drop-quadrant="'+key+'"><h3>'+label+'</h3>'+
      tasks.filter(t=>quadrant(t)===key).map(t=>card(t,true)).join("")+'</section>').join("")+'</div>';
    const pending=tasks.filter(t=>quadrant(t)==="unassigned");
    if(pending.length)html+='<section class="av2-group"><h3>Da classificare <small>'+pending.length+'</small></h3>'+
      pending.map(t=>card(t,true)).join("")+'<p class="av2-note">Apri una task per impostare importanza e urgenza, oppure trascinala in un quadrante.</p></section>';
    return html;
  }
  function dateHeader(){
    if(ui.view!=="calendar")return "";
    const n=ui.calendar==="month"?new Date(ui.anchor+"T12:00:00").toLocaleDateString("it-IT",{month:"long",year:"numeric"}):formatDate(ui.anchor);
    return '<div class="av2-date-nav"><button data-shift="-1" aria-label="Periodo precedente">‹</button><button data-current-date="1">Oggi</button><strong>'+escape(n)+'</strong><button data-shift="1" aria-label="Periodo successivo">›</button>'+
      '<select data-control="calendar" aria-label="Scala calendario">'+["day","week","month"].map((v,i)=>'<option value="'+v+'" '+(ui.calendar===v?"selected":"")+'>'+["Giorno","Settimana","Mese"][i]+'</option>').join("")+'</select></div>';
  }
  function render() {
    const state=getState(),tasks=visibleTasks(state);
    root.innerHTML='<div class="av2-shell"><nav class="av2-nav" aria-label="Liste intelligenti"><h3>Liste intelligenti</h3>'+
      menus.map(([key,label])=>'<button data-smart="'+key+'" '+(ui.list===key?'aria-current="page"':'')+'>'+escape(label)+'</button>').join("")+
      '<h3>Aree</h3>'+["","Lavoro","Studio","Personale"].map(a=>'<button data-area-filter="'+escape(a)+'" '+(ui.area===a?'aria-current="true"':'')+'>'+escape(a||"Tutte le aree")+'</button>').join("")+'</nav>'+
      '<div class="av2-main"><div class="av2-header"><div><h2>'+escape(menus.find(x=>x[0]===ui.list)?.[1]||"Agenda")+'</h2><small>'+tasks.length+' attività nella selezione</small></div>'+
      '<div class="av2-tabs">'+[["list","Lista"],["calendar","Calendario"],["kanban","Kanban"],["timeline","Timeline"],["matrix","Eisenhower"]].map(([key,label])=>
      '<button data-view="'+key+'" '+(ui.view===key?'aria-pressed="true"':'aria-pressed="false"')+'>'+label+'</button>').join("")+'</div></div>'+
      '<div class="tempo-day-launch"><button class="button button-secondary" type="button" data-open-day-plan="1">Crea sessioni · '+escape(ui.view==="calendar"?ui.anchor:today())+'</button><button class="button button-secondary" type="button" data-fill-day="1">Riempi sessioni · '+escape(ui.view==="calendar"?ui.anchor:today())+'</button></div>'+
      '<div class="av2-tools"><input data-search="1" placeholder="Cerca nelle attività" value="'+escape(ui.search)+'" aria-label="Cerca attività">'+
      '<label>Raggruppa <select data-control="group">'+[["date","Data"],["area","Area"],["priority","Priorità"],["status","Stato"]].map(([v,l])=>
      '<option value="'+v+'" '+(ui.group===v?"selected":"")+'>'+l+'</option>').join("")+'</select></label>'+
      '<label>Ordina <select data-control="sort">'+[["date","Data"],["priority","Priorità"],["title","Titolo"],["area","Area"]].map(([v,l])=>
      '<option value="'+v+'" '+(ui.sort===v?"selected":"")+'>'+l+'</option>').join("")+'</select></label></div>'+
      dateHeader()+(ui.view==="calendar"?'<div class="av2-layers"><label><input type="checkbox" data-layer="task" '+(ui.taskLayer?"checked":"")+'> Scadenze task</label><label><input type="checkbox" data-layer="session" '+(ui.sessionLayer?"checked":"")+'> Sessioni</label></div>':"")+
      '<div class="av2-content">'+(ui.view==="list"?renderList(tasks,state):ui.view==="kanban"?renderKanban(tasks):ui.view==="calendar"?renderCalendar(state):ui.view==="timeline"?renderTimeline(state):renderMatrix(tasks))+'</div></div></div>';
    savePref();
  }
  function patch(id,fields){
    saveMutation(state=>{state.tasks=state.tasks.map(t=>t.id===id?{...t,...fields}:t);});
  }
  function addSubtask(id,title){
    title=title.trim();
    if(!title)return;
    if(title.length>120)return showToast("Titolo troppo lungo.");
    const t=getState().tasks.find(t=>t.id===id);
    if(!t)return;
    patch(id,{subtasks:[...(t.subtasks||[]),{id:String(Date.now())+"-"+Math.random().toString(36).slice(2),title,done:false}]});
  }
  root.addEventListener("click",event=>{
    const b=event.target.closest("button");if(!b)return;
    if(b.dataset.fillDay){window.dispatchEvent(new CustomEvent("tempo:fill-day",{detail:{date:ui.view==="calendar"?ui.anchor:today()}}));}
    else if(b.dataset.openDayPlan){window.dispatchEvent(new CustomEvent("tempo:open-day-planner",{detail:{date:ui.view==="calendar"?ui.anchor:today()}}));}
    else if(b.dataset.smart){ui.list=b.dataset.smart;if(ui.view==="calendar"||ui.view==="timeline")ui.view="list";render();}
    else if(b.hasAttribute("data-area-filter")){ui.area=b.dataset.areaFilter;render();}
    else if(b.dataset.view){ui.view=b.dataset.view;if(ui.view==="calendar"||ui.view==="timeline")ui.list="all";render();}
    else if(b.dataset.task){window.dispatchEvent(new CustomEvent("tempo:show-task",{detail:{taskId:b.dataset.task}}));}
    else if(b.dataset.complete){const t=getState().tasks.find(t=>t.id===b.dataset.complete);if(t)setTaskStatus(t.id,t.status==="done"?"todo":"done");}
    else if(b.dataset.plan)openPlan(b.dataset.plan);
    else if(b.dataset.session)window.dispatchEvent(new CustomEvent("tempo:edit-session",{detail:{sessionId:b.dataset.session}}));
    else if(b.dataset.toggleCompleted){ui.completed=!ui.completed;render();}
    else if(b.dataset.shift){const delta=Number(b.dataset.shift);
      if(ui.calendar==="month"){const d=new Date(ui.anchor+"T12:00:00");ui.anchor=localDateString(new Date(d.getFullYear(),d.getMonth()+delta,1,12));}
      else ui.anchor=day(ui.anchor,(ui.calendar==="week"?7:1)*delta);
      render();}
    else if(b.dataset.currentDate){ui.anchor=today();render();}
  });
  root.addEventListener("change",event=>{
    const t=event.target;
    if(t.dataset.control){ui[t.dataset.control]=t.value;render();}
    else if(t.dataset.layer){ui[t.dataset.layer==="task"?"taskLayer":"sessionLayer"]=t.checked;render();}
    else if(t.dataset.search){ui.search=t.value;render();}
  });
  root.addEventListener("keydown",event=>{if(event.target.dataset.search && event.key==="Enter"){ui.search=event.target.value;render();}});
  root.addEventListener("dragstart",event=>{const c=event.target.closest("[data-drag-id],[data-drag-session]");if(c)event.dataTransfer.setData("text/plain",c.dataset.dragSession?"session:"+c.dataset.dragSession:"task:"+c.dataset.dragId);});
  root.addEventListener("dragover",event=>{if(event.target.closest("[data-drop-status],[data-drop-quadrant],[data-date]"))event.preventDefault();});
  root.addEventListener("drop",event=>{
    const target=event.target.closest("[data-drop-status],[data-drop-quadrant],[data-date]");
    if(!target)return;event.preventDefault();
    const raw=event.dataTransfer.getData("text/plain"),type=raw.slice(0,raw.indexOf(":")),id=raw.slice(raw.indexOf(":")+1);
    const t=getState().tasks.find(x=>x.id===id);
    if(target.dataset.date){
      if(type==="task"&&t)patch(id,{dueDate:target.dataset.date});
      else if(type==="session"){
        const session=getState().sessions.find(x=>x.id===id);
        if(!session)return;
        if(sessionBounds(session).start<=new Date())return showToast("Modifica le sessioni già iniziate dalla sezione Sessioni.");
        const moved={...session,date:target.dataset.date};
        if(sessionBounds(moved).start<=new Date())return showToast("Non puoi spostare una sessione nel passato.");
        const other=getState().sessions.filter(x=>x.id!==id);
        if(hasSessionOverlaps([...other,moved]))return showToast("Sovrapposizione: sessione non spostata.");
        saveMutation(state=>{
          state.sessions=state.sessions.map(x=>x.id===id?moved:x);
          state.tasks=state.tasks.map(x=>x.autoSessionId===id?{...x,plannedDate:moved.date,plannedStart:moved.start}:x);
        });
      }
      return;
    }
    if(type!=="task"||!t)return;
    if(target.dataset.dropStatus)setTaskStatus(id,target.dataset.dropStatus);
    else if(target.dataset.dropQuadrant){const q=target.dataset.dropQuadrant;patch(id,{important:q[0]==="1",urgent:q[1]==="1"});}
  });
  // Detail additions are inserted into the existing accessible drawer.
  window.addEventListener("tempo:task-detail-rendered",event=>{
    const {taskId,container}=event.detail||{};
    const t=getState().tasks.find(t=>t.id===taskId);
    if(!t||!container)return;
    container.innerHTML='<section class="av2-detail-fields"><h3>Organizzazione</h3>'+
      '<label>Scadenza <input type="date" data-due="'+escape(t.id)+'" value="'+escape(t.dueDate||"")+'"></label>'+
      '<label>Giorno di lavoro <input type="date" data-work="'+escape(t.id)+'" value="'+escape(t.workDate||"")+'"></label>'+
      '<button type="button" data-to-inbox="'+escape(t.id)+'">Sposta in Inbox</button>'+
      '<label>Priorità <select data-priority="'+escape(t.id)+'">'+[["alta","Alta · !1"],["media","Media · !2"],["bassa","Bassa · !3"],["nessuna","Nessuna · !4"]].map(([v,l])=>'<option value="'+v+'" '+(t.priority===v?"selected":"")+'>'+l+'</option>').join("")+'</select></label>'+
      '<label>Importante <select data-importance="'+escape(t.id)+'"><option value="">Da classificare</option><option value="yes" '+(t.important===true?"selected":"")+'>Sì</option><option value="no" '+(t.important===false?"selected":"")+'>No</option></select></label>'+
      '<label>Urgente <select data-urgency="'+escape(t.id)+'"><option value="">Da classificare</option><option value="yes" '+(t.urgent===true?"selected":"")+'>Sì</option><option value="no" '+(t.urgent===false?"selected":"")+'>No</option></select></label>'+
      '</section><section class="av2-subtasks"><h3>Sottotask strutturate</h3>'+
      (t.subtasks||[]).map(s=>'<label><input type="checkbox" data-sub-check="'+escape(s.id)+'" '+(s.done?"checked":"")+'> <span class="'+(s.done?"av2-done":"")+'">'+escape(s.title)+'</span><button type="button" data-sub-delete="'+escape(s.id)+'" aria-label="Elimina sottotask">×</button></label>').join("")+
      '<form data-sub-form="'+escape(t.id)+'"><input name="subtask" required maxlength="120" placeholder="Nuova sottotask"><button type="submit">Aggiungi</button></form></section>';
    container.addEventListener("change",ev=>{
      const e=ev.target, current=getState().tasks.find(x=>x.id===taskId);if(!current)return;
      if(e.dataset.due)patch(taskId,{dueDate:e.value});
      else if(e.dataset.work)patch(taskId,{workDate:e.value,inbox:false});
      else if(e.dataset.priority)patch(taskId,{priority:e.value});
      else if(e.dataset.importance)patch(taskId,{important:e.value===""?null:e.value==="yes"});
      else if(e.dataset.urgency)patch(taskId,{urgent:e.value===""?null:e.value==="yes"});
      else if(e.dataset.subCheck)patch(taskId,{subtasks:current.subtasks.map(s=>s.id===e.dataset.subCheck?{...s,done:e.checked}:s)});
    });
    container.addEventListener("click",ev=>{
      const inboxButton=ev.target.closest("[data-to-inbox]");
      if(inboxButton){patch(taskId,{inbox:true,workDate:""});window.location.hash="inbox";return;}
      const b=ev.target.closest("[data-sub-delete]");if(!b)return;
      const current=getState().tasks.find(x=>x.id===taskId);if(!current)return;
      patch(taskId,{subtasks:current.subtasks.filter(s=>s.id!==b.dataset.subDelete)});
    });
    container.addEventListener("submit",ev=>{
      if(!ev.target.matches("[data-sub-form]"))return;
      ev.preventDefault();addSubtask(taskId,ev.target.elements.subtask.value);
    });
  });
  return {render};
}
