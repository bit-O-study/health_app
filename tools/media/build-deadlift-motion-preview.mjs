import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import sharp from 'sharp';

export async function buildDeadliftMotionPreview(generatedPath, prompt) {
  const generatedRoot = resolve(process.env.USERPROFILE, '.codex/generated_images');
  const source = resolve(generatedPath);
  const rel = relative(generatedRoot, source);
  if (rel.startsWith('..') || isAbsolute(rel) || extname(source) !== '.png') throw Error('Expected generated PNG');
  if (!prompt || prompt.length > 16000) throw Error('Expected exact generation prompt');
  const root = resolve('tools/media/ai-guides');
  const frames = join(root, 'deadlift-motion-preview');
  const output = resolve('public/exercise-guides/previews/conventional-deadlift-smooth.mp4');
  mkdirSync(frames, { recursive: true });
  mkdirSync(resolve('public/exercise-guides/previews'), { recursive: true });
  const sheet = join(root, 'deadlift-motion-preview.jpg');
  await sharp(source).jpeg({ quality: 92 }).toFile(sheet);
  const { width, height } = await sharp(sheet).metadata();
  const poses = [];
  for (let i = 0; i < 8; i++) {
    const left = Math.round(i % 4 * width / 4) + 4;
    const top = Math.round(Math.floor(i / 4) * height / 2) + 4;
    const right = Math.round((i % 4 + 1) * width / 4) - 4;
    const bottom = Math.round((Math.floor(i / 4) + 1) * height / 2) - 4;
    poses.push(await sharp(sheet).extract({ left, top, width: right-left, height: bottom-top })
      .resize(480,480,{fit:'contain',background:'#b6b6b6'}).jpeg({quality:94}).toBuffer());
  }
  const order = [0,0,1,2,3,4,5,6,7,7,6,5,4,3,2,1,0,0,0,0];
  for (let i=0; i<order.length; i++) writeFileSync(join(frames,String(i+1).padStart(3,'0')+'.jpg'),poses[order[i]]);
  const binDir = join(process.env.LOCALAPPDATA ?? '', 'Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin');
  const bin = name => existsSync(join(binDir,name+'.exe')) ? join(binDir,name+'.exe') : name;
  const filter = 'scale=in_range=full:out_range=tv,format=yuv420p,tpad=stop_mode=clone:stop_duration=1,minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:mb_size=8:search_param=64:vsbmc=1:scd=none,crop=400:480:60:0';
  execFileSync(bin('ffmpeg'),['-y','-v','error','-framerate','5/2','-i',join(frames,'%03d.jpg'),'-vf',filter,'-t','8','-c:v','libx264','-preset','slow','-crf','28','-profile:v','main','-pix_fmt','yuv420p','-movflags','+faststart','-an',output],{stdio:'inherit'});
  execFileSync(bin('ffmpeg'),['-v','error','-i',output,'-f','null','-'],{stdio:'pipe'});
  const meta = JSON.parse(execFileSync(bin('ffprobe'),['-v','error','-show_streams','-show_format','-of','json',output],{encoding:'utf8'}));
  const video=meta.streams[0];
  if(meta.streams.length!==1 || video.width!==400 || video.height!==480 || video.avg_frame_rate!=='24/1' || Math.abs(Number(meta.format.duration)-8)>0.05) throw Error('Unexpected video format');
  execFileSync(bin('ffmpeg'),['-y','-v','error','-i',output,'-vf','fps=4,scale=200:240,tile=8x4','-frames:v','1',join(frames,'contact-sheet.jpg')],{stdio:'inherit'});
  writeFileSync(join(root,'deadlift-motion-preview.json'),JSON.stringify({
    exerciseId:'conventional-deadlift',purpose:'continuous-motion visual prototype; not published in app',
    prompt,sourceSha256:createHash('sha256').update(readFileSync(sheet)).digest('hex'),
    output,seconds:Number(meta.format.duration),width:400,height:480,fps:24,bytes:statSync(output).size,
    method:'motion-compensated interpolation of eight generated poses; not a rigged 3D model',
    filter,decode:'passed',contentReview:'prototype only; interpolation may deform contours; not cleared for instructional publication',
    references:['https://www.nasm.org/resource-center/exercise-library/barbell-deadlift','https://ffmpeg.org/ffmpeg-filters.html#minterpolate']
  },null,2)+'\n');
  console.log(JSON.stringify({output,bytes:statSync(output).size,seconds:Number(meta.format.duration),fps:24,decode:'passed'}));
}
