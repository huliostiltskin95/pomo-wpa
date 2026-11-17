import {sessionBounds} from '../core/tempo-core.js';
import {noteLinks} from './notes-integration.js';

export function sessionNotes(session,estimates=[]){
 if(session.linkedNotes?.length)return session.linkedNotes;
 const legacy=estimates.find(n=>n.id===session.noteEstimateId);
 return legacy?[{path:legacy.path,label:legacy.title}]:[];
}
export function updatedSessionNotes(session,input,{removePath,estimates=[]}={}){
 const previous=sessionNotes(session,estimates);
 if(removePath!==undefined)return previous.filter(n=>n.path!==removePath);
 const text=input.trim();
 if(!text)return previous.slice(1);
 const links=noteLinks(text.startsWith('[[')?text:'[['+text+']]');
 if(links.length!==1||/[\r\n]/.test(text)||text.startsWith('[[')&&!/^\[\[[^\]\n]+\]\]$/.test(text))throw Error('Scegli una sola nota: [[nota|titolo]].');
 return [links[0],...previous.slice(1).filter(n=>n.path!==links[0].path)];
}
export function groupSessions(sessions,estimates=[]){
 const groups=[];
 for(const session of sessions){
  const notes=sessionNotes(session,estimates);
  const key=JSON.stringify([session.areaId||session.area||session.title,session.noteBlockId||'',session.date,notes]);
  const last=groups.at(-1);
  if(last&&last.key===key&&+sessionBounds(last.sessions.at(-1)).end===+sessionBounds(session).start)last.sessions.push(session);
  else groups.push({key,notes,sessions:[session]});
 }
 return groups;
}
