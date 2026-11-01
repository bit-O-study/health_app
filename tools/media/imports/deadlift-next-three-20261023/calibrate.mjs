import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
const id=process.argv[2]; if(!["dumbbell-deadlift","single-arm-dumbbell-deadlift","partial-deadlift"].includes(id))throw Error('Unknown id');
const base='tools/media/imports/deadlift-next-three-20261023';
const human='tools/media/imports/all-exercises-20261007/skinned-quadruped-hip-extension-20261014/human.json';
const out=base+'/native/'+id; mkdirSync(out,{recursive:true});
const ff=process.env.FFMPEG_PATH||'C:/git/Bit-O/video-tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffmpeg.exe';
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:480,height:480}});
 page.on('pageerror',error=>{throw error;});
 await page.route('http://running.local/**',async route=>{
  const name=new URL(route.request().url()).pathname.slice(1);
  if(!name)return route.fulfill({contentType:'text/html',body:'<canvas></canvas><script type="module" src="/studio.mjs"></script>'});
  const paths={'studio.mjs':base+'/studio.mjs','motion.mjs':base+'/motion.mjs','human.json':human,'three.module.js':'node_modules/three/build/three.module.js','three.core.js':'node_modules/three/build/three.core.js','RoomEnvironment.js':'node_modules/three/examples/jsm/environments/RoomEnvironment.js'};
  if(!paths[name])return route.fulfill({status:404,body:''});
  const body=name==='motion.mjs'?readFileSync(paths[name],'utf8').replace(':1.2471987423021342;',':(window.calibrationDepth??1.15);'):name==='RoomEnvironment.js'?readFileSync(paths[name],'utf8').replace("from 'three'","from './three.module.js'"):readFileSync(paths[name]);
  await route.fulfill({contentType:name.endsWith('.json')?'application/json':'text/javascript',body});
 });
 await page.goto('http://running.local/?exercise='+id);
 await page.waitForFunction(()=>window.ready,null,{timeout:90000});
 let lo=.5,hi=1.3;for(let n=0;n<35;n++){const mid=(lo+hi)/2;const gap=await page.evaluate(d=>{window.calibrationDepth=d;const j=window.inspectRunning(0);return j.dumbbellMetrics[1]-j.contactMetrics[0]},mid);if(gap>0)lo=mid;else hi=mid;}console.log(JSON.stringify({depth:lo,joints:await page.evaluate(d=>{window.calibrationDepth=d;return window.inspectRunning(0)},lo)}));}finally{await browser.close();}