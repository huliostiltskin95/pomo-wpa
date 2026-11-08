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

  // Semantic page relationships and keyboard navigation without replacing
  // the native buttons or the browser's own focus behavior.
  const names={timer:'Timer',sessions:'Pianifica',stats:'Statistiche'};
  const tabs=[...document.querySelectorAll('nav [data-page]')];
  tabs.forEach(button=>{
    const page=button.dataset.page;
    if(!names[page])return;
    button.setAttribute('aria-controls',page);
    button.setAttribute('aria-label',names[page]);
  });
  const navigation=document.querySelector('nav[aria-label="Navigazione principale"]');
  navigation?.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const current=tabs.indexOf(document.activeElement);
    if(current<0)return;
    event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:
      (current+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    tabs[next].focus();
  });
  const ids={timer:'active-title',sessions:'sessions-heading',stats:'stats-heading'};
  for(const [page,headingId] of Object.entries(ids)){
    const panel=byId(page);
    const heading=page==='timer'?byId('active-title'):panel?.querySelector('h1');
    if(heading){
      heading.id=headingId;
      panel?.setAttribute('aria-labelledby',headingId);
    }
  }
  // Allow skipping repeated navigation on a keyboard without changing layout.
  const skip=document.createElement('a');
  skip.href='#main-content';skip.className='skip-to-main';skip.textContent='Vai al contenuto';
  const main=document.querySelector('main');
  if(main){main.id='main-content';main.tabIndex=-1;document.body.prepend(skip);}


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
      if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return;
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
  if(!summary || !label || !/^\d{4}-\d{2}-\d{2}$/.test(date||''))return;
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
  const form=document.createElement('form');
  form.noValidate=true;
  const heading=document.createElement('h2');heading.textContent=title;
  const message=document.createElement('p');message.className='edit-dialog-context';
  const content=document.createElement('div');content.className='edit-dialog-body';content.append(body);
  const error=document.createElement('p');error.className='edit-dialog-error';error.setAttribute('role','alert');error.hidden=true;
  const actions=document.createElement('div');actions.className='edit-dialog-actions';
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Annulla';
  const submit=document.createElement('button');submit.type='submit';submit.className='primary';submit.textContent='Conferma';
  actions.append(cancel,submit);form.append(heading,message,content,error,actions);dialog.append(form);document.body.append(dialog);
  return {dialog,form,message,error,cancel,submit};
}
function field(name, label, type, value) {
  const wrapper=document.createElement('label');wrapper.textContent=label;
  const input=document.createElement('input');input.name=name;input.type=type;input.value=value;
  input.required=true;
  if(type==='number'){input.min='0';input.step='1';input.inputMode='numeric';}
  wrapper.append(input);return {wrapper,input};
}
function showError(target,message) {target.textContent=message;target.hidden=false;}
function dateParts(value) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const [y,m,d]=value.split('-').map(Number);
  const test=new Date(y,m-1,d,12);
  return test.getFullYear()===y&&test.getMonth()===m-1&&test.getDate()===d ? [y,m,d] : null;
}
function clockParts(value) {
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))return null;
  return value.split(':').map(Number);
}
export function editSessionDetails(session, action) {
  if(!['move','pause'].includes(action))return Promise.resolve(null);
  return new Promise(resolve=>{
    const body=document.createElement('div');
    const duration=Math.round((new Date(session.date+'T'+session.end)-new Date(session.date+'T'+session.start))/60000);
    const gross=duration>0?duration:duration+1440;
    const modal=createDialog(action==='move'?'Sposta sessione':'Modifica pause',body);
    modal.message.textContent=session.title+' · '+session.start+'–'+session.end+' · durata lorda '+gross+' min';
    let date,start,pause,auto;
    if(action==='move'){
      date=field('date','Nuovo giorno','date',session.date);
      start=field('start','Nuovo orario di inizio','time',session.start);
      body.append(date.wrapper,start.wrapper);
      const note=document.createElement('p');note.className='edit-dialog-note';note.textContent='La durata lorda resta invariata; gli orari occupati non possono sovrapporsi.';
      body.append(note);
    }else{
      const autoLabel=document.createElement('label');autoLabel.className='check';
      auto=document.createElement('input');auto.type='checkbox';auto.checked=session.customBreakMinutes===undefined;
      const autoText=document.createElement('span');autoText.textContent='Usa i cicli automatici';
      autoLabel.append(auto,autoText);body.append(autoLabel);
      pause=field('pause','Pausa finale (minuti)','number',String(session.customBreakMinutes??5));
      pause.input.max=String(Math.max(0,gross-1));
      pause.input.disabled=auto.checked;
      body.append(pause.wrapper);
      const note=document.createElement('p');note.className='edit-dialog-note';
      note.textContent='La pausa è inclusa nei '+gross+' minuti lordi; non prolunga la sessione.';
      body.append(note);
      auto.addEventListener('change',()=>{pause.input.disabled=auto.checked;modal.error.hidden=true;});
    }
    let outcome=null;
    modal.cancel.onclick=()=>modal.dialog.close();
    modal.form.addEventListener('submit',event=>{
      event.preventDefault();
      modal.error.hidden=true;
      if(action==='move'){
        const parts=dateParts(date.input.value),clock=clockParts(start.input.value);
        if(!parts||!clock)return showError(modal.error,'Indica una data reale e un orario valido.');
        const when=new Date(parts[0],parts[1]-1,parts[2],clock[0],clock[1]);
        if(when.getFullYear()!==parts[0]||when.getMonth()!==parts[1]-1||when.getDate()!==parts[2]||when.getHours()!==clock[0]||when.getMinutes()!==clock[1])
          return showError(modal.error,'Questo orario non esiste nella data selezionata.');
        if(+when<Date.now())return showError(modal.error,'Non puoi spostare una sessione nel passato.');
        outcome={date:date.input.value,start:start.input.value};
      }else{
        if(auto.checked)outcome={pause:'auto'};
        else {
          const value=pause.input.value.trim(),number=Number(value);
          if(!value||!Number.isInteger(number)||number<0||number>=gross)
            return showError(modal.error,'La pausa deve essere un numero intero tra 0 e '+(gross-1)+' minuti.');
          outcome={pause:String(number)};
        }
      }
      modal.dialog.close();
    });
    modal.dialog.addEventListener('close',()=>{modal.dialog.remove();resolve(outcome);},{once:true});
    modal.dialog.showModal();
  });
}
export function chooseSyncConflict(conflict) {
  return new Promise(resolve=>{
    const content=document.createElement('div');content.className='sync-conflict-detail';
    for(const [label,value] of [['Dati locali',conflict.localPreview],['Dati Dropbox',conflict.remotePreview]]){
      const part=document.createElement('section');
      const title=document.createElement('strong');title.textContent=label;
      const description=document.createElement('p');description.textContent=value;
      part.append(title,description);content.append(part);
    }
    const choices=document.createElement('fieldset');
    const legend=document.createElement('legend');legend.textContent='Scegli quale versione conservare';
    choices.append(legend);
    const groupName='sync-choice';
    conflict.options.forEach((option,index)=>{
      const label=document.createElement('label');label.className='sync-choice';
      const radio=document.createElement('input');radio.type='radio';radio.name=groupName;radio.value=String(index);
      const span=document.createElement('span');span.textContent=option.label;label.append(radio,span);choices.append(label);
    });
    content.append(choices);
    const modal=createDialog('Conflitto di sincronizzazione',content);
    modal.message.textContent=conflict.label+' — nessuna versione verrà scelta automaticamente.';
    let result=null;
    modal.cancel.onclick=()=>modal.dialog.close();
    modal.form.addEventListener('submit',event=>{
      event.preventDefault();
      const selected=choices.querySelector('input:checked');
      if(!selected)return showError(modal.error,'Seleziona una delle versioni per continuare.');
      result=conflict.options[Number(selected.value)]?.value??null;
      modal.dialog.close();
    });
    modal.dialog.addEventListener('close',()=>{modal.dialog.remove();resolve(result);},{once:true});
    modal.dialog.showModal();
  });
}
