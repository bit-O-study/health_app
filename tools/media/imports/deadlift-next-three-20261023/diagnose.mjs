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
  const body=name==='studio.mjs'?readFileSync(paths[name],'utf8').replace('bodyEquipmentGap=Math.min(bodyEquipmentGap,box.distanceToPoint(p))',"{const gap=box.distanceToPoint(p);if(gap<bodyEquipmentGap){window.hit={i,p:p.toArray(),rest:model.vertices.slice(i*3,i*3+3),bones:[0,1,2,3].map(k=>[model.bones[model.skinIndices[i*4+k]].name,model.skinWeights[i*4+k]]),box:[box.min.toArray(),box.max.toArray()]};bodyEquipmentGap=gap;}} "):name==='RoomEnvironment.js'?readFileSync(paths[name],'utf8').replace("from 'three'","from './three.module.js'"):readFileSync(paths[name]);
  await route.fulfill({contentType:name.endsWith('.json')?'application/json':'text/javascript',body});
 });
 await page.goto('http://running.local/?exercise='+id);
 await page.waitForFunction(()=>window.ready,null,{timeout:90000});
 console.log(JSON.stringify(await page.evaluate(()=>{const j=window.inspectRunning(192);return {gap:j.bodyEquipmentGap,hit:window.hit}})));}finally{await browser.close();}