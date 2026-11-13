import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
const id=process.argv[2]; if(!JSON.parse(readFileSync('tools/media/imports/hundred-20261111/batch.json')).entries.some(x=>x.id===id&&x.recipe))throw Error('Unprepared id');
const base='tools/media/imports/hundred-20261111';
const sourceBase='skinned-quadruped-hip-extension-20261014';
const human='tools/media/imports/all-exercises-20261007/'+sourceBase+'/human.json';
const studio=base+'/'+id+'-studio.mjs',motion=base+'/'+id+'-motion.mjs';
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
  const paths={'studio.mjs':studio,'motion.mjs':motion,'human.json':human,'three.module.js':'node_modules/three/build/three.module.js','three.core.js':'node_modules/three/build/three.core.js','RoomEnvironment.js':'node_modules/three/examples/jsm/environments/RoomEnvironment.js'};
  if(!paths[name])return route.fulfill({status:404,body:''});
  const body=name==='RoomEnvironment.js'?readFileSync(paths[name],'utf8').replace("from 'three'","from './three.module.js'"):readFileSync(paths[name]);
  await route.fulfill({contentType:name.endsWith('.json')?'application/json':'text/javascript',body});
 });
 await page.goto('http://running.local/?exercise='+id);
 await page.waitForFunction(()=>window.ready,null,{timeout:90000});
 for(const view of ['full','side'])for(let i=0;i<8;i++){writeFileSync(out+'/stage-'+view+'-'+i+'.png',Buffer.from(await page.evaluate(([f,v])=>window.renderSkinned(f,v,'alpha'),[[0,31,62,93,123,154,185,216][i],view]),'base64'));}
 for(const view of ['full','side'])execFileSync(ff,['-v','error','-y','-i',out+'/stage-'+view+'-%d.png','-vf','tile=4x2','-frames:v','1',out+'/stage-'+view+'-sheet.png']);
 const samples=[];for(let f=0;f<=480;f+=10)samples.push({frame:f,...await page.evaluate(f=>window.inspectGeometry(f),f)});writeFileSync(out+'/geometry-dense.json',JSON.stringify(samples,null,2));console.log(samples.filter(x=>x.floorClearance<=0||x.bellBody<=0));
}finally{await browser.close();}