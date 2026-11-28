import {findDailyBlocks} from './daily-plan.js';
import {syntaxTokens,wikiTokens} from './syntax.js';

export function syntaxExtension(){
  const {Decoration,ViewPlugin}=require('@codemirror/view');
  return ViewPlugin.fromClass(class {
    constructor(view){this.rebuild(view,true);}
    update(update){
      if(update.docChanged||update.viewportChanged)this.rebuild(update.view,update.docChanged);
    }
    rebuild(view,documentChanged){
      const doc=view.state.doc;
      if(documentChanged)this.blocks=findDailyBlocks(doc.toString(),true);
      const marks=[];
      for(const block of this.blocks){
        for(const visible of view.visibleRanges){
          const from=Math.max(block.start,visible.from),to=Math.min(block.end,visible.to);
          if(from>=to)continue;
          const first=doc.lineAt(from).number,last=doc.lineAt(to-1).number;
          for(let n=first;n<=last;n++){
            const line=doc.line(n);
            for(const token of syntaxTokens(line.text)){
              const start=Math.max(from,line.from+token.from),end=Math.min(to,line.from+token.to);
              if(start<end)marks.push(Decoration.mark({class:'tempvs-syntax-'+token.kind}).range(start,end));
            }
          }
        }
      }
      this.decorations=Decoration.set(marks,true);
    }
  },{
    decorations:instance=>instance.decorations,
    eventHandlers:{mousedown(event,view){
      if(event.button!==0||!(event.metaKey||event.ctrlKey))return false;
      const pos=view.posAtCoords({x:event.clientX,y:event.clientY});
      if(pos==null||!this.blocks.some(block=>pos>=block.start&&pos<block.end))return false;
      const line=view.state.doc.lineAt(pos);
      const link=wikiTokens(line.text).find(token=>pos>=line.from+token.from&&pos<line.from+token.to);
      const {editorInfoField,Notice}=require('obsidian');
      const info=view.state.field(editorInfoField,false);
      if(!link||!info?.file)return false;
      event.preventDefault();
      void info.app.workspace.openLinkText(link.target,info.file.path,false).catch(e=>new Notice(e.message));
      return true;
    }}
  });
}
