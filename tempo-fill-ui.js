import {proposeSessionFill} from "./core/tempo-fill.js";
import {sessionBounds,sessionDurationMinutes} from "./core/tempo-core.js";
import {sessionTaskIds} from "./core/tempo-tasks.js";

/** Confirmation-first UI, no automatic changes until the user explicitly saves. */
export function mountSessionFiller({getState,applySessions,showToast}) {
  const dialog=document.createElement("dialog");
  dialog.className="session-dialog tempo-fill-dialog";
  dialog.setAttribute("aria-label","Riempi sessioni con le task dell'area");
  dialog.innerHTML=`<div class="dialog-heading"><h2>Riempi automaticamente</h2><button type="button" class="icon-button" data-close aria-label="Chiudi">×</button></div>
    <p class="muted">Le sessioni mantengono durata, area e timer. Le task ricevono quote di tempo <strong>lordo</strong>, pause comprese.</p>
    <form id="tempo-fill-form">
      <label class="field-label">Ordine di assegnazione
        <select name="sort"><option value="priority">Priorità, poi scadenza</option><option value="deadline">Scadenza, poi priorità</option><option value="agenda">Ordine dell'Agenda</option></select>
      </label>
      <label class="check-label"><input type="checkbox" name="partial" checked> Consenti quote parziali di task</label>
      <button type="submit" class="button button-secondary">Calcola anteprima</button>
    </form>
    <div id="tempo-fill-preview" role="status" aria-live="polite"></div>
    <div class="dialog-actions"><button class="button button-secondary" type="button" data-close>Annulla</button><button class="button button-primary hidden" type="button" id="tempo-fill-confirm">Conferma assegnazioni</button></div>`;
  document.body.appendChild(dialog);
  const form=dialog.querySelector("form"),summary=dialog.querySelector("#tempo-fill-preview"),confirm=dialog.querySelector("#tempo-fill-confirm");
  let selectedIds=[],proposal=[],sourceSignature="";
  const escape=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const format=n=>(n/60).toLocaleString("it-IT",{maximumFractionDigits:2})+" h";
  const eligible=session=>sessionBounds(session).start>new Date();
  const snapshot=state=>JSON.stringify([state.tasks,state.sessions]);
  function open(ids) {
    const state=getState();
    selectedIds=[...new Set(ids)].filter(id=>state.sessions.some(s=>s.id===id&&eligible(s)));
    proposal=[];confirm.classList.add("hidden");
    summary.textContent=selectedIds.length?
      selectedIds.length+" sessioni selezionate. Calcola la distribuzione proposta.":
      "Non ci sono sessioni future modificabili per questo giorno.";
    dialog.showModal();
  }
  function compute(state) {
    const working=[...state.sessions],next=[],details=[];
    for(const id of selectedIds){
      const session=working.find(s=>s.id===id);
      if(!session||!eligible(session))throw Error("Una sessione è stata modificata o è già iniziata. Riprova.");
      const {session:filled,additions,freeMinutes}=proposeSessionFill(session,state.tasks,working,{
        mode:form.elements.sort.value,partial:form.elements.partial.checked
      });
      working.splice(working.findIndex(s=>s.id===id),1,filled);
      if(additions.length)next.push(filled);
      details.push({session,additions,freeMinutes});
    }
    return {next,details};
  }
  form.addEventListener("submit",event=>{
    event.preventDefault();
    try {
      const state=getState();
      const generated=compute(state);
      proposal=generated.next;
      sourceSignature=snapshot(state);
      summary.innerHTML=generated.details.map(({session,additions,freeMinutes})=>
        '<section class="tempo-fill-item"><strong>'+escape(session.date+' · '+session.start+'–'+session.end+' · '+session.title)+'</strong>'+
        '<small>Capienza lorda: '+escape(format(sessionDurationMinutes(session)))+'</small>'+
        (additions.length?'<ul>'+additions.map(a=>'<li>'+escape(a.title)+' — '+escape(format(a.minutes))+'</li>').join("")+'</ul>':
          '<p class="muted">Nessuna nuova task assegnabile.</p>')+
        '<small>Spazio non assegnato: '+escape(format(freeMinutes))+'</small></section>').join("");
      confirm.classList.toggle("hidden",!proposal.length);
      if(!proposal.length)showToast("Nessuna nuova assegnazione disponibile.");
    } catch(error){proposal=[];confirm.classList.add("hidden");summary.textContent=error.message;}
  });
  confirm.addEventListener("click",()=>{
    if(!proposal.length)return;
    const state=getState();
    if(snapshot(state)!==sourceSignature){
      confirm.classList.add("hidden");summary.textContent="I dati sono cambiati. Ricalcola l'anteprima.";return;
    }
    const latest=compute(state);
    if(JSON.stringify(latest.next)!==JSON.stringify(proposal)){
      confirm.classList.add("hidden");summary.textContent="Le sessioni sono cambiate. Ricalcola la proposta.";return;
    }
    const replacements=new Map(proposal.map(s=>[s.id,s]));
    if(applySessions(replacements)){
      const count=proposal.length;proposal=[];dialog.close();showToast(count+" sessioni riempite con quote lorde.");
    }
  });
  form.addEventListener("change",()=>{proposal=[];confirm.classList.add("hidden");summary.textContent="Impostazioni cambiate: ricalcola l'anteprima.";});
  dialog.querySelectorAll("[data-close]").forEach(button=>button.addEventListener("click",()=>dialog.close()));
  window.addEventListener("tempo:fill-session",event=>{
    const id=event.detail?.sessionId;
    if(id)open([id]);
  });
  return {
    openSession(id){open([id]);},
    openDay(date){open(getState().sessions.filter(s=>s.date===date).sort((a,b)=>a.start.localeCompare(b.start)).map(s=>s.id));}
  };
}
