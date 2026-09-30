import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// These three exercises are specifically isometric, not dynamic repetitions.
// Keep one reviewed pose instead of morphing independently generated poses.
const ids = ['hollow-body-hold', 'plate-pinch', 'stability-ball-plank'];
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const output = 'public/exercise-guides/refresh-candidates';
const backup = 'tools/media/motion-refresh/sources';
mkdirSync(output, { recursive: true });
mkdirSync(backup, { recursive: true });
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, ['-hide_banner', '-nostdin', '-y', ...args], { windowsHide: true });
    let stderr = '';
    let stdout = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(stderr)));
  });
}
const results = await Promise.all(ids.map(async id => {
  const themes = [];
  for (const suffix of ['', '-dark']) {
    const source = path.join(backup, `${id}${suffix}.mp4`);
    if (!existsSync(source)) copyFileSync(`public/exercise-guides/ai-v3/${id}${suffix}.mp4`, source);
    const pose = path.join(backup, `${id}${suffix}.png`);
    await run(['-loglevel', 'error', '-i', source, '-frames:v', '1', pose]);
    const file = path.join(output, `${id}${suffix}.mp4`);
    await run(['-loglevel', 'error', '-loop', '1', '-framerate', '60', '-i', pose, '-vf', 'scale=720:720:flags=lanczos,format=yuv420p', '-frames:v', '480', '-an', '-c:v', 'libx264', '-threads', '2', '-preset', 'slow', '-crf', '18', '-profile:v', 'main', '-movflags', '+faststart', file]);
    const decoded = await run(['-loglevel', 'error', '-i', file, '-f', 'framemd5', '-']);
    const frames = decoded.stdout.split('\n').filter(line => line && !line.startsWith('#'));
    const unique = new Set(frames.map(line => line.split(',').at(-1).trim())).size;
    if (frames.length !== 480) throw new Error(`${id}: expected 480 frames, got ${frames.length}`);
    themes.push({ suffix, sha256: createHash('sha256').update(readFileSync(file)).digest('hex'), bytes: readFileSync(file).length, frames: frames.length, uniqueDecodedFrames: unique, decode: 'passed' });
  }
  console.log(`${id}: both isometric candidates rendered and decoded`);
  return { id, renderer: 'isometric-hold-v1', timing: 'hold', width: 720, height: 720, fps: 60, seconds: 8, status: 'pending-visual-review', themes };
}));
writeFileSync('tools/media/motion-refresh/hold-candidates.json', JSON.stringify(results, null, 2) + '\n');
