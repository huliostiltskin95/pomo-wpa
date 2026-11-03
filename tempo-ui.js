/* PWA-only responsive navigation. The shared core and persisted schema are unchanged. */
(() => {
  "use strict";
  const views = [
    ["oggi", "Oggi", "◷", "Oggi"],
    ["inbox", "Inbox", "▤", "Inbox"],
    ["agenda", "Agenda", "☑", "Agenda"],
    ["sessioni", "Sessioni", "▦", "Sessioni"],
    ["statistiche", "Statistiche", "▥", "Dati"],
    ["impostazioni", "Impostazioni", "⚙", "Opzioni"]
  ];
  const ready = () => {
    const main = document.querySelector("main.layout");
    if (!main || document.getElementById("tempo-navigation")) return;
    const nav = document.createElement("nav");
    nav.id = "tempo-navigation";
    nav.setAttribute("aria-label", "Sezioni di Tempo");
    nav.innerHTML = views.map(([id,label,icon,compact]) => '<a class="tempo-nav-link" href="#'+id+'" data-view-link="'+id+'" aria-label="'+label+'"><span class="tempo-nav-icon" aria-hidden="true">'+icon+'</span><span class="tempo-nav-full" aria-hidden="true">'+label+'</span><span class="tempo-nav-short" aria-hidden="true">'+compact+'</span></a>').join("");
    document.body.insertBefore(nav, main);
    // Le aree si filtrano in Agenda: non duplicarle come voci non cliccabili nella navigazione.

    const map = {
      oggi: [".timer-card"],
      agenda: [".agenda-section"],
      inbox: [".tempo-inbox-section"],
      sessioni: [".schedule-section"],
      impostazioni: [".tempo-appearance-settings", ".settings-card", ".sound-card", ".backup-card", ".notice"]
    };
    for (const [view, selectors] of Object.entries(map)) {
      for (const selector of selectors) {
        const el = main.querySelector(selector);
        if (el) { el.dataset.tempoView = view; el.classList.add("tempo-view-section"); }
      }
    }

    const upcoming = document.createElement("section");
    upcoming.dataset.tempoView = "oggi";
    upcoming.className = "tempo-view-section tempo-next-card";
    upcoming.innerHTML = '<div class="section-heading"><div><p class="eyebrow">PIANIFICAZIONE</p><h2>Prossime sessioni</h2></div><a href="#sessioni" class="text-button">Vedi tutte</a></div><div id="tempo-upcoming" class="tempo-upcoming">Nessuna sessione imminente.</div>';
    main.querySelector(".timer-card")?.after(upcoming);

    const stats = document.createElement("section");
    stats.dataset.tempoView = "statistiche";
    stats.className = "tempo-view-section tempo-statistics";
    stats.innerHTML = '<h2>Statistiche</h2><div id="tempo-stat-grid" class="tempo-stat-grid"></div><p class="tempo-stat-footnote">Durate lorde (pause incluse), non concentrazione netta. Le sessioni eliminate non sono conteggiate.</p>';
    main.appendChild(stats);

    const toolbar = document.querySelector(".agenda-extra-actions");
    if (toolbar) {
      const menu = document.createElement("div");
      menu.className = "tempo-add-menu";
      menu.innerHTML = '<button type="button" id="tempo-add-toggle" class="button button-primary" aria-expanded="false" aria-controls="tempo-add-options">＋ Aggiungi</button><div id="tempo-add-options" class="tempo-add-options hidden" role="menu"><button type="button" data-add-action="new-task-button" role="menuitem">Nuova task</button><button type="button" data-add-action="bulk-task-button" role="menuitem">Inserimento multiplo</button></div>';
      toolbar.prepend(menu);
      for (const id of ["new-task-button", "bulk-task-button"]) {
        const target = document.getElementById(id);
        if (target) { target.classList.add("tempo-original-action"); target.setAttribute("tabindex", "-1"); }
      }
      const toggle = menu.querySelector("#tempo-add-toggle"), options = menu.querySelector("#tempo-add-options");
      const close = () => {options.classList.add("hidden");toggle.setAttribute("aria-expanded","false");};
      toggle.addEventListener("click", () => {const hidden=options.classList.toggle("hidden");toggle.setAttribute("aria-expanded",String(!hidden));});
      options.addEventListener("click", event => {
        const button = event.target.closest("[data-add-action]");
        if (!button) return;
        close();
        document.getElementById(button.dataset.addAction)?.click();
      });
      document.addEventListener("click", event => { if (!menu.contains(event.target)) close(); });
      document.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
    }

    const topActions = document.querySelector(".top-actions");
    if (topActions) {
      const pill = document.createElement("span");
      pill.className = "tempo-cloud-compact";
      pill.setAttribute("role","status");
      pill.setAttribute("aria-live","polite");
      pill.innerHTML = '<span class="tempo-cloud-compact-dot" aria-hidden="true"></span><span class="tempo-cloud-compact-label">Archivio locale</span>';
      topActions.prepend(pill);
      window.addEventListener("tempo:cloud-status",event=>{
        const d=event.detail||{},phase=d.phase||"idle";
        pill.dataset.state=phase==="error"?"error":d.busy?"busy":d.connected?"ok":"idle";
        const label=phase==="error"?"Errore Dropbox":d.busy?"Sincronizzazione…":phase==="pending"?"Modifiche in attesa":d.connected?(d.ready?"Dropbox collegato":"Dropbox da configurare"):"Archivio locale";
        pill.querySelector(".tempo-cloud-compact-label").textContent=label;
        pill.title=d.message||label;
      });
    }
    const networkStatus = document.getElementById("connection-status");
    if (networkStatus) {
      const refreshNetworkStatus = () => {
        networkStatus.hidden = navigator.onLine;
        if (!navigator.onLine) networkStatus.textContent = "Offline";
      };
      window.addEventListener("online", refreshNetworkStatus);
      window.addEventListener("offline", refreshNetworkStatus);
      refreshNetworkStatus();
    }
    const appearanceForm = document.getElementById("tempo-appearance-form");
    if (appearanceForm) {
      const themeField=document.getElementById("tempo-theme");
      const densityField=document.getElementById("tempo-density");
      const colors={Studio:document.getElementById("tempo-color-studio"),Lavoro:document.getElementById("tempo-color-lavoro"),Personale:document.getElementById("tempo-color-personale")};
      const defaultColors={Studio:"#D65B56",Lavoro:"#29845C",Personale:"#D6A323"};
      const showAppearance=data=>{
        const a=data||{};
        themeField.value=a.theme||"system";
        densityField.value=a.density||"normal";
        for(const area of Object.keys(colors))colors[area].value=a.areaColors?.[area]||defaultColors[area];
      };
      const saveAppearance=()=>{
        const areaColors={};
        for(const area of Object.keys(colors))areaColors[area]=colors[area].value;
        window.dispatchEvent(new CustomEvent("tempo:appearance-save",{detail:{theme:themeField.value,density:densityField.value,areaColors}}));
      };
      appearanceForm.addEventListener("change",saveAppearance);
      document.getElementById("tempo-appearance-reset")?.addEventListener("click",()=>{
        for(const area of Object.keys(colors))colors[area].value=defaultColors[area];
        saveAppearance();
      });
      window.addEventListener("tempo:appearance-updated",event=>showAppearance(event.detail));
      showAppearance(readState().appearance);
    }
    const agendaList = document.getElementById("agenda-list");
    const collapseTasks = () => {
      if (!agendaList) return;
      for (const card of agendaList.querySelectorAll(".task-item")) {
        if (card.dataset.compactReady) continue;
        card.dataset.compactReady = "true";
        const title = card.querySelector(".task-title");
        if (!title) continue;
        const action = document.createElement("button");
        action.className = "tempo-task-expand";
        action.type = "button";
        action.textContent = "Dettagli";
        action.setAttribute("aria-expanded", "false");
        title.after(action);
        action.addEventListener("click", () => {
          const expanded = card.classList.toggle("tempo-task-expanded");
          action.textContent = expanded ? "Riduci" : "Dettagli";
          action.setAttribute("aria-expanded", String(expanded));
        });
        const openSessions = document.createElement("a");
        openSessions.href = "#sessioni";
        openSessions.textContent = "Vedi sessioni";
        openSessions.className = "text-button tempo-task-session-link";
        card.querySelector(".task-actions")?.appendChild(openSessions);
      }
    };
    if (agendaList) {
      const observer = new MutationObserver(collapseTasks);
      observer.observe(agendaList, {childList: true});
      collapseTasks();
    }

    function readState() {
      try {return JSON.parse(localStorage.getItem("tempo-pomodoro-v2") || "{}");}
      catch {return {};}
    }
    function focusMinutes(session) {
      const toMin = t => {const p=String(t||"").split(":").map(Number);return p.length===2&&p.every(Number.isFinite)?p[0]*60+p[1]:0;};
      let span=toMin(session.end)-toMin(session.start);if(span<0)span+=1440;span=Math.max(0,span);const work=Number(session.workMinutes)||25;
      if (!session.breakEnabled) return span;
      const pause=Math.max(1,Math.round(work/5)), cycle=work+pause;
      return Math.floor(span/cycle)*work+Math.min(work,span%cycle);
    }
    function startOf(session) {return new Date(session.date+"T"+session.start+":00").getTime();}
    function endOf(session) {const end=new Date(session.date+"T"+session.end+":00").getTime();return end<startOf(session)?end+86400000:end;}
    function renderOverview() {
      const state=readState(), sessions=Array.isArray(state.sessions)?state.sessions:[], tasks=Array.isArray(state.tasks)?state.tasks:[], history=Array.isArray(state.history)?state.history:[];
      const now=Date.now(), next=sessions.filter(s=>endOf(s)>now).sort((a,b)=>startOf(a)-startOf(b)).slice(0,4);
      const nextEl=document.getElementById("tempo-upcoming");
      if(nextEl) {
        nextEl.replaceChildren();
        if(!next.length) nextEl.textContent="Nessuna sessione imminente.";
        for(const s of next) {
          const row=document.createElement("div");row.className="tempo-upcoming-row";
          const time=document.createElement("strong");
          time.textContent=s.date+" · "+s.start+"–"+s.end;
          const title=document.createElement("span");title.textContent=s.title;
          row.dataset.area=s.area||s.title;
          row.append(time,title);
          const linked=tasks.filter(t=>(Array.isArray(s.taskIds)?s.taskIds:[s.taskId]).includes(t.id));
          if(linked.length){const description=document.createElement("span");description.textContent="☐ "+linked.map(t=>t.title).join(", ");row.append(description);}
          nextEl.appendChild(row);
        }
      }
      const gross = s=>Math.max(0,(endOf(s)-startOf(s))/60000);
      const planned = sessions.filter(s=>startOf(s)>now).reduce((sum,s)=>sum+gross(s),0);
      const elapsed = sessions.reduce((sum,s)=>sum+Math.max(0,Math.min(now,endOf(s))-startOf(s))/60000,0);
      const completed = tasks.filter(t=>t.status==="done").length;
      const statsEl=document.getElementById("tempo-stat-grid");
      if(statsEl){
        statsEl.replaceChildren();
        const metrics = [["Attività",String(tasks.length)],["Completate",String(completed)],["Tempo lordo futuro programmato",format(planned)],["Tempo lordo trascorso",format(elapsed)]];
        for(const [label,value] of metrics){
          const item=document.createElement("div");item.className="tempo-stat-item";
          const heading=document.createElement("span");heading.textContent=label;
          const number=document.createElement("strong");number.textContent=value;
          item.append(heading,number);statsEl.appendChild(item);
        }
      }
    }
    function format(minutes) {return (Math.round(minutes*10/60)/10).toLocaleString("it-IT")+" h";}
    function activate() {
      const selected=location.hash.replace("#","").toLowerCase();
      const current=views.some(v=>v[0]===selected)?selected:"oggi";
      document.body.dataset.tempoActiveView=current;
      for(const element of document.querySelectorAll(".tempo-view-section")) element.hidden=element.dataset.tempoView!==current;
      for(const anchor of nav.querySelectorAll("[data-view-link]")) {
        const active=anchor.dataset.viewLink===current;
        anchor.classList.toggle("active",active);
        if(active)anchor.setAttribute("aria-current","page");else anchor.removeAttribute("aria-current");
      }
      renderOverview();
      window.scrollTo(0,0);
    }
    window.addEventListener("hashchange",activate);
    window.addEventListener("storage",renderOverview);
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)renderOverview();});
    setInterval(renderOverview,15000);
    activate();
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready);
  else ready();
})();
