const fs = require('node:fs'), assert = require('node:assert/strict'), { createHash } = require('node:crypto');
const base = 'tools/media/imports/tempo-20261115', old = 'tools/media/imports/hundred-20261111', id = 'tempo-push-up';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8')), write = (p, x) => fs.writeFileSync(p, JSON.stringify(x, null, 2) + '\n'), sha = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const dir = base + '/native/' + id, batch = read(base + '/batch.json'), entry = batch.entries[0];
const limitations = ['Top elbows retain approximately 7.8 degrees of flexion; chest does not touch the floor.', 'Virtual floor support only; sampled geometry is not full mesh collision or human motion certification.', 'The 3-1-1-3 timing is an illustrative tempo chosen for this clip, not prescribed by the source.'];
const checks = { exercise: 'Tempo push-up; rigid torso and straight legs move together.', equipment: 'Bodyweight; no apparatus.', setup: 'Front oblique and side sheets inspected, full head and feet visible.', hands: 'Two palms remain fixed slightly wider than shoulder joint spacing.', feet: 'Fixed toe support at virtual floor; straight knees throughout.', movement: '3 seconds lowering, 1 second bottom hold, 1 second rising, 3 seconds top hold; elbow range 81.9–172.2 degrees.' };
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
  write(base + '/source.json', { [id]: { equipment: 'bodyweight', url: entry.recipe.sourceUrls[0] } });
  for (const name of ['prepare', 'publish', 'check-published']) {
    let text = fs.readFileSync(old + '/' + name + '-pushups.mjs', 'utf8').replaceAll(old, base).replaceAll('["decline-push-up","close-grip-push-up","wide-push-up"]', '["tempo-push-up"]').replaceAll('-pushups.json', '.json').replaceAll('backup-pushups', 'backup').replaceAll('published-pushups-verification', 'published-verification');
    fs.writeFileSync(base + '/' + name + '.mjs', text);
  }
  entry.status = 'candidate-reviewed'; write(base + '/batch.json', batch);
} else throw new Error('Expected preview or final');
