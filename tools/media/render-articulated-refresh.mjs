import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const id = 'dumbbell-shoulder-press';
const output = 'public/exercise-guides/refresh-candidates';
const parts = Object.fromEntries(['body', 'upper', 'left', 'right'].map(name => [name, readFileSync(`tools/media/motion-refresh/atlas-${name}.png`).toString('base64')]));
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
    const joints = [{ x:292,y:269,side:'left',start:180,sign:1,pivot:[190,422] }, { x:425,y:269,side:'right',start:0,sign:-1,pivot:[175,422] }];
    const upperLength = Math.hypot(315,35);
    window.renderArticulated = (frame,dark) => {
      ctx.fillStyle = dark ? '#09090b' : '#fafafa'; ctx.fillRect(0,0,720,720);
      const phase = (1-Math.cos(2*Math.PI*frame/480))/2;
      const elbows = [];
      for (const joint of joints) {
        const angle = (joint.start+joint.sign*85*phase)*Math.PI/180;
        const elbow = [joint.x+80*Math.cos(angle),joint.y+80*Math.sin(angle)]; elbows.push(elbow);
        ctx.save(); ctx.translate(joint.x,joint.y); ctx.rotate(angle-Math.atan2(35,315)); ctx.scale(80/upperLength,80/upperLength); ctx.drawImage(images.upper,-45,-80); ctx.restore();
      }
      ctx.drawImage(images.body,206,130,390*.79,690*.79);
      joints.forEach((joint,i) => {
        ctx.save();ctx.translate(...elbows[i]);ctx.scale(.294,.294);ctx.drawImage(images[joint.side],-joint.pivot[0],-joint.pivot[1]);ctx.restore();
      });
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
writeFileSync(`tools/media/motion-refresh/${id}-candidate.json`,JSON.stringify({id,renderer:'articulated-atlas-v1',timing:'smooth',sourceAtlasSha256:createHash('sha256').update(readFileSync('tools/media/motion-refresh/shoulder-press-atlas.png')).digest('hex'),status:'pending-visual-review',constraints:{upperArmLength:80,forearmScale:.294,bodyScale:.79,peakSeconds:4},themes},null,2)+'\n');
