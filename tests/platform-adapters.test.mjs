import test from 'node:test';
import assert from 'node:assert/strict';
import {createArchiveStore} from '../core/tempo-archive-store.js';
import {createDropboxSync} from '../core/tempo-dropbox.js';

function memoryStorage(initial={}){
  const values=new Map(Object.entries(initial));
  return {getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
}

test('archive adapter migrates legacy data and preserves original snapshot',()=>{
  const raw=JSON.stringify({sessions:[{id:'s1'}]});
  const storage=memoryStorage({'tempo-pomodoro-v1':raw});
  const store=createArchiveStore({storage,normalize:x=>({...x,normalized:true})});
  assert.equal(store.load().normalized,true);
  assert.equal(store.getLegacyCopy(),raw);
  assert.equal(JSON.parse(storage.getItem('tempo-pomodoro-v2')).sessions[0].id,'s1');
  store.save({sessions:[]});
  assert.equal(store.getLegacyCopy(),raw);
});

test('invalid archive never gets overwritten during load',()=>{
  const storage=memoryStorage({'tempo-pomodoro-v2':'{invalid'});
  const store=createArchiveStore({storage,normalize:x=>x});
  assert.throws(()=>store.load(),SyntaxError);
  assert.equal(storage.getItem('tempo-pomodoro-v2'),'{invalid');
});

test('Dropbox sync uses injected persistent storage without browser globals',()=>{
  const persistent=memoryStorage();
  const transient=memoryStorage();
  const messages=[];
  const sync=createDropboxSync({
    getState:()=>({sessions:[],tasks:[],history:[]}),
    applyRemote:async()=>{},
    onStatus:message=>messages.push(message),
    platform:{storage:persistent,transientStorage:transient,currentUrl:()=> 'https://example.test/',redirectUri:()=> 'https://example.test/',clearCallback:()=>{}}
  });
  assert.equal(sync.info().connected,false);
  sync.changed();
  assert.equal(JSON.parse(persistent.getItem('tempo-dropbox-sync-v1')).dirty,true);
  sync.disconnect();
  assert.equal(persistent.getItem('tempo-dropbox-sync-v1'),null);
  assert.equal(sync.info().connected,false);
  assert.ok(messages.length>0);
});
