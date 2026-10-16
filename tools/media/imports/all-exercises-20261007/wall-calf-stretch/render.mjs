import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base=dirname(fileURLToPath(import.meta.url));
const bin='C:/git/Bit-O/video-tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin';
const results=[];
for(const theme of ['light','dark']){
 const target=join(base,'wall-calf-stretch'+(theme==='dark'?'-dark':'')+'.mp4');
 execFileSync(join(bin,'ffmpeg.exe'),['-y','-v','error','-loop','1','-framerate','24','-i',join(base,theme+'.png'),'-t','8','-c:v','libx264','-threads','1','-preset','slow','-crf','0','-pix_fmt','yuv420p','-movflags','+faststart','-an',target]);
 execFileSync(join(bin,'ffmpeg.exe'),['-v','error','-i',target,'-f','null','-']);
 const frames=execFileSync(join(bin,'ffmpeg.exe'),['-v','error','-i',target,'-f','framemd5','-'],{encoding:'utf8'}).split('\n').filter(x=>x&&!x.startsWith('#'));
 const meta=JSON.parse(execFileSync(join(bin,'ffprobe.exe'),['-v','error','-show_streams','-show_format','-of','json',target],{encoding:'utf8'}));
 const v=meta.streams[0];
 if(frames.length!==192||new Set(frames.map(x=>x.split(',').at(-1).trim())).size!==1||v.width!==480||v.height!==480||v.avg_frame_rate!=='24/1'||Number(meta.format.duration)!==8)throw Error('Invalid static hold');
 results.push({theme,sha256:createHash('sha256').update(readFileSync(target)).digest('hex'),decode:'passed',identicalFrames:192,width:480,height:480,fps:24,seconds:8});
}
writeFileSync(join(base,'render-evidence.json'),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results));
