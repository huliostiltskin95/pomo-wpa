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
      byId('planner-add')?.click();
      byId('planner-rows')?.lastElementChild?.querySelector('select')?.focus();
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
        form.after(paste);
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
