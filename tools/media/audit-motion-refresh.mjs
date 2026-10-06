import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// Read-only audit of production assets. Never treats successful decoding as
// evidence of correct anatomy, motion, equipment, or visual quality.
const root = process.cwd();
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const catalog = read('tools/media/ai-guides/catalog.json');
const reviews = read('tools/media/motion-guides/reviews.json');
const refreshReviews = existsSync('tools/media/motion-refresh/refresh-reviews.json') ? read('tools/media/motion-refresh/refresh-reviews.json') : [];
const output = path.join(root, '.verify-shots/motion-refresh');
const state = 'tools/media/motion-refresh';
mkdirSync(output, { recursive: true });
mkdirSync(state, { recursive: true });
const queue = new Array(catalog.length);
let completed = 0;
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-8 * 1024 * 1024); });
    child.on('error', reject);
    child.on('close', status => resolve({ status, stderr }));
  });
}
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
async function auditExercise(exercise, index) {
  const { id, name } = exercise;
  const generation = existsSync(`public/exercise-guides/ai-v3/${id}.mp4`) ? 'ai-v3' : existsSync(`public/exercise-guides/ai-v2/${id}.mp4`) ? 'ai-v2' : 'ai-v3';
  const movie = `public/exercise-guides/${generation}/${id}.mp4`;
  const specPath = `tools/media/motion-guides/${id}.json`;
  const spec = existsSync(specPath) ? read(specPath) : null;
  const review = reviews.find(r => r.id === id);
  const item = { id, name, equipment: spec?.equipment ?? exercise.equipments,
    generation, phase: existsSync(movie) ? 'refresh-existing' : 'create-after-refresh',
    renderer: spec?.renderer ?? null, cycle: spec?.cycle ?? 'reverse',
    sources: spec?.sources ?? [], priorReview: review?.status ?? null,
    priorNote: review?.note ?? null,
    status: spec?.renderer === 'rigid-2d-v1' ? 'accepted' : 'pending', themes: [] };
  if (existsSync(movie)) {
    for (const suffix of ['', '-dark']) {
      const file = `public/exercise-guides/${generation}/${id}${suffix}.mp4`;
      if (!existsSync(file)) continue;
      const sha256 = createHash('sha256').update(readFileSync(file)).digest('hex');
      const cachePath = path.join(output, `${id}${suffix}.json`);
      let result = existsSync(cachePath) ? read(cachePath) : null;
      if (result?.sha256 !== sha256) {
        const decode = await run(['-hide_banner', '-nostdin', '-i', file, '-map', '0:v', '-f', 'null', 'NUL']);
        if (decode.error) throw decode.error;
        const resolution = /Video:.*?, (\d{2,4})x(\d{2,4})/.exec(decode.stderr);
        const fps = /, ([\d.]+) fps,/.exec(decode.stderr);
        result = { sha256, decode: decode.status === 0 ? 'passed' : 'failed', width: Number(resolution?.[1]), height: Number(resolution?.[2]), fps: Number(fps?.[1]), error: decode.status ? decode.stderr.slice(-1800) : null };
        const contact = await run(['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', file, '-vf', 'fps=1/2,scale=180:180,tile=4x1', '-frames:v', '1', path.join(output, `${id}${suffix}.jpg`)]);
        if (contact.status !== 0) throw new Error(contact.stderr || String(contact.error));
        writeFileSync(cachePath, JSON.stringify(result, null, 2));
      }
      item.themes.push({ theme: suffix ? 'dark' : 'light', ...result });
    }
    const refreshed = refreshReviews.find(x => x.id === id && x.status === 'passed');
    if (refreshed && item.themes.every(t => refreshed.themes.some(r => (r.suffix ? 'dark' : 'light') === t.theme && r.sha256 === t.sha256))) item.status = 'accepted';
    console.log(`${++completed}: ${id} (${item.themes.length} themes)`);
  }
  queue[index] = item;
}
// Each worker owns different exercise files; the shared queue is saved after all finish.
let cursor = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < catalog.length) { const index = cursor++; await auditExercise(catalog[index], index); }
}));
const rendered = queue.filter(x => x.phase === 'refresh-existing');
for (let offset = 0; offset < rendered.length; offset += 8) {
  const batch = rendered.slice(offset, offset + 8);
  const tiles = [];
  for (const [i, entry] of batch.entries()) {
    const label = Buffer.from(`<svg width="720" height="28"><rect width="720" height="28" fill="#12221c"/><text x="8" y="20" fill="white" font-size="16">${entry.id} · ${entry.priorReview}</text></svg>`);
    tiles.push({ input: label, left: 0, top: i * 208 });
    tiles.push({ input: path.join(output, `${entry.id}.jpg`), left: 0, top: i * 208 + 28 });
  }
  await sharp({ create: { width: 720, height: batch.length * 208, channels: 3, background: '#fafafa' } }).composite(tiles).jpeg({ quality: 88 }).toFile(path.join(output, `batch-${String(offset / 8 + 1).padStart(2, '0')}.jpg`));
}
const summary = { total: queue.length, existing: rendered.length, continuousV3: rendered.filter(x => x.generation === 'ai-v3').length, legacyOnly: rendered.filter(x => x.generation === 'ai-v2').length, accepted: rendered.filter(x => x.status === 'accepted').length, unrendered: queue.length - rendered.length, decodedFiles: rendered.flatMap(x => x.themes).length, decodeFailures: rendered.flatMap(x => x.themes).filter(x => x.decode !== 'passed').length };
writeFileSync(`${state}/queue.json`, JSON.stringify({ auditedAt: new Date().toISOString(), summary, exercises: queue }, null, 2) + '\n');
console.log(JSON.stringify(summary));
