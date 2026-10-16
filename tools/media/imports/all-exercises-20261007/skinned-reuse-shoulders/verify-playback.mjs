import {chromium,devices} from 'playwright';
import {writeFileSync,readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createServer} from 'node:http';
const base='tools/media/imports/all-exercises-20261007/skinned-reuse-shoulders/native'; const id=process.argv[2];
const server=createServer((req,res)=>{const name=req.url?.slice(1);if(![id+'.mp4',id+'-dark.mp4'].includes(name)){res.writeHead(404);res.end();return;}const data=readFileSync(resolve(base,'.',name));const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range??'');if(match){const start=Number(match[1]),end=match[2]?Math.min(Number(match[2]),data.length-1):data.length-1;res.writeHead(206,{'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});res.end(data.subarray(start,end+1));}else{res.writeHead(200,{'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Length':data.length});res.end(data);}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,channel:'msedge'});const context=await browser.newContext({...devices['Pixel 7']});const results=[];
try{for(const suffix of ['', '-dark']){
 const page=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/'+id+suffix+'.mp4');
 await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
 const meta=await page.locator('video').evaluate(async v=>{v.muted=true;v.loop=true;await v.play();return {width:v.videoWidth,height:v.videoHeight,duration:v.duration}});
 if(meta.width!==480||meta.height!==480||Math.abs(meta.duration-8)>.05)throw Error('Invalid metadata');
 await page.waitForFunction(()=>document.querySelector('video').currentTime>.2);
 await page.locator('video').evaluate(v=>{v.pause();v.currentTime=7.5;});await page.waitForFunction(()=>{const v=document.querySelector('video');return !v.seeking&&v.readyState>=2&&Math.abs(v.currentTime-7.5)<.1&&!v.error});
 await page.locator('video').evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('video').currentTime<1);results.push({theme:suffix?'dark':'light',...meta,play:true,seek:true,loop:true});await page.close();
 }writeFileSync(base+'/'+id+'-playback.json',JSON.stringify({scope:'Local MP4 in mobile Edge emulation, not app or physical device',results},null,2));console.log(JSON.stringify(results));
}finally{await browser.close();server.close();}
