import { normalizeTask, createTaskSession, sessionHasTask, sessionTaskIds } from "./core/tempo-tasks.js";
import { localDateString, sessionBounds, sessionDurationMinutes, validSession, hasSessionOverlaps } from "./core/tempo-core.js";

export function mountInbox({getState,saveMutation,openTask,showToast}) {
  const section=document.createElement("section");
  section.className="tempo-inbox-section tempo-view-section";
  section.dataset.tempoView="inbox";
  section.innerHTML=`
    <div class="section-heading"><div><p class="eyebrow">RACCOLTA</p><h2>Inbox</h2><p class="muted">Annota subito le idee; assegna area, stima e giorno di lavoro quando sei pronto.</p></div></div>
    <form id="tempo-inbox-capture" class="tempo-inbox-capture">
      <input id="tempo-inbox-title" maxlength="120" required placeholder="Aggiungi rapidamente una task…">
      <button class="button button-primary" type="submit">Aggiungi</button>
    </form>
    <div id="tempo-inbox-list" class="tempo-inbox-list"></div>
    <div class="tempo-day-planner">
      <div class="section-heading"><div><p class="eyebrow">PIANIFICAZIONE</p><h2>Pianifica giornata</h2><p class="muted">Distribuisci automaticamente una quota delle task assegnate al giorno selezionato.</p></div></div>
      <div class="tempo-day-controls">
        <label>Giorno <input type="date" id="tempo-day-date" required></label>
        <label>Durata per task <select id="tempo-day-duration"><option value="30">30 min</option><option value="45">45 min</option><option value="60" selected>1 ora</option><option value="90">1 ora e 30</option><option value="120">2 ore</option></select></label>
        <button type="button" class="button button-secondary" id="tempo-day-preview">Calcola proposta</button>
      </div>
      <p id="tempo-day-result" class="muted" role="status"></p>
      <div id="tempo-day-slots" class="tempo-day-slots"></div>
      <button type="button" class="button button-primary hidden" id="tempo-day-save">Conferma sessioni proposte</button>
    </div>`;
  const agenda=document.querySelector(".agenda-section");
  agenda.parentNode.insertBefore(section,agenda);
  const $=id=>section.querySelector("#"+id);
  const list=$("tempo-inbox-list"), date=$("tempo-day-date"), result=$("tempo-day-result");
  const preview=$("tempo-day-preview"), confirm=$("tempo-day-save"), slots=$("tempo-day-slots");
  const uuid=()=>globalThis.crypto?.randomUUID?.() || Date.now()+"-"+Math.random().toString(36).slice(2);
  const esc=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const minutes=s=>{const [h,m]=s.split(":").map(Number);return h*60+m;};
  const hhmm=n=>String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
  const today=()=>localDateString(new Date());
  let proposal=[];
  date.value=today();
  function render(){
    const pending=getState().tasks.filter(t=>t.inbox&&t.status!=="done");
    list.innerHTML=pending.length?pending.map(t=>`<article class="tempo-inbox-item" data-id="${esc(t.id)}">
      <div class="tempo-inbox-item-text"><strong>${esc(t.title)}</strong><small>${esc(t.area)} · ${t.estimateMinutes==null?"Stima da definire":(t.estimateMinutes/60).toLocaleString("it-IT")+" h lorde"}</small></div>
      <button type="button" class="button button-secondary" data-detail="${esc(t.id)}">Dettagli</button>
      <label>Giorno di lavoro <input type="date" data-assign-date="${esc(t.id)}" value="${esc(date.value)}"></label>
      <button type="button" class="button button-primary" data-assign="${esc(t.id)}">Assegna</button>
    </article>`).join(""):'<p class="muted">Inbox vuota. Le attività da organizzare compariranno qui.</p>';
    // A persisted day proposal is no longer trustworthy after an external edit.
    proposal=[];confirm.classList.add("hidden");slots.replaceChildren();
  }
  $("tempo-inbox-capture").addEventListener("submit",event=>{
    event.preventDefault();
    const title=$("tempo-inbox-title").value.trim();
    const task=normalizeTask({id:uuid(),title,area:"Personale",priority:"nessuna",status:"todo",
      description:"",tags:[],estimateMinutes:null,dueDate:"",workDate:"",inbox:true,createdAt:new Date().toISOString()});
    if(!task)return showToast("Inserisci un titolo valido.");
    if(saveMutation(s=>{s.tasks=[...s.tasks,task];})){
      $("tempo-inbox-title").value="";showToast("Attività salvata in Inbox.");
    }
  });
  list.addEventListener("click",event=>{
    const b=event.target.closest("button");if(!b)return;
    if(b.dataset.detail)return openTask(b.dataset.detail);
    if(!b.dataset.assign)return;
    const row=b.closest("[data-id]"),workDate=row.querySelector("[data-assign-date]").value;
    if(!workDate)return showToast("Indica il giorno di lavoro.");
    if(saveMutation(s=>{s.tasks=s.tasks.map(t=>t.id===b.dataset.assign?{...t,inbox:false,workDate}:t);})){
      showToast("Task assegnata al "+workDate+". Completa i dettagli nell'Agenda.");
    }
  });
  const selected=()=>getState().tasks.filter(t=>!t.inbox&&t.status!=="done"&&t.workDate===date.value);
  function calculate(){
    const day=date.value,cap=Number($("tempo-day-duration").value),state=getState();
    if(!/^\d{4}-\d\d-\d\d$/.test(day))throw Error("Seleziona un giorno valido.");
    const dateObj=new Date(day+"T12:00:00");
    if(!Number.isFinite(dateObj.getTime())||localDateString(dateObj)!==day)throw Error("Data non valida.");
    if(day<today())throw Error("Non programmare automaticamente nel passato.");
    const scheduled=[...state.sessions],created=[],missing=[];
    let cursor=540;
    if(day===today()){
      const now=new Date();
      cursor=Math.max(cursor,Math.ceil((now.getHours()*60+now.getMinutes()+1)/15)*15);
    }
    for(const task of selected()){
      if(task.estimateMinutes==null){missing.push(task.title+" (senza stima)");continue;}
      const linked=scheduled.filter(s=>sessionHasTask(s,task.id));
      const gross=linked.reduce((sum,s)=>sum+sessionDurationMinutes(s)/Math.max(1,sessionTaskIds(s).length),0);
      const remaining=Math.floor((task.estimateMinutes-gross)/15)*15;
      if(remaining<15)continue;
      const duration=Math.min(cap,remaining);
      let inserted=false;
      for(let start=cursor;start+duration<=1380;start+=15){
        const session=createTaskSession(task,{id:uuid(),date:day,start:hhmm(start),grossMinutes:duration,
          workMinutes:state.defaults.workMinutes,breakEnabled:state.defaults.breakEnabled});
        if(!validSession(session)||hasSessionOverlaps([...scheduled,session]))continue;
        scheduled.push(session);created.push(session);cursor=start+duration+15;inserted=true;break;
      }
      if(!inserted)missing.push(task.title+" (spazio insufficiente)");
    }
    return {created,missing};
  }
  preview.addEventListener("click",()=>{
    try {
      const {created,missing}=calculate();proposal=created;
      const tasks=getState().tasks;
      slots.innerHTML=created.map(s=>'<div class="tempo-day-slot"><span>'+esc(s.start)+'–'+esc(s.end)+'</span><strong>'+esc(tasks.find(t=>sessionHasTask(s,t.id))?.title||s.area)+'</strong></div>').join("");
      result.textContent=created.length+" nuove sessioni previste"+(missing.length?". Non inserite: "+missing.join("; "):".")+
        (created.length?" Conferma per salvarle.":" Nessuna modifica effettuata.");
      confirm.classList.toggle("hidden",!created.length);
    } catch(error){proposal=[];slots.replaceChildren();confirm.classList.add("hidden");result.textContent=error.message;}
  });
  confirm.addEventListener("click",()=>{
    if(!proposal.length)return;
    try {
      const latest=calculate();
      const fingerprint=s=>s.date+"|"+s.start+"|"+s.end+"|"+s.area+"|"+sessionTaskIds(s).join(",");
      if(latest.created.length!==proposal.length||latest.created.some((s,i)=>fingerprint(s)!==fingerprint(proposal[i])))
        throw Error("La pianificazione è cambiata. Ricalcola la proposta.");
      if(!saveMutation(state=>{state.sessions=[...state.sessions,...proposal];}))
        throw Error("Salvataggio non riuscito.");
      const count=proposal.length;proposal=[];confirm.classList.add("hidden");slots.replaceChildren();
      result.textContent=count+" sessioni programmate.";showToast("Sessioni create e associate alle task.");
    }catch(error){confirm.classList.add("hidden");result.textContent=error.message;}
  });
  for(const id of ["tempo-day-date","tempo-day-duration"])$(id).addEventListener("change",()=>{
    proposal=[];confirm.classList.add("hidden");slots.replaceChildren();result.textContent="";
  });
  window.addEventListener("tempo:open-day-planner",event=>{
    const next=event.detail?.date;
    if(next)date.value=next;
    proposal=[];confirm.classList.add("hidden");slots.replaceChildren();result.textContent="";
    location.hash="inbox";
    section.scrollIntoView({behavior:"smooth",block:"start"});
  });
  render();
  return {render};
}
