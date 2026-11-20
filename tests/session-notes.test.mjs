import test from 'node:test';
import assert from 'node:assert/strict';
import {groupSessions,sessionNotes,updatedSessionNotes} from '../obsidian/session-notes.js';
const s=(start,end,notes=[])=>({id:start,date:'2099-11-17',start,end,area:'Studio',linkedNotes:notes});
test('contiguous sessions group only with identical area and note resources',()=>{
 const note=[{path:'Nota',label:'Lettura'}];
 const groups=groupSessions([s('14:00','15:00',note),s('15:00','16:00',note),s('17:00','18:00',note),s('18:00','19:00')]);
 assert.deepEqual(groups.map(g=>g.sessions.length),[2,1,1]);
});
test('one work note can change without discarding legacy resources',()=>{
 const session=s('14:00','15:00',[{path:'Uno',label:'Uno'},{path:'Due',label:'Due'}]);
 assert.deepEqual(updatedSessionNotes(session,'[[Tre#Titolo|Tre]]',{replacePrimary:true}),[{path:'Tre#Titolo',label:'Tre'},{path:'Due',label:'Due'}]);
 assert.deepEqual(updatedSessionNotes(session,'',{removePath:'Due'}),[{path:'Uno',label:'Uno'}]);
 assert.throws(()=>updatedSessionNotes(session,'[[Uno]] [[Due]]'),/sola nota/);
 assert.throws(()=>updatedSessionNotes(session,'[[incompleto'),/sola nota/);
});
test('legacy assignments remain readable without requiring an estimate for new links',()=>{
 assert.deepEqual(sessionNotes({noteEstimateId:'a'},[{id:'a',path:'Nota',title:'Titolo'}]),[{path:'Nota',label:'Titolo'}]);
 assert.deepEqual(updatedSessionNotes(s('14:00','15:00'),'Una nota senza stima'),[{path:'Una nota senza stima',label:'Una nota senza stima'}]);
});

test('adding and promoting a session resource preserves the other links',()=>{
 const one={path:'Uno',label:'Uno'},two={path:'Due#Sezione',label:'Titolo'};
 const session={linkedNotes:[one]};
 const notes=updatedSessionNotes(session,'[[Due#Sezione|Titolo]]');
 assert.deepEqual(notes,[one,two]);
 assert.deepEqual(updatedSessionNotes({linkedNotes:notes},'[[Due#Sezione]]'),notes);
 assert.deepEqual(updatedSessionNotes({linkedNotes:notes},'',{primaryPath:two.path}),[two,one]);
});
