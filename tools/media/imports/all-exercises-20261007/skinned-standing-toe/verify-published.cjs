const fs = require('node:fs');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const base = 'tools/media/imports/all-exercises-20261007/skinned-standing-toe/native';
const id = 'standing-toe-raise';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const review = read(`${base}/${id}-review.json`);
const provenance = read(`${base}/${id}-provenance.json`);
for (const input of [...provenance.inputs, ...provenance.dependencies]) {
  if (sha(input.path) !== input.sha256) throw Error(`Changed source: ${input.path}`);
}
for (const [file, expected] of [
  [`tools/media/motion-guides/${id}.jpg`, review.sourceSha256],
  [`tools/media/motion-guides/${id}-provenance.json`, review.rigSourceSha256],
  [`public/exercise-guides/ai-v3/${id}.mp4`, review.videoSha256],
  [`public/exercise-guides/ai-v3/${id}-dark.mp4`, review.darkVideoSha256],
]) {
  if (sha(file) !== expected) throw Error(`Changed published artifact: ${file}`);
  if (file.endsWith('.mp4')) cp.execFileSync('C:/git/Bit-O/video-tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffmpeg.exe', ['-v','error','-i',file,'-f','null','-']);
}
for (const name of ['manifest.json','manifest-dark.json']) {
  if (!read(`public/exercise-guides/ai-v3/${name}`).includes(id)) throw Error(`Missing from ${name}`);
}
const playback = read(`${base}/${id}-playback.json`);
if (playback.results.length !== 2 || !playback.results.every(x => x.play && x.seek && x.loop)) throw Error('Playback failed');
const result = { checkedAt: new Date().toISOString(), id, sourceChain: 'passed', publishedHashes: 'passed', fullDecode: 'passed', visualInspection: 'Both 32-frame sheets, feet 0/210 and support 210 inspected; chair and toe/heel motion retained', playback };
fs.writeFileSync(`${base}/${id}-resume-verification.json`, JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
