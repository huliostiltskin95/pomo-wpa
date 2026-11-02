/* TEMPVS Quiet Focus — independent task details drawer for the PWA. */
(() => {
  "use strict";
  const ready = () => {
    const list = document.getElementById("agenda-list");
    if (!list || document.getElementById("tempo-task-panel")) return;
    const panel = document.createElement("aside");
    panel.id = "tempo-task-panel";
    panel.className = "tempo-task-panel";
    panel.hidden = true;
    panel.tabIndex = -1;
    panel.setAttribute("role","dialog");
    panel.setAttribute("aria-label","Dettagli dell'attività");
    panel.innerHTML = '<div class="tempo-task-panel-head"><h2 class="tempo-task-panel-title"></h2><button type="button" class="tempo-task-panel-close" aria-label="Chiudi dettagli">×</button></div><div class="tempo-task-panel-meta"></div><div class="tempo-task-panel-content"></div><div class="tempo-task-panel-actions"></div>';
    document.body.appendChild(panel);
    let selectedId = "";
    let lastTrigger = null;
    const cardFor = id => [...list.querySelectorAll(".task-item")].find(card => card.dataset.taskId === id);
    function close() {
      const focusTarget = lastTrigger;
      selectedId = "";
      panel.hidden = true;
      for(const node of list.querySelectorAll(".tempo-task-expand"))node.setAttribute("aria-expanded","false");
      if(focusTarget?.isConnected)focusTarget.focus();
    }
    function forwardTaskAction(card,selector) {
      card.querySelector(selector)?.click();
    }
    function draw() {
      if (!selectedId) return;
      const card = cardFor(selectedId);
      if (!card) {close();return;}
      panel.querySelector(".tempo-task-panel-title").textContent=card.querySelector(".task-title")?.textContent||"Attività";
      const meta=panel.querySelector(".tempo-task-panel-meta");
      meta.replaceChildren();
      const area=card.dataset.area||card.querySelector(".task-area")?.textContent||"";
      const areaEl=document.createElement("span");
      areaEl.dataset.area=area;
      const dot=document.createElement("span");
      dot.className="tempo-area-dot";
      dot.setAttribute("aria-hidden","true");
      areaEl.append(dot,document.createTextNode(area));
      meta.appendChild(areaEl);
      for(const selector of [".task-priority",".task-status",".task-due"]){
        const el=card.querySelector(selector);
        if(!el||el.classList.contains("priority-nessuna"))continue;
        const label=document.createElement("span");
        label.textContent=el.textContent;
        meta.appendChild(label);
      }
      const content=panel.querySelector(".tempo-task-panel-content");
      content.replaceChildren();
      for(const selector of [".task-reminder",".task-description",".task-tags",".task-estimate-line",".task-progress",".task-planning-note"]){
        const original=card.querySelector(selector);
        if(!original)continue;
        const copy=original.cloneNode(true);
        if(selector===".task-description"){
          for(const checkbox of copy.querySelectorAll("input[data-md-line]")){
            checkbox.addEventListener("change",()=>{
              const source=[...card.querySelectorAll("input[data-md-line]")].find(el=>el.dataset.mdLine===checkbox.dataset.mdLine);
              if(!source)return;
              source.checked=checkbox.checked;
              source.dispatchEvent(new Event("change",{bubbles:true}));
            });
          }
        }
        if(selector===".task-tags"){
          for(const button of copy.querySelectorAll("button[data-tag]")){
            button.addEventListener("click",()=>{
              const source=[...card.querySelectorAll("button[data-tag]")].find(el=>el.dataset.tag===button.dataset.tag);
              if(source){source.click();close();}
            });
          }
        }
        content.appendChild(copy);
      }
      const actions=panel.querySelector(".tempo-task-panel-actions");
      actions.replaceChildren();
      for(const [selector,label,isPrimary] of [
        ["[data-task-edit]","Modifica",false],
        ["[data-task-plan]","Programma",false],
        ["[data-task-now]","Avvia ora",true]
      ]){
        if(!card.querySelector(selector))continue;
        const button=document.createElement("button");
        button.type="button";
        button.className="button "+(isPrimary?"button-primary":"button-secondary");
        button.textContent=label;
        button.addEventListener("click",()=>{forwardTaskAction(card,selector);close();});
        actions.appendChild(button);
      }
    }
    list.addEventListener("click",event=>{
      const trigger=event.target.closest?.(".tempo-task-expand");
      if(!trigger)return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const card=trigger.closest(".task-item");
      if(!card)return;
      lastTrigger=trigger;
      selectedId=card.dataset.taskId;
      trigger.setAttribute("aria-expanded","true");
      panel.hidden=false;
      draw();
      panel.focus();
    },true);
    panel.querySelector(".tempo-task-panel-close").addEventListener("click",close);
    document.addEventListener("keydown",event=>{
      if(event.key==="Escape"&&!panel.hidden&&!document.querySelector("dialog[open]")){event.preventDefault();close();}
    });
    const observer=new MutationObserver(()=>{if(selectedId)draw();});
    observer.observe(list,{childList:true});
    window.addEventListener("hashchange",()=>{if(!panel.hidden)close();});
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready);
  else ready();
})();
