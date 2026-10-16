import {chromium} from 'playwright';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
const id=process.argv[2];
if(!["quadruped-hip-extension"].includes(id))throw Error('Unsupported exercise');
const dir='tools/media/motion-refresh/skinned-3d/', output='tools/media/imports/all-exercises-20261007/skinned-quadruped-hip-extension-20261014/native/';
const shots=`tools/media/imports/all-exercises-20261007/skinned-quadruped-hip-extension-20261014/native/${id}/`;mkdirSync(shots,{recursive:true});
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const browser=await chromium.launch({channel:"msedge",headless:true});
const themes=[];
try{
 const page=await browser.newPage({viewport:{width:480,height:480}});
 page.on('pageerror',error=>console.error(error));
 await page.route('http://skinned.local/**',async route=>{
  const file=new URL(route.request().url()).pathname.slice(1);
  const paths={'studio.mjs':'tools/media/imports/all-exercises-20261007/skinned-quadruped-hip-extension-20261014/studio.mjs','motion.mjs':'tools/media/imports/all-exercises-20261007/skinned-quadruped-hip-extension-20261014/motion.mjs','human.json':'tools/media/imports/all-exercises-20261007/skinned-quadruped-hip-extension-20261014/human.json','RoomEnvironment.js':'node_modules/three/examples/jsm/environments/RoomEnvironment.js','three.module.js':'node_modules/three/build/three.module.js','three.core.js':'node_modules/three/build/three.core.js'};
  if(!file)return route.fulfill({contentType:'text/html',body:'<canvas></canvas><script type="module" src="./studio.mjs"></script>'});
  if(!paths[file])return route.fulfill({status:404,body:''});
  const body=file==='RoomEnvironment.js'?readFileSync(paths[file],'utf8').replace("from 'three'","from './three.module.js'"):readFileSync(paths[file]);
  return route.fulfill({contentType:file.endsWith('.json')?'application/json':'text/javascript',body});
 });
 await page.goto('http://skinned.local/?exercise='+id);await page.waitForFunction(()=>window.ready,{},{timeout:90000});
const rows=[];for(let frame=0;frame<=480;frame++){rows.push(await page.evaluate(frame=>{const g=window.inspectGrip(frame),mins={L:Infinity,R:Infinity};for(let i=0;i<g.vertices.length;i++){if(g.restVertices[i*3+1]>=-1.3)continue;const side=g.restVertices[i*3]>0?'L':'R';mins[side]=Math.min(mins[side],g.vertices[i][0]*(side==='L'?1:-1));}return {frame,skinLegSeparatingGap:mins.L+mins.R};},frame));if(frame%120===0)console.log(frame+'/480');}writeFileSync(output+id+'-leg-separation.json',JSON.stringify({samples:rows.length,min:Math.min(...rows.map(x=>x.skinLegSeparatingGap)),max:Math.max(...rows.map(x=>x.skinLegSeparatingGap)),rows},null,2));
}finally{await browser.close();}
