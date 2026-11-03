import {chromium} from 'playwright';
import {readFileSync,writeFileSync} from 'node:fs';
const base='tools/media/imports/popular-three-20261103';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const id of ['bench-press','plank']){
  const page=await browser.newPage({viewport:{width:480,height:480}});
  const human='tools/media/imports/all-exercises-20261007/'+(id==='plank'?'skinned-sphinx-20261014':'skinned-pause-bench-20261012')+'/human.json';
  await page.route('http://detail.local/**',async route=>{
   const name=new URL(route.request().url()).pathname.slice(1);
   if(!name)return route.fulfill({contentType:'text/html',body:'<canvas></canvas><script type="module" src="/studio.mjs"></script>'});
   const paths={'studio.mjs':base+'/'+id+'-studio.mjs','motion.mjs':base+'/'+id+'-motion.mjs','human.json':human,'three.module.js':'node_modules/three/build/three.module.js','three.core.js':'node_modules/three/build/three.core.js','RoomEnvironment.js':'node_modules/three/examples/jsm/environments/RoomEnvironment.js'};
   if(!paths[name])return route.fulfill({status:404,body:''});
   const data=readFileSync(paths[name]);return route.fulfill({contentType:name.endsWith('.json')?'application/json':'text/javascript',body:name==='RoomEnvironment.js'?data.toString().replace("from 'three'","from './three.module.js'"):data});
  });
  await page.goto('http://detail.local/?exercise='+id);await page.waitForFunction(()=>window.ready,null,{timeout:90000});
  for(const view of id==='plank'?['support','feet']:['hand'])for(const frame of id==='plank'?[0]:[0,240])writeFileSync(`${base}/native/${id}/${view}-${frame}.png`,Buffer.from(await page.evaluate(([f,v])=>window.renderSkinned(f,v,false),[frame,view]),'base64'));
  await page.close();
 }
}finally{await browser.close();}
