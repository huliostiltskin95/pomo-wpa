/* TEMPVS 3.0 — Phase 2. Read-only daily planning UI over the existing Pomodoro core. */
import { localDateString, sessionBounds } from "./core/tempo-core.js";
import { isTaskInInbox, sessionHasTask, getTaskAttention } from "./core/tempo-tasks.js";

const STORAGE_KEY = "tempo-pomodoro-v2";
const HOUR_HEIGHT = 62;
const escape = value => String(value ?? "").replace(/[&<>"']/g, ch =>
  ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[ch]);
const today = () => localDateString(new Date());
const dayDate = iso => new Date(iso + "T12:00:00");
const addDays = (iso, count) => {
  const date = dayDate(iso);
  date.setDate(date.getDate() + count);
  return localDateString(date);
};
const isIsoDay = value => /^\d{4}-\d\d-\d\d$/.test(value) &&
  Number.isFinite(dayDate(value).getTime()) && localDateString(dayDate(value)) === value;
const formatDate = (iso, options = {weekday:"long",day:"numeric",month:"long"}) =>
  dayDate(iso).toLocaleDateString("it-IT", options);
const hhmm = total => String(Math.floor(total / 60) % 24).padStart(2,"0") + ":" +
  String(total % 60).padStart(2,"0");
const hours = minutes => (minutes / 60).toLocaleString("it-IT", {maximumFractionDigits:2}) + " h";
function readState() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {tasks:Array.isArray(value.tasks)?value.tasks:[],
      sessions:Array.isArray(value.sessions)?value.sessions:[]};
  } catch { return {tasks:[], sessions:[]}; }
}
function daySlices(sessions, iso) {
  const start = new Date(iso + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return sessions.flatMap(session => {
    try {
      const bounds = sessionBounds(session);
      const from = Math.max(start.getTime(), bounds.start.getTime());
      const to = Math.min(end.getTime(), bounds.end.getTime());
      if (!(to > from)) return [];
      return [{
        session, from, to,
        startMinutes: Math.round((from - start.getTime()) / 60000),
        endMinutes: Math.round((to - start.getTime()) / 60000),
        minutes: (to - from) / 60000,
        continued: session.date !== iso,
        overnight: bounds.end.getTime() > end.getTime()
      }];
    } catch { return []; }
  }).sort((a,b) => a.from - b.from);
}
function mount() {
  const main = document.querySelector("main.layout");
  const timer = main?.querySelector(".timer-card");
  const sessionSection = main?.querySelector(".schedule-section");
  const dateField = document.getElementById("filter-date");
  const dateToolbar = sessionSection?.querySelector(".date-toolbar");
  const sessionsList = document.getElementById("sessions-list");
  if (!main || !timer || !sessionSection || !dateField || !dateToolbar ||
      !sessionsList || document.getElementById("tempo-day-timeline")) return;

  // OGGI: existing timer and upcoming-session widgets stay wired to app.js/tempo-ui.js.
  const heading = document.createElement("section");
  heading.className = "tempo-today-heading tempo-view-section";
  heading.dataset.tempoView = "oggi";
  heading.innerHTML = '<div><p class="eyebrow">LA TUA GIORNATA</p><h1>Oggi</h1>' +
    '<p class="tempo-today-date" id="tempo-today-date"></p></div>' +
    '<button type="button" class="button button-secondary" id="tempo-today-plan">Pianifica la giornata</button>';
  timer.before(heading);

  const grid = document.createElement("div");
  grid.className = "tempo-today-grid tempo-view-section";
  grid.dataset.tempoView = "oggi";
  timer.before(grid);
  grid.append(timer);

  const activities = document.createElement("section");
  activities.className = "tempo-today-activities";
  activities.setAttribute("aria-labelledby","tempo-today-activities-title");
  activities.innerHTML =
    '<div class="tempo-today-card-heading"><div><p class="eyebrow">ATTIVITÀ</p>' +
    '<h2 id="tempo-today-activities-title">Da fare oggi</h2></div>' +
    '<a href="#agenda" class="text-button">Apri Agenda</a></div>' +
    '<div class="tempo-today-metrics" id="tempo-today-metrics"></div>' +
    '<div class="tempo-today-task-list" id="tempo-today-tasks"></div>' +
    '<div class="tempo-today-attention" id="tempo-today-attention"></div>';
  grid.append(activities);
  if (document.body.dataset.tempoActiveView && document.body.dataset.tempoActiveView !== "oggi") {
    heading.hidden = true;
    grid.hidden = true;
  }
  const upcoming = main.querySelector(".tempo-next-card");
  if (upcoming) upcoming.classList.add("tempo-today-next");

  heading.querySelector("#tempo-today-plan").addEventListener("click", () => {
    dateField.value = today();
    dateField.dispatchEvent(new Event("change", {bubbles:true}));
    location.hash = "sessioni";
  });
  activities.addEventListener("click", event => {
    const taskButton = event.target.closest("[data-today-task]");
    if (taskButton) {
      window.dispatchEvent(new CustomEvent("tempo:show-task",
        {detail:{taskId:taskButton.dataset.todayTask}}));
      return;
    }
    const planButton = event.target.closest("[data-today-plan-task]");
    if (planButton) window.dispatchEvent(new CustomEvent("tempo:open-task-plan",
      {detail:{taskId:planButton.dataset.todayPlanTask}}));
  });

  // SESSIONI: one shared date input controls both the existing list and visual planner.
  const prev = document.createElement("button");
  prev.type = "button"; prev.className = "tempo-day-arrow";
  prev.textContent = "‹"; prev.setAttribute("aria-label","Giorno precedente");
  const next = document.createElement("button");
  next.type = "button"; next.className = "tempo-day-arrow";
  next.textContent = "›"; next.setAttribute("aria-label","Giorno successivo");
  dateToolbar.prepend(prev);
  dateToolbar.insertBefore(next, dateField.nextSibling);
  const changeDay = offset => {
    dateField.value = addDays(isIsoDay(dateField.value)?dateField.value:today(),offset);
    dateField.dispatchEvent(new Event("change",{bubbles:true}));
  };
  prev.addEventListener("click",()=>changeDay(-1));
  next.addEventListener("click",()=>changeDay(1));

  const week = document.createElement("div");
  week.id = "tempo-planner-week";
  week.className = "tempo-planner-week";
  week.setAttribute("role","group");
  week.setAttribute("aria-label","Giorni della settimana");
  dateToolbar.after(week);

  const planner = document.createElement("section");
  planner.id = "tempo-day-timeline";
  planner.className = "tempo-day-timeline";
  planner.setAttribute("aria-label","Programmazione visiva delle sessioni");
  week.after(planner);

  const sessionDetails = document.createElement("details");
  sessionDetails.className = "tempo-session-details";
  sessionDetails.open = true;
  sessionDetails.innerHTML =
    '<summary><span>Elenco delle sessioni e attività associate</span>' +
    '<span class="tempo-session-details-hint">Checkbox e gestione dettagliata</span></summary>';
  sessionsList.before(sessionDetails);
  sessionDetails.append(sessionsList);

  // The automatic day planner belongs beside Sessioni, not in the capture Inbox.
  const autoPlanner = main.querySelector(".tempo-day-planner");
  let autoDate = null;
  if (autoPlanner) {
    const autoDetails = document.createElement("details");
    autoDetails.className = "tempo-auto-plan-details";
    autoDetails.id = "tempo-auto-plan-details";
    autoDetails.innerHTML =
      '<summary>Pianificazione automatica delle task <span>Apri strumenti</span></summary>';
    sessionDetails.after(autoDetails);
    autoDetails.append(autoPlanner);
    autoDate = document.getElementById("tempo-day-date");
    autoDate?.addEventListener("change", () => {
      if (!isIsoDay(autoDate.value) || autoDate.value === dateField.value) return;
      dateField.value = autoDate.value;
      dateField.dispatchEvent(new Event("change",{bubbles:true}));
    });
  }

  let firstMinute = 7 * 60;
  let shownPlannerDay = "";
  function renderToday(state) {
    const iso = today();
    const slices = daySlices(state.sessions,iso);
    const total = slices.reduce((sum,x)=>sum+x.minutes,0);
    const relevant = state.tasks.filter(task => {
      if (!task || task.status === "done" || isTaskInInbox(task)) return false;
      return task.workDate === iso || (task.dueDate && task.dueDate <= iso) ||
        slices.some(slice => sessionHasTask(slice.session, task.id));
    });
    const priority = {alta:0,media:1,bassa:2,nessuna:3};
    relevant.sort((a,b) =>
      (priority[a.priority]??3)-(priority[b.priority]??3) ||
      (a.dueDate||"9999").localeCompare(b.dueDate||"9999") ||
      a.title.localeCompare(b.title,"it"));
    document.getElementById("tempo-today-date").textContent = formatDate(iso);
    document.getElementById("tempo-today-metrics").innerHTML =
      '<div><strong>'+hours(total)+'</strong><span>Programmate oggi · lorde</span></div>' +
      '<div><strong>'+slices.length+'</strong><span>Blocchi nella giornata</span></div>' +
      '<div><strong>'+relevant.length+'</strong><span>Attività aperte pertinenti</span></div>';
    const taskList = document.getElementById("tempo-today-tasks");
    taskList.innerHTML = relevant.length ? relevant.slice(0,8).map(t => {
      const attention = getTaskAttention(t,state.sessions,new Date());
      const description = [
        t.area || "Area da definire",
        t.dueDate && t.dueDate < iso ? "Scaduta" : t.dueDate === iso ? "Scade oggi" : "",
        attention?.kind === "reschedule" ? "Da riprogrammare" : "",
        t.status === "in_progress" ? "In corso" : ""
      ].filter(Boolean).join(" · ");
      return '<div class="tempo-today-task" data-area="'+escape(t.area)+'">' +
        '<span class="tempo-today-open-circle" aria-hidden="true">○</span>' +
        '<button type="button" class="tempo-today-task-title" data-today-task="'+escape(t.id)+'">'+
          '<strong>'+escape(t.title)+'</strong><small>'+escape(description)+'</small></button>' +
        '<button type="button" class="tempo-today-task-plan" data-today-plan-task="'+escape(t.id)+'" aria-label="Programma '+escape(t.title)+'" title="Programma una quota">◷</button></div>';
    }).join("") : '<p class="tempo-day-empty">Nessuna attività prevista o in scadenza oggi. Puoi aggiungerne una con il pulsante +.</p>';
    if(relevant.length>8)taskList.insertAdjacentHTML("beforeend",
      '<a class="tempo-today-more" href="#agenda">Altre '+(relevant.length-8)+' attività nell’Agenda</a>');
    const attentionTasks = state.tasks.filter(t => t && t.status !== "done" &&
      !isTaskInInbox(t) && getTaskAttention(t,state.sessions,new Date())?.kind === "reschedule");
    const attentionNode = document.getElementById("tempo-today-attention");
    attentionNode.innerHTML = attentionTasks.length ?
      '<span class="tempo-attention-dot" aria-hidden="true"></span><span>'+attentionTasks.length+
      ' attività da riprogrammare</span><a href="#agenda">Apri Agenda</a>' : "";
    attentionNode.hidden = attentionTasks.length === 0;
  }

  function renderPlanner(state) {
    const previousViewport = planner.querySelector(".tempo-planner-viewport");
    const previousScroll = previousViewport?.scrollTop || 0;
    const iso = isIsoDay(dateField.value) ? dateField.value : today();
    if (autoDate && autoDate.value !== iso) {
      autoDate.value = iso;
      autoDate.dispatchEvent(new Event("change",{bubbles:true}));
    }
    const slices = daySlices(state.sessions,iso);
    const mondayOffset = (dayDate(iso).getDay()+6)%7;
    const monday = addDays(iso,-mondayOffset);
    week.innerHTML = Array.from({length:7},(_,i) => {
      const date = addDays(monday,i);
      const dayLoad = daySlices(state.sessions,date).reduce((sum,x)=>sum+x.minutes,0);
      const isSelected = date === iso;
      return '<button type="button" class="tempo-week-day" data-day="'+date+'"'+
        (isSelected?' aria-current="date"':'')+' aria-label="'+escape(formatDate(date))+'">'+
        '<span>'+escape(formatDate(date,{weekday:"short"}))+'</span><strong>'+
        escape(formatDate(date,{day:"numeric"}))+'</strong><small>'+hours(dayLoad)+'</small></button>';
    }).join("");
    const startMin = slices.length ? Math.min(...slices.map(x=>x.startMinutes)) : 7*60;
    const endMin = slices.length ? Math.max(...slices.map(x=>x.endMinutes)) : 22*60;
    const firstHour = Math.min(7,Math.floor(startMin/60));
    const lastHour = Math.min(24,Math.max(22,Math.ceil(endMin/60)));
    firstMinute = firstHour*60;
    const height = (lastHour-firstHour)*HOUR_HEIGHT;
    const now = new Date();
    const nowMinutes = now.getHours()*60 + now.getMinutes();
    const nowLine = iso===today() && nowMinutes>=firstMinute && nowMinutes<=lastHour*60 ?
      '<span class="tempo-now-line" style="top:'+((nowMinutes-firstMinute)/60*HOUR_HEIGHT)+'px" aria-label="Ora attuale"></span>' : "";
    const marks = Array.from({length:lastHour-firstHour+1},(_,i) => {
      const minute=(firstHour+i)*60;
      const position=i*HOUR_HEIGHT;
      return '<span class="tempo-time-mark" style="top:'+position+'px">'+
        (minute===1440?"24:00":hhmm(minute))+'</span>';
    }).join("");
    const blocks = slices.map(slice => {
      const session=slice.session;
      const area=session.area || session.title || "Studio";
      const top = (slice.startMinutes-firstMinute)/60*HOUR_HEIGHT;
      const blockHeight = (slice.endMinutes-slice.startMinutes)/60*HOUR_HEIGHT;
      const compact = blockHeight < 42;
      const taskNames = state.tasks.filter(t=>sessionHasTask(session,t.id)).map(t=>t.title);
      return '<button type="button" class="tempo-planner-block'+(compact?' tempo-planner-compact':'')+
        '" data-session-id="'+escape(session.id)+'" data-area="'+escape(area)+'"'+
        ' style="top:'+top+'px;height:'+Math.max(14,blockHeight-3)+'px"'+
        ' aria-label="'+escape("Modifica sessione "+area+" "+hhmm(slice.startMinutes)+"–"+
          (slice.endMinutes===1440?"24:00":hhmm(slice.endMinutes)))+'">'+
        '<strong>'+escape(area)+'</strong> <span>'+
        escape(hhmm(slice.startMinutes)+'–'+(slice.endMinutes===1440?'24:00':hhmm(slice.endMinutes)))+
        '</span>'+(compact?'':'<small>'+escape(taskNames.slice(0,2).join(", ")||
          (slice.continued?"Continua da ieri":slice.overnight?"Prosegue domani":"Sessione senza task"))+'</small>')+
        '</button>';
    }).join("");
    const total = slices.reduce((sum,s)=>sum+s.minutes,0);
    planner.innerHTML =
      '<div class="tempo-planner-header"><div><p class="eyebrow">PROGRAMMA DEL GIORNO</p>' +
      '<h3>'+escape(formatDate(iso))+'</h3></div>' +
      '<div class="tempo-planner-total"><strong>'+hours(total)+'</strong>'+
      '<span>lorde · '+slices.length+' '+(slices.length===1?'sessione':'blocchi')+'</span></div></div>' +
      '<p class="tempo-planner-hint">Seleziona un blocco per modificarlo; tocca uno spazio libero per proporre una nuova sessione.</p>' +
      '<div class="tempo-planner-viewport"><div class="tempo-planner-ruler" style="height:'+height+'px">'+marks+'</div>' +
      '<div class="tempo-planner-lane" style="height:'+height+'px" role="group" aria-label="Fasce orarie del giorno">'+
        nowLine+blocks+'</div></div>' +
      (!slices.length?'<p class="tempo-planner-no-sessions">Giornata libera: tocca un orario per programmare.</p>':"");
    const viewport = planner.querySelector(".tempo-planner-viewport");
    if (viewport) viewport.scrollTop = shownPlannerDay === iso ? previousScroll :
      Math.max(0,(startMin-firstMinute)/60*HOUR_HEIGHT-65);
    shownPlannerDay = iso;
    sessionDetails.hidden = !state.sessions.some(session => session.date === iso);
  }
  function render() {
    const state=readState();
    renderToday(state);
    renderPlanner(state);
  }
  week.addEventListener("click",event=>{
    const b=event.target.closest("button[data-day]");
    if(!b)return;
    dateField.value=b.dataset.day;
    dateField.dispatchEvent(new Event("change",{bubbles:true}));
  });
  planner.addEventListener("click",event=>{
    const button=event.target.closest("[data-session-id]");
    if(button){
      window.dispatchEvent(new CustomEvent("tempo:edit-session",
        {detail:{sessionId:button.dataset.sessionId}}));
      return;
    }
    const lane=event.target.closest(".tempo-planner-lane");
    if(!lane)return;
    const bounds=lane.getBoundingClientRect();
    const minutes = Math.max(0,Math.min(1425,
      Math.floor((firstMinute + (event.clientY-bounds.top) / HOUR_HEIGHT * 60)/15)*15));
    const start=hhmm(minutes);
    const end=hhmm((minutes+60)%1440);
    document.getElementById("new-session-button")?.click();
    const dialog=document.getElementById("session-dialog");
    if (!dialog?.open) return;
    document.getElementById("session-date").value=dateField.value;
    document.getElementById("session-start").value=start;
    document.getElementById("session-end").value=end;
    document.getElementById("session-date").dispatchEvent(new Event("change",{bubbles:true}));
  });
  dateField.addEventListener("change",render);
  window.addEventListener("tempo:rendered",render);
  window.addEventListener("storage",render);
  window.addEventListener("hashchange",render);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)render();});
  // Refresh the "now" line and reminders while the application stays open.
  setInterval(()=>{if(!document.hidden)render();},60000);
  render();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",mount);
else mount();
