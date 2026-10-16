import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base='tools/media/imports/all-exercises-20261007/band-front-raise';
const bin='C:/git/Bit-O/video-tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/';
if(!process.argv.includes('--verify-only')){
 execFileSync('C:/git/Bit-O/video-tools/python312/python.exe',[base+'/prepare.py']);
 for(const theme of ['light','dark']){
  const suffix=theme==='dark'?'-dark':'';
  execFileSync(bin+'ffmpeg.exe',['-y','-v','error','-framerate','5','-i',base+'/frames-'+theme+'/%03d.jpg','-vf','scale=in_range=full:out_range=tv,format=yuv420p,tpad=stop_mode=clone:stop_duration=1,minterpolate=fps=24:mi_mode=mci:mc_mode=obmc:me_mode=bidir:mb_size=16:search_param=32:vsbmc=0:scd=none','-filter_threads','1','-threads','2','-t','8','-c:v','libx264','-preset','slow','-crf','22','-profile:v','main','-pix_fmt','yuv420p','-movflags','+faststart','-an',base+'/band-front-raise'+suffix+'.mp4']);
 }
}
const results=[];
for(const theme of ['light','dark']){
 const path=base+'/band-front-raise'+(theme==='dark'?'-dark':'')+'.mp4';
 execFileSync(bin+'ffmpeg.exe',['-v','error','-i',path,'-f','null','-']);
 const meta=JSON.parse(execFileSync(bin+'ffprobe.exe',['-v','error','-show_streams','-show_format','-of','json',path],{encoding:'utf8'}));const v=meta.streams[0];
 if(v.width!==480||v.height!==480||v.avg_frame_rate!=='24/1'||Number(meta.format.duration)!==8)throw Error('Invalid movie');
 execFileSync(bin+'ffmpeg.exe',['-y','-v','error','-i',path,'-vf','fps=4,scale=240:240,tile=8x4','-frames:v','1',base+'/'+theme+'-contact.jpg']);
 results.push({theme,sha256:createHash('sha256').update(readFileSync(path)).digest('hex'),decode:'passed',width:480,height:480,fps:24,seconds:8});
}
writeFileSync(base+'/render-evidence.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
