import {timeFirstArea} from './plain-syntax.js';
// Offsets refer to the original line so rendering never rewrites Markdown.
const tokens = /^\s*T:|(?<=\s)@[^\d\s][^\n]*$|<!--.*?(?:-->|$)|\[\[[^\]]*(?:\]\]|$)|^\s*date:(?=\s|$)|\b\d{4}-\d{2}-\d{2}\b|\+?\d{2}:\d{2}(?:-\d{2}:\d{2})?|\bx\d+\b|=\s*\d+|\b\d+(?:[.,]\d+)?[hms]\b|[@~-]\d+(?:[.,]\d+)?[hms]?|^\s*-(?=\s|$)/gi;
export function syntaxTokens(line){
  const parts=[];
  const add=(from,to,kind)=>{if(to>from)parts.push({from,to,kind});};
  const area=timeFirstArea(line);
  const heading=line.match(/^(\s*)(@?[^@+\-=\s\d][^@+\[\]=]*?)(?=\s+(?:[@+]|\d))/);
  let offset=0;
  if(heading&&!/^\s*(?:date|T):/i.test(line)){
    offset=heading[0].length;
    add(heading[1].length,offset,'area');
  }
  for(const match of line.slice(offset).matchAll(tokens)){
    const value=match[0],from=offset+match.index,end=from+value.length;
    if(area && from >= area.from && from < area.to)continue;
    if(value.startsWith('[[')){
      const closed=value.endsWith(']]'),targetEnd=closed?end-2:end;
      const alias=value.indexOf('|'),anchor=value.indexOf('#');
      const separator=alias<0?targetEnd:from+alias;
      const section=anchor>=0&&from+anchor<separator?from+anchor:separator;
      add(from,from+2,'punctuation');
      add(from+2,section,'link');add(section,separator,'section');
      if(alias>=0){add(separator,separator+1,'punctuation');add(separator+1,targetEnd,'alias');}
      add(targetEnd,end,'punctuation');
    }else{
      let kind='duration';
      if(/^@[^\d]/.test(value))kind='area';
      else if(value.trim().toUpperCase()==='T:')kind='keyword';
      else if(value.startsWith('<!--'))kind='comment';
      else if(value.includes(':'))kind=/date:/i.test(value)?'keyword':'time';
      else if(/^\d{4}-/.test(value))kind='date';
      else if(/^(?:=|x\d)/i.test(value))kind='count';
      else if(value.trim()==='-')kind='punctuation';
      add(from,end,kind);
    }
  }
  if(area){parts.push({...area,kind:'area'});parts.sort((a,b)=>a.from-b.from);}
  return parts;
}
export function renderSyntaxLine(parent,line,areas){
  let cursor=0;
  for(const {from,to,kind} of syntaxTokens(line)){
    parent.append(line.slice(cursor,from));
    const value=line.slice(from,to);
    const span=parent.createSpan({text:value,cls:'tempvs-syntax-'+kind});
    if(kind==='area'){
      const area=areas.find(a=>a.name.toLowerCase()===value.replace(/^@/,'').toLowerCase());
      if(area){span.addClass('tempvs-area-mark');span.style.setProperty('--tempvs-area-color',area.color);}
    }
    cursor=to;
  }
  parent.append(line.slice(cursor));
}
