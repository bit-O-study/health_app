import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = 'tools/media/motion-guides';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const write = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
const rows = read('tools/media/imports/all-exercises-20261007/skinned-machine-hammer-20261012/source-metadata-repair-manifest.json').slice(0, 2);
const reviews = read(`${root}/reviews.json`), verification = read(`${root}/verification.json`);
const jobs = rows.map(row => {
  const target = `${root}/${row.id}-provenance.json`, source = `${row.folder}native/${row.id}-provenance.json`;
  if (sha(target) !== row.oldRigSourceSha256 || sha(source) !== row.rigSourceSha256) throw Error(`Unexpected provenance: ${row.id}`);
  for (const [suffix, hash] of [['', row.videoSha256], ['-dark', row.darkVideoSha256]]) {
    if (sha(`public/exercise-guides/ai-v3/${row.id}${suffix}.mp4`) !== hash) throw Error(`Changed video: ${row.id}`);
  }
  const spec = read(`${root}/${row.id}.json`);
  if (JSON.stringify(spec.sources) !== JSON.stringify(row.oldSources)) throw Error(`Unexpected sources: ${row.id}`);
  for (const list of [reviews, verification]) {
    const matches = list.filter(x => x.id === row.id);
    if (matches.length !== 1 || matches[0].rigSourceSha256 !== row.oldRigSourceSha256) throw Error(`Unexpected record: ${row.id}`);
  }
  return { row, target, source, spec };
});
for (const { row, target, source, spec } of jobs) {
  copyFileSync(source, target);
  spec.sources = row.sources;
  write(`${root}/${row.id}.json`, spec);
  const review = reviews.find(x => x.id === row.id);
  review.sources = row.sources;
  review.rigSourceSha256 = row.rigSourceSha256;
  verification.find(x => x.id === row.id).rigSourceSha256 = row.rigSourceSha256;
}
write(`${root}/reviews.json`, reviews);
write(`${root}/verification.json`, verification);
console.log('Corrected source metadata for', rows.map(x => x.id).join(', '), '; videos unchanged');
