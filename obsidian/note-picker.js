import {Modal, Notice} from 'obsidian';

const fold = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
const safeLabel = text => String(text).replace(/[\r\n|\[\]]/g, ' ').trim();

export class SessionNotePicker extends Modal {
  constructor(app, save) {
    super(app);
    this.save = save;
    this.activeFile = app.workspace.getActiveFile?.() || app.workspace.getMostRecentLeaf?.()?.view?.file;
  }

  onOpen() {
    this.contentEl.addClass('tempvs-picker');
    this.files = (this.app.vault?.getMarkdownFiles?.() || []).map(file => {
      const meta = this.app.metadataCache?.getFileCache(file)?.frontmatter || {};
      const title = String(meta.title || file.basename);
      const aliases = [].concat(meta.aliases || meta.alias || []);
      return {file, title, search: fold([title, file.path, ...aliases].join(' '))};
    });
    this.searchFiles();
  }

  choice(parent, title, action, subtitle) {
    const button = parent.createEl('button', {attr:{type:'button'}});
    button.createSpan({text:title});
    if (subtitle) button.createEl('small', {text:subtitle});
    button.onclick = action;
    return button;
  }

  searchFiles() {
    const el = this.contentEl;
    el.empty();
    el.createEl('h3', {text:'Collega nota'});
    const input = el.createEl('input', {attr:{type:'search', 'aria-label':'Cerca nota', placeholder:'Titolo, alias, nome file o [[wikilink]]'}});
    const results = el.createDiv({cls:'tempvs-picker-results'});
    const render = () => {
      results.empty();
      const query = input.value.trim();
      if (query.startsWith('[[')) {
        this.choice(results, 'Collega wikilink', () => this.commit(query), query);
        return;
      }
      const words = fold(query).split(/\s+/);
      const active = this.files.find(entry => entry.file.path === this.activeFile?.path);
      if (!query && active) this.choice(results, 'Usa la nota aperta', () => this.selectFile(active), active.title);
      const matches = this.files.filter(entry => words.every(word => entry.search.includes(word)));
      for (const entry of matches.slice(0, 50)) this.choice(results, entry.title, () => this.selectFile(entry), entry.file.path);
      if (!matches.length) results.createEl('p', {text:'Nessuna nota trovata.'});
      if (matches.length > 50) results.createEl('small', {text:'Affina la ricerca per vedere altri risultati.'});
    };
    input.oninput = render;
    input.onkeydown = event => {
      if (event.key === 'Enter') results.querySelector('button')?.click();
      if (event.key === 'ArrowDown') { event.preventDefault(); results.querySelector('button')?.focus(); }
    };
    render();
    input.focus();
  }

  selectFile({file, title}) {
    const path = file.path.replace(/\.md$/i, '');
    const link = (target, label) => this.commit('[[' + target + '|' + safeLabel(label) + ']]');
    const headings = this.app.metadataCache?.getFileCache(file)?.headings || [];
    if (!headings.length) return link(path, title);
    const el = this.contentEl;
    el.empty();
    el.createEl('h3', {text:title});
    this.choice(el, 'Collega nota intera', () => link(path, title)).focus();
    const results = el.createDiv({cls:'tempvs-picker-results'});
    for (const {heading, level} of headings) {
      this.choice(results, heading, () => link(path + '#' + heading, heading), 'H' + level);
    }
    this.choice(el, 'Torna alla ricerca', () => this.searchFiles());
  }

  async commit(value) {
    if (this.saving) return;
    this.saving = true;
    try { await this.save(value); this.close(); }
    catch (error) { new Notice(error.message); }
    finally { this.saving = false; }
  }

  onClose() { this.contentEl.empty(); this.files = []; }
}
