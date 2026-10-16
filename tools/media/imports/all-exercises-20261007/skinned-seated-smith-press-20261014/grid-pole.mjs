import {chromium} from 'playwright';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
const id=process.argv[2];
if(!["seated-smith-machine-shoulder-press"].includes(id))throw Error('Unsupported exercise');
const dir='tools/media/motion-refresh/skinned-3d/', output='tools/media/imports/all-exercises-20261007/skinned-seated-smith-press-20261014/native/';
const shots=`tools/media/imports/all-exercises-20261007/skinned-seated-smith-press-20261014/native/${id}/`;mkdirSync(shots,{recursive:true});
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const browser=await chromium.launch({channel:"msedge",headless:true});
const themes=[];
try{
 const page=await browser.newPage({viewport:{width:480,height:480}});
 page.on('pageerror',error=>console.error(error));
 await page.route('http://skinned.local/**',async route=>{
  const file=new URL(route.request().url()).pathname.slice(1);
  const paths={'studio.mjs':'tools/media/imports/all-exercises-20261007/skinned-seated-smith-press-20261014/studio.mjs','motion.mjs':'tools/media/imports/all-exercises-20261007/skinned-seated-smith-press-20261014/motion.mjs','human.json':'tools/media/imports/all-exercises-20261007/skinned-seated-smith-press-20261014/human.json','RoomEnvironment.js':'node_modules/three/examples/jsm/environments/RoomEnvironment.js','three.module.js':'node_modules/three/build/three.module.js','three.core.js':'node_modules/three/build/three.core.js'};
  if(!file)return route.fulfill({contentType:'text/html',body:'<canvas></canvas><script type="module" src="./studio.mjs"></script>'});
  if(!paths[file])return route.fulfill({status:404,body:''});
  const body=file==='RoomEnvironment.js'?readFileSync(paths[file],'utf8').replace("from 'three'","from './three.module.js'"):readFileSync(paths[file]);
  return route.fulfill({contentType:file.endsWith('.json')?'application/json':'text/javascript',body});
 });
 await page.goto('http://skinned.local/?exercise='+id);await page.waitForFunction(()=>window.ready,{},{timeout:90000});
const result=await page.evaluate(()=>{const rows=[];for(const half of [2.5,3.2,3.7])for(const angle of [30,40,50,60,70,80])for(const poleZ of [-.5,0,.3,.6,1])for(const poleX of [0,.3,.6]){Object.assign(window.fit,{half,bottomY:2.2,barZ:.80125086,angle,poleX,poleZ});try{const p=window.quick(0),f=p.w.map((x,i)=>x-p.e[i]),r=angle*Math.PI/180;const wrist=Math.acos((f[1]*Math.cos(r)+f[2]*Math.sin(r))/Math.hypot(...f))*180/Math.PI;rows.push({half,angle,poleX,poleZ,wrist,...p});}catch{}}return rows.sort((a,b)=>a.wrist-b.wrist).slice(0,20);});writeFileSync(output+'grid-pole.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}

