import {Modal, Notice} from 'obsidian';

export class DailyPlannerModal extends Modal {
 constructor(controller,file){
  super(controller.plugin.app);
  this.controller=controller;
  this.file=file;
 }
 onOpen(){
  const {contentEl,file,controller}=this;
  contentEl.createEl('h2',{text:'Pianifica la giornata'});
  contentEl.createEl('small',{text:file.path});
  const form=contentEl.createEl('form',{cls:'tempvs-form'});
  const input=(name,type,attrs={})=>{
   const label=form.createEl('label',{text:name});
   return label.createEl('input',{attr:{type,...attrs}});
  };
  const start=input('Inizio','time'),end=input('Fine','time');
  const minutes=input('Durata lorda (minuti)','number',{required:'',min:'1',step:'1',value:'30'});
  const area=form.createEl('label',{text:'Area'}).createEl('select',{attr:{required:''}});
  for(const item of controller.plugin.state.defaults.simple.areas)area.createEl('option',{value:item.name,text:item.name});
  const note=input('Nota','text',{placeholder:'Titolo oppure [[nota#sezione|alias]]'});
  const preview=form.createEl('code', {attr:{'aria-live':'polite'}});
  const error=form.createEl('div',{attr:{role:'alert'}});
  const save=form.createEl('button',{text:'Aggiungi alla giornata',cls:'mod-cta',attr:{type:'submit'}});
  const row=()=>{
   const time=start.value+(end.value?'-'+end.value:'');
   const name=note.value.trim();
   const link=name&&!name.startsWith('[[')?'[['+name+']]':name;
   return [time,minutes.value&&minutes.value+'m',area.value,link].filter(Boolean).join(' ');
  };
  const refresh=()=>{preview.textContent=row();error.empty();};
  form.oninput=refresh;
  refresh();
  form.onsubmit=async event=>{
   event.preventDefault();
   if(save.disabled)return;
   save.disabled=true;
   try{
    if(end.value&&!start.value)throw Error('Indica anche l’orario di inizio.');
    if(!end.value&&!note.value.trim())throw Error('Per una singola attività indica la nota, oppure completa la fascia oraria.');
    await controller.appendPlannerRow(file,row());
    this.close();
    new Notice('Riga aggiunta alla nota quotidiana.');
   }catch(e){error.textContent=e.message;}
   finally{save.disabled=false;}
  };
 }
 onClose(){this.contentEl.empty();}
}
