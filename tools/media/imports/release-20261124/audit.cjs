const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const root = 'tools/media/imports/release-20261124';
fs.mkdirSync(root, { recursive: true });
const manifest = read('public/exercise-guides/ai-v3/manifest.json');
const dark = read('public/exercise-guides/ai-v3/manifest-dark.json');
const reviews = read('tools/media/motion-guides/reviews.json');
const failures = [], files = [];
for (const id of manifest) {
  const review = reviews.find(r => r.id === id && r.status === 'passed');
  if (!review) { failures.push(`${id}: missing review`); continue; }
  for (const [file, expected] of [[`${id}.mp4`, review.videoSha256], ...(dark.includes(id) ? [[`${id}-dark.mp4`, review.darkVideoSha256]] : [])]) {
    const p = `public/exercise-guides/ai-v3/${file}`;
    if (!fs.existsSync(p) || sha(p) !== expected) failures.push(`${id}: hash mismatch ${file}`);
    else files.push({ file: p, sha256: expected });
  }
  const spec = read(`tools/media/motion-guides/${id}.json`);
  if (sha(`tools/media/motion-guides/${id}.jpg`) !== review.sourceSha256) failures.push(`${id}: source mismatch`);
  if (spec.rigSource && sha(path.join('tools/media/motion-guides', spec.rigSource)) !== review.rigSourceSha256) failures.push(`${id}: rig mismatch`);
}
const report = { checkedAt: new Date().toISOString(), light: manifest.length, dark: dark.length, files, failures };
fs.writeFileSync(`${root}/local-audit.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ light: manifest.length, dark: dark.length, checkedFiles: files.length, failures }));
if (failures.length) process.exitCode = 1;
