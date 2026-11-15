import test from 'node:test';
import assert from 'node:assert/strict';
import {createDropboxSync} from '../core/tempo-dropbox.js';
import {normalizeArchive} from '../core/tempo-simple.js';
const response=(status,data,rev)=>({ok:status>=200&&status<300,status,json:async()=>data,text:async()=>JSON.stringify(data),headers:{get:key=>key==='Dropbox-API-Result'&&rev?JSON.stringify({rev}):null}});
function client(request,{ready=true,expired=false}={}){
 const initial=normalizeArchive({sessions:[]});let state=structuredClone(initial);
 const entries=new Map([
 ['tempo-dropbox-auth-v1',JSON.stringify({appKey:'app123456',refreshToken:'refresh',accessToken:'access',expiresAt:expired?0:Date.now()+600000})],
 ['tempo-dropbox-sync-v1',JSON.stringify({rev:ready?'r1':null,ready,dirty:false})],
 ...(ready?[['tempo-dropbox-common-base-v1',JSON.stringify(initial)]]:[])
 ]);
 const storage={getItem:key=>entries.get(key)??null,setItem:(key,v)=>entries.set(key,v),removeItem:key=>entries.delete(key)};
 const statuses=[];
 const cloud=createDropboxSync({getState:()=>state,applyRemote:async next=>{state=normalizeArchive(next);},normalizeRemote:normalizeArchive,onStatus:(message,info)=>statuses.push({message,info}),platform:{request,storage,transientStorage:storage,isOnline:()=>true}});
 return {cloud,statuses,storage,state:()=>state,edit:change=>{change(state);cloud.changed();},initial};
}
const task=(title='Originale')=>({id:'t1',title,area:'Studio',status:'todo'});
test('Dropbox legacy sessions-only backup is normalized before replacing local data',async()=>{
 const c=client(async url=>url.includes('get_metadata')?response(200,{rev:'r2'}):response(200,{sessions:[]},'r2'),{ready:false});
 try{await c.cloud.firstSync('download');assert.deepEqual(c.state().tasks,[]);assert(c.cloud.info().lastSyncedAt);}finally{c.cloud.destroy();}
});
test('invalid downloaded data or metadata never replaces the archive or marks success',async()=>{
 for(const invalid of [{sessions:[],tasks:'bad'},{sessions:[],tasks:[{id:'duplicate'},{id:'duplicate'}]},{sessions:[{id:'broken'}]}]){
 const c=client(async url=>url.includes('get_metadata')?response(200,{rev:'r2'}):response(200,invalid,'r2'));
 try{await assert.rejects(c.cloud.sync());assert.deepEqual(c.state(),c.initial);assert.equal(c.cloud.info().lastSyncedAt,null);assert.equal(c.cloud.info().phase,'error');}finally{c.cloud.destroy();}
 }
 const c=client(async()=>response(200,{}));
 try{await assert.rejects(c.cloud.sync(),/revisione assente/);assert.equal(c.cloud.info().lastSyncedAt,null);}finally{c.cloud.destroy();}
});
test('expired Dropbox token is refreshed; malformed refresh response leaves data intact',async()=>{
 for(const valid of [true,false]){
 let refresh=0,metadata=0;
 const c=client(async url=>{
 if(url.includes('oauth2/token')){refresh++;return response(200,valid?{access_token:'new',expires_in:14400}:{});}
 metadata++;return response(200,{rev:'r1'});
 },{expired:true});
 try{
 if(valid){await c.cloud.sync();assert.equal(metadata,1);assert(c.cloud.info().lastSyncedAt);}
 else{await assert.rejects(c.cloud.sync(),/rinnovo/);assert.equal(metadata,0);assert.equal(c.cloud.info().lastSyncedAt,null);}
 assert.equal(refresh,1);
 }finally{c.cloud.destroy();}
 }
});
test('network interruptions and throttling retain pending local changes until confirmed',async()=>{
 for(const failure of ['network',429,503]){
 let fail=true,uploads=0;
 const c=client(async url=>{
 if(fail){if(failure==='network')throw new TypeError('Network unavailable');return response(failure,{});}
 if(url.includes('upload')){uploads++;return response(200,{rev:'r2'});}
 return response(200,{rev:'r1'});
 });
 try{
 c.edit(s=>s.tasks.push(task()));await assert.rejects(c.cloud.sync());
 assert.equal(c.cloud.info().dirty,true);assert.equal(c.cloud.info().lastSyncedAt,null);assert.match(c.statuses.at(-1).message,/tentativo automatico/);
 fail=false;await c.cloud.sync();assert.equal(uploads,1);assert.equal(c.cloud.info().dirty,false);assert(c.cloud.info().lastSyncedAt);
 }finally{c.cloud.destroy();}
 }
});
test('concurrent edits are reported as conflicts without automatic uploads',async()=>{
 let uploaded=false;
 const remote=normalizeArchive({sessions:[],tasks:[task('Remoto')]});
 const c=client(async url=>{
 if(url.includes('get_metadata'))return response(200,{rev:'r2'});
 if(url.includes('download'))return response(200,remote,'r2');uploaded=true;return response(200,{rev:'r3'});
 });
 try{c.edit(s=>s.tasks.push(task('Locale')));await c.cloud.sync();assert.equal(c.cloud.info().phase,'conflict');assert.equal(uploaded,false);assert.equal(c.state().tasks[0].title,'Locale');assert.equal(c.cloud.info().lastSyncedAt,null);}finally{c.cloud.destroy();}
});
test('a local edit during upload remains dirty and is sent in the next pass',async()=>{
 let release,started;const waiting=new Promise(resolve=>started=resolve);let uploads=0,remoteRev='r1';
 const c=client(async url=>{
 if(url.includes('get_metadata'))return response(200,{rev:remoteRev});
 uploads++;
 if(uploads===1){started();await new Promise(resolve=>release=resolve);}
 remoteRev='r'+(uploads+1);return response(200,{rev:remoteRev});
 });
 try{
 c.edit(s=>s.tasks.push(task()));const pending=c.cloud.sync();await waiting;c.edit(s=>s.tasks[0].title='Modifica successiva');release();await pending;
 assert.equal(c.cloud.info().dirty,true);assert.equal(c.state().tasks[0].title,'Modifica successiva');
 await c.cloud.sync();assert.equal(uploads,2);assert.equal(c.cloud.info().dirty,false);
 }finally{c.cloud.destroy();}
});
test('manual download refuses an edit that arrives while the response is pending',async()=>{
 let release,started;const waiting=new Promise(resolve=>started=resolve);
 const remote=normalizeArchive({sessions:[],tasks:[task('Remoto')]});
 const c=client(async()=>{started();await new Promise(resolve=>release=resolve);return response(200,remote,'r2');});
 try{const pending=c.cloud.forceDownload(true);await waiting;c.edit(s=>s.tasks.push(task('Locale')));release();await assert.rejects(pending,/cambiati/);assert.equal(c.state().tasks[0].title,'Locale');assert.equal(c.cloud.info().lastSyncedAt,null);}finally{c.cloud.destroy();}
});
test('replacement saves a recovery copy and concurrent first operations are blocked',async()=>{
 let release,started;const waiting=new Promise(resolve=>started=resolve);
 const c=client(async url=>{
 if(url.includes('get_metadata')){started();await new Promise(resolve=>release=resolve);return response(200,{rev:'r2'});}
 return response(200,{sessions:[]},'r2');
 },{ready:false});
 try{
 c.edit(s=>s.tasks.push(task('Da conservare')));const pending=c.cloud.firstSync('download');await waiting;
 await assert.rejects(c.cloud.firstSync('upload'),/operazione manuale/);release();await pending;
 assert.equal(c.cloud.recovery().data.tasks[0].title,'Da conservare');assert.deepEqual(c.state().tasks,[]);
 }finally{c.cloud.destroy();}
});
test('retry waits for exponential backoff and honors the Dropbox Retry-After header',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let attempts=0;
 const c=client(async()=>{
 attempts++;
 if(attempts<3){const res=response(attempts===1?503:429,{});if(attempts===2)res.headers.get=key=>key==='Retry-After'?'12':null;return res;}
 return response(200,{rev:'r1'});
 });
 try{
 await assert.rejects(c.cloud.sync());t.mock.timers.tick(4999);assert.equal(attempts,1);
 t.mock.timers.tick(1);await new Promise(setImmediate);assert.equal(attempts,2);
 t.mock.timers.tick(11999);assert.equal(attempts,2);
 t.mock.timers.tick(1);await new Promise(setImmediate);assert.equal(attempts,3);assert(c.cloud.info().lastSyncedAt);
 }finally{c.cloud.destroy();}
});
