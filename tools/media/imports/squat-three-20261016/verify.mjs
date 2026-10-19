import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const id=process.argv[2]; if(!['squat','pulse-squat','chair-pose'].includes(id))throw Error('Unknown id');
const base='tools/media/imports/squat-three-20261016/native/'+id;
const ff='C:/git/Bit-O/video-tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffmpeg.exe';
const probe=ff.replace('ffmpeg.exe','ffprobe.exe');
const candidate=JSON.parse(readFileSync(base+'/candidate.json'));
const hash=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
for(const input of [...candidate.inputs,...candidate.outputs])assert.equal(hash(input.file),input.sha256);
const poses=JSON.parse(readFileSync(base+'/poses.json'));
assert.deepEqual(poses[0].joints,poses.at(-1).joints);
let minElbow=180,maxElbow=0;
for(const {joints} of poses)for(const side of ['L','R']) {
 const [a,b,c]=['upperarm01','lowerarm01','wrist'].map(n=>joints[n+'.'+side]);
 const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);
 const angle=Math.acos(u.reduce((s,x,i)=>s+x*v[i],0)/(Math.hypot(...u)*Math.hypot(...v)))*180/Math.PI;
 minElbow=Math.min(minElbow,angle);maxElbow=Math.max(maxElbow,angle);
 assert.ok(angle>160&&angle<180.01);
 assert.ok(Object.values(joints).flat().every(Number.isFinite));
}
// Decode alpha explicitly: the default FFmpeg VP9 decoder does not expose alpha.
const alpha=execFileSync(ff,['-v','error','-c:v','libvpx-vp9','-i',base+'/'+id+'-alpha.webm','-vf','alphaextract','-f','rawvideo','-pix_fmt','gray','-'],{maxBuffer:64*1024*1024});
assert.equal(alpha.length,192*480*480);
let partial=0,opaque=0,transparent=0;
for(let frame=0;frame<192;frame++){
 const start=frame*480*480;
 for(let y=0;y<480;y++)for(let x=0;x<480;x++){
  const a=alpha[start+y*480+x];
  if(x<3||x>476||y<3||y>476)assert.equal(a,0,'body clipped at frame edge');
  if(a===0)transparent++;else if(a===255)opaque++;else partial++;
 }
}
assert.ok(opaque>0&&partial>0&&transparent>opaque);
const browser=await chromium.launch({channel:'msedge',headless:true});
const playback=[];
try {
 const page=await browser.newPage();
 await page.route('http://video.local/**',route=>{
  const name=new URL(route.request().url()).pathname.slice(1);
  if(!name)return route.fulfill({contentType:'text/html',body:'<video muted playsinline loop></video><canvas width="480" height="480"></canvas>'});
  const output=candidate.outputs.find(o=>o.file.endsWith('/'+name));
  if(!output)return route.fulfill({status:404,body:''});
  const bytes=readFileSync(output.file),range=route.request().headers().range;
  const contentType=name.endsWith('webm')?'video/webm':'video/mp4';
  if(range){const match=/bytes=(\d+)-(\d*)/.exec(range);const start=Number(match[1]),end=match[2]?Number(match[2]):bytes.length-1;return route.fulfill({status:206,contentType,headers:{'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${bytes.length}`},body:bytes.subarray(start,end+1)});}
  return route.fulfill({contentType,headers:{'Accept-Ranges':'bytes'},body:bytes});
 });
 await page.goto('http://video.local/');
 for(const output of candidate.outputs){
  const metadata=JSON.parse(execFileSync(probe,['-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=width,height,nb_read_frames,r_frame_rate','-of','json',output.file],{encoding:'utf8'})).streams[0];
  assert.equal(metadata.nb_read_frames,'192');assert.equal(metadata.r_frame_rate,'24/1');
  const result=await page.evaluate(async name=>{
   const video=document.querySelector('video');video.src='/'+name;
   await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=reject;});
   await video.play();await new Promise(resolve=>setTimeout(resolve,180));
   const playing=video.currentTime>0&&!video.paused;
   video.pause();video.currentTime=3;
   await new Promise(resolve=>video.onseeked=resolve);
   const seekTime=video.currentTime,seeking=Math.abs(seekTime-3)<.1;
   const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,480,480);ctx.drawImage(video,0,0,480,480);
   const cornerAlpha=ctx.getImageData(0,0,1,1).data[3];
   video.currentTime=video.duration-.12;await new Promise(resolve=>video.onseeked=resolve);await video.play();
   const deadline=performance.now()+4000;while(video.currentTime>1&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,50));
   return {playing,seeking,seekTime,loop:video.currentTime<1,cornerAlpha,duration:video.duration};
  },output.file.split('/').at(-1));
  assert.ok(result.playing&&result.seeking&&result.loop,JSON.stringify({theme:output.theme,...result}));assert.equal(result.duration,8);
  if(output.theme==='alpha')assert.equal(result.cornerAlpha,0);
  playback.push({theme:output.theme,...result,metadata});
 }
}finally{await browser.close();}
const report={sourceHashChecks:'passed',poseSamples:poses.length,loopPoseError:0,elbowDegrees:[minElbow,maxElbow],alpha:{transparent,opaque,partial,all192FrameEdgesClear:true},playback,limits:['Procedural demonstration; not captured human motion.','No floor is rendered; eight-second demonstration cycle; hold duration is illustrative.','Actual phone and production deployment are not verified.']};
writeFileSync(base+'/verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
