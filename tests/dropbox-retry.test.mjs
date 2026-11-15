import test from 'node:test';
import assert from 'node:assert/strict';
import {createDropboxSync} from '../core/tempo-dropbox.js';

function storage(){
  const records=new Map();
  return {
    getItem:key=>records.get(key)??null,
    setItem:(key,value)=>records.set(key,value),
    removeItem:key=>records.delete(key)
  };
}
function fixture(request){
  const store=storage();
  const snapshot={sessions:[],tasks:[],history:[],defaults:{},appearance:{},syncDeleted:{tasks:[],sessions:[]}};
  store.setItem('tempo-dropbox-auth-v1',JSON.stringify({
    appKey:'abcabcabc',refreshToken:'refresh',accessToken:'access',expiresAt:Date.now()+120000
  }));
  store.setItem('tempo-dropbox-sync-v1',JSON.stringify({rev:'rev1',ready:true,dirty:false}));
  store.setItem('tempo-dropbox-common-base-v1',JSON.stringify(snapshot));
  const statuses=[];
  const cloud=createDropboxSync({
    getState:()=>snapshot,applyRemote:async()=>{},
    onStatus:(message,info)=>statuses.push({message,info}),
    platform:{storage:store,transientStorage:store,request}
  });
  return {cloud,store,statuses};
}

test('Dropbox verifies unchanged revisions and persists success time',async()=>{
  const {cloud,store,statuses}=fixture(async()=>({
    ok:true,status:200,json:async()=>({rev:'rev1'}),text:async()=>'',headers:{get:()=>null}
  }));
  try{
    await cloud.sync();
    assert(cloud.info().lastSyncedAt);
    assert.equal(JSON.parse(store.getItem('tempo-dropbox-sync-v1')).lastSyncedAt,cloud.info().lastSyncedAt);
    assert.equal(statuses.at(-1).message,'Dropbox sincronizzato');
  }finally{cloud.destroy();}
});

test('Dropbox network outage is visible and schedules a safe retry',async()=>{
  const {cloud,statuses}=fixture(async()=>({
    ok:false,status:503,json:async()=>({}),text:async()=> 'Service unavailable',headers:{get:()=>null}
  }));
  try{
    await assert.rejects(cloud.sync(),/Dropbox HTTP 503/);
    assert.equal(statuses.at(-1).info.phase,'error');
    assert.match(statuses.at(-1).message,/tentativo automatico/);
    assert.equal(cloud.info().ready,true);
  }finally{cloud.destroy();}
});
