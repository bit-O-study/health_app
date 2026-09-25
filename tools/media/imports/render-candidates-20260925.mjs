// Isolated review artifacts only. Never modifies the app manifests or approved media.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const out = resolve('tools/media/imports/exercise-video-20260925');
const spec = JSON.parse(readFileSync(join(out, 'generation.json'), 'utf8'));
if (process.argv.includes('--inspect')) {
  const source = join(out, 'low-bar-squat.png');
  console.log(JSON.stringify({ metadata: await sharp(source).metadata(), stats: await sharp(source).stats() }));
  process.exit(0);
}
const binaries = join(process.env.LOCALAPPDATA ?? '', 'Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin');
const bin = name => existsSync(join(binaries, name + '.exe')) ? join(binaries, name + '.exe') : name;
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const order = [0, 0, ...Array.from({ length: 16 }, (_, i) => i), 15, 15, ...Array.from({ length: 16 }, (_, i) => 15 - i), 0, 0, 0, 0];
const results = [];
for (const [key, id, themes] of [
  ['woodchopper', 'cable-woodchopper', { original: '#b6b6b6' }],
  ['lowBar', 'low-bar-squat', { light: '#fafafa', dark: '#09090b' }],
]) {
  const source = join(out, id + '.png');
  copyFileSync(spec[key].generated, source);
  const meta = await sharp(source).metadata();
  let alpha = null;
  if (key === 'lowBar') {
    if (!meta.hasAlpha) throw new Error('Cutout candidate has no alpha channel');
    const channel = await sharp(source).extractChannel('alpha').raw().toBuffer();
    alpha = { transparentFraction: channel.filter(v => v <= 8).length / channel.length, opaqueFraction: channel.filter(v => v >= 247).length / channel.length, zeroFraction: channel.filter(v => v === 0).length / channel.length };
    console.log(JSON.stringify({ alpha }));
    if (alpha.transparentFraction < 0.1 || alpha.opaqueFraction < 0.05) throw new Error('Invalid cutout alpha');
  }
  for (const [theme, background] of Object.entries(themes)) {
    const name = id + '-' + theme;
    const frames = join(out, name + '-frames');
    mkdirSync(frames, { recursive: true });
    const poses = [];
    for (let i = 0; i < 16; i++) {
      const col = i % 4, row = Math.floor(i / 4);
      const left = Math.round(col * meta.width / 4), top = Math.round(row * meta.height / 4);
      const width = Math.round((col + 1) * meta.width / 4) - left;
      const height = Math.round((row + 1) * meta.height / 4) - top;
      poses.push(await sharp(source).extract({ left, top, width, height }).flatten({ background }).resize(480, 480, { fit: 'contain', background }).jpeg({ quality: 94 }).toBuffer());
    }
    for (let i = 0; i < order.length; i++) writeFileSync(join(frames, String(i + 1).padStart(3, '0') + '.jpg'), poses[order[i]]);
    const movie = join(out, name + '.mp4');
    const filter = 'scale=in_range=full:out_range=tv,format=yuv420p,tpad=stop_mode=clone:stop_duration=1,minterpolate=fps=24:mi_mode=mci:mc_mode=obmc:me_mode=bidir:mb_size=16:search_param=32:vsbmc=0:scd=none';
    execFileSync(bin('ffmpeg'), ['-y', '-v', 'error', '-framerate', '5', '-t', '8', '-i', join(frames, '%03d.jpg'), '-vf', filter, '-t', '8', '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', movie]);
    execFileSync(bin('ffmpeg'), ['-v', 'error', '-i', movie, '-f', 'null', '-']);
    const probe = JSON.parse(execFileSync(bin('ffprobe'), ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', movie], { encoding: 'utf8' }));
    const stream = probe.streams[0];
    if (probe.streams.length !== 1 || stream.codec_name !== 'h264' || stream.width !== 480 || stream.height !== 480 || stream.avg_frame_rate !== '24/1' || stream.pix_fmt !== 'yuv420p' || Math.abs(Number(probe.format.duration) - 8) > 0.05) throw new Error('Unexpected video format: ' + name);
    execFileSync(bin('ffmpeg'), ['-y', '-v', 'error', '-i', movie, '-vf', 'fps=4,scale=240:240,tile=8x4', '-frames:v', '1', join(out, name + '-contact.jpg')]);
    const result = { name, sourceSha256: hash(source), videoSha256: hash(movie), bytes: statSync(movie).size, width: 480, height: 480, fps: 24, seconds: 8, decode: 'passed', alpha, visualReview: 'pending', published: false };
    results.push(result);
    writeFileSync(join(out, 'verification.json'), JSON.stringify(results, null, 2) + '\n');
    console.log(JSON.stringify(result));
  }
}
