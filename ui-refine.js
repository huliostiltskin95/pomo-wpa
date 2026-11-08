// Progressive interface refinement: preserves existing forms, IDs, data and PiP module.
const byId = id => document.getElementById(id);
function group(label, className) {
  const details = document.createElement('details');
  details.className = className;
  const summary = document.createElement('summary');
  summary.textContent = label;
  details.append(summary);
  return details;
}
export function initRefinedUI() {
  const timerForm = byId('instant');
  if (!timerForm || document.body.dataset.refinedUi) return;
  document.body.dataset.refinedUi = 'true';

  // The primary action requires only area and gross duration.
  const advanced = group('Personalizza focus e pause', 'advanced-controls');
  for (const id of ['instant-focus','instant-pause-mode','instant-pause-minutes']) {
    const input=byId(id);
    const label=input?.closest('label');
    if(label) advanced.append(label);
  }
  const pausePreview=byId('instant-pause-preview');
  if(pausePreview) advanced.append(pausePreview);
  timerForm.append(advanced);
  const submit=timerForm.querySelector('button.primary');
  if(submit) timerForm.insertBefore(submit, advanced);
  byId('instant-end-preview')?.classList.add('compact-end-preview');
  const next=byId('next');
  next?.classList.add('next-session-card');

  // Phase 1: structurally distinct start and live-timer surfaces.
  // Existing controls are moved, not cloned: the audio engine and PiP handlers
  // still read the same elements and the same real session.
  const card=byId('focus-panel');
  if(card) {
    const hero=document.createElement('section');
    hero.className='tempo-hero';
    hero.setAttribute('aria-label','Sessione di concentrazione');
    for(const id of ['phase','active-title','clock','phase-progress','session-deadline','cycle-note','timer-note']) {
      const element=byId(id);
      if(element)hero.append(element);
    }
    const actions=card.querySelector(':scope > .row.center');
    if(actions){actions.classList.add('tempo-live-actions');hero.append(actions);}
    card.prepend(hero);
    timerForm.classList.add('tempo-launch');
    const minutes=byId('instant-minutes');
    const presets=document.createElement('div');
    presets.className='tempo-presets';
    presets.setAttribute('role','group');
    presets.setAttribute('aria-label','Durate lorde rapide');
    for(const duration of [30,60,90]){
      const button=document.createElement('button');
      button.type='button';
      button.textContent=duration+' min';
      button.dataset.minutes=String(duration);
      button.addEventListener('click',()=>{
        minutes.value=String(duration);
        minutes.dispatchEvent(new Event('input',{bubbles:true}));
      });
      presets.append(button);
    }
    const reflect=()=>{
      for(const b of presets.querySelectorAll('button')){
        const current=b.dataset.minutes===minutes.value;
        b.classList.toggle('selected',current);
        b.setAttribute('aria-pressed',String(current));
      }
    };
    minutes?.addEventListener('input',reflect);
    minutes?.closest('label')?.after(presets);
    reflect();
    const launchHeading=document.createElement('div');
    launchHeading.className='tempo-launch-heading';
    launchHeading.innerHTML='<span class="tempo-kicker">AVVIO RAPIDO</span><h2>Dedica tempo a ciò che conta</h2><p>Seleziona un’area e una durata lorda. Il ciclo Pomodoro resta configurabile.</p>';
    timerForm.prepend(launchHeading);
    const audio=card.querySelector(':scope > details');
    if(audio)audio.classList.add('tempo-audio');
  }


  // Make the session list the landing view, with planning controls available on demand.
  const sessions=byId('sessions');
  const planning= sessions?.querySelector('.planning-layout');
  const heading=sessions?.querySelector('.row.between');
  const list=byId('session-list');
  if(planning && heading && list) {
    planning.before(heading,list);
    const tools=group('Aggiungi e organizza sessioni', 'planning-tools');
    planning.before(tools);
    tools.append(planning);
    const newButton=document.createElement('button');
    newButton.type='button';
    newButton.className='primary new-session-trigger';
    newButton.textContent='+ Nuova sessione';
    heading.append(newButton);
    newButton.addEventListener('click',()=>{
      tools.open=true;
      const tableGroup=byId('planner-table-group');
      if(tableGroup) tableGroup.open=true;
      const rows=byId('planner-rows');
      if(!rows?.children.length) byId('planner-add')?.click();
      rows?.lastElementChild?.querySelector('select')?.focus();
    });

    // A day-first toolbar keeps the existing date input as the single source of truth.
    const dayDate=byId('session-date');
    const dayNav=document.createElement('div');
    dayNav.className='planner-day-nav';
    dayNav.innerHTML='<button type="button" data-day="-1" aria-label="Giorno precedente">‹</button><button type="button" data-today>Oggi</button><button type="button" data-day="1" aria-label="Giorno successivo">›</button><strong id="planner-day-label"></strong>';
    heading.after(dayNav);
    const summary=document.createElement('section');
    summary.id='planner-day-summary';
    summary.className='planner-day-summary';
    summary.setAttribute('aria-label','Riepilogo della giornata');
    dayNav.after(summary);
    const setDay=value=>{
      if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(value))return;
      dayDate.value=value;
      const fixed=byId('quick-date'),windowDate=byId('window-date');
      if(fixed){fixed.value=value;fixed.dispatchEvent(new Event('input',{bubbles:true}));}
      if(windowDate)windowDate.value=value;
      dayDate.dispatchEvent(new Event('change',{bubbles:true}));
    };
    dayNav.addEventListener('click',event=>{
      const button=event.target.closest('button');
      if(!button)return;
      if(button.hasAttribute('data-today'))return setDay(localDay(new Date()));
      const amount=Number(button.dataset.day);
      if(!Number.isInteger(amount))return;
      const parts=dayDate.value.split('-').map(Number);
      if(parts.length!==3)return;
      const date=new Date(parts[0],parts[1]-1,parts[2]+amount,12);
      setDay(localDay(date));
    });
    const openQuick=document.createElement('button');
    openQuick.type='button';
    openQuick.className='planner-open-quick';
    openQuick.textContent='Inserimento rapido';
    heading.append(openQuick);
    openQuick.addEventListener('click',()=>{
      tools.open=true;
      const paste=planning.querySelector('.planner-paste');
      if(paste){paste.open=true;paste.scrollIntoView({behavior:'auto',block:'nearest'});byId('quick')?.focus();}
    });

    const windowsArticle=planning.querySelector('article:not(.planner-article)');
    if(windowsArticle) {
      const windowsGroup=group('Modifica fasce disponibili', 'windows-tools');
      windowsArticle.before(windowsGroup);
      windowsGroup.append(windowsArticle);
    }
    const plannerArticle=planning.querySelector('.planner-article');
    const table=plannerArticle?.querySelector('.planner-table');
    const paste=plannerArticle?.querySelector('.planner-paste');
    const form=byId('quick-form');
    if(plannerArticle && table && form) {
      const tableGroup=group('Tabella di pianificazione', 'planner-table-group');
      tableGroup.id='planner-table-group';
      form.insertBefore(tableGroup,table);
      for(const el of [table,byId('planner-add'),byId('planner-status'),byId('prepare-plan')]){
        if(el) tableGroup.append(el);
      }
      if(paste) {
        // Fast multiline entry precedes the detailed table, but still imports through
        // the existing parser, validation and explicit confirmation workflow.
        form.before(paste);
        paste.classList.add('planner-quick-entry');
        const title=paste.querySelector('summary');
        if(title)title.textContent='Inserimento rapido · una sessione per riga';
        paste.addEventListener('toggle',()=>{if(paste.open)tools.open=true;});
      }
      byId('planner-import')?.addEventListener('click',()=>{tableGroup.open=true;});
      form.addEventListener('submit',()=>{tableGroup.open=true;});
    }
  }

  // Backup is maintenance, not a concentration statistic.
  const settings=byId('settings');
  const backup=byId('backup-status')?.closest('article');
  if(settings && backup) {
    const section=group('Backup e sincronizzazione Dropbox', 'backup-settings');
    section.append(backup);
    settings.append(section);
  }

  // Do not imply that every browser supports PiP; leave detection to timer-pip.js.
  const pip=byId('pip-toggle');
  if(pip) pip.classList.add('pip-preserved');
}
function localDay(date){
  const pad=n=>String(n).padStart(2,'0');
  return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate());
}
export function updatePlannerDay(date, sessions, windows){
  const summary=byId('planner-day-summary'),label=byId('planner-day-label');
  if(!summary || !label || !/^\\d{4}-\\d{2}-\\d{2}$/.test(date||''))return;
  const [year,month,day]=date.split('-').map(Number);
  const begin=new Date(year,month-1,day),finish=new Date(year,month-1,day+1);
  if(!Number.isFinite(+begin))return;
  const formatMinutes=minutes=>{
    const hours=Math.floor(minutes/60),left=minutes%60;
    return hours?(hours+' h'+(left?' '+left+' min':'')):minutes+' min';
  };
  const overlap=s=>{
    const [sy,sm,sd]=(s.date||'').split('-').map(Number);
    const parts=(s.start||'').split(':').map(Number);
    if(!sy || parts.length!==2)return 0;
    const start=new Date(sy,sm-1,sd,parts[0],parts[1]);
    const ends=(s.end||'').split(':').map(Number);
    const end=new Date(sy,sm-1,sd,ends[0],ends[1]);
    if(end<=start)end.setDate(end.getDate()+1);
    return Math.max(0,Math.round((Math.min(+finish,+end)-Math.max(+begin,+start))/60000));
  };
  const gross=sessions.reduce((sum,s)=>sum+overlap(s),0);
  const slots=windows.reduce((sum,w)=>sum+overlap(w),0);
  const count=sessions.filter(s=>overlap(s)>0).length;
  const longDate=begin.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'});
  label.textContent=longDate.charAt(0).toUpperCase()+longDate.slice(1);
  summary.replaceChildren();
  for(const [name,value] of [
    ['Sessioni',String(count)],
    ['Tempo lordo',formatMinutes(gross)],
    ['Fasce del giorno',slots?formatMinutes(slots):'Non definite']
  ]){
    const item=document.createElement('div');item.className='planner-summary-metric';
    const title=document.createElement('span');title.textContent=name;
    const number=document.createElement('strong');number.textContent=value;
    item.append(title,number);summary.append(item);
  }
}

function createDialog(title, body) {
  const dialog=document.createElement('dialog');
  dialog.className='edit-dialog';
  dialog.innerHTML='<form method="dialog"><h2></h2><div class="edit-dialog-body"></div><div class="edit-dialog-actions"><button type="button" data-cancel>Annulla</button><button type="submit" class="primary" value="save">Conferma</button></div></form>';
  dialog.querySelector('h2').textContent=title;
  dialog.querySelector('.edit-dialog-body').append(body);
  document.body.append(dialog);
  return dialog;
}
export function editSessionDetails(session, action) {
  return new Promise(resolve=>{
    const body=document.createElement('div');
    const fields=action==='move'
      ? [{id:'date',label:'Giorno',type:'date',value:session.date},{id:'start',label:'Orario di inizio',type:'time',value:session.start}]
      : [{id:'pause',label:'Minuti di pausa finale',type:'number',value:String(session.customBreakMinutes??5)}];
    if(action==='pause'){
      const auto=document.createElement('label');
      auto.className='check';
      auto.innerHTML='<input type="checkbox" id="edit-auto-pause"> Usa pause automatiche';
      body.append(auto);
    }
    for(const f of fields){
      const label=document.createElement('label');
      label.textContent=f.label;
      const input=document.createElement('input');
      input.id='edit-'+f.id; input.type=f.type; input.value=f.value; input.required=true;
      if(f.type==='number'){input.min='0';input.step='1';}
      label.append(input);body.append(label);
    }
    const dialog=createDialog(action==='move'?'Sposta sessione':'Modifica pause',body);
    const auto=dialog.querySelector('#edit-auto-pause'),pause=dialog.querySelector('#edit-pause');
    if(auto&&pause)auto.addEventListener('change',()=>{pause.disabled=auto.checked;});
    const close=()=>{const value=dialog.returnValue;
      const data=value==='save'?action==='move'
        ?{date:dialog.querySelector('#edit-date').value,start:dialog.querySelector('#edit-start').value}
        :{pause:auto?.checked?'auto':pause.value}:null;
      dialog.remove();resolve(data);
    };
    dialog.querySelector('[data-cancel]').onclick=()=>dialog.close('cancel');
    dialog.addEventListener('close',close,{once:true});
    dialog.showModal();
  });
}
export function chooseSyncConflict(conflict) {
  return new Promise(resolve=>{
    const content=document.createElement('div');
    const description=document.createElement('p');description.textContent=conflict.label;content.append(description);
    const local=document.createElement('p');local.textContent='Locale: '+conflict.localPreview;content.append(local);
    const remote=document.createElement('p');remote.textContent='Dropbox: '+conflict.remotePreview;content.append(remote);
    const options=document.createElement('select');
    options.setAttribute('aria-label','Versione da conservare');
    conflict.options.forEach((o,i)=>{const op=document.createElement('option');op.value=String(i);op.textContent=o.label;options.append(op);});
    content.append(options);
    const dialog=createDialog('Risolvi conflitto Dropbox',content);
    dialog.querySelector('[data-cancel]').onclick=()=>dialog.close('cancel');
    dialog.addEventListener('close',()=>{const result=dialog.returnValue==='save'?conflict.options[Number(options.value)]?.value:null;dialog.remove();resolve(result??null);},{once:true});
    dialog.showModal();
  });
}
