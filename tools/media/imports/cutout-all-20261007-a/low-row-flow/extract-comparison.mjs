import {execFileSync} from 'node:child_process';
const ff='C:/git/Bit-O/video-tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffmpeg.exe';const base='tools/media/imports/cutout-all-20261007-a/low-row-flow';const original='tools/media/imports/cutout-all-20261007-b/local/low-row-machine-border/public/exercise-guides/ai-v3/low-row-machine.mp4';
for(const time of [1.25,1.375,5.25,5.375])execFileSync(ff,['-y','-v','error','-threads','2','-ss',String(time),'-i',original,'-frames:v','1',`${base}/baseline-${time}.jpg`]);
for(const name of ['bilat8','bidir8','bilat16'])execFileSync(ff,['-y','-v','error','-threads','2','-ss','1.375','-i',`${base}/${name}-forward.mp4`,'-frames:v','1',`${base}/${name}-forward-1.375.jpg`]);
