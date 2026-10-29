(() => {
  "use strict";

  const STORAGE_KEY = "tempo-pomodoro-v1";
  const DEFAULTS = { workMinutes: 25, breakMinutes: 5 };
  const $ = (id) => document.getElementById(id);
  const els = {
    connectionStatus: $("connection-status"), installButton: $("install-button"),
    timerMode: $("timer-mode"), timerHeading: $("timer-heading"), phasePill: $("phase-pill"),
    timerDisplay: $("timer-display"), timerCaption: $("timer-caption"), timerProgress: $("timer-progress"),
    timerSessionLabel: $("timer-session-label"), timerEndLabel: $("timer-end-label"),
    newSessionButton: $("new-session-button"), emptyAddButton: $("empty-add-button"),
    filterDate: $("filter-date"), todayButton: $("today-button"), sessionsList: $("sessions-list"), emptyState: $("empty-state"),
    dialog: $("session-dialog"), sessionForm: $("session-form"), dialogTitle: $("dialog-title"),
    sessionId: $("session-id"), sessionTitle: $("session-title"), sessionDate: $("session-date"),
    sessionStart: $("session-start"), sessionEnd: $("session-end"), sessionWork: $("session-work"),
    sessionBreak: $("session-break"), formError: $("form-error"), deleteButton: $("delete-session-button"),
    closeDialog: $("close-dialog"), cancelDialog: $("cancel-dialog"), defaultsForm: $("defaults-form"),
    defaultWork: $("default-work"), defaultBreak: $("default-break"), exportButton: $("export-button"),
    importInput: $("import-input"), toast: $("toast")
  };

  let state = loadState();
  let deferredInstallPrompt = null;
  let lastPhaseKey = "";
  let toastTimeout = null;

  function localDateString(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  function timeToMinutes(value) {
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
  }
  function dateTime(date, time) {
    const [y, mo, d] = date.split("-").map(Number);
    const [h, mi] = time.split(":").map(Number);
    return new Date(y, mo - 1, d, h, mi, 0, 0);
  }
  function formatTime(date) {
    return new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(date);
  }
  function formatDate(dateString) {
    const [y, m, d] = dateString.split("-").map(Number);
    return new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short" }).format(new Date(y, m - 1, d));
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }
  function validSession(s) {
    return s && typeof s.id === "string" && typeof s.title === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(s.date) && /^\d{2}:\d{2}$/.test(s.start) &&
      /^\d{2}:\d{2}$/.test(s.end) && Number.isInteger(s.workMinutes) &&
      Number.isInteger(s.breakMinutes) && s.workMinutes >= 1 && s.workMinutes <= 240 &&
      s.breakMinutes >= 1 && s.breakMinutes <= 90 &&
      timeToMinutes(s.end) > timeToMinutes(s.start);
  }
  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (parsed && Array.isArray(parsed.sessions)) {
        return {
          sessions: parsed.sessions.filter(validSession),
          defaults: {
            workMinutes: clampInt(parsed.defaults?.workMinutes, 1, 240, DEFAULTS.workMinutes),
            breakMinutes: clampInt(parsed.defaults?.breakMinutes, 1, 90, DEFAULTS.breakMinutes)
          }
        };
      }
    } catch (error) { console.warn("Impossibile leggere i dati locali.", error); }
    return { sessions: [], defaults: { ...DEFAULTS } };
  }
  function clampInt(value, min, max, fallback) {
    const n = Number(value);
    return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
  }
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      showToast("Non è stato possibile salvare i dati nel browser.");
      return false;
    }
  }
  function sessionBounds(s) {
    return { start: dateTime(s.date, s.start), end: dateTime(s.date, s.end) };
  }
  function getSessionStatus(s, now = new Date()) {
    const { start, end } = sessionBounds(s);
    if (now < start) return "upcoming";
    if (now >= end) return "finished";
    return "active";
  }
  function getActiveSession(now = new Date()) {
    return state.sessions
      .filter((s) => getSessionStatus(s, now) === "active")
      .sort((a, b) => dateTime(a.date, a.start) - dateTime(b.date, b.start))[0] || null;
  }
  function getNextSession(now = new Date()) {
    return state.sessions
      .filter((s) => getSessionStatus(s, now) === "upcoming")
      .sort((a, b) => dateTime(a.date, a.start) - dateTime(b.date, b.start))[0] || null;
  }
  function getPhase(s, now = new Date()) {
    const { start, end } = sessionBounds(s);
    const elapsed = Math.max(0, now.getTime() - start.getTime());
    const workMs = s.workMinutes * 60_000;
    const breakMs = s.breakMinutes * 60_000;
    const cycleMs = workMs + breakMs;
    const withinCycle = elapsed % cycleMs;
    const isWork = withinCycle < workMs;
    const phaseDuration = isWork ? workMs : breakMs;
    const phaseElapsed = isWork ? withinCycle : withinCycle - workMs;
    const theoreticalPhaseEnd = new Date(now.getTime() + (phaseDuration - phaseElapsed));
    const phaseEnd = theoreticalPhaseEnd < end ? theoreticalPhaseEnd : end;
    const remaining = Math.max(0, Math.ceil((phaseEnd.getTime() - now.getTime()) / 1000));
    const totalRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 1000));
    return {
      kind: isWork ? "work" : "break",
      label: isWork ? "Concentrazione" : "Pausa",
      end: phaseEnd,
      remaining,
      totalRemaining,
      progress: phaseDuration ? Math.min(100, Math.max(0, ((phaseElapsed / 1000) / (phaseDuration / 1000)) * 100)) : 0,
      sessionEnd: end
    };
  }
  function mmss(totalSeconds) {
    const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
    const seconds = Math.max(0, totalSeconds) % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => els.toast.classList.remove("show"), 3200);
  }
  function notifyPhaseChange(session, phase) {
    const key = `${session.id}:${phase.kind}:${Math.floor(Date.now() / ((session.workMinutes + session.breakMinutes) * 60_000))}`;
    if (key === lastPhaseKey) return;
    if (lastPhaseKey && document.visibilityState === "visible") {
      showToast(phase.kind === "work" ? `Riprendi: ${session.title}` : `Pausa: ${session.title}`);
    }
    lastPhaseKey = key;
  }
  function renderTimer(now = new Date()) {
    const active = getActiveSession(now);
    if (active) {
      const phase = getPhase(active, now);
      els.timerMode.textContent = phase.kind === "work" ? "SESSIONE IN CORSO" : "PAUSA IN CORSO";
      els.timerHeading.textContent = active.title;
      els.phasePill.textContent = phase.label;
      els.phasePill.className = `phase-pill ${phase.kind}`;
      els.timerDisplay.textContent = mmss(phase.remaining);
      els.timerCaption.textContent = phase.kind === "work"
        ? `Fino alle ${formatTime(phase.end)} · resta sul compito`
        : `La pausa termina alle ${formatTime(phase.end)}`;
      els.timerProgress.style.width = `${phase.progress}%`;
      els.timerProgress.style.background = phase.kind === "work" ? "var(--accent)" : "var(--green)";
      els.timerSessionLabel.textContent = `${formatTime(sessionBounds(active).start)}–${active.end}`;
      els.timerEndLabel.textContent = `${mmss(phase.totalRemaining)} alla fine`;
      notifyPhaseChange(active, phase);
      document.title = `${mmss(phase.remaining)} · ${phase.label} — Tempo`;
      return;
    }
    lastPhaseKey = "";
    const next = getNextSession(now);
    els.phasePill.textContent = next ? "In programma" : "In attesa";
    els.phasePill.className = "phase-pill neutral";
    els.timerProgress.style.width = "0%";
    els.timerProgress.style.background = "var(--accent)";
    els.timerSessionLabel.textContent = next ? next.title : "Nessuna sessione in corso";
    if (next) {
      const start = sessionBounds(next).start;
      const seconds = Math.max(0, Math.ceil((start.getTime() - now.getTime()) / 1000));
      els.timerMode.textContent = "PROSSIMA SESSIONE";
      els.timerHeading.textContent = next.title;
      els.timerDisplay.textContent = mmss(seconds);
      els.timerCaption.textContent = `Inizio previsto alle ${formatTime(start)}`;
      els.timerEndLabel.textContent = `${next.workMinutes}/${next.breakMinutes} min`;
      document.title = `${mmss(seconds)} · Prossima sessione — Tempo`;
    } else {
      els.timerMode.textContent = "NESSUNA SESSIONE ATTIVA";
      els.timerHeading.textContent = "Pronto quando vuoi";
      els.timerDisplay.textContent = `${String(state.defaults.workMinutes).padStart(2, "0")}:00`;
      els.timerCaption.textContent = "La prossima sessione apparirà qui.";
      els.timerEndLabel.textContent = "—";
      document.title = "Tempo — Pomodoro";
    }
  }
  function renderSessions() {
    const filter = els.filterDate.value;
    const sessions = state.sessions
      .filter((s) => s.date === filter)
      .sort((a, b) => a.start.localeCompare(b.start));
    els.sessionsList.innerHTML = "";
    els.emptyState.classList.toggle("hidden", sessions.length > 0);
    els.sessionsList.classList.toggle("hidden", sessions.length === 0);
    sessions.forEach((s) => {
      const status = getSessionStatus(s);
      const statusLabel = status === "active" ? "In corso" : status === "upcoming" ? "In programma" : "Terminata";
      const article = document.createElement("article");
      article.className = "session-item";
      article.innerHTML = `
        <div class="session-time">${escapeHtml(s.start)}–${escapeHtml(s.end)}<span>${escapeHtml(formatDate(s.date))}</span></div>
        <div>
          <p class="session-name">${escapeHtml(s.title)}</p>
          <p class="session-meta">${s.workMinutes} min lavoro · ${s.breakMinutes} min pausa</p>
          <span class="session-status ${status === "active" ? "active" : ""}">${statusLabel}</span>
        </div>
        <div class="session-actions">
          <button class="small-button" type="button" data-edit="${escapeHtml(s.id)}" aria-label="Modifica ${escapeHtml(s.title)}" title="Modifica">✎</button>
          <button class="small-button" type="button" data-delete="${escapeHtml(s.id)}" aria-label="Elimina ${escapeHtml(s.title)}" title="Elimina">×</button>
        </div>`;
      els.sessionsList.appendChild(article);
    });
  }
  function renderAll() {
    renderTimer();
    renderSessions();
    els.defaultWork.value = state.defaults.workMinutes;
    els.defaultBreak.value = state.defaults.breakMinutes;
  }
  function openNewDialog() {
    els.sessionForm.reset();
    els.sessionId.value = "";
    els.dialogTitle.textContent = "Nuova sessione";
    els.sessionTitle.value = "";
    els.sessionDate.value = els.filterDate.value || localDateString();
    els.sessionStart.value = "09:00";
    els.sessionEnd.value = "11:00";
    els.sessionWork.value = state.defaults.workMinutes;
    els.sessionBreak.value = state.defaults.breakMinutes;
    els.formError.textContent = "";
    els.deleteButton.classList.add("hidden");
    els.dialog.showModal();
    els.sessionTitle.focus();
  }
  function openEditDialog(id) {
    const s = state.sessions.find((item) => item.id === id);
    if (!s) return;
    els.sessionId.value = s.id;
    els.dialogTitle.textContent = "Modifica sessione";
    els.sessionTitle.value = s.title;
    els.sessionDate.value = s.date;
    els.sessionStart.value = s.start;
    els.sessionEnd.value = s.end;
    els.sessionWork.value = s.workMinutes;
    els.sessionBreak.value = s.breakMinutes;
    els.formError.textContent = "";
    els.deleteButton.classList.remove("hidden");
    els.dialog.showModal();
  }
  function saveSession(event) {
    event.preventDefault();
    const existingId = els.sessionId.value;
    const session = {
      id: existingId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
      title: els.sessionTitle.value.trim(),
      date: els.sessionDate.value,
      start: els.sessionStart.value,
      end: els.sessionEnd.value,
      workMinutes: Number(els.sessionWork.value),
      breakMinutes: Number(els.sessionBreak.value)
    };
    if (!session.title) { els.formError.textContent = "Inserisci un nome per la sessione."; return; }
    if (!validSession(session)) { els.formError.textContent = "Controlla gli orari: la fine deve essere successiva all'inizio e le durate devono essere valide."; return; }
    const start = dateTime(session.date, session.start);
    const end = dateTime(session.date, session.end);
    const overlaps = state.sessions.some((s) => {
      if (s.id === session.id || s.date !== session.date) return false;
      const bounds = sessionBounds(s);
      return start < bounds.end && end > bounds.start;
    });
    if (overlaps) { els.formError.textContent = "Questa sessione si sovrappone a un'altra sessione dello stesso giorno."; return; }
    if (existingId) state.sessions = state.sessions.map((s) => s.id === existingId ? session : s);
    else state.sessions.push(session);
    persist();
    els.filterDate.value = session.date;
    els.dialog.close();
    renderAll();
    showToast(existingId ? "Sessione aggiornata." : "Sessione aggiunta all'agenda.");
  }
  function deleteSession(id) {
    const s = state.sessions.find((item) => item.id === id);
    if (!s) return;
    if (!window.confirm(`Eliminare la sessione “${s.title}”?`)) return;
    state.sessions = state.sessions.filter((item) => item.id !== id);
    persist();
    if (els.dialog.open) els.dialog.close();
    renderAll();
    showToast("Sessione eliminata.");
  }
  function saveDefaults(event) {
    event.preventDefault();
    const work = Number(els.defaultWork.value);
    const rest = Number(els.defaultBreak.value);
    if (!Number.isInteger(work) || work < 1 || work > 240 || !Number.isInteger(rest) || rest < 1 || rest > 90) {
      showToast("Inserisci durate valide.");
      return;
    }
    state.defaults = { workMinutes: work, breakMinutes: rest };
    persist();
    renderTimer();
    showToast("Preferenze salvate.");
  }
  function exportBackup() {
    const payload = {
      app: "Tempo Pomodoro",
      version: 1,
      exportedAt: new Date().toISOString(),
      defaults: state.defaults,
      sessions: state.sessions
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tempo-backup-${localDateString()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Backup esportato.");
  }
  async function importBackup(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || !Array.isArray(data.sessions)) throw new Error("Formato non valido");
      const sessions = data.sessions.filter(validSession);
      if (sessions.length !== data.sessions.length) throw new Error("Una o più sessioni non sono valide");
      const sorted = [...sessions].sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].date === sorted[i - 1].date && timeToMinutes(sorted[i].start) < timeToMinutes(sorted[i - 1].end)) {
          throw new Error("Il backup contiene sessioni sovrapposte");
        }
      }
      const defaults = {
        workMinutes: clampInt(data.defaults?.workMinutes, 1, 240, DEFAULTS.workMinutes),
        breakMinutes: clampInt(data.defaults?.breakMinutes, 1, 90, DEFAULTS.breakMinutes)
      };
      const mode = window.confirm("Vuoi sostituire tutti i dati attuali con quelli del backup? Premi Annulla per unire le sessioni.");
      if (mode) {
        state = { sessions, defaults };
      } else {
        const byId = new Map(state.sessions.map((s) => [s.id, s]));
        sessions.forEach((s) => byId.set(s.id, s));
        const merged = [...byId.values()].sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
        for (let i = 1; i < merged.length; i++) {
          if (merged[i].date === merged[i - 1].date && timeToMinutes(merged[i].start) < timeToMinutes(merged[i - 1].end)) {
            throw new Error("L'unione crea sovrapposizioni. Scegli di sostituire i dati o modifica il backup.");
          }
        }
        state.sessions = merged;
      }
      persist();
      els.filterDate.value = localDateString();
      renderAll();
      showToast("Backup importato.");
    } catch (error) {
      showToast(`Importazione non riuscita: ${error.message}`);
    } finally {
      els.importInput.value = "";
    }
  }

  els.newSessionButton.addEventListener("click", openNewDialog);
  els.emptyAddButton.addEventListener("click", openNewDialog);
  els.sessionForm.addEventListener("submit", saveSession);
  els.closeDialog.addEventListener("click", () => els.dialog.close());
  els.cancelDialog.addEventListener("click", () => els.dialog.close());
  els.deleteButton.addEventListener("click", () => deleteSession(els.sessionId.value));
  els.filterDate.addEventListener("change", renderSessions);
  els.todayButton.addEventListener("click", () => { els.filterDate.value = localDateString(); renderSessions(); });
  els.sessionsList.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-edit]");
    const del = event.target.closest("[data-delete]");
    if (edit) openEditDialog(edit.dataset.edit);
    if (del) deleteSession(del.dataset.delete);
  });
  els.defaultsForm.addEventListener("submit", saveDefaults);
  els.exportButton.addEventListener("click", exportBackup);
  els.importInput.addEventListener("change", () => importBackup(els.importInput.files[0]));

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    els.installButton.classList.remove("hidden");
  });
  els.installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      showToast("Per installare, usa il menu del browser e scegli “Installa app” o “Aggiungi alla schermata Home”.");
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    els.installButton.classList.add("hidden");
  });
  window.addEventListener("online", () => { els.connectionStatus.textContent = "Online"; });
  window.addEventListener("offline", () => { els.connectionStatus.textContent = "Offline"; });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      renderAll();
    }
  });
  window.addEventListener("focus", renderAll);

  els.filterDate.value = localDateString();
  els.connectionStatus.textContent = navigator.onLine ? "Pronta" : "Offline";
  renderAll();
  setInterval(() => {
    renderTimer();
    renderSessions();
  }, 1000);

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").then(() => {
        els.connectionStatus.textContent = navigator.onLine ? "Pronta · offline disponibile" : "Offline";
      }).catch((error) => console.warn("Service worker non registrato:", error));
    });
  }
})();