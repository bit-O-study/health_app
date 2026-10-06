import sharp from 'sharp';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const id = 'barbell-shrug';
const output = 'public/exercise-guides/refresh-candidates';
const atlas='tools/media/motion-refresh/barbell-shrug-atlas.png';
const parts={};
for(const [name,region] of Object.entries({body:{left:120,top:65,width:340,height:1120},assembly:{left:465,top:275,width:785,height:525}})){
 parts[name]=(await sharp(atlas).extract(region).png().toBuffer()).toString('base64');
}
const browser = await chromium.launch();
const themes = [];
try {
  const page = await browser.newPage();
  await page.setContent('<html><body></body></html>');
  await page.evaluate(async parts => {
    const images = {};
    for (const [name, data] of Object.entries(parts)) {
      const img = new Image(); img.src = 'data:image/png;base64,' + data; await img.decode(); images[name] = img;
    }
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 720;
    const ctx = canvas.getContext('2d');
    window.renderArticulated = (frame,dark) => {
      ctx.fillStyle=dark?'#09090b':'#fafafa';ctx.fillRect(0,0,720,720);
      const lift=4.5*(1-Math.cos(2*Math.PI*frame/480));
      ctx.drawImage(images.body,269,50,340*.52,1120*.52);
      ctx.drawImage(images.assembly,161,155-lift,785*.506,525*.506);
      return canvas.toDataURL().split(',')[1];
    };
  },parts);
  for (const dark of [false,true]) {
    const suffix=dark?'-dark':'';const file=`${output}/${id}${suffix}.mp4`;
    const child=spawn(process.env.FFMPEG_PATH||'ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate','60','-i','pipe:0','-an','-c:v','libx264','-threads','2','-preset','slow','-crf','18','-profile:v','main','-pix_fmt','yuv420p','-movflags','+faststart',file]);
    const finished=new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`FFmpeg ${code}`)));});child.stderr.pipe(process.stderr);
    for(let frame=0;frame<480;frame++){
      const data=Buffer.from(await page.evaluate(([frame,dark])=>window.renderArticulated(frame,dark),[frame,dark]),'base64');
      if([0,120,240].includes(frame))writeFileSync(`${output}/${id}${suffix}-${frame}.png`,data);
      if(!child.stdin.write(data))await new Promise(resolve=>child.stdin.once('drain',resolve));
    }
    child.stdin.end();await finished;themes.push({suffix,sha256:createHash('sha256').update(readFileSync(file)).digest('hex'),bytes:readFileSync(file).length});console.log(`${id}${suffix}: rendered atlas rig`);
  }
} finally { await browser.close(); }
writeFileSync(`tools/media/motion-refresh/${id}-candidate.json`,JSON.stringify({id,renderer:'rigid-shrug-atlas-v1',timing:'smooth',sourceAtlasSha256:createHash('sha256').update(readFileSync(atlas)).digest('hex'),status:'pending-visual-review',constraints:{rigidArmsAndBar:true,liftPixels:9,peakSeconds:4},themes},null,2)+'\n');
