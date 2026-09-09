import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const source = 'tools/media/ai-guides';
const output = 'public/exercise-guides/ai-v2';
const binDir = join(process.env.LOCALAPPDATA ?? '', 'Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin');
function bin(name) {
  for (const candidate of [name, join(binDir, `${name}.exe`)]) {
    try { execFileSync(candidate, ['-version'], { stdio: 'ignore' }); return candidate; } catch { /* Try the installed FFmpeg location next. */ }
  }
  throw new Error(`${name} is required`);
}
const ffmpeg = bin('ffmpeg');
const ffprobe = bin('ffprobe');
const guides = JSON.parse(readFileSync(`${source}/prompts.json`, 'utf8'));
const report = [];
mkdirSync(output, { recursive: true });
for (const { id } of guides) {
  const sheet = `${source}/${id}.png`;
  const { width, height } = await sharp(sheet).metadata();
  const frames = `${source}/${id}`;
  mkdirSync(frames, { recursive: true });
  for (let index = 0; index < 6; index++) {
    // Trim the thin grid separators without cutting off hands or feet.
    const left = Math.round((index % 3) * width / 3) + 3;
    const top = Math.round(Math.floor(index / 3) * height / 2) + 3;
    const right = Math.round(((index % 3) + 1) * width / 3) - 3;
    const bottom = Math.round((Math.floor(index / 3) + 1) * height / 2) - 3;
    await sharp(sheet).extract({ left, top, width: right - left, height: bottom - top })
      .resize(960, 720, { fit: 'contain', background: '#171717' }).jpeg({ quality: 92 })
      .toFile(`${frames}/${index + 1}.jpg`);
  }
  const target = `${output}/${id}.mp4`;
  execFileSync(ffmpeg, ['-y', '-v', 'error', '-framerate', '1/4', '-i', `${frames}/%d.jpg`, '-t', '24', '-r', '24', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'stillimage', '-crf', '25', '-profile:v', 'main', '-vf', 'scale=in_range=full:out_range=tv,format=yuv420p', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-movflags', '+faststart', '-an', target], { stdio: 'inherit' });
  execFileSync(ffmpeg, ['-v', 'error', '-i', target, '-f', 'null', '-'], { stdio: 'pipe' });
  const meta = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', target], { encoding: 'utf8' }));
  const video = meta.streams.find(s => s.codec_type === 'video');
  if (video.width !== 960 || video.height !== 720 || Math.abs(Number(meta.format.duration) - 24) > 0.1 || meta.streams.length !== 1 || video.pix_fmt !== 'yuv420p') throw new Error(`Invalid video: ${id}`);
  report.push({ id, width: video.width, height: video.height, seconds: Number(meta.format.duration), bytes: statSync(target).size, codec: video.codec_name, pixelFormat: video.pix_fmt, decode: 'passed' });
  console.log(`${id}: ${statSync(target).size} bytes, decode passed`);
}
writeFileSync(`${source}/verification.json`, JSON.stringify(report, null, 2) + '\n');
