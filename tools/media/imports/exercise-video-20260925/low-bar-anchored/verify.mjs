import {createServer} from 'node:http';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium,devices} from 'playwright';
const id=process.argv[2]??'low-bar-squat';
if(!/^[a-z0-9-]+$/.test(id))throw Error('Expected an exercise video ID');
const output=`tools/media/imports/exercise-video-20260925/low-bar-anchored/playback-${id}.json`;
const media=readFileSync(`tools/media/imports/exercise-video-20260925/low-bar-anchored/public/exercise-guides/ai-v3/${id}.mp4`);
let stage='server',browser;
const log=s=>{stage=s;console.log(new Date().toISOString(),s);};
const server=createServer((req,res)=>{
 if(req.url!=='/video.mp4'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<video controls muted playsinline preload="auto" src="/video.mp4"></video>');return;}
 const match=/bytes=(\d+)-(\d*)/.exec(req.headers.range??'');
 if(match){const start=Number(match[1]),end=match[2]?Math.min(Number(match[2]),media.length-1):media.length-1;res.writeHead(206,{'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${media.length}`,'Content-Length':end-start+1});res.end(media.subarray(start,end+1));}
 else{res.writeHead(200,{'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Length':media.length});res.end(media);}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
try{
 log('launch');browser=await chromium.launch({headless:true,timeout:20000});
 log('new page');const page=await browser.newPage({...devices['Pixel 7']});page.setDefaultTimeout(15000);
 const url=`http://127.0.0.1:${server.address().port}/`;
 log('navigate');await page.goto(url,{waitUntil:'domcontentloaded',timeout:15000});
 log('metadata');await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
 log('play');const meta=await page.locator('video').evaluate(async v=>{v.muted=true;await Promise.race([v.play(),new Promise((_,reject)=>setTimeout(()=>reject(Error('play timeout')),10000))]);return {width:v.videoWidth,height:v.videoHeight,seconds:v.duration,error:v.error?.code??null};});
 if(meta.width!==480||meta.height!==480||Math.abs(meta.seconds-8)>.05||meta.error)throw Error(JSON.stringify(meta));
 await page.waitForFunction(()=>document.querySelector('video').currentTime>.2);
 log('seek');await page.locator('video').evaluate(v=>{v.pause();v.currentTime=7.5;});
 await page.waitForFunction(()=>{const v=document.querySelector('video');return !v.seeking&&v.readyState>=2&&v.currentTime>=7.49;});
 const result={checkedAt:new Date().toISOString(),scope:'Loopback HTML video; mobile Chromium Pixel 7; app UI and physical Android not tested',url,videoSha256:createHash('sha256').update(media).digest('hex'),...meta,play:'passed',seek:'passed'};
 writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}catch(error){writeFileSync(output,JSON.stringify({checkedAt:new Date().toISOString(),stage,status:'failed',error:String(error)},null,2)+'\n');console.error(stage,error);process.exitCode=1;}
finally{log('close');server.closeAllConnections();await new Promise(r=>server.close(r));if(browser)await browser.close();log('done');}
