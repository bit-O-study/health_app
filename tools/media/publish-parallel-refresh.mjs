import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { REVIEW_CHECKS } from './guide-review.mjs';

const read = p => JSON.parse(readFileSync(p, 'utf8'));
const save = (p, value) => writeFileSync(p, JSON.stringify(value, null, 2) + '\n');
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const batch = process.argv[2] || 'parallel';
if (existsSync('tools/media/motion-refresh/quality-hold.json') && read('tools/media/motion-refresh/quality-hold.json').active) throw new Error('Publication paused: user rejected dynamic motion quality; validate the replacement pilot first.');
if (!['parallel', 'arms'].includes(batch)) throw new Error('Unknown refresh batch');
const ids = read(`tools/media/motion-refresh/${batch}-batch.json`).results.map(x => x.id);
if (ids.length !== 4 || new Set(ids).size !== 4 || ids.some(id => !/^[a-z0-9-]+$/.test(id))) throw new Error('Expected four distinct exercise IDs');
const rigFiles = { 'dumbbell-shoulder-press': 'shoulder-press-atlas.png', 'barbell-shrug': 'barbell-shrug-atlas.png', 'side-plank': 'side-plank-pose.png', 'hollow-hold': 'hollow-hold-pose.png' };
const base = 'tools/media/motion-guides/';
const state = 'tools/media/motion-refresh/';
const ledger = read(`${state}refresh-reviews.json`);
const decode = read(`${state}${batch}-decode.json`);
const playback = read(`${state}${batch}-playback.json`);
const reviews = read(`${base}reviews.json`);
const verification = read(`${base}verification.json`);
const candidates = ids.map(id => read(`${state}${id}-candidate.json`));
if (candidates.some((c, i) => c.id !== ids[i] || c.themes.length !== 2 || !['', '-dark'].every(suffix => c.themes.some(t => t.suffix === suffix)))) throw new Error('Candidate identity or themes do not match batch');
if (batch === 'arms') for (const id of ids) rigFiles[id] = `${id}-atlas.png`;
// Preflight the entire batch, including source, manual review and actual tested bytes.
for (const c of candidates) {
  const r = ledger.find(x => x.id === c.id && x.status === 'passed');
  const source = `${state}${rigFiles[c.id]}`;
  if (!r || r.rigSourceSha256 !== sha(source) || c.sourceAtlasSha256 !== sha(source) || !REVIEW_CHECKS.every(k => r.checks?.[k]?.trim())) throw new Error(`Missing exact source review: ${c.id}`);
  if (!reviews.find(x => x.id === c.id) || !verification.find(x => x.id === c.id)) throw new Error(`Missing existing metadata: ${c.id}`);
  read(`${base}${c.id}.json`);
  for (const t of c.themes) {
    const actual = sha(`public/exercise-guides/refresh-candidates/${c.id}${t.suffix}.mp4`);
    const d = decode.find(x => x.id === c.id)?.themes.find(x => x.suffix === t.suffix);
    const p = playback.find(x => x.id === c.id + t.suffix);
    if (actual !== t.sha256 || r.themes.find(x => x.suffix === t.suffix)?.sha256 !== actual || d?.sha256 !== actual || d.frames !== 480 || d.decode !== 'passed' || p?.sha256 !== actual || p.error || p.width !== 720 || p.duration !== 8 || p.time >= 1) throw new Error(`Unverified candidate: ${c.id}${t.suffix}`);
  }
}
mkdirSync(`${state}sources`, { recursive: true });
for (const c of candidates) {
  const r = ledger.find(x => x.id === c.id && x.status === 'passed');
  const spec = read(`${base}${c.id}.json`);
  const rigSource = `${c.id}-rig.png`;
  copyFileSync(`${state}${rigFiles[c.id]}`, `${base}${rigSource}`);
  for (const t of c.themes) {
    const target = `public/exercise-guides/ai-v3/${c.id}${t.suffix}.mp4`;
    const backup = `${state}sources/${c.id}${t.suffix}.mp4`;
    if (existsSync(target) && !existsSync(backup)) copyFileSync(target, backup);
    copyFileSync(`public/exercise-guides/refresh-candidates/${c.id}${t.suffix}.mp4`, target);
  }
  Object.assign(spec, { rigSource, renderer: c.renderer, timing: c.timing, sources: r.sources });
  save(`${base}${c.id}.json`, spec);
  const light = c.themes.find(x => x.suffix === ''), dark = c.themes.find(x => x.suffix === '-dark');
  const hashes = { rigSourceSha256: r.rigSourceSha256, videoSha256: light.sha256, darkVideoSha256: dark.sha256 };
  Object.assign(verification.find(x => x.id === c.id), hashes, { renderVersion: c.renderer, width: 720, height: 720, fps: 60, seconds: 8, bytes: light.bytes, darkBytes: dark.bytes, decode: 'passed', verifiedAt: new Date().toISOString() });
  Object.assign(reviews.find(x => x.id === c.id), hashes, { status: 'passed', checks: r.checks, sources: r.sources, note: r.note, reviewedAt: r.reviewedAt });
}
save(`${base}reviews.json`, reviews);
save(`${base}verification.json`, verification);
save(`${state}published-${batch}-batch.json`, { ids, publishedAt: new Date().toISOString() });
console.log(`Applied ${ids.length} reviewed refreshes to branch assets`);
