import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const base = 'tools/media/motion-guides/';
const reviews = JSON.parse(readFileSync(base + 'reviews.json'));
const hash = path => existsSync(path) ? createHash('sha256').update(readFileSync(path)).digest('hex') : null;
const stale = reviews.filter(r => r.status === 'passed').map(r => ({
  id: r.id,
  source: r.sourceSha256 === hash(base + r.id + '.jpg'),
  light: r.videoSha256 === hash('public/exercise-guides/ai-v3/' + r.id + '.mp4'),
  dark: r.darkVideoSha256 === hash('public/exercise-guides/ai-v3/' + r.id + '-dark.mp4'),
})).filter(r => !r.source || !r.light);
console.log(JSON.stringify({ statuses: reviews.reduce((a,r) => ({...a,[r.status]:(a[r.status]??0)+1}),{}), stale }, null, 2));
