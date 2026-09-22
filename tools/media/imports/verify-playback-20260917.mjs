import { chromium, devices } from 'playwright';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch({headless:true});
const context = await browser.newContext({...devices['Pixel 7']});
const results = [];
try {
  for (const id of ['decline-dumbbell-bench-press','hollow-body-hold']) {
    for (const suffix of ['', '-dark']) {
      const page = await context.newPage();
      const url = 'http://localhost:3110/exercise-guides/ai-v3/' + id + suffix + '.mp4';
      const response = await page.goto(url, {waitUntil:'domcontentloaded',timeout:30000});
      if (!response.ok()) throw new Error(url + ': HTTP ' + response.status());
      await page.waitForFunction(() => {const v=document.querySelector('video');return v && v.readyState>=2;},null,{timeout:20000});
      const meta = await page.locator('video').evaluate(async v => {
        v.muted=true; await v.play();
        return {width:v.videoWidth,height:v.videoHeight,seconds:v.duration,error:v.error?.code??null};
      });
      if(meta.width!==480||meta.height!==480||Math.abs(meta.seconds-8)>.05||meta.error) throw new Error(JSON.stringify(meta));
      await page.waitForFunction(() => document.querySelector('video').currentTime>.15);
      await page.locator('video').evaluate(v=>{v.pause();v.currentTime=7.5;});
      await page.waitForFunction(()=>{const v=document.querySelector('video');return !v.seeking&&v.readyState>=2;});
      results.push({id,theme:suffix?'dark':'light',...meta,play:'passed',seek:'passed'});
      await page.close();
    }
  }
  writeFileSync('tools/media/imports/playback-20260917.json',JSON.stringify({checkedAt:new Date().toISOString(),scope:'Direct MP4 playback on mobile Chromium; not app layout or physical Android',results},null,2));
  console.log(JSON.stringify(results));
} finally { await browser.close(); }
