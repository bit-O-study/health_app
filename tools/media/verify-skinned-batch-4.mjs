import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const dir='tools/media/motion-refresh/skinned-3d/';
const ids=["zottman-curl","wide-dumbbell-curl","scaption","alternating-dumbbell-front-raise"];
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const ffmpeg=args=>new Promise((resolve,reject)=>{
 const child=spawn(process.env.FFMPEG_PATH||'ffmpeg',args,{windowsHide:true});let out='',err='';
 child.stdout.on('data',x=>out+=x);child.stderr.on('data',x=>err+=x);child.once('error',reject);
 child.once('exit',code=>code===0?resolve({out,err}):reject(Error(err)));
});
const results=await Promise.all(ids.map(async id=>{
 const candidate=JSON.parse(readFileSync(dir+id+'-candidate.json','utf8'));
 for(const input of candidate.inputs)if(hash(dir+input.file)!==input.sha256)throw Error('Changed render input '+input.file);
 const themes=[];
 for(const theme of candidate.themes){
  if(hash(theme.file)!==theme.sha256)throw Error('Changed video '+theme.file);
  const decoded=await ffmpeg(['-hide_banner','-loglevel','info','-threads','2','-i',theme.file,'-f','framemd5','-']);
  const frames=decoded.out.split('\n').filter(s=>/^0,/.test(s)).length;
  if(frames!==480||!decoded.err.includes('1080x1080')||!decoded.err.includes('60 fps'))throw Error('Unexpected decode '+theme.file);
  await ffmpeg(['-hide_banner','-loglevel','error','-y','-threads','2','-i',theme.file,'-vf','fps=1/2,scale=270:270,tile=4x1','-frames:v','1',`.verify-shots/skinned-3d/${id}/encoded${theme.suffix}.png`]);
  themes.push({...theme,decodedFrames:frames});
 }
 return{id,inputs:candidate.inputs,themes};
}));
const browser=await chromium.launch();
try{
 await Promise.all(results.map(async result=>{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  try{
   await page.goto('http://127.0.0.1:3189/exercise-guides/skinned-pilot/batch.html?exercise='+result.id);
   for(const theme of result.themes){
    await page.locator(`[data-mode="${theme.suffix?'dark':'light'}"]`).click();
    await page.waitForFunction(()=>document.querySelector('video').readyState>=2);
    const playback=await page.evaluate(async()=>{
     const video=document.querySelector('video');video.pause();
     const seek=t=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('seek timeout')),10000);video.addEventListener('seeked',()=>{clearTimeout(timer);resolve();},{once:true});video.currentTime=t;});
     for(const t of [.1,2,3.5,6,7.8])await seek(t);
     let looped=false;const listener=()=>{if(video.currentTime<1)looped=true;};video.addEventListener('timeupdate',listener);
     const before=video.getVideoPlaybackQuality();await video.play();await new Promise(r=>setTimeout(r,8250));video.pause();video.removeEventListener('timeupdate',listener);const after=video.getVideoPlaybackQuality();
     return{width:video.videoWidth,height:video.videoHeight,duration:video.duration,looped,error:video.error?.message||null,overflow:document.documentElement.scrollWidth>innerWidth,frames:after.totalVideoFrames-before.totalVideoFrames,dropped:after.droppedVideoFrames-before.droppedVideoFrames};
    });
    if(playback.width!==1080||playback.height!==1080||playback.duration!==8||!playback.looped||playback.error||playback.overflow)throw Error(JSON.stringify(playback));
    theme.playback=playback;
    await page.screenshot({path:`.verify-shots/skinned-3d/${result.id}/mobile${theme.suffix}.png`});
   }
   console.log(result.id+': full decode, seek, loop and mobile layout passed');
  }finally{await page.close();}
 }));
}finally{await browser.close();}
writeFileSync(dir+'batch-4-verification.json',JSON.stringify({verifiedAt:new Date().toISOString(),results},null,2)+'\n');
