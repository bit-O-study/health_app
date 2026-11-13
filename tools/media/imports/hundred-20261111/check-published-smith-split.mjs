import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const base = 'tools/media/imports/hundred-20261111';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const manifest = read('public/exercise-guides/ai-v3/manifest.json');
const darkManifest = read('public/exercise-guides/ai-v3/manifest-dark.json');
const ff = 'C:/git/Bit-O/video-tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffmpeg.exe';
const report = [];
for (const id of ["smith-machine-split-squat"]) {
  assert.ok(manifest.includes(id) && darkManifest.includes(id));
  const candidate = read(`${base}/native/${id}/candidate.json`);
  const provenance = read(`tools/media/motion-guides/${id}-provenance.json`);
  for (const input of [...provenance.inputs, ...provenance.dependencies]) assert.equal(sha(input.path), input.sha256);
  for (const output of candidate.outputs) {
    const published = 'public/exercise-guides/ai-v3/' + output.file.split('/').at(-1);
    assert.equal(sha(published), output.sha256);
    execFileSync(ff, ['-v', 'error', '-i', published, '-f', 'null', '-']);
  }
  report.push({ id, inputs: provenance.inputs.length + provenance.dependencies.length, outputs: candidate.outputs.length, hashes: 'passed', fullDecode: 'passed', bothManifests: true });
}
writeFileSync(`${base}/published-smith-split-verification.json`, JSON.stringify({ checkedAt: new Date().toISOString(), report }, null, 2) + '\n');
console.log(JSON.stringify(report));
