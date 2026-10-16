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
 const contacts=await page.evaluate(()=>[0,240].map(frame=>{const g=window.inspectGrip(frame),out={frame,heel:{L:{gap:Infinity},R:{gap:Infinity}},knee:{L:{gap:Infinity},R:{gap:Infinity}}};for(let i=0;i<g.vertices.length;i++){let k=0;for(let j=1;j<4;j++)if(g.skinWeights[i*4+j]>g.skinWeights[i*4+k])k=j;const name=g.boneNames[g.skinIndices[i*4+k]],side=name.endsWith('.L')?'L':'R',p=g.vertices[i],rest=g.restVertices.slice(i*3,i*3+3),gap=p[1]+7.751375;if(/^(wrist|finger1-1)/.test(name)&&gap<out.heel[side].gap)out.heel[side]={gap,vertex:i,world:p,rest,dominant:name};if(rest[1]>-3.6&&rest[1]<-2.7&&gap<out.knee[rest[0]>0?'L':'R'].gap)out.knee[rest[0]>0?'L':'R']={gap,vertex:i,world:p,rest};}const r=window.inspectPose(frame);out.palmNormal={L:r.palmNormalLeft,R:r.palmNormalRight};return out;}));writeFileSync(output+id+'-support-anatomy.json',JSON.stringify(contacts,null,2));console.log(JSON.stringify(contacts));
}finally{await browser.close();}
