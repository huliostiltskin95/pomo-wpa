import { TempoAmbientAudio } from "./core/tempo-audio.js";
import { mountAgenda } from "./agenda.js";
import { mountSessionFiller } from "./tempo-fill-ui.js";
import { reconcileSessionAllocations } from "./core/tempo-fill.js";
import { DEFAULT_APPEARANCE, normalizeAppearance, applyAppearance } from "./core/tempo-appearance.js";
import { createDropboxSync } from "./core/tempo-dropbox.js";
import { normalizeTask, focusMinutesInSession, sessionTaskIds, sessionArea, grossMinutesForTask, withSessionTasks } from "./core/tempo-tasks.js";
import { localDateString, timeToMinutes, dateTime, formatTime, formatDate, escapeHtml, clampInt, pauseMinutes, normalizeSession, validSession, sessionBounds, getSessionStatus, getPhase, mmss, getActiveSession as findActiveSession, getNextSession as findNextSession, getAmbientFocusMode, hasSessionOverlaps } from "./core/tempo-core.js";

(() => {
  "use strict";
  const STORAGE_KEY = "tempo-pomodoro-v2";
  const OLD_STORAGE_KEY = "tempo-pomodoro-v1";
  const DEFAULTS = { workMinutes: 25, breakEnabled: true };
  const $ = (id) => document.getElementById(id);
  const els = {
    connectionStatus:$("connection-status"),installButton:$("install-button"),timerMode:$("timer-mode"),timerHeading:$("timer-heading"),phasePill:$("phase-pill"),timerDisplay:$("timer-display"),timerCaption:$("timer-caption"),timerProgress:$("timer-progress"),timerSessionLabel:$("timer-session-label"),timerEndLabel:$("timer-end-label"),newSessionButton:$("new-session-button"),emptyAddButton:$("empty-add-button"),filterDate:$("filter-date"),todayButton:$("today-button"),sessionsList:$("sessions-list"),emptyState:$("empty-state"),dialog:$("session-dialog"),sessionForm:$("session-form"),dialogTitle:$("dialog-title"),sessionId:$("session-id"),sessionTitle:$("session-title"),sessionDate:$("session-date"),sessionStart:$("session-start"),sessionEnd:$("session-end"),sessionWork:$("session-work"),sessionBreakEnabled:$("session-break-enabled"),breakPreview:$("break-preview"),plannedSummaryList:$("planned-summary-list"),formError:$("form-error"),deleteButton:$("delete-session-button"),closeDialog:$("close-dialog"),cancelDialog:$("cancel-dialog"),defaultsForm:$("defaults-form"),defaultWork:$("default-work"),defaultBreakEnabled:$("default-break-enabled"),exportButton:$("export-button"),importInput:$("import-input"),toast:$("toast"),focusButton:$("focus-button"),notificationButton:$("notification-button"),focusOverlay:$("focus-overlay"),focusLabel:$("focus-label"),focusTitle:$("focus-title"),focusDisplay:$("focus-display"),focusCaption:$("focus-caption"),exitFocusButton:$("exit-focus-button"),focusFullscreenButton:$("focus-fullscreen-button"),focusSoundButton:$("focus-sound-button"),soundSelect:$("sound-select"),soundVolume:$("sound-volume"),volumeValue:$("volume-value"),soundToggle:$("sound-toggle"),soundStatus:$("sound-status"),exportIcsButton:$("export-ics-button")
  };
  let state = loadState();
  applyAppearance(state.appearance);
  let agenda = null;
  let filler = null;
  let dropbox = null;
  let deferredInstallPrompt = null;
  let lastPhaseKey = "";
  let lastActiveSessionId = null;
  let lastActiveSessionTitle = "";
  let toastTimeout = null;
  let swRegistration = null;
  let soundPlaying = false;
  const ambient = new TempoAmbientAudio(playing => {
    soundPlaying = playing;
    els.soundToggle.textContent = playing ? "Ferma suono" : "Avvia suono";
    els.focusSoundButton.textContent = playing ? "Ferma suono" : "Avvia suono";
    els.soundStatus.textContent = playing ? "Suono attivo durante la concentrazione" : "Audio disattivato";
  });
  function syncFocusAudio(now = new Date()) {
    if (!ambient.playing) return;
    const mode = getAmbientFocusMode(state.sessions, now);
    if (mode === "finished") {
      ambient.stop(.9);
    } else {
      ambient.setAudible(mode === "focus");
      els.soundStatus.textContent = mode === "focus"
        ? "Suono attivo durante la concentrazione"
        : "In pausa · ripresa automatica al prossimo focus";
    }
  }
  function loadState() {
    try {
      let raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(OLD_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.sessions)) {
          const tasksById = new Map();
          if (Array.isArray(parsed.tasks)) {
            for (const item of parsed.tasks) {
              const task = normalizeTask(item);
              if (task) tasksById.set(task.id, task);
            }
          }
          return {
            sessions: parsed.sessions.filter(validSession).map(s=>migrateSession(normalizeSession(s),[...tasksById.values()])),
            tasks: [...tasksById.values()],
            history: Array.isArray(parsed.history) ? parsed.history.filter(validHistory) : [],
            syncDeleted:normalizeDeleted(parsed.syncDeleted),
            defaults: {
              workMinutes: clampInt(parsed.defaults?.workMinutes, 1, 240, 25),
              breakEnabled: parsed.defaults?.breakEnabled !== undefined ? Boolean(parsed.defaults.breakEnabled) : true
            },
            appearance: normalizeAppearance(parsed.appearance)
          };
        }
      }
    } catch (error) { console.warn("Impossibile leggere i dati locali.", error); }
    return { sessions: [], tasks: [], history: [], syncDeleted:{tasks:[],sessions:[]}, defaults: { ...DEFAULTS }, appearance: normalizeAppearance(DEFAULT_APPEARANCE) };
  }
  function migrateSession(s,tasks){const area=sessionArea(s,tasks);return {...withSessionTasks(s,sessionTaskIds(s)),area,title:area};}
  // The picker selection is independent of rendered rows: filtering/sorting must not drop hidden checks.
  const pickerSelectedIds = new Set();
  let pickerReverse = false;
  const pickerPriority = {alta:0, media:1, bassa:2, nessuna:3};
  function taskPicker(ids) {
    if(Array.isArray(ids)){pickerSelectedIds.clear();ids.forEach(id=>pickerSelectedIds.add(id));}
    const area=els.sessionTitle.value;
    const available=state.tasks.filter(t=>t.area===area&&t.status!=="done");
    const query=$("session-task-search").value.trim().toLocaleLowerCase("it");
    const mode=$("session-task-sort").value;
    const compareTitle=(a,b)=>a.title.localeCompare(b.title,"it",{sensitivity:"base"});
    const due=t=>t.dueDate||"9999-12-31";
    const compare=(a,b)=>{
      let result=0;
      if(mode==="due")result=due(a).localeCompare(due(b))||(pickerPriority[a.priority]??3)-(pickerPriority[b.priority]??3);
      else if(mode==="title")result=compareTitle(a,b);
      else if(mode==="created")result=(b.createdAt||"").localeCompare(a.createdAt||"");
      else if(mode==="status")result=Number(a.status!=="in_progress")-Number(b.status!=="in_progress");
      else result=(pickerPriority[a.priority]??3)-(pickerPriority[b.priority]??3)||due(a).localeCompare(due(b));
      return (pickerReverse?-1:1)*(result||compareTitle(a,b)||a.id.localeCompare(b.id));
    };
    const filtered=available.filter(t=>!query||t.title.toLocaleLowerCase("it").includes(query)).sort(compare);
    const picker=$("session-task-picker");
    picker.innerHTML=filtered.map(t=>
      '<label class="tempo-session-task tempo-task-picker-row"><input type="checkbox" value="'+escapeHtml(t.id)+'" '+(pickerSelectedIds.has(t.id)?'checked':'')+'>'+
      '<span class="tempo-task-picker-details"><span class="tempo-task-picker-title">'+escapeHtml(t.title)+'</span>'+
      '<span class="tempo-task-picker-meta"><span class="tempo-task-picker-priority priority-'+escapeHtml(t.priority)+'">'+
      escapeHtml(({alta:"!1 Alta",media:"!2 Media",bassa:"!3 Bassa",nessuna:"!4 Nessuna"})[t.priority])+'</span>'+
      (t.dueDate?'<span>Scade '+escapeHtml(formatDate(t.dueDate))+'</span>':'<span>Senza scadenza</span>')+
      (t.status==="in_progress"?'<span>In corso</span>':'')+
      '</span></span></label>'
    ).join("") || '<p class="tempo-task-picker-empty">'+(query?"Nessuna task corrisponde alla ricerca.":"Nessuna task da svolgere in quest’area.")+'</p>';
    updateTaskPickerCount();
  }
  function updateTaskPickerCount(){
    const available=state.tasks.filter(t=>t.area===els.sessionTitle.value&&t.status!=="done");
    const chosen=available.filter(t=>pickerSelectedIds.has(t.id)).length;
    $("session-task-count").textContent=chosen+" selezionate su "+available.length+" disponibili";
    $("session-task-reverse").setAttribute("aria-pressed",String(pickerReverse));
    $("session-task-reverse").textContent=pickerReverse?"Ordine inverso":"Inverti ordine";
  }
  function resetTaskPicker(){
    $("session-task-sort").value="priority";
    $("session-task-search").value="";
    pickerReverse=false;
  }
  function checklist(s){return '<div class="tempo-session-tasks">'+state.tasks.filter(t=>sessionTaskIds(s).includes(t.id)).map(t=>'<label class="tempo-session-task"><input type="checkbox" data-check-task="'+escapeHtml(t.id)+'" '+(t.status==="done"?"checked":"")+'><span>'+escapeHtml(t.title)+' · '+(grossMinutesForTask(s,t.id)/60).toLocaleString("it-IT",{maximumFractionDigits:2})+' h lorde</span></label>').join("")+'</div>';}
  function validHistory(h){return h && typeof h.sessionId==="string" && typeof h.minutes==="number" && Number.isFinite(h.minutes) && h.minutes>=0 && typeof h.taskId==="string" && typeof h.date==="string";}
  function archivePast(session){
    if(!session || sessionBounds(session).end > new Date()) return;
    if((state.history||[]).some(h=>h.sessionId===session.id))return;
    state.history = [...(state.history||[]), {sessionId:session.id,taskId:session.taskId||"",date:session.date,minutes:focusMinutesInSession(session),title:session.title}];
  }
  function normalizeDeleted(input) {
    return ["tasks","sessions"].reduce((out,key)=>{
      out[key]=Array.isArray(input?.[key])?[...new Set(input[key].filter(id=>typeof id==="string"&&id))]:[];
      return out;
    },{});
  }
  function persist(){
    const beforeDeleted=state.syncDeleted;
    try {
      // A tombstone must survive on Dropbox after an item is deleted locally.
      const previousRaw=localStorage.getItem(STORAGE_KEY)||localStorage.getItem(OLD_STORAGE_KEY);
      const previous=previousRaw?JSON.parse(previousRaw):null;
      const tombstones=normalizeDeleted(state.syncDeleted);
      for(const kind of ["tasks","sessions"]){
        const present=new Set(state[kind].map(item=>item.id));
        if(Array.isArray(previous?.[kind]))for(const item of previous[kind]){
          if(item?.id && !present.has(item.id))tombstones[kind].push(item.id);
        }
        tombstones[kind]=[...new Set(tombstones[kind])].filter(id=>!present.has(id)).sort();
      }
      state.syncDeleted=tombstones;
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
      dropbox?.changed();
      return true;
    } catch(error) {
      state.syncDeleted=beforeDeleted;
      showToast("Non è stato possibile salvare i dati nel browser.");
      return false;
    }
  }
  function getActiveSession(now=new Date()){return findActiveSession(state.sessions,now);}
  function getNextSession(now=new Date()){return findNextSession(state.sessions,now);}
  function showToast(message){els.toast.textContent=message;els.toast.classList.add("show");clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>els.toast.classList.remove("show"),3200);}
  async function sendNotification(title,body){if(!("Notification" in window)||Notification.permission!=="granted")return;try{if(swRegistration)await swRegistration.showNotification(title,{body,icon:"./icon.svg",tag:"tempo-"+Date.now(),renotify:false});else new Notification(title,{body,icon:"./icon.svg"});}catch(error){console.warn("Notifica non disponibile:",error);}}
  function notifyPhaseChange(session,phase){const key=`${session.id}:${phase.kind}:${phase.start.getTime()}`;if(key===lastPhaseKey)return;const wasSet=Boolean(lastPhaseKey);lastPhaseKey=key;if(wasSet){const title=phase.kind==="work"?"Concentrazione":"Pausa";const body=phase.kind==="work"?`Riprendi: ${session.title}`:`È il momento di una pausa · ${session.title}`;showToast(body);sendNotification(title,body);}}
  function renderTimer(now=new Date()){
    syncFocusAudio(now);
    const active=getActiveSession(now);
    if(active){if(lastActiveSessionId!==active.id){if(lastActiveSessionId)sendNotification("Sessione terminata",`Hai concluso: ${lastActiveSessionTitle}`);const sessionStart=sessionBounds(active).start;if(now>=sessionStart&&now-sessionStart<60000)sendNotification("Sessione iniziata",`È il momento di concentrarti: ${active.title}`);lastActiveSessionId=active.id;lastActiveSessionTitle=active.title;}const phase=getPhase(active,now);els.timerMode.textContent=phase.kind==="work"?"SESSIONE IN CORSO":"PAUSA IN CORSO";els.timerHeading.textContent=active.title;els.phasePill.textContent=phase.label;els.phasePill.className=`phase-pill ${phase.kind}`;els.timerDisplay.textContent=mmss(phase.remaining);els.timerCaption.textContent=phase.kind==="work"?`Concentrazione fino alle ${formatTime(phase.end)}`:`La pausa termina alle ${formatTime(phase.end)}`;els.timerProgress.style.width=`${phase.progress}%`;els.timerProgress.style.background=phase.kind==="work"?"var(--accent)":"var(--green)";els.timerSessionLabel.textContent=`${active.start}–${active.end} · ${active.title}`;els.timerEndLabel.textContent=`Fine sessione ${formatTime(phase.sessionEnd)}`;notifyPhaseChange(active,phase);document.title=`${mmss(phase.remaining)} · ${phase.label} — TEMPVS`;renderFocus(phase,active);return;}
    lastPhaseKey="";if(lastActiveSessionId){sendNotification("Sessione terminata",`Hai concluso: ${lastActiveSessionTitle}`);lastActiveSessionId=null;lastActiveSessionTitle="";}const next=getNextSession(now);els.phasePill.textContent=next?"In programma":"In attesa";els.phasePill.className="phase-pill neutral";els.timerProgress.style.width="0%";els.timerProgress.style.background="var(--accent)";els.timerSessionLabel.textContent=next?next.title:"Nessuna sessione in corso";
    if(next){const start=sessionBounds(next).start;els.timerMode.textContent="PROSSIMA SESSIONE";els.timerHeading.textContent=next.title;els.timerDisplay.textContent="—";els.timerCaption.textContent=`Inizio previsto alle ${formatTime(start)}`;els.timerEndLabel.textContent=`${next.workMinutes} min lavoro${next.breakEnabled?` · ${pauseMinutes(next.workMinutes)} min pausa`:" · senza pause"}`;document.title="Prossima sessione — TEMPVS";renderFocus(null,next);}
    else{els.timerMode.textContent="NESSUNA SESSIONE ATTIVA";els.timerHeading.textContent="Pronto quando vuoi";els.timerDisplay.textContent=`${String(state.defaults.workMinutes).padStart(2,"0")}:00`;els.timerCaption.textContent="La prossima sessione apparirà qui.";els.timerEndLabel.textContent="—";document.title="TEMPVS";renderFocus(null,null);}
  }
  function renderFocus(phase,session){if(!phase){els.focusLabel.textContent=session?"PROSSIMA SESSIONE":"TEMPO PER TE";els.focusTitle.textContent=session?session.title:"Pronto quando vuoi";els.focusDisplay.textContent="—";els.focusCaption.textContent=session?`Inizio alle ${session.start} · ${session.workMinutes} min di concentrazione`:"La prossima sessione apparirà qui.";return;}els.focusLabel.textContent=phase.label.toUpperCase();els.focusTitle.textContent=session.title;els.focusDisplay.textContent=mmss(phase.remaining);els.focusCaption.textContent=phase.kind==="work"?`Concentrazione fino alle ${formatTime(phase.end)}`:`Pausa fino alle ${formatTime(phase.end)}`;}
  function renderSessions(){const date=els.filterDate.value,sessions=state.sessions.filter(s=>s.date===date).sort((a,b)=>a.start.localeCompare(b.start));els.sessionsList.innerHTML="";els.emptyState.classList.toggle("hidden",sessions.length>0);els.sessionsList.classList.toggle("hidden",sessions.length===0);sessions.forEach(s=>{const status=getSessionStatus(s),label=status==="active"?"In corso":status==="upcoming"?"In programma":"Terminata",article=document.createElement("article");article.className="session-item";article.dataset.area=sessionArea(s,state.tasks);article.innerHTML=`<div class="session-time">${escapeHtml(s.start)}–${escapeHtml(s.end)}<span>${escapeHtml(formatDate(s.date))}</span></div><div><p class="session-name">${escapeHtml(s.title)}</p><p class="session-meta">${s.workMinutes} min concentrazione${s.breakEnabled?` · ${pauseMinutes(s.workMinutes)} min pausa (5:1)`:" · senza pause"}</p>${checklist(s)}<span class="session-status ${status==="active"?"active":""}">${label}</span></div><div class="session-actions"><button class="small-button" type="button" data-fill="${escapeHtml(s.id)}" title="Assegna task" aria-label="Riempi con task">＋ Task</button><button class="small-button" type="button" data-edit="${escapeHtml(s.id)}" aria-label="Modifica ${escapeHtml(s.title)}" title="Modifica">✎</button><button class="small-button" type="button" data-delete="${escapeHtml(s.id)}" aria-label="Elimina ${escapeHtml(s.title)}" title="Elimina">×</button></div>`;els.sessionsList.appendChild(article);});}
  function renderAll(){applyAppearance(state.appearance);renderTimer();renderSessions();agenda?.render();els.defaultWork.value=state.defaults.workMinutes;els.defaultBreakEnabled.checked=state.defaults.breakEnabled;window.dispatchEvent(new CustomEvent("tempo:appearance-updated",{detail:state.appearance}));}
  function updateBreakPreview(){const work=clampInt(els.sessionWork.value,1,240,25);els.breakPreview.textContent=els.sessionBreakEnabled.checked?`Con ${work} minuti di concentrazione, la pausa sarà di ${pauseMinutes(work)} ${pauseMinutes(work)===1?"minuto":"minuti"}.`:"Le pause sono disattivate: la sessione sarà un unico intervallo di concentrazione.";}
  function updatePlannedSummary(){const date=els.sessionDate.value,id=els.sessionId.value,items=state.sessions.filter(s=>s.date===date&&s.id!==id).sort((a,b)=>a.start.localeCompare(b.start));els.plannedSummaryList.innerHTML=items.length?items.map(s=>`<div class="planned-row"><span>${escapeHtml(s.start)}–${escapeHtml(s.end)}</span><span>${escapeHtml(s.title)}</span></div>`).join("") : "Nessun'altra sessione per questa data.";}
  function openNewDialog(){els.sessionForm.reset();els.sessionId.value="";els.dialogTitle.textContent="Nuova sessione";els.sessionTitle.value="Studio";resetTaskPicker();taskPicker([]);els.sessionDate.value=els.filterDate.value||localDateString();els.sessionStart.value="09:00";els.sessionEnd.value="11:00";els.sessionWork.value=state.defaults.workMinutes;els.sessionBreakEnabled.checked=state.defaults.breakEnabled;els.formError.textContent="";els.deleteButton.classList.add("hidden");updateBreakPreview();updatePlannedSummary();els.dialog.showModal();els.sessionTitle.focus();}
  function openEditDialog(id){const s=state.sessions.find(x=>x.id===id);if(!s)return;els.sessionId.value=s.id;els.dialogTitle.textContent="Modifica sessione";els.sessionTitle.value=sessionArea(s,state.tasks);resetTaskPicker();taskPicker(sessionTaskIds(s));els.sessionDate.value=s.date;els.sessionStart.value=s.start;els.sessionEnd.value=s.end;els.sessionWork.value=s.workMinutes;els.sessionBreakEnabled.checked=s.breakEnabled;els.formError.textContent="";els.deleteButton.classList.remove("hidden");updateBreakPreview();updatePlannedSummary();els.dialog.showModal();}
  function saveSession(event){
    event.preventDefault();
    const existingId=els.sessionId.value;
    const existingSession=state.sessions.find(s=>s.id===existingId);
    const session={id:existingId||(crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`),title:els.sessionTitle.value.trim(),area:els.sessionTitle.value.trim(),taskIds:[...new Set([...pickerSelectedIds].filter(id=>state.tasks.some(t=>t.id===id&&t.area===els.sessionTitle.value&&t.status!=="done")).concat(existingSession?sessionTaskIds(existingSession).filter(id=>state.tasks.some(t=>t.id===id&&t.area===els.sessionTitle.value&&t.status==="done")):[]))],date:els.sessionDate.value,start:els.sessionStart.value,end:els.sessionEnd.value,workMinutes:Number(els.sessionWork.value),breakEnabled:els.sessionBreakEnabled.checked};
    if(!session.title){els.formError.textContent="Inserisci un nome per la sessione.";return;}
    if(!validSession(session)){els.formError.textContent="Controlla gli orari e la durata della sessione.";return;}
    const {start,end}=sessionBounds(session);
    const overlaps=state.sessions.some(s=>{if(s.id===session.id)return false;const bounds=sessionBounds(s);return start<bounds.end&&end>bounds.start;});
    if(overlaps){els.formError.textContent="Questa sessione si sovrappone a un'altra sessione dello stesso giorno.";return;}
    if(existingSession?.taskAllocations){
      const originalIds=sessionTaskIds(existingSession);
      const sameTasks=originalIds.length===session.taskIds.length&&originalIds.every(id=>session.taskIds.includes(id));
      const assigned=Object.values(existingSession.taskAllocations).reduce((total,n)=>total+Number(n||0),0);
      if(sameTasks && assigned>sessionDurationMinutes(session)){
        els.formError.textContent="Durata inferiore alle quote lorde assegnate: modifica prima le assegnazioni.";
        return;
      }
    }
    const previous=state.sessions, previousTasks=state.tasks, previousHistory=state.history;
    if(existingSession)archivePast(existingSession);
    const reconciled=reconcileSessionAllocations(existingSession,session);
    state.sessions=existingId?state.sessions.map(s=>s.id===existingId?reconciled:s):[...state.sessions,reconciled];
    if(existingSession){
      state.tasks=state.tasks.map(t=>t.autoSessionId===existingId && session.taskIds.includes(t.id)
        ? {...t,plannedDate:session.date,plannedStart:session.start} : t);
    }
    if(!persist()){state.sessions=previous;state.tasks=previousTasks;state.history=previousHistory;return;}
    els.filterDate.value=session.date;els.dialog.close();renderAll();showToast(existingId?"Sessione aggiornata.":"Sessione aggiunta all'agenda.");
  }
  function deleteSession(id){
    const session=state.sessions.find(item=>item.id===id);
    if(!session||!window.confirm(`Eliminare la sessione “${session.title}”?`))return;
    const previous=state.sessions, previousHistory=state.history;
    // Intentionally removed sessions contribute neither planned nor elapsed time.
    state.sessions=state.sessions.filter(item=>item.id!==id);
    state.history=(state.history||[]).filter(entry=>entry.sessionId!==id);
    if(!persist()){state.sessions=previous;state.history=previousHistory;return;}
    if(els.dialog.open)els.dialog.close();renderAll();showToast("Sessione eliminata.");
  }
  function saveDefaults(event){
    event.preventDefault();
    const work=Number(els.defaultWork.value);
    if(!Number.isInteger(work)||work<1||work>240){showToast("Inserisci una durata valida.");return;}
    const previous=state.defaults;
    state.defaults={workMinutes:work,breakEnabled:els.defaultBreakEnabled.checked};
    if(!persist()){state.defaults=previous;els.defaultWork.value=previous.workMinutes;els.defaultBreakEnabled.checked=previous.breakEnabled;return;}
    renderTimer();showToast("Preferenze salvate.");
  }
  function downloadFile(content,type,filename){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function exportBackup(){downloadFile(JSON.stringify({app:"TEMPVS",version:5,exportedAt:new Date().toISOString(),defaults:state.defaults,appearance:state.appearance,sessions:state.sessions,tasks:state.tasks,history:state.history || [],syncDeleted:state.syncDeleted || {tasks:[],sessions:[]}},null,2),"application/json",`tempo-backup-${localDateString()}.json`);showToast("Backup esportato.");}
  async function importBackup(file) {
    if (!file) return;
    const previous = state;
    try {
      const data = JSON.parse(await file.text());
      if (!data || !Array.isArray(data.sessions) ||
          (data.tasks !== undefined && !Array.isArray(data.tasks))) throw new Error("Formato non valido");
      const sessions = data.sessions.map(s=>migrateSession(normalizeSession(s),(data.tasks||[]).map(normalizeTask).filter(Boolean)));
      if (sessions.some(session => !validSession(session))) throw new Error("Una o più sessioni non sono valide");
      if (new Set(sessions.map(session => session.id)).size !== sessions.length)
        throw new Error("Il backup contiene identificativi di sessione duplicati");
      if (hasSessionOverlaps(sessions)) throw new Error("Il backup contiene sessioni sovrapposte");

      const incomingTasks = (data.tasks || []).map(normalizeTask);
      if (incomingTasks.some(task => !task)) throw new Error("Il backup contiene attività non valide");
      if (new Set(incomingTasks.map(task => task.id)).size !== incomingTasks.length)
        throw new Error("Il backup contiene identificativi di attività duplicati");
      const history = Array.isArray(data.history) ? data.history : [];
      if(history.some(h=>!validHistory(h)))throw new Error("Lo storico del backup non è valido");
      const defaults = {
        workMinutes: clampInt(data.defaults?.workMinutes, 1, 240, 25),
        breakEnabled: data.defaults?.breakEnabled !== undefined ? Boolean(data.defaults.breakEnabled) : true
      };
      const replace = window.confirm("Sostituire tutti i dati attuali con quelli del backup? Premi Annulla per unire attività e sessioni.");
      let mergedTasks = incomingTasks;
      let mergedSessions = sessions;
      let mergedHistory = history;
      if (!replace) {
        const tasksById = new Map([...state.tasks, ...incomingTasks].map(task => [task.id, task]));
        const sessionsById = new Map([...state.sessions, ...sessions].map(session => [session.id, session]));
        mergedTasks = [...tasksById.values()];
        mergedHistory = [...new Map([...(state.history||[]),...history].map(h=>[h.sessionId,h])).values()];
        mergedSessions = [...sessionsById.values()];
        if (hasSessionOverlaps(mergedSessions))
          throw new Error("Unione non valida: le sessioni si sovrappongono.");
      }
      // Legacy backups may contain no task records: preserve their sessions as standalone.
      const validTaskIds = new Set(mergedTasks.map(task => task.id));
      mergedSessions=mergedSessions.map(session=>migrateSession(withSessionTasks(session,sessionTaskIds(session).filter(id=>validTaskIds.has(id))),mergedTasks));
      const incomingDeleted=normalizeDeleted(data.syncDeleted),currentDeleted=normalizeDeleted(state.syncDeleted);
      const mergedDeleted=replace?incomingDeleted:{
        tasks:[...new Set([...currentDeleted.tasks,...incomingDeleted.tasks])],
        sessions:[...new Set([...currentDeleted.sessions,...incomingDeleted.sessions])]
      };
      const deletedSessionIds=new Set(mergedDeleted.sessions);
      mergedSessions=mergedSessions.filter(session=>!deletedSessionIds.has(session.id));
      const keptSessionIds=new Set(mergedSessions.map(session=>session.id));
      mergedHistory=mergedHistory.filter(entry=>keptSessionIds.has(entry.sessionId));
      state = { sessions: mergedSessions, tasks: mergedTasks, history: mergedHistory, syncDeleted:mergedDeleted,
        defaults: replace ? defaults : state.defaults, appearance: replace ? normalizeAppearance(data.appearance) : state.appearance };
      if (!persist()) { state = previous; return; }
      els.filterDate.value = localDateString();
      renderAll();
      showToast("Backup importato.");
    } catch (error) {
      state = previous;
      showToast("Importazione non riuscita: " + error.message);
    } finally { els.importInput.value = ""; }
  }
  function icsEscape(value){return String(value).replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");}
  function icsDate(date){return `${localDateString(date).replace(/-/g,"")}T${String(date.getHours()).padStart(2,"0")}${String(date.getMinutes()).padStart(2,"0")}00`;}
  function exportIcs(){if(!state.sessions.length){showToast("Non ci sono sessioni da esportare.");return;}const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//TEMPVS//IT","CALSCALE:GREGORIAN","METHOD:PUBLISH","X-WR-CALNAME:TEMPVS - Sessioni di concentrazione"];state.sessions.slice().sort((a,b)=>`${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`)).forEach(s=>{const bounds=sessionBounds(s),uid=`${s.id}@tempo-pomodoro`,desc=`Concentrazione: ${s.workMinutes} min. ${s.breakEnabled?`Pause automatiche: ${pauseMinutes(s.workMinutes)} min (rapporto 5:1).`:"Pause disattivate."}`;lines.push("BEGIN:VEVENT",`UID:${icsEscape(uid)}`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"")}`,`DTSTART:${icsDate(bounds.start)}`,`DTEND:${icsDate(bounds.end)}`,`SUMMARY:${icsEscape("Concentrazione: "+s.title)}`,`DESCRIPTION:${icsEscape(desc)}`,"END:VEVENT");});lines.push("END:VCALENDAR");downloadFile(lines.join("\r\n"),"text/calendar;charset=utf-8",`tempo-sessioni-${localDateString()}.ics`);showToast("Calendario esportato in formato iCalendar.");}

  // Playback is user-initiated and strictly limited to the current work phase.
  function stopSound() { ambient.stop(.9); }
  async function startSound() {
    const session = getActiveSession();
    const phase = session ? getPhase(session) : null;
    if (!phase || phase.kind !== "work") {
      showToast("Il suono può essere avviato soltanto durante la concentrazione.");
      return;
    }
    const kind = els.soundSelect.value;
    if (kind === "off") { showToast("Seleziona prima un suono."); return; }
    const started = await ambient.start(kind, Number(els.soundVolume.value) / 100);
    if (!started) showToast("Impossibile avviare l’audio su questo dispositivo.");
    syncFocusAudio();
  }
  function toggleSound() { if (soundPlaying) stopSound(); else void startSound(); }
  function updateVolume() {
    els.volumeValue.textContent = `${els.soundVolume.value}%`;
    ambient.setVolume(Number(els.soundVolume.value) / 100);
  }
  async function enableNotifications(){if(!("Notification" in window)){showToast("Le notifiche non sono supportate da questo browser.");return;}if(!swRegistration){showToast("Attendi il completamento della registrazione dell'app, poi riprova.");return;}const permission=await Notification.requestPermission();els.notificationButton.textContent=permission==="granted"?"Notifiche attive":"Attiva notifiche";showToast(permission==="granted"?"Notifiche attivate.":"Permesso per le notifiche non concesso.");}
  async function enterFocus(){els.focusOverlay.classList.remove("hidden");document.body.classList.add("focus-open");try{if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();}catch(error){console.info("Fullscreen non disponibile senza gesto o permesso.",error);}}
  async function exitFocus(){els.focusOverlay.classList.add("hidden");document.body.classList.remove("focus-open");if(document.fullscreenElement)try{await document.exitFullscreen();}catch{}}

  window.addEventListener("tempo:appearance-save",event=>{
    const next=normalizeAppearance(event.detail),previous=state.appearance;
    if(JSON.stringify(next)===JSON.stringify(previous))return;
    state.appearance=next;
    if(!persist()){state.appearance=previous;applyAppearance(previous);window.dispatchEvent(new CustomEvent("tempo:appearance-updated",{detail:previous}));return;}
    renderAll();showToast("Aspetto aggiornato e salvato.");
  });
  window.addEventListener("tempo:edit-session",event=>{if(event.detail?.sessionId)openEditDialog(event.detail.sessionId);});
  els.newSessionButton.addEventListener("click",openNewDialog);els.emptyAddButton.addEventListener("click",openNewDialog);els.sessionForm.addEventListener("submit",saveSession);els.closeDialog.addEventListener("click",()=>els.dialog.close());els.cancelDialog.addEventListener("click",()=>els.dialog.close());els.deleteButton.addEventListener("click",()=>deleteSession(els.sessionId.value));els.filterDate.addEventListener("change",renderSessions);els.todayButton.addEventListener("click",()=>{els.filterDate.value=localDateString();renderSessions();});els.sessionTitle.addEventListener("change",()=>taskPicker([]));
   $("session-task-sort").addEventListener("change",()=>taskPicker());
   $("session-task-search").addEventListener("input",()=>taskPicker());
   $("session-task-reverse").addEventListener("click",()=>{pickerReverse=!pickerReverse;taskPicker();});
   $("session-task-picker").addEventListener("change",event=>{
     if(!event.target.matches('input[type="checkbox"]'))return;
     if(event.target.checked)pickerSelectedIds.add(event.target.value);
     else pickerSelectedIds.delete(event.target.value);
     updateTaskPickerCount();
   });
   els.sessionsList.addEventListener("change",event=>{if(!event.target.matches("[data-check-task]"))return;const id=event.target.dataset.checkTask, old=state.tasks;state.tasks=old.map(t=>t.id===id?{...t,status:event.target.checked?"done":"todo",completed:event.target.checked}:t);if(!persist())state.tasks=old;renderAll();});els.sessionsList.addEventListener("click",event=>{const edit=event.target.closest("[data-edit]"),del=event.target.closest("[data-delete]"),fill=event.target.closest("[data-fill]");if(fill)filler?.openSession(fill.dataset.fill);if(edit)openEditDialog(edit.dataset.edit);if(del)deleteSession(del.dataset.delete);});els.defaultsForm.addEventListener("submit",saveDefaults);els.exportButton.addEventListener("click",exportBackup);els.importInput.addEventListener("change",()=>importBackup(els.importInput.files[0]));els.sessionWork.addEventListener("input",updateBreakPreview);els.sessionBreakEnabled.addEventListener("change",updateBreakPreview);els.sessionDate.addEventListener("change",updatePlannedSummary);els.focusButton.addEventListener("click",enterFocus);els.exitFocusButton.addEventListener("click",exitFocus);els.focusFullscreenButton.addEventListener("click",async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch{showToast("Schermo intero non disponibile in questo browser.");}});els.notificationButton.addEventListener("click",enableNotifications);els.soundToggle.addEventListener("click",toggleSound);els.focusSoundButton.addEventListener("click",toggleSound);els.soundSelect.addEventListener("change",()=>{if(soundPlaying){const kind=els.soundSelect.value;if(kind==="off"){stopSound();return;}const audible=getAmbientFocusMode(state.sessions)==="focus";void ambient.start(kind,Number(els.soundVolume.value)/100,audible).then(ok=>{if(!ok)showToast("Impossibile cambiare suono.");syncFocusAudio();});}});els.soundVolume.addEventListener("input",updateVolume);els.exportIcsButton.addEventListener("click",exportIcs);
  window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();deferredInstallPrompt=event;els.installButton.classList.remove("hidden");});els.installButton.addEventListener("click",async()=>{if(!deferredInstallPrompt){showToast("Per installare, usa il menu del browser e scegli ‘Installa app’ o ‘Aggiungi alla schermata Home’. ");return;}const prompt=deferredInstallPrompt;deferredInstallPrompt=null;await prompt.prompt();const choice=await prompt.userChoice;if(choice?.outcome==="accepted")els.installButton.classList.add("hidden");});window.addEventListener("online",()=>{els.connectionStatus.textContent="Online";});window.addEventListener("offline",()=>{els.connectionStatus.textContent="Offline";});document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")renderAll();});window.addEventListener("focus",renderAll);window.addEventListener("pagehide",()=>ambient.stop(0));document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!els.focusOverlay.classList.contains("hidden"))exitFocus();});
  agenda = mountAgenda({ getState:()=>state, persist, refresh:renderAll, showToast, sendNotification });
  filler=mountSessionFiller({getState:()=>state,showToast,applySessions:replacements=>{
    const previous=state.sessions;
    state.sessions=state.sessions.map(s=>replacements.get(s.id)||s);
    if(!persist()){state.sessions=previous;return false;}
    renderAll();
    return true;
  }});
  const fillDayButton=document.createElement("button");
  fillDayButton.type="button";
  fillDayButton.className="button button-secondary";
  fillDayButton.textContent="Riempi le sessioni del giorno";
  els.todayButton.after(fillDayButton);
  fillDayButton.addEventListener("click",()=>filler.openDay(els.filterDate.value));
  window.addEventListener("tempo:fill-day",event=>filler.openDay(event.detail?.date||els.filterDate.value));

  function validateCloudBackup(data) {
    if(!data||!Array.isArray(data.sessions)||!Array.isArray(data.tasks)||!Array.isArray(data.history))throw new Error("Backup Dropbox non valido.");
    const sessions=data.sessions.map(s=>migrateSession(normalizeSession(s),data.tasks.map(normalizeTask).filter(Boolean)));
    if(sessions.some(s=>!validSession(s))||new Set(sessions.map(s=>s.id)).size!==sessions.length||hasSessionOverlaps(sessions))throw new Error("Sessioni Dropbox non valide.");
    const tasks=data.tasks.map(normalizeTask);
    if(tasks.some(t=>!t)||new Set(tasks.map(t=>t.id)).size!==tasks.length)throw new Error("Attività Dropbox non valide.");
    if(data.history.some(h=>!validHistory(h)))throw new Error("Storico Dropbox non valido.");
    if(data.syncDeleted!==undefined){
      if(!data.syncDeleted||typeof data.syncDeleted!=="object")throw new Error("Registro delle eliminazioni non valido.");
      for(const key of ["tasks","sessions"]){
        if(!Array.isArray(data.syncDeleted[key])||data.syncDeleted[key].some(id=>typeof id!=="string"||!id))
          throw new Error("Registro delle eliminazioni non valido.");
      }
    }
    const syncDeleted=normalizeDeleted(data.syncDeleted);
    return {sessions,tasks,history:data.history,syncDeleted,defaults:{workMinutes:clampInt(data.defaults?.workMinutes,1,240,25),breakEnabled:data.defaults?.breakEnabled!==false},appearance:normalizeAppearance(data.appearance)};
  }
  async function applyCloudBackup(data) {
    const next=validateCloudBackup(data),old=state;
    state=next;
    try {localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
    catch(e){state=old;throw new Error("Salvataggio locale non riuscito: backup remoto non applicato.");}
    renderAll();
  }
  let cloudNoticeTimer=null;
  const cloudNotice=document.createElement("div");
  cloudNotice.id="tempo-cloud-indicator";
  cloudNotice.className="tempo-cloud-indicator hidden";
  cloudNotice.setAttribute("role","status");
  cloudNotice.setAttribute("aria-live","polite");
  cloudNotice.innerHTML='<span class="tempo-cloud-spinner" aria-hidden="true"></span><span class="tempo-cloud-message"></span>';
  document.body.appendChild(cloudNotice);
  function cloudStatus(message,info) {
    const target=$("dropbox-status");
    if(target)target.textContent=message;
    window.dispatchEvent(new CustomEvent("tempo:cloud-status",{detail:{message,...info}}));
    clearTimeout(cloudNoticeTimer);
    const phase=info.phase||"idle";
    const visible=info.busy||phase==="pending"||phase==="error"||Boolean(info.connected);
    cloudNotice.classList.toggle("hidden",!visible);
    cloudNotice.classList.toggle("is-busy",Boolean(info.busy));
    cloudNotice.classList.toggle("is-error",phase==="error");
    cloudNotice.querySelector(".tempo-cloud-message").textContent=message;
    if(visible&&!info.busy&&phase!=="pending"&&phase!=="error"){
      cloudNoticeTimer=setTimeout(()=>cloudNotice.classList.add("hidden"),5000);
    }
    const setup=$("dropbox-setup"),initial=$("dropbox-initial"),actions=$("dropbox-actions");
    if(setup)setup.classList.toggle("hidden",info.connected);
    if(initial)initial.classList.toggle("hidden",!info.connected||info.ready);
    if(actions)actions.classList.toggle("hidden",!info.ready);
    const recovery=$("dropbox-recovery");
    if(recovery)recovery.classList.toggle("hidden",!dropbox?.recovery());
  }
  async function resolveCloudConflicts(conflicts) {
    return new Promise(resolve=>{
      const dlg=document.createElement("dialog");
      dlg.className="session-dialog tempo-merge-dialog";
      dlg.setAttribute("aria-label","Risoluzione dei conflitti Dropbox");
      const heading=document.createElement("h2");
      heading.textContent="Risolvi i conflitti di sincronizzazione";
      const note=document.createElement("p");
      note.className="muted";
      note.textContent="Le modifiche compatibili vengono unite automaticamente. Per questi elementi scegli quale modifica conservare.";
      const form=document.createElement("form");
      form.addEventListener("submit",event=>{
        event.preventDefault();
        const decisions={};
        for(const [key,select] of controls) decisions[key]=select.value;
        finish(decisions);
      });
      const controls=new Map();
      for(const conflict of conflicts){
        const field=document.createElement("label");
        field.className="tempo-merge-choice";
        const title=document.createElement("strong");
        title.textContent=conflict.label;
        const example=document.createElement("small");
        example.textContent="Locale: "+conflict.localPreview+" | Dropbox: "+conflict.remotePreview;
        const select=document.createElement("select");
        select.required=true;
        select.setAttribute("aria-label",conflict.label);
        const blank=new Option("Scegli la versione da conservare","",true,true);
        blank.disabled=true;
        select.add(blank);
        for(const option of conflict.options)select.add(new Option(option.label,option.value));
        controls.set(conflict.key,select);
        field.append(title,example,select);
        form.append(field);
      }
      const buttons=document.createElement("div");
      buttons.className="dialog-actions";
      const cancel=document.createElement("button");
      cancel.type="button";cancel.className="button button-secondary";cancel.textContent="Annulla";
      cancel.addEventListener("click",()=>finish(null));
      const ok=document.createElement("button");
      ok.type="submit";ok.className="button button-primary";ok.textContent="Unisci e sincronizza";
      buttons.append(cancel,ok);
      form.append(buttons);
      dlg.append(heading,note,form);
      document.body.append(dlg);
      let settled=false;
      function finish(value){
        if(settled)return;
        settled=true;
        dlg.close();dlg.remove();resolve(value);
      }
      dlg.addEventListener("cancel",e=>{e.preventDefault();finish(null);});
      dlg.showModal();
    });
  }
  dropbox=createDropboxSync({getState:()=>state,applyRemote:applyCloudBackup,
    normalizeRemote:validateCloudBackup,resolveConflicts:resolveCloudConflicts,onStatus:cloudStatus});
  $("dropbox-connect").addEventListener("click",()=>dropbox.connect($("dropbox-key").value).catch(e=>showToast(e.message)));
  $("dropbox-initial-upload").addEventListener("click",()=>{if(confirm("Creare il primo backup Dropbox con i dati presenti in questo dispositivo? Se Dropbox contiene già un backup, l'operazione verrà bloccata."))dropbox.firstSync("upload").catch(e=>showToast(e.message));});
  $("dropbox-initial-download").addEventListener("click",()=>{if(confirm("Sostituire i dati locali con quelli di Dropbox? Esporta prima un backup manuale per sicurezza."))dropbox.firstSync("download").catch(e=>showToast(e.message));});
  function overwriteDropboxWithLocal(){
    if(!dropbox.info().connected)return;
    if(!confirm("ATTENZIONE: sovrascrivere il backup Dropbox con tutti i dati di QUESTO dispositivo? I dati presenti soltanto su Dropbox verranno sostituiti. Gli archivi non saranno uniti."))return;
    dropbox.forceUpload().catch(e=>showToast(e.message));
  }
  $("dropbox-initial-merge").addEventListener("click",()=>mergeCloudArchives());
  $("dropbox-initial-overwrite").addEventListener("click",overwriteDropboxWithLocal);
  $("dropbox-force-upload").addEventListener("click",overwriteDropboxWithLocal);
  $("dropbox-merge").addEventListener("click",()=>mergeCloudArchives());
  $("dropbox-recovery").addEventListener("click",()=>{
    const backup=dropbox.recovery();
    if(!backup){showToast("Nessuna copia di sicurezza disponibile.");return;}
    downloadFile(JSON.stringify(backup.data,null,2),"application/json",
      "tempvs-copia-precedente-"+localDateString(new Date(backup.savedAt))+".json");
    showToast("Copia di sicurezza scaricata.");
  });
  function mergeCloudArchives(){
    if(!confirm("Unire i dati locali con Dropbox? Le modifiche compatibili verranno conservate. In caso di conflitti potrai scegliere; verrà archiviata una copia locale di sicurezza."))return;
    dropbox.mergeNow().catch(e=>showToast(e.message));
  }
  $("dropbox-sync").addEventListener("click",()=>dropbox.sync().catch(e=>showToast(e.message)));
  $("dropbox-download").addEventListener("click",()=>{if(dropbox.info().dirty){showToast("Modifiche locali in sospeso: usa la risoluzione conflitti.");return;}if(confirm("Scaricare il backup remoto e sostituire i dati locali?"))dropbox.forceDownload().catch(e=>showToast(e.message));});
  $("dropbox-resolve").addEventListener("click",()=>{if(!dropbox.info().ready)return;if(!confirm("ATTENZIONE: sostituire le modifiche locali con Dropbox? Verrà prima scaricata una copia JSON locale di sicurezza."))return;exportBackup();dropbox.forceDownload(true).catch(e=>showToast(e.message));});
  $("dropbox-disconnect").addEventListener("click",()=>{if(confirm("Scollegare Dropbox da questo dispositivo? I dati locali rimangono invariati."))dropbox.disconnect();});
  window.addEventListener("online",()=>dropbox.sync().catch(()=>{}));
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")dropbox.sync().catch(()=>{});});
  window.addEventListener("focus",()=>dropbox.sync().catch(()=>{}));
  dropbox.init().catch(e=>cloudStatus(e.message,dropbox.info()));

  els.filterDate.value=localDateString();els.connectionStatus.textContent=navigator.onLine?"Pronta":"Offline";els.notificationButton.textContent=("Notification" in window&&Notification.permission==="granted")?"Notifiche attive":"Attiva notifiche";renderAll();setInterval(()=>renderTimer(),1000);setInterval(()=>{renderSessions();agenda?.tick();},15000);
  if("serviceWorker" in navigator&&(window.isSecureContext||location.protocol==="https:")){window.addEventListener("load",()=>{navigator.serviceWorker.addEventListener("controllerchange",()=>{if(!window.__tempoSwReloading){window.__tempoSwReloading=true;location.reload();}});navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).then(reg=>{swRegistration=reg;reg.update().catch(error=>console.warn("Aggiornamento PWA non disponibile:",error));els.connectionStatus.textContent=navigator.onLine?"Pronta · offline disponibile":"Offline";}).catch(error=>console.warn("Service worker non registrato:",error));});}
})();
