import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as core from '../core/tempo-core.js';

function plugin(){
  const source=readFileSync(new URL('../obsidian/main.js',import.meta.url),'utf8')
    .replace(/^import .*;\n/gm,'').replace('export default class TempvsPlugin','class TempvsPlugin');
  const Plugin=vm.runInNewContext(source+'\nTempvsPlugin;',{...core,
    Plugin:class{},ItemView:class{},PluginSettingTab:class{},Notice:class{},
  });
  const p=new Plugin();
  p.state={sessions:[]};p.audioKind='brown';p.audioVolume=25;p.refreshAudioControls=()=>{};
  p.ambient={playing:false,audible:false,starts:[],
    async start(kind,volume,audible){this.starts.push({kind,volume,audible});this.playing=true;this.audible=audible;return true;},
    setAudible(value){this.audible=value;},stop(){this.playing=false;this.audible=false;}};
  return p;
}
test('prearmed audio stays silent until focus, survives breaks and completion, and can be cancelled',async()=>{
  const p=plugin();
  await p.toggleAmbient();
  assert.equal(p.ambient.playing,true);
  assert.equal(p.ambient.starts[0].audible,false);
  p.state.sessions=[{id:'s',title:'Studio',date:'2026-11-17',start:'10:00',end:'11:00',workMinutes:25,breakEnabled:true}];
  for(const [time,audible] of [['09:59',false],['10:00',true],['10:26',false],['10:30',true],['11:01',false]]){
    p.syncAmbient(new Date('2026-11-17T'+time+':00'));
    assert.equal(p.ambient.audible,audible,time);
    assert.equal(p.ambient.playing,true,time);
  }
  p.state.sessions[0].paused=true;
  p.syncAmbient(new Date('2026-11-17T10:10:00'));
  assert.equal(p.ambient.audible,false);
  await p.toggleAmbient();
  p.syncAmbient(new Date('2026-11-17T10:30:00'));
  assert.equal(p.ambient.playing,false);
  assert.equal(p.ambient.starts.length,1);
});
