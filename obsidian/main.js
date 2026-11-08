import { Plugin, ItemView, Notice, Platform } from "obsidian";
import { getActiveSession, getPhase, sessionBounds, hasSessionOverlaps, localDateString, formatTime, mmss } from "../core/tempo-core.js";
import { normalizeArchive, manualSessionEnd, measuredFocus, parseQuick, planSessions } from "../core/tempo-simple.js";

const VIEW_TYPE = "tempvs-timer";
const ZERO = () => normalizeArchive({ sessions: [] });
const uuid = () => globalThis.crypto?.randomUUID?.() || String(Date.now()) + "-" + Math.random().toString(36).slice(2);
const minutes = seconds => Math.round(seconds / 60);
const button = (parent, label, action) => {
  const el = parent.createEl("button", { text: label });
  el.addEventListener("click", () => Promise.resolve().then(action).catch(e => new Notice(e.message)));
  return el;
};

class TempvsView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return "TEMPVS"; }
  getIcon() { return "timer"; }
  async onOpen() { this.draw(); }
  async onClose() {}
  draw() {
    const plugin = this.plugin;
    const root = this.containerEl.children[1];
    root.empty();
    root.addClass("tempvs-root");
    root.createEl("h3", { text: "TEMPVS" });
    const timer = root.createDiv({ cls: "tempvs-timer" });
    timer.createDiv({ cls: "tempvs-phase" });
    timer.createDiv({ cls: "tempvs-clock" });
    timer.createDiv({ cls: "tempvs-area" });
    const controls = root.createDiv({ cls: "tempvs-controls" });
    button(controls, "Pausa / Riprendi", () => plugin.togglePause());
    button(controls, "Concludi", () => plugin.finish());
    root.createEl("h4", { text: "Avvia sessione" });
    const form = root.createEl("form", { cls: "tempvs-form" });
    const area = form.createEl("select", { attr: { "aria-label": "Area" } });
    for (const a of plugin.config.areas) area.createEl("option", { text: a.name, attr: { value: a.name } });
    const gross = form.createEl("input", { attr: { type: "number", min: "1", max: "1439", value: "30", "aria-label": "Minuti lordi" } });
    gross.required = true;
    const focus = form.createEl("input", { type: "number", attr: { min: "1", max: "240", value: String(plugin.state.defaults.workMinutes), "aria-label": "Minuti focus" } });
    focus.required = true;
    const pause = form.createEl("input", { attr: { type: "number", min: "0", max: "1438", placeholder: "Pausa personalizzata (facoltativa)", "aria-label": "Minuti pausa personalizzata" } });
    form.createEl("button", { text: "Avvia", attr: { type: "submit" } });
    form.addEventListener("submit", e => {
      e.preventDefault();
      plugin.start(area.value, Number(gross.value), Number(focus.value), pause.value === "" ? undefined : Number(pause.value)).catch(err => new Notice(err.message));
    });
    root.createEl("h4", { text: "Pianificazione rapida" });
    const plan = root.createEl("form", { cls: "tempvs-form" });
    const dateInput = plan.createEl("input", { attr: { type: "date", "aria-label": "Data", value: localDateString() } });
    const lines = plan.createEl("textarea", { attr: { "aria-label": "Sessioni", placeholder: "Studio @1,5h +16:00\nLavoro @45m +18:00 !5m", rows: "3" } });
    plan.createEl("button", { text: "Programma", attr: { type: "submit" } });
    plan.addEventListener("submit", e => {
      e.preventDefault();
      plugin.schedule(lines.value, dateInput.value).then(() => { lines.value = ""; }).catch(err => new Notice(err.message));
    });
    root.createEl("h4", { text: "Sessioni" });
    root.createDiv({ cls: "tempvs-sessions" });
    root.createEl("h4", { text: "Statistiche" });
    root.createDiv({ cls: "tempvs-statistics" });
    this.update(true);
  }
  update(full = false) {
    const root = this.containerEl.children[1];
    if (!root?.hasClass("tempvs-root")) return;
    const plugin = this.plugin;
    const session = plugin.active();
    const phase = session ? getPhase(session) : null;
    root.querySelector(".tempvs-phase").textContent = phase ? phase.label : "Nessuna sessione attiva";
    root.querySelector(".tempvs-clock").textContent = phase ? mmss(phase.remaining) : "--:--";
    root.querySelector(".tempvs-area").textContent = session ? session.area || session.title : "";
    if (!full) return;
    const list = root.querySelector(".tempvs-sessions");
    list.empty();
    for (const s of plugin.state.sessions.filter(s => !s.finished).sort((a,b) => sessionBounds(a).start - sessionBounds(b).start).slice(0, 15)) {
      const line = list.createDiv({ cls: "tempvs-session" });
      line.createSpan({ text: (s.area || s.title) + " · " + s.date + " " + s.start + "–" + s.end });
      if (sessionBounds(s).start > new Date()) button(line, "Elimina", () => plugin.removeSession(s.id));
    }
    if (!list.childElementCount) list.createEl("p", { text: "Nessuna sessione programmata." });
    const focused = plugin.state.sessions.reduce((sum,s) => sum + (s.actualSeconds || 0), 0) +
      plugin.state.history.filter(h => h.measured).reduce((sum,h) => sum + h.minutes * 60, 0);
    root.querySelector(".tempvs-statistics").textContent = "Concentrazione registrata: " + minutes(focused) + " minuti";
  }
}

export default class TempvsPlugin extends Plugin {
  async onload() {
    try {
      const data = await this.loadData();
      if (data && !data.archive && !Array.isArray(data.sessions) && Object.keys(data).length)
        throw Error("Formato precedente non riconosciuto: nessun dato verrà sovrascritto.");
      this.state = normalizeArchive(data?.archive || (Array.isArray(data?.sessions) ? data : ZERO()));
    } catch (error) {
      new Notice("TEMPVS: dati non validi, archivio lasciato intatto. " + error.message, 10000);
      throw error;
    }
    this.lastTick = Date.now();
    this.lastSave = Date.now();
    this.dirty = false;
    this.writeChain = Promise.resolve();
    this.registerView(VIEW_TYPE, leaf => new TempvsView(leaf, this));
    this.addCommand({ id: "open-tempvs", name: "Apri timer TEMPVS", callback: () => this.openView() });
    this.addCommand({ id: "pause-tempvs", name: "Pausa o riprendi TEMPVS", callback: () => this.togglePause().catch(e => new Notice(e.message)) });
    this.addCommand({ id: "finish-tempvs", name: "Concludi sessione TEMPVS", callback: () => this.finish().catch(e => new Notice(e.message)) });
    this.addRibbonIcon("timer", "Apri TEMPVS", () => this.openView());
    // Status bar is not exposed by the Obsidian API on mobile.
    if (!Platform.isMobile) {
      this.status = this.addStatusBarItem();
      this.status.addClass("tempvs-status");
      this.status.setAttribute("role", "button");
      this.status.setAttribute("tabindex", "0");
      this.status.addEventListener("click", () => this.openView());
      this.status.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.openView(); } });
    }
    this.registerInterval(window.setInterval(() => this.tick(), 1000));
    this.registerDomEvent(document, "visibilitychange", () => { if (!document.hidden) { this.tick(); this.refresh(true); } });
    this.refresh(true);
  }
  get config() { return this.state.defaults.simple; }
  active() {
    const session = getActiveSession(this.state.sessions.filter(s => !s.finished));
    return session || null;
  }
  async openView() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false) || this.app.workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
  }
  refresh(full = false) {
    const session = this.active();
    const phase = session ? getPhase(session) : null;
    if (this.status) {
      this.status.textContent = phase ? "TEMPVS · " + mmss(phase.remaining) + " · " + (session.area || session.title) : "TEMPVS · pronto";
      this.status.setAttribute("aria-label", "Apri TEMPVS");
    }
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) leaf.view?.update?.(full);
  }
  record() {
    const now = Date.now();
    if (now <= this.lastTick) { this.lastTick = now; return; }
    for (const s of this.state.sessions) {
      const elapsed = measuredFocus(s, this.lastTick, now);
      if (elapsed > 0) { s.actualSeconds = (s.actualSeconds || 0) + elapsed; this.dirty = true; }
    }
    this.lastTick = now;
  }
  tick() {
    this.record();
    const now = Date.now();
    if (this.dirty && now - this.lastSave >= 15000) {
      this.persist().catch(e => new Notice("TEMPVS: salvataggio fallito: " + e.message));
      this.lastSave = now;
    }
    this.refresh(Math.floor(now / 60000) !== Math.floor((now-1000)/60000));
  }
  async persist() {
    const archive = JSON.parse(JSON.stringify(this.state));
    const write = this.writeChain.catch(() => {}).then(() => this.saveData({ archive }));
    this.writeChain = write;
    await write;
    if (JSON.stringify(this.state) === JSON.stringify(archive)) this.dirty = false;
  }
  async change(mutator) {
    this.record();
    const previous = JSON.stringify(this.state);
    try {
      mutator();
      await this.persist();
      this.refresh(true);
    } catch (error) {
      this.state = JSON.parse(previous);
      this.refresh(true);
      throw error;
    }
  }
  async start(area, gross, focus, pause) {
    if (!this.config.areas.some(a => a.name === area)) throw Error("Area non valida.");
    if (!Number.isInteger(gross) || gross < 1 || gross > 1439) throw Error("Durata lorda non valida.");
    if (!Number.isInteger(focus) || focus < 1 || focus > 240) throw Error("Focus da 1 a 240 minuti.");
    if (pause !== undefined && (!Number.isInteger(pause) || pause < 0 || pause >= gross)) throw Error("Pausa personalizzata non valida.");
    const start = new Date(), end = manualSessionEnd(start, gross);
    const s = { id: uuid(), title: area, area, date: localDateString(start), start: formatTime(start), end: formatTime(end),
      timerStartedAt: start.toISOString(), timerEndsAt: end.toISOString(), workMinutes: focus,
      breakEnabled: pause === undefined ? this.state.defaults.breakEnabled : pause > 0, actualSeconds: 0 };
    if (pause !== undefined) s.customBreakMinutes = pause;
    if (hasSessionOverlaps([...this.state.sessions.filter(s => !s.finished), s])) throw Error("Sessione sovrapposta a un'altra.");
    await this.change(() => this.state.sessions.push(s));
  }
  async schedule(text, date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Error("Data non valida.");
    const requests = parseQuick(text, this.config.areas);
    if (!requests.length) throw Error("Inserisci almeno una sessione.");
    if (requests.some(r => !r.start)) throw Error("Per ora specifica +HH:MM per ogni sessione. Le fasce automatiche saranno aggiunte successivamente.");
    const result = planSessions(requests, [], this.state.sessions.filter(s => !s.finished),
      { ...this.state.defaults, breakEnabled: true }, new Date(), uuid, date);
    if (result.remainder || !result.sessions?.length) throw Error("Programmazione incompleta.");
    await this.change(() => this.state.sessions.push(...result.sessions));
    new Notice("TEMPVS: " + result.sessions.length + " sessioni programmate.");
  }
  async togglePause() {
    const s = this.active();
    if (!s) throw Error("Nessuna sessione attiva.");
    await this.change(() => { s.paused = !s.paused; });
  }
  async finish() {
    const s = this.active();
    if (!s) throw Error("Nessuna sessione attiva.");
    await this.change(() => { s.finished = true; s.paused = false; });
  }
  async removeSession(id) {
    const s = this.state.sessions.find(s => s.id === id);
    if (!s || s.finished || sessionBounds(s).start <= new Date()) throw Error("Puoi eliminare solo sessioni future.");
    await this.change(() => {
      this.state.sessions = this.state.sessions.filter(item => item.id !== id);
      this.state.syncDeleted.sessions.push(id);
    });
  }
  async onunload() {
    this.record();
    if (this.dirty) await this.persist().catch(e => console.error("TEMPVS:", e));
    await this.writeChain.catch(() => {});
  }
}
