import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({headless:true});
const results=[];
try{
const page=await browser.newPage();page.setDefaultTimeout(15000);
await page.goto('http://127.0.0.1:3188');
const options=await page.locator('select option').evaluateAll(xs=>xs.map(x=>x.value));
for(const id of options){
await page.selectOption('select',id);
await page.waitForFunction(()=>Array.from(document.querySelectorAll('video')).every(v=>v.readyState>=2&&!v.error));
const meta=await page.locator('video').evaluateAll(vs=>vs.map(v=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration})));
if(meta.some(m=>m.width!==480||m.height!==480||Math.abs(m.duration-8)>.1))throw Error(id+': invalid metadata');
if(id==='dumbbell-front-raise'||id==='candidate'||id==='wrist-candidate'){
for(const theme of ['light','dark']){
await page.locator('#'+theme).evaluate(v=>v.play());
await page.waitForFunction(t=>document.getElementById(t).currentTime>.2,theme);
await page.locator('#'+theme).evaluate(v=>{v.pause();v.currentTime=7.5;});
await page.waitForFunction(t=>{const v=document.getElementById(t);return !v.seeking&&v.currentTime>=7.49;},theme);
}}
results.push({id,metadata:'passed'});
}
await page.selectOption('select','dumbbell-front-raise');
await page.screenshot({path:'tools/media/imports/exercise-video-20260925/gallery-preview.png',fullPage:true});
writeFileSync('tools/media/imports/exercise-video-20260925/gallery-verification.json',JSON.stringify({url:page.url(),checkedAt:new Date().toISOString(),results,playSeek:'front raise, low-bar candidate and wrist candidate, both themes passed'},null,2));
console.log(JSON.stringify({options:results.length,videos:results.length*2,playSeek:'passed'}));
}finally{await browser.close();}
