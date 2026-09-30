import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const dir='tools/media/motion-refresh/skinned-3d/';
const results=[];
for(const suffix of ['','-dark']){
 const proof=JSON.parse(readFileSync(`${dir}pilot-v2${suffix}-result.json`,'utf8'));
 const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
 if(hash(proof.file)!==proof.sha256||hash(dir+'studio.mjs')!==proof.sceneSha256||hash(dir+'human.json')!==proof.modelSha256)throw Error('Render inputs/output changed');
 const decoded=spawnSync(process.env.FFMPEG_PATH||'ffmpeg',['-hide_banner','-loglevel','info','-i',proof.file,'-f','framemd5','-'],{encoding:'utf8',maxBuffer:2*1024*1024,windowsHide:true});
 const frames=decoded.stdout.split('\n').filter(s=>/^0,/.test(s)).length;
 if(decoded.status!==0||frames!==480||!decoded.stderr.includes('1080x1080')||!decoded.stderr.includes('60 fps'))throw Error(decoded.stderr||'Decode mismatch');
 results.push({suffix,sha256:proof.sha256,decodedFrames:frames,width:1080,height:1080,fps:60});
}
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto('http://127.0.0.1:3189/exercise-guides/skinned-pilot/');
 for(const [mode,suffix] of [['dark','-dark'],['light','']]){
  await page.locator(`[data-mode="${mode}"]`).click();
  await page.waitForFunction(()=>document.querySelector('video').readyState>=2);
  const playback=await page.evaluate(async()=>{
   const video=document.querySelector('video');video.pause();
   const seek=t=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('seek timed out')),10000);video.addEventListener('seeked',()=>{clearTimeout(timer);resolve();},{once:true});video.currentTime=t;});
   for(const t of [.1,1.5,3.5,5,7.8])await seek(t);
   let looped=false;const listen=()=>{if(video.currentTime<1)looped=true;};video.addEventListener('timeupdate',listen);
   await video.play();await new Promise(resolve=>setTimeout(resolve,1600));video.pause();video.removeEventListener('timeupdate',listen);
   return{width:video.videoWidth,height:video.videoHeight,duration:video.duration,looped,error:video.error?.message||null,overflow:document.documentElement.scrollWidth>innerWidth,quality:video.getVideoPlaybackQuality().toJSON?.()||{dropped:video.getVideoPlaybackQuality().droppedVideoFrames}};
  });
  if(playback.width!==1080||playback.height!==1080||playback.duration!==8||!playback.looped||playback.error||playback.overflow)throw Error(JSON.stringify(playback));
  results.find(r=>r.suffix===suffix).playback=playback;
  await page.screenshot({path:`.verify-shots/skinned-3d/mobile-v2${suffix}.png`});
 }
 await page.locator('[data-mode="before"]').click();await page.waitForFunction(()=>document.querySelector('video').videoWidth===900);
 console.log('Before/after viewer, both themes and mobile loops passed');
}finally{await browser.close();}
writeFileSync(dir+'verification-v2.json',JSON.stringify({verifiedAt:new Date().toISOString(),results},null,2)+'\n');
console.log(results);
