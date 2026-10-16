import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const base='tools/media/imports/all-exercises-20261007/skinned-reuse-audit';
const root='tools/media/motion-refresh/skinned-3d';
const ff='C:/git/Bit-O/video-tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffmpeg.exe';
const probe=ff.replace('ffmpeg.exe','ffprobe.exe');
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
mkdirSync(base+'/dependencies',{recursive:true});
const dependencies=['node_modules/three/build/three.module.js','node_modules/three/build/three.core.js','node_modules/three/examples/jsm/environments/RoomEnvironment.js','node_modules/three/package.json'].map(p=>{const dest=base+'/dependencies/'+p.split('/').at(-1);copyFileSync(p,dest);return {path:dest,sha256:sha(dest),origin:p};});
for(const [id,batch] of [['cross-body-hammer-curl',2],['scaption',4]]){
 const inputs=[`${root}/studio-batch-${batch}.mjs`,`${root}/exercise-motion-${batch}.mjs`,`${root}/human.json`,`tools/media/render-skinned-exercise-${batch}.mjs`].map(path=>({path,sha256:sha(path)}));
 const themes=[];
 for(const suffix of ['','-dark']){
  const source=`public/exercise-guides/skinned-pilot/${id}${suffix}.mp4`,file=`${base}/${id}${suffix}.mp4`;
  execFileSync(ff,['-v','error','-i',source,'-f','null','-']);
  const args=['-v','error','-y','-i',source,'-vf','scale=480:480:flags=lanczos,fps=24','-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-threads','2','-movflags','+faststart','-an',file];
  execFileSync(ff,args);execFileSync(ff,['-v','error','-i',file,'-f','null','-']);
  execFileSync(ff,['-v','error','-y','-i',file,'-vf','fps=4,scale=240:240,tile=8x4','-frames:v','1',`${base}/${id}${suffix}-final-sheet.jpg`]);
  const meta=JSON.parse(execFileSync(probe,['-v','error','-show_streams','-of','json',file],{encoding:'utf8'})).streams[0];
  if(meta.width!==480||meta.height!==480||meta.r_frame_rate!=='24/1'||Number(meta.nb_frames)!==192)throw Error('Unexpected output');
  themes.push({suffix,source,sourceSha256:sha(source),file,sha256:sha(file),width:meta.width,height:meta.height,fps:24,frames:192,seconds:Number(meta.duration),decode:'passed',command:args});
 }
 execFileSync(ff,['-v','error','-y','-i',themes[0].source,'-vf','fps=2,scale=320:320,tile=4x4','-frames:v','1',`${base}/${id}.jpg`]);
 writeFileSync(`${base}/${id}-provenance.json`,JSON.stringify({id,renderer:'skinned-pilot-v1',inputs,dependencies,themes,sourceContact:{path:`${base}/${id}.jpg`,sha256:sha(`${base}/${id}.jpg`),description:'16 evenly spaced diagnostic frames from original 3D video; full movement already encoded, not an interpolation atlas'},note:'Original 1080/60 frames downsampled to 480/24 without optical flow. Local renderer serves dependency routes; RoomEnvironment import rewritten from three to ./three.module.js.'},null,2));
 console.log(id+' prepared');
}
