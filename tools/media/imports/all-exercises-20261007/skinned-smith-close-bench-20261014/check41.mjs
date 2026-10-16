import {chromium} from 'playwright';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
const id=process.argv[2];
if(!["smith-machine-close-grip-bench-press"].includes(id))throw Error('Unsupported exercise');
const dir='tools/media/motion-refresh/skinned-3d/', output='tools/media/imports/all-exercises-20261007/skinned-smith-close-bench-20261014/native/';
const shots=`tools/media/imports/all-exercises-20261007/skinned-smith-close-bench-20261014/native/${id}/`;mkdirSync(shots,{recursive:true});
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const browser=await chromium.launch({channel:"msedge",headless:true});
const themes=[];
try{
 const page=await browser.newPage({viewport:{width:480,height:480}});
 page.on('pageerror',error=>console.error(error));
 await page.route('http://skinned.local/**',async route=>{
  const file=new URL(route.request().url()).pathname.slice(1);
  const paths={'studio.mjs':'tools/media/imports/all-exercises-20261007/skinned-smith-close-bench-20261014/studio.mjs','motion.mjs':'tools/media/imports/all-exercises-20261007/skinned-smith-close-bench-20261014/motion.mjs','human.json':'tools/media/imports/all-exercises-20261007/skinned-smith-close-bench-20261014/human.json','RoomEnvironment.js':'node_modules/three/examples/jsm/environments/RoomEnvironment.js','three.module.js':'node_modules/three/build/three.module.js','three.core.js':'node_modules/three/build/three.core.js'};
  if(!file)return route.fulfill({contentType:'text/html',body:'<canvas></canvas><script type="module" src="./studio.mjs"></script>'});
  if(!paths[file])return route.fulfill({status:404,body:''});
  const body=file==='RoomEnvironment.js'?readFileSync(paths[file],'utf8').replace("from 'three'","from './three.module.js'"):readFileSync(paths[file]);
  return route.fulfill({contentType:file.endsWith('.json')?'application/json':'text/javascript',body});
 });
 await page.goto('http://skinned.local/?exercise='+id);await page.waitForFunction(()=>window.ready,{},{timeout:90000});
 const metrics=await page.evaluate(()=>Array.from({length:41},(_,i)=>{const p=window.inspectPose(i*12);return {frame:i*12,wrist:p.wristDeviation[0],gap:p.shaftTriangleGap,palm:p.palmTowardFeet[0]};}));console.log(JSON.stringify({maxWrist:Math.max(...metrics.map(p=>p.wrist)),minGap:Math.min(...metrics.map(p=>p.gap)),minPalm:Math.min(...metrics.map(p=>p.palm))}));writeFileSync(output+'wrist-correction-41.json',JSON.stringify(metrics,null,2));
}finally{await browser.close();}
