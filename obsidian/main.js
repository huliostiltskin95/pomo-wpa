import { Plugin, ItemView, Notice, Platform, PluginSettingTab, Setting, setIcon } from "obsidian";
import { getActiveSession, getPhase, sessionBounds, hasSessionOverlaps, localDateString, formatTime, mmss } from "../core/tempo-core.js";
import { normalizeArchive, manualSessionEnd, measuredFocus, parseQuick, planSessions } from "../core/tempo-simple.js";
import { createDropboxSync } from "../core/tempo-dropbox.js";
import { dropboxRequest, createCloudStorage, chooseTempvsConflicts, confirmTempvs } from "./cloud-adapter.js";
import { noteLinks, appendNoteLink } from "./notes-integration.js";
import { TempoAmbientAudio } from "../core/tempo-audio.js";
import { getAmbientFocusMode } from "../core/tempo-core.js";

const VIEW_TYPE = "tempvs-timer";
const ZERO = () => normalizeArchive({ sessions: [] });
const uuid = () => globalThis.crypto?.randomUUID?.() || String(Date.now()) + "-" + Math.random().toString(36).slice(2);
const minutes = seconds => Math.round(seconds / 60);
const button = (parent, label, action) => {
  const el = parent.createEl("button", { text: label });
  el.addEventListener("click", () => Promise.resolve().then(action).catch(e => new Notice(e.message)));
  return el;
};


const today = () => localDateString();
const shiftDate = (value, change) => {
  const d = new Date(value + "T12:00:00");
  if (Number.isNaN(d.getTime())) return today();
  d.setDate(d.getDate() + change);
  return localDateString(d);
};
const iconButton = (parent, icon, label, action) => {
  const el = parent.createEl("button", { cls:"tempvs-icon-button", attr:{"aria-label":label,"title":label} });
  setIcon(el, icon);
  el.addEventListener("click", () => Promise.resolve().then(action).catch(e => new Notice(e.message)));
  return el;
};
const setPanel = (el, show) => { el.hidden = !show; };
function renderCloudSettings(parent, plugin) {
  const more = parent;
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

}

class TempvsView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf); this.plugin = plugin; this.day = today(); this.panel = null; this.creation = "start";
  }
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
    root.toggleClass("tempvs-wide", plugin.layout === "wide");
    const heading = root.createDiv({cls:"tempvs-header"});
    heading.createEl("h3", {text:"TEMPVS"});
    const actions = heading.createDiv({cls:"tempvs-heading-actions"});
    const cloud = iconButton(actions,"cloud","Impostazioni Dropbox",()=>plugin.openSettings());
    cloud.addClass("tempvs-cloud-indicator");
    iconButton(actions,"settings","Impostazioni TEMPVS",()=>plugin.openSettings());
    const timer = root.createDiv({cls:"tempvs-timer"});
    timer.createDiv({cls:"tempvs-phase"});
    timer.createDiv({cls:"tempvs-clock"});
    timer.createDiv({cls:"tempvs-area"});
    const controls = root.createDiv({cls:"tempvs-controls tempvs-primary-controls"});
    const pauseButton = button(controls,"Pausa",()=>plugin.togglePause());
    pauseButton.addClass("mod-cta","tempvs-pause-button");
    const finishButton = button(controls,"Concludi",()=>plugin.finish());
    finishButton.addClass("tempvs-finish-button");
    const sessionHeader = root.createDiv({cls:"tempvs-section-heading"});
    sessionHeader.createEl("h4",{text:"Prossime sessioni"});
    const nav = sessionHeader.createDiv({cls:"tempvs-date-nav"});
    iconButton(nav,"chevron-left","Giorno precedente",()=>{this.day=shiftDate(this.day,-1);this.update(true);});
    const dateLabel = nav.createEl("button",{cls:"tempvs-day-label",text:"Oggi"});
    dateLabel.onclick=()=>{this.day=today();this.update(true);};
    iconButton(nav,"chevron-right","Giorno successivo",()=>{this.day=shiftDate(this.day,1);this.update(true);});
    root.createDiv({cls:"tempvs-sessions"});
    const add = button(root,"+ Nuova sessione",()=>this.togglePanel("create"));
    add.addClass("mod-cta","tempvs-add-button");
    const quickActions = root.createDiv({cls:"tempvs-shortcuts"});
    const planShortcut=iconButton(quickActions,"calendar-days","Pianifica",()=>{this.creation="plan";this.togglePanel("create",true);this.showCreation();});
    planShortcut.createSpan({text:"Pianifica"});
    const soundShortcut=iconButton(quickActions,"volume-2","Suoni",()=>this.togglePanel("sound"));
    soundShortcut.createSpan({text:"Suoni"});
    const noteShortcut=iconButton(quickActions,"book-open","Risorse Obsidian",()=>this.togglePanel("notes"));
    noteShortcut.createSpan({text:"Risorse"});
    const panels = root.createDiv({cls:"tempvs-panels"});
    const create = panels.createDiv({cls:"tempvs-panel tempvs-create-panel"});
    create.hidden=true;
    create.createEl("h4",{text:"Nuova sessione"});
    const method = create.createEl("select",{cls:"tempvs-method",attr:{"aria-label":"Metodo di inserimento"}});
    method.createEl("option",{text:"Avvia adesso",value:"start"});
    method.createEl("option",{text:"Pianificazione rapida",value:"plan"});
    method.value=this.creation;
    method.onchange=()=>{this.creation=method.value;this.showCreation();};
    const startBox=create.createDiv({cls:"tempvs-method-start"});
    const form=startBox.createEl("form",{cls:"tempvs-form"});
    const area=form.createEl("select",{attr:{"aria-label":"Area"}});
    for(const a of plugin.config.areas)area.createEl("option",{text:a.name,attr:{value:a.name}});
    const gross=form.createEl("input",{attr:{type:"number",min:"1",max:"1439",value:"30","aria-label":"Durata lorda in minuti",placeholder:"Minuti lordi"}});
    gross.required=true;
    const advanced=form.createEl("details");
    advanced.createEl("summary",{text:"Focus e pause (avanzate)"});
    const focus=advanced.createEl("input",{attr:{type:"number",min:"1",max:"240",value:String(plugin.state.defaults.workMinutes),"aria-label":"Minuti focus"}});
    focus.required=true;
    const pause=advanced.createEl("input",{attr:{type:"number",min:"0",max:"1438",placeholder:"Pausa personalizzata (facoltativa)","aria-label":"Minuti di pausa"}});
    form.createEl("button",{text:"Avvia",cls:"mod-cta",attr:{type:"submit"}});
    form.addEventListener("submit",e=>{
      e.preventDefault();
      plugin.start(area.value,Number(gross.value),Number(focus.value),pause.value===""?undefined:Number(pause.value))
        .then(()=>this.togglePanel(null,true)).catch(err=>new Notice(err.message));
    });
    const planBox=create.createDiv({cls:"tempvs-method-plan"});
    const plan=planBox.createEl("form",{cls:"tempvs-form"});
    const dateInput=plan.createEl("input",{attr:{type:"date","aria-label":"Data",value:today()}});
    const lines=plan.createEl("textarea",{attr:{"aria-label":"Sessioni",placeholder:"Studio @1,5h +16:00\nLavoro @45m +18:00 !5m",rows:"3"}});
    plan.createEl("button",{text:"Programma",cls:"mod-cta",attr:{type:"submit"}});
    plan.addEventListener("submit",e=>{
      e.preventDefault();
      plugin.schedule(lines.value,dateInput.value).then(()=>{
        lines.value="";this.day=dateInput.value;this.togglePanel(null,true);
      }).catch(err=>new Notice(err.message));
    });
    const sounds=panels.createDiv({cls:"tempvs-panel tempvs-sound-panel"});
    sounds.hidden=true;
    sounds.createEl("h4",{text:"Suoni di sottofondo"});
    sounds.createEl("p",{cls:"tempvs-help",text:"Il suono parte con un tocco durante il focus, si silenzia nelle pause e termina con una dissolvenza."});
    const soundChoice=sounds.createEl("select",{cls:"tempvs-sound-choice",attr:{"aria-label":"Rumore ambientale"}});
    for(const [value,label] of [["white","Rumore bianco"],["brown","Rumore marrone"],["rain","Pioggia"],["fire","Caminetto"]])soundChoice.createEl("option",{value,text:label});
    soundChoice.value=plugin.audioKind;
    soundChoice.addEventListener("change",()=>void plugin.selectAmbient(soundChoice.value).catch(e=>new Notice(e.message)));
    const soundVolume=sounds.createDiv({cls:"tempvs-sound-volume"});
    soundVolume.createEl("label",{text:"Volume",attr:{for:"tempvs-volume"}});
    const slider=soundVolume.createEl("input",{cls:"tempvs-volume-slider",attr:{type:"range",id:"tempvs-volume",min:"0",max:"100",step:"1","aria-label":"Volume audio"}});
    slider.value=String(plugin.audioVolume);
    slider.addEventListener("input",()=>plugin.adjustAmbientVolume(Number(slider.value)));
    slider.addEventListener("change",()=>void plugin.persist().catch(e=>new Notice(e.message)));
    const soundToggle=sounds.createEl("button",{cls:"tempvs-sound-toggle mod-cta",text:"Avvia suono"});
    // Preserve iOS user activation: never defer this handler to a microtask.
    soundToggle.addEventListener("click",()=>void plugin.toggleAmbient().catch(e=>new Notice(e.message)));
    sounds.createDiv({cls:"tempvs-sound-status",attr:{role:"status","aria-live":"polite"}});
    const notes=panels.createDiv({cls:"tempvs-panel tempvs-notes-panel"});
    notes.hidden=true;
    notes.createEl("h4",{text:"Risorse Obsidian"});
    const noteArea=notes.createEl("select",{cls:"tempvs-note-area",attr:{"aria-label":"Area delle note"}});
    const initialArea=plugin.active()?.area || plugin.config.areas[0]?.name;
    for(const a of plugin.config.areas)noteArea.createEl("option",{text:a.name,attr:{value:a.name}});
    if(initialArea)noteArea.value=initialArea;
    noteArea.onchange=()=>this.renderNotes();
    button(notes,"Collega nota attiva all'area",async()=>{await plugin.attachActiveNote(noteArea.value);this.renderNotes();});
    notes.createDiv({cls:"tempvs-note-links"});
    this.showCreation();
    this.applyPanel();
    this.update(true);
  }
  showCreation() {
    const root=this.containerEl.children[1];
    const start=root.querySelector(".tempvs-method-start");
    const plan=root.querySelector(".tempvs-method-plan");
    if(start)start.hidden=this.creation!=="start";
    if(plan)plan.hidden=this.creation!=="plan";
    const choice=root.querySelector(".tempvs-method");
    if(choice)choice.value=this.creation;
  }
  togglePanel(panel, force=false) {
    this.panel=force?panel:(this.panel===panel?null:panel);
    this.applyPanel();
  }
  applyPanel() {
    const root=this.containerEl.children[1];
    for(const name of ["create","sound","notes"]){
      const el=root.querySelector(".tempvs-"+name+"-panel");
      if(el)setPanel(el,this.panel===name);
    }
  }
  updateSoundControls(){
    const root=this.containerEl.children[1], plugin=this.plugin;
    if(!root?.hasClass("tempvs-root"))return;
    const active=plugin.active();
    const eligible=Boolean(active && !active.paused && getPhase(active).kind==="work");
    const toggle=root.querySelector(".tempvs-sound-toggle");
    if(toggle){toggle.disabled=!plugin.ambient.playing&&!eligible;toggle.textContent=plugin.ambient.playing?"Ferma suono":"Avvia suono";}
    const status=root.querySelector(".tempvs-sound-status");
    if(status)status.textContent=plugin.ambient.playing
      ? (plugin.ambient.audible?"Suono attivo":"In attesa della concentrazione")
      : (eligible?"Pronto":"Disponibile durante la concentrazione");
  }
  renderNotes(){
    const root=this.containerEl.children[1];
    const area=root.querySelector(".tempvs-note-area")?.value;
    const list=root.querySelector(".tempvs-note-links");
    if(!list)return;
    list.empty();
    const description=this.plugin.config.areas.find(a=>a.name===area)?.description||"";
    const links=noteLinks(description);
    if(!links.length){list.createEl("p",{text:"Nessuna nota collegata."});return;}
    for(const link of links)button(list,link.label,()=>this.plugin.app.workspace.openLinkText(link.path,"",false));
  }
  update(full=false) {
    const root=this.containerEl.children[1];
    if(!root?.hasClass("tempvs-root"))return;
    const plugin=this.plugin;
    const active=plugin.active();
    const phase=active?getPhase(active):null;
    root.querySelector(".tempvs-phase").textContent=phase?phase.label:"Nessuna sessione attiva";
    root.querySelector(".tempvs-clock").textContent=phase?mmss(phase.remaining):"--:--";
    root.querySelector(".tempvs-area").textContent=active?(active.area||active.title):"";
    const pause=root.querySelector(".tempvs-pause-button");
    const finish=root.querySelector(".tempvs-finish-button");
    if(pause){pause.disabled=!active;pause.textContent=active?.paused?"Riprendi":"Pausa";}
    if(finish)finish.disabled=!active;
    this.updateSoundControls();
    const cloud=root.querySelector(".tempvs-cloud-indicator");
    if(cloud){
      const status=plugin.cloudMessage||"Dropbox non collegato";
      cloud.title=status;cloud.setAttribute("aria-label",status+" — Apri impostazioni");
      cloud.toggleClass("tempvs-cloud-error",/errore|error|fallit/i.test(status));
    }
    if(!full)return;
    const dayLabel=root.querySelector(".tempvs-day-label");
    if(dayLabel)dayLabel.textContent=this.day===today()?"Oggi":this.day.split("-").reverse().join("/");
    const list=root.querySelector(".tempvs-sessions");
    list.empty();
    const now=new Date();
    const sessions=plugin.state.sessions.filter(s=>{
      if(s.finished || sessionBounds(s).end<=now)return false;
      return s.date===this.day || (this.day===today()&&sessionBounds(s).start<=now&&sessionBounds(s).end>now);
    }).sort((a,b)=>sessionBounds(a).start-sessionBounds(b).start);
    for(const s of sessions){
      const item=list.createDiv({cls:"tempvs-session"});
      const info=item.createDiv({cls:"tempvs-session-info"});
      info.createEl("strong",{text:s.start+"–"+s.end});
      info.createSpan({text:s.area||s.title});
      if(sessionBounds(s).start>now)
        iconButton(item,"trash-2","Elimina sessione "+(s.area||s.title),()=>plugin.removeSession(s.id));
    }
    if(!sessions.length)list.createEl("p",{cls:"tempvs-muted",text:"Nessuna sessione prevista per questa data."});
    if(this.panel==="notes")this.renderNotes();
  }
}

class TempvsSettings extends PluginSettingTab {
  constructor(app,plugin){super(app,plugin);this.plugin=plugin;}
  display(){
    const el=this.containerEl;el.empty();
    el.createEl("h2",{text:"TEMPVS — Impostazioni"});
    new Setting(el).setName("Layout del timer").setDesc("Automatico, pannello laterale oppure scheda ampia su iPad e desktop.")
      .addDropdown(d=>d.addOptions({auto:"Automatico",side:"Pannello laterale",wide:"Scheda ampia"})
      .setValue(this.plugin.layout).onChange(async v=>{this.plugin.layout=v;await this.plugin.persist();await this.plugin.openView(true);}));
    new Setting(el).setName("Minuti focus predefiniti").addText(t=>t
      .setValue(String(this.plugin.state.defaults.workMinutes)).onChange(async v=>{
        const n=Number(v);if(Number.isInteger(n)&&n>=1&&n<=240)
          await this.plugin.change(()=>{this.plugin.state.defaults.workMinutes=n;});
      }));
    new Setting(el).setName("Pause automatiche").addToggle(t=>t
      .setValue(Boolean(this.plugin.state.defaults.breakEnabled)).onChange(async v=>
        this.plugin.change(()=>{this.plugin.state.defaults.breakEnabled=v;})));
    el.createEl("h3",{text:"Dropbox"});
    renderCloudSettings(el,this.plugin);
    el.createEl("p",{cls:"tempvs-muted",text:"Lo storico delle sessioni rimane salvato per statistiche, backup e sincronizzazione, ma non è mostrato nel timer."});
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
      this.layout = ["auto","side","wide"].includes(data?.ui?.layout) ? data.ui.layout : "auto";
      this.audioKind = ["white","brown","rain","fire"].includes(data?.audio?.kind) ? data.audio.kind : "brown";
      const savedVolume=Number(data?.audio?.volume);
      this.audioVolume=data?.audio?.volume!==undefined&&Number.isFinite(savedVolume)
        ? Math.max(0,Math.min(100,Math.round(savedVolume))) : 25;
    } catch (error) {
      new Notice("TEMPVS: dati non validi, archivio lasciato intatto. " + error.message, 10000);
      throw error;
    }
    this.ambient=new TempoAmbientAudio(()=>this.refreshAudioControls());
    this.lastTick = Date.now();
    this.lastSave = Date.now();
    // Establish the starting phase without issuing a notification on plugin reload.
    this.lastNoticeCheck = Date.now();
    this.lastNotifiedPhase = this.currentNoticePhase(new Date(this.lastNoticeCheck));
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
        this.lastNoticeCheck = this.lastTick;
        this.lastNotifiedPhase = this.currentNoticePhase(new Date(this.lastTick));
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) leaf.view?.draw?.();
        this.syncAmbient();
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
    this.addSettingTab(new TempvsSettings(this.app,this));
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
    this.registerDomEvent(document, "visibilitychange", () => { if (!document.hidden) { this.tick(); this.syncAmbient(); this.refresh(true); } });
    this.refresh(true);
    this.cloud.init().catch(error => {
      this.cloudMessage = "Dropbox: " + error.message;
      this.refresh(true);
    });
  }
  get config() { return this.state.defaults.simple; }
  currentNoticePhase(now = new Date()) {
    const active = getActiveSession(this.state.sessions.filter(s => !s.finished), now);
    if (!active || active.paused) return null;
    const phase = getPhase(active, now);
    return { id: active.id, kind: phase.kind, start: +phase.start, area: active.area || active.title };
  }
  notifyPhaseTransition(nowMs = Date.now()) {
    const current = this.currentNoticePhase(new Date(nowMs));
    const previous = this.lastNotifiedPhase;
    const gap = nowMs - this.lastNoticeCheck;
    this.lastNotifiedPhase = current;
    this.lastNoticeCheck = nowMs;
    // No late or duplicate alerts after sleep, reload, syncing, or tab inactivity.
    if (!current || !previous || current.id !== previous.id ||
        current.kind === previous.kind || gap < 0 || gap > 8000 ||
        nowMs - current.start < 0 || nowMs - current.start > 8000 ||
        document.hidden) return;
    const message = current.kind === "break"
      ? "TEMPVS · Inizia la pausa — " + current.area
      : "TEMPVS · Riprende la concentrazione — " + current.area;
    new Notice(message, 6500);
  }
  refreshAudioControls(){
    for(const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE))leaf.view?.updateSoundControls?.();
  }
  syncAmbient(now=new Date()){
    if(!this.ambient?.playing)return;
    const pending=this.state.sessions.filter(s=>!s.finished);
    const mode=getAmbientFocusMode(pending,now);
    if(mode==="finished"){this.ambient.stop(.9);return;}
    const active=getActiveSession(pending,now);
    this.ambient.setAudible(mode==="focus"&&!active?.paused);
  }
  async toggleAmbient(){
    if(this.ambient.playing){this.ambient.stop(.9);return;}
    const active=this.active();
    if(!active||active.paused||getPhase(active).kind!=="work"){
      new Notice("Avvia il suono durante una sessione di concentrazione non in pausa.");
      return;
    }
    const started=this.ambient.start(this.audioKind,this.audioVolume/100,true);
    if(!(await started))new Notice("Impossibile avviare l'audio: verifica i permessi su Obsidian e iPadOS.");
    else this.syncAmbient();
  }
  async selectAmbient(kind){
    if(!["white","brown","rain","fire"].includes(kind))return;
    this.audioKind=kind;
    const restarted=this.ambient.playing?this.ambient.start(kind,this.audioVolume/100,
      getAmbientFocusMode(this.state.sessions.filter(s=>!s.finished))==="focus"&&!this.active()?.paused):null;
    if(restarted&&!(await restarted))new Notice("Impossibile cambiare il rumore ambientale.");
    this.syncAmbient();
    await this.persist();
  }
  adjustAmbientVolume(value){
    if(!Number.isFinite(value))return;
    this.audioVolume=Math.max(0,Math.min(100,Math.round(value)));
    this.ambient.setVolume(this.audioVolume/100);
  }
  active() {
    const session = getActiveSession(this.state.sessions.filter(s => !s.finished));
    return session || null;
  }
  async openView(forceLayout = false) {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (forceLayout && leaf) { leaf.detach(); leaf = null; }
    if (!leaf) {
      leaf = this.layout === "wide" ? this.app.workspace.getLeaf(true) : (this.app.workspace.getRightLeaf(false) || this.app.workspace.getLeaf(true));
      if (!leaf) return;
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
  }
  openSettings() { this.app.setting?.open(); this.app.setting?.openTabById(this.manifest.id); }
  refresh(full = false) {
    this.syncAmbient();
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
    this.notifyPhaseTransition();
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
    const audio={kind:this.audioKind,volume:this.audioVolume};
    const write = this.writeChain.catch(() => {}).then(() => this.saveData({ archive, cloudData, ui:{compact:this.compact,layout:this.layout},audio }));
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
    this.lastNoticeCheck = Date.now();
    this.lastNotifiedPhase = this.currentNoticePhase(new Date(this.lastNoticeCheck));
  }
  async finish() {
    const s = this.active();
    if (!s) throw Error("Nessuna sessione attiva.");
    await this.change(() => { s.finished = true; s.paused = false; });
    this.lastNoticeCheck = Date.now();
    this.lastNotifiedPhase = this.currentNoticePhase(new Date(this.lastNoticeCheck));
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
    this.ambient?.destroy();
    this.record();
    clearTimeout(this.cloudSaveTimer);
    if (this.dirty || this.cloudDirty) await this.persist().catch(e => console.error("TEMPVS:", e));
    await this.writeChain.catch(() => {});
  }
}
