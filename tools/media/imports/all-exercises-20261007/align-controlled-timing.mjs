import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const jobs = [
  ['skinned-wrist-next', 'barbell-wrist-curl'],
  ['skinned-wrist-next', 'barbell-reverse-wrist-curl'],
  ['skinned-strength-next', 'trap-bar-shrug'],
  ['skinned-behind-shrug', 'behind-the-back-shrug'],
  ['skinned-smith-shrug', 'smith-machine-shrug'],
];
const base = 'tools/media/imports/all-exercises-20261007';
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const evidence = [];
for (const [folder, id] of jobs) {
  const studio = readFileSync(`${base}/${folder}/studio.mjs`, 'utf8');
  if (!studio.includes('t < .40 ? smooth(t / .40) : t < .46 ? 1 : t < .96 ? 1 - smooth((t - .46) / .50) : 0')) throw Error(`Unexpected motion timing: ${id}`);
  const review = JSON.parse(readFileSync(`${base}/${folder}/native/${id}-review.json`, 'utf8'));
  const files = [`public/exercise-guides/ai-v3/${id}.mp4`, `public/exercise-guides/ai-v3/${id}-dark.mp4`];
  if (sha(files[0]) !== review.videoSha256 || sha(files[1]) !== review.darkVideoSha256) throw Error(`Video changed: ${id}`);
  const path = `tools/media/motion-guides/${id}.json`;
  const spec = JSON.parse(readFileSync(path, 'utf8'));
  spec.timing = 'controlled';
  writeFileSync(path, JSON.stringify(spec, null, 2) + '\n');
  const publisher = `${base}/${folder}/publish-native.mjs`;
  const source = readFileSync(publisher, 'utf8');
  if (!source.includes("timing:'controlled'")) {
    if (!source.includes('panels:16,')) throw Error(`Unknown publisher layout: ${id}`);
    writeFileSync(publisher, source.replace('panels:16,', "panels:16,timing:'controlled',"));
  }
  evidence.push({id, timing:'controlled', boundariesSeconds:[0,3.2,3.68,7.68,8], videoSha256:sha(files[0]), darkVideoSha256:sha(files[1])});
}
writeFileSync(`${base}/controlled-timing-evidence.json`, JSON.stringify({checkedAt:new Date().toISOString(), evidence}, null, 2) + '\n');
console.log('Aligned caption timing for ' + evidence.length + ' unchanged video pairs');
