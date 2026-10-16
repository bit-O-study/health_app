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
  let body=file==='RoomEnvironment.js'?readFileSync(paths[file],'utf8').replace("from 'three'","from './three.module.js'"):readFileSync(paths[file]);
  if(file==='studio.mjs')body=body.toString()+`
window.detail=(kind,frame=0)=>{pose(frame);const target=kind==='slider'?new THREE.Vector3(7.2,barbell.position.y,railZ):kind==='chest'?barbell.position.clone():new THREE.Vector3(0,-7.4,4.5);camera.zoom=kind==='chest'?4:4;camera.position.copy(target).add(kind==='slider'?new THREE.Vector3(4,2,-6):kind==='chest'?new THREE.Vector3(8,3,5):new THREE.Vector3(5,4,8));camera.lookAt(target);camera.updateProjectionMatrix();scene.background=new THREE.Color('#fafafa');renderer.render(scene,camera);return canvas.toDataURL('image/png').split(',')[1];};`;
  return route.fulfill({contentType:file.endsWith('.json')?'application/json':'text/javascript',body});
 });
 await page.goto('http://skinned.local/?exercise='+id);await page.waitForFunction(()=>window.ready,{},{timeout:90000});
 for(const kind of ['chest','feet'])writeFileSync(shots+kind+'-0.png',Buffer.from(await page.evaluate(k=>window.detail(k),kind),'base64'));
for(const frame of [0,240])writeFileSync(shots+'slider-'+frame+'.png',Buffer.from(await page.evaluate(f=>window.detail('slider',f),frame),'base64'));
for(const view of ['full','hand','side'])writeFileSync(shots+view+'-240.png',Buffer.from(await page.evaluate(v=>window.renderSkinned(240,v),view),'base64'));
}finally{await browser.close();}
