import test from "node:test";
import assert from "node:assert/strict";
import {createDropboxSync} from "../core/tempo-dropbox.js";
import {normalizeArchive} from "../core/tempo-simple.js";

function kv(initial={}) {
  const m=new Map(Object.entries(initial));
  return {getItem:key=>m.get(key)??null,setItem:(key,v)=>m.set(key,String(v)),removeItem:key=>m.delete(key)};
}
const response=(status,data,headers={})=>({
  status,ok:status>=200&&status<300,
  json:async()=>data,text:async()=>JSON.stringify(data),
  headers:{get:key=>headers[key]??null}
});
function fakeDropbox(){
  let data=null,rev=0;
  const request=async (url, options={})=>{
    if(url.includes("/files/get_metadata"))
      return data?response(200,{rev:String(rev)}):response(409,{error:{".tag":"path",path:{".tag":"not_found"}}});
    if(url.includes("/files/download"))
      return data?response(200,structuredClone(data),{"Dropbox-API-Result":JSON.stringify({rev:String(rev)})}):
        response(409,{error:{".tag":"path",path:{".tag":"not_found"}}});
    if(url.includes("/files/upload")){
      const args=JSON.parse(options.headers["Dropbox-API-Arg"]);
      if(data && (args.mode?.[".tag"]!=="update"||args.mode.update!==String(rev)))return response(409,{error:"conflict"});
      if(!data && args.mode!=="add")return response(409,{error:"conflict"});
      data=JSON.parse(options.body);rev++;
      return response(200,{rev:String(rev)});
    }
    throw Error("Unexpected Dropbox API call: "+url);
  };
  return {request,remote:()=>data,revision:()=>rev};
}
function client(server, initial){
  let current=normalizeArchive(structuredClone(initial));
  const token={appKey:"validkey123",refreshToken:"refresh",accessToken:"access",expiresAt:Date.now()+600000};
  const store=kv({"tempo-dropbox-auth-v1":JSON.stringify(token)});
  const sync=createDropboxSync({
    getState:()=>current,
    applyRemote:async next=>{current=normalizeArchive(next);},
    normalizeRemote:normalizeArchive,
    onStatus:()=>{},
    platform:{storage:store,transientStorage:store,manualAuthorization:true,isOnline:()=>true,request:server.request}
  });
  return {sync,state:()=>current,store,edit:change=>{change(current);sync.changed();}};
}
const empty=()=>({sessions:[],tasks:[],history:[]});
const session=(id,area,start,end)=>({
  id,title:area,area,date:"2099-10-10",start,end,
  workMinutes:25,breakEnabled:true,actualSeconds:0
});

test("PWA and Obsidian adapters preserve independent sessions in one Dropbox file",async()=>{
  const server=fakeDropbox();
  const pwa=client(server,empty()),obsidian=client(server,empty());
  pwa.edit(s=>s.sessions.push(session("pwa-1","Studio","08:00","09:00")));
  await pwa.sync.firstSync("upload");
  obsidian.edit(s=>s.sessions.push(session("obs-1","Lavoro","10:00","11:00")));
  await obsidian.sync.firstSync("merge");
  assert.deepEqual(new Set(server.remote().sessions.map(s=>s.id)),new Set(["pwa-1","obs-1"]));
  await pwa.sync.sync();
  assert.deepEqual(new Set(pwa.state().sessions.map(s=>s.id)),new Set(["pwa-1","obs-1"]));
  assert.equal(pwa.sync.info().dirty,false);
  assert.equal(obsidian.sync.info().dirty,false);
});
test("revision conflicts reject stale overwrites rather than replacing remote data",async()=>{
  const server=fakeDropbox();
  const first=client(server,empty()),second=client(server,empty());
  first.edit(s=>s.sessions.push(session("one","Studio","08:00","09:00")));
  await first.sync.firstSync("upload");
  await second.sync.firstSync("download");
  first.edit(s=>s.sessions.push(session("two","Lavoro","10:00","11:00")));
  await first.sync.sync();
  second.edit(s=>s.sessions.push(session("three","Personale","12:00","13:00")));
  await second.sync.mergeNow();
  assert.deepEqual(new Set(server.remote().sessions.map(s=>s.id)),new Set(["one","two","three"]));
});
