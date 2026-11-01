import { localDateString, validSession, sessionBounds, escapeHtml, hasSessionOverlaps, timeToMinutes } from "./core/tempo-core.js";
import { TASK_AREAS, TASK_PRIORITIES, parseTaskTags, normalizeTask, estimatedMinutesFromHours,
  hoursFromMinutes, plannedFocusMinutes, taskTagAncestors, taskHasTag, createTaskSession } from "./core/tempo-tasks.js";

/**
 * PWA-only task manager. Tasks are separate from timed sessions; each scheduled
 * block references its task through taskId and reuses the existing Pomodoro timer.
 */
export function mountAgenda({ getState, persist, refresh, showToast }) {
  const $ = id => document.getElementById(id);
  const el = {
    list: $("agenda-list"), empty: $("agenda-empty"), summary: $("agenda-summary"),
    newButton: $("new-task-button"), areaFilter: $("agenda-area-filter"),
    statusFilter: $("agenda-status-filter"), tagFilter: $("agenda-tag-filter"),
    search: $("agenda-search"),
    dialog: $("task-dialog"), form: $("task-form"), dialogTitle: $("task-dialog-title"),
    id: $("task-id"), title: $("task-title"), area: $("task-area"), priority: $("task-priority"),
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
  const uuid = () => typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random().toString(36).slice(2);
  const tasks = () => getState().tasks;
  const findTask = id => tasks().find(task => task.id === id);
  const escape = value => escapeHtml(value);
  const format = value => hoursFromMinutes(value) + " h";
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
      (el.statusFilter.value === "all" || (el.statusFilter.value === "done") === task.completed) &&
      taskHasTag(task, el.tagFilter.value) &&
      (!query || (task.title + " " + task.description + " " + task.tags.join(" ")).toLocaleLowerCase("it").includes(query))
    ).sort((a, b) => Number(a.completed) - Number(b.completed) ||
      TASK_PRIORITIES.indexOf(a.priority) - TASK_PRIORITIES.indexOf(b.priority) ||
      a.title.localeCompare(b.title, "it"));

    const remaining = state.tasks.filter(task => !task.completed);
    const allMinutes = remaining.reduce((sum, task) => sum + task.estimateMinutes, 0);
    el.summary.textContent = state.tasks.length + " attività · " + remaining.length + " da completare · " + format(allMinutes) + " stimate";
    el.list.replaceChildren();
    el.empty.classList.toggle("hidden", filtered.length > 0);
    el.empty.querySelector("p").textContent = state.tasks.length
      ? "Nessuna attività corrisponde ai filtri selezionati."
      : "Aggiungi un'attività con una durata stimata e pianificala in agenda.";

    for (const task of filtered) {
      const planned = plannedFocusMinutes(task.id, state.sessions);
      const left = Math.max(0, task.estimateMinutes - planned);
      const card = document.createElement("article");
      card.className = "task-item" + (task.completed ? " task-completed" : "");
      const badgeTags = task.tags.map(tag => '<button type="button" class="tag-chip" data-tag="' +
        escape(tag) + '" title="Filtra per questo tag">' + escape(tag.replaceAll("/", " › ")) + "</button>").join("");
      card.innerHTML = '<div class="task-item-head"><div class="task-item-heading"><span class="task-area">' +
        escape(task.area) + '</span><span class="task-priority priority-' + escape(task.priority) + '">' +
        escape(priorityLabels[task.priority]) + '</span></div><span class="task-status">' +
        (task.completed ? "Completata" : "Da fare") + '</span></div>' +
        '<h3 class="task-title">' + escape(task.title) + '</h3>' +
        (task.description ? '<p class="task-description">' + escape(task.description) + '</p>' : "") +
        (badgeTags ? '<div class="task-tags">' + badgeTags + '</div>' : "") +
        '<div class="task-estimate-line"><strong>' + format(task.estimateMinutes) +
        '</strong> stimate <span aria-hidden="true">·</span> ' + format(planned) +
        ' pianificate <span aria-hidden="true">·</span> ' + format(left) + ' da pianificare</div>' +
        '<div class="task-progress" role="progressbar" aria-label="Tempo pianificato" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
        Math.min(100, Math.round(planned / task.estimateMinutes * 100)) + '"><span style="width:' +
        Math.min(100, planned / task.estimateMinutes * 100) + '%"></span></div>' +
        '<div class="task-actions"><button type="button" class="button button-secondary" data-task-edit="' + escape(task.id) + '">Modifica</button>' +
        (task.completed ? "" : '<button type="button" class="button button-secondary" data-task-plan="' +
        escape(task.id) + '">Programma</button><button type="button" class="button button-primary" data-task-now="' +
        escape(task.id) + '">Avvia ora</button>') +
        '<button type="button" class="text-button" data-task-complete="' + escape(task.id) + '">' +
        (task.completed ? "Riapri" : "Completa") + '</button></div>';
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
    el.estimate.value = task ? String(task.estimateMinutes / 60) : "1";
    el.tags.value = task?.tags.join(", ") || "";
    el.description.value = task?.description || "";
    el.error.textContent = "";
    el.deleteButton.classList.toggle("hidden", !task);
    el.dialog.showModal();
    el.title.focus();
  }

  function saveTask(event) {
    event.preventDefault();
    try {
      const minutes = estimatedMinutesFromHours(el.estimate.value);
      if (!Number.isFinite(minutes)) throw new Error("La durata deve essere in ore, con incrementi di 15 minuti (es. 1,5).");
      const oldTask = findTask(el.id.value);
      const task = normalizeTask({
        id: oldTask?.id || uuid(), title: el.title.value, area: el.area.value,
        priority: el.priority.value, estimateMinutes: minutes,
        tags: parseTaskTags(el.tags.value), description: el.description.value,
        completed: oldTask?.completed || false,
        createdAt: oldTask?.createdAt || new Date().toISOString()
      });
      if (!task) throw new Error("Controlla titolo, area, priorità, descrizione e durata.");
      if (!saveMutation(state => {
        state.tasks = oldTask ? state.tasks.map(item => item.id === task.id ? task : item) :
          [...state.tasks, task];
        if (oldTask && oldTask.title !== task.title) {
          state.sessions = state.sessions.map(session =>
            session.taskId === task.id && session.title === oldTask.title
              ? { ...session, title: task.title } : session);
        }
      })) return;
      el.dialog.close();
      showToast(oldTask ? "Attività aggiornata." : "Attività aggiunta.");
    } catch (error) {
      el.error.textContent = error.message;
    }
  }

  function toggleComplete(id) {
    const task = findTask(id);
    if (!task) return;
    const upcoming = getUpcoming(id);
    if (!task.completed && upcoming.length &&
        !confirm("Completare l'attività? Le " + upcoming.length + " sessioni collegate non ancora terminate saranno rimosse; lo storico resterà disponibile.")) return;
    if (saveMutation(state => {
      state.tasks = state.tasks.map(item => item.id === id ? { ...item, completed: !item.completed } : item);
      if (!task.completed) state.sessions = state.sessions.filter(session =>
        session.taskId !== id || sessionBounds(session).end <= new Date());
    })) showToast(task.completed ? "Attività riaperta." : "Attività completata.");
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
    const remaining = Math.max(15, task.estimateMinutes - plannedFocusMinutes(id, getState().sessions));
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
    const remaining = Math.max(15, task.estimateMinutes - plannedFocusMinutes(id, getState().sessions));
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
  el.list.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.taskEdit) openTask(button.dataset.taskEdit);
    else if (button.dataset.taskPlan) openPlan(button.dataset.taskPlan);
    else if (button.dataset.taskNow) startNow(button.dataset.taskNow);
    else if (button.dataset.taskComplete) toggleComplete(button.dataset.taskComplete);
    else if (button.dataset.tag) { el.tagFilter.value = button.dataset.tag; render(); }
  });
  render();
  return { render };
}
