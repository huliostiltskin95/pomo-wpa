import { Plugin, ItemView, Notice, Platform } from "obsidian";
import { getActiveSession, getPhase, sessionBounds, hasSessionOverlaps, localDateString, formatTime, mmss } from "../core/tempo-core.js";
import { normalizeArchive, manualSessionEnd, measuredFocus, parseQuick, planSessions } from "../core/tempo-simple.js";
import { createDropboxSync } from "../core/tempo-dropbox.js";
import { dropboxRequest, createCloudStorage, chooseTempvsConflicts, confirmTempvs } from "./cloud-adapter.js";
import { noteLinks, appendNoteLink } from "./notes-integration.js";

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
    const heading = root.createDiv({cls:"tempvs-header"});
    heading.createEl("h3", { text: "TEMPVS" });
    const toggle=heading.createEl("button",{text:plugin.compact?"Espandi":"Compatta",attr:{"aria-label":"Mostra o nascondi dettagli TEMPVS","aria-expanded":String(!plugin.compact)}});
    toggle.onclick=()=>plugin.setCompact(!plugin.compact);
    const timer = root.createDiv({ cls: "tempvs-timer" });
    timer.createDiv({ cls: "tempvs-phase" });
    timer.createDiv({ cls: "tempvs-clock" });
    timer.createDiv({ cls: "tempvs-area" });
    const controls = root.createDiv({ cls: "tempvs-controls" });
    button(controls, "Pausa / Riprendi", () => plugin.togglePause());
    button(controls, "Concludi", () => plugin.finish());
    const more = root.createDiv({cls:"tempvs-expanded"});
    more.hidden=plugin.compact;
    more.createEl("h4", { text: "Avvia sessione" });
    const form = more.createEl("form", { cls: "tempvs-form" });
    const area = form.createEl("select", { attr: { "aria-label": "Area" } });
    for (const a of plugin.config.areas) area.createEl("option", { text: a.name, attr: { value: a.name } });
    const gross = form.createEl("input", { attr: { type: "number", min: "1", max: "1439", value: "30", "aria-label": "Minuti lordi" } });
    gross.required = true;
    const focus = form.createEl("input", { attr: { type: "number", min: "1", max: "240", value: String(plugin.state.defaults.workMinutes), "aria-label": "Minuti focus" } });
    focus.required = true;
    const pause = form.createEl("input", { attr: { type: "number", min: "0", max: "1438", placeholder: "Pausa personalizzata (facoltativa)", "aria-label": "Minuti pausa personalizzata" } });
    form.createEl("button", { text: "Avvia", attr: { type: "submit" } });
    form.addEventListener("submit", e => {
      e.preventDefault();
      plugin.start(area.value, Number(gross.value), Number(focus.value), pause.value === "" ? undefined : Number(pause.value)).catch(err => new Notice(err.message));
    });
    more.createEl("h4", { text: "Pianificazione rapida" });
    const plan = more.createEl("form", { cls: "tempvs-form" });
    const dateInput = plan.createEl("input", { attr: { type: "date", "aria-label": "Data", value: localDateString() } });
    const lines = plan.createEl("textarea", { attr: { "aria-label": "Sessioni", placeholder: "Studio @1,5h +16:00\nLavoro @45m +18:00 !5m", rows: "3" } });
    plan.createEl("button", { text: "Programma", attr: { type: "submit" } });
    plan.addEventListener("submit", e => {
      e.preventDefault();
      plugin.schedule(lines.value, dateInput.value).then(() => { lines.value = ""; }).catch(err => new Notice(err.message));
    });
    more.createEl("h4", { text: "Sessioni" });
    more.createDiv({ cls: "tempvs-sessions" });
    more.createEl("h4", { text: "Statistiche" });
    more.createDiv({ cls: "tempvs-statistics" });
    more.createEl("h4", {text:"Risorse Obsidian"});
    const noteArea=more.createEl("select",{cls:"tempvs-note-area",attr:{"aria-label":"Area delle note"}});
    const initialArea=plugin.active()?.area || plugin.config.areas[0]?.name;
    for(const a of plugin.config.areas)noteArea.createEl("option",{text:a.name,attr:{value:a.name}});
    if(initialArea)noteArea.value=initialArea;
    noteArea.onchange=()=>this.renderNotes();
    button(more,"Collega nota attiva all'area",async()=>{
      await plugin.attachActiveNote(noteArea.value);
      this.renderNotes();
    });
    more.createDiv({cls:"tempvs-note-links"});
    more.createEl("h4", { text: "Dropbox" });
    const cloud = more.createDiv({ cls: "tempvs-cloud tempvs-form" });
    const status = cloud.createEl("p", { cls: "tempvs-cloud-status", text: plugin.cloudMessage || "Non collegato" });
    status.setAttribute("role","status");
    const key = cloud.createEl("input", { attr: { "aria-label": "Dropbox App key", placeholder: "App key Dropbox" } });
    const link = cloud.createEl("a", { text: "Apri autorizzazione Dropbox", href: "#", cls: "tempvs-cloud-link" });
    link.hidden = true; link.setAttribute("target","_blank"); link.setAttribute("rel","noopener noreferrer");
    button(cloud, "1. Autorizza su Dropbox", async () => {
      const url = await plugin.cloud.connect(key.value);
      link.href = url; link.hidden = false;
      await plugin.persist();
      new Notice("Autorizza TEMPVS su Dropbox e copia il codice mostrato.");
    });
    const code = cloud.createEl("input", { attr: { "aria-label": "Codice autorizzazione Dropbox", placeholder: "Incolla il codice Dropbox", autocomplete: "off" } });
    button(cloud, "2. Completa collegamento", async () => {
      await plugin.cloud.exchangeManualCode(code.value);
      code.value = "";
      await plugin.persist();
      plugin.refresh(true);
    });
    const actions = cloud.createDiv({ cls: "tempvs-controls" });
    button(actions, "Sincronizza", () => plugin.cloudOperation("sync"));
    button(actions, "Unisci", () => plugin.cloudOperation("mergeNow"));
    const initial = cloud.createDiv({ cls: "tempvs-controls" });
    button(initial, "Prima unione", () => plugin.cloudOperation("firstSync","merge"));
    button(initial, "Scarica prima copia", async () => {
      if(await confirmTempvs(plugin.app,"Scaricare il backup Dropbox?","Se il plugin contiene già sessioni locali, verrà creata una copia di recupero prima di sostituirle."))
        await plugin.cloudOperation("firstSync","download");
    });
    button(initial, "Carica prima copia", () => plugin.cloudOperation("firstSync","upload"));
    const dangerous = cloud.createDiv({ cls: "tempvs-controls" });
    button(dangerous, "Sovrascrivi Dropbox", async () => {
      if(await confirmTempvs(plugin.app,"Sovrascrivere Dropbox?","L'archivio remoto verrà sostituito con quello locale. Usa Unisci per evitare perdite."))
        await plugin.cloudOperation("forceUpload");
    });
    button(dangerous, "Scollega", async () => {
      if(await confirmTempvs(plugin.app,"Scollegare Dropbox?","Le sessioni locali resteranno salvate in Obsidian."))
        { plugin.cloud.disconnect(); await plugin.persist(); plugin.refresh(true); }
    });
    this.update(true);
  }
  renderNotes(){
    const root=this.containerEl.children[1];
    const area=root.querySelector(".tempvs-note-area")?.value;
    const list=root.querySelector(".tempvs-note-links");
    if(!list)return;
    list.empty();
    const description=this.plugin.config.areas.find(a=>a.name===area)?.description || "";
    const links=noteLinks(description);
    if(!links.length){list.createEl("p",{text:"Nessuna nota collegata."});return;}
    for(const link of links){
      button(list,link.label,()=>this.plugin.app.workspace.openLinkText(link.path,"",false));
    }
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
    this.renderNotes();
    const list = root.querySelector(".tempvs-sessions");
    list.empty();
    for (const s of plugin.state.sessions.filter(s => !s.finished).sort((a,b) => sessionBounds(a).start - sessionBounds(b).start).slice(0, 15)) {
      const line = list.createDiv({ cls: "tempvs-session" });
      line.createSpan({ text: (s.area || s.title) + " · " + s.date + " " + s.start + "–" + s.end });
      if (sessionBounds(s).start > new Date()) button(line, "Elimina", () => plugin.removeSession(s.id));
    }
    if (!list.childElementCount) list.createEl("p", { text: "Nessuna sessione programmata." });
    root.querySelector(".tempvs-cloud-status").textContent = plugin.cloudMessage || "Non collegato";
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
      this.cloudData = data?.cloudData && typeof data.cloudData === "object" ? data.cloudData : {};
      this.compact = typeof data?.ui?.compact === "boolean" ? data.ui.compact : Platform.isMobile;
    } catch (error) {
      new Notice("TEMPVS: dati non validi, archivio lasciato intatto. " + error.message, 10000);
      throw error;
    }
    this.lastTick = Date.now();
    this.lastSave = Date.now();
    this.dirty = false;
    this.writeChain = Promise.resolve();
    this.cloudMessage = "Dropbox non collegato";
    this.cloudStorage = createCloudStorage(this.cloudData, () => {
      this.cloudDirty = true;
      clearTimeout(this.cloudSaveTimer);
      this.cloudSaveTimer = window.setTimeout(() => this.persist().catch(e =>
        new Notice("TEMPVS: errore nel salvataggio Dropbox: " + e.message)), 150);
    });
    this.cloud = createDropboxSync({
      getState: () => this.state,
      applyRemote: async remote => {
        this.record();
        const next = normalizeArchive(remote);
        const previous = this.state;
        this.state = next;
        try { await this.persist(); }
        catch(error) { this.state = previous; throw error; }
        this.lastTick = Date.now();
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) leaf.view?.draw?.();
        this.refresh(true);
      },
      normalizeRemote: normalizeArchive,
      onStatus: (message, detail) => {
        this.cloudMessage = message;
        this.cloudInfo = detail;
        this.refresh(true);
      },
      resolveConflicts: conflicts => chooseTempvsConflicts(this.app, conflicts),
      platform: {
        storage: this.cloudStorage,
        transientStorage: this.cloudStorage,
        manualAuthorization: true,
        request: dropboxRequest,
        navigate: async url => {
          this.pendingAuthUrl = url;
          await this.persist();
        },
        isOnline: () => navigator.onLine !== false
      }
    });
    this.registerView(VIEW_TYPE, leaf => new TempvsView(leaf, this));
    this.addCommand({ id: "open-tempvs", name: "Apri timer TEMPVS", callback: () => this.openView() });
    this.addCommand({ id: "pause-tempvs", name: "Pausa o riprendi TEMPVS", callback: () => this.togglePause().catch(e => new Notice(e.message)) });
    this.addCommand({ id: "finish-tempvs", name: "Concludi sessione TEMPVS", callback: () => this.finish().catch(e => new Notice(e.message)) });
    this.addCommand({id:"link-current-note",name:"Collega nota attiva all'area della sessione",callback:async()=>{
      const area=this.active()?.area;
      if(!area){await this.openView();new Notice("Apri i dettagli TEMPVS e scegli l'area della nota.");return;}
      await this.attachActiveNote(area).catch(e=>new Notice(e.message));
    }});
    this.addCommand({id:"toggle-compact-view",name:"Espandi o compatta il pannello TEMPVS",callback:()=>this.setCompact(!this.compact)});
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
    this.cloud.init().catch(error => {
      this.cloudMessage = "Dropbox: " + error.message;
      this.refresh(true);
    });
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
      this.persist().then(() => {
        this.cloud?.changed();
      }).catch(e => new Notice("TEMPVS: salvataggio fallito: " + e.message));
      this.lastSave = now;
    }
    this.refresh(Math.floor(now / 60000) !== Math.floor((now-1000)/60000));
  }
  async persist() {
    const archive = JSON.parse(JSON.stringify(this.state));
    const cloudData = this.cloudStorage?.snapshot() || {};
    const write = this.writeChain.catch(() => {}).then(() => this.saveData({ archive, cloudData, ui:{compact:this.compact} }));
    this.writeChain = write;
    await write;
    if (JSON.stringify(this.state) === JSON.stringify(archive)) this.dirty = false;
    if (JSON.stringify(this.cloudStorage?.snapshot() || {}) === JSON.stringify(cloudData)) this.cloudDirty = false;
  }
  async change(mutator) {
    this.record();
    const previous = JSON.stringify(this.state);
    try {
      mutator();
      await this.persist();
      this.cloud?.changed();
      await this.persist();
      this.refresh(true);
    } catch (error) {
      this.state = JSON.parse(previous);
      this.refresh(true);
      throw error;
    }
  }
  async setCompact(value){
    this.compact=Boolean(value);
    await this.persist();
    for(const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE))leaf.view?.draw?.();
  }
  async attachActiveNote(areaName){
    const file=this.app.workspace.getActiveFile();
    if(!file || file.extension!=="md")throw Error("Apri prima una nota Markdown in Obsidian.");
    const area=this.config.areas.find(a=>a.name===areaName);
    if(!area)throw Error("Area TEMPVS non valida.");
    const updated=appendNoteLink(area.description,file.path);
    if(updated===area.description){new Notice("Nota già collegata all'area.");return;}
    await this.change(()=>{area.description=updated;});
    new Notice("Nota collegata all'area "+areaName+".");
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
  async cloudOperation(method, argument) {
    this.record();
    if(this.dirty) await this.persist();
    try {
      if(method === "firstSync") await this.cloud.firstSync(argument);
      else await this.cloud[method]();
      await this.persist();
      this.refresh(true);
    } catch(error) {
      await this.persist();
      this.refresh(true);
      throw error;
    }
  }
  async onunload() {
    this.record();
    clearTimeout(this.cloudSaveTimer);
    if (this.dirty || this.cloudDirty) await this.persist().catch(e => console.error("TEMPVS:", e));
    await this.writeChain.catch(() => {});
  }
}
