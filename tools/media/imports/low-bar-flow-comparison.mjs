import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import sharp from 'sharp';

const root = 'tools/media/imports/low-bar-u2netp-20260918';
const frames = root + '/tools/media/motion-guides/low-bar-squat';
const bin = join(process.env.LOCALAPPDATA, 'Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin');
const filter = 'scale=in_range=full:out_range=tv,format=yuv420p,tpad=stop_mode=clone:stop_duration=1,minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bilat:mb_size=8:search_param=64:vsbmc=1:scd=none';
if (process.argv[2] === 'inspect') {
  const theme = process.argv[3] === 'dark' ? 'dark' : 'light';
  console.log('data:image/jpeg;base64,' + (await sharp(root + '/flow-' + theme + '.jpg').jpeg({ quality: 75 }).toBuffer()).toString('base64'));
} else {
  const results = [];
  for (const theme of ['light', 'dark']) {
    const output = root + '/flow-' + theme + '.mp4';
    execFileSync(join(bin, 'ffmpeg.exe'), ['-y','-v','error','-framerate','5','-t','8','-i',frames+'/frames-'+theme+'/%03d.jpg','-vf',filter,'-t','8','-c:v','libx264','-preset','slow','-crf','22','-profile:v','main','-pix_fmt','yuv420p','-movflags','+faststart','-an',output], { stdio:'inherit' });
    execFileSync(join(bin, 'ffmpeg.exe'), ['-v','error','-i',output,'-f','null','-'], { stdio:'pipe' });
    execFileSync(join(bin, 'ffmpeg.exe'), ['-y','-v','error','-i',output,'-vf','fps=4,scale=240:240,tile=8x4','-frames:v','1',root+'/flow-'+theme+'.jpg'], { stdio:'inherit' });
    const meta = JSON.parse(execFileSync(join(bin, 'ffprobe.exe'), ['-v','error','-show_streams','-show_format','-of','json',output], { encoding:'utf8' }));
    const stream = meta.streams[0];
    if (stream.width!==480 || stream.height!==480 || stream.avg_frame_rate!=='24/1' || Math.abs(Number(meta.format.duration)-8)>.05) throw Error('Unexpected format');
    results.push({theme,sha256:createHash('sha256').update(readFileSync(output)).digest('hex'),decode:'passed',width:480,height:480,fps:24,seconds:8});
  }
  writeFileSync(root+'/flow-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),filter,results},null,2));
  console.log(JSON.stringify(results));
}
