import {chromium} from 'playwright';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
const id=process.argv[2];
if(!["wrist-flexor-stretch"].includes(id))throw Error('Unsupported exercise');
const dir='tools/media/motion-refresh/skinned-3d/', output='tools/media/imports/all-exercises-20261007/skinned-wrist-flexor-20261012/native/';
const shots=`tools/media/imports/all-exercises-20261007/skinned-wrist-flexor-20261012/native/${id}/`;mkdirSync(shots,{recursive:true});
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const browser=await chromium.launch({channel:"msedge",headless:true});
const themes=[];
try{
 const page=await browser.newPage({viewport:{width:480,height:480}});
 page.on('pageerror',error=>console.error(error));
 await page.route('http://skinned.local/**',async route=>{
  const file=new URL(route.request().url()).pathname.slice(1);
  const paths={'studio.mjs':'tools/media/imports/all-exercises-20261007/skinned-wrist-flexor-20261012/studio.mjs','motion.mjs':'tools/media/imports/all-exercises-20261007/skinned-wrist-flexor-20261012/motion.mjs','human.json':'tools/media/imports/all-exercises-20261007/skinned-wrist-flexor-20261012/human.json','RoomEnvironment.js':'node_modules/three/examples/jsm/environments/RoomEnvironment.js','three.module.js':'node_modules/three/build/three.module.js','three.core.js':'node_modules/three/build/three.core.js'};
  if(!file)return route.fulfill({contentType:'text/html',body:'<canvas></canvas><script type="module" src="./studio.mjs"></script>'});
  if(!paths[file])return route.fulfill({status:404,body:''});
  const body=file==='RoomEnvironment.js'?readFileSync(paths[file],'utf8').replace("from 'three'","from './three.module.js'"):file==='studio.mjs'?readFileSync(paths[file],'utf8').replace('camera.position.set(24,-3,2)','camera.position.set(-24,-3,2)').replace('new THREE.Vector3(4,-4,7)','new THREE.Vector3(-4,-4,7)'):readFileSync(paths[file]);
  return route.fulfill({contentType:file.endsWith('.json')?'application/json':'text/javascript',body});
 });
 await page.goto('http://skinned.local/?exercise='+id);await page.waitForFunction(()=>window.ready,{},{timeout:90000});
 for(const view of ['feet','support'])for(const frame of [0,210])writeFileSync(shots+view+'-'+frame+'.png',Buffer.from(await page.evaluate(([f,v])=>window.renderSkinned(f,v),[frame,view]),'base64'));
}finally{await browser.close();}
