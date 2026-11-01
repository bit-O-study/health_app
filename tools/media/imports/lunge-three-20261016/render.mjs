import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
const id=process.argv[2]; if(!['lunge','pulse-lunge','reverse-lunge'].includes(id))throw Error('Unknown id');
const base='tools/media/imports/lunge-three-20261016';
const human='tools/media/imports/all-exercises-20261007/skinned-quadruped-hip-extension-20261014/human.json';
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
  const paths={'studio.mjs':base+'/studio.mjs','motion.mjs':base+'/motion.mjs','human.json':human,'three.module.js':'node_modules/three/build/three.module.js','three.core.js':'node_modules/three/build/three.core.js','RoomEnvironment.js':'node_modules/three/examples/jsm/environments/RoomEnvironment.js'};
  if(!paths[name])return route.fulfill({status:404,body:''});
  const body=name==='RoomEnvironment.js'?readFileSync(paths[name],'utf8').replace("from 'three'","from './three.module.js'"):readFileSync(paths[name]);
  await route.fulfill({contentType:name.endsWith('.json')?'application/json':'text/javascript',body});
 });
 await page.goto('http://running.local/?exercise='+id);
 await page.waitForFunction(()=>window.ready,null,{timeout:90000});
 for(const view of ['full','side'])for(let i=0;i<8;i++){
  writeFileSync(`${out}/${view}-${i}.png`,Buffer.from(await page.evaluate(([f,v])=>window.renderSkinned(f,v,'alpha'),[i*60,view]),'base64'));
 }
 const poses=[];for(let frame=0;frame<=480;frame++)poses.push({frame,joints:await page.evaluate(f=>window.inspectRunning(f),frame)});
 writeFileSync(out+'/poses.json',JSON.stringify(poses));
 for(const view of ['full','side'])execFileSync(ff,['-v','error','-y','-i',`${out}/${view}-%d.png`,'-vf','tile=4x2','-frames:v','1',`${out}/${view}-sheet.png`]);
 if(process.argv.includes('--preview')){console.log('Preview ready');}
 else {
  const outputs=[];
  for(const theme of ['alpha','light','dark']){
   const file=out+'/'+id+(theme==='light'?'':'-'+theme)+(theme==='alpha'?'.webm':'.mp4');
   const codec=theme==='alpha'?['-c:v','libvpx-vp9','-pix_fmt','yuva420p','-auto-alt-ref','0','-b:v','0','-crf','28']:['-c:v','libx264','-pix_fmt','yuv420p','-crf','20','-movflags','+faststart'];
   const encoder=spawn(ff,['-v','error','-y','-f','image2pipe','-framerate','24','-i','pipe:0','-an',...codec,'-threads','2',file],{windowsHide:true});
   encoder.stderr.pipe(process.stderr);let failure;
   encoder.on('error',e=>failure=e);encoder.stdin.on('error',e=>failure=e);
   const done=once(encoder,'close');
   for(let i=0;i<192;i++){
    if(failure)throw failure;
    const png=Buffer.from(await page.evaluate(([f,t])=>window.renderSkinned(f,'full',t==='alpha'?'alpha':t==='dark'),[i*2.5,theme]),'base64');
    if(!encoder.stdin.write(png))await once(encoder.stdin,'drain');
    if(i%60===0)console.log(theme+': '+i+'/192');
   }
   encoder.stdin.end();const [code]=await done;if(code!==0)throw Error('encode '+code);
   execFileSync(ff,['-v','error','-i',file,'-f','null','-']);
   outputs.push({theme,file,sha256:hash(file),bytes:readFileSync(file).length,decode:'passed'});
  }
  writeFileSync(out+'/candidate.json',JSON.stringify({status:'pending-visual-review',width:480,height:480,fps:24,frames:192,seconds:8,outputs,inputs:[base+'/studio.mjs',base+'/motion.mjs',base+'/render.mjs',human,'node_modules/three/build/three.module.js','node_modules/three/build/three.core.js','node_modules/three/examples/jsm/environments/RoomEnvironment.js'].map(file=>({file,sha256:hash(file)}))},null,2));
 }
}finally{await browser.close();}
