import {findDailyBlocks} from './daily-plan.js';
import {syntaxTokens} from './syntax.js';

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
  },{decorations:instance=>instance.decorations});
}
