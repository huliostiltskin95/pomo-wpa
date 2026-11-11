import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {webcrypto} from "node:crypto";

function mockPlugin(mobile) {
  let saved=null;
  const element=()=>({addClass(){},setAttribute(){},addEventListener(){},textContent:""});
  const workspace={
    getLeavesOfType:()=>[],
    getActiveFile:()=>null,
    getRightLeaf:()=>({setViewState:async()=>{}}),
    revealLeaf:async()=>{}
  };
  class Plugin {
    constructor(){this.app={workspace};this.commands=[];}
    loadData(){return Promise.resolve(saved);}
    saveData(value){saved=structuredClone(value);return Promise.resolve();}
    registerView(){}
    addSettingTab(){}
    addCommand(command){this.commands.push(command);}
    addRibbonIcon(){}
    addStatusBarItem(){return element();}
    registerInterval(){}
    registerDomEvent(){}
  }
  class ItemView {}
  class Modal {}
  class PluginSettingTab { constructor(app,plugin){this.app=app;this.plugin=plugin;} }
  class Setting {}
  const setIcon=()=>{};
  class Notice {constructor(message){if(/failed|errore/i.test(message))throw Error(message);}}
  const context={
    module:{exports:{}},exports:{},require:id=>{
      if(id!=="obsidian")throw Error("Unexpected external "+id);
      return {Plugin,ItemView,Modal,Notice,PluginSettingTab,Setting,setIcon,Platform:{isMobile:mobile},requestUrl:async()=>{throw Error("No live Dropbox in mock");}};
    },
    console,Date,Intl,Math,JSON,Map,Set,Symbol,Error,Number,String,Boolean,Array,Object,
    Promise,URL,URLSearchParams,TextEncoder,Uint8Array,btoa,clearTimeout,setTimeout,
    crypto:webcrypto,navigator:{onLine:false},
    window:{setInterval:()=>1,setTimeout,clearTimeout},
    document:{hidden:false}
  };
  const code=readFileSync("obsidian/dist/main.js","utf8");
  vm.runInNewContext(code,context,{filename:"tempvs-obsidian.cjs"});
  const PluginClass=context.module.exports.default;
  assert.equal(typeof PluginClass,"function");
  return {PluginClass,getSaved:()=>saved};
}
for(const mobile of [false,true])test("Obsidian "+(mobile?"mobile":"desktop")+" runtime loads and preserves a completed session",async()=>{
  const {PluginClass,getSaved}=mockPlugin(mobile);
  const p=new PluginClass();
  await p.onload();
  assert.ok(p.commands.some(c=>c.id==="open-tempvs"));
  assert.ok(p.commands.some(c=>c.id==="toggle-compact-view"));
  await p.start("Studio",30,25,5);
  assert.equal(p.state.sessions.length,1);
  assert.equal(p.state.sessions[0].customBreakMinutes,5);
  await p.togglePause();
  assert.equal(p.state.sessions[0].paused,true);
  await p.finish();
  assert.equal(p.state.sessions[0].finished,true);
  await p.onunload();
  const next=new PluginClass();
  await next.onload();
  assert.equal(next.state.sessions.length,1);
  assert.equal(next.state.sessions[0].finished,true);
  assert.ok(getSaved().archive.sessions.length);
  assert.equal(next.compact,mobile);
  await next.onunload();
});
