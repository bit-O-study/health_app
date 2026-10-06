import {chromium} from 'playwright';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
const dir='tools/media/motion-refresh/skinned-3d/';const browser=await chromium.launch();try{const page=await browser.newPage({viewport:{width:1080,height:1080}});page.on('pageerror',e=>console.error(e));
await page.route('http://skinned.local/**',async route=>{const file=new URL(route.request().url()).pathname.slice(1);const paths={'scene.mjs':dir+'studio.mjs','RoomEnvironment.js':'node_modules/three/examples/jsm/environments/RoomEnvironment.js','human.json':dir+'human.json','three.module.js':'node_modules/three/build/three.module.js','three.core.js':'node_modules/three/build/three.core.js'};if(!file)return route.fulfill({contentType:'text/html',body:'<style>body{margin:0}</style><canvas></canvas><script type="module" src="./scene.mjs"></script>'});if(!paths[file])return route.fulfill({status:404,body:''});return route.fulfill({contentType:file.endsWith('.json')?'application/json':'text/javascript',body:file==='RoomEnvironment.js'?readFileSync(paths[file],'utf8').replace("from 'three'","from './three.module.js'"):readFileSync(paths[file])});});
await page.goto('http://skinned.local/');await page.waitForFunction(()=>window.ready,{},{timeout:60000});mkdirSync('.verify-shots/skinned-3d',{recursive:true});for(const frame of [0,120,240])writeFileSync(`.verify-shots/skinned-3d/pose-${frame}.png`,Buffer.from(await page.evaluate(f=>window.renderSkinned(f),frame),'base64'));console.log(await page.evaluate(()=>window.inspectSkinned()));
for(const view of ['hand','shoulder','back','side'])for(const frame of [0,210])writeFileSync(`.verify-shots/skinned-3d/${view}-${frame}.png`,Buffer.from(await page.evaluate(([f,v])=>window.renderSkinned(f,v),[frame,view]),'base64'));
writeFileSync('.verify-shots/skinned-3d/dark-210.png',Buffer.from(await page.evaluate(()=>window.renderSkinned(210,'full',true)),'base64'));
const poses=await page.evaluate(()=>[0,60,120,180,210,240,300,360,420,479,480].map(frame=>({frame,joints:window.inspectPose(frame)})));
writeFileSync(dir+'pose-checks.json',JSON.stringify(poses,null,2)+'\n');
if(process.argv.includes('--video'))for(const dark of [false,true]){
 const output='public/exercise-guides/skinned-pilot';mkdirSync(output,{recursive:true});
 const file=output+`/lateral-raise-v2${dark?'-dark':''}.mp4`;
 const encoder=spawn(process.env.FFMPEG_PATH||'ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-f','image2pipe','-framerate','60','-i','pipe:0','-an','-c:v','libx264','-threads','2','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',file],{windowsHide:true});
 encoder.stderr.pipe(process.stderr);let encoderError;
 encoder.on('error',error=>{encoderError=error;});encoder.stdin.on('error',error=>{encoderError=error;});
 const exited=once(encoder,'close');
 for(let frame=0;frame<480;frame++){
  if(encoderError)throw encoderError;
  const data=Buffer.from(await page.evaluate(([f,d])=>window.renderSkinned(f,'full',d),[frame,dark]),'base64');
  if(!encoder.stdin.write(data))await once(encoder.stdin,'drain');
  if(frame%120===0)console.log(`rendered ${frame}/480`);
 }
 encoder.stdin.end();const [code]=await exited;if(code!==0)throw new Error(`Encoder exit ${code}`);
 writeFileSync(dir+`pilot-v2${dark?'-dark':''}-result.json`,JSON.stringify({file,sha256:createHash('sha256').update(readFileSync(file)).digest('hex'),sceneSha256:createHash('sha256').update(readFileSync(dir+'studio.mjs')).digest('hex'),modelSha256:createHash('sha256').update(readFileSync(dir+'human.json')).digest('hex'),status:'candidate',frames:480,fps:60},null,2)+'\n');
 console.log(file);
}
}finally{await browser.close();}
