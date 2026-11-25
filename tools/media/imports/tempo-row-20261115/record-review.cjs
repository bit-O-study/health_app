const fs = require('node:fs'), assert = require('node:assert/strict'), { createHash } = require('node:crypto');
const base = 'tools/media/imports/tempo-row-20261115', old = 'tools/media/imports/hundred-20261111', id = 'tempo-row';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8')), write = (p, x) => fs.writeFileSync(p, JSON.stringify(x, null, 2) + '\n'), sha = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const dir = base + '/native/' + id, batch = read(base + '/batch.json'), entry = batch.entries[0];
const limitations = ['Procedural demonstration; joint samples are not full mesh collision or biomechanical validation.', '1-1-3-3 timing is illustrative, not prescribed by the source.'];
const checks = {exercise:'Tempo barbell row with controlled lowering.',equipment:'Barbell.',setup:'Front oblique and side views inspected; full body and bar visible.',hands:'Both hands retain overhand bar grip.',feet:'Feet remain planted, torso fixed.',movement:'1-second pull, 1-second top hold, 3-second lowering, 3-second bottom hold.'};
assert.equal(read(dir + '/kinematics.json').status, 'numeric-checks-passed');
if (process.argv[2] === 'preview') {
  write(base + '/preview-review.json', { reviewedAt: new Date().toISOString(), checks, limitations, artifacts: ['full-sheet.png', 'side-sheet.png', 'poses.json', 'geometry.json', 'kinematics.json'].map(f => ({ file: dir + '/' + f, sha256: sha(dir + '/' + f) })) });
  entry.status = 'awaiting-final-review'; entry.numericChecks = 'passed'; entry.recipe.limitations = limitations; write(base + '/batch.json', batch);
} else if (process.argv[2] === 'final') {
  assert.equal(entry.status, 'awaiting-final-review');
  const candidate = read(dir + '/candidate.json'), provenance = read(dir + '/provenance.json');
  for (const a of read(base + '/preview-review.json').artifacts) assert.equal(sha(a.file), a.sha256);
  provenance.status = 'passed-isolated-candidate'; provenance.limitations = limitations.join(' '); write(dir + '/provenance.json', provenance);
  write(base + '/visual-review.json', { [id]: { reviewedAt: new Date().toISOString(), status: 'passed-isolated-candidate', checks, limitations, artifacts: ['final.jpg', 'final-dark.jpg', 'full-sheet.png', 'side-sheet.png', 'verification.json', 'geometry.json', 'kinematics.json', 'provenance.json'].map(f => ({ file: dir + '/' + f, sha256: sha(dir + '/' + f) })), outputs: candidate.outputs } });
  write(base + '/source.json', { [id]: { equipment: 'barbell', url: entry.recipe.sourceUrls[0] } });
  for (const name of ['prepare', 'publish', 'check-published']) {
    let text = fs.readFileSync(old + '/' + name + '-pushups.mjs', 'utf8').replaceAll(old, base).replaceAll('["decline-push-up","close-grip-push-up","wide-push-up"]', '["tempo-row"]').replaceAll('-pushups.json', '.json').replaceAll('backup-pushups', 'backup').replaceAll('published-pushups-verification', 'published-verification');
    fs.writeFileSync(base + '/' + name + '.mjs', text);
  }
  entry.status = 'candidate-reviewed'; write(base + '/batch.json', batch);
} else throw new Error('Expected preview or final');
