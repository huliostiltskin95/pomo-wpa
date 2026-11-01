import { localDateString, validSession, sessionBounds, escapeHtml, hasSessionOverlaps, timeToMinutes } from "./core/tempo-core.js";
import { TASK_AREAS, TASK_PRIORITIES, TASK_STATUSES, parseTaskTags, normalizeTask, estimatedMinutesFromHours,
  hoursFromMinutes, plannedFocusMinutes, elapsedScheduledFocusMinutes, getTaskAttention,
  taskTagAncestors, taskHasTag, createTaskSession } from "./core/tempo-tasks.js";

/**
 * PWA-only task manager. Tasks are separate from timed sessions; each scheduled
 * block references its task through taskId and reuses the existing Pomodoro timer.
 */
export function mountAgenda({ getState, persist, refresh, showToast, sendNotification }) {
  const $ = id => document.getElementById(id);
  const el = {
    list: $("agenda-list"), empty: $("agenda-empty"), summary: $("agenda-summary"), alerts: $("agenda-alerts"),
    newButton: $("new-task-button"), areaFilter: $("agenda-area-filter"),
    statusFilter: $("agenda-status-filter"), tagFilter: $("agenda-tag-filter"),
    search: $("agenda-search"), dueDate: $("task-due-date"), markdownPreview: $("task-markdown-preview"),
    bulkButton: $("bulk-task-button"), bulkDialog: $("bulk-dialog"), bulkForm: $("bulk-form"), bulkInput: $("bulk-input"), bulkPreview: $("bulk-preview"), bulkError: $("bulk-error"),
    tagsButton: $("manage-tags-button"), tagsDialog: $("tags-dialog"), tagsForm: $("tags-form"), tagsSource: $("tags-source"), tagsTarget: $("tags-target"), tagsError: $("tags-error"),
    dialog: $("task-dialog"), form: $("task-form"), dialogTitle: $("task-dialog-title"),
    id: $("task-id"), title: $("task-title"), area: $("task-area"), priority: $("task-priority"), status: $("task-status"),
    saveAndPlan: $("task-save-plan"),
    estimate: $("task-estimate"), tags: $("task-tags"), description: $("task-description"),
    error: $("task-error"), deleteButton: $("task-delete-button"),
    closeButton: $("task-close-button"), cancelButton: $("task-cancel-button"),
    planDialog: $("task-plan-dialog"), planForm: $("task-plan-form"), planTaskId: $("task-plan-id"),
    planTitle: $("task-plan-title"), planDate: $("task-plan-date"),
    planStart: $("task-plan-start"), planHours: $("task-plan-hours"),
    planWork: $("task-plan-work"), planBreaks: $("task-plan-breaks"),
    planPreview: $("task-plan-preview"), planError: $("task-plan-error"),
    planClose: $("task-plan-close"), planCancel: $("task-plan-cancel")
  };
  const priorityLabels = { alta: "Alta", media: "Media", bassa: "Bassa", nessuna: "Nessuna" };
  const statusLabels = { todo: "Da fare", in_progress: "In corso", done: "Completata" };
  const alertedEnds = new Set();
  let lastReminderSignature = "";
  const uuid = () => typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random().toString(36).slice(2);
  const tasks = () => getState().tasks;
  const findTask = id => tasks().find(task => task.id === id);
  const escape = value => escapeHtml(value);
  const format = value => hoursFromMinutes(value) + " h";
  const markdown = (value, interactive = false) => {
    // Escape user input first. Only generated checkbox controls become HTML.
    const checkboxes = [];
    let s = String(value || "").split("\n").map((line, lineIndex) => {
      const match = line.match(/^(\s*)[-*] \[([ xX])\] (.*)$/);
      if (!match) return escape(line);
      const checked = match[2].toLowerCase() === "x";
      const token = "TEMPOCHECKBOX" + lineIndex + "ENDTOKEN";
      checkboxes.push({ token, lineIndex, checked, label: escape(match[3]), depth: match[1].length });
      return token;
    }).join("\n");
    s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) =>
      '<a href="' + url.replace(/&amp;/g, "&").replace(/"/g, "%22") + '" target="_blank" rel="noopener noreferrer">' + label + '</a>');
    s = s.replace(/^### (.+)$/gm, '<h5>$1</h5>').replace(/^## (.+)$/gm, '<h4>$1</h4>').replace(/^# (.+)$/gm, '<h3>$1</h3>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/^[-*] (.+)$/gm, '• $1');
    s = s.replace(/\n/g, '<br>');
    for (const item of checkboxes) {
      const control = '<label class="tempo-md-check-row" style="margin-left:' + Math.min(48, item.depth * 8) + 'px"><input type="checkbox" data-md-line="' + item.lineIndex + '"' + (item.checked ? ' checked' : '') + (interactive ? '' : ' disabled') + '><span>' + item.label + '</span></label>';
      s = s.replace(item.token, control);
    }
    return s;
  };
  const recorded = (taskId, state) => (state.history || []).filter(entry => entry.taskId === taskId).reduce((a,e)=>a+e.minutes,0);
  const elapsed = (taskId, state, now) => recorded(taskId,state) +
    elapsedScheduledFocusMinutes(taskId,state.sessions.filter(s=>!(state.history||[]).some(h=>h.sessionId===s.id)),now);
  const getUpcoming = taskId => getState().sessions.filter(session => session.taskId === taskId &&
    sessionBounds(session).end > new Date());

  function saveMutation(action) {
    const state = getState();
    const previousTasks = state.tasks;
    const previousSessions = state.sessions;
    action(state);
    if (!persist()) {
      state.tasks = previousTasks;
      state.sessions = previousSessions;
      return false;
    }
    refresh();
    return true;
  }

  function render() {
    const state = getState();
    const now = new Date();
    const attentions = new Map(state.tasks.map(task => [task.id, getTaskAttention(task, state.sessions, now)]));
    lastReminderSignature = state.tasks.map(task => task.id + ":" + task.status + ":" + (attentions.get(task.id)?.kind || "scheduled")).join("|");
    const missed = [...attentions.values()].filter(info => info?.kind === "reschedule").length;
    const unplanned = [...attentions.values()].filter(info => info?.kind === "unplanned").length;
    el.alerts.replaceChildren();
    if (missed || unplanned) {
      const message = document.createElement("p");
      message.textContent = [missed ? `${missed} attività da riprogrammare` : "", unplanned ? `${unplanned} senza sessioni programmate` : ""].filter(Boolean).join(" · ") + ". Nessuna attività viene completata automaticamente.";
      const action = document.createElement("button");
      action.type = "button"; action.className = "button button-secondary";
      action.textContent = "Mostra attività da organizzare";
      action.addEventListener("click", () => { el.statusFilter.value = "attention"; render(); el.list.scrollIntoView({behavior:"smooth", block:"start"}); });
      el.alerts.append(message, action);
    }
    el.alerts.classList.toggle("hidden", !missed && !unplanned);
    const tagSet = new Set();
    for (const task of state.tasks) for (const tag of taskTagAncestors(task.tags)) tagSet.add(tag);
    const selectedTag = el.tagFilter.value;
    el.tagFilter.replaceChildren(new Option("Tutti i tag", ""));
    for (const tag of [...tagSet].sort((a, b) => a.localeCompare(b, "it"))) {
      el.tagFilter.add(new Option(tag.replaceAll("/", " › "), tag));
    }
    el.tagFilter.value = tagSet.has(selectedTag) ? selectedTag : "";

    const query = el.search.value.trim().toLocaleLowerCase("it");
    const filtered = state.tasks.filter(task =>
      (!el.areaFilter.value || task.area === el.areaFilter.value) &&
      (el.statusFilter.value === "all" ||
       (el.statusFilter.value === "open" && task.status !== "done") ||
       (el.statusFilter.value === "attention" && attentions.get(task.id)) ||
       el.statusFilter.value === task.status) &&
      taskHasTag(task, el.tagFilter.value) &&
      (!query || (task.title + " " + task.description + " " + task.tags.join(" ")).toLocaleLowerCase("it").includes(query))
    ).sort((a, b) => Number(a.status === "done") - Number(b.status === "done") ||
      Number(!attentions.get(a.id)) - Number(!attentions.get(b.id)) ||
      TASK_PRIORITIES.indexOf(a.priority) - TASK_PRIORITIES.indexOf(b.priority) ||
      a.title.localeCompare(b.title, "it"));

    const remaining = state.tasks.filter(task => task.status !== "done");
    const allMinutes = remaining.reduce((sum, task) => sum + task.estimateMinutes, 0);
    el.summary.textContent = state.tasks.length + " attività · " + remaining.length + " aperte · " +
      state.tasks.filter(task => task.status === "in_progress").length + " in corso · " + format(allMinutes) + " stimate";
    el.list.replaceChildren();
    el.empty.classList.toggle("hidden", filtered.length > 0);
    el.empty.querySelector("p").textContent = state.tasks.length
      ? "Nessuna attività corrisponde ai filtri selezionati."
      : "Aggiungi un'attività con una durata stimata e pianificala in agenda.";

    for (const task of filtered) {
      const planned = plannedFocusMinutes(task.id, state.sessions);
      const left = Math.max(0, task.estimateMinutes - planned);
      const completedMinutes = elapsed(task.id, state, now);
      const attention = attentions.get(task.id);
      const card = document.createElement("article");
      card.dataset.taskId = task.id;
      card.className = "task-item" + (task.status === "done" ? " task-completed" : "") + (attention ? " task-needs-attention" : "");
      const badgeTags = task.tags.map(tag => '<button type="button" class="tag-chip" data-tag="' +
        escape(tag) + '" title="Filtra per questo tag">' + escape(tag.replaceAll("/", " › ")) + "</button>").join("");
      card.innerHTML = '<div class="task-item-head"><div class="task-item-heading"><span class="task-area">' +
        escape(task.area) + '</span><span class="task-priority priority-' + escape(task.priority) + '">' +
        escape(priorityLabels[task.priority]) + '</span></div><span class="task-status">' +
        statusLabels[task.status] + '</span></div>' +
        '<h3 class="task-title">' + escape(task.title) + '</h3>' +
        (task.dueDate ? '<p class="task-due">Scadenza: '+escape(task.dueDate)+'</p>' : '') +
        (attention ? '<p class="task-reminder"><strong>' + attention.label + '.</strong> ' +
          (attention.kind === "reschedule" ? "Le sessioni previste sono terminate, ma l’attività è ancora aperta. Puoi aggiungere altro tempo o completarla manualmente." :
          "Non ci sono ancora sessioni previste. Puoi programmarne una quando vuoi.") + '</p>' : "") +
        (task.description ? '<div class="task-description markdown-preview">' + markdown(task.description, true) + '</div>' : "") +
        (badgeTags ? '<div class="task-tags">' + badgeTags + '</div>' : "") +
        '<div class="task-estimate-line"><strong>' + (task.estimateMinutes == null ? 'Nessuna stima' : format(task.estimateMinutes)) +
        '</strong> stimate <span aria-hidden="true">·</span> ' + format(planned) +
        ' pianificate <span aria-hidden="true">·</span> ' + format(completedMinutes) +
        ' in sessioni registrate <span aria-hidden="true">·</span> ' +
        (task.estimateMinutes == null ? 'stima libera' : planned > task.estimateMinutes ? format(planned - task.estimateMinutes) + ' oltre la stima' : format(left) + ' non ancora pianificate') + '</div>' +
        '<div class="task-progress" role="progressbar" aria-label="Tempo pianificato" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
        (task.estimateMinutes ? Math.min(100, Math.round(planned / task.estimateMinutes * 100)) : 0) + '"><span style="width:' +
        (task.estimateMinutes ? Math.min(100, planned / task.estimateMinutes * 100) : 0) + '%"></span></div>' +
        '<div class="task-actions"><button type="button" class="button button-secondary" data-task-edit="' + escape(task.id) + '">Modifica</button>' +
        (task.status === "done" ? "" : '<button type="button" class="button button-secondary" data-task-plan="' +
        escape(task.id) + '">' + (attention?.kind === "reschedule" ? "Riprogramma" : "Programma") +
        '</button><button type="button" class="button button-primary" data-task-now="' +
        escape(task.id) + '">Avvia ora</button>') +
        '<label class="task-status-control">Stato <select data-task-status="' + escape(task.id) +
        '" aria-label="Stato di ' + escape(task.title) + '">' +
        TASK_STATUSES.map(status => '<option value="' + status + '"' + (task.status === status ? ' selected' : '') + '>' +
        statusLabels[status] + '</option>').join('') + '</select></label></div>' +
        '<p class="task-planning-note">Tempo registrato in base ai blocchi trascorsi (non verifica l’attenzione effettiva). Le sessioni rimosse restano nello storico. Il completamento è manuale.</p>';
      el.list.appendChild(card);
    }
  }

  function openTask(id = "") {
    const task = id ? findTask(id) : null;
    el.form.reset();
    el.id.value = task?.id || "";
    el.dialogTitle.textContent = task ? "Modifica attività" : "Nuova attività";
    el.title.value = task?.title || "";
    el.area.value = task?.area || "Studio";
    el.priority.value = task?.priority || "media";
    el.status.value = task?.status || "todo";
    el.estimate.value = task?.estimateMinutes == null ? "" : String(task.estimateMinutes / 60);
    el.dueDate.value = task?.dueDate || "";
    el.tags.value = task?.tags.join(", ") || "";
    el.description.value = task?.description || "";
    el.markdownPreview.innerHTML = markdown(el.description.value);
    el.error.textContent = "";
    el.deleteButton.classList.toggle("hidden", !task);
    el.dialog.showModal();
    el.title.focus();
  }

  function saveTask(event) {
    event.preventDefault();
    try {
      const minutes = estimatedMinutesFromHours(el.estimate.value);
      if (Number.isNaN(minutes)) throw new Error("La durata deve essere in ore, con incrementi di 15 minuti (es. 1,5).");
      const oldTask = findTask(el.id.value);
      const task = normalizeTask({
        id: oldTask?.id || uuid(), title: el.title.value, area: el.area.value,
        priority: el.priority.value, estimateMinutes: minutes, dueDate: el.dueDate.value,
        tags: parseTaskTags(el.tags.value), description: el.description.value,
        status: el.status.value,
        completed: el.status.value === "done",
        createdAt: oldTask?.createdAt || new Date().toISOString()
      });
      if (!task) throw new Error("Controlla titolo, area, priorità, descrizione e durata.");
      const cancelScheduled = askCancelUpcomingOnCompletion(oldTask, task.status);
      if (!saveMutation(state => {
        state.tasks = oldTask ? state.tasks.map(item => item.id === task.id ? task : item) :
          [...state.tasks, task];
        if (cancelScheduled) state.sessions = state.sessions.filter(session =>
          session.taskId !== task.id || sessionBounds(session).end <= new Date());
        if (oldTask && oldTask.title !== task.title) {
          state.sessions = state.sessions.map(session =>
            session.taskId === task.id && session.title === oldTask.title
              ? { ...session, title: task.title } : session);
        }
      })) return;
      el.dialog.close();
      showToast(oldTask ? "Attività aggiornata." : "Attività aggiunta.");
      if (event.submitter?.id === "task-save-plan" && task.status !== "done") openPlan(task.id);
    } catch (error) {
      el.error.textContent = error.message;
    }
  }

  function askCancelUpcomingOnCompletion(oldTask, newStatus) {
    if (!oldTask || oldTask.status === "done" || newStatus !== "done") return false;
    const pending = getUpcoming(oldTask.id).length;
    if (!pending) return false;
    return window.confirm("Questa attività ha " + pending + " sessioni in corso o future. Vuoi eliminarle?\n" +
      "OK: elimina le sessioni non terminate. Annulla: conserva tutte le sessioni.\n" +
      "In entrambi i casi l'attività verrà segnata Completata.");
  }

  function setTaskStatus(id, status) {
    const task = findTask(id);
    if (!task || !TASK_STATUSES.includes(status)) return;
    if (task.status === status) return;
    const cancelScheduled = askCancelUpcomingOnCompletion(task, status);
    if (saveMutation(state => {
      state.tasks = state.tasks.map(item => item.id === id
        ? { ...item, status, completed: status === "done" } : item);
      if (cancelScheduled) state.sessions = state.sessions.filter(session =>
        session.taskId !== id || sessionBounds(session).end <= new Date());
    })) showToast("Stato impostato manualmente: " + statusLabels[status] + ".");
  }

  function deleteTask(id) {
    const task = findTask(id);
    if (!task) return;
    if (!confirm("Eliminare «" + task.title + "»? Le sessioni ancora attive o future saranno cancellate; quelle passate resteranno come sessioni indipendenti.")) return;
    if (saveMutation(state => {
      const now = new Date();
      state.tasks = state.tasks.filter(item => item.id !== id);
      state.sessions = state.sessions.flatMap(session => {
        if (session.taskId !== id) return [session];
        if (sessionBounds(session).end > now) return [];
        const { taskId, ...withoutTask } = session;
        return [withoutTask];
      });
    })) {
      el.dialog.close();
      showToast("Attività eliminata.");
    }
  }

  function defaultStart() {
    const now = new Date();
    now.setSeconds(0, 0);
    now.setMinutes(Math.ceil((now.getMinutes() + 1) / 15) * 15);
    return { date: localDateString(now), time: String(now.getHours()).padStart(2, "0") +
      ":" + String(now.getMinutes()).padStart(2, "0") };
  }

  function openPlan(id) {
    const task = findTask(id);
    if (!task || task.completed) return;
    const remaining = Math.max(15, (task.estimateMinutes ?? 60) - plannedFocusMinutes(id, getState().sessions));
    const start = defaultStart();
    el.planForm.reset();
    el.planTaskId.value = task.id;
    el.planTitle.textContent = "Programma · " + task.title;
    el.planDate.value = start.date;
    el.planStart.value = start.time;
    el.planHours.value = String(Math.min(120, remaining) / 60);
    el.planWork.value = String(getState().defaults.workMinutes);
    el.planBreaks.checked = getState().defaults.breakEnabled;
    el.planError.textContent = "";
    updatePreview();
    el.planDialog.showModal();
  }

  function readPlan() {
    const task = findTask(el.planTaskId.value);
    if (!task || task.completed) throw new Error("L'attività non è più disponibile.");
    const focusMinutes = estimatedMinutesFromHours(el.planHours.value);
    if (!Number.isFinite(focusMinutes)) throw new Error("Inserisci una durata in ore, a intervalli di 15 minuti.");
    const workMinutes = Number(el.planWork.value);
    return createTaskSession(task, { id: uuid(), date: el.planDate.value,
      start: el.planStart.value, focusMinutes, workMinutes, breakEnabled: el.planBreaks.checked });
  }

  function updatePreview() {
    try {
      const session = readPlan();
      if (!validSession(session)) throw new Error("Controlla data e ora di inizio.");
      const existing = getState().sessions.some(other =>
        other.date === session.date && sessionBounds(other).start < sessionBounds(session).end &&
        sessionBounds(other).end > sessionBounds(session).start);
      el.planPreview.textContent = "Termine previsto " + session.end + " · " +
        format(estimatedMinutesFromHours(el.planHours.value)) +
        " di concentrazione netta" + (session.breakEnabled ? ", pause comprese nell'orario." : ", senza pause.");
      el.planError.textContent = existing ? "Attenzione: l'intervallo si sovrappone a una sessione esistente." : "";
    } catch (error) {
      el.planPreview.textContent = "Modifica durata, data e ora per calcolare il termine.";
      el.planError.textContent = error.message;
    }
  }

  function addSlot(session) {
    if (!validSession(session)) throw new Error("Orari o durata non validi.");
    if (sessionBounds(session).start.getTime() < Date.now() - 60000) throw new Error("Non è possibile avviare automaticamente una sessione nel passato.");
    if (hasSessionOverlaps([...getState().sessions, session])) throw new Error("Intervallo sovrapposto a una sessione già programmata.");
    if (!saveMutation(state => { state.sessions = [...state.sessions, session]; })) return false;
    return true;
  }

  function savePlan(event) {
    event.preventDefault();
    try {
      const session = readPlan();
      if (!addSlot(session)) return;
      el.planDialog.close();
      showToast("Sessione programmata: si avvierà automaticamente all'orario scelto, con l'app aperta.");
    } catch (error) {
      el.planError.textContent = error.message;
    }
  }

  function startNow(id) {
    const task = findTask(id);
    if (!task || task.completed) return;
    const now = new Date();
    const start = String(now.getHours()).padStart(2, "0") + ":" +
      String(now.getMinutes()).padStart(2, "0");
    const remaining = Math.max(15, (task.estimateMinutes ?? getState().defaults.workMinutes) - plannedFocusMinutes(id, getState().sessions));
    const focusMinutes = Math.min(remaining, getState().defaults.workMinutes);
    try {
      const session = createTaskSession(task, { id: uuid(), date: localDateString(now),
        start, focusMinutes, workMinutes: getState().defaults.workMinutes,
        breakEnabled: getState().defaults.breakEnabled });
      if (!addSlot(session)) return;
      showToast("Focus avviato: " + task.title);
      document.querySelector(".timer-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      showToast(error.message);
    }
  }


  el.description.addEventListener("input", () => { el.markdownPreview.innerHTML = markdown(el.description.value); });
  const tagNames = () => [...new Set(tasks().flatMap(t => taskTagAncestors(t.tags)))].sort((a,b)=>a.localeCompare(b,"it"));
  function openTags() {
    const names=tagNames(); el.tagsSource.replaceChildren(...names.map(t=>new Option(t,t)));
    $("tags-suggestions").replaceChildren(...names.map(t=>new Option(t,t)));
    el.tagsError.textContent="";el.tagsTarget.value="";el.tagsDialog.showModal();
  }
  el.tagsButton.addEventListener("click",openTags);
  $("tags-close").addEventListener("click",()=>el.tagsDialog.close());
  $("tags-cancel").addEventListener("click",()=>el.tagsDialog.close());
  el.tagsForm.addEventListener("submit",event=>{
    event.preventDefault();
    try {
      const source=el.tagsSource.value, target=parseTaskTags(el.tagsTarget.value)[0];
      if (!source||!target) throw Error("Seleziona origine e destinazione.");
      if(target===source||target.startsWith(source+"/")) throw Error("Destinazione non valida: non può coincidere con il tag origine o essere un suo discendente.");
      if(!confirm("Aggiornare tutte le task che contengono "+source+"?"))return;
      if(saveMutation(state=>{state.tasks=state.tasks.map(t=>({...t,tags:parseTaskTags(t.tags.map(tag=>tag===source||tag.startsWith(source+"/")?target+tag.slice(source.length):tag))}));})){
        el.tagsDialog.close();showToast("Tag aggiornati in tutte le attività.");
      }
    }catch(e){el.tagsError.textContent=e.message;}
  });
  const due = value => {
    if(!value)return "";
    const base=new Date();base.setHours(12,0,0,0);
    if(value==="oggi")return localDateString(base);
    if(value==="domani"){base.setDate(base.getDate()+1);return localDateString(base);}
    if(/^\d{4}-\d{2}-\d{2}$/.test(value)){
      const d=new Date(value+"T12:00:00");
      if(!Number.isFinite(d.getTime())||localDateString(d)!==value)throw Error("Data non valida: "+value);
      return value;
    }
    throw Error("Scadenza non riconosciuta: "+value);
  };
  function parseBulk() {
    return el.bulkInput.value.split(/\r?\n/).map((line,index)=>{
      if(!line.trim())return null;
      const tags=[], values={dueDate:"",estimateMinutes:null,area:"Studio"};
      const title=line.replace(/(^|\s)([#*@^])([^\s]+)/g,(_,space,symbol,value)=>{
        if(symbol==="#")tags.push(value);
        if(symbol==="*")values.dueDate=due(value.toLowerCase());
        if(symbol==="^"){const area=TASK_AREAS.find(a=>a.toLowerCase()===value.toLowerCase());if(!area)throw Error("Riga "+(index+1)+": area sconosciuta: "+value);values.area=area;}
        if(symbol==="@"){
          const m=value.match(/^(?:(\d+(?:[.,]\d+)?)h)?(?:(\d+)m)?$/i);
          if(!m||(!m[1]&&!m[2]))throw Error("Riga "+(index+1)+": durata non valida: "+value);
          const minutes=Math.round(Number((m[1]||"0").replace(",","."))*60)+Number(m[2]||0);
          if(minutes<15||minutes%15||minutes>600000)throw Error("Riga "+(index+1)+": usa multipli di 15 minuti.");
          values.estimateMinutes=minutes;
        }
        return space;
      }).trim();
      const task=normalizeTask({...values,id:uuid(),title,tags:parseTaskTags(tags),priority:"media",description:"",status:"todo",createdAt:new Date().toISOString()});
      if(!task)throw Error("Riga "+(index+1)+": task non valida.");
      return task;
    }).filter(Boolean);
  }
  function suggestBulk(){
    const names=tagNames();
    const match=el.bulkInput.value.match(/(?:^|\s)#([^\s#]*)$/);
    const suggestions=match ? names.filter(t=>t.toLocaleLowerCase("it").startsWith(match[1].toLocaleLowerCase("it"))).slice(0,6) : [];
    const container=$("bulk-smart-suggestions");
    container.replaceChildren();
    for(const name of suggestions){
      const btn=document.createElement("button");
      btn.type="button";btn.className="tag-chip";btn.textContent="#"+name;
      btn.addEventListener("click",()=>{
        el.bulkInput.value=el.bulkInput.value.replace(/#([^\s#]*)$/,"#"+name);
        el.bulkInput.focus();previewBulk();
      });
      container.appendChild(btn);
    }
  }
  function previewBulk(){
    suggestBulk();
    try {const parsed=parseBulk();el.bulkPreview.textContent=parsed.length+" task riconosciute. "+parsed.slice(0,7).map(t=>t.title+" ["+t.area+"]"+(t.dueDate?" · "+t.dueDate:"")).join(" | ");el.bulkError.textContent="";}
    catch(e){el.bulkError.textContent=e.message;el.bulkPreview.textContent="Correggi la sintassi prima dell'importazione.";}
  }
  el.bulkButton.addEventListener("click",()=>{el.bulkInput.value="";previewBulk();el.bulkDialog.showModal();});
  el.bulkInput.addEventListener("input",previewBulk);
  $("bulk-close").addEventListener("click",()=>el.bulkDialog.close());
  $("bulk-cancel").addEventListener("click",()=>el.bulkDialog.close());
  el.bulkForm.addEventListener("submit",event=>{
    event.preventDefault();
    try{const parsed=parseBulk();if(!parsed.length)throw Error("Inserisci almeno una task.");
      if(saveMutation(state=>{state.tasks=[...state.tasks,...parsed];})){el.bulkDialog.close();showToast(parsed.length+" task importate.");}
    }catch(e){el.bulkError.textContent=e.message;}
  });
  el.newButton.addEventListener("click", () => openTask());
  el.form.addEventListener("submit", saveTask);
  el.deleteButton.addEventListener("click", () => deleteTask(el.id.value));
  el.closeButton.addEventListener("click", () => el.dialog.close());
  el.cancelButton.addEventListener("click", () => el.dialog.close());
  el.planForm.addEventListener("submit", savePlan);
  el.planClose.addEventListener("click", () => el.planDialog.close());
  el.planCancel.addEventListener("click", () => el.planDialog.close());
  for (const input of [el.planDate, el.planStart, el.planHours, el.planWork, el.planBreaks]) {
    input.addEventListener("input", updatePreview);
    input.addEventListener("change", updatePreview);
  }
  for (const input of [el.areaFilter, el.statusFilter, el.tagFilter]) input.addEventListener("change", render);
  el.search.addEventListener("input", render);
  el.list.addEventListener("change", event => {
    const checkbox = event.target.closest('input[type="checkbox"][data-md-line]');
    if (checkbox) {
      const card = checkbox.closest(".task-item");
      const index = Number(checkbox.dataset.mdLine);
      const id = card?.dataset.taskId;
      const task = findTask(id);
      const lines = task?.description.split("\n");
      const match = lines?.[index]?.match(/^(\s*[-*] \[)[ xX](\] .*)$/);
      if (!match) { checkbox.checked = !checkbox.checked; return; }
      lines[index] = match[1] + (checkbox.checked ? "x" : " ") + match[2];
      const state = getState(), oldTasks = state.tasks;
      state.tasks = state.tasks.map(item => item.id === id ? {...item, description:lines.join("\n")} : item);
      if (!persist()) { state.tasks = oldTasks; checkbox.checked = !checkbox.checked; return; }
      showToast("Checklist aggiornata.");
      return;
    }

    const select = event.target.closest("select[data-task-status]");
    if (select) setTaskStatus(select.dataset.taskStatus, select.value);
  });
  el.list.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.taskEdit) openTask(button.dataset.taskEdit);
    else if (button.dataset.taskPlan) openPlan(button.dataset.taskPlan);
    else if (button.dataset.taskNow) startNow(button.dataset.taskNow);
    else if (button.dataset.tag) { el.tagFilter.value = button.dataset.tag; render(); }
  });
  function tick() {
    const now = new Date();
    if (typeof sendNotification === "function") {
      for (const task of tasks()) {
        const reminder = getTaskAttention(task, getState().sessions, now);
        if (reminder?.kind !== "reschedule" || !reminder.lastEnd) continue;
        const elapsed = now - reminder.lastEnd;
        const key = task.id + ":" + reminder.lastEnd.getTime();
        if (elapsed >= 0 && elapsed < 30000 && !alertedEnds.has(key)) {
          alertedEnds.add(key);
          void sendNotification("Tempo · attività ancora aperta", task.title + " · Programma un altro focus oppure segnala manualmente il completamento.");
        }
      }
    }
    const currentSignature = tasks().map(task => task.id + ":" + task.status + ":" +
      (getTaskAttention(task, getState().sessions, now)?.kind || "scheduled")).join("|");
    if (currentSignature !== lastReminderSignature) render();
  }
  render();
  return { render, tick };
}
