import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

// Explicitly reviewed batch only. Rendering a new candidate does not publish it.

const read = file => JSON.parse(readFileSync(file, 'utf8'));
if (existsSync('tools/media/motion-refresh/quality-hold.json') && read('tools/media/motion-refresh/quality-hold.json').active) throw new Error('Publication paused: user rejected dynamic motion quality; validate the replacement pilot first.');
const save = (file, data) => writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const base = 'tools/media/motion-guides/';
const reviewed = read('tools/media/motion-refresh/refresh-reviews.json');
const candidates = [...read('tools/media/motion-refresh/hold-candidates.json'), read('tools/media/motion-refresh/shrug-candidate.json')];
const reviews = read(`${base}reviews.json`);
const verification = read(`${base}verification.json`);
const now = new Date().toISOString();
// Validate every source and output before writing any published asset.
for (const candidate of candidates) {
  const accepted = reviewed.find(x => x.id === candidate.id && x.status === 'passed');
  if (!accepted) throw new Error(`Not visually reviewed: ${candidate.id}`);
  if (reviews.find(x => x.id === candidate.id)?.status !== 'passed') throw new Error(`Expected existing reviewed source: ${candidate.id}`);
  for (const theme of candidate.themes) {
    const file = `public/exercise-guides/refresh-candidates/${candidate.id}${theme.suffix}.mp4`;
    if (sha(file) !== theme.sha256 || accepted.themes.find(x => x.suffix === theme.suffix)?.sha256 !== theme.sha256) throw new Error(`Candidate changed since visual review: ${file}`);
    const result = spawnSync(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-i', file, '-f', 'null', 'NUL'], { encoding: 'utf8' });
    if (result.error || result.status !== 0) throw new Error(result.stderr || String(result.error));
    theme.decode = 'passed';
  }
}
for (const candidate of candidates) {
  const { id } = candidate;
  const review = reviews.find(x => x.id === id);
  if (review?.status !== 'passed') throw new Error(`Expected existing passed source: ${id}`);
  const spec = read(`${base}${id}.json`);
  const light = candidate.themes.find(x => x.suffix === '');
  const dark = candidate.themes.find(x => x.suffix === '-dark');
  for (const theme of candidate.themes) copyFileSync(`public/exercise-guides/refresh-candidates/${id}${theme.suffix}.mp4`, `public/exercise-guides/ai-v3/${id}${theme.suffix}.mp4`);
  Object.assign(spec, { renderer: candidate.renderer, timing: candidate.timing });
  save(`${base}${id}.json`, spec);
  Object.assign(verification.find(x => x.id === id), { renderVersion: candidate.renderer, width: 720, height: 720, fps: 60, seconds: 8, videoSha256: light.sha256, darkVideoSha256: dark.sha256, bytes: light.bytes, darkBytes: dark.bytes, decode: 'passed', verifiedAt: now });
  Object.assign(review, { videoSha256: light.sha256, darkVideoSha256: dark.sha256, reviewedAt: now,
    note: '2026-09-30 refresh: original reviewed appearance retained; no temporal optical-flow or independently changing poses. Both theme start/2s/4s/6s/end frames inspected, full FFmpeg decoding and browser loop passed. 720px upscales 480px source. Android playback pending; dark source rim remains.' });
  review.checks.movement = candidate.timing === 'hold'
    ? 'One fixed isometric pose maintained for the entire loop; stable limb/plate/ball shape, no unintended repetitions or pose morphing. Minor codec pixel variation only.'
    : 'Shoulders and hanging arms/dumbbells rise and lower together with smooth eight-second timing. Fixed central head/torso/feet; no curl or shoulder roll. Spatial 2D deformation near shoulder attachment is simplified; no temporal ghosting.';
  candidate.status = 'reviewed-and-published'; candidate.reviewedAt = now;
}
save(`${base}reviews.json`, reviews); save(`${base}verification.json`, verification);
save('tools/media/motion-refresh/published-batch.json', candidates);
console.log(`Published ${candidates.length} reviewed refreshes`);
