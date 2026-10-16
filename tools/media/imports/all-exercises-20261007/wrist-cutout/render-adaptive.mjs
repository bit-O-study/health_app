import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const base = 'tools/media/imports/all-exercises-20261007/wrist-cutout';
const input = `${base}/local/reverse-wrist-curl-u2net-static-bench/tools/media/motion-guides/reverse-wrist-curl`;
const output = `${base}/local/reverse-wrist-curl-adaptive/public/exercise-guides/ai-v3`;
const bin = 'C:/git/Bit-O/video-tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/';
mkdirSync(output, { recursive: true });
const filter = 'scale=in_range=full:out_range=tv,format=yuv420p,tpad=stop_mode=clone:stop_duration=1,minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:mb_size=8:search_param=32:vsbmc=1:scd=none';
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const results = [];
for (const theme of ['light', 'dark']) {
  const file = `${output}/reverse-wrist-curl${theme === 'dark' ? '-dark' : ''}.mp4`;
  execFileSync(`${bin}ffmpeg.exe`, ['-y','-v','error','-framerate','5/2','-i',`${input}/frames-${theme}/%03d.jpg`,'-vf',filter,'-t','8','-c:v','libx264','-preset','slow','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart','-an',file]);
  execFileSync(`${bin}ffmpeg.exe`, ['-v','error','-i',file,'-f','null','-']);
  execFileSync(`${bin}ffmpeg.exe`, ['-y','-v','error','-i',file,'-vf','fps=4,scale=240:240,tile=8x4','-frames:v','1',`${base}/adaptive-${theme}-sheet.jpg`]);
  execFileSync(`${bin}ffmpeg.exe`, ['-y','-v','error','-ss','2.125','-i',file,'-frames:v','1',`${base}/adaptive-${theme}-mid.png`]);
  const metadata = JSON.parse(execFileSync(`${bin}ffprobe.exe`, ['-v','error','-show_streams','-of','json',file])).streams[0];
  if (metadata.width !== 480 || metadata.height !== 480 || metadata.nb_frames !== '192' || metadata.avg_frame_rate !== '24/1') throw Error('Invalid video');
  results.push({ theme, file, sha256: sha(file), decode: 'passed', frames: 192 });
}
writeFileSync(`${base}/adaptive-render.json`, JSON.stringify({ filter, createdAt: new Date().toISOString(), inputs: Array.from({length:20},(_,i)=>['light','dark'].map(theme=>{const path=`${input}/frames-${theme}/${String(i+1).padStart(3,'0')}.jpg`;return {path,sha256:sha(path)};})).flat(), results },null,2));
console.log(JSON.stringify(results));
