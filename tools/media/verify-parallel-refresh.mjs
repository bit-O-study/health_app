import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const batch = process.argv[2] || 'parallel';
if (!['parallel', 'arms'].includes(batch)) throw new Error('Unknown refresh batch');
const jobs = JSON.parse(readFileSync(`tools/media/motion-refresh/${batch}-batch.json`, 'utf8')).results;
const results = await Promise.all(jobs.map(async ({ id }) => {
  const themes = [];
  for (const suffix of ['', '-dark']) {
    const file = `public/exercise-guides/refresh-candidates/${id}${suffix}.mp4`;
    const result = await new Promise((resolve, reject) => {
      const p = spawn(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-nostdin', '-i', file, '-f', 'framemd5', '-'], { windowsHide: true });
      let stdout = '', stderr = '';
      p.stdout.on('data', chunk => { stdout += chunk; });
      p.stderr.on('data', chunk => { stderr += chunk; });
      p.on('error', reject);
      p.on('exit', code => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(stderr)));
    });
    const frames = result.stdout.split('\n').filter(line => line && !line.startsWith('#')).length;
    if (frames !== 480 || !result.stderr.includes('720x720') || !result.stderr.includes('60 fps') || !result.stderr.includes('Duration: 00:00:08.00')) throw new Error(`Invalid media: ${id}${suffix}`);
    themes.push({ suffix, sha256: createHash('sha256').update(readFileSync(file)).digest('hex'), frames, decode: 'passed' });
  }
  return { id, themes };
}));
writeFileSync(`tools/media/motion-refresh/${batch}-decode.json`, JSON.stringify(results, null, 2) + '\n');
console.log(`Decoded ${results.length * 2} files, each 480 frames / 8s / 720px / 60fps`);
