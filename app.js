import { TempoAmbientAudio } from "./core/tempo-audio.js";
import { mountAgenda } from "./agenda.js";
import { createDropboxSync } from "./core/tempo-dropbox.js";
import { normalizeTask, focusMinutesInSession, sessionTaskIds, sessionArea, withSessionTasks } from "./core/tempo-tasks.js";
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
  let agenda = null;
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
            defaults: {
              workMinutes: clampInt(parsed.defaults?.workMinutes, 1, 240, 25),
              breakEnabled: parsed.defaults?.breakEnabled !== undefined ? Boolean(parsed.defaults.breakEnabled) : true
            }
          };
        }
      }
    } catch (error) { console.warn("Impossibile leggere i dati locali.", error); }
    return { sessions: [], tasks: [], history: [], defaults: { ...DEFAULTS } };
  }
  function migrateSession(s,tasks){const area=sessionArea(s,tasks);return {...withSessionTasks(s,sessionTaskIds(s)),area,title:area};}
  function taskPicker(ids=[]){const area=els.sessionTitle.value;document.getElementById("session-task-picker").innerHTML=state.tasks.filter(t=>t.area===area).map(t=>'<label class="tempo-session-task"><input type="checkbox" value="'+escapeHtml(t.id)+'" '+(ids.includes(t.id)?'checked':'')+'><span>'+escapeHtml(t.title)+'</span></label>').join("")||"Nessuna task disponibile nell’area.";}
  function checklist(s){return '<div class="tempo-session-tasks">'+state.tasks.filter(t=>sessionTaskIds(s).includes(t.id)).map(t=>'<label class="tempo-session-task"><input type="checkbox" data-check-task="'+escapeHtml(t.id)+'" '+(t.status==="done"?"checked":"")+'><span>'+escapeHtml(t.title)+'</span></label>').join("")+'</div>';}
  function validHistory(h){return h && typeof h.sessionId==="string" && typeof h.minutes==="number" && Number.isFinite(h.minutes) && h.minutes>=0 && typeof h.taskId==="string" && typeof h.date==="string";}
  function archivePast(session){
    if(!session || sessionBounds(session).end > new Date()) return;
    if((state.history||[]).some(h=>h.sessionId===session.id))return;
    state.history = [...(state.history||[]), {sessionId:session.id,taskId:session.taskId||"",date:session.date,minutes:focusMinutesInSession(session),title:session.title}];
  }
  function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));dropbox?.changed();return true;}catch(error){showToast("Non è stato possibile salvare i dati nel browser.");return false;}}
  function getActiveSession(now=new Date()){return findActiveSession(state.sessions,now);}
  function getNextSession(now=new Date()){return findNextSession(state.sessions,now);}
  function showToast(message){els.toast.textContent=message;els.toast.classList.add("show");clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>els.toast.classList.remove("show"),3200);}
  async function sendNotification(title,body){if(!("Notification" in window)||Notification.permission!=="granted")return;try{if(swRegistration)await swRegistration.showNotification(title,{body,icon:"./icon.svg",tag:"tempo-"+Date.now(),renotify:false});else new Notification(title,{body,icon:"./icon.svg"});}catch(error){console.warn("Notifica non disponibile:",error);}}
  function notifyPhaseChange(session,phase){const key=`${session.id}:${phase.kind}:${phase.start.getTime()}`;if(key===lastPhaseKey)return;const wasSet=Boolean(lastPhaseKey);lastPhaseKey=key;if(wasSet){const title=phase.kind==="work"?"Concentrazione":"Pausa";const body=phase.kind==="work"?`Riprendi: ${session.title}`:`È il momento di una pausa · ${session.title}`;showToast(body);sendNotification(title,body);}}
  function renderTimer(now=new Date()){
    syncFocusAudio(now);
    const active=getActiveSession(now);
    if(active){if(lastActiveSessionId!==active.id){if(lastActiveSessionId)sendNotification("Sessione terminata",`Hai concluso: ${lastActiveSessionTitle}`);const sessionStart=sessionBounds(active).start;if(now>=sessionStart&&now-sessionStart<60000)sendNotification("Sessione iniziata",`È il momento di concentrarti: ${active.title}`);lastActiveSessionId=active.id;lastActiveSessionTitle=active.title;}const phase=getPhase(active,now);els.timerMode.textContent=phase.kind==="work"?"SESSIONE IN CORSO":"PAUSA IN CORSO";els.timerHeading.textContent=active.title;els.phasePill.textContent=phase.label;els.phasePill.className=`phase-pill ${phase.kind}`;els.timerDisplay.textContent=mmss(phase.remaining);els.timerCaption.textContent=phase.kind==="work"?`Concentrazione fino alle ${formatTime(phase.end)}`:`La pausa termina alle ${formatTime(phase.end)}`;els.timerProgress.style.width=`${phase.progress}%`;els.timerProgress.style.background=phase.kind==="work"?"var(--accent)":"var(--green)";els.timerSessionLabel.textContent=`${active.start}–${active.end} · ${active.title}`;els.timerEndLabel.textContent=`Fine sessione ${formatTime(phase.sessionEnd)}`;notifyPhaseChange(active,phase);document.title=`${mmss(phase.remaining)} · ${phase.label} — Tempo`;renderFocus(phase,active);return;}
    lastPhaseKey="";if(lastActiveSessionId){sendNotification("Sessione terminata",`Hai concluso: ${lastActiveSessionTitle}`);lastActiveSessionId=null;lastActiveSessionTitle="";}const next=getNextSession(now);els.phasePill.textContent=next?"In programma":"In attesa";els.phasePill.className="phase-pill neutral";els.timerProgress.style.width="0%";els.timerProgress.style.background="var(--accent)";els.timerSessionLabel.textContent=next?next.title:"Nessuna sessione in corso";
    if(next){const start=sessionBounds(next).start;els.timerMode.textContent="PROSSIMA SESSIONE";els.timerHeading.textContent=next.title;els.timerDisplay.textContent="—";els.timerCaption.textContent=`Inizio previsto alle ${formatTime(start)}`;els.timerEndLabel.textContent=`${next.workMinutes} min lavoro${next.breakEnabled?` · ${pauseMinutes(next.workMinutes)} min pausa`:" · senza pause"}`;document.title="Prossima sessione — Tempo";renderFocus(null,next);}
    else{els.timerMode.textContent="NESSUNA SESSIONE ATTIVA";els.timerHeading.textContent="Pronto quando vuoi";els.timerDisplay.textContent=`${String(state.defaults.workMinutes).padStart(2,"0")}:00`;els.timerCaption.textContent="La prossima sessione apparirà qui.";els.timerEndLabel.textContent="—";document.title="Tempo — Pomodoro";renderFocus(null,null);}
  }
  function renderFocus(phase,session){if(!phase){els.focusLabel.textContent=session?"PROSSIMA SESSIONE":"TEMPO PER TE";els.focusTitle.textContent=session?session.title:"Pronto quando vuoi";els.focusDisplay.textContent="—";els.focusCaption.textContent=session?`Inizio alle ${session.start} · ${session.workMinutes} min di concentrazione`:"La prossima sessione apparirà qui.";return;}els.focusLabel.textContent=phase.label.toUpperCase();els.focusTitle.textContent=session.title;els.focusDisplay.textContent=mmss(phase.remaining);els.focusCaption.textContent=phase.kind==="work"?`Concentrazione fino alle ${formatTime(phase.end)}`:`Pausa fino alle ${formatTime(phase.end)}`;}
  function renderSessions(){const date=els.filterDate.value,sessions=state.sessions.filter(s=>s.date===date).sort((a,b)=>a.start.localeCompare(b.start));els.sessionsList.innerHTML="";els.emptyState.classList.toggle("hidden",sessions.length>0);els.sessionsList.classList.toggle("hidden",sessions.length===0);sessions.forEach(s=>{const status=getSessionStatus(s),label=status==="active"?"In corso":status==="upcoming"?"In programma":"Terminata",article=document.createElement("article");article.className="session-item";article.innerHTML=`<div class="session-time">${escapeHtml(s.start)}–${escapeHtml(s.end)}<span>${escapeHtml(formatDate(s.date))}</span></div><div><p class="session-name">${escapeHtml(s.title)}</p><p class="session-meta">${s.workMinutes} min concentrazione${s.breakEnabled?` · ${pauseMinutes(s.workMinutes)} min pausa (5:1)`:" · senza pause"}</p>${checklist(s)}<span class="session-status ${status==="active"?"active":""}">${label}</span></div><div class="session-actions"><button class="small-button" type="button" data-edit="${escapeHtml(s.id)}" aria-label="Modifica ${escapeHtml(s.title)}" title="Modifica">✎</button><button class="small-button" type="button" data-delete="${escapeHtml(s.id)}" aria-label="Elimina ${escapeHtml(s.title)}" title="Elimina">×</button></div>`;els.sessionsList.appendChild(article);});}
  function renderAll(){renderTimer();renderSessions();agenda?.render();els.defaultWork.value=state.defaults.workMinutes;els.defaultBreakEnabled.checked=state.defaults.breakEnabled;}
  function updateBreakPreview(){const work=clampInt(els.sessionWork.value,1,240,25);els.breakPreview.textContent=els.sessionBreakEnabled.checked?`Con ${work} minuti di concentrazione, la pausa sarà di ${pauseMinutes(work)} ${pauseMinutes(work)===1?"minuto":"minuti"}.`:"Le pause sono disattivate: la sessione sarà un unico intervallo di concentrazione.";}
  function updatePlannedSummary(){const date=els.sessionDate.value,id=els.sessionId.value,items=state.sessions.filter(s=>s.date===date&&s.id!==id).sort((a,b)=>a.start.localeCompare(b.start));els.plannedSummaryList.innerHTML=items.length?items.map(s=>`<div class="planned-row"><span>${escapeHtml(s.start)}–${escapeHtml(s.end)}</span><span>${escapeHtml(s.title)}</span></div>`).join("") : "Nessun'altra sessione per questa data.";}
  function openNewDialog(){els.sessionForm.reset();els.sessionId.value="";els.dialogTitle.textContent="Nuova sessione";els.sessionTitle.value="Studio";taskPicker();els.sessionDate.value=els.filterDate.value||localDateString();els.sessionStart.value="09:00";els.sessionEnd.value="11:00";els.sessionWork.value=state.defaults.workMinutes;els.sessionBreakEnabled.checked=state.defaults.breakEnabled;els.formError.textContent="";els.deleteButton.classList.add("hidden");updateBreakPreview();updatePlannedSummary();els.dialog.showModal();els.sessionTitle.focus();}
  function openEditDialog(id){const s=state.sessions.find(x=>x.id===id);if(!s)return;els.sessionId.value=s.id;els.dialogTitle.textContent="Modifica sessione";els.sessionTitle.value=sessionArea(s,state.tasks);taskPicker(sessionTaskIds(s));els.sessionDate.value=s.date;els.sessionStart.value=s.start;els.sessionEnd.value=s.end;els.sessionWork.value=s.workMinutes;els.sessionBreakEnabled.checked=s.breakEnabled;els.formError.textContent="";els.deleteButton.classList.remove("hidden");updateBreakPreview();updatePlannedSummary();els.dialog.showModal();}
  function saveSession(event){
    event.preventDefault();
    const existingId=els.sessionId.value;
    const existingSession=state.sessions.find(s=>s.id===existingId);
    const session={id:existingId||(crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`),title:els.sessionTitle.value.trim(),area:els.sessionTitle.value.trim(),taskIds:[...document.querySelectorAll("#session-task-picker input:checked")].map(x=>x.value),date:els.sessionDate.value,start:els.sessionStart.value,end:els.sessionEnd.value,workMinutes:Number(els.sessionWork.value),breakEnabled:els.sessionBreakEnabled.checked};
    if(!session.title){els.formError.textContent="Inserisci un nome per la sessione.";return;}
    if(!validSession(session)){els.formError.textContent="Controlla gli orari e la durata della sessione.";return;}
    const {start,end}=sessionBounds(session);
    const overlaps=state.sessions.some(s=>{if(s.id===session.id)return false;const bounds=sessionBounds(s);return start<bounds.end&&end>bounds.start;});
    if(overlaps){els.formError.textContent="Questa sessione si sovrappone a un'altra sessione dello stesso giorno.";return;}
    const previous=state.sessions, previousHistory=state.history;
    if(existingSession)archivePast(existingSession);
    state.sessions=existingId?state.sessions.map(s=>s.id===existingId?session:s):[...state.sessions,session];
    if(!persist()){state.sessions=previous;state.history=previousHistory;return;}
    els.filterDate.value=session.date;els.dialog.close();renderAll();showToast(existingId?"Sessione aggiornata.":"Sessione aggiunta all'agenda.");
  }
  function deleteSession(id){
    const session=state.sessions.find(item=>item.id===id);
    if(!session||!window.confirm(`Eliminare la sessione “${session.title}”?`))return;
    const previous=state.sessions, previousHistory=state.history;
    archivePast(session);
    state.sessions=state.sessions.filter(item=>item.id!==id);
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
  function exportBackup(){downloadFile(JSON.stringify({app:"Tempo Pomodoro",version:4,exportedAt:new Date().toISOString(),defaults:state.defaults,sessions:state.sessions,tasks:state.tasks,history:state.history || []},null,2),"application/json",`tempo-backup-${localDateString()}.json`);showToast("Backup esportato.");}
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
      state = { sessions: mergedSessions, tasks: mergedTasks, history: mergedHistory, defaults: replace ? defaults : state.defaults };
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
  function exportIcs(){if(!state.sessions.length){showToast("Non ci sono sessioni da esportare.");return;}const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Tempo Pomodoro//IT","CALSCALE:GREGORIAN","METHOD:PUBLISH","X-WR-CALNAME:Tempo - Sessioni di concentrazione"];state.sessions.slice().sort((a,b)=>`${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`)).forEach(s=>{const bounds=sessionBounds(s),uid=`${s.id}@tempo-pomodoro`,desc=`Concentrazione: ${s.workMinutes} min. ${s.breakEnabled?`Pause automatiche: ${pauseMinutes(s.workMinutes)} min (rapporto 5:1).`:"Pause disattivate."}`;lines.push("BEGIN:VEVENT",`UID:${icsEscape(uid)}`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"")}`,`DTSTART:${icsDate(bounds.start)}`,`DTEND:${icsDate(bounds.end)}`,`SUMMARY:${icsEscape("Concentrazione: "+s.title)}`,`DESCRIPTION:${icsEscape(desc)}`,"END:VEVENT");});lines.push("END:VCALENDAR");downloadFile(lines.join("\r\n"),"text/calendar;charset=utf-8",`tempo-sessioni-${localDateString()}.ics`);showToast("Calendario esportato in formato iCalendar.");}

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

  els.newSessionButton.addEventListener("click",openNewDialog);els.emptyAddButton.addEventListener("click",openNewDialog);els.sessionForm.addEventListener("submit",saveSession);els.closeDialog.addEventListener("click",()=>els.dialog.close());els.cancelDialog.addEventListener("click",()=>els.dialog.close());els.deleteButton.addEventListener("click",()=>deleteSession(els.sessionId.value));els.filterDate.addEventListener("change",renderSessions);els.todayButton.addEventListener("click",()=>{els.filterDate.value=localDateString();renderSessions();});els.sessionTitle.addEventListener("change",()=>taskPicker());els.sessionsList.addEventListener("change",event=>{if(!event.target.matches("[data-check-task]"))return;const id=event.target.dataset.checkTask, old=state.tasks;state.tasks=old.map(t=>t.id===id?{...t,status:event.target.checked?"done":"todo",completed:event.target.checked}:t);if(!persist())state.tasks=old;renderAll();});els.sessionsList.addEventListener("click",event=>{const edit=event.target.closest("[data-edit]"),del=event.target.closest("[data-delete]");if(edit)openEditDialog(edit.dataset.edit);if(del)deleteSession(del.dataset.delete);});els.defaultsForm.addEventListener("submit",saveDefaults);els.exportButton.addEventListener("click",exportBackup);els.importInput.addEventListener("change",()=>importBackup(els.importInput.files[0]));els.sessionWork.addEventListener("input",updateBreakPreview);els.sessionBreakEnabled.addEventListener("change",updateBreakPreview);els.sessionDate.addEventListener("change",updatePlannedSummary);els.focusButton.addEventListener("click",enterFocus);els.exitFocusButton.addEventListener("click",exitFocus);els.focusFullscreenButton.addEventListener("click",async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch{showToast("Schermo intero non disponibile in questo browser.");}});els.notificationButton.addEventListener("click",enableNotifications);els.soundToggle.addEventListener("click",toggleSound);els.focusSoundButton.addEventListener("click",toggleSound);els.soundSelect.addEventListener("change",()=>{if(soundPlaying){const kind=els.soundSelect.value;if(kind==="off"){stopSound();return;}const audible=getAmbientFocusMode(state.sessions)==="focus";void ambient.start(kind,Number(els.soundVolume.value)/100,audible).then(ok=>{if(!ok)showToast("Impossibile cambiare suono.");syncFocusAudio();});}});els.soundVolume.addEventListener("input",updateVolume);els.exportIcsButton.addEventListener("click",exportIcs);
  window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();deferredInstallPrompt=event;els.installButton.classList.remove("hidden");});els.installButton.addEventListener("click",async()=>{if(!deferredInstallPrompt){showToast("Per installare, usa il menu del browser e scegli ‘Installa app’ o ‘Aggiungi alla schermata Home’. ");return;}const prompt=deferredInstallPrompt;deferredInstallPrompt=null;await prompt.prompt();const choice=await prompt.userChoice;if(choice?.outcome==="accepted")els.installButton.classList.add("hidden");});window.addEventListener("online",()=>{els.connectionStatus.textContent="Online";});window.addEventListener("offline",()=>{els.connectionStatus.textContent="Offline";});document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")renderAll();});window.addEventListener("focus",renderAll);window.addEventListener("pagehide",()=>ambient.stop(0));document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!els.focusOverlay.classList.contains("hidden"))exitFocus();});
  agenda = mountAgenda({ getState:()=>state, persist, refresh:renderAll, showToast, sendNotification });

  function validateCloudBackup(data) {
    if(!data||!Array.isArray(data.sessions)||!Array.isArray(data.tasks)||!Array.isArray(data.history))throw new Error("Backup Dropbox non valido.");
    const sessions=data.sessions.map(s=>migrateSession(normalizeSession(s),data.tasks.map(normalizeTask).filter(Boolean)));
    if(sessions.some(s=>!validSession(s))||new Set(sessions.map(s=>s.id)).size!==sessions.length||hasSessionOverlaps(sessions))throw new Error("Sessioni Dropbox non valide.");
    const tasks=data.tasks.map(normalizeTask);
    if(tasks.some(t=>!t)||new Set(tasks.map(t=>t.id)).size!==tasks.length)throw new Error("Attività Dropbox non valide.");
    if(data.history.some(h=>!validHistory(h)))throw new Error("Storico Dropbox non valido.");
    return {sessions,tasks,history:data.history,defaults:{workMinutes:clampInt(data.defaults?.workMinutes,1,240,25),breakEnabled:data.defaults?.breakEnabled!==false}};
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
  }
  dropbox=createDropboxSync({getState:()=>state,applyRemote:applyCloudBackup,onStatus:cloudStatus});
  $("dropbox-connect").addEventListener("click",()=>dropbox.connect($("dropbox-key").value).catch(e=>showToast(e.message)));
  $("dropbox-initial-upload").addEventListener("click",()=>{if(confirm("Creare il primo backup Dropbox con i dati presenti in questo dispositivo? Se Dropbox contiene già un backup, l'operazione verrà bloccata."))dropbox.firstSync("upload").catch(e=>showToast(e.message));});
  $("dropbox-initial-download").addEventListener("click",()=>{if(confirm("Sostituire i dati locali con quelli di Dropbox? Esporta prima un backup manuale per sicurezza."))dropbox.firstSync("download").catch(e=>showToast(e.message));});
  $("dropbox-sync").addEventListener("click",()=>dropbox.sync().catch(e=>showToast(e.message)));
  $("dropbox-download").addEventListener("click",()=>{if(dropbox.info().dirty){showToast("Modifiche locali in sospeso: usa la risoluzione conflitti.");return;}if(confirm("Scaricare il backup remoto e sostituire i dati locali?"))dropbox.forceDownload().catch(e=>showToast(e.message));});
  $("dropbox-resolve").addEventListener("click",()=>{if(!dropbox.info().ready)return;if(!confirm("ATTENZIONE: sostituire le modifiche locali con Dropbox? Verrà prima scaricata una copia JSON locale di sicurezza."))return;exportBackup();dropbox.forceDownload(true).catch(e=>showToast(e.message));});
  $("dropbox-disconnect").addEventListener("click",()=>{if(confirm("Scollegare Dropbox da questo dispositivo? I dati locali rimangono invariati."))dropbox.disconnect();});
  window.addEventListener("online",()=>dropbox.sync().catch(()=>{}));
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")dropbox.sync().catch(()=>{});});
  window.addEventListener("focus",()=>dropbox.sync().catch(()=>{}));
  dropbox.init().catch(e=>cloudStatus(e.message,dropbox.info()));

  els.filterDate.value=localDateString();els.connectionStatus.textContent=navigator.onLine?"Pronta":"Offline";els.notificationButton.textContent=("Notification" in window&&Notification.permission==="granted")?"Notifiche attive":"Attiva notifiche";renderAll();setInterval(()=>renderTimer(),1000);setInterval(()=>{renderSessions();agenda?.tick();},15000);
  if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost")){window.addEventListener("load",()=>{navigator.serviceWorker.addEventListener("controllerchange",()=>{if(!window.__tempoSwReloading){window.__tempoSwReloading=true;location.reload();}});navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).then(reg=>{swRegistration=reg;reg.update().catch(error=>console.warn("Aggiornamento PWA non disponibile:",error));els.connectionStatus.textContent=navigator.onLine?"Pronta · offline disponibile":"Offline";}).catch(error=>console.warn("Service worker non registrato:",error));});}
})();
