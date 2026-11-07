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

import {openVideoPip,pipErrorMessage} from '../timer-pip.js';
test('Safari uses its supported presentation API before the standard API',async()=>{
 const video=new EventTarget(); let standardCalls=0;
 Object.assign(video,{
  webkitPresentationMode:'inline',
  webkitSupportsPresentationMode:()=>true,
  webkitSetPresentationMode(mode){this.webkitPresentationMode=mode;this.dispatchEvent(new Event('webkitpresentationmodechanged'));},
  requestPictureInPicture(){standardCalls++;throw Error('Wrong API');}
 });
 await openVideoPip(video,{pictureInPictureEnabled:true});
 assert.equal(video.webkitPresentationMode,'picture-in-picture');
 assert.equal(standardCalls,0);
});
test('standard PiP remains available when the WebKit route does not support the video',async()=>{
 let calls=0;
 await openVideoPip({webkitSetPresentationMode(){throw Error('unsupported route');},webkitSupportsPresentationMode:()=>false,requestPictureInPicture:async()=>{calls++;}},{pictureInPictureEnabled:true});
 assert.equal(calls,1);
});
test('unsupported source and permission errors retain useful diagnostics',async()=>{
 await assert.rejects(openVideoPip({},{}),{name:'NotSupportedError'});
 const failure=new DOMException('User gesture required','NotAllowedError');
 await assert.rejects(openVideoPip({requestPictureInPicture:()=>Promise.reject(failure)},{pictureInPictureEnabled:true}),{name:'NotAllowedError'});
 assert.match(pipErrorMessage(failure),/NotAllowedError: User gesture required/);
 assert.match(pipErrorMessage(new DOMException('stream','NotSupportedError')),/non consente il PiP/);
});
test('synchronous WebKit rejection propagates without waiting for a mode event',async()=>{
 const video=new EventTarget();Object.assign(video,{webkitSupportsPresentationMode:()=>true,webkitSetPresentationMode(){throw new DOMException('Denied','NotAllowedError');}});
 await assert.rejects(openVideoPip(video,{}),{name:'NotAllowedError'});
});
