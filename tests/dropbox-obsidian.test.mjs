import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import {createDropboxSync} from "../core/tempo-dropbox.js";

if(!globalThis.crypto)globalThis.crypto=webcrypto;
function storage(initial={}) {
  const m=new Map(Object.entries(initial));
  return {getItem:key=>m.get(key)??null,setItem:(key,v)=>m.set(key,String(v)),removeItem:key=>m.delete(key)};
}
const response=(status,payload,headers={})=>({status,ok:status>=200&&status<300,
  text:async()=>JSON.stringify(payload),json:async()=>payload,
  headers:{get: key => headers[key] || null}});
test("PKCE manual flow omits redirect and survives persisted pending authorization",async()=>{
  const saved=storage(),urls=[];
  const requests=[];
  const sync=createDropboxSync({
    getState:()=>({sessions:[],tasks:[],history:[]}),
    applyRemote:async()=>{},
    onStatus:()=>{},
    platform:{
      storage:saved,transientStorage:saved,manualAuthorization:true,
      navigate:async url=>urls.push(url),
      request:async (url,options)=>{
        requests.push({url,options});
        return response(200,{refresh_token:"refresh-123",access_token:"access-123",expires_in:14400});
      }
    }
  });
  const url=await sync.connect("validkey123");
  const params=new URL(url).searchParams;
  assert.equal(urls[0],url);
  assert.equal(params.has("redirect_uri"),false);
  assert.equal(params.get("code_challenge_method"),"S256");
  assert.equal(params.get("token_access_type"),"offline");
  assert.ok(saved.getItem("tempo-dropbox-pkce"));
  await sync.exchangeManualCode("authorize-me");
  assert.equal(sync.info().connected,true);
  const body=requests[0].options.body;
  assert.equal(body.get("code"),"authorize-me");
  assert.equal(body.has("redirect_uri"),false);
  assert.equal(saved.getItem("tempo-dropbox-pkce"),null);
});
test("initial download retains the same remote snapshot schema and recovery",async()=>{
  const saved=storage({"tempo-dropbox-auth-v1":JSON.stringify({appKey:"validkey123",refreshToken:"refresh-123",accessToken:"access-123",expiresAt:Date.now()+900000})});
  let local={sessions:[],tasks:[],history:[],defaults:{simple:{areas:[{name:"Studio",description:""}]}}};
  const remote={app:"Tempo Pomodoro",version:5,sessions:[],tasks:[],history:[],defaults:{simple:{areas:[{name:"Studio",description:"Esempio"}]}},syncDeleted:{tasks:[],sessions:[]}};
  let applied;
  const sync=createDropboxSync({
    getState:()=>local,
    applyRemote:async data=>{applied=data;local=data;},
    normalizeRemote:data=>data,
    onStatus:()=>{},
    platform:{
      storage:saved,transientStorage:saved,manualAuthorization:true,
      isOnline:()=>true,
      request:async (url,options)=>{
        if(url.includes("get_metadata"))return response(200,{rev:"rev123"});
        if(url.includes("files/download"))return response(200,remote,{"Dropbox-API-Result":JSON.stringify({rev:"rev123"})});
        throw Error("Unexpected request "+url);
      }
    }
  });
  await sync.firstSync("download");
  assert.deepEqual(applied,remote);
  assert.ok(sync.recovery());
  assert.equal(sync.info().ready,true);
  assert.equal(sync.info().dirty,false);
});

for(const action of ['disconnect','destroy'])test(`${action} prevents a late Dropbox download from replacing local data`,async()=>{
 const saved=storage({'tempo-dropbox-auth-v1':JSON.stringify({appKey:'validkey123',refreshToken:'r',accessToken:'a',expiresAt:Date.now()+900000})});
 let release,requested;
 const gate=new Promise(resolve=>{release=resolve;});
 const started=new Promise(resolve=>{requested=resolve;});
 let applied=false;
 const sync=createDropboxSync({getState:()=>({sessions:[],tasks:[],history:[]}),applyRemote:async()=>{applied=true;},onStatus:()=>{},
   platform:{storage:saved,transientStorage:saved,manualAuthorization:true,isOnline:()=>true,request:async url=>{
     if(url.includes('get_metadata'))return response(200,{rev:'remote'});
     requested();await gate;
     return response(200,{sessions:[],tasks:[],history:[]},{'Dropbox-API-Result':JSON.stringify({rev:'remote'})});
   }}});
 const download=sync.firstSync('download');
 await started;
 sync[action]();release();
 await assert.rejects(download,/annullata/);
 assert.equal(applied,false);
 assert.equal(sync.info().ready,false);
 if(action==='disconnect')assert.equal(saved.getItem('tempo-dropbox-sync-v1'),null);
});

test('destroy cancels scheduled synchronization without removing saved credentials',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const saved=storage({
   'tempo-dropbox-auth-v1':JSON.stringify({refreshToken:'r'}),
   'tempo-dropbox-sync-v1':JSON.stringify({ready:true,dirty:false})
 });
 let calls=0;
 const sync=createDropboxSync({getState:()=>({sessions:[]}),applyRemote:async()=>{},onStatus:()=>{},platform:{storage:saved,transientStorage:saved,request:async()=>{calls++;throw Error('unexpected network request');}}});
 sync.changed();sync.destroy();t.mock.timers.tick(3000);
 assert.equal(calls,0);
 assert.ok(saved.getItem('tempo-dropbox-auth-v1'));
});
