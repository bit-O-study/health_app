import {chromium} from 'playwright';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
const id=process.argv[2];
if(!["single-arm-dumbbell-lying-extension"].includes(id))throw Error('Unsupported exercise');
const dir='tools/media/motion-refresh/skinned-3d/', output='tools/media/imports/all-exercises-20261007/skinned-single-lying-triceps-20261012/native/';
const shots=`tools/media/imports/all-exercises-20261007/skinned-single-lying-triceps-20261012/native/${id}/`;mkdirSync(shots,{recursive:true});
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const browser=await chromium.launch({channel:"msedge",headless:true});
const themes=[];
try{
 const page=await browser.newPage({viewport:{width:480,height:480}});
 page.on('pageerror',error=>console.error(error));
 await page.route('http://skinned.local/**',async route=>{
  const file=new URL(route.request().url()).pathname.slice(1);
  const paths={'studio.mjs':'tools/media/imports/all-exercises-20261007/skinned-single-lying-triceps-20261012/studio.mjs','motion.mjs':'tools/media/imports/all-exercises-20261007/skinned-single-lying-triceps-20261012/motion.mjs','human.json':'tools/media/imports/all-exercises-20261007/skinned-single-lying-triceps-20261012/human.json','RoomEnvironment.js':'node_modules/three/examples/jsm/environments/RoomEnvironment.js','three.module.js':'node_modules/three/build/three.module.js','three.core.js':'node_modules/three/build/three.core.js'};
  if(!file)return route.fulfill({contentType:'text/html',body:'<canvas></canvas><script type="module" src="./studio.mjs"></script>'});
  if(!paths[file])return route.fulfill({status:404,body:''});
  const body=file==='RoomEnvironment.js'?readFileSync(paths[file],'utf8').replace("from 'three'","from './three.module.js'"):readFileSync(paths[file]);
  return route.fulfill({contentType:file.endsWith('.json')?'application/json':'text/javascript',body});
 });
 await page.goto('http://skinned.local/?exercise='+id);await page.waitForFunction(()=>window.ready,{},{timeout:90000});
 const scan=await page.evaluate(()=>{const out=[];for(const x of [1.35,1.4,1.45])for(const y of [-.9,-1.05]){globalThis.supportX=x;globalThis.supportY=y;const poses=[0,210].map(f=>window.inspectPose(f));out.push({x,y,penetration:Math.max(...poses.map(p=>p.supportPenetration)),contact:poses.map(p=>p.supportArmDistance)});}return out;});writeFileSync(output+'support-scan.json',JSON.stringify(scan,null,2));console.log(JSON.stringify(scan));
}finally{await browser.close();}
