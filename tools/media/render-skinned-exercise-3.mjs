import {chromium} from 'playwright';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
const id=process.argv[2];
if(!["dumbbell-shoulder-press","alternating-dumbbell-shoulder-press","single-arm-dumbbell-front-raise","single-arm-dumbbell-lateral-raise"].includes(id))throw Error('Unsupported exercise');
const dir='tools/media/motion-refresh/skinned-3d/', output='public/exercise-guides/skinned-pilot/';
const shots=`.verify-shots/skinned-3d/${id}/`;mkdirSync(shots,{recursive:true});
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const browser=await chromium.launch();
const themes=[];
try{
 const page=await browser.newPage({viewport:{width:1080,height:1080}});
 page.on('pageerror',error=>console.error(error));
 await page.route('http://skinned.local/**',async route=>{
  const file=new URL(route.request().url()).pathname.slice(1);
  const paths={'studio.mjs':dir+'studio-batch-3.mjs','exercise-motion-3.mjs':dir+'exercise-motion-3.mjs','human.json':dir+'human.json','RoomEnvironment.js':'node_modules/three/examples/jsm/environments/RoomEnvironment.js','three.module.js':'node_modules/three/build/three.module.js','three.core.js':'node_modules/three/build/three.core.js'};
  if(!file)return route.fulfill({contentType:'text/html',body:'<canvas></canvas><script type="module" src="./studio.mjs"></script>'});
  if(!paths[file])return route.fulfill({status:404,body:''});
  const body=file==='RoomEnvironment.js'?readFileSync(paths[file],'utf8').replace("from 'three'","from './three.module.js'"):readFileSync(paths[file]);
  return route.fulfill({contentType:file.endsWith('.json')?'application/json':'text/javascript',body});
 });
 await page.goto('http://skinned.local/?exercise='+id);await page.waitForFunction(()=>window.ready,{},{timeout:90000});
 for(const view of ['full','hand','side'])for(const frame of [0,105,210,345])writeFileSync(`${shots}${view}-${frame}.png`,Buffer.from(await page.evaluate(([f,v])=>window.renderSkinned(f,v),[frame,view]),'base64'));
 writeFileSync(`${shots}dark-210.png`,Buffer.from(await page.evaluate(()=>window.renderSkinned(210,'full',true)),'base64'));
 const poses=await page.evaluate(()=>[0,60,105,160,210,240,300,345,400,479,480].map(frame=>({frame,joints:window.inspectPose(frame)})));
 writeFileSync(dir+id+'-poses.json',JSON.stringify(poses,null,2)+'\n');
 if(!process.argv.includes('--preview'))for(const dark of [false,true]){
  const suffix=dark?'-dark':'',file=output+id+suffix+'.mp4';
  const encoder=spawn(process.env.FFMPEG_PATH||'ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-f','image2pipe','-framerate','60','-i','pipe:0','-an','-c:v','libx264','-threads','2','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',file],{windowsHide:true});
  encoder.stderr.pipe(process.stderr);let encoderError;
  encoder.on('error',error=>{encoderError=error;});encoder.stdin.on('error',error=>{encoderError=error;});const exited=once(encoder,'close');
  try{
   for(let frame=0;frame<480;frame++){
    if(encoderError)throw encoderError;
    const data=Buffer.from(await page.evaluate(([f,d])=>window.renderSkinned(f,'full',d),[frame,dark]),'base64');
    if(!encoder.stdin.write(data))await once(encoder.stdin,'drain');
    if(frame%160===0)console.log(`${id}${suffix}: ${frame}/480`);
   }
   encoder.stdin.end();const [code]=await exited;if(code!==0)throw Error('Encoder exit '+code);
  }finally{if(encoder.exitCode===null)encoder.kill();}
  themes.push({suffix,file,sha256:hash(file),bytes:readFileSync(file).length});
 }
 if(themes.length)writeFileSync(dir+id+'-candidate.json',JSON.stringify({id,status:'pending-visual-review',frames:480,fps:60,width:1080,height:1080,themes,inputs:['studio-batch-3.mjs','exercise-motion-3.mjs','human.json'].map(file=>({file,sha256:hash(dir+file)}))},null,2)+'\n');
 console.log(id+': '+(themes.length?'rendered':'previewed'));
}finally{await browser.close();}
