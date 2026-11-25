import {validDay} from './daily-plan.js';
import {syntaxExtension} from './syntax-editor.js';
import {expandRange} from './plain-syntax.js';
import {readableDuration} from './area-register.js';
import {SessionNotePicker} from './note-picker.js';
import {groupSessions,sessionNotes,updatedSessionNotes} from './session-notes.js';
import {NoteEstimates} from './note-estimates.js';
import {DailyBlocks} from './daily-blocks.js';
import { Plugin, ItemView, Notice, Platform, PluginSettingTab, Setting, setIcon } from "obsidian";
import { getActiveSession, getNextSession, getPhase, sessionBounds, hasSessionOverlaps, localDateString, formatTime, mmss } from "../core/tempo-core.js";
import { normalizeArchive, manualSessionEnd, measuredFocus, parseQuick, planSessions, grossCycle } from "../core/tempo-simple.js";
import { createDropboxSync } from "../core/tempo-dropbox.js";
import { dropboxRequest, createCloudStorage, chooseTempvsConflicts, confirmTempvs } from "./cloud-adapter.js";
import { noteLinks, appendNoteLink } from "./notes-integration.js";
import { TempoAmbientAudio } from "../core/tempo-audio.js";
import { FocusEndChime } from "../core/tempo-chime.js";
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
    if(plugin.cloudInfo?.lastSyncedAt)cloud.createEl("p",{cls:"tempvs-muted",text:"Ultimo controllo Dropbox riuscito: "+new Date(plugin.cloudInfo.lastSyncedAt).toLocaleString("it-IT")});
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
    button(actions, "Salva recupero nel vault", async()=>{
      const copy=plugin.cloud.recovery();
      if(!copy?.data)throw Error("Nessuna copia di recupero disponibile.");
      const filename="tempvs-recupero-"+Date.now()+".json";
      await plugin.app.vault.create(filename,JSON.stringify(copy.data,null,2));
      new Notice("Copia di recupero salvata nel vault: "+filename);
    });
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
    super(leaf); this.plugin = plugin; this.day = today(); this.panel = null; this.creation = "start"; this.panelId="tempvs-"+uuid(); this.planDay=null;
  }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return "TEMPVS"; }
  getIcon() { return "timer"; }
  async onOpen() { this.followDailyNote(); this.draw(); this.loadAllocations(); }
  loadAllocations() {
    this.plugin.daily.loadAllocations(this.day).catch(error=>new Notice(error.message));
  }
  followDailyNote() {
    const date=this.plugin.daily.panelDay();
    if(date){this.day=date;this.dailyContext=this.plugin.app.workspace.getActiveFile()?.path+":"+date;}
  }
  async onClose() {}
  draw() {
    const plugin = this.plugin;
    const root = this.containerEl.children[1];
    root.empty();
    root.addClass("tempvs-root");
    root.toggleClass("tempvs-wide", plugin.layout === "wide");
    const heading = root.createDiv({cls:"tempvs-header"});
    const brand = heading.createDiv({cls:"tempvs-brand"});
    brand.createEl("h3", {text:"TEMPVS"});

    const actions = heading.createDiv({cls:"tempvs-heading-actions"});
    const cloud = iconButton(actions,"cloud","Impostazioni Dropbox",()=>plugin.openSettings());
    cloud.addClass("tempvs-cloud-indicator");
    iconButton(actions,"settings","Impostazioni TEMPVS",()=>plugin.openSettings());
    const timer = root.createDiv({cls:"tempvs-timer"});
    timer.createDiv({cls:"tempvs-phase"});
    const face=timer.createDiv({cls:"tempvs-face"});
    face.createDiv({cls:"tempvs-clock"});
    timer.createDiv({cls:"tempvs-area"});
    const progress=face.createDiv({cls:"tempvs-progress",attr:{role:"progressbar","aria-label":"Avanzamento della fase","aria-valuemin":"0","aria-valuemax":"100"}});
    progress.createDiv({cls:"tempvs-progress-fill"});
    timer.createDiv({cls:"tempvs-timer-hint"});
    const controls = root.createDiv({cls:"tempvs-controls tempvs-primary-controls"});
    const pauseButton = button(controls,"Pausa",()=>plugin.togglePause());
    pauseButton.addClass("mod-cta","tempvs-pause-button");
    const finishButton = button(controls,"Concludi",()=>plugin.finish());
    finishButton.addClass("tempvs-finish-button");
    const sessionHeader = root.createDiv({cls:"tempvs-section-heading"});
    sessionHeader.createEl("h4",{text:"La tua agenda"});
    const nav = sessionHeader.createDiv({cls:"tempvs-date-nav"});
    iconButton(nav,"chevron-left","Giorno precedente",()=>this.selectDay(shiftDate(this.day,-1)));
    const dateLabel = nav.createEl("button",{cls:"tempvs-day-label",text:"Oggi",attr:{title:"Torna a oggi","aria-label":"Data selezionata: oggi. Torna a oggi"}});
    dateLabel.onclick=()=>this.selectDay(today());
    iconButton(nav,"chevron-right","Giorno successivo",()=>this.selectDay(shiftDate(this.day,1)));
    root.createDiv({cls:"tempvs-daily-status",attr:{role:"status"}});
    root.createDiv({cls:"tempvs-sessions"});
    root.createDiv({cls:"tempvs-estimates"});
    const add = button(root,"+ Nuova sessione",()=>this.togglePanel("create"));
    add.addClass("mod-cta","tempvs-add-button");
    add.dataset.panel="create";
    const quickActions = root.createDiv({cls:"tempvs-shortcuts"});
    const planShortcut=iconButton(quickActions,"calendar-days","Pianifica",()=>{this.creation="plan";this.togglePanel("create",true);this.showCreation();});
    planShortcut.createSpan({text:"Pianifica"});
    planShortcut.dataset.panel="create";
    const soundShortcut=iconButton(quickActions,"volume-2","Suoni",()=>this.togglePanel("sound"));
    soundShortcut.createSpan({text:"Suoni"});
    soundShortcut.dataset.panel="sound";
    const panels = root.createDiv({cls:"tempvs-panels"});
    const create = panels.createDiv({cls:"tempvs-panel tempvs-create-panel"});
    create.hidden=true;
    create.createEl("h4",{text:"Crea il tuo prossimo momento"});
    const method = create.createEl("select",{cls:"tempvs-method",attr:{"aria-label":"Metodo di inserimento"}});
    method.createEl("option",{text:"Avvia adesso",value:"start"});
    method.createEl("option",{text:"Pianificazione rapida",value:"plan"});
    method.value=this.creation;
    method.onchange=()=>{this.creation=method.value;this.showCreation();};
    const startBox=create.createDiv({cls:"tempvs-method-start"});
    const form=startBox.createEl("form",{cls:"tempvs-form"});
    const field=(parent,label)=>parent.createEl("label",{cls:"tempvs-field",text:label});
    const area=field(form,"A cosa vuoi dedicarti?").createEl("select",{attr:{"aria-label":"Area"}});
    for(const a of plugin.config.areas)area.createEl("option",{text:a.name,attr:{value:a.name}});
    const gross=field(form,"Durata totale · minuti").createEl("input",{attr:{type:"number",min:"1",max:"1439",value:"30","aria-label":"Durata totale in minuti",placeholder:"Minuti totali"}});
    gross.required=true;
    const presets=form.createDiv({cls:"tempvs-presets",attr:{role:"group","aria-label":"Durate rapide"}});
    const updatePresets=()=>{for(const el of presets.children)el.setAttribute("aria-pressed",String(el.dataset.minutes===gross.value));};
    for(const value of [15,30,60]){
      const preset=button(presets,value+" min",()=>{gross.value=String(value);updatePresets();});
      preset.type="button";preset.dataset.minutes=String(value);
    }
    gross.addEventListener("input",updatePresets);updatePresets();
    form.createEl("p",{cls:"tempvs-help",text:"La durata totale comprende focus e pause. Il timer segue l’orario anche quando sospendi il conteggio del focus."});
    const advanced=form.createEl("details");
    advanced.createEl("summary",{text:"Focus e pause (avanzate)"});
    const focus=field(advanced,"Durata di ogni focus · minuti").createEl("input",{attr:{type:"number",min:"1",max:"240",value:String(plugin.state.defaults.workMinutes),"aria-label":"Minuti focus"}});
    focus.required=true;
    const pause=field(advanced,"Pausa finale · minuti (facoltativa)").createEl("input",{attr:{type:"number",min:"0",max:"1438",placeholder:"Pausa personalizzata (facoltativa)","aria-label":"Minuti di pausa"}});
    form.createEl("button",{text:"Avvia",cls:"mod-cta",attr:{type:"submit"}});
    form.addEventListener("submit",e=>{
      e.preventDefault();
      if(form.dataset.busy)return;
      form.dataset.busy="true";
      const submit=form.querySelector('[type="submit"]');submit.disabled=true;
      plugin.start(area.value,Number(gross.value),Number(focus.value),pause.value===""?undefined:Number(pause.value))
        .then(()=>this.togglePanel(null,true)).catch(err=>new Notice(err.message))
        .finally(()=>{delete form.dataset.busy;submit.disabled=false;});
    });
    const planBox=create.createDiv({cls:"tempvs-method-plan"});
    const plan=planBox.createEl("form",{cls:"tempvs-form"});
    this.planDay=null;
    const dateInput=field(plan,"Giorno").createEl("input",{attr:{type:"date","aria-label":"Data",value:this.day}});
    dateInput.required=true;
    const plannedArea=field(plan,"Area").createEl("select",{attr:{"aria-label":"Area da pianificare"}});
    for(const a of plugin.config.areas)plannedArea.createEl("option",{text:a.name,value:a.name});
    const planFields=plan.createDiv({cls:"tempvs-plan-fields"});
    const startTime=field(planFields,"Ora di inizio").createEl("input",{attr:{type:"time"}});
    const duration=field(planFields,"Durata · minuti").createEl("input",{attr:{type:"number",min:"1",max:"1439",value:"30",required:""}});
    plan.createEl("p",{text:"Lascia vuoto l’orario per assegnare la durata e impostare il timer in seguito."});
    let plannedNote;
    const noteField=plan.createDiv({cls:"tempvs-controls"});
    const noteChoice=button(noteField,"Collega nota dell’attività",()=>new SessionNotePicker(plugin.app,value=>{
      const [note]=noteLinks(value);
      if(!note)throw Error("Nota non valida.");
      plannedNote=note;
      noteChoice.textContent=note.label;
      clearNote.hidden=false;
    }).open());
    noteChoice.type="button";
    const clearNote=button(noteField,"Scollega nota dell’attività",()=>{
      plannedNote=undefined;
      noteChoice.textContent="Collega nota dell’attività";
      clearNote.hidden=true;
    });
    clearNote.type="button";
    clearNote.hidden=true;
    const cycleInput=field(plan,"Pomodoro lordo · minuti (facoltativo)").createEl("input",{attr:{type:"number",min:"1",max:"1439",placeholder:"Es. 60 → 50 focus + 10 pausa","aria-label":"Durata lorda del pomodoro"}});
    const cycleHint=plan.createEl("p",{cls:"tempvs-help",text:"Lascia vuoto per usare il focus predefinito. La durata totale della sessione comprende tutte le pause."});
    cycleInput.addEventListener("input",()=>{
      try{const c=grossCycle(Number(cycleInput.value));cycleHint.textContent=`Ogni pomodoro: ${c.focusMinutes} min focus + ${c.breakMinutes} min pausa. L’ultimo ciclo si ferma alla fine della sessione.`;}
      catch{cycleHint.textContent=cycleInput.value?"Inserisci da 2 a 288 minuti interi.":"Lascia vuoto per usare il focus predefinito.";}
    });
    const batch=plan.createEl("details",{cls:"tempvs-batch"});
    batch.createEl("summary",{text:"Inserisci più sessioni con il testo"});
    batch.createEl("p",{cls:"tempvs-help",text:"14:00-16:00 30m Studio crea quattro sessioni da 25 minuti di concentrazione e 5 di pausa. La fascia può superare la mezzanotte."});
    const lines=field(batch,"Sessioni in formato rapido").createEl("textarea",{attr:{"aria-label":"Sessioni",placeholder:"14:00-16:00 30m Studio\n18:00-19:30 45m Lavoro",rows:"3"}});
    const updatePlanMode=()=>{
      const textMode=Boolean(lines.value.trim());
      for(const input of [plannedArea,startTime,duration,cycleInput])input.disabled=textMode;
      noteField.hidden=textMode;
    };
    lines.addEventListener("input",updatePlanMode);
    plan.createEl("button",{text:"Programma",cls:"mod-cta",attr:{type:"submit"}});
    plan.addEventListener("submit",e=>{
      e.preventDefault();
      if(plan.dataset.busy)return;
      plan.dataset.busy="true";
      const submit=plan.querySelector('[type="submit"]');submit.disabled=true;
      const date=dateInput.value;
      const text=lines.value.trim();
      const area=plugin.config.areas.find(a=>a.name===plannedArea.value);
      const request={area:area?.name,areaId:area?.id,minutes:duration.valueAsNumber};
      if(cycleInput.value)request.cycleMinutes=cycleInput.valueAsNumber;
      const save=text?plugin.schedule(text,date):startTime.value
        ?plugin.scheduleRequests([{...request,start:startTime.value}],date,plannedNote)
        :plugin.assignTime(request,date,plannedNote);
      save.then(()=>{
        clearNote.click();lines.value="";startTime.value="";updatePlanMode();this.togglePanel(null,true);this.selectDay(date);
      }).catch(err=>new Notice(err.message))
        .finally(()=>{delete plan.dataset.busy;submit.disabled=false;});
    });
    const sounds=panels.createDiv({cls:"tempvs-panel tempvs-sound-panel"});
    sounds.hidden=true;
    sounds.createEl("h4",{text:"Suoni di sottofondo"});
    sounds.createEl("p",{cls:"tempvs-help",text:"Attiva il sottofondo in anticipo: partirà alla concentrazione, anche come avviso. Resta silenzioso nelle pause. Tieni Obsidian aperto; dopo la riapertura, attivalo di nuovo."});
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
    const volumeValue=soundVolume.createEl("output",{text:slider.value+"%","attr":{"aria-label":"Volume selezionato"}});
    slider.addEventListener("input",()=>{volumeValue.textContent=slider.value+"%";});
    for(const [name,panel] of [["create",create],["sound",sounds]]){
      const header=panel.createDiv({cls:"tempvs-panel-heading"});
      header.appendChild(panel.querySelector("h4"));
      panel.prepend(header);
      iconButton(header,"x","Chiudi pannello",()=>{this.togglePanel(null,true);root.querySelector(`[data-panel="${name}"]`)?.focus();});
    }
    root.onkeydown=e=>{
      if(e.key==="Escape"&&this.panel){const name=this.panel;this.togglePanel(null,true);root.querySelector(`[data-panel="${name}"]`)?.focus();e.stopPropagation();}
    };
    this.showCreation();
    this.applyPanel();
    this.update(true);
  }
  selectDay(day) {
    this.day=day;
    this.loadAllocations();
    this.showCreation();
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
    if(this.creation==="plan"&&this.planDay!==this.day){
      root.querySelector('input[type="date"]').value=this.day;
      this.planDay=this.day;
    }
  }
  togglePanel(panel, force=false) {
    this.panel=force?panel:(this.panel===panel?null:panel);
    this.showCreation();
    this.applyPanel();
    if(this.panel){
      const el=this.containerEl.children[1].querySelector(".tempvs-"+this.panel+"-panel");
      el?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"nearest"});
      el?.querySelector("select, input, button")?.focus({preventScroll:true});
    }
  }
  applyPanel() {
    const root=this.containerEl.children[1];
    for(const name of ["create","sound"]){
      const el=root.querySelector(".tempvs-"+name+"-panel");
      if(el){el.id=this.panelId+"-"+name;setPanel(el,this.panel===name);}
    }
    for(const trigger of root.querySelectorAll("[data-panel]")){
      trigger.setAttribute("aria-controls",this.panelId+"-"+trigger.dataset.panel);
      trigger.setAttribute("aria-expanded",String(trigger.dataset.panel===this.panel));
      trigger.toggleClass("is-active",trigger.dataset.panel===this.panel);
    }
  }
  updateSoundControls(){
    const root=this.containerEl.children[1], plugin=this.plugin;
    if(!root?.hasClass("tempvs-root"))return;
    const active=plugin.active();
    const eligible=Boolean(active && !active.paused && getPhase(active).kind==="work");
    const toggle=root.querySelector(".tempvs-sound-toggle");
    if(toggle){toggle.disabled=false;toggle.textContent=plugin.ambient.playing?"Disattiva sottofondo":eligible?"Avvia suono":"Attiva per le sessioni";}
    const status=root.querySelector(".tempvs-sound-status");
    if(status)status.textContent=plugin.ambient.playing
      ? (plugin.ambient.audible?"Suono attivo":"Audio pronto · in attesa della concentrazione")
      : (eligible?"Pronto":"Attiva ora per sentire il sottofondo all’inizio delle sessioni");
  }
  renderSessionNotes(parent,notes,session,ids){
    const resources=parent.createDiv({cls:'tempvs-session-resources'});
    const source=this.plugin.dailyNotes?.[session.noteBlockId]?.path||'';
    let more;
    for(const [index,note] of notes.entries()){
      if(index===1){
        more=resources.createEl('details');
        more.createEl('summary',{text:'Risorse ('+(notes.length-1)+')'});
      }
      const row=(more||resources).createDiv({cls:'tempvs-session-note'});
      const label=note.label||note.path;
      const link=row.createEl('a',{cls:'internal-link tempvs-session-resource',text:label,attr:{href:note.path,title:note.path}});
      link.addEventListener('click',event=>{event.preventDefault();void this.plugin.app.workspace.openLinkText(note.path,source,event.metaKey||event.ctrlKey).catch(e=>new Notice(e.message));});
      if(index>0)iconButton(row,'arrow-up','Rendi principale '+label,()=>this.plugin.setSessionNote(ids,'',{primaryPath:note.path}));
      iconButton(row,'x','Scollega '+label,()=>this.plugin.setSessionNote(ids,'',{removePath:note.path}));
    }
    button(resources,notes.length?'Cambia nota':'＋ Collega nota',()=>new SessionNotePicker(this.plugin.app, value=>this.plugin.setSessionNote(ids,value)).open());
  }
  update(full=false) {
    const root=this.containerEl.children[1];
    if(!root?.hasClass("tempvs-root"))return;
    const plugin=this.plugin;
    const active=plugin.active();
    const phase=active?getPhase(active):null;
    const next=active?null:getNextSession(plugin.state.sessions.filter(s=>!s.finished&&!s.dailyRetired&&!s.manualSuperseded));
    const upcoming=next?getPhase(next,sessionBounds(next).start):null;
    root.querySelector(".tempvs-timer").dataset.state=active?.paused?"paused":phase?.kind||"idle";
    root.querySelector(".tempvs-phase").textContent=active?.paused?"Conteggio focus sospeso":phase?phase.label:next?"Prossima sessione":"Pronto per concentrarti";
    root.querySelector(".tempvs-clock").textContent=phase?mmss(phase.remaining):upcoming?mmss(upcoming.remaining):String(plugin.state.defaults.workMinutes).padStart(2,"0")+":00";
    root.querySelector(".tempvs-area").textContent=active?(active.area||active.title):next?(next.area||next.title):"Scegli un’area e inizia una sessione";
    const progress=root.querySelector(".tempvs-progress");
    const timer=root.querySelector(".tempvs-timer");
    const area=plugin.config.areas.find(a=>a.name===(active||next)?.area);
    timer.style.setProperty("--tempvs-area-color",area?.color||"var(--interactive-accent)");
    timer.dataset.style=plugin.timerStyle;
    timer.dataset.size=plugin.clockSize;
    timer.style.setProperty("--tempvs-progress-angle",(phase?.progress||0)*3.6+"deg");
    progress.hidden=!phase||plugin.timerStyle==="digits";
    progress.setAttribute("aria-valuenow",String(Math.round(phase?.progress||0)));
    progress.firstElementChild.style.width=(phase?.progress||0)+"%";
    root.querySelector(".tempvs-timer-hint").textContent=phase
      ? "Fine sessione alle "+formatTime(phase.sessionEnd)+(active.paused?" · L’orario continua a scorrere":"")
      : next?"Inizio alle "+next.start+(next.date!==today()?" · "+next.date:"")+" · fine alle "+next.end:"Il tuo prossimo passo: Nuova sessione";
    const pause=root.querySelector(".tempvs-pause-button");
    const finish=root.querySelector(".tempvs-finish-button");
    if(pause){pause.disabled=!active;pause.textContent=active?.paused?"Riprendi":"Pausa";}
    if(pause)pause.title="Sospende il conteggio del focus; gli orari della sessione continuano a scorrere.";
    if(finish)finish.disabled=!active;
    root.querySelector(".tempvs-primary-controls").hidden=!active;
    this.updateSoundControls();
    const cloud=root.querySelector(".tempvs-cloud-indicator");
    if(cloud){
      const status=plugin.cloudMessage||"Dropbox non collegato";
      cloud.title=status;cloud.setAttribute("aria-label",status+" — Apri impostazioni");
      cloud.toggleClass("tempvs-cloud-error",/errore|error|fallit/i.test(status));
    }
    const dailyStatus=root.querySelector('.tempvs-daily-status');
    if(dailyStatus){
      const path=plugin.app.workspace.getActiveFile?.()?.path;
      const error=plugin.daily?.errors.get(path);
      dailyStatus.textContent=error?'TEMPVS: '+error:'';
      dailyStatus.hidden=!error;
      dailyStatus.toggleClass('tempvs-daily-error',Boolean(error));
    }
    if(!full)return;
    const dayLabel=root.querySelector(".tempvs-day-label");
    if(dayLabel){
      dayLabel.textContent=this.day===today()?"Oggi":new Intl.DateTimeFormat("it-IT",{day:"numeric",month:"short"}).format(new Date(this.day+"T12:00:00"));
      dayLabel.setAttribute("aria-label","Data selezionata: "+this.day+". Torna a oggi");
    }
    const list=root.querySelector(".tempvs-sessions");
    const pendingTime=new Map([...list.querySelectorAll("[data-allocation]")].map(input=>[input.dataset.allocation,input.value]));
    const focusedTime=list.ownerDocument?.activeElement?.dataset?.allocation;
    list.empty();
    const now=new Date();
    const registered=plugin.state.history.filter(h=>h.registerBlock&&h.registerDay===this.day&&(!h.planned||h.start));
    const budgets=Object.values(plugin.dailyNotes||{}).find(b=>b.date===this.day)?.budgets||[];
    for(const b of budgets){
      const difference=b.seconds-b.assigned;
      list.createEl('p',{text:b.area+' · '+readableDuration(b.assigned)+' su '+readableDuration(b.seconds)+
        (difference?' · '+readableDuration(Math.abs(difference))+(difference>0?' disponibili':' oltre il budget'):'')});
    }
    if(registered.length){
      const table=list.createEl('table'),head=table.createEl('thead').createEl('tr'),body=table.createEl('tbody');
      for(const label of ['Area','Orario','Nota','Durata'])head.createEl('th',{text:label});
      for(const record of registered){
        const row=body.createEl('tr');
        row.createEl('td',{text:record.area});row.createEl('td',{text:record.start||'—'});
        const cell=row.createEl('td'),note=record.linkedNotes[0];
        if(note)button(cell,note.label,()=>plugin.app.workspace.openLinkText(note.path,plugin.dailyNotes[record.registerBlock]?.path||'',false));
        else cell.textContent='—';
        row.createEl('td',{text:readableDuration(Math.round(record.minutes*60))});
      }
      const totals=new Map();
      for(const r of registered)totals.set(r.area,(totals.get(r.area)||0)+r.minutes);
      if(!budgets.length)list.createEl('small',{text:[...totals].map(([area,min])=>area+' '+min+' min').join(' · ')});
    }
    for(const allocation of plugin.allocatedOn(this.day)){
      const item=list.createDiv({cls:"tempvs-session"});
      const form=item.createEl("form",{cls:"tempvs-form"});
      form.createEl("strong",{text:allocation.area+" · "+allocation.minutes+" min · Da programmare"});
      if(allocation.note)button(item,allocation.note.label,()=>plugin.app.workspace.openLinkText(allocation.note.path,allocation.file?.path||"",false));
      const time=form.createEl("label",{text:"Ora di inizio"}).createEl("input",{attr:{type:"time",required:""}});
      time.dataset.allocation=allocation.id;
      time.value=pendingTime.get(allocation.id)||"";
      if(focusedTime===allocation.id)time.focus({preventScroll:true});
      const submit=form.createEl("button",{text:"Imposta orario",attr:{type:"submit"}});
      form.onsubmit=async event=>{
        event.preventDefault();
        if(submit.disabled)return;
        submit.disabled=true;
        try{await plugin.scheduleAllocation(allocation,time.value);}
        catch(error){new Notice(error.message);}
        finally{submit.disabled=false;}
      };
      if(allocation.file)button(item,"Apri nota giornaliera",()=>plugin.app.workspace.openLinkText(allocation.file.path,"",false));
      iconButton(item,"trash-2","Elimina tempo assegnato",()=>plugin.removeAllocation(allocation));
    }
    const sessions=plugin.state.sessions.filter(s=>{
      if(s.registerMinutes||s.registerPlanned)return false;
      if(s.dailyRetired||s.manualSuperseded)return false;
      return s.date===this.day || (this.day===today()&&sessionBounds(s).start<=now&&sessionBounds(s).end>now);
    }).sort((a,b)=>sessionBounds(a).start-sessionBounds(b).start);
    const expanded=this.expandedGroups??=new Set();
    for(const group of groupSessions(sessions,plugin.estimates?.notes||[])){
      const first=group.sessions[0],last=group.sessions.at(-1),ids=group.sessions.map(s=>s.id);
      const item=list.createDiv({cls:"tempvs-session tempvs-session-group"});
      const info=item.createDiv({cls:"tempvs-session-info"});
      const heading=info.createDiv({cls:"tempvs-session-heading"});
      heading.createEl("strong",{text:first.start+"–"+last.end});
      const badge=heading.createSpan({cls:"tempvs-area-mark",text:first.area||first.title});
      badge.style.setProperty("--tempvs-area-color",plugin.config.areas.find(a=>a.name===first.area)?.color||"var(--interactive-accent)");
      const current=group.sessions.find(s=>s.id===active?.id);
      item.toggleClass("is-current",Boolean(current));
      const done=group.sessions.filter(s=>s.finished||sessionBounds(s).end<=now).length;
      info.createEl("small",{cls:"tempvs-muted",text:`${ids.length} ${ids.length===1?'sessione':'sessioni'} · ${Math.round((sessionBounds(last).end-sessionBounds(first).start)/60000)} min · ${done} concluse`+(current?' · '+(current.paused?'Focus sospeso':'In corso'):'')});
      this.renderSessionNotes(info,group.notes,first,ids);
      if(ids.length>1){
        const detail=info.createEl("details",{cls:"tempvs-session-cycles"});
        const key=ids.join('|');detail.open=expanded.has(key);
        detail.addEventListener('toggle',()=>{if(detail.open)expanded.add(key);else expanded.delete(key);});
        detail.createEl("summary",{text:"Singole sessioni"});
        for(const s of group.sessions){
          const row=detail.createDiv({cls:"tempvs-session-cycle"});
          row.createEl("span",{text:s.start+'–'+s.end+' · '+(s.finished||sessionBounds(s).end<=now?'Conclusa':s.id===active?.id?'In corso':'Programmata')+(s.cycleMinutes?` · ${s.workMinutes}/${s.cycleMinutes-s.workMinutes}`:'')});
          this.renderSessionNotes(row,group.notes,s,[s.id]);
          if(!s.finished&&sessionBounds(s).start>now)iconButton(row,"trash-2","Elimina sessione "+s.start,()=>plugin.removeSession(s.id));
        }
      }else if(!first.finished&&sessionBounds(first).start>now){
        iconButton(item,"trash-2","Elimina sessione "+(first.area||first.title),()=>plugin.removeSession(first.id));
      }
    }
    if(!sessions.length&&!registered.length&&!budgets.length&&!plugin.allocatedOn(this.day).length){
      const empty=list.createDiv({cls:"tempvs-empty"});
      setIcon(empty.createDiv({cls:"tempvs-empty-icon"}),"calendar-check");
      empty.createEl("strong",{text:"Spazio per i tuoi progetti"});
      empty.createEl("p",{text:"Nessuna sessione in agenda. Avvia un focus o pianifica un momento per questa giornata."});
    }
    plugin.estimates?.renderPanel(root.querySelector(".tempvs-estimates"),this.day);
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
    for(const [key,label,choices] of [
      ["timerStyle","Aspetto del timer",{digits:"Sole cifre",bar:"Cifre con barra",ring:"Cifre con anello"}],
      ["clockSize","Dimensione delle cifre",{small:"Piccole",medium:"Medie",large:"Grandi"}]
    ]){
      new Setting(el).setName(label).addDropdown(d=>d.addOptions(choices).setValue(this.plugin[key]).onChange(async value=>{
        this.plugin[key]=value;
        this.plugin.refresh(true);
        await this.plugin.persist();
      }));
    }
    new Setting(el).setName("Minuti focus predefiniti").addText(t=>t
      .setValue(String(this.plugin.state.defaults.workMinutes)).onChange(async v=>{
        const n=Number(v);if(Number.isInteger(n)&&n>=1&&n<=240)
          await this.plugin.change(()=>{this.plugin.state.defaults.workMinutes=n;});
      }));
    new Setting(el).setName("Pause automatiche").addToggle(t=>t
      .setValue(Boolean(this.plugin.state.defaults.breakEnabled)).onChange(async v=>
        this.plugin.change(()=>{this.plugin.state.defaults.breakEnabled=v;})));
    new Setting(el).setName("Avvisi sonori").setDesc("Segnale udibile ai cambi tra concentrazione e pausa, quando Obsidian è in primo piano.")
      .addToggle(t=>t.setValue(this.plugin.chimeEnabled).onChange(async value=>{
        this.plugin.chimeEnabled=value;
        if(value)this.plugin.chime.arm();
        await this.plugin.persist();
      }));
    new Setting(el).setName("Prova avviso").setDesc("Tocca per attivare e verificare l\u0027audio su questo dispositivo.")
      .addButton(b=>b.setButtonText("Riproduci").onClick(()=>{
        void this.plugin.chime.play("break").then(ok=>{
          if(!ok)new Notice("Audio non disponibile: controlla il volume e riprova toccando Riproduci.");
        });
      }));
    el.createEl("h3",{text:"Aree"});
    el.createEl("p",{cls:"tempvs-muted",text:"Rinomina, riordina o elimina le aree senza perdere sessioni e statistiche. La descrizione Markdown resta associata all'area."});
    for(const [index,area] of this.plugin.config.areas.entries()){
      const section=el.createDiv({cls:"tempvs-area-config"});
      const heading=new Setting(section).setName(area.name);
      const nameInput=section.createEl("input",{attr:{type:"text",maxlength:"80","aria-label":"Nuovo nome area "+area.name,value:area.name}});
      const colorInput=section.createEl("input",{attr:{type:"color","aria-label":"Colore area "+area.name,value:area.color||"#54769b"}});
      const details=section.createEl("details");
      details.createEl("summary",{text:"Descrizione Markdown"});
      const description=details.createEl("textarea",{attr:{rows:"4","aria-label":"Descrizione area "+area.name}});
      description.value=area.description||"";
      const resources=section.createEl("details");
      resources.createEl("summary",{text:"Risorse dell’area"});
      for(const note of noteLinks(area.description))button(resources,note.label,()=>this.plugin.app.workspace.openLinkText(note.path,"",false));
      button(resources,"Collega nota aperta all’area",async()=>{
        await this.plugin.attachActiveNote(area.name);
        this.display();
      });
      heading.addButton(b=>b.setButtonText("Salva").onClick(async()=>{
        try{
          const next=nameInput.value.trim();
          if(!next||next.length>80||this.plugin.config.areas.some(a=>a.name!==area.name&&a.name.toLocaleLowerCase()===next.toLocaleLowerCase()))throw Error("Nome area non valido o già presente.");
          const previous=area.name;
          await this.plugin.change(()=>{
            const stored=this.plugin.config.areas.find(a=>a.name===previous);
            if(!stored)throw Error("Area non disponibile.");
            stored.name=next;stored.color=colorInput.value;stored.description=description.value;
            if(next!==previous)this.plugin.remapArea(previous,next);
          });
          this.display();
          new Notice("Area aggiornata.");
        }catch(e){new Notice(e.message);}
      }));
      heading.addButton(b=>b.setButtonText("↑").setTooltip("Sposta in alto").setDisabled(index===0).onClick(async()=>{
        try{await this.plugin.change(()=>{const a=this.plugin.config.areas;[a[index-1],a[index]]=[a[index],a[index-1]];});this.display();}
        catch(e){new Notice(e.message);}
      }));
      heading.addButton(b=>b.setButtonText("↓").setTooltip("Sposta in basso").setDisabled(index===this.plugin.config.areas.length-1).onClick(async()=>{
        try{await this.plugin.change(()=>{const a=this.plugin.config.areas;[a[index],a[index+1]]=[a[index+1],a[index]];});this.display();}
        catch(e){new Notice(e.message);}
      }));
      if(this.plugin.config.areas.length>1){
        const transfer=section.createEl("select",{attr:{"aria-label":"Sposta i dati di "+area.name+" nell'area"}});
        for(const other of this.plugin.config.areas.filter(a=>a.name!==area.name))
          transfer.createEl("option",{text:"Trasferisci in "+other.name,value:other.name});
        heading.addButton(b=>b.setButtonText("Elimina").onClick(async()=>{
          const target=transfer.value;
          if(!await confirmTempvs(this.plugin.app,"Eliminare «"+area.name+"»?","Le sessioni, le attività e lo storico verranno trasferiti nell'area «"+target+"» senza cancellare i tempi registrati."))return;
          try{
            await this.plugin.change(()=>{
              this.plugin.remapArea(area.name,target);
              this.plugin.config.areas=this.plugin.config.areas.filter(a=>a.name!==area.name);
            });
            this.display();new Notice("Area eliminata e dati trasferiti.");
          }catch(e){new Notice(e.message);}
        }));
      }
    }
    const addArea=new Setting(el).setName("Nuova area");
    let addName="";
    addArea.addText(t=>t.setPlaceholder("Nome della nuova area").onChange(v=>{addName=v;}));
    addArea.addButton(b=>b.setButtonText("Aggiungi").onClick(async()=>{
      const name=addName.trim();
      if(!name||name.length>80||this.plugin.config.areas.some(a=>a.name.toLocaleLowerCase()===name.toLocaleLowerCase()))return new Notice("Nome area non valido o già utilizzato.");
      try{
        await this.plugin.change(()=>this.plugin.config.areas.push({name,description:"",color:"#54769B"}));
        this.display();new Notice("Area aggiunta.");
      }catch(e){new Notice(e.message);}
    }));
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
      this.allocations=Array.isArray(data?.allocations)?data.allocations:[];
      this.dailyNotes=Object.assign(Object.create(null),data?.dailyNotes||{});
      this.cloudData = data?.cloudData && typeof data.cloudData === "object" ? data.cloudData : {};
      this.compact = typeof data?.ui?.compact === "boolean" ? data.ui.compact : Platform.isMobile;
      this.layout = ["auto","side","wide"].includes(data?.ui?.layout) ? data.ui.layout : "auto";
      this.timerStyle=["digits","ring"].includes(data?.ui?.timerStyle)?data.ui.timerStyle:"bar";
      this.clockSize=["small","large"].includes(data?.ui?.clockSize)?data.ui.clockSize:"medium";
      this.audioKind = ["white","brown","rain","fire"].includes(data?.audio?.kind) ? data.audio.kind : "brown";
      const savedVolume=Number(data?.audio?.volume);
      this.audioVolume=data?.audio?.volume!==undefined&&Number.isFinite(savedVolume)
        ? Math.max(0,Math.min(100,Math.round(savedVolume))) : 25;
      this.chimeEnabled=data?.notifications?.sound!==false;
    } catch (error) {
      new Notice("TEMPVS: dati non validi, archivio lasciato intatto. " + error.message, 10000);
      throw error;
    }
    this.ambient=new TempoAmbientAudio(()=>this.refreshAudioControls());
    this.chime=new FocusEndChime();
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
        await this.daily?.reconcilePlans();
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
    this.estimates=new NoteEstimates(this);
    this.registerEditorExtension?.(syntaxExtension());
    this.daily=new DailyBlocks(this);this.daily.start();
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
    // iPadOS/WebKit requires a real user gesture before Web Audio can become audible.
    // Prepare the cue on normal interaction, independently from ambient sounds.
    const armChime=()=>{if(this.chimeEnabled)this.chime.arm();};
    this.registerDomEvent(document, "pointerdown", armChime);
    this.registerDomEvent(document, "touchstart", armChime);
    this.registerDomEvent(document, "keydown", armChime);
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
    if(this.chimeEnabled)void this.chime.play(current.kind).catch(error=>
      console.warn("TEMPVS: avviso acustico non disponibile",error));
  }
  refreshAudioControls(){
    for(const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE))leaf.view?.updateSoundControls?.();
  }
  syncAmbient(now=new Date()){
    if(!this.ambient?.playing)return;
    const pending=this.state.sessions.filter(s=>!s.finished);
    const mode=getAmbientFocusMode(pending,now);
    const active=getActiveSession(pending,now);
    this.ambient.setAudible(mode==="focus"&&!active?.paused);
    this.refreshAudioControls();
  }
  async toggleAmbient(){
    if(this.ambient.playing){this.ambient.stop(.9);return;}
    const active=this.active();
    const audible=Boolean(active&&!active.paused&&getPhase(active).kind==="work");
    const started=this.ambient.start(this.audioKind,this.audioVolume/100,audible);
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
    if(full)this.daily?.refresh();
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
    if(Math.floor(now/15000)!==Math.floor((now-1000)/15000))this.daily?.refresh();
    this.refresh(Math.floor(now / 60000) !== Math.floor((now-1000)/60000));
  }
  async persist() {
    const archive = JSON.parse(JSON.stringify(this.state));
    const cloudData = this.cloudStorage?.snapshot() || {};
    const audio={kind:this.audioKind,volume:this.audioVolume};
    const notifications={sound:this.chimeEnabled};
    const allocations=JSON.parse(JSON.stringify(this.allocations));
    const dailyNotes=JSON.parse(JSON.stringify(this.dailyNotes||{}));
    const write = this.writeChain.catch(() => {}).then(() => this.saveData({ archive, cloudData, ui:{compact:this.compact,layout:this.layout,timerStyle:this.timerStyle,clockSize:this.clockSize},audio,notifications,dailyNotes,allocations }));
    this.writeChain = write;
    await write;
    if (JSON.stringify(this.state) === JSON.stringify(archive)) this.dirty = false;
    if (JSON.stringify(this.cloudStorage?.snapshot() || {}) === JSON.stringify(cloudData)) this.cloudDirty = false;
  }
  async change(mutator) {
    if(this.changing)throw Error('Salvataggio in corso. Attendi prima di riprovare.');
    this.changing=true;
    try {
      this.record();
      const previous=JSON.stringify(this.state);
      const previousAllocations=this.allocations;
      try {mutator();this.state=normalizeArchive(this.state);await this.persist();}
      catch(error){this.state=JSON.parse(previous);this.allocations=previousAllocations;this.refresh(true);throw error;}
      // Local save succeeded: failure to persist sync metadata must not undo it.
      try {this.cloud?.changed();await this.persist();}
      catch(error){new Notice('TEMPVS: dati salvati in locale; sincronizzazione da riprovare. '+error.message);}
      this.refresh(true);
    } finally {this.changing=false;}
    await this.daily?.archiveChanged();
  }
  setSessionNote(ids,input,options={}){
    const operation=(this.noteWrite || Promise.resolve()).then(()=>this.applySessionNote(ids,input,options));
    this.noteWrite=operation.catch(()=>{});
    return operation;
  }
  async applySessionNote(ids,input,options){
    const updates=new Map();
    for(const id of ids){
      const session=this.state.sessions.find(s=>s.id===id);
      if(!session)throw Error('La sessione non è più disponibile.');
      const links=updatedSessionNotes(session,input,{...options,replacePrimary:true,estimates:this.estimates?.notes||[]});
      updates.set(id,input.trim()?links.slice(0,1):links);
    }
    const bindings=new Set(ids.map(id=>this.state.sessions.find(s=>s.id===id).noteBlockId).filter(Boolean));
    if(bindings.size){
      if(bindings.size!==1)throw Error('Modifica una giornata alla volta.');
      await this.daily.updateSessionNotes([...bindings][0],updates);
    }else await this.change(()=>{for(const [id,notes] of updates){const s=this.state.sessions.find(s=>s.id===id);s.linkedNotes=notes;delete s.noteEstimateId;}});
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
  remapArea(from,to){
    for(const session of this.state.sessions){
      if(session.area===from)session.area=to;
      if(session.title===from)session.title=to;
    }
    for(const item of this.state.history||[]){
      if(item.area===from)item.area=to;
      if(item.title===from)item.title=to;
    }
    for(const task of this.state.tasks||[])if(task.area===from)task.area=to;
    if(this.state.appearance?.areaColors && Object.prototype.hasOwnProperty.call(this.state.appearance.areaColors,from)){
      if(!Object.prototype.hasOwnProperty.call(this.state.appearance.areaColors,to))
        this.state.appearance.areaColors[to]=this.state.appearance.areaColors[from];
      delete this.state.appearance.areaColors[from];
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
    const requests = parseQuick(text.split('\n').map(line => expandRange(line.trim())).join('\n'), this.config.areas);
    if (!requests.length) throw Error("Inserisci almeno una sessione.");
    if (requests.some(r => !r.start)) throw Error("Per ora specifica +HH:MM per ogni sessione. Le fasce automatiche saranno aggiunte successivamente.");
    await this.scheduleRequests(requests,date);
    new Notice("TEMPVS: " + requests.length + " sessioni programmate.");
  }
  async assignTime(request,date,note) {
    if(!validDay(date))throw Error("Data non valida.");
    if(!this.config.areas.some(area=>area.name===request.area))throw Error("Area non valida.");
    if(!Number.isInteger(request.minutes)||request.minutes<1||request.minutes>1439)
      throw Error("Durata da 1 a 1439 minuti.");
    planSessions([request],[],[],this.state.defaults);
    await this.daily.writeAllocation({...request,date,note});
  }
  allocatedOn(date) {
    const entries=this.daily.allocationsByDay.get(date)||[];
    const unified=this.state.history.flatMap(record=>{
      if(!record.planned||record.start||record.registerDay!==date)return [];
      const binding=this.dailyNotes[record.registerBlock];
      const file=binding&&this.app.vault?.getAbstractFileByPath(binding.path);
      const raw=binding?.source.split(/\r?\n/)[record.sourceRow];
      return file&&raw?[{...record,id:record.sessionId,file,raw,index:record.sourceRow,note:record.linkedNotes[0],unified:true}]:[];
    });
    return [...unified,...entries,...this.allocations.filter(item=>item.date===date&&!entries.some(entry=>entry.id===item.id))];
  }
  removeAllocation(entry) {
    if(entry.unified)return this.daily.updateUnifiedAllocation(entry);
    return entry.file?this.daily.consumeAllocation(entry):this.change(()=>{
      this.allocations=this.allocations.filter(item=>item.id!==entry.id);
    });
  }
  async scheduleRequests(requests,date,note) {
    if(!validDay(date))throw Error("Data non valida.");
    await this.change(()=>{
      const sessions=this.plannedSessions(requests,date);
      if(note)for(const session of sessions)session.linkedNotes=[note];
      this.state.sessions.push(...sessions);
    });
  }
  plannedSessions(requests,date) {
    const result=planSessions(requests,[],this.state.sessions.filter(s=>!s.finished&&!s.dailyRetired&&!s.manualSuperseded),
      this.state.defaults,new Date(),uuid,date);
    if(result.remainder||!result.sessions.length)throw Error("Programmazione incompleta.");
    return result.sessions;
  }
  async scheduleAllocation(allocation,start) {
    if(allocation.unified){
      if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||new Date(allocation.date+'T'+start)<=new Date())
        throw Error('Scegli un orario futuro per avviare il timer.');
      return this.daily.updateUnifiedAllocation(allocation,start);
    }
    const {date,note,area,areaId,minutes,cycleMinutes,focusMinutes,customBreakMinutes}=allocation;
    const commit=()=>this.change(()=>{
      if(!allocation.file&&!this.allocations.some(entry=>entry.id===allocation.id))
        throw Error("Tempo assegnato non più disponibile.");
      const currentArea=this.config.areas.find(item=>(areaId&&item.id===areaId)||item.name===area);
      if(!currentArea)throw Error("Area non più disponibile.");
      const request={area:currentArea.name,areaId:currentArea.id,minutes,cycleMinutes,focusMinutes,customBreakMinutes,start};
      const [session]=this.plannedSessions([request],date);
      if(note){
        const target=this.app.metadataCache?.getFirstLinkpathDest?.(note.path.split('#')[0],allocation.file?.path||'');
        const anchor=note.path.includes('#')?note.path.slice(note.path.indexOf('#')):'';
        session.linkedNotes=[target?{...note,path:target.path+anchor}:note];
      }
      this.state.sessions.push(session);
      this.allocations=this.allocations.filter(entry=>entry.id!==allocation.id);
    });
    if(allocation.file)await this.daily.consumeAllocation(allocation,commit);
    else await commit();
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
    this.daily?.destroy();
    await this.daily?.chain.catch(()=>{});
    this.cloud?.destroy();
    this.chime?.destroy();
    this.ambient?.destroy();
    this.record();
    clearTimeout(this.cloudSaveTimer);
    if (this.dirty || this.cloudDirty) await this.persist().catch(e => console.error("TEMPVS:", e));
    await this.writeChain.catch(() => {});
  }
}
