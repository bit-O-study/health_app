import {chromium} from 'playwright';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
const id=process.argv[2];
if(!["incline-close-grip-bench-press"].includes(id))throw Error('Unsupported exercise');
const dir='tools/media/motion-refresh/skinned-3d/', output='tools/media/imports/all-exercises-20261007/skinned-close-incline-barbell-20261014/native/';
const shots=`tools/media/imports/all-exercises-20261007/skinned-close-incline-barbell-20261014/native/${id}/`;mkdirSync(shots,{recursive:true});
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const browser=await chromium.launch({channel:"msedge",headless:true});
const themes=[];
try{
 const page=await browser.newPage({viewport:{width:480,height:480}});
 page.on('pageerror',error=>console.error(error));
 await page.route('http://skinned.local/**',async route=>{
  const file=new URL(route.request().url()).pathname.slice(1);
  const paths={'studio.mjs':'tools/media/imports/all-exercises-20261007/skinned-close-incline-barbell-20261014/studio.mjs','motion.mjs':'tools/media/imports/all-exercises-20261007/skinned-close-incline-barbell-20261014/motion.mjs','human.json':'tools/media/imports/all-exercises-20261007/skinned-close-incline-barbell-20261014/human.json','RoomEnvironment.js':'node_modules/three/examples/jsm/environments/RoomEnvironment.js','three.module.js':'node_modules/three/build/three.module.js','three.core.js':'node_modules/three/build/three.core.js'};
  if(!file)return route.fulfill({contentType:'text/html',body:'<canvas></canvas><script type="module" src="./studio.mjs"></script>'});
  if(!paths[file])return route.fulfill({status:404,body:''});
  const body=file==='RoomEnvironment.js'?readFileSync(paths[file],'utf8').replace("from 'three'","from './three.module.js'"):readFileSync(paths[file]);
  return route.fulfill({contentType:file.endsWith('.json')?'application/json':'text/javascript',body});
 });
 await page.goto('http://skinned.local/?exercise='+id);await page.waitForFunction(()=>window.ready,{},{timeout:90000});
 const result=await page.evaluate(()=>{let lo=-2,hi=1;for(let i=0;i<28;i++){window.fit.bottomY=(lo+hi)/2;if(window.inspectPose(0).shaftTriangleGap<.001)lo=window.fit.bottomY;else hi=window.fit.bottomY;}window.fit.bottomY=hi;lo=3.7;hi=5;for(let i=0;i<40;i++){window.fit.topY=(lo+hi)/2;let a;try{a=window.quick(240).elbow;}catch{a=0;}if(a>8)lo=window.fit.topY;else hi=window.fit.topY;}window.fit.topY=lo;return {fit:window.fit,nearest:window.nearest(),ends:[0,240].map(frame=>{const p=window.inspectPose(frame);return {frame,elbow:window.quick(frame).elbow,chest:p.chestClearance,triangle:p.shaftTriangleGap,wrist:p.wristDeviation};})};});writeFileSync(output+'fit-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));for(const view of ['full','hand','side'])for(const frame of [0,240])writeFileSync(shots+view+'-'+frame+'.png',Buffer.from(await page.evaluate(([f,v])=>window.renderSkinned(f,v),[frame,view]),'base64'));
}finally{await browser.close();}
