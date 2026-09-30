import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

// Each job owns its output files. Publication happens separately after review.
const jobs = [
  { id: 'dumbbell-shoulder-press', script: 'render-articulated-refresh.mjs' },
  { id: 'barbell-shrug', script: 'render-barbell-shrug-refresh.mjs' },
  { id: 'side-plank', script: 'render-generated-hold.mjs', args: ['side-plank'] },
  { id: 'hollow-hold', script: 'render-generated-hold.mjs', args: ['hollow-hold'] },
];
const startedAt = new Date().toISOString();
const results = await Promise.all(jobs.map(job => new Promise(resolve => {
  const start = Date.now();
  const child = spawn(process.execPath, [`tools/media/${job.script}`, ...(job.args || [])], { windowsHide: true, stdio: 'inherit' });
  const result = { id: job.id, pid: child.pid, startedAt: new Date(start).toISOString() };
  child.once('error', error => resolve({ ...result, error: error.message, status: 'failed' }));
  child.once('exit', code => resolve({ ...result, code, elapsedMs: Date.now() - start, status: code === 0 ? 'rendered-awaiting-review' : 'failed' }));
})));
writeFileSync('tools/media/motion-refresh/parallel-batch.json', JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), concurrency: 4, results }, null, 2) + '\n');
console.log(JSON.stringify(results));
if (results.some(r => r.status === 'failed')) process.exitCode = 1;
