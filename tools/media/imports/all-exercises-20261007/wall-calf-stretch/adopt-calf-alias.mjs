import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { manageMotionGuides } from '../../../manage-motion-guides.mjs';

const sourceId = 'wall-calf-stretch', id = 'calf-stretch';
const root = 'tools/media/motion-guides', pub = 'public/exercise-guides/ai-v3';
const base = 'tools/media/imports/all-exercises-20261007/wall-calf-stretch';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const write = (p, value) => writeFileSync(p, JSON.stringify(value, null, 2) + '\n');
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const spec = read(`${root}/${sourceId}.json`);
const review = read(`${root}/reviews.json`).find(x => x.id === sourceId);
const verification = read(`${root}/verification.json`);
const original = verification.find(x => x.id === sourceId);
if (existsSync(`${root}/${id}.json`) || existsSync(`${pub}/${id}.mp4`)) throw Error('Target already exists');
if (review?.status !== 'passed' || !original || spec.equipment !== 'bodyweight') throw Error('Source not approved');
for (const [field, path] of [
  ['sourceSha256', `${root}/${sourceId}.jpg`],
  ['rigSourceSha256', `${root}/${spec.rigSource}`],
  ['videoSha256', `${pub}/${sourceId}.mp4`],
  ['darkVideoSha256', `${pub}/${sourceId}-dark.mp4`],
]) if (review[field] !== sha(path) || original[field] !== sha(path)) throw Error(`Stale ${field}`);
if (!read(`${base}/playback.json`).results.every(x => x.play && x.seek && x.loop)) throw Error('Playback incomplete');
const identity = 'Both catalog IDs describe a bodyweight wall-supported calf stretch: rear knee extended, rear heel grounded, front knee bent. Conditioning catalog calf-stretch also specifies wall support. Incorrect squat captions corrected and methodSteps regression tested before reuse.';
copyFileSync(`${root}/${sourceId}.jpg`, `${root}/${id}.jpg`);
write(`${root}/${id}.json`, { ...spec, id, aliasOf: sourceId, aliasReason: identity, registeredAt: new Date().toISOString() });
for (const suffix of ['', '-dark']) copyFileSync(`${pub}/${sourceId}${suffix}.mp4`, `${pub}/${id}${suffix}.mp4`);
write(`${root}/verification.json`, [...verification, { ...original, id, aliasOf: sourceId, verifiedAt: new Date().toISOString() }]);
await manageMotionGuides('motion-review', id, encodeURIComponent(JSON.stringify({ status: 'passed', checks: review.checks, aliasOf: sourceId, note: identity + ' Exact approved static hold reused, not a newly generated movement. Eight-second playback loop is not a prescribed hold duration.' })));
write(`${base}/calf-alias-evidence.json`, { id, sourceId, identity, videoSha256: sha(`${pub}/${id}.mp4`), darkVideoSha256: sha(`${pub}/${id}-dark.mp4`), reviewedAt: new Date().toISOString() });
