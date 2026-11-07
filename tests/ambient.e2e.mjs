import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const browser=await (process.env.BROWSER==='webkit'?webkit:chromium).launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
try {
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const Native=window.AudioContext||window.webkitAudioContext;
    window.AudioContext=class extends Native {
      constructor(...args){super(...args);window.audioContext=this;}
      createGain(){
        const gain=super.createGain(),connect=gain.connect.bind(gain);
        gain.connect=(destination,...args)=>{
          if(destination===this.destination){
            const analyser=this.createAnalyser();analyser.fftSize=2048;
            connect(analyser);analyser.connect(destination);window.audioAnalyser=analyser;
            return destination;
          }
          return connect(destination,...args);
        };
        return gain;
      }
    };
    window.audioRms=()=>{const a=window.audioAnalyser;if(!a)return 0;const b=new Float32Array(a.fftSize);a.getFloatTimeDomainData(b);return Math.sqrt(b.reduce((sum,x)=>sum+x*x,0)/b.length);};
  });
  await page.goto('http://127.0.0.1:8123/');
  await page.getByText('Suono di sottofondo',{exact:true}).click();
  console.log('Page loaded');
  // Armed outside a session: silent, with an explicit explanation.
  await page.locator('#sound').selectOption('white');
  await page.waitForFunction(()=>document.querySelector('#sound-status').textContent.includes('Audio pronto'));
  assert.equal(await page.evaluate(()=>audioRms()),0);
  console.log('Idle audio armed');
  await page.locator('#sound-test').click();
  await page.waitForFunction(()=>audioRms()>.001);
  await page.waitForFunction(()=>audioRms()===0,{},{timeout:7000});
  console.log('Preview passed');
  await page.locator('#instant button.primary').click();
  await page.waitForFunction(()=>audioRms()>.001);
  for(const kind of ['brown','rain','fire','white']){
    await page.locator('#sound').selectOption(kind);
    await page.waitForFunction(()=>audioRms()>.001);
    await page.waitForTimeout(800); // Includes a fireplace crackle.
    assert.equal(await page.evaluate(()=>audioContext.state),'running');
  }
  console.log('All sound signals passed');
  await page.locator('#pause').click();
  await page.waitForFunction(()=>audioRms()===0);
  assert.equal(await page.evaluate(()=>audioContext.state),'running');
  await page.locator('#pause').click();
  await page.waitForFunction(()=>audioRms()>.001);
  await page.locator('#volume').fill('0');
  await page.waitForFunction(()=>audioRms()<.00001);
  await page.locator('#volume').fill('50');
  await page.waitForFunction(()=>audioRms()>.001);
  await page.locator('#sound-toggle').click();
  await page.waitForFunction(()=>audioRms()===0);
  // Activation after the session is already running.
  await page.locator('#sound-toggle').click();
  await page.waitForFunction(()=>audioRms()>.001);
  await page.locator('#finish').click();
  await page.waitForFunction(()=>audioRms()===0);
  assert.deepEqual(errors,[]);
  console.log('PASS: all four sounds produce nonzero audio; preview, active-session start, pause/resume, volume and final fade.');
} finally {await browser.close();}
