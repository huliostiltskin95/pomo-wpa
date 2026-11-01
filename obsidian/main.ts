import { TempoAmbientAudio } from "../core/tempo-audio.js";
import { ItemView, Modal, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from "obsidian";
import { DEFAULTS, getActiveSession, getNextSession, getPhase, localDateString, mmss, normalizeSession, pauseMinutes, sessionBounds, validSession } from "../core/tempo-core.js";

const VIEW_TYPE = "tempo-agenda-view";

type TempoSession = {
  id: string; title: string; date: string; start: string; end: string;
  workMinutes: number; breakEnabled: boolean;
};
type TempoData = { sessions: TempoSession[]; defaults: { workMinutes: number; breakEnabled: boolean } };

export default class TempoPlugin extends Plugin {
  data: TempoData = { sessions: [], defaults: { ...DEFAULTS } };
  ambient = new TempoAmbientAudio(() => this.refreshViews());
  soundKind = "brown";
  soundVolume = 25;
  private soundPhaseKey: string | null = null;

  syncFocusAudio(now = new Date()) {
    const session = getActiveSession(this.data.sessions, now);
    const phase = session ? getPhase(session, now) : null;
    const key = phase?.kind === "work" ? `${session!.id}:${phase.start.getTime()}` : null;
    if (this.ambient.playing && key !== this.soundPhaseKey) this.ambient.stop(.9);
    this.soundPhaseKey = key;
  }
  async toggleSound() {
    if (this.ambient.playing) { this.ambient.stop(.9); return; }
    const active = getActiveSession(this.data.sessions, new Date());
    if (!active || getPhase(active).kind !== "work") {
      new Notice("Il suono è disponibile soltanto durante la concentrazione.");
      return;
    }
    this.soundPhaseKey = `${active.id}:${getPhase(active).start.getTime()}`;
    if (!(await this.ambient.start(this.soundKind, this.soundVolume / 100))) {
      new Notice("Impossibile avviare il suono sul dispositivo.");
    }
    this.syncFocusAudio();
  }

  async onload() {
    await this.loadTempoData();
    this.registerView(VIEW_TYPE, leaf => new TempoView(leaf, this));
    this.addRibbonIcon("timer", "Apri Tempo", () => this.activateView());
    this.addCommand({ id: "open-tempo", name: "Apri agenda Tempo", callback: () => this.activateView() });
    this.addCommand({ id: "add-tempo-session", name: "Programma sessione Tempo", callback: () => new SessionModal(this.app, this).open() });
    this.addSettingTab(new TempoSettingTab(this.app, this));
    this.registerInterval(window.setInterval(() => { this.syncFocusAudio(); this.refreshViews(); }, 1000));
  }

  onunload() { this.ambient.destroy(); this.app.workspace.detachLeavesOfType(VIEW_TYPE); }

  async loadTempoData() {
    const saved = await this.loadData() as Partial<TempoData> | null;
    const sessions = Array.isArray(saved?.sessions) ? saved!.sessions.map(normalizeSession).filter(validSession) as TempoSession[] : [];
    const savedWork = Number(saved?.defaults?.workMinutes);
    this.data = {
      sessions,
      defaults: {
        workMinutes: Number.isInteger(savedWork) && savedWork >= 1 && savedWork <= 240 ? savedWork : DEFAULTS.workMinutes,
        breakEnabled: saved?.defaults?.breakEnabled !== undefined ? Boolean(saved.defaults.breakEnabled) : DEFAULTS.breakEnabled
      }
    };
  }

  async saveTempoData() { await this.saveData(this.data); this.syncFocusAudio(); this.refreshViews(); }
  refreshViews() { this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach(leaf => (leaf.view as TempoView).render()); }

  async activateView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    const leaf = leaves[0] ?? this.app.workspace.getRightLeaf(false);
    if (!leaf) return;
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  async removeSession(id: string) { this.data.sessions = this.data.sessions.filter(session => session.id !== id); await this.saveTempoData(); new Notice("Sessione eliminata."); }

  async addSession(session: TempoSession) {
    if (!validSession(session)) { new Notice("Dati della sessione non validi."); return; }
    const start = sessionBounds(session).start.getTime(), end = sessionBounds(session).end.getTime();
    const overlap = this.data.sessions.some(existing => existing.date === session.date &&
      start < sessionBounds(existing).end.getTime() && end > sessionBounds(existing).start.getTime());
    if (overlap) { new Notice("La sessione si sovrappone a un'altra sessione."); return; }
    this.data.sessions.push(session);
    this.data.sessions.sort((a, b) => sessionBounds(a).start.getTime() - sessionBounds(b).start.getTime());
    await this.saveTempoData();
    new Notice("Sessione aggiunta a Tempo.");
  }
}

class TempoView extends ItemView {
  plugin: TempoPlugin;
  constructor(leaf: WorkspaceLeaf, plugin: TempoPlugin) { super(leaf); this.plugin = plugin; }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return "Tempo"; }
  getIcon() { return "timer"; }

  async onOpen() { this.render(); }
  async onClose() {}

  render() {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass("tempo-view");
    const now = new Date();
    const active = getActiveSession(this.plugin.data.sessions, now);
    const next = getNextSession(this.plugin.data.sessions, now);
    const heading = root.createEl("div", { cls: "tempo-view-heading" });
    heading.createEl("h2", { text: "Tempo" });
    const add = heading.createEl("button", { text: "＋ Sessione", cls: "mod-cta" });
    add.addEventListener("click", () => new SessionModal(this.app, this.plugin).open());

    const timer = root.createDiv("tempo-timer");
    if (active) {
      const phase = getPhase(active, now);
      timer.createEl("div", { cls: "tempo-eyebrow", text: phase.label.toUpperCase() });
      timer.createEl("div", { cls: "tempo-clock", text: mmss(phase.remaining) });
      timer.createEl("div", { cls: "tempo-session-title", text: active.title });
      timer.createEl("div", { cls: "tempo-muted", text: `Sessione ${active.start}–${active.end} · fine ${new Intl.DateTimeFormat("it-IT",{hour:"2-digit",minute:"2-digit"}).format(phase.sessionEnd)}` });
      const progress = timer.createDiv("tempo-progress");
      progress.createDiv({ cls: "tempo-progress-fill" }).style.width = `${phase.progress}%`;
    } else if (next) {
      timer.createEl("div", { cls: "tempo-eyebrow", text: "PROSSIMA SESSIONE" });
      timer.createEl("div", { cls: "tempo-clock", text: next.start });
      timer.createEl("div", { cls: "tempo-session-title", text: next.title });
      timer.createEl("div", { cls: "tempo-muted", text: `${next.date} · ${next.workMinutes} min concentrazione${next.breakEnabled ? ` + ${pauseMinutes(next.workMinutes)} min pausa` : " · senza pause"}` });
    } else {
      timer.createEl("div", { cls: "tempo-eyebrow", text: "NESSUNA SESSIONE ATTIVA" });
      timer.createEl("div", { cls: "tempo-clock", text: `${String(this.plugin.data.defaults.workMinutes).padStart(2,"0")}:00` });
      timer.createEl("div", { cls: "tempo-muted", text: "Programma una sessione per iniziare." });
    }

    const sound = root.createDiv("tempo-sound-controls");
    sound.createEl("h3", { text: "Suoni di sottofondo" });
    const soundSelect = sound.createEl("select", { attr: { "aria-label": "Suono ambientale" } });
    for (const [value, label] of [["white", "Rumore bianco"], ["brown", "Rumore marrone"], ["rain", "Pioggia"], ["fire", "Caminetto"]]) {
      const option = soundSelect.createEl("option", { text: label, value });
      option.selected = this.plugin.soundKind === value;
    }
    soundSelect.addEventListener("change", () => {
      this.plugin.soundKind = soundSelect.value;
      if (this.plugin.ambient.playing) { this.plugin.ambient.stop(0); void this.plugin.toggleSound(); }
    });
    const volume = sound.createEl("input", { type: "range", attr: { min: "0", max: "100", "aria-label": "Volume" } });
    volume.value = String(this.plugin.soundVolume);
    volume.addEventListener("input", () => {
      this.plugin.soundVolume = Number(volume.value);
      this.plugin.ambient.setVolume(this.plugin.soundVolume / 100);
    });
    const soundButton = sound.createEl("button", { text: this.plugin.ambient.playing ? "Ferma suono" : "Avvia suono" });
    soundButton.addEventListener("click", () => void this.plugin.toggleSound());
    sound.createEl("p", { cls: "tempo-muted", text: "Audio continuo durante il focus, dissolvenza alla pausa. L'avvio richiede un clic." });

    root.createEl("h3", { text: "Sessioni programmate" });
    const upcoming = this.plugin.data.sessions.filter(s => sessionBounds(s).end > now).slice(0, 12);
    if (!upcoming.length) root.createEl("p", { cls: "tempo-muted", text: "Nessuna sessione futura." });
    for (const session of upcoming) {
      const row = root.createDiv("tempo-session-row");
      const time = row.createDiv("tempo-session-time");
      time.createEl("strong", { text: session.start + "–" + session.end });
      time.createEl("span", { text: session.date });
      const details = row.createDiv("tempo-session-details");
      details.createEl("strong", { text: session.title });
      details.createEl("span", { text: `${session.workMinutes} min lavoro${session.breakEnabled ? ` · ${pauseMinutes(session.workMinutes)} min pausa` : " · senza pause"}` });
      const remove = row.createEl("button", { text: "×", cls: "tempo-remove-session", attr: { "aria-label": "Elimina sessione" } });
      remove.addEventListener("click", async () => { if (window.confirm(`Eliminare la sessione “${session.title}”?`)) await this.plugin.removeSession(session.id); });
    }
  }
}

class SessionModal extends Modal {
  plugin: TempoPlugin;
  constructor(app: TempoPlugin["app"], plugin: TempoPlugin) { super(app); this.plugin = plugin; }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Nuova sessione Tempo" });
    let title = "", date = localDateString(), start = "09:00", end = "10:00";
    let workMinutes = this.plugin.data.defaults.workMinutes;
    let breakEnabled = this.plugin.data.defaults.breakEnabled;
    new Setting(contentEl).setName("Nome").addText(text => text.setPlaceholder("Es. Studio del greco").onChange(value => title = value));
    new Setting(contentEl).setName("Data").addText(text => { text.setValue(date); text.inputEl.type = "date"; text.onChange(value => date = value); });
    new Setting(contentEl).setName("Inizio").addText(text => { text.setValue(start); text.inputEl.type = "time"; text.onChange(value => start = value); });
    new Setting(contentEl).setName("Fine").addText(text => { text.setValue(end); text.inputEl.type = "time"; text.onChange(value => end = value); });
    new Setting(contentEl).setName("Minuti di concentrazione").addText(text => { text.setValue(String(workMinutes)); text.inputEl.type = "number"; text.inputEl.min = "1"; text.inputEl.max = "240"; text.onChange(value => workMinutes = Number(value)); });
    new Setting(contentEl).setName("Pause automatiche (rapporto 5:1)").addToggle(toggle => toggle.setValue(breakEnabled).onChange(value => breakEnabled = value));
    new Setting(contentEl).addButton(button => button.setButtonText("Salva sessione").setCta().onClick(async () => {
      const session: TempoSession = { id: crypto.randomUUID(), title: title.trim(), date, start, end, workMinutes, breakEnabled };
      if (!session.title || !validSession(session)) { new Notice("Controlla nome, data, orari e durata."); return; }
      await this.plugin.addSession(session);
      this.close();
    }));
  }
  onClose() { this.contentEl.empty(); }
}

class TempoSettingTab extends PluginSettingTab {
  plugin: TempoPlugin;
  constructor(app: TempoPlugin["app"], plugin: TempoPlugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    const { containerEl } = this; containerEl.empty();
    containerEl.createEl("h2", { text: "Tempo — Preferenze" });
    new Setting(containerEl).setName("Concentrazione predefinita (minuti)").addText(text => text.setValue(String(this.plugin.data.defaults.workMinutes)).onChange(async value => {
      const n = Number(value); if (Number.isInteger(n) && n >= 1 && n <= 240) { this.plugin.data.defaults.workMinutes = n; await this.plugin.saveTempoData(); }
    }));
    new Setting(containerEl).setName("Pause automatiche predefinite").addToggle(toggle => toggle.setValue(this.plugin.data.defaults.breakEnabled).onChange(async value => {
      this.plugin.data.defaults.breakEnabled = value; await this.plugin.saveTempoData();
    }));
    containerEl.createEl("p", { text: "Le sessioni e le preferenze sono salvate nei dati del plugin Obsidian, separatamente dai dati della PWA." });
  }
}
