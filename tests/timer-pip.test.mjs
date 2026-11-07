import test from 'node:test';
import assert from 'node:assert/strict';
import {timerColor, BREAK_COLOR} from '../timer-pip.js';
import {getPhase} from '../core/tempo-core.js';
test('focus keeps area color; all breaks and manual suspension are blue',()=>{
 const area='#A34270';
 assert.equal(timerColor(area,null,false),area);
 assert.equal(timerColor(area,{kind:'work'},false),area);
 assert.equal(timerColor(area,{kind:'break'},false),BREAK_COLOR);
 assert.equal(timerColor(area,{kind:'work'},true),BREAK_COLOR);
 assert.equal(timerColor(area,{kind:'break'},true),BREAK_COLOR);
});
test('custom break starts exactly at the gross-duration boundary',()=>{
 const s={date:'2099-01-01',start:'10:00',end:'10:45',workMinutes:25,breakEnabled:true,customBreakMinutes:5};
 assert.equal(timerColor('#A34270',getPhase(s,new Date('2099-01-01T10:39:59')),false),'#A34270');
 assert.equal(timerColor('#A34270',getPhase(s,new Date('2099-01-01T10:40:00')),false),BREAK_COLOR);
});
test('automatic break returns to area color for the following focus cycle',()=>{
 const s={date:'2099-01-01',start:'10:00',end:'11:00',workMinutes:25,breakEnabled:true};
 assert.equal(timerColor('#A34270',getPhase(s,new Date('2099-01-01T10:25:00')),false),BREAK_COLOR);
 assert.equal(timerColor('#A34270',getPhase(s,new Date('2099-01-01T10:30:00')),false),'#A34270');
});
