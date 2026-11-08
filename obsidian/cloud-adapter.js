import { requestUrl, Modal, Notice } from "obsidian";

/** requestUrl bypasses WebView CORS restrictions on desktop/iOS/Android. */
export async function dropboxRequest(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  let body = options.body;
  if (body instanceof URLSearchParams) {
    body = body.toString();
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }
  const response = await requestUrl({
    url, method: options.method || "GET", headers,
    ...(body === undefined ? {} : { body }), throw: false
  });
  return {
    status: response.status,
    ok: response.status >= 200 && response.status < 300,
    headers: { get(name) {
      const key = Object.keys(response.headers || {}).find(k => k.toLowerCase() === name.toLowerCase());
      return key ? response.headers[key] : null;
    }},
    text: async () => response.text,
    json: async () => JSON.parse(response.text)
  };
}

/** In-memory synchronous key/value store, persisted atomically with plugin data.
 * The adapter's serialized values can be included in a single plugin.saveData().
 */
export function createCloudStorage(initial = {}, onMutation = () => {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: k => map.has(k) ? map.get(k) : null,
    setItem(k, value) { map.set(k, String(value)); onMutation(); },
    removeItem(k) { map.delete(k); onMutation(); },
    snapshot: () => Object.fromEntries(map)
  };
}

export class TempvsConflictModal extends Modal {
  constructor(app, conflicts, finish) {
    super(app);
    this.conflicts = conflicts;
    this.finish = finish;
    this.setTitle("TEMPVS · Conflitti Dropbox");
  }
  onOpen() {
    const parent = this.contentEl;
    parent.empty();
    parent.createEl("p", {text:"Scegli per ogni elemento quale versione conservare. Nessuna modifica verrà applicata finché non confermi."});
    const selects = [];
    for (const conflict of this.conflicts) {
      const row = parent.createDiv({cls:"tempvs-conflict"});
      row.createEl("strong", {text: conflict.label || conflict.key});
      row.createEl("small", {text: "Dispositivo: " + String(conflict.localPreview ?? "—").slice(0,180)});
      row.createEl("small", {text: "Dropbox: " + String(conflict.remotePreview ?? "—").slice(0,180)});
      const select = row.createEl("select", {attr:{"aria-label":conflict.label || conflict.key}});
      select.createEl("option", {text:"Scegli una versione",attr:{value:""}});
      for(const option of conflict.options || [])select.createEl("option",{text:option.label,attr:{value:option.value}});
      selects.push({key:conflict.key,select});
    }
    const controls = parent.createDiv({cls:"tempvs-controls"});
    const ok = controls.createEl("button", {text:"Conferma l'unione",cls:"mod-cta"});
    ok.addEventListener("click", () => {
      if(selects.some(item=>!item.select.value)){new Notice("Seleziona una versione per ogni conflitto.");return;}
      this.complete(Object.fromEntries(selects.map(item=>[item.key,item.select.value])));
    });
    const cancel = controls.createEl("button", {text:"Annulla"});
    cancel.addEventListener("click",()=>this.close());
  }
  complete(value) { this.finish?.(value); this.finish=null; this.close(); }
  onClose() { if(this.finish){this.finish(null);this.finish=null;} this.contentEl.empty(); }
}

export function chooseTempvsConflicts(app, conflicts) {
  return new Promise(resolve => new TempvsConflictModal(app, conflicts, resolve).open());
}

export function confirmTempvs(app, title, description) {
  return new Promise(resolve => {
    class Confirmation extends Modal {
      onOpen(){
        this.setTitle(title);
        this.contentEl.createEl("p",{text:description});
        const actions=this.contentEl.createDiv({cls:"tempvs-controls"});
        actions.createEl("button",{text:"Conferma",cls:"mod-warning"}).onclick=()=>{this.done=true;resolve(true);this.close();};
        actions.createEl("button",{text:"Annulla"}).onclick=()=>this.close();
      }
      onClose(){if(!this.done)resolve(false);this.contentEl.empty();}
    }
    new Confirmation(app).open();
  });
}
