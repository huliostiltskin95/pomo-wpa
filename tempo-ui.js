/* PWA-only responsive navigation. The shared core and persisted schema are unchanged. */
(() => {
  "use strict";
  const views = [
    ["oggi", "Oggi", "◷"],
    ["agenda", "Agenda", "☑"],
    ["sessioni", "Sessioni", "▦"],
    ["statistiche", "Statistiche", "▥"],
    ["impostazioni", "Impostazioni", "⚙"]
  ];
  const ready = () => {
    const main = document.querySelector("main.layout");
    if (!main || document.getElementById("tempo-navigation")) return;
    const nav = document.createElement("nav");
    nav.id = "tempo-navigation";
    nav.setAttribute("aria-label", "Sezioni di Tempo");
    nav.innerHTML = views.map(([id,label,icon]) => '<a class="tempo-nav-link" href="#'+id+'" data-view-link="'+id+'"><span class="tempo-nav-icon" aria-hidden="true">'+icon+'</span><span>'+label+'</span></a>').join("");
    document.body.insertBefore(nav, main);

    const map = {
      oggi: [".intro", ".timer-card"],
      agenda: [".agenda-section"],
      sessioni: [".schedule-section"],
      impostazioni: [".settings-card", ".sound-card", ".backup-card", ".notice"]
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
    stats.innerHTML = '<p class="eyebrow">RIEPILOGO</p><h2>Statistiche</h2><p class="muted">Il tempo trascorso è una registrazione basata sul calendario, non una misura verificata dell’attenzione.</p><div id="tempo-stat-grid" class="tempo-stat-grid"></div><p class="tempo-stat-footnote">Tempo pianificato e tempo trascorso sono distinti. Le sessioni archiviate rimangono nello storico anche se rimosse dall’agenda.</p>';
    main.appendChild(stats);

    const toolbar = document.querySelector(".agenda-extra-actions");
    if (toolbar) {
      const menu = document.createElement("div");
      menu.className = "tempo-add-menu";
      menu.innerHTML = '<button type="button" id="tempo-add-toggle" class="button button-primary" aria-expanded="false" aria-controls="tempo-add-options">＋ Aggiungi</button><div id="tempo-add-options" class="tempo-add-options hidden" role="menu"><button type="button" data-add-action="new-task-button" role="menuitem">Nuova task</button><button type="button" data-add-action="bulk-task-button" role="menuitem">Inserimento multiplo</button><button type="button" data-add-action="manage-tags-button" role="menuitem">Gestisci tag</button></div>';
      toolbar.prepend(menu);
      for (const id of ["new-task-button", "bulk-task-button", "manage-tags-button"]) {
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
      const span = Math.max(0,toMin(session.end)-toMin(session.start)), work=Number(session.workMinutes)||25;
      if (!session.breakEnabled) return span;
      const pause=Math.max(1,Math.round(work/5)), cycle=work+pause;
      return Math.floor(span/cycle)*work+Math.min(work,span%cycle);
    }
    function startOf(session) {return new Date(session.date+"T"+session.start+":00").getTime();}
    function endOf(session) {return new Date(session.date+"T"+session.end+":00").getTime();}
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
          row.append(time,title);nextEl.appendChild(row);
        }
      }
      const loggedIds = new Set(history.map(h=>h.sessionId));
      const planned = sessions.filter(s=>startOf(s)>now).reduce((sum,s)=>sum+focusMinutes(s),0);
      const elapsed = sessions.filter(s=>endOf(s)<=now&&!loggedIds.has(s.id)).reduce((sum,s)=>sum+focusMinutes(s),0) + history.reduce((sum,h)=>sum+(Number(h.minutes)||0),0);
      const completed = tasks.filter(t=>t.status==="done").length;
      const statsEl=document.getElementById("tempo-stat-grid");
      if(statsEl){
        statsEl.replaceChildren();
        const metrics = [["Attività",String(tasks.length)],["Completate",String(completed)],["Concentrazione programmata futura",format(planned)],["Tempo registrato trascorso",format(elapsed)]];
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
