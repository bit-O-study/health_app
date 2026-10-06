import sharp from 'sharp';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const id = process.argv[2];
if (!['side-plank', 'hollow-hold'].includes(id)) throw new Error('Unsupported isometric exercise');
const source = `tools/media/motion-refresh/${id}-pose.png`;
const output = 'public/exercise-guides/refresh-candidates';
mkdirSync(output, { recursive: true });
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const metadata = await sharp(source).metadata();
if (!metadata.hasAlpha) throw new Error('Expected transparent generated pose');
const themes = [];
for (const suffix of ['', '-dark']) {
  const pose = `${output}/${id}${suffix}-pose.png`;
  await sharp(source).resize(720, 720).flatten({ background: suffix ? '#09090b' : '#fafafa' }).png().toFile(pose);
  const file = `${output}/${id}${suffix}.mp4`;
  await new Promise((resolve, reject) => {
    const child = spawn(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-loop', '1', '-framerate', '60', '-i', pose, '-frames:v', '480', '-an', '-c:v', 'libx264', '-threads', '2', '-preset', 'slow', '-crf', '18', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file], { windowsHide: true });
    child.stderr.pipe(process.stderr);
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`FFmpeg ${code}`)));
  });
  themes.push({ suffix, sha256: sha(file), bytes: readFileSync(file).length });
}
writeFileSync(`tools/media/motion-refresh/${id}-candidate.json`, JSON.stringify({ id, renderer: 'generated-isometric-v1', timing: 'hold', rigSource: `${id}-pose.png`, sourceAtlasSha256: sha(source), width: 720, height: 720, fps: 60, seconds: 8, status: 'pending-visual-review', themes }, null, 2) + '\n');
console.log(`${id}: both themes rendered`);
