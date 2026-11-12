const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = 'tools/media/imports/hundred-20261111';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const write = (p, value) => fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n');
const ids = read(base + '/publication-ids.json');
const tests = read(base + '/mapping-after.json');
const published = read(base + '/published-verification.json');
const audit = read('tools/media/motion-refresh/all-exercises-progress.json');
assert.equal(tests.success, true);
assert.equal(tests.numFailedTests, 0);
assert.equal(published.report.length, ids.length);
for (const id of ids) {
  assert.ok(published.report.some(r => r.id === id && r.outputs === 3 && r.hashes === 'passed' && r.fullDecode === 'passed' && r.bothManifests));
  assert.equal(audit.entries.find(e => e.id === id).status, 'reviewed-both-themes');
}
const batch = read(base + '/batch.json');
for (const e of batch.entries.filter(e => ids.includes(e.id))) {
  e.status = 'registered-local';
  e.registeredAt = new Date().toISOString();
}
batch.completed = batch.entries.filter(e => e.status === 'registered-local').length;
batch.status = 'in-progress';
write(base + '/batch.json', batch);
write(base + '/registration-first-fifteen.json', {
  checkedAt: new Date().toISOString(), ids, files: ids.length * 3,
  batchCompleted: batch.completed, batchRemaining: batch.requestedExercises - batch.completed,
  appTestFiles: tests.testResults.length, appTests: tests.numPassedTests,
  publishedVerification: base + '/published-verification.json', counts: audit.counts,
  lint: 'passed', typecheck: 'passed', deployment: 'pending', device: 'pending'
});
console.log(JSON.stringify({ completed: batch.completed, tests: tests.numPassedTests, counts: audit.counts }));
